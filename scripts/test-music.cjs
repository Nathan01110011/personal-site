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
        const desktop = ['windows', 'mac', 'ubuntu'].includes(theme);
        assert.equal(await page.locator('.profiles').isVisible(), desktop);
        const bounds = await page.evaluate(() => {
          const frame = document.querySelector('#spotify-player-host iframe').getBoundingClientRect();
          const app = document.querySelector(['windows', 'mac', 'ubuntu'].includes(document.documentElement.dataset.theme) ? '#music-window' : '#home-window').getBoundingClientRect();
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
        assert.equal(await page.locator('.music-controls button[aria-label="Pause playback"]').count(), 1, 'One pause control during playback');
        if (desktop) await page.locator('#music-window [data-window-action="close"]').click();
        else await page.locator('.music-back').click();
        assert.equal(await page.locator('.profiles').isVisible(), true);
        assert.equal(await page.locator('.music-player').isVisible(), false);
        assert.equal(await page.evaluate(() => window.__musicCalls.at(-1)[0]), desktop ? 'destroy' : 'pause');
        assert.equal(await page.locator('.profiles [data-open-music]').evaluate(el => el === document.activeElement), true);
        await page.locator('.profiles [data-open-cv]').click();
        assert.equal(await page.locator('.cv-notes').isVisible(), true);
        if (desktop) await page.locator('#cv-window [data-window-action="close"]').click();
        else await page.locator('.cv-back').click();
        await page.locator('.profiles [data-open-music]').click();
        await page.locator('.music-reload').click();
        await page.waitForFunction(() => !document.querySelector('[data-music-action="toggle"]').disabled);
        assert.equal(await page.locator('#spotify-player-host iframe').count(), 1, 'Reload replaces the player');
        checks++;
      }
    }
    for (const theme of ['windows', 'mac', 'ubuntu']) {
      await page.setViewportSize({ width: 1366, height: 900 });
      await page.goto(url);
      await page.evaluate(theme => document.querySelector('[data-theme-choice="' + theme + '"]').click(), theme);
      await page.locator('.profiles [data-open-music]').click();
      await page.waitForFunction(() => !document.querySelector('[data-music-action="toggle"]').disabled);
      await page.locator('[data-music-action="toggle"]').click();
      await page.locator(theme === 'mac' ? '#mac-home' : '#restore').click();
      await page.locator('.profiles [data-open-cv]').click();
      assert.equal(await page.locator('#home-window').isVisible(), true);
      assert.equal(await page.locator('#cv-window').isVisible(), true);
      assert.equal(await page.locator('#music-window').isVisible(), true);
      assert.equal(await page.locator('.music-play').getAttribute('aria-pressed'), 'true', 'Opening CV preserves music playback');
      const order = () => page.locator('.window').evaluateAll(elements => elements
        .filter(el => !el.hidden)
        .sort((a, b) => Number(a.style.zIndex) - Number(b.style.zIndex))
        .map(el => el.id));
      async function selectWindow(view) {
        if (view === 'home') await page.locator(theme === 'mac' ? '#mac-home' : '#restore').click();
        else if (theme === 'mac') {
          await page.locator('#mac-appearance').click();
          await page.locator('.system-menu [data-open-' + view + ']').click();
        } else await page.locator('[data-restore-app="' + view + '"]').click();
      }
      // All initial stacking permutations: raising a window may only remove that
      // window from its old position and append it to the front of the stack.
      for (const sequence of [
        ['cv', 'music', 'home'], ['music', 'cv', 'home'],
        ['home', 'cv', 'music'], ['cv', 'home', 'music'],
        ['home', 'music', 'cv'], ['music', 'home', 'cv']
      ]) {
        for (const view of sequence) await selectWindow(view);
        for (const view of ['cv', 'home', 'music', 'home', 'cv', 'cv']) {
          const before = await order();
          const selected = view + '-window';
          await selectWindow(view);
          assert.deepEqual(await order(), [...before.filter(id => id !== selected), selected], theme + ': selecting ' + view + ' preserves other windows');
        }
      }
      await selectWindow('home');
      const homeBounds = await page.locator('#home-window').boundingBox();
      const cvBounds = await page.locator('#cv-window').boundingBox();
      // Its title bar is exposed above the launcher: exercise a direct window click.
      const beforeClick = await order();
      assert.ok(cvBounds.y < homeBounds.y, 'CV title bar is exposed');
      await page.locator('#cv-window .window-title-text').click();
      assert.deepEqual(await order(), [...beforeClick.filter(id => id !== 'cv-window'), 'cv-window'], theme + ': direct click raises only CV');

      await page.locator('#cv-window [data-window-action="minimize"]').click();
      assert.equal(await page.locator('#cv-window').isVisible(), false);
      await page.locator('.profiles [data-open-cv]').click();
      assert.equal(await page.locator('#cv-window').isVisible(), true, 'Launcher restores existing app');
      assert.equal(await page.locator('#cv-window').count(), 1);
      await page.locator('#cv-window [data-window-action="maximize"]').click();
      assert.equal(await page.locator('#cv-window').evaluate(el => el.classList.contains('maximized')), true);
      await page.locator('#cv-window [data-window-action="maximize"]').click();
      const bar = page.locator('#cv-window .window-title-text');
      const before = await page.locator('#cv-window').boundingBox();
      const handle = await bar.boundingBox();
      await page.mouse.move(handle.x + handle.width / 2, handle.y + handle.height / 2);
      await page.mouse.down();
      await page.mouse.move(handle.x + handle.width / 2 + 30, handle.y + handle.height / 2 + 35);
      await page.mouse.up();
      const after = await page.locator('#cv-window').boundingBox();
      assert.ok(after.x > before.x && after.y > before.y, 'App window moves independently');
      await page.locator('#cv-window [data-window-action="close"]').click();
      await page.locator('#close').click();
      assert.equal(await page.locator('#music-window').isVisible(), true, 'Closing launcher leaves app open');
      assert.equal(await page.locator('.music-play').getAttribute('aria-pressed'), 'true');
      await page.locator(theme === 'mac' ? '#mac-home' : '#restore').click();
      await page.locator('.profiles [data-open-music]').click();
      assert.equal(await page.locator('#spotify-player-host iframe').count(), 1, 'Reopening focuses one live player');
      await page.locator('#music-window [data-window-action="minimize"]').click();
      assert.equal(await page.locator('.music-play').getAttribute('aria-pressed'), 'true', 'Minimize preserves playback');
      await page.locator('.profiles [data-open-music]').click();
      await page.locator('#music-window [data-window-action="close"]').click();
      assert.equal(await page.locator('#spotify-player-host iframe').count(), 0, 'Close unloads player');
      await page.locator('.profiles [data-open-music]').click();
      await page.waitForFunction(() => !document.querySelector('[data-music-action="toggle"]').disabled);
    }
    for (const theme of ['ios', 'windows', 'android', 'mac']) {
      await page.evaluate(theme => document.querySelector('[data-theme-choice="' + theme + '"]').click(), theme);
      if (['windows', 'mac'].includes(theme)) {
        await page.locator(theme === 'mac' ? '#mac-home' : '#restore').click();
        await page.locator('.profiles [data-open-music]').click();
      } else if (!(await page.locator('.music-player').isVisible())) {
        await page.locator('.profiles [data-open-music]').click();
      }
      await page.waitForFunction(() => !document.querySelector('[data-music-action="toggle"]').disabled);
      assert.equal(await page.locator('#spotify-player-host iframe').count(), 1, 'Theme change keeps a usable single player');
    }
    // Check actual geometry, including restored drag positions, rather than
    // only checking whether the maximized class was applied.
    for (const theme of ['windows', 'mac', 'ubuntu']) {
      for (const [width, height] of [[1366, 900], [390, 844]]) {
        await page.setViewportSize({ width, height });
        await page.goto(url);
        await page.evaluate(theme => document.querySelector('[data-theme-choice="' + theme + '"]').click(), theme);
        for (const view of ['home', 'cv', 'music']) {
          if (view !== 'home') await page.locator('.profiles [data-open-' + view + ']').click();
          if (view === 'music') await page.waitForFunction(() => !document.querySelector('[data-music-action="toggle"]').disabled);
          const shell = page.locator('#' + view + '-window');
          const zoom = shell.locator(view === 'home' ? '#maximize' : '[data-window-action="maximize"]');
          const original = await shell.boundingBox();
          await zoom.click();
          assert.equal(await zoom.locator('.restore-symbol').isVisible(), true, 'Maximized button shows restore icon');
          assert.equal(await zoom.locator('.maximize-symbol').isVisible(), false);
          const expanded = await shell.boundingBox();
          const top = { windows: 8, mac: 42, ubuntu: 43 }[theme];
          const bottom = { windows: 50, mac: 8, ubuntu: 47 }[theme];
          assert.equal(Math.round(expanded.x), 8, theme + ' ' + view + ': maximize moves left edge');
          assert.equal(Math.round(expanded.y), top, theme + ' ' + view + ': maximize moves top edge');
          assert.equal(Math.round(expanded.width), width - 16, theme + ' ' + view + ': maximize fills width');
          assert.equal(Math.round(expanded.height), height - top - bottom, theme + ' ' + view + ': maximize fills height');
          await zoom.click();
          assert.equal(await zoom.locator('.maximize-symbol').isVisible(), true, 'Restored button shows maximize icon');
          assert.equal(await zoom.locator('.restore-symbol').isVisible(), false);
          const restored = await shell.boundingBox();
          for (const key of ['x', 'y', 'width', 'height']) assert.ok(Math.abs(original[key] - restored[key]) < 1, theme + ' ' + view + ': restore ' + key);
          if (view !== 'home') await shell.locator('[data-window-action="close"]').click();
        }
      }
    }
    // The iPad Settings sidebar must fill the entire remaining screen.
    for (const [width, height] of [[960, 1400], [844, 390]]) {
      await page.setViewportSize({ width, height });
      await page.goto(url);
      await page.evaluate(() => document.querySelector('[data-theme-choice="ios"]').click());
      await page.locator('#mobile-settings').click();
      const settings = await page.evaluate(() => ({
        menu: document.querySelector('#system-menu').getBoundingClientRect().bottom,
        sidebar: document.querySelector('.tablet-settings-sidebar').getBoundingClientRect().bottom,
        last: document.querySelector('[data-theme-choice="ios"]').getBoundingClientRect().bottom,
        list: document.querySelector('.theme-list').getBoundingClientRect().bottom
      }));
      assert.equal(Math.round(settings.sidebar), Math.round(settings.menu), 'Settings sidebar fills screen');
      await page.locator('[data-theme-choice="ios"]').scrollIntoViewIfNeeded();
      assert.equal(await page.locator('[data-theme-choice="ios"]').isVisible(), true, 'Last appearance choice remains reachable');
    }
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
    if (await fallback.locator('#music-window').isVisible()) await fallback.locator('#music-window [data-window-action="close"]').click();
    else await fallback.locator('.music-back').click();
    assert.equal(await fallback.locator('#spotify-player-host iframe').count(), 0, 'Fallback audio unloads on Back');
    console.log('Passed ' + checks + ' theme/viewport music flows plus independent desktop windows, drag, stable stacking order, minimize, maximize, Settings height and blocked-API fallback.');
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
