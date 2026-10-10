(() => {
  'use strict';
  // Keep the playlist live: Spotify owns the track list, artwork and playback.
  const playlistUrl = 'https://open.spotify.com/playlist/4J8Zno4WdUbklWUBffoirT';
  const embedTheme = () => ['mac', 'ubuntu', 'ios'].includes(document.documentElement.dataset.theme) ? '1' : '0';
  const embedUrl = () => playlistUrl.replace('/playlist/', '/embed/playlist/') + '?theme=' + embedTheme();
  const player = document.querySelector('.music-player');
  const host = document.getElementById('spotify-player-host');
  const status = player.querySelector('.music-state');
  const help = player.querySelector('.music-help');
  const controls = Array.from(player.querySelectorAll('[data-music-action]'));
  const toggle = player.querySelector('[data-music-action="toggle"]');
  const reload = player.querySelector('.music-reload');
  let apiPromise;
  let loadedApi;
  let controller = null;
  let fallbackFrame = null;
  let initialized = false;
  let attempt = 0;
  let currentView = 'home';
  let readyTimer;
  let fallbackTouched = false;
  let loadedEmbedTheme = null;

  function enableControls(enabled) {
    controls.forEach(button => { button.disabled = !enabled; });
  }
  function updatePlayback(data = {}) {
    const playing = data.isPaused === false;
    player.classList.toggle('is-playing', playing && !data.isBuffering);
    toggle.setAttribute('aria-pressed', String(playing));
    toggle.setAttribute('aria-label', playing ? 'Pause playback' : 'Play playlist');
    toggle.querySelector('.music-play-symbol').textContent = playing ? 'Ⅱ' : '▶';
    toggle.querySelector('.music-control-label').textContent = playing ? 'Pause' : 'Play';
    const seconds = Math.max(0, Math.floor((Number(data.position) || 0) / 1000));
    player.querySelector('.music-time').textContent = Math.floor(seconds / 60).toString().padStart(2, '0') + ':' + (seconds % 60).toString().padStart(2, '0');
    status.textContent = data.isBuffering ? 'Buffering…' : playing ? 'Playing from Spotify' : 'Choose a track below, or press Play.';
  }
  function getApi() {
    if (loadedApi) return Promise.resolve(loadedApi);
    if (apiPromise) return apiPromise;
    apiPromise = new Promise(resolve => {
      let settled = false;
      const finish = api => {
        if (settled) return;
        settled = true;
        window.clearTimeout(timer);
        resolve(api);
      };
      const timer = window.setTimeout(() => finish(null), 20000);
      window.onSpotifyIframeApiReady = api => { loadedApi = api; finish(api); };
      const script = document.createElement('script');
      script.src = 'https://open.spotify.com/embed/iframe-api/v1';
      script.async = true;
      script.addEventListener('error', () => finish(null), { once: true });
      document.head.appendChild(script);
    });
    return apiPromise;
  }
  function destroyPlayer() {
    attempt++;
    window.clearTimeout(readyTimer);
    if (controller) {
      try { controller.destroy(); } catch (_) { /* A blocked embed may already be gone. */ }
    }
    controller = null;
    fallbackFrame = null;
    fallbackTouched = false;
    initialized = false;
    loadedEmbedTheme = null;
    host.replaceChildren();
    enableControls(false);
    updatePlayback();
  }
  function useFallback(loadAttempt) {
    if (loadAttempt !== attempt) return;
    if (controller) {
      try { controller.destroy(); } catch (_) { /* Still offer the plain embed. */ }
      controller = null;
    }
    enableControls(false);
    fallbackFrame = document.createElement('iframe');
    fallbackFrame.src = embedUrl();
    fallbackFrame.title = "Nathan's Spotify playlist";
    fallbackFrame.allow = 'autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture';
    fallbackFrame.setAttribute('allowfullscreen', '');
    fallbackFrame.referrerPolicy = 'strict-origin-when-cross-origin';
    host.replaceChildren(fallbackFrame);
    status.textContent = 'Use the play controls in the playlist below.';
    // Always retain a direct route when third-party content is blocked.
    help.hidden = false;
  }
  async function loadPlaylist() {
    if (initialized) return;
    initialized = true;
    loadedEmbedTheme = embedTheme();
    const loadAttempt = ++attempt;
    // Show the ordinary player immediately while the optional control API loads.
    useFallback(loadAttempt);
    const api = await getApi();
    if (loadAttempt !== attempt || currentView !== 'music') return;
    if (!api || fallbackTouched) return;
    fallbackFrame = null;
    help.hidden = true;
    status.textContent = 'Loading Spotify playlist…';
    const mount = document.createElement('div');
    host.replaceChildren(mount);
    readyTimer = window.setTimeout(() => useFallback(loadAttempt), 30000);
    try {
      api.createController(mount, { url: playlistUrl + '?theme=' + loadedEmbedTheme, width: '100%', height: 560 }, created => {
        if (loadAttempt !== attempt || fallbackFrame) { created.destroy(); return; }
        controller = created;
        const iframe = host.querySelector('iframe');
        if (iframe) iframe.title = "Nathan's Spotify playlist";
        controller.addListener('ready', () => {
          if (loadAttempt !== attempt || fallbackFrame) return;
          window.clearTimeout(readyTimer);
          enableControls(true);
          updatePlayback();
          if (currentView !== 'music') controller.pause();
        });
        controller.addListener('playback_update', event => {
          if (loadAttempt !== attempt || fallbackFrame) return;
          updatePlayback(event.data);
          // Do not allow a delayed ready/play event to restart a closed app.
          if (currentView !== 'music' && event.data.isPaused === false) controller.pause();
        });
      });
    } catch (_) {
      window.clearTimeout(readyTimer);
      useFallback(loadAttempt);
    }
  }
  function pausePlayback() {
    if (controller) {
      try { controller.pause(); } catch (_) { destroyPlayer(); }
      player.classList.remove('is-playing');
    } else if (initialized) {
      // Plain cross-origin embeds have no external pause API. Removing them stops audio.
      destroyPlayer();
    }
  }
  controls.forEach(button => button.addEventListener('click', () => {
    if (!controller) return;
    try {
      const action = button.dataset.musicAction;
      if (action === 'toggle') controller.togglePlay();
      else if (action === 'restart') controller.restart();
    } catch (_) {
      enableControls(false);
      status.textContent = 'Use the play controls in the playlist below.';
      help.hidden = false;
    }
  }));
  reload.addEventListener('click', () => {
    destroyPlayer();
    loadPlaylist();
  });
  host.addEventListener('focusin', () => { if (fallbackFrame) fallbackTouched = true; });
  window.addEventListener('blur', () => {
    if (fallbackFrame && document.activeElement === fallbackFrame) fallbackTouched = true;
  });
  document.addEventListener('nathan:viewchange', event => {
    currentView = event.detail.view;
    if (currentView === 'music') loadPlaylist();
    else pausePlayback();
  });
  document.addEventListener('nathan:musicclose', () => {
    currentView = 'home';
    destroyPlayer();
  });
  document.addEventListener('nathan:musicopen', () => {
    currentView = 'music';
    loadPlaylist();
  });
  document.addEventListener('nathan:themechange', event => {
    player.querySelector('.music-app-name').textContent = {
      windows: 'Winamp', mac: 'QuickTime Player', ubuntu: 'Rhythmbox', android: 'Music', ios: 'Music'
    }[event.detail.theme];
    // The Spotify iframe theme is chosen at creation time, so update it only
    // when switching between light and dark OS appearances.
    if (initialized && loadedEmbedTheme !== embedTheme()) {
      destroyPlayer();
      if (currentView === 'music') loadPlaylist();
    }
  });
})();
