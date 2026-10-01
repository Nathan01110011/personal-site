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
  let lastToggle = null;

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
    appearance.mode = mode;
    appearance.theme = mode === 'auto' ? appearance.detected : mode;
    document.documentElement.dataset.theme = appearance.theme;
    document.documentElement.dataset.themeMode = mode;
    choices.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.themeChoice === mode)));
    document.getElementById('auto-theme-name').textContent = labels[appearance.detected];
    document.querySelector('.menu-brand-name').textContent = labels[appearance.theme];
    document.querySelector('.start-text').textContent = appearance.theme === 'ubuntu' ? 'System' : 'Start';
    const paths = { windows: 'C:\\Users\\Nathan\\Home', mac: 'Macintosh HD › Nathan › Home', ubuntu: '/home/nathan' };
    document.querySelector('.path').textContent = paths[appearance.theme] || 'Nathan';
    document.querySelector('.path-label').textContent = appearance.theme === 'windows' ? 'Address' : 'Location';
    document.querySelector('.window-title-text').textContent = appearance.theme === 'ubuntu' ? 'nathan — File Browser' : "Nathan's home page";
    document.querySelector('meta[name="theme-color"]').content = { windows: '#008080', mac: '#959595', ubuntu: '#75482e', android: '#111111', ios: '#364451' }[appearance.theme];
    resetWindowSize();
    home.hidden = false;
    restore.setAttribute('aria-expanded', 'true');
    syncPreferences();
    if (announce) {
      document.getElementById('theme-announcement').textContent = 'Appearance: ' + labels[appearance.theme];
      launchControl().focus({ preventScroll: true });
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
  }));
  restore.addEventListener('click', openWindow);
  document.getElementById('minimize').addEventListener('click', hideWindow);
  document.getElementById('close').addEventListener('click', hideWindow);
  maximize.addEventListener('click', () => {
    const expanded = home.classList.toggle('maximized');
    maximize.setAttribute('aria-pressed', String(expanded));
    maximize.setAttribute('aria-label', expanded ? 'Restore window size' : 'Maximize window');
    maximize.title = expanded ? 'Restore size' : 'Maximize';
  });
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
  window.addEventListener('resize', positionMenu, { passive: true });

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
  const cursorUrl = '@@CURSOR_URL@@';
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
    const available = finePointer.matches && !reducedMotion.matches && !mobileTheme();
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
