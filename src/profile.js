(() => {
  'use strict';
  const avatar = document.querySelector('.contact-avatar');
  const initials = avatar.querySelector('.contact-initials');
  const photo = avatar.querySelector('.contact-photo');
  const bitmap = avatar.querySelector('.contact-bitmap');
  const context = bitmap.getContext('2d');
  let original;
  let generation = 0;
  const bayer = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
  function render(theme = document.documentElement.dataset.theme) {
    if (!original) return;
    const retro = theme === 'windows' || theme === 'mac';
    photo.hidden = retro;
    bitmap.hidden = !retro;
    initials.hidden = true;
    if (!retro) return;
    // A real low-resolution bitmap, rather than a sharp image with a pixelated hint.
    bitmap.width = theme === 'windows' ? 64 : 96;
    bitmap.height = theme === 'windows' ? 80 : 120;
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = 'high';
    const scale = Math.max(bitmap.width / original.naturalWidth, bitmap.height / original.naturalHeight);
    const width = original.naturalWidth * scale, height = original.naturalHeight * scale;
    context.drawImage(original, (bitmap.width - width) / 2, (bitmap.height - height) / 2, width, height);
    try {
      const pixels = context.getImageData(0, 0, bitmap.width, bitmap.height);
      for (let i = 0; i < pixels.data.length; i += 4) {
        const [r, g, b] = pixels.data.slice(i, i + 3);
        if (theme === 'mac') {
          const x = (i / 4) % bitmap.width, y = Math.floor(i / 4 / bitmap.width);
          const gray = .299 * r + .587 * g + .114 * b;
          // Eight grey tones preserve features; a small ordered pattern keeps the era's texture.
          const texture = (bayer[(y % 4) * 4 + x % 4] - 7.5) * 1.5;
          const shade = Math.round(Math.max(0, Math.min(255, gray + texture)) / (255 / 7)) * (255 / 7);
          pixels.data.set([shade, shade, shade], i);
        } else {
          // Windows high-colour mode keeps natural skin tones while the bitmap stays crisp.
          pixels.data.set([Math.round(r / 255 * 31) * 255 / 31, Math.round(g / 255 * 63) * 255 / 63, Math.round(b / 255 * 31) * 255 / 31], i);
        }
      }
      context.putImageData(pixels, 0, 0);
    } catch (_) { /* Cross-origin portraits can still show the low-resolution image. */ }
  }
  function setPortrait(url) {
    const request = ++generation;
    if (!url) {
      original = null;
      photo.hidden = bitmap.hidden = true;
      photo.removeAttribute('src');
      initials.hidden = false;
      return Promise.resolve();
    }
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => {
        if (request !== generation) { resolve(); return; }
        original = image;
        photo.src = url;
        render();
        resolve();
      };
      image.onerror = () => {
        if (request === generation) { original = null; photo.hidden = bitmap.hidden = true; initials.hidden = false; }
        reject(new Error('Could not load the profile photo.'));
      };
      image.src = url;
    });
  }
  document.addEventListener('nathan:themechange', event => render(event.detail.theme));
  // The review page can supply a local photo without uploading it anywhere.
  window.NathanProfile = { setPortrait };
  if (avatar.dataset.portrait) setPortrait(avatar.dataset.portrait).catch(() => {});
})();
