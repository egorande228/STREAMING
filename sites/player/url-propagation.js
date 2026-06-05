(function () {
  function hasCurrentParams() {
    return Boolean(window.location.search && window.location.search.length > 1);
  }

  function shouldSkipHref(href) {
    const normalized = String(href || '').trim().toLowerCase();
    return (
      !normalized ||
      normalized.startsWith('#') ||
      normalized.startsWith('mailto:') ||
      normalized.startsWith('tel:') ||
      normalized.startsWith('javascript:')
    );
  }

  function appendCurrentParams(href) {
    const url = new URL(href, window.location.href);
    const currentParams = new URLSearchParams(window.location.search);

    currentParams.forEach((value, key) => {
      url.searchParams.set(key, value);
    });

    return url.toString();
  }

  document.addEventListener(
    'click',
    (event) => {
      if (!hasCurrentParams()) return;

      const link = event.target && typeof event.target.closest === 'function'
        ? event.target.closest('a[href]')
        : null;
      if (!link) return;

      const href = link.getAttribute('href');
      if (shouldSkipHref(href)) return;

      try {
        link.href = appendCurrentParams(href);
      } catch {}
    },
    true,
  );
})();
