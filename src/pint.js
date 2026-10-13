(() => {
  'use strict';
  const app = document.querySelector('.pint-app');
  const canvas = app.querySelector('canvas');
  const ctx = canvas.getContext('2d');
  const slider = document.getElementById('pint-tilt');
  const motionButton = app.querySelector('.pint-motion');
  const status = app.querySelector('.pint-status');
  const physics = window.NathanPintPhysics;
  const refillButton = app.querySelector('.pint-refill');
  const motionAvailable = window.isSecureContext && typeof window.DeviceOrientationEvent === 'function';
  const permissionRequired = motionAvailable && typeof DeviceOrientationEvent.requestPermission === 'function';
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const mobileLayout = window.matchMedia('(max-width: 767px), (max-height: 500px)');
  let active = false, frame = 0, lastTime = 0, fill = 1, tilt = 0, targetTilt = 0;
  let motionEnabled = false, motionListening = false, motionTimer = 0, permissionAttempt = 0;
  let width = 0, height = 0, pointer = null, foam = 0, slosh = 0, filling = false, fillPulse = 0, manualTilt = false;
  const bubbles = Array.from({ length: 65 }, (_, i) => ({ x: (i * .6180339) % 1, y: (i * .381966) % 1, r: 1 + i % 3 * .6, speed: .07 + i % 7 * .017 }));
  const clamp = (n, min, max) => Math.max(min, Math.min(max, n));

  function glassPath(x, y, w, h) {
    ctx.beginPath();
    ctx.moveTo(x, y); ctx.lineTo(x + w, y);
    ctx.lineTo(x + w * .87, y + h - 12);
    ctx.quadraticCurveTo(x + w * .86, y + h, x + w * .78, y + h);
    ctx.lineTo(x + w * .22, y + h);
    ctx.quadraticCurveTo(x + w * .14, y + h, x + w * .13, y + h - 12);
    ctx.closePath();
  }
  function glassSize() {
    const mobile = mobileLayout.matches;
    const h = mobile ? Math.max(0, height - 28) : Math.min(height * .78, 540);
    const w = mobile ? Math.min(width * .90, h * .82) : Math.min(width * .69, h * .60, 320);
    return { h, w, x: (width - w) / 2, y: mobile ? 12 : height - h - Math.max(16, height * .045) };
  }
  function draw(now, dt) {
    ctx.clearRect(0, 0, width, height);
    const { h, w, x, y } = glassSize();
    // Table and the soft shadow beneath the glass.
    const table = ctx.createLinearGradient(0, height - 22, 0, height);
    table.addColorStop(0, '#79502c'); table.addColorStop(1, '#301c10');
    ctx.fillStyle = table; ctx.fillRect(0, height - 20, width, 20);
    ctx.fillStyle = '#0005'; ctx.beginPath(); ctx.ellipse(width / 2, y + h + 5, w * .66, 12, 0, 0, Math.PI * 2); ctx.fill();
    const rotation = manualTilt ? tilt * Math.PI / 180 : 0;
    const rotatedWidth = w * Math.abs(Math.cos(rotation)) + h * Math.abs(Math.sin(rotation));
    const rotatedHeight = h * Math.abs(Math.cos(rotation)) + w * Math.abs(Math.sin(rotation));
    const scale = manualTilt ? Math.min(1, (width - 16) / rotatedWidth, (height - 24) / rotatedHeight) : 1;
    const cx = x + w / 2, cy = y + h / 2;
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(rotation); ctx.scale(scale, scale); ctx.translate(-cx, -cy);
    glassPath(x, y, w, h);
    ctx.fillStyle = '#ecf6f51a'; ctx.fill();
    ctx.save(); ctx.clip();
    const liquid = physics.geometry(tilt, w / h, fill);
    const slope = liquid.slope, level = liquid.level * h;
    const wave = reduced.matches ? 0 : Math.sin(now / 260) * slosh;
    // Decorative waves vanish at the rim so they cannot imply unmodelled spills.
    const surface = xx => y + level + (xx - width / 2) * slope + wave * Math.sin(clamp((xx - x) / w,0,1) * Math.PI) * Math.sin(now / 300);
    const beer = ctx.createLinearGradient(x, y, x + w, y + h);
    beer.addColorStop(0, '#ffe47b'); beer.addColorStop(.24, '#fbbb29'); beer.addColorStop(.7, '#d88506'); beer.addColorStop(1, '#8c4605');
    ctx.beginPath(); ctx.moveTo(x - 2, y + h + 3);
    for (let i = 0; i <= 40; i++) { const xx = x - 2 + (w + 4) * i / 40; ctx.lineTo(xx, surface(xx)); }
    ctx.lineTo(x + w + 2, y + h + 3); ctx.closePath(); ctx.fillStyle = beer; ctx.fill();
    if (fill > .01) {
      ctx.save(); ctx.clip();
      for (const b of bubbles) {
        if (!reduced.matches) b.y = (b.y + dt * b.speed) % 1;
        const bx = x + w * (.08 + b.x * .84), by = y + h * (1 - b.y);
        ctx.strokeStyle = '#fff1b77a'; ctx.lineWidth = .7;
        ctx.beginPath(); ctx.arc(bx, by, b.r, 0, Math.PI * 2); ctx.stroke();
      }
      ctx.restore();
      // Creamy foam follows the liquid plane and is clipped by the rim.
      const head = Math.min(h * .07 + foam, h * .16);
      ctx.beginPath(); ctx.moveTo(x - 2, surface(x - 2));
      for (let i = 0; i <= 40; i++) { const xx = x - 2 + (w + 4) * i / 40; ctx.lineTo(xx, surface(xx) - head + Math.sin(i * 1.9) * 2); }
      for (let i = 40; i >= 0; i--) { const xx = x - 2 + (w + 4) * i / 40; ctx.lineTo(xx, surface(xx) + 2); }
      ctx.closePath(); const cream = ctx.createLinearGradient(0, y + level - head, 0, y + level + 2);
      cream.addColorStop(0, '#fffef0'); cream.addColorStop(1, '#e6c987'); ctx.fillStyle = cream; ctx.fill();
      ctx.fillStyle = '#fff8';
      for (let i = 0; i < 30; i++) { const xx = x + w * ((i * .618) % 1); ctx.beginPath(); ctx.arc(xx, surface(xx) - head * (.2 + ((i * .37) % .6)), 1.5 + i % 3, 0, Math.PI * 2); ctx.fill(); }
    }
    ctx.restore();
    // Reflections stay fixed on the glass while the contents respond to tilt.
    ctx.save(); glassPath(x, y, w, h); ctx.clip();
    const reflection = ctx.createLinearGradient(x, 0, x + w, 0);
    reflection.addColorStop(0, '#fff5'); reflection.addColorStop(.08, '#fff0'); reflection.addColorStop(.16, '#fff5'); reflection.addColorStop(.25, '#fff0'); reflection.addColorStop(.78, '#fff0'); reflection.addColorStop(.91, '#fff4'); reflection.addColorStop(1, '#fff1');
    ctx.fillStyle = reflection; ctx.fillRect(x, y, w, h);
    ctx.restore(); glassPath(x, y, w, h); ctx.strokeStyle = '#ecf6f5a6'; ctx.lineWidth = 2; ctx.stroke();
    ctx.beginPath(); ctx.ellipse(width / 2, y, w / 2, Math.max(3, w * .026), 0, 0, Math.PI * 2); ctx.strokeStyle = '#fff9'; ctx.stroke();
    ctx.beginPath(); ctx.ellipse(width / 2, y + h - 7, w * .32, 4, 0, 0, Math.PI * 2); ctx.strokeStyle = '#fff5'; ctx.lineWidth = 4; ctx.stroke();
    ctx.restore();
    canvas.dataset.glassRotation = (manualTilt ? tilt : 0).toFixed(1);
    canvas.dataset.fill = fill.toFixed(3);
    canvas.dataset.tilt = tilt.toFixed(1);
    canvas.dataset.rim = liquid.rim.toFixed(5);
    canvas.dataset.capacity = liquid.capacity.toFixed(5);
    canvas.dataset.filling = String(filling || fillPulse > 0);
  }
  function tick(now) {
    frame = 0;
    if (!active || document.hidden) return;
    const dt = lastTime ? Math.min((now - lastTime) / 1000, .05) : 0;
    lastTime = now;
    const difference = targetTilt - tilt;
    const step = difference * (1 - Math.exp(-dt / .28));
    tilt += clamp(step, -80 * dt, 80 * dt);
    const adding = filling || fillPulse > 0;
    fillPulse = Math.max(0, fillPulse - dt);
    if (adding) { fill = Math.min(1, fill + dt * .24); foam = Math.min(12, foam + dt * 5); }
    const { w, h } = glassSize();
    const liquid = physics.geometry(tilt, w / h, fill);
    const remaining = physics.retained(fill, liquid.capacity, dt);
    fill = remaining;
    if (fill < .0005 && liquid.capacity === 0) { fill = 0; status.textContent = 'Empty! Hold the glass to fill.'; }
    foam = Math.max(0, foam - dt * 2); slosh = Math.max(0, slosh - dt * 4);
    draw(now, dt);
    if (!reduced.matches || Math.abs(tilt - targetTilt) > .01 || adding || fill > liquid.capacity + .00001) frame = requestAnimationFrame(tick);
  }
  function animate() { if (active && !document.hidden && !frame) { lastTime = 0; frame = requestAnimationFrame(tick); } }
  function setTilt(value, manual = true) {
    if (!Number.isFinite(value)) return;
    manualTilt = manual;
    foam = clamp(foam + Math.abs(value - targetTilt) * .06, 0, 15);
    slosh = clamp(slosh + Math.abs(value - targetTilt) * .12, 0, 10);
    targetTilt = clamp(Math.abs(value) < .6 ? 0 : value, -95, 95);
    slider.value = String(Math.round(targetTilt));
    slider.style.setProperty('--tilt-progress', ((targetTilt + 95) / 190 * 100) + '%'); animate();
  }
  function startFill() {
    if (!active) return;
    filling = true; fillPulse = 0;
    status.textContent = 'Filling… release to stop.'; animate();
  }
  function stopFill() {
    filling = false; fillPulse = 0;
    status.textContent = motionEnabled ? 'Tilt your phone to pour. Hold to fill.' : 'Hold to fill. Drag to pour.';
  }
  function resize() {
    if (!active) return;
    const rect = canvas.getBoundingClientRect();
    width = rect.width; height = rect.height;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); animate();
  }
  function orientation(event) {
    if (!active || document.hidden) return;
    if (!Number.isFinite(event.beta) || !Number.isFinite(event.gamma)) return;
    // Existing permission can provide events without another request.
    motionEnabled = true; motionButton.hidden = true; clearTimeout(motionTimer);
    if (pointer?.moved || manualTilt && Math.abs(targetTilt) > .6) return;
    const angle = window.screen.orientation?.angle ?? window.orientation ?? 0;
    const value = physics.orientationTilt(event.beta, event.gamma, angle);
    if (value === null) return;
    clearTimeout(motionTimer); if (!filling) status.textContent = 'Tilt your phone to pour. Hold to fill.'; setTilt(value, false);
  }
  function listenMotion() {
    if (!motionAvailable || motionListening || !active || document.hidden) return;
    window.addEventListener('deviceorientation', orientation); motionListening = true;
    motionTimer = window.setTimeout(() => { if (active) status.textContent = 'No tilt data yet. Try dragging the glass.'; }, 2500);
  }
  function stopMotion() {
    window.removeEventListener('deviceorientation', orientation); motionListening = false; clearTimeout(motionTimer);
  }
  motionButton.addEventListener('click', async () => {
    if (!permissionRequired || motionEnabled) return;
    const attempt = ++permissionAttempt;
    motionButton.disabled = true;
    try {
      const result = typeof DeviceOrientationEvent.requestPermission === 'function' ? await DeviceOrientationEvent.requestPermission() : 'granted';
      if (attempt !== permissionAttempt || !active) return;
      if (result !== 'granted') { status.textContent = 'Tilt permission declined. Drag still works.'; return; }
      motionEnabled = true; motionButton.hidden = true;
      if (document.activeElement === motionButton) slider.focus({ preventScroll: true });
      status.textContent = 'Tilt your phone to pour. Hold to fill.'; listenMotion();
    } catch (_) { if (active) status.textContent = 'Tilt unavailable here. Drag the glass instead.'; }
    finally { motionButton.disabled = false; }
  });
  slider.addEventListener('input', () => setTilt(Number(slider.value)));
  refillButton.addEventListener('pointerdown', e => {
    if (e.button !== 0) return;
    refillButton.setPointerCapture(e.pointerId); startFill();
  });
  const releaseFill = () => stopFill();
  refillButton.addEventListener('pointerup', releaseFill);
  refillButton.addEventListener('pointercancel', releaseFill);
  refillButton.addEventListener('lostpointercapture', releaseFill);
  refillButton.addEventListener('keydown', e => {
    if ([' ', 'Enter'].includes(e.key)) { e.preventDefault(); if (!e.repeat) startFill(); }
  });
  refillButton.addEventListener('keyup', e => { if ([' ', 'Enter'].includes(e.key)) { e.preventDefault(); stopFill(); } });
  refillButton.addEventListener('blur', releaseFill);
  // Screen-reader activation adds a small animated dose rather than snapping full.
  refillButton.addEventListener('click', e => { if (e.detail === 0 && !filling) { fillPulse = .3; animate(); } });
  canvas.addEventListener('contextmenu', e => e.preventDefault());
  canvas.addEventListener('pointerdown', e => {
    if (e.button !== 0) return;
    pointer = { id: e.pointerId, x: e.clientX, y: e.clientY, tilt: targetTilt, moved: false };
    canvas.setPointerCapture(e.pointerId); startFill();
  });
  canvas.addEventListener('pointermove', e => {
    if (!pointer || e.pointerId !== pointer.id) return;
    const distance = e.clientX - pointer.x;
    if (Math.abs(distance) > 8 || Math.abs(e.clientY - pointer.y) > 8) pointer.moved = true;
    if (pointer.moved) { stopFill(); setTilt(pointer.tilt + distance / Math.max(width * .55, 140) * 85); }
  });
  function release(e) {
    if (!pointer || pointer.id !== e.pointerId) return;
    const dragged = pointer.moved; pointer = null; stopFill();
    if (canvas.hasPointerCapture(e.pointerId)) canvas.releasePointerCapture(e.pointerId);
    if (dragged) setTilt(0);
  }
  canvas.addEventListener('pointerup', release); canvas.addEventListener('pointercancel', release);
  canvas.addEventListener('lostpointercapture', () => { pointer = null; stopFill(); });
  function sync() {
    const next = document.documentElement.dataset.theme === 'ios' && document.body.dataset.view === 'pint' && !document.getElementById('home-window').hidden;
    if (!next) { active = false; filling = false; fillPulse = 0; permissionAttempt++; stopMotion(); if (frame) cancelAnimationFrame(frame); frame = 0; lastTime = 0; pointer = null; return; }
    active = true; resize(); listenMotion(); animate();
  }
  document.addEventListener('nathan:viewchange', sync); document.addEventListener('nathan:themechange', sync);
  document.addEventListener('nathan:windowopen', sync);
  document.addEventListener('visibilitychange', () => { if (document.hidden) { filling = false; fillPulse = 0; pointer = null; stopMotion(); if (frame) cancelAnimationFrame(frame); frame = 0; lastTime = 0; } else sync(); });
  window.addEventListener('blur', () => { filling = false; fillPulse = 0; pointer = null; });
  window.addEventListener('resize', resize, { passive: true }); reduced.addEventListener('change', animate);
  motionButton.hidden = !permissionRequired;
  sync();
})();
