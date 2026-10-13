(() => {
  'use strict';
  const avatar = document.querySelector('.contact-avatar');
  const initials = avatar.querySelector('.contact-initials');
  const photo = avatar.querySelector('.contact-photo');
  const bitmap = avatar.querySelector('.contact-bitmap');
  const context = bitmap.getContext('2d');
  let original;
  let generation = 0;
  const palette = [
    [0, 0, 0], [128, 128, 128], [192, 192, 192], [255, 255, 255],
    [128, 0, 0], [255, 0, 0], [128, 128, 0], [255, 255, 0],
    [0, 128, 0], [0, 255, 0], [0, 128, 128], [0, 255, 255],
    [0, 0, 128], [0, 0, 255], [128, 0, 128], [255, 0, 255]
  ];
  const bayer = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
  function render(theme = document.documentElement.dataset.theme) {
    if (!original) return;
    const retro = theme === 'windows' || theme === 'mac';
    photo.hidden = retro;
    bitmap.hidden = !retro;
    initials.hidden = true;
    if (!retro) return;
    // A real low-resolution bitmap, rather than a sharp image with a pixelated hint.
    bitmap.width = theme === 'windows' ? 32 : 64;
    bitmap.height = theme === 'windows' ? 40 : 80;
    context.imageSmoothingEnabled = false;
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
          const shade = gray > (bayer[(y % 4) * 4 + x % 4] + .5) * 16 ? 255 : 0;
          pixels.data.set([shade, shade, shade], i);
        } else {
          let closest = palette[0], distance = Infinity;
          for (const color of palette) {
            const candidate = (r - color[0]) ** 2 + (g - color[1]) ** 2 + (b - color[2]) ** 2;
            if (candidate < distance) { closest = color; distance = candidate; }
          }
          pixels.data.set(closest, i);
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
