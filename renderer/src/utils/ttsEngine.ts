export class TTSEngine {
  private synth: SpeechSynthesis;
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private isSpeaking: boolean = false;
  private isPaused: boolean = false;

  constructor() {
    this.synth = window.speechSynthesis;
  }

  async speakWithHighlight(text: string, element?: HTMLElement): Promise<void> {
    if (this.isSpeaking) {
      this.stop();
      return;
    }

    this.currentUtterance = new SpeechSynthesisUtterance(text);
    this.configureVoice();
    
    const words = text.split(/\s+/);
    let currentWordIndex = 0;

    this.currentUtterance.onboundary = (event) => {
      if (event.name === 'word' && element) {
        this.highlightWord(element, words[currentWordIndex]);
        currentWordIndex++;
      }
    };

    this.currentUtterance.onend = () => {
      this.isSpeaking = false;
      this.isPaused = false;
      if (element) {
        this.removeAllHighlights(element);
      }
    };

    this.currentUtterance.onerror = (event) => {
      console.error('TTS Error:', event);
      this.isSpeaking = false;
      this.isPaused = false;
    };

    this.synth.speak(this.currentUtterance);
    this.isSpeaking = true;
  }

  private configureVoice(): void {
    if (!this.currentUtterance) return;

    const voices = this.synth.getVoices();
    const preferredVoice = voices.find(voice => 
      voice.lang.startsWith('en') && voice.name.includes('Natural')
    ) || voices.find(voice => voice.lang.startsWith('en'));

    if (preferredVoice) {
      this.currentUtterance.voice = preferredVoice;
    }

    this.currentUtterance.rate = 0.9; // Slightly slower for better comprehension
    this.currentUtterance.pitch = 1.0;
    this.currentUtterance.volume = 1.0;
  }

  private highlightWord(container: HTMLElement, word: string): void {
    this.removeAllHighlights(container);
    
    const walker = document.createTreeWalker(
      container,
      NodeFilter.SHOW_TEXT,
      null
    );

    let node;
    while (node = walker.nextNode()) {
      const textContent = node.textContent || '';
      const wordRegex = new RegExp(`\\b${this.escapeRegex(word)}\\b`, 'i');
      
      if (wordRegex.test(textContent)) {
        const span = document.createElement('span');
        span.className = 'dyslexia-tts-highlight';
        
        const parent = node.parentNode;
        if (parent) {
          parent.replaceChild(span, node);
          span.appendChild(node);
        }
        break;
      }
    }
  }

  private removeAllHighlights(container: HTMLElement): void {
    const highlights = container.querySelectorAll('.dyslexia-tts-highlight');
    highlights.forEach(highlight => {
      const parent = highlight.parentNode;
      if (parent) {
        while (highlight.firstChild) {
          parent.insertBefore(highlight.firstChild, highlight);
        }
        parent.removeChild(highlight);
      }
    });
  }

  private escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  pause(): void {
    if (this.isSpeaking && !this.isPaused) {
      this.synth.pause();
      this.isPaused = true;
    }
  }

  resume(): void {
    if (this.isSpeaking && this.isPaused) {
      this.synth.resume();
      this.isPaused = false;
    }
  }

  stop(): void {
    this.synth.cancel();
    this.isSpeaking = false;
    this.isPaused = false;
    this.currentUtterance = null;
  }

  isCurrentlySpeaking(): boolean {
    return this.isSpeaking;
  }

  getAvailableVoices(): SpeechSynthesisVoice[] {
    return this.synth.getVoices();
  }
}
