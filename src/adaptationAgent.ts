export const adaptationAgentScript = `(function () {
  try {
    const isPreserved = (el) => {
      while (el) {
        if (el.nodeType === 1 && el.hasAttribute && el.hasAttribute('data-preserve-format') && el.getAttribute('data-preserve-format') === 'true') return true;
        el = el.parentElement;
      }
      return false;
    };

    const shouldWrap = (node) => {
      if (!node || node.nodeType !== Node.TEXT_NODE) return false;
      const txt = node.textContent ? node.textContent.trim() : '';
      if (txt.length < 40) return false;
      const parent = node.parentElement;
      if (!parent) return false;
      const tag = parent.tagName ? parent.tagName.toLowerCase() : '';
      if (tag === 'pre' || tag === 'code') return false;
      if (isPreserved(parent)) return false;
      return true;
    };

    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
      acceptNode: function (node) {
        return shouldWrap(node) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
      }
    }, false);

    const toWrap = [];
    let n;
    while ((n = walker.nextNode())) {
      toWrap.push(n);
    }

    toWrap.forEach(textNode => {
      try {
        const span = document.createElement('span');
        span.className = 'dys-adapted-text';
        span.textContent = textNode.textContent;
        textNode.parentNode && textNode.parentNode.replaceChild(span, textNode);
      } catch (err) {
        // ignore DOM errors
      }
    });

    // Expose selection helper
    window.__getSelectedTextForClassification = function () {
      try {
        const s = window.getSelection();
        return s ? s.toString() : '';
      } catch (e) {
        return '';
      }
    };

  } catch (e) {
    // graceful no-op
    console.warn('adaptationAgent error', e);
  }
})();`;

export default adaptationAgentScript;
