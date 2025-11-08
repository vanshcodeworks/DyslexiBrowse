from flask import Flask, request, jsonify, send_file
from transformers import pipeline
from PIL import Image
from gtts import gTTS
import io
import sys
from packaging import version
from flask_cors import CORS
import urllib.request
import tempfile

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})

# Check and install torch if not available or version is too low
try:
    import torch
except ImportError:
    print("Torch not installed. Install with: pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cpu")
    sys.exit(1)

MIN_TORCH = "2.6.0"
if version.parse(torch.__version__) < version.parse(MIN_TORCH):
    raise RuntimeError(f"Torch {MIN_TORCH}+ required (found {torch.__version__}). Upgrade:\n"
                       f"  pip install --upgrade pip\n"
                       f"  pip uninstall -y torch torchvision torchaudio\n"
                       f"  pip install --index-url https://download.pytorch.org/whl/cpu torch torchvision torchaudio")

# Load models once at startup
summarizer = pipeline("summarization", model="facebook/bart-large-cnn")

CAPTION_PRIMARY = "nlpconnect/vit-gpt2-image-captioning"
CAPTION_FALLBACK = "Salesforce/blip-image-captioning-base"

def build_captioner():
    try:
        return pipeline("image-to-text", model=CAPTION_PRIMARY)
    except Exception as e:
        print(f"[Caption] Primary model failed: {e}\nTrying fallback: {CAPTION_FALLBACK}")
        return pipeline("image-to-text", model=CAPTION_FALLBACK)

captioner = build_captioner()

@app.route('/')
def home():
    return jsonify({"message": "Hugging Face API Gateway Running 🚀"})

@app.route('/summarize', methods=['POST'])
def summarize_text():
    # Try JSON first, fall back to form data or raw body
    data = request.get_json(silent=True)
    if data and isinstance(data, dict):
        text = data.get("text", "") or ""
    else:
        text = request.form.get("text", "") or (request.data.decode("utf-8", "ignore") if request.data else "")
    if not text:
        return jsonify({"error": "No text provided"}), 400

    # Estimate input length (words) and compute adaptive lengths to avoid warnings/errors
    word_count = max(1, len(text.split()))
    # For short inputs, keep max_length small; for longer inputs allow larger summaries but not more than 150
    max_length = min(150, max(20, int(word_count * 0.6)))
    min_length = max(10, int(max_length * 0.3))

    try:
        summary = summarizer(text, max_length=max_length, min_length=min_length, do_sample=False)
        return jsonify({
            "summary": summary[0].get('summary_text', ''),
            "meta": {"input_words": word_count, "max_length": max_length, "min_length": min_length}
        })
    except Exception as e:
        return jsonify({"error": "Summarization failed", "details": str(e)}), 500

# 2️⃣ IMAGE CAPTIONING
@app.route('/caption', methods=['POST'])
def caption_image():
    # Accept either uploaded file "image" or JSON/form with "url"
    try:
      if 'image' in request.files:
          image = Image.open(request.files['image'])
      else:
          data = request.get_json(silent=True) or {}
          url = data.get('url') or request.form.get('url')
          if not url:
              return jsonify({"error": "No image file or url provided"}), 400
          # Download image to temp file
          with urllib.request.urlopen(url) as resp:
              buf = io.BytesIO(resp.read())
              buf.seek(0)
              image = Image.open(buf)
      result = captioner(image)
      caption = result[0].get('generated_text') or result[0].get('caption') or ''
      return jsonify({"caption": caption})
    except Exception as e:
      return jsonify({"error": "Captioning failed", "details": str(e)}), 500

# 3️⃣ TEXT TO SPEECH
@app.route('/tts', methods=['POST'])
def text_to_speech():
    data = request.get_json()
    text = data.get("text", "")
    if not text:
        return jsonify({"error": "No text provided"}), 400
    tts = gTTS(text)
    audio_fp = io.BytesIO()
    tts.write_to_fp(audio_fp)
    audio_fp.seek(0)
    return send_file(audio_fp, mimetype="audio/mpeg", as_attachment=True, download_name="output.mp3")

def get_caption(image_path: str) -> str:
    """
    Generate a caption for an image file path.
    """
    try:
        result = captioner(image_path)
        # pipeline returns list[{'generated_text': '...'}] or list[{'caption': '...'}]
        item = result[0] if result else {}
        return item.get("generated_text") or item.get("caption") or ""
    except Exception as e:
        return f"Caption error: {e}"

if __name__ == '__main__':
    app.run(debug=True, port=5000)
