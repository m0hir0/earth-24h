// 英語の訳し漏れを探す：app.js・story.js・museum.js の T('日本語…')、index.html の data-i18n、暮らしの出来事・生き物の説明
//   node tools/check-i18n.js      … 漏れがなければ「all covered」
// 説明ページ（guide.html など）は本文を日英両方で書いているので対象外
const fs = require('fs'), path = require('path'), vm = require('vm');
const dir = path.resolve(__dirname, '..');
const ctx = {
  console, Math, Date, Intl, URLSearchParams,
  navigator: { languages: ['en'] },
  location: { search: '?lang=en', href: 'http://x/?lang=en' },
  localStorage: { getItem: () => 'en', setItem() {} },
  document: { documentElement: {}, querySelectorAll: () => [] },
  matchMedia: () => ({ matches: false }),
};
ctx.window = ctx;
vm.createContext(ctx);
for (const f of ['i18n.js', 'data.js', 'evo.js', 'lang-en.js']) vm.runInContext(fs.readFileSync(path.join(dir, f), 'utf8'), ctx, { filename: f });
const D = ctx.E24.DICT, evo = ctx.E24.evo;
const ja = /[ぁ-んァ-ン一-龥]/;
const miss = new Set();

for (const f of ['app.js', 'story.js', 'museum.js', 'again.js', 'rewind.js']) {
  if (!fs.existsSync(path.join(dir, f))) continue;
  const src = fs.readFileSync(path.join(dir, f), 'utf8');
  for (const m of src.matchAll(/\bT\('((?:[^'\\]|\\.)*)'/g)) {
    const k = m[1].replace(/\\n/g, '\n').replace(/\\'/g, "'");
    if (ja.test(k) && D[k] === undefined) miss.add(`${f}: ${k}`);
  }
}
// data-i18n（中にタグを含まない要素の文章、または data-i18n="キー"）
const html = fs.readFileSync(path.join(dir, 'index.html'), 'utf8');
for (const m of html.matchAll(/data-i18n(?:="([^"]*)")?[^>]*>([^<]*)</g)) {
  const k = (m[1] || m[2]).trim();
  if (k && ja.test(k) && D[k] === undefined) miss.add(`index.html: ${k}`);
}
for (const m of html.matchAll(/data-i18n-label="([^"]*)"/g)) if (D[m[1]] === undefined) miss.add(`index.html label: ${m[1]}`);
// 暮らしの出来事は辞書で訳す。生き物の説明は lang-en.js が evo.ABOUT を英語に置きかえる
for (const g in evo.LIFE) for (const [t] of evo.LIFE[g]) if (D[t] === undefined) miss.add(`LIFE: ${t}`);
for (const k in evo.ABOUT) if (ja.test(evo.ABOUT[k])) miss.add(`ABOUT: ${k}`);

console.log(miss.size ? [...miss].join('\n') : 'all covered');
process.exitCode = miss.size ? 1 : 0;
