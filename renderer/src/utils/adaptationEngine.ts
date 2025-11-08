import type { DyslexiaProfile, AdaptationSettings } from '../types/dyslexia';

export class AdaptationEngine {
  private currentProfile: DyslexiaProfile | null = null;
  private currentSettings: AdaptationSettings | null = null;
  private observer: MutationObserver | null = null;

  async applyAdaptations(profile: DyslexiaProfile): Promise<void> {
    this.currentProfile = profile;
    this.currentSettings = this.generateSettings(profile);
    await this.ensureOpenDyslexicFont(); // USED
    const css = this.generateAdaptiveCSS(this.currentSettings);
    if (window.api?.injectCSS) {
      await window.api.injectCSS(css);
    } else {
      this.injectCSSDirectly(css);
    }
    this.setupMutationObserver();
  }

  // REMOVE old: injectOriginalOpenDyslexic(), injectOpenDyslexicFont()
  // NEW consolidated method
  private async ensureOpenDyslexicFont(): Promise<void> {
    const css = `
      @font-face {
        font-family: 'OpenDyslexic';
        src: url('https://cdn.jsdelivr.net/gh/antijingoist/open-dyslexic/otf/OpenDyslexic3-Regular.otf') format('opentype');
        font-weight: 400;
        font-style: normal;
      }
      @font-face {
        font-family: 'OpenDyslexic';
        src: url('https://cdn.jsdelivr.net/gh/antijingoist/open-dyslexic/otf/OpenDyslexic3-Bold.otf') format('opentype');
        font-weight: 700;
        font-style: normal;
      }
    `;
    if (window.api?.injectCSS) {
      try { await window.api.injectCSS(css); } catch {}
    } else {
      this.injectCSSDirectly(css, 'dyslexi-font-face');
    }
  }

  private generateSettings(profile: DyslexiaProfile): AdaptationSettings {
    // Force OpenDyslexic as primary font for all profiles when enabled
    const baseSettings: AdaptationSettings = {
      fontFamily: "'OpenDyslexic', system-ui, sans-serif",
      fontSize: 16,
      lineHeight: 1.6,
      letterSpacing: 0.05,
      wordSpacing: 0.1,
      backgroundColor: '#FFFFFF',
      textColor: '#333333',
      enableLineHighlight: false,
      enableTTS: false,
      enableReaderView: false,
      colorOverlay: 'none'
    };

    switch (profile.profile) {
      case 'phonological':
        return {
          ...baseSettings,
          fontSize: 18,
          lineHeight: 1.9,
          letterSpacing: 0.08,
          wordSpacing: 0.15,
          backgroundColor: '#FDFDF8',
          enableTTS: true,
          enableLineHighlight: true
        };
      case 'surface':
        return {
          ...baseSettings,
          fontSize: 17,
          lineHeight: 2.1,
          letterSpacing: 0.14,
          wordSpacing: 0.28,
          backgroundColor: '#F9F9F9',
          enableLineHighlight: true
        };
      case 'visual':
        return {
          ...baseSettings,
          fontSize: 17,
          lineHeight: 1.8,
          letterSpacing: 0.06,
          backgroundColor: '#F5F5DC',
          textColor: '#2C2C2C',
          colorOverlay: 'rgba(255, 248, 220, 0.25)',
          enableLineHighlight: true
        };
      case 'comprehension':
        return {
          ...baseSettings,
          fontSize: 17,
          lineHeight: 2.0,
          letterSpacing: 0.04,
          wordSpacing: 0.12,
          enableReaderView: true
        };
      default:
        return {
          ...baseSettings,
          fontSize: 17,
          lineHeight: 1.8,
          letterSpacing: 0.06,
          wordSpacing: 0.12,
          backgroundColor: '#FAFAFA'
        };
    }
  }

