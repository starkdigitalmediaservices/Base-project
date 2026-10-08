// Runs synchronously before the app bundle to set the initial colour mode and avoid a flash.
// Keep STORAGE_KEY in sync with src/theme/themeStorage.ts.
(function () {
  var STORAGE_KEY = 'app.theme';
  var preference = 'system';
  try {
    preference = window.localStorage.getItem(STORAGE_KEY) || 'system';
  } catch {
    // Storage can be unavailable (private mode, blocked cookies); fall back to the system theme.
  }
  var prefersDark =
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-color-scheme: dark)').matches;
  var resolved =
    preference === 'light' || preference === 'dark' ? preference : prefersDark ? 'dark' : 'light';
  document.documentElement.setAttribute('data-bs-theme', resolved);
})();
