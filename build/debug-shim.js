// Debug: runs the extracted shim with a mini-DOM and surfaces any exception
// its outer try/catch would swallow.
const fs = require('fs');
const path = require('path');
const inner = fs.readFileSync(path.join(__dirname, 'shim-extracted.js'), 'utf8');
console.log('tail:', JSON.stringify(inner.slice(-30)));
function makeEl(tag, attrs, id, cls) {
  const el = { tagName: tag, id: id || '', className: cls || '', attrs: attrs || {}, removed: false, contains: () => false, nodeType: 1 };
  el.getAttribute = n => (n in el.attrs ? el.attrs[n] : null);
  el.remove = () => { el.removed = true; };
  return el;
}
const els = [
  makeEl('IFRAME', { src: 'https://qweasdzxc.example/rnsPTHp2LRz9/150052' }),
  makeEl('IFRAME', { src: 'https://hamis.romponalis.st/premiumtv/269' }),
  makeEl('A', { href: 'https://spendsdetachment.com/qg4th4cnh?jca=44' }),
  makeEl('DIV', {}, 'ad-box', ''),
];
const documentStub = {
  getElementById: () => null,
  querySelectorAll: () => els,
  documentElement: {},
  head: { appendChild() {} },
  createElement: () => ({ style: {} }),
};
function MutationObserver(cb) { this.cb = cb; }
MutationObserver.prototype.observe = function () {};
const debug = inner.replace('}catch(e){}})();', '}catch(e){console.log("SHIM EXCEPTION:", e && e.message)}console.log("SHIM DONE");})();');
if (debug === inner) console.log('WARN: catch-replacement did not apply');
new Function('document', 'MutationObserver', 'URL', debug)(documentStub, MutationObserver, URL);
console.log('removed flags:', els.map(e => e.removed));
