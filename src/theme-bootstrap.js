/* Runs before paint. A saved choice wins; Automatic follows this device. */
(() => {
  'use strict';
  const choices = ['windows', 'mac', 'ubuntu', 'android', 'ios'];
  const storageKey = 'nathan.appearance.v1';

  function detectTheme(nav) {
    const ua = String(nav.userAgent || '');
    const platform = String(nav.userAgentData?.platform || '').toLowerCase();
    const legacyPlatform = String(nav.platform || '').toLowerCase();
    // Android UAs contain Linux, and desktop-mode iPads can identify as Macs.
    if (platform === 'android' || /android/i.test(ua)) return 'android';
    if (platform === 'ios' || /iphone|ipad|ipod/i.test(ua) ||
        ((platform === 'macos' || /mac/.test(legacyPlatform) || /macintosh/i.test(ua)) &&
         Number(nav.maxTouchPoints || 0) > 1)) return 'ios';
    if (platform === 'macos' || /macintosh|mac os x/i.test(ua)) return 'mac';
    if (platform === 'windows' || /windows/i.test(ua)) return 'windows';
    if (['linux', 'chrome os', 'chromium os'].includes(platform) || /linux|cros/i.test(ua)) return 'ubuntu';
    return 'windows';
  }

  let saved;
  try { saved = window.localStorage.getItem(storageKey); } catch (_) { /* Storage may be blocked. */ }
  const detected = detectTheme(window.navigator);
  const mode = choices.includes(saved) ? saved : 'auto';
  const theme = mode === 'auto' ? detected : mode;
  document.documentElement.dataset.theme = theme;
  document.documentElement.classList.add('has-js');
  window.NathanAppearance = { choices, storageKey, detectTheme, detected, mode, theme };
})();