  private generateAdaptiveCSS(settings: AdaptationSettings): string {
    return `
      /* DyslexiBrowse - Adaptive Reading Styles */
      /* OpenDyslexic enforced while adaptations are enabled */
      :root {
        --dyslexia-font: ${settings.fontFamily};
        --dyslexia-size: ${settings.fontSize}px;
        --dyslexia-line-height: ${settings.lineHeight};
        --dyslexia-letter-spacing: ${settings.letterSpacing}em;
        --dyslexia-word-spacing: ${settings.wordSpacing}em;
        --dyslexia-bg: ${settings.backgroundColor};
        --dyslexia-color: ${settings.textColor};
      }

      /* Apply to all text elements */
      body, body *,
      p, span, div, a, li, td, th, h1, h2, h3, h4, h5, h6,
      input, textarea, button, select {
        font-family: var(--dyslexia-font) !important;
        line-height: var(--dyslexia-line-height) !important;
        letter-spacing: var(--dyslexia-letter-spacing) !important;
        word-spacing: var(--dyslexia-word-spacing) !important;
      }

      body {
        background-color: var(--dyslexia-bg) !important;
        color: var(--dyslexia-color) !important;
        font-size: var(--dyslexia-size) !important;
      }

      /* Optimize paragraph width for readability */
      p, article, main {
        max-width: 75ch !important;
        margin-left: auto !important;
        margin-right: auto !important;
      }

      /* TTS Word Highlighting */
      .dyslexia-tts-highlight {
        background-color: rgba(255, 235, 59, 0.6) !important;
        padding: 2px 4px !important;
        border-radius: 3px !important;
        box-shadow: 0 0 0 2px rgba(255, 193, 7, 0.3) !important;
        transition: all 0.2s ease !important;
      }

      /* Line Focus Mode */
      ${settings.enableLineHighlight ? `
      .dyslexia-reading-guide {
        position: relative;
      }
      
      .dyslexia-reading-guide::before {
        content: '';
        position: absolute;
        left: -100vw;
        right: -100vw;
        top: -0.3em;
        bottom: -0.3em;
        background: rgba(102, 126, 234, 0.12) !important;
        pointer-events: none;
        z-index: -1;
      }

      p:hover, li:hover, div:hover {
        background: linear-gradient(
          to bottom,
          transparent 0%,
          transparent 20%,
          rgba(227, 242, 253, 0.4) 20%,
          rgba(227, 242, 253, 0.4) 80%,
          transparent 80%,
          transparent 100%
        ) !important;
      }
      ` : ''}

      /* Color Overlay */
      ${settings.colorOverlay !== 'none' ? `
      body::before {
        content: '';
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: ${settings.colorOverlay} !important;
        pointer-events: none !important;
        z-index: 999999 !important;
        mix-blend-mode: multiply;
      }
      ` : ''}

      /* Reader View */
      ${settings.enableReaderView ? `
      article p,
      main p,
      .content p {
        margin-bottom: 1.8em !important;
        padding: 0.8em !important;
        border-left: 4px solid rgba(102, 126, 234, 0.3) !important;
        background: rgba(245, 247, 250, 0.5) !important;
        border-radius: 4px !important;
      }

      h1, h2, h3 {
        margin-top: 1.5em !important; margin-bottom: 0.8em !important;
        padding-bottom: 0.4em !important;
        border-bottom: 2px solid rgba(102, 126, 234, 0.2) !important;
      }
      ` : ''}

      /* Reduce visual stress from animations */
      *, *::before, *::after {
        animation-duration: 0.01ms !important;
        animation-iteration-count: 1 !important;
        transition-duration: 0.15s !important;
      }

      /* Accessible focus */
      *:focus {
        outline: 3px solid #667eea !important;
        outline-offset: 3px !important;
        border-radius: 2px !important;
      }

      /* Links */
      a {
        text-decoration: underline !important;
        text-decoration-thickness: 2px !important;
        text-underline-offset: 3px !important;
        font-weight: 500 !important;
      }

      /* Lists */
      ul, ol { padding-left: 2em !important; }
      li { margin-bottom: 0.8em !important; padding-left: 0.5em !important; }

      /* Tables */
      table { border-collapse: separate !important; border-spacing: 4px !important; }
      td, th {
        padding: 0.8em 1em !important;
        background: rgba(255, 255, 255, 0.6) !important;
        border: 1px solid rgba(0, 0, 0, 0.1) !important;
      }
      th { font-weight: 600 !important; background: rgba(102, 126, 234, 0.1) !important; }
    `;
  }

