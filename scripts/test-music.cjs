/* Browser checks with a controlled Spotify API; no audio or Spotify login needed. */
const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { chromium } = require('playwright');
const url = pathToFileURL(path.resolve(__dirname, '../index.html')).href;
const mockApi = `
window.__musicCalls = [];
window.onSpotifyIframeApiReady({ createController(element, options, callback) {
  window.__musicCalls.push(['create', options.url]);
  const frame = document.createElement('iframe');
  frame.src = 'https://open.spotify.com/embed/playlist/4J8Zno4WdUbklWUBffoirT?theme=0';
  element.replaceWith(frame);
  const listeners = {};
  let paused = true, position = 0;
  const update = () => listeners.playback_update?.({ data: { isPaused: paused, position } });
  const controller = {
    addListener(name, fn) { listeners[name] = fn; },
    togglePlay() { window.__musicCalls.push(['toggle']); paused = !paused; position = 12000; update(); },
    pause() { window.__musicCalls.push(['pause']); paused = true; update(); },
    restart() { window.__musicCalls.push(['restart']); position = 0; update(); },
    destroy() { window.__musicCalls.push(['destroy']); clearTimeout(timer); frame.remove(); }
  };
  callback(controller);
  const timer = setTimeout(() => listeners.ready?.(), 50);
}});`;
const mockEmbed = '<html><body style="margin:0;padding:24px;background:#121212;color:white;font:14px Arial"><h2>Spotify playlist fixture</h2><p>Live track selection is supplied by Spotify.</p></body></html>';

(async () => {
  const browser = await chromium.launch({
    headless: true,
    ...(process.env.TEST_BROWSER_PATH ? { executablePath: process.env.TEST_BROWSER_PATH } : {}),
    args: ['--no-sandbox', '--disable-dev-shm-usage', '--no-zygote', '--disable-gpu', '--use-gl=disabled']
  });
  try {
    const context = await browser.newContext();
    await context.route('https://open.spotify.com/embed/iframe-api/v1', route => route.fulfill({ contentType: 'application/javascript', body: mockApi }));
    await context.route('https://open.spotify.com/embed/playlist/**', route => route.fulfill({ contentType: 'text/html', body: mockEmbed }));
    await context.route('https://wallpaperswide.com/**', route => route.abort());
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    let checks = 0;
    for (const theme of ['windows', 'mac', 'ubuntu', 'android', 'ios']) {
      for (const [width, height] of [[320, 640], [390, 844], [844, 390], [1366, 900]]) {
        await page.setViewportSize({ width, height });
        await page.goto(url);
        await page.evaluate(theme => {
          document.querySelector('[data-theme-choice="' + theme + '"]').click();
        }, theme);
        assert.equal(await page.locator('#spotify-player-host iframe').count(), 0, 'No embed before launch');
        assert.equal(await page.locator('script[src*="iframe-api"]').count(), 0, 'No Spotify script before launch');
        await page.locator('.profiles [data-open-music]').click();
        await page.waitForFunction(() => !document.querySelector('[data-music-action="toggle"]').disabled);
        assert.equal(await page.locator('.music-player').isVisible(), true);
        assert.equal(await page.locator('.profiles').isVisible(), false);
        const bounds = await page.evaluate(() => {
          const frame = document.querySelector('#spotify-player-host iframe').getBoundingClientRect();
          const app = document.querySelector('#home-window').getBoundingClientRect();
          return { width: document.documentElement.scrollWidth, frameLeft: frame.left, frameRight: frame.right, appTop: app.top, appBottom: app.bottom };
        });
        assert.ok(bounds.width <= width + 1, theme + ': no horizontal page overflow at ' + width);
        assert.ok(bounds.frameLeft >= -1 && bounds.frameRight <= width + 1, theme + ': iframe fits');
        if (theme === 'android' || theme === 'ios') {
          assert.equal(Math.round(bounds.appTop), theme === 'android' && width >= 768 ? 0 : 29);
          assert.equal(Math.round(bounds.appBottom), theme === 'android' && width >= 768 ? height - 42 : height);
        }
        await page.locator('[data-music-action="toggle"]').click();
        assert.equal(await page.locator('.music-play').getAttribute('aria-pressed'), 'true');
        assert.equal(await page.locator('.music-time').textContent(), '00:12');
        await page.locator('[data-music-action="restart"]').click();
        assert.equal(await page.locator('.music-time').textContent(), '00:00');
        await page.locator('.music-back').click();
        assert.equal(await page.locator('.profiles').isVisible(), true);
        assert.equal(await page.locator('.music-player').isVisible(), false);
        assert.equal(await page.evaluate(() => window.__musicCalls.at(-1)[0]), 'pause');
        assert.equal(await page.locator('.profiles [data-open-music]').evaluate(el => el === document.activeElement), true);
        await page.locator('.profiles [data-open-cv]').click();
        assert.equal(await page.locator('.cv-notes').isVisible(), true);
        await page.locator('.cv-back').click();
        await page.locator('.profiles [data-open-music]').click();
        await page.locator('.music-reload').click();
        await page.waitForFunction(() => !document.querySelector('[data-music-action="toggle"]').disabled);
        assert.equal(await page.locator('#spotify-player-host iframe').count(), 1, 'Reload replaces the player');
        checks++;
      }
    }
    await page.evaluate(() => document.querySelector('[data-theme-choice="windows"]').click());
    await page.locator('[data-music-action="toggle"]').click();
    await page.locator('#close').click();
    assert.equal(await page.locator('#spotify-player-host iframe').count(), 0, 'Close unloads the player');
    await page.locator('#restore').click();
    await page.waitForFunction(() => !document.querySelector('[data-music-action="toggle"]').disabled);
    await page.locator('#maximize').click();
    assert.equal(await page.locator('#home-window').evaluate(el => el.classList.contains('maximized')), true);
    await page.locator('#maximize').click();
    assert.deepEqual(errors, [], 'No page script errors');

    // A blocked Spotify API still leaves its normal, usable playlist iframe.
    const fallback = await browser.newPage({ viewport: { width: 390, height: 844 } });
    await fallback.route('https://open.spotify.com/embed/iframe-api/v1', route => route.abort());
    await fallback.route('https://open.spotify.com/embed/playlist/**', route => route.fulfill({ contentType: 'text/html', body: mockEmbed }));
    await fallback.goto(url);
    await fallback.locator('.profiles [data-open-music]').click();
    await fallback.waitForSelector('#spotify-player-host iframe');
    assert.equal(await fallback.locator('[data-music-action="toggle"]').isDisabled(), true);
    assert.equal(await fallback.locator('.music-help a').getAttribute('href'), 'https://open.spotify.com/playlist/4J8Zno4WdUbklWUBffoirT');
    await fallback.locator('.music-back').click();
    assert.equal(await fallback.locator('#spotify-player-host iframe').count(), 0, 'Fallback audio unloads on Back');
    console.log('Passed ' + checks + ' theme/viewport music flows plus close/restore, maximize and blocked-API fallback.');
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
