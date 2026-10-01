/* Regression checks for real UA ambiguities and unavailable local storage. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../src/theme-bootstrap.js'), 'utf8');
function boot(navigator, saved, blocked = false) {
  const document = { documentElement: { dataset: {}, classList: { add() {} } } };
  const window = { navigator, localStorage: { getItem() { if (blocked) throw new Error('Blocked'); return saved; } } };
  vm.runInNewContext(source, { window, document });
  return { appearance: window.NathanAppearance, html: document.documentElement };
}
const cases = [
  ['Windows', { userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }, 'windows'],
  ['Mac', { userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)' }, 'mac'],
  ['Linux', { userAgent: 'Mozilla/5.0 (X11; Linux x86_64)' }, 'ubuntu'],
  ['Ubuntu-labelled UA', { userAgent: 'Mozilla/5.0 (X11; Ubuntu; Linux x86_64)' }, 'ubuntu'],
  ['Android before Linux', { userAgent: 'Mozilla/5.0 (Linux; Android 10; K)' }, 'android'],
  ['iPhone', { userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)' }, 'ios'],
  ['iPad desktop mode', { userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15)', platform: 'MacIntel', maxTouchPoints: 5 }, 'ios'],
  ['Mac without touch', { userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15)', platform: 'MacIntel', maxTouchPoints: 0 }, 'mac'],
  ['Linux client hint', { userAgent: '', userAgentData: { platform: 'Linux' } }, 'ubuntu'],
  ['Android client hint', { userAgent: 'Linux', userAgentData: { platform: 'Android' } }, 'android'],
  ['Chrome OS', { userAgent: 'Mozilla/5.0 (X11; CrOS x86_64)' }, 'ubuntu'],
  ['Unknown fallback', { userAgent: 'Privacy browser' }, 'windows'],
];
for (const [name, navigator, expected] of cases) {
  const result = boot(navigator);
  assert.equal(result.html.dataset.theme, expected, name);
  assert.equal(result.appearance.mode, 'auto', name + ': automatic');
}
assert.equal(boot({ userAgent: 'Linux' }, 'mac').html.dataset.theme, 'mac', 'A saved choice wins');
assert.equal(boot({ userAgent: 'Linux' }, 'invalid').html.dataset.theme, 'ubuntu', 'Ignore stale choices');
assert.equal(boot({ userAgent: 'Android' }, null, true).html.dataset.theme, 'android', 'Blocked storage');
assert.equal(boot({ userAgent: 'Linux' }, 'auto').html.dataset.theme, 'ubuntu', 'Automatic preference');
console.log('Passed ' + (cases.length + 4) + ' OS detection and preference checks.');