  async applyDynamicSettings(settings: {
    fontSize: number;
    lineHeight: number;
    letterSpacing: number;
    wordSpacing: number;
    bionicReading: boolean;
    focusMode: boolean;
  }): Promise<void> {
    const css = this.generateDynamicCSS(settings);
    if (window.api?.injectCSS) {
      await window.api.injectCSS(css);
    } else {
      this.injectCSSDirectly(css, 'dyslexibrowse-dynamic-controls');
    }

    // Bionic reading
    if (settings.bionicReading) this.applyBionicReading();
    else this.removeBionicReading();

    // Focus Mode
    await this.applyFocusMode(settings.focusMode);
  }

  private generateDynamicCSS(settings: {
    fontSize: number;
    lineHeight: number;
    letterSpacing: number;
    wordSpacing: number;
  }): string {
    return `
      /* Dynamic User Controls */
      body, body *, p, span, div, a, li, td, th, h1, h2, h3, h4, h5, h6 {
        font-size: ${settings.fontSize}px !important;
        line-height: ${settings.lineHeight} !important;
        letter-spacing: ${settings.letterSpacing}em !important;
        word-spacing: ${settings.wordSpacing}em !important;
      }
    `;
  }

  private async applyFocusMode(enable: boolean): Promise<void> {
    const script = `
      (function(enable){
        try { if (window.__dysFocusCleanup) { window.__dysFocusCleanup(); } } catch(e) {}
        if (!enable) return;

        var id = 'dys-focus-tooltip';
        var tooltip = document.getElementById(id);
        if (!tooltip) {
          tooltip = document.createElement('div');
          tooltip.id = id;
          tooltip.style.cssText = [
            'position:fixed','left:0','top:0',
            'transform:translate(-9999px,-9999px)',
            'pointer-events:none',
            'background:#111','color:#fff',
            'padding:6px 8px','border-radius:6px',
            'font-size:16px','font-weight:700',
            'box-shadow:0 4px 12px rgba(0,0,0,0.25)',
            'z-index:2147483647'
          ].join(';');
          document.body.appendChild(tooltip);
        }

        function isIgnorable(el) {
          if (!el) return true;
          var tag = el.nodeName;
          return tag === 'SCRIPT' || tag === 'STYLE' || tag === 'CODE' || tag === 'PRE' || tag === 'IFRAME' || tag === 'CANVAS' || tag === 'VIDEO' || tag === 'AUDIO' || tag === 'INPUT' || tag === 'TEXTAREA';
        }

        function getWordAtPoint(x, y) {
          var range = null;
          try {
            if (document.caretRangeFromPoint) {
              range = document.caretRangeFromPoint(x, y);
            } else if (document.caretPositionFromPoint) {
              var pos = document.caretPositionFromPoint(x, y);
              if (pos) {
                range = document.createRange();
                range.setStart(pos.offsetNode, pos.offset);
              }
            }
          } catch(e) { return ''; }
          if (!range || !range.startContainer || range.startContainer.nodeType !== Node.TEXT_NODE) return '';
          var parent = range.startContainer.parentElement;
          if (!parent || isIgnorable(parent)) return '';
          var text = range.startContainer.textContent || '';
          var i = Math.max(0, Math.min(range.startOffset, text.length));
          var start = i, end = i;
          while (start > 0 && /[A-Za-z0-9']/i.test(text[start-1])) start--;
          while (end < text.length && /[A-Za-z0-9']/i.test(text[end])) end++;
          var word = text.slice(start, end).trim();
          return word;
        }

        function onMove(e) {
          try {
            var word = getWordAtPoint(e.clientX, e.clientY);
            if (word) {
              tooltip.textContent = word;
              tooltip.style.transform = 'translate(' + (e.clientX + 14) + 'px,' + (e.clientY + 14) + 'px)';
            } else {
              tooltip.style.transform = 'translate(-9999px,-9999px)';
            }
          } catch(err) {
            tooltip.style.transform = 'translate(-9999px,-9999px)';
          }
        }

        document.addEventListener('mousemove', onMove, { passive: true });

        window.__dysFocusCleanup = function() {
          try { document.removeEventListener('mousemove', onMove); } catch(e) {}
          try {
            var t = document.getElementById(id);
            if (t) t.remove();
          } catch(e) {}
        };
      })(${enable ? 'true' : 'false'});
    `;
    if (window.api?.runScript) {
      try { await window.api.runScript(script); } catch {}
    }
  }

