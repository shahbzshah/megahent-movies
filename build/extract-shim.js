// Extracts the RUNTIME_AD_SHIM Java string-constant value and verifies the
// emitted JavaScript exactly as the WebView would receive it: syntax check +
// functional mini-DOM test with the ad elements captured in the shell logs.
const fs = require('fs');
const path = require('path');
const src = fs.readFileSync(path.join(__dirname, '..', 'cineglass-android', 'app', 'src', 'main', 'java', 'app', 'cineglass', 'android', 'MainActivity.java'), 'utf8');
const start = src.indexOf('RUNTIME_AD_SHIM =');
const end = src.indexOf('private String injectShims');
if (start < 0 || end < 0) { console.error('markers not found'); process.exit(1); }
const block = src.slice(start, end);
const lits = [];
const re = /"((?:[^"\\]|\\.)*)"/g;
let m;
while ((m = re.exec(block)) !== null) lits.push(m[1]);
if (!lits.length) { console.error('no literals'); process.exit(1); }
const unescapeJava = s => s
  .replace(/\\n/g, '\n').replace(/\\t/g, '\t').replace(/\\r/g, '\r')
  .replace(/\\"/g, '"').replace(/\\\\/g, '\\');
const js = lits.map(unescapeJava).join('');
const inner = js.replace(/^<script>/, '').replace(/<\/script>$/, '');
fs.writeFileSync(path.join(__dirname, 'shim-extracted.js'), inner, 'utf8');
new Function(inner); // throws on syntax error
console.log('JS SYNTAX OK (' + inner.length + ' chars)');

// ---- functional mini-DOM test ----
function makeEl(tag, attrs, id, cls) {
  const el = {
    tagName: tag, id: id || '', className: cls || '',
    attrs: attrs || {}, removed: false, contains: () => false, nodeType: 1,
  };
  el.getAttribute = n => (n in el.attrs ? el.attrs[n] : null);
  el.remove = () => { el.removed = true; };
  return el;
}
const cases = [
  ['iframe popunder direct-link (throwaway domain) REMOVED',
    makeEl('IFRAME', { src: 'https://qweasdzxc.example/rnsPTHp2LRz9/150052' }), true],
  ['iframe on player-chain host KEPT',
    makeEl('IFRAME', { src: 'https://hamis.romponalis.st/premiumtv/269' }), false],
  ['iframe ad script path REMOVED',
    makeEl('IFRAME', { src: 'https://cdn.example/ads/banner.js' }), true],
  ['anchor spendsdetachment REMOVED',
    makeEl('A', { href: 'https://spendsdetachment.com/qg4th4cnh?jca=44' }), true],
  ['anchor monetag luugy REMOVED',
    makeEl('A', { href: 'https://luugy.com/4/6758325?dovr=true' }), true],
  ['anchor aliexpress REMOVED',
    makeEl('A', { href: 'https://s.click.aliexpress.com/e/_oFZMHdS' }), true],
  ['anchor nontongo channel KEPT',
    makeEl('A', { href: 'https://www.nontongo.win/livetv/269' }), false],
  ['anchor relative KEPT',
    makeEl('A', { href: '/stream/stream-269.php' }), false],
  ['div id=ad-box REMOVED', makeEl('DIV', {}, 'ad-box', ''), true],
  ['div class=channel-banner REMOVED', makeEl('DIV', {}, '', 'channel-banner'), true],
  ['div class=player KEPT', makeEl('DIV', {}, '', 'player'), false],
  ['div class=adjust KEPT (not an ad word)', makeEl('DIV', {}, '', 'adjust'), false],
  ['ins.adsbygoogle REMOVED', makeEl('INS', {}, '', 'adsbygoogle'), true],
];
const sampleEls = cases.map(c => c[1]);
const documentStub = {
  getElementById: () => null,
  querySelectorAll: () => sampleEls,
  documentElement: {},
  head: { appendChild() {} },
  createElement: () => ({ style: {} }),
};
function MutationObserver(cb) { this.cb = cb; }
MutationObserver.prototype.observe = function () {};
new Function('document', 'window', 'MutationObserver', 'URL', inner)(documentStub, { open() {} }, MutationObserver, URL);

let fail = 0;
for (let i = 0; i < cases.length; i++) {
  const [name, el, wantRemoved] = cases[i];
  const got = el.removed;
  const ok = got === wantRemoved;
  if (!ok) fail++;
  console.log((ok ? 'PASS' : 'FAIL') + '  ' + name + (ok ? '' : ' (removed=' + got + ', expected=' + wantRemoved + ')'));
}
console.log(fail === 0 ? 'ALL FUNCTIONAL TESTS PASS' : fail + ' TEST(S) FAILED');
process.exit(fail === 0 ? 0 : 1);

