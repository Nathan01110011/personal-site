(() => {
  'use strict';
  const appearance = window.NathanAppearance;
  const labels = { windows: 'Windows 98', mac: 'Classic Mac', ubuntu: 'Ubuntu', android: 'Android', ios: 'iOS' };
  const home = document.getElementById('home-window');
  const restore = document.getElementById('restore');
  const maximize = document.getElementById('maximize');
  const menu = document.getElementById('system-menu');
  const toggles = Array.from(document.querySelectorAll('[data-open-menu]'));
  const choices = Array.from(document.querySelectorAll('[data-theme-choice]'));
  const background = Array.from(document.querySelectorAll('[data-menu-background]'));
  const directory = document.querySelector('.directory');
  const profiles = document.querySelector('.profiles');
  const cvNotes = document.querySelector('.cv-notes');
  const musicPlayer = document.querySelector('.music-player');
  const statusInfo = document.getElementById('status-info');
  let lastToggle = null;
  let activeView = 'home';
  const titleBar = home.querySelector('.title-bar');
  let windowOffset = { x: 0, y: 0 };
  let dragState = null;

  const desktopTheme = () => ['windows', 'mac', 'ubuntu'].includes(appearance.theme);
  function applyWindowOffset() {
    if (!desktopTheme() || home.classList.contains('maximized')) {
      home.style.transform = '';
      return;
    }
    home.style.transform = `translate3d(${windowOffset.x}px, ${windowOffset.y}px, 0)`;
  }
  function clampWindowOffset() {
    if (!desktopTheme() || home.classList.contains('maximized')) return;
    const previous = home.style.transform;
    home.style.transform = '';
    const base = home.getBoundingClientRect();
    home.style.transform = previous;
    const margin = 8;
    const minX = margin - base.left;
    const maxX = window.innerWidth - margin - base.right;
    const minY = margin - base.top;
    const bottomReserve = appearance.theme === 'ubuntu' ? 47 : 50;
    const maxY = window.innerHeight - bottomReserve - margin - base.bottom;
    windowOffset.x = Math.min(Math.max(windowOffset.x, Math.min(minX, maxX)), Math.max(minX, maxX));
    windowOffset.y = Math.min(Math.max(windowOffset.y, Math.min(minY, maxY)), Math.max(minY, maxY));
    applyWindowOffset();
  }
  function seedWindowOffset() {
    if (window.innerWidth >= 700 && window.innerHeight >= 560 && windowOffset.x === 0 && windowOffset.y === 0) {
      windowOffset = { x: 24, y: -18 };
    }
    clampWindowOffset();
  }

  // App content has one owner: move the existing nodes, without cloning the playlist,
  // between independent desktop windows and the mobile full-screen container.
  const apps = {};
  let frontWindow = home;
  function focusWindow(shell) {
    frontWindow = shell;
    const windows = [home, ...Object.values(apps).map(app => app.shell)];
    windows.filter(item => item !== shell).forEach((item, index) => {
      item.style.zIndex = String(index + 1);
      item.classList.remove('active-window');
    });
    shell.style.zIndex = String(windows.length + 1);
    shell.classList.add('active-window');
  }
  home.addEventListener('pointerdown', () => focusWindow(home));
  home.addEventListener('focusin', () => focusWindow(home));
  for (const [view, article] of Object.entries({ cv: cvNotes, music: musicPlayer })) {
    const shell = document.createElement('section');
    shell.id = view + '-window';
    shell.className = 'window app-window ' + view + '-window';
    shell.dataset.app = view;
    shell.hidden = true;
    shell.tabIndex = -1;
    shell.setAttribute('aria-labelledby', view + '-window-title');
    shell.setAttribute('data-menu-background', '');
    const bar = titleBar.cloneNode(true);
    bar.querySelectorAll('[id]').forEach(element => {
      if (['minimize', 'maximize', 'close'].includes(element.id)) element.dataset.windowAction = element.id;
      element.removeAttribute('id');
    });
    bar.querySelector('.window-title-text').id = view + '-window-title';
    const pathBar = home.querySelector('.path-bar').cloneNode(true);
    const content = document.createElement('div');
    content.className = 'window-content';
    shell.append(bar, pathBar, content);
    home.after(shell);
    background.push(shell);
    const task = document.createElement('button');
    task.className = 'bevel-button task-button app-task';
    task.type = 'button';
    task.dataset.restoreApp = view;
    task.textContent = view === 'cv' ? 'CV Notes' : 'Music';
    task.setAttribute('aria-controls', shell.id);
    task.hidden = true;
    restore.after(task);
    const app = apps[view] = { shell, article, content, task, opened: false, x: 0, y: 0, placed: false };
    task.addEventListener('click', () => launchApp(view));
    shell.addEventListener('pointerdown', () => focusWindow(shell));
    shell.addEventListener('focusin', () => focusWindow(shell));
    bar.querySelector('[data-window-action="minimize"]').addEventListener('click', () => {
      shell.hidden = true;
      task.setAttribute('aria-expanded', 'false');
      openWindow();
    });
    bar.querySelector('[data-window-action="close"]').addEventListener('click', () => closeApp(view));
    const zoom = bar.querySelector('[data-window-action="maximize"]');
    zoom.addEventListener('click', () => {
      const expanded = shell.classList.toggle('maximized');
      zoom.setAttribute('aria-pressed', String(expanded));
      zoom.setAttribute('aria-label', expanded ? 'Restore window size' : 'Maximize window');
      zoom.title = expanded ? 'Restore size' : 'Maximize';
      placeApp(app);
    });
    let drag;
    bar.addEventListener('pointerdown', event => {
      if (!desktopTheme() || shell.classList.contains('maximized') || event.button !== 0 || event.target.closest('button')) return;
      event.preventDefault();
      focusWindow(shell);
      drag = { id: event.pointerId, x: event.clientX, y: event.clientY, originX: app.x, originY: app.y };
      bar.setPointerCapture(event.pointerId);
      shell.classList.add('dragging');
    });
    bar.addEventListener('pointermove', event => {
      if (!drag || event.pointerId !== drag.id) return;
      app.x = drag.originX + event.clientX - drag.x;
      app.y = drag.originY + event.clientY - drag.y;
      placeApp(app);
    });
    function finishDrag(event) {
      if (!drag || event.pointerId !== drag.id) return;
      drag = null;
      shell.classList.remove('dragging');
      if (bar.hasPointerCapture(event.pointerId)) bar.releasePointerCapture(event.pointerId);
    }
    bar.addEventListener('pointerup', finishDrag);
    bar.addEventListener('pointercancel', finishDrag);
  }
  function placeApp(app) {
    if (!desktopTheme() || app.shell.hidden) return;
    if (app.shell.classList.contains('maximized')) {
      // Desktop insets own the maximized position; retain x/y for restore.
      app.shell.style.removeProperty('left');
      app.shell.style.removeProperty('top');
      return;
    }
    const top = appearance.theme === 'windows' ? 8 : 43;
    const bottom = appearance.theme === 'mac' ? 8 : 50;
    const bounds = app.shell.getBoundingClientRect();
    if (!app.placed) {
      app.x = (window.innerWidth - bounds.width) / 2 + (app === apps.music ? 110 : -100);
      app.y = top + (app === apps.music ? 34 : 70);
      app.placed = true;
    }
    app.x = Math.max(8, Math.min(app.x, window.innerWidth - bounds.width - 8));
    app.y = Math.max(top, Math.min(app.y, window.innerHeight - bottom - bounds.height));
    app.shell.style.left = app.x + 'px';
    app.shell.style.top = app.y + 'px';
  }
  function launchApp(view) {
    if (!desktopTheme()) { openWindow(); showView(view); return; }
    const app = apps[view];
    app.opened = true;
    app.article.hidden = false;
    app.shell.hidden = false;
    app.task.hidden = false;
    app.task.setAttribute('aria-expanded', 'true');
    placeApp(app);
    focusWindow(app.shell);
    if (view === 'music') document.dispatchEvent(new CustomEvent('nathan:musicopen'));
    app.shell.focus({ preventScroll: true });
  }
  function closeApp(view) {
    const app = apps[view];
    app.opened = false;
    app.shell.hidden = true;
    app.task.hidden = true;
    app.task.setAttribute('aria-expanded', 'false');
    if (view === 'music') document.dispatchEvent(new CustomEvent('nathan:musicclose'));
    openWindow();
    profiles.querySelector('[data-open-' + view + ']').focus({ preventScroll: true });
  }
  function arrangeApps() {
    for (const [view, app] of Object.entries(apps)) {
      app.shell.querySelector('.window-title-text').textContent = themeTitle(view);
      app.shell.querySelector('.path').textContent = themePath(view);
      app.shell.querySelector('.path-label').textContent = appearance.theme === 'windows' ? 'Address' : 'Location';
      if (desktopTheme()) {
        if (app.article.parentElement !== app.content) app.content.appendChild(app.article);
        app.article.hidden = !app.opened;
        app.shell.hidden = !app.opened;
        app.task.hidden = !app.opened;
        app.task.setAttribute('aria-expanded', String(app.opened));
        placeApp(app);
      } else {
        if (app.article.parentElement !== directory) directory.appendChild(app.article);
        app.shell.hidden = true;
        app.task.hidden = true;
      }
    }
  }

  const mobileTheme = () => ['android', 'ios'].includes(appearance.theme);
  function launchControl() {
    if (mobileTheme()) return document.getElementById('mobile-settings');
    if (appearance.theme === 'mac') return document.getElementById('mac-appearance');
    if (appearance.theme === 'ubuntu') return document.getElementById('ubuntu-system');
    return document.getElementById('start');
  }
  function openWindow() {
    home.hidden = false;
    restore.setAttribute('aria-expanded', 'true');
    document.dispatchEvent(new CustomEvent('nathan:windowopen'));
    focusWindow(home);
    if (!desktopTheme() && activeView === 'music') document.dispatchEvent(new CustomEvent('nathan:musicopen'));
    home.focus({ preventScroll: true });
  }
  function hideWindow() {
    closeMenu(false);
    home.hidden = true;
    restore.setAttribute('aria-expanded', 'false');
    const target = appearance.theme === 'mac' ? document.getElementById('mac-home') : restore;
    target.focus({ preventScroll: true });
  }
  function resetWindowSize() {
    home.classList.remove('maximized');
    maximize.setAttribute('aria-pressed', 'false');
    maximize.setAttribute('aria-label', 'Maximize window');
    maximize.title = 'Maximize';
    applyWindowOffset();
  }
  function themePath(view = activeView) {
    const paths = {
      home: { windows: 'C:\\Users\\Nathan\\Home', mac: 'Macintosh HD › Nathan › Home', ubuntu: '/home/nathan' },
      cv: { windows: 'C:\\Users\\Nathan\\Documents\\CV Notes.txt', mac: 'Macintosh HD › Nathan › Documents › CV Notes', ubuntu: '/home/nathan/Documents/cv-notes.txt' },
      music: { windows: 'C:\\Program Files\\Winamp\\nathan.m3u', mac: 'Macintosh HD › Nathan › Music', ubuntu: '/home/nathan/Music' }
    };
    return (paths[view] || paths.home)[appearance.theme] || ({ cv: 'CV Notes', music: 'Music' }[view] || 'Nathan');
  }
  function themeTitle(view = activeView) {
    if (view === 'cv') return appearance.theme === 'ubuntu' ? 'cv-notes.txt — Text Editor' : 'CV Notes';
    if (view === 'music') return { windows: "Winamp — Nathan's Playlist", mac: "QuickTime Player — Nathan's Playlist", ubuntu: "Rhythmbox — Nathan's Playlist", android: 'Music', ios: 'Music' }[appearance.theme];
    return appearance.theme === 'ubuntu' ? 'nathan — File Browser' : "Nathan's home page";
  }
  function showView(view, focusTarget = true) {
    const previousView = activeView;
    activeView = ['cv', 'music'].includes(view) ? view : 'home';
    document.body.dataset.view = activeView;
    directory.dataset.view = activeView;
    profiles.hidden = activeView !== 'home';
    if (!desktopTheme()) {
      cvNotes.hidden = activeView !== 'cv';
      musicPlayer.hidden = activeView !== 'music';
    }
    document.querySelector('.path').textContent = themePath();
    document.querySelector('.window-title-text').textContent = themeTitle();
    restore.textContent = { cv: 'CV Notes', music: 'Music' }[activeView] || "Nathan's home page";
    restore.title = 'Open ' + ({ cv: 'CV notes', music: 'music player' }[activeView] || 'home page');
    statusInfo.textContent = { cv: 'CV summary · last updated Oct 2026', music: 'Music · Spotify playlist' }[activeView] || (mobileTheme() ? '5 shortcuts' : '4 shortcuts');
    if (!desktopTheme()) document.dispatchEvent(new CustomEvent('nathan:viewchange', { detail: { view: activeView } }));
    window.requestAnimationFrame(clampWindowOffset);
    if (!focusTarget) return;
    const target = activeView === 'cv' ? cvNotes.querySelector('.cv-back') : activeView === 'music' ? musicPlayer.querySelector('.music-back') : directory.querySelector(previousView === 'music' ? '[data-open-music]' : '[data-open-cv]');
    target?.focus({ preventScroll: true });
  }
  function positionMenu() {
    if (!lastToggle || mobileTheme()) return;
    const left = lastToggle.getBoundingClientRect().left;
    const width = Math.min(326, window.innerWidth - 12);
    menu.style.setProperty('--menu-left', Math.max(6, Math.min(left, window.innerWidth - width - 6)) + 'px');
  }
  function closeMenu(returnFocus = true) {
    if (menu.hidden) return;
    menu.hidden = true;
    toggles.forEach(toggle => toggle.setAttribute('aria-expanded', 'false'));
    background.forEach(element => { element.inert = false; });
    document.body.classList.remove('menu-open');
    if (returnFocus && lastToggle?.isConnected && lastToggle.getClientRects().length) {
      lastToggle.focus({ preventScroll: true });
    }
  }
  function focusableChoices() {
    return Array.from(menu.querySelectorAll('button:not(:disabled), a[href]'))
      .filter(element => element.getClientRects().length > 0);
  }
  function openMenu(toggle) {
    lastToggle = toggle;
    menu.hidden = false;
    toggles.forEach(element => element.setAttribute('aria-expanded', String(element === toggle)));
    menu.setAttribute('role', mobileTheme() ? 'dialog' : 'region');
    if (mobileTheme()) {
      menu.setAttribute('aria-modal', 'true');
      background.forEach(element => { element.inert = true; });
      document.body.classList.add('menu-open');
    } else {
      menu.removeAttribute('aria-modal');
    }
    positionMenu();
    const selected = choices.find(button => button.getAttribute('aria-pressed') === 'true');
    (selected || focusableChoices()[0] || menu).focus({ preventScroll: true });
  }
  function applyAppearance(choice, announce = true) {
    const mode = appearance.choices.includes(choice) ? choice : 'auto';
    closeMenu(false);
    if (desktopTheme()) activeView = Object.entries(apps).find(([, app]) => app.shell === frontWindow && app.opened)?.[0] || 'home';
    else if (activeView in apps) apps[activeView].opened = true;
    const nextTheme = mode === 'auto' ? appearance.detected : mode;
    if (desktopTheme() !== ['windows', 'mac', 'ubuntu'].includes(nextTheme)) {
      // Moving an iframe to another parent reloads its browsing context.
      document.dispatchEvent(new CustomEvent('nathan:musicclose'));
    }
    appearance.mode = mode;
    appearance.theme = mode === 'auto' ? appearance.detected : mode;
    document.documentElement.dataset.theme = appearance.theme;
    document.documentElement.dataset.themeMode = mode;
    choices.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.themeChoice === mode)));
    document.getElementById('auto-theme-name').textContent = labels[appearance.detected];
    document.querySelector('.menu-brand-name').textContent = labels[appearance.theme];
    document.querySelector('.start-text').textContent = appearance.theme === 'ubuntu' ? 'System' : 'Start';
    const mobileView = activeView;
    if (desktopTheme()) activeView = 'home';
    arrangeApps();
    showView(desktopTheme() ? 'home' : mobileView, false);
    document.querySelector('.path').textContent = themePath();
    document.querySelector('.path-label').textContent = appearance.theme === 'windows' ? 'Address' : 'Location';
    document.querySelector('.window-title-text').textContent = themeTitle();
    statusInfo.textContent = { cv: 'CV summary · last updated Oct 2026', music: 'Music · Spotify playlist' }[activeView] || (mobileTheme() ? '5 shortcuts' : '4 shortcuts');
    document.dispatchEvent(new CustomEvent('nathan:themechange', { detail: { theme: appearance.theme } }));
    document.querySelector('meta[name="theme-color"]').content = { windows: '#008080', mac: '#959595', ubuntu: '#75482e', android: '#111111', ios: '#364451' }[appearance.theme];
    resetWindowSize();
    home.hidden = false;
    restore.setAttribute('aria-expanded', 'true');
    syncPreferences();
    if (desktopTheme() && apps.music.opened) document.dispatchEvent(new CustomEvent('nathan:musicopen'));
    window.requestAnimationFrame(() => {
      if (desktopTheme()) seedWindowOffset();
      else home.style.transform = '';
    });
    if (announce) {
      document.getElementById('theme-announcement').textContent = 'Appearance: ' + labels[appearance.theme];
      const launcher = launchControl();
      const focusTarget = launcher.getClientRects().length ? launcher : (activeView === 'music' ? musicPlayer.querySelector('.music-back') : cvNotes.querySelector('.cv-back'));
      focusTarget?.focus({ preventScroll: true });
    }
  }
  toggles.forEach(toggle => toggle.addEventListener('click', () => {
    if (!menu.hidden && lastToggle === toggle) closeMenu();
    else { closeMenu(false); openMenu(toggle); }
  }));
  choices.forEach(button => button.addEventListener('click', () => {
    const choice = button.dataset.themeChoice;
    try {
      if (choice === 'auto') window.localStorage.removeItem(appearance.storageKey);
      else window.localStorage.setItem(appearance.storageKey, choice);
    } catch (_) { /* The choice still works for this visit with storage blocked. */ }
    applyAppearance(choice);
  }));
  document.getElementById('menu-done').addEventListener('click', () => closeMenu());
  document.querySelectorAll('[data-open-home]').forEach(button => button.addEventListener('click', () => {
    closeMenu(false);
    openWindow();
    showView('home', false);
  }));
  document.querySelectorAll('[data-open-cv]').forEach(button => button.addEventListener('click', () => {
    closeMenu(false);
    launchApp('cv');
  }));
  document.querySelectorAll('[data-open-music]').forEach(button => button.addEventListener('click', () => {
    closeMenu(false);
    launchApp('music');
  }));
  document.querySelectorAll('[data-open-home-view]').forEach(button => button.addEventListener('click', () => {
    if (desktopTheme()) closeApp(button.closest('[data-view]').dataset.view);
    else showView('home');
  }));
  restore.addEventListener('click', openWindow);
  document.getElementById('minimize').addEventListener('click', hideWindow);
  document.getElementById('close').addEventListener('click', () => {
    if (!desktopTheme()) document.dispatchEvent(new CustomEvent('nathan:musicclose'));
    hideWindow();
  });
  maximize.addEventListener('click', () => {
    const expanded = home.classList.toggle('maximized');
    maximize.setAttribute('aria-pressed', String(expanded));
    maximize.setAttribute('aria-label', expanded ? 'Restore window size' : 'Maximize window');
    maximize.title = expanded ? 'Restore size' : 'Maximize';
    applyWindowOffset();
    if (!expanded) window.requestAnimationFrame(clampWindowOffset);
  });

  titleBar.addEventListener('pointerdown', event => {
    if (!desktopTheme() || home.classList.contains('maximized') || event.button !== 0 || event.target.closest('.window-actions')) return;
    event.preventDefault();
    dragState = { pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, originX: windowOffset.x, originY: windowOffset.y };
    titleBar.setPointerCapture(event.pointerId);
    home.classList.add('dragging');
  });
  titleBar.addEventListener('pointermove', event => {
    if (!dragState || event.pointerId !== dragState.pointerId) return;
    windowOffset.x = dragState.originX + event.clientX - dragState.startX;
    windowOffset.y = dragState.originY + event.clientY - dragState.startY;
    clampWindowOffset();
  });
  function endDrag(event) {
    if (!dragState || event.pointerId !== dragState.pointerId) return;
    dragState = null;
    home.classList.remove('dragging');
    if (titleBar.hasPointerCapture(event.pointerId)) titleBar.releasePointerCapture(event.pointerId);
  }
  titleBar.addEventListener('pointerup', endDrag);
  titleBar.addEventListener('pointercancel', endDrag);
  document.addEventListener('pointerdown', event => {
    if (!menu.hidden && !menu.contains(event.target) && !toggles.some(toggle => toggle.contains(event.target))) closeMenu(false);
  });
  document.addEventListener('focusin', event => {
    if (!menu.hidden && !mobileTheme() && !menu.contains(event.target) && !toggles.includes(event.target)) closeMenu(false);
  });
  document.addEventListener('keydown', event => {
    if (menu.hidden) return;
    if (event.key === 'Escape') { event.preventDefault(); closeMenu(); return; }
    if (!menu.contains(document.activeElement)) return;
    const targets = focusableChoices();
    const index = targets.indexOf(document.activeElement);
    if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
      event.preventDefault();
      const next = event.key === 'Home' ? 0 : event.key === 'End' ? targets.length - 1 :
        (index + (event.key === 'ArrowDown' ? 1 : -1) + targets.length) % targets.length;
      targets[next]?.focus();
    } else if (event.key === 'Tab' && mobileTheme()) {
      if ((event.shiftKey && index <= 0) || (!event.shiftKey && index === targets.length - 1)) {
        event.preventDefault();
        targets[event.shiftKey ? targets.length - 1 : 0]?.focus();
      }
    }
  });
  window.addEventListener('resize', () => {
    positionMenu();
    window.requestAnimationFrame(() => { clampWindowOffset(); Object.values(apps).forEach(placeApp); });
  }, { passive: true });

  const clocks = Array.from(document.querySelectorAll('[data-clock]'));
  const timeFormat = new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' });
  function updateClock() {
    const now = new Date();
    clocks.forEach(clock => {
      clock.textContent = timeFormat.format(now);
      clock.dateTime = now.toISOString();
      clock.title = now.toLocaleDateString();
    });
  }
  updateClock();
  window.setInterval(updateClock, 60000);

  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const checkbox = document.getElementById('trails-enabled');
  const layer = document.getElementById('cursor-trails');
  const cursorUrl = new URL('../artwork/cursor.svg', document.currentScript.src).href;
  const ghosts = Array.from({ length: 8 }, () => {
    const ghost = document.createElement('img');
    ghost.className = 'cursor-trail';
    ghost.src = cursorUrl;
    ghost.alt = '';
    ghost.draggable = false;
    layer.appendChild(ghost);
    return ghost;
  });
  const lifetime = 240;
  let points = [];
  let animation = 0;
  let userWantsTrails = true;
  let enabled = false;

  function clearTrails() {
    if (animation) window.cancelAnimationFrame(animation);
    animation = 0;
    points.length = 0;
    ghosts.forEach(ghost => { ghost.style.opacity = '0'; });
  }
  function syncPreferences() {
    const available = finePointer.matches && !reducedMotion.matches && appearance.theme === 'windows';
    enabled = available && userWantsTrails;
    checkbox.disabled = !available;
    checkbox.checked = enabled;
    checkbox.title = reducedMotion.matches ? 'Disabled by your reduced-motion setting' : 'Show mouse pointer trails';
    if (!enabled) clearTrails();
  }
  function drawTrails(now) {
    animation = 0;
    points = points.filter(point => now - point.time < lifetime);
    ghosts.forEach((ghost, index) => {
      const targetTime = now - (index + 1) * 24;
      let point;
      for (let cursor = points.length - 1; cursor >= 0; cursor--) {
        if (points[cursor].time <= targetTime) { point = points[cursor]; break; }
      }
      if (!point) { ghost.style.opacity = '0'; return; }
      ghost.style.transform = `translate3d(${point.x - 1}px, ${point.y - 1}px, 0)`;
      ghost.style.opacity = String((1 - (now - point.time) / lifetime) * .65);
    });
    if (points.length) animation = window.requestAnimationFrame(drawTrails);
  }
  window.addEventListener('pointermove', event => {
    if (!enabled || event.pointerType !== 'mouse') return;
    points.push({ x: event.clientX, y: event.clientY, time: performance.now() });
    if (points.length > 64) points.shift();
    if (!animation) animation = window.requestAnimationFrame(drawTrails);
  }, { passive: true });
  checkbox.addEventListener('change', () => { userWantsTrails = checkbox.checked; syncPreferences(); });
  finePointer.addEventListener('change', syncPreferences);
  reducedMotion.addEventListener('change', syncPreferences);
  document.documentElement.addEventListener('pointerleave', clearTrails);
  window.addEventListener('blur', clearTrails);
  document.addEventListener('visibilitychange', () => { if (document.hidden) clearTrails(); });
  applyAppearance(appearance.mode, false);
})();