  private applyBionicReading(): void {
    const script = `
      (function() {
        if (window.__bionicApplied) return;
        window.__bionicApplied = true;
        function bionicWord(word) {
          if (word.length < 2) return word;
          var splitIndex = Math.ceil(word.length / 2);
          return '<strong>' + word.slice(0, splitIndex) + '</strong>' + word.slice(splitIndex);
        }
        function processNode(node) {
          if (node.nodeType === Node.TEXT_NODE && node.textContent.trim()) {
            var parent = node.parentElement;
            if (parent && !parent.hasAttribute('data-bionic-processed') &&
                !['SCRIPT','STYLE','CODE','PRE','IFRAME','TEXTAREA','INPUT'].includes(parent.tagName)) {
              var words = node.textContent.split(/(\\s+)/);
              var html = words.map(function(w){ return /\\s/.test(w) ? w : bionicWord(w); }).join('');
              var span = document.createElement('span');
              span.setAttribute('data-bionic-processed', 'true');
              span.innerHTML = html;
              parent.replaceChild(span, node);
            }
          } else if (node.nodeType === Node.ELEMENT_NODE) {
            Array.from(node.childNodes).forEach(processNode);
          }
        }
        processNode(document.body);
      })();
    `;
    if (window.api?.runScript) window.api.runScript(script);
  }

  private removeBionicReading(): void {
    const script = `
      (function() {
        window.__bionicApplied = false;
        document.querySelectorAll('[data-bionic-processed]').forEach(function(el){
          el.outerHTML = el.textContent;
        });
      })();
    `;
    if (window.api?.runScript) window.api.runScript(script);
  }

  private injectCSSDirectly(css: string, id = 'dyslexibrowse-adaptive-styles'): void {
    let styleElement = document.getElementById(id) as HTMLStyleElement;
    if (!styleElement) {
      styleElement = document.createElement('style');
      styleElement.id = id;
      document.head.appendChild(styleElement);
    }
    styleElement.textContent = css;
  }

  private setupMutationObserver(): void {
    if (this.observer) {
      this.observer.disconnect();
    }
    this.observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList' && this.currentProfile && this.currentSettings) {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              this.applyToElement(node as HTMLElement);
            }
          });
        }
      });
    });
    this.observer.observe(document.body, { childList: true, subtree: true });
  }

  private applyToElement(element: HTMLElement): void {
    if (!this.currentSettings) return;
    element.style.fontFamily = this.currentSettings.fontFamily;
    element.style.fontSize = `${this.currentSettings.fontSize}px`;
    element.style.lineHeight = `${this.currentSettings.lineHeight}`;
  }

  async removeAdaptations(): Promise<void> {
    if (window.api?.removeCSS) {
      await window.api.removeCSS();
    } else {
      const styleElement = document.getElementById('dyslexibrowse-adaptive-styles');
      if (styleElement) styleElement.remove();
    }
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
    // Cleanup injected focus mode if any
    await this.applyFocusMode(false);
    this.currentProfile = null;
    this.currentSettings = null;
  }
}
