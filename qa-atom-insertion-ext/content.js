(() => {
  const EXCLUDED_HOSTS = new Set(['atom.walmart.com', 'teams.wal-mart.com']);
  if (EXCLUDED_HOSTS.has(window.location.hostname)) return;

  const GTIN_PATTERN = /(^|[^\d])(\d{8}|\d{12}|\d{13}|\d{14})(?=$|[^\d])/g;
  const LINK_CLASS = 'qa-atom-link-icon';
  const WRAPPER_CLASS = 'qa-atom-link-wrapper';
  const SKIP_SELECTOR = [
    'script',
    'style',
    'noscript',
    'textarea',
    'input',
    'select',
    'option',
    '[contenteditable="true"]',
    `.${LINK_CLASS}`,
    `.${WRAPPER_CLASS}`,
    'a',
  ].join(',');

  const scheduleIdle = window.requestIdleCallback
    ? window.requestIdleCallback.bind(window)
    : (cb) => window.setTimeout(() => cb({ didTimeout: false, timeRemaining: () => 0 }), 50);

  let pendingRoots = new Set();
  let flushScheduled = false;

  function createAtomLink(gtin) {
    const anchor = document.createElement('a');
    anchor.href = `https://atom.walmart.com/item-management/all-about-an-item?gtin=${encodeURIComponent(gtin)}`;
    anchor.target = '_blank';
    anchor.rel = 'noopener noreferrer';
    anchor.className = LINK_CLASS;
    anchor.textContent = '🔗';
    anchor.title = 'Open in Item Management';
    anchor.setAttribute('aria-label', `Open GTIN ${gtin} in Item Management`);
    return anchor;
  }

  function processTextNode(textNode) {
    const value = textNode.nodeValue;
    if (!value || !/\d{8,14}/.test(value)) return;

    const parent = textNode.parentElement;
    if (!parent || parent.closest(SKIP_SELECTOR)) return;

    GTIN_PATTERN.lastIndex = 0;
    let match = GTIN_PATTERN.exec(value);
    if (!match) return;

    const fragment = document.createDocumentFragment();
    let cursor = 0;

    while (match) {
      const leading = match[1] || '';
      const gtin = match[2];
      const fullMatchStart = match.index;
      const gtinStart = fullMatchStart + leading.length;

      if (gtinStart > cursor) {
        fragment.appendChild(document.createTextNode(value.slice(cursor, gtinStart)));
      }

      const wrapper = document.createElement('span');
      wrapper.className = WRAPPER_CLASS;
      wrapper.appendChild(document.createTextNode(gtin));
      wrapper.appendChild(document.createTextNode(' '));
      wrapper.appendChild(createAtomLink(gtin));
      fragment.appendChild(wrapper);

      cursor = gtinStart + gtin.length;
      match = GTIN_PATTERN.exec(value);
    }

    if (cursor < value.length) {
      fragment.appendChild(document.createTextNode(value.slice(cursor)));
    }

    textNode.parentNode.replaceChild(fragment, textNode);
  }

  function scanRoot(root) {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const nodes = [];
    let current;
    while ((current = walker.nextNode())) {
      nodes.push(current);
    }

    nodes.forEach(processTextNode);
  }

  function queueScan(root) {
    if (!root) return;
    pendingRoots.add(root);
    if (flushScheduled) return;

    flushScheduled = true;
    scheduleIdle(
      () => {
        flushScheduled = false;
        const roots = Array.from(pendingRoots);
        pendingRoots = new Set();
        roots.forEach(scanRoot);
      },
      { timeout: 500 },
    );
  }

  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.type === 'characterData' && mutation.target?.parentNode) {
        queueScan(mutation.target.parentNode);
        return;
      }

      mutation.addedNodes.forEach((node) => {
        if (node.nodeType === Node.TEXT_NODE && node.parentNode) {
          queueScan(node.parentNode);
        } else if (node.nodeType === Node.ELEMENT_NODE) {
          queueScan(node);
        }
      });
    });
  });

  queueScan(document.body);
  observer.observe(document.body, {
    childList: true,
    subtree: true,
    characterData: true,
  });
})();
