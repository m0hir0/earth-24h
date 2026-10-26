// again.js の本物の関数をVM内で読む。製品にテスト用APIや乱数設定を追加しない。
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '../..');
function element() {
  return {
    children: [], events: {}, _html: '', _text: '',
    set innerHTML(v) { this._html = v; this.children = []; }, get innerHTML() { return this._html; },
    set textContent(v) { this._text = v; this.children = []; }, get textContent() { return this._text; },
    get firstChild() { return this.children[0]; },
    append(...items) { this.children.push(...items); }, appendChild(item) { this.append(item); return item; },
    addEventListener(name, fn) { this.events[name] = fn; },
    getContext() { return { fillRect() {}, clearRect() {} }; },
  };
}
module.exports = function load(lang = 'ja', random = Math.random) {
  const elements = new Map();
  const screens = [];
  const math = Object.create(Math); math.random = random;
  const ctx = {
    Math: math, Date, Intl, URL, URLSearchParams, console,
    performance: { now: () => 100 },
    setInterval: () => 1, clearInterval() {}, setTimeout: (fn) => { fn(); },
    matchMedia: () => ({ matches: true }),
    navigator: { languages: [lang] }, location: { search: `?lang=${lang}`, href: 'http://localhost/again.html' },
    localStorage: { getItem: (k) => k === 'earth24.birthYear' ? '1990' : lang, setItem() {} },
    document: { documentElement: {}, querySelectorAll: () => [], createElement: element,
      getElementById: (id) => {
        if (!elements.has(id)) {
          const el = element();
          if (id === 'a-text') el.appendChild = item => { el.append(item); screens.push(item.innerHTML); return item; };
          elements.set(id, el);
        }
        return elements.get(id);
      } },
  };
  ctx.window = ctx;
  vm.createContext(ctx);
  for (const file of ['i18n.js', 'data.js', 'evo.js', 'lang-en.js']) {
    vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), ctx, { filename: file });
  }
  ctx.E24.scenes = { sceneView() {} };
  const source = fs.readFileSync(path.join(root, 'again.js'), 'utf8');
  const entry = '  replay();\n})();';
  if (!source.includes(entry)) throw new Error('again.js entry point changed: update this test harness');
  vm.runInContext(source.replace(entry,
    '  window.again = { N, TRIALS, GATES, FATES, G, reset, alive, tally, passGate, replay, finale, drawGrid };\n})();'), ctx);
  return { ...ctx.again, elements, screens, E: ctx.E24, math, text: () => elements.get('a-text').firstChild.innerHTML };
};
