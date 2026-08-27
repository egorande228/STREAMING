(() => {
  const storageKey = 'kinglive_theme';
  const root = document.documentElement;
  const media = typeof window.matchMedia === 'function'
    ? window.matchMedia('(prefers-color-scheme: light)')
    : null;
  const labels = {
    en: { group: 'Color theme', light: 'Light', dark: 'Dark' },
    es: { group: 'Tema de color', light: 'Claro', dark: 'Oscuro' },
    fr: { group: 'Thème de couleur', light: 'Clair', dark: 'Sombre' },
    ar: { group: 'المظهر', light: 'فاتح', dark: 'داكن' },
    mn: { group: 'Өнгөний загвар', light: 'Цайвар', dark: 'Бараан' },
  };

  function readStoredTheme() {
    try {
      const value = window.localStorage.getItem(storageKey);
      return value === 'light' || value === 'dark' ? value : null;
    } catch {
      return null;
    }
  }

  let followsSystem = readStoredTheme() == null;

  function currentLocale() {
    const locale = String(root.lang || 'en').toLowerCase().split('-')[0];
    return labels[locale] ? locale : 'en';
  }

  function syncControls() {
    const copy = labels[currentLocale()];
    document.querySelectorAll('[data-theme-switch]').forEach((group) => {
      group.setAttribute('aria-label', copy.group);
    });
    document.querySelectorAll('[data-theme-option]').forEach((button) => {
      const theme = button.dataset.themeOption;
      const label = copy[theme] || theme;
      button.setAttribute('aria-pressed', String(root.dataset.theme === theme));
      button.setAttribute('aria-label', label);
      button.setAttribute('title', label);
      const labelNode = button.querySelector('[data-theme-label]');
      if (labelNode) labelNode.textContent = label;
    });
  }

  function applyTheme(theme, persist = false) {
    const nextTheme = theme === 'light' ? 'light' : 'dark';
    root.dataset.theme = nextTheme;
    root.style.colorScheme = nextTheme;
    if (persist) {
      followsSystem = false;
      try {
        window.localStorage.setItem(storageKey, nextTheme);
      } catch {
        // The selected theme still applies when storage is unavailable.
      }
    }
    syncControls();
  }

  function connectControls() {
    document.querySelectorAll('[data-theme-option]').forEach((button) => {
      button.addEventListener('click', () => applyTheme(button.dataset.themeOption, true));
    });
    syncControls();
  }

  applyTheme(readStoredTheme() || (media?.matches ? 'light' : 'dark'));

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', connectControls, { once: true });
  } else {
    connectControls();
  }

  if (typeof MutationObserver === 'function') {
    new MutationObserver(syncControls).observe(root, { attributes: true, attributeFilter: ['lang'] });
  }

  const followSystemTheme = (event) => {
    if (followsSystem) applyTheme(event.matches ? 'light' : 'dark');
  };
  if (typeof media?.addEventListener === 'function') media.addEventListener('change', followSystemTheme);
  else if (typeof media?.addListener === 'function') media.addListener(followSystemTheme);
})();
