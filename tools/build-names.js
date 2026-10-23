// 化石の博物館のサーバーが受け付ける言葉の一覧を作る（functions/_lib/names.json）
//   展示される記録には自由な文章を入れさせない。生き物の名前・選んだ道・絶滅の原因は、ゲームが作りうるものだけを通す
//   生き物や分かれ道を足したら、必ず実行して一緒にコミットする：node tools/build-names.js
const fs = require('fs'), path = require('path');
const dir = path.resolve(__dirname, '..');
const E = require('./sim/load')(dir), evo = E.evo;
const names = new Set(), labels = new Set(), causes = new Set(), variants = new Set(['']);
for (let ya = 1; ya < E.S; ya += Math.max(1000, ya * 0.002)) for (const o of evo.birthOptions(ya)) names.add(o.name);
for (const k in evo.PLANS) names.add(evo.PLANS[k].ja || evo.PLANS[k].name);
// 変種の名前（app.js の VARIANT_NAMES）
const app = fs.readFileSync(path.join(dir, 'app.js'), 'utf8');
const vm = app.match(/const VARIANT_NAMES = \{([\s\S]*?)\n  \};/);
for (const m of vm[1].matchAll(/(\w+): '([^']+)'/g)) { variants.add(m[1]); names.add(m[2]); }
for (const m of app.matchAll(/return '(\w+)'/g)) variants.add(m[1]);           // variantOf() が返す変種
// 分かれ道：選択肢の言葉と、選んだときに付く名前
for (const n of evo.NODES) for (const o of n.opts) {
  labels.add(o.label);
  for (const plan in evo.PLANS) {
    const L = evo.makeLineage({ name: '?', plan, habitat: 'sea' }, 1e8, true);
    try { o.apply(L); } catch (e) { /* 条件に合わない組み合わせ */ }
    if (L.name && L.name !== '?') names.add(L.name);
  }
}
for (const n of [...names]) for (const pre of ['大型の', '小型の', 'とげのある']) if (!n.startsWith(pre)) names.add(pre + n);   // 大きさ・守りで変わった姿（app.js の tierName）
for (const x of evo.EXTINCTIONS) causes.add(x.name);
const bg = fs.readFileSync(path.join(dir, 'evo.js'), 'utf8').match(/die\(L, ya, '([^']+)'\)/);
if (bg) causes.add(bg[1]);
const out = {
  plans: Object.keys(evo.PLANS), habitats: Object.keys(evo.HAB_LABEL), variants: [...variants].sort(),
  names: [...names].sort(), labels: [...labels].sort(), causes: [...causes].sort(), S: E.S,
};
fs.writeFileSync(path.join(dir, 'functions/_lib/names.json'), JSON.stringify(out, null, 1) + '\n');
console.log(`names ${out.names.length}, labels ${out.labels.length}, causes ${out.causes.length}, variants ${out.variants.length}`);
