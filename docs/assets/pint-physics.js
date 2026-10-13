// Shared geometry for rendering and overflow. Coordinates: x right, y down.
((root, factory) => {
  const physics = factory();
  if (typeof module === 'object' && module.exports) module.exports = physics;
  else root.NathanPintPhysics = physics;
})(typeof window === 'object' ? window : null, () => {
  'use strict';
  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
  const radians = Math.PI / 180;
  const glass = [[0,0],[1,0],[.87,1],[.13,1]];
  const fullArea = .87 * .92;
  function areaBelow(level, slope) {
    const distance = ([x,y]) => y - level - (x - .5) * slope;
    const wet = [];
    for (let i = 0; i < glass.length; i++) {
      const a = glass[i], b = glass[(i + 1) % glass.length];
      const da = distance(a), db = distance(b);
      if (da >= 0) wet.push(a);
      if ((da >= 0) !== (db >= 0)) {
        const t = da / (da - db);
        wet.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]);
      }
    }
    let area = 0;
    for (let i = 0; i < wet.length; i++) {
      const a = wet[i], b = wet[(i + 1) % wet.length];
      area += a[0] * b[1] - b[0] * a[1];
    }
    return Math.abs(area) / 2;
  }
  function geometry(tilt, aspect, fill) {
    // Positive tilt means gravity pulls to the right: the surface rises there.
    const slope = -Math.tan(clamp(tilt, -89.5, 89.5) * radians);
    const normalizedSlope = slope * aspect;
    const rimLevel = Math.abs(normalizedSlope) / 2;
    const capacity = Math.abs(tilt) >= 90 ? 0 : clamp(areaBelow(rimLevel, normalizedSlope) / fullArea, 0, 1);
    let lo = -Math.abs(normalizedSlope), hi = 1 + Math.abs(normalizedSlope);
    for (let i = 0; i < 28; i++) {
      const mid = (lo + hi) / 2;
      if (areaBelow(mid, normalizedSlope) > clamp(fill,0,1) * fullArea) lo = mid; else hi = mid;
    }
    const level = (lo + hi) / 2;
    return { slope, level, capacity, rim: level - rimLevel };
  }
  function retained(fill, capacity, dt) {
    // Only excess above the rim flows out; a stationary tilt retains the rest.
    const excess = Math.max(0, fill - capacity);
    return fill - excess * (1 - Math.exp(-dt * 7));
  }
  function orientationTilt(beta, gamma, screenAngle = 0) {
    if (beta === null || gamma === null || !Number.isFinite(beta) || !Number.isFinite(gamma)) return null;
    // W3C Z-X-Y matrix projected gravity, with device y-up converted to canvas y-down.
    // https://www.w3.org/TR/orientation-event/#worked-example-2
    const x = Math.cos(beta * radians) * Math.sin(gamma * radians);
    const y = Math.sin(beta * radians);
    const angle = screenAngle * radians;
    const gx = x * Math.cos(angle) - y * Math.sin(angle);
    const gy = x * Math.sin(angle) + y * Math.cos(angle);
    // A nearly flat phone has no reliable down direction within the screen.
    if (Math.hypot(gx,gy) < .2) return null;
    return clamp(Math.atan2(gx,gy) / radians, -95, 95);
  }
  return { geometry, retained, orientationTilt, areaBelow, fullArea };
});
