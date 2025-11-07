import type { DyslexiaProfile, AdaptationSettings } from '../types/dyslexia';

export class AdaptationEngine {
  private currentProfile: DyslexiaProfile | null = null;
  private currentSettings: AdaptationSettings | null = null;
  private observer: MutationObserver | null = null;

  async applyAdaptations(profile: DyslexiaProfile): Promise<void> {
    this.currentProfile = profile;
    this.currentSettings = this.generateSettings(profile);
    const css = this.generateAdaptiveCSS(this.currentSettings);
    
    // Inject CSS via Electron API
    if (window.api?.injectCSS) {
      await window.api.injectCSS(css);
    } else {
      this.injectCSSDirectly(css);
    }
    
    this.setupMutationObserver();
  }

  private generateSettings(profile: DyslexiaProfile): AdaptationSettings {
    const baseSettings: AdaptationSettings = {
      fontFamily: 'Arial, sans-serif',
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
          fontFamily: "'Lexend', 'Comic Sans MS', Arial, sans-serif",
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
          fontFamily: "'OpenDyslexic', 'Lexend', Verdana, sans-serif",
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
          fontFamily: "'OpenDyslexic', 'Arial', sans-serif",
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
          fontFamily: "'Lexend', Georgia, serif",
          fontSize: 17,
          lineHeight: 2.0,
          letterSpacing: 0.04,
          wordSpacing: 0.12,
          enableReaderView: true
        };
      
      default:
        return {
          ...baseSettings,
          fontFamily: "'Lexend', Arial, sans-serif",
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
      
      @import url('https://fonts.googleapis.com/css2?family=Lexend:wght@300;400;500;600&display=swap');
      
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

      /* Text Chunking for Comprehension */
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
        margin-top: 1.5em !important;
        margin-bottom: 0.8em !important;
        padding-bottom: 0.4em !important;
        border-bottom: 2px solid rgba(102, 126, 234, 0.2) !important;
      }
      ` : ''}

      /* Disable animations that cause visual stress */
      *, *::before, *::after {
        animation-duration: 0.01ms !important;
        animation-iteration-count: 1 !important;
        transition-duration: 0.15s !important;
      }

      /* Improve focus indicators */
      *:focus {
        outline: 3px solid #667eea !important;
        outline-offset: 3px !important;
        border-radius: 2px !important;
      }

      /* Make links more distinguishable */
      a {
        text-decoration: underline !important;
        text-decoration-thickness: 2px !important;
        text-underline-offset: 3px !important;
        font-weight: 500 !important;
      }

      /* Improve list readability */
      ul, ol {
        padding-left: 2em !important;
      }

      li {
        margin-bottom: 0.8em !important;
        padding-left: 0.5em !important;
      }

      /* Better table readability */
      table {
        border-collapse: separate !important;
        border-spacing: 4px !important;
      }

      td, th {
        padding: 0.8em 1em !important;
        background: rgba(255, 255, 255, 0.6) !important;
        border: 1px solid rgba(0, 0, 0, 0.1) !important;
      }

      th {
        font-weight: 600 !important;
        background: rgba(102, 126, 234, 0.1) !important;
      }
    `;
  }

  private injectCSSDirectly(css: string): void {
    const styleId = 'dyslexibrowse-adaptive-styles';
    let styleElement = document.getElementById(styleId) as HTMLStyleElement;
    
    if (!styleElement) {
      styleElement = document.createElement('style');
      styleElement.id = styleId;
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
          // Re-apply adaptations to new content
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              this.applyToElement(node as HTMLElement);
            }
          });
        }
      });
    });

    this.observer.observe(document.body, {
      childList: true,
      subtree: true
    });
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
    
    this.currentProfile = null;
    this.currentSettings = null;
  }
}
