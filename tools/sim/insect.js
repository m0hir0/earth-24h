// 浅い海の微生物から、選び方しだいで昆虫まで行けるか（絶滅はなしで、道だけ調べる）
//   node tools/sim/insect.js [フォルダ]
const evo = require('./load')(process.argv[2]).evo;
const WANT = ['ほかの微生物を食べる', '酸素を使う仕組みを手に入れる', '取り込んで、一緒に生きる', '多細胞の体になる', '前と後ろ、口と肛門のある体', '硬い殻とあしを持つ', '陸に上がる', '空を飛ぶ'];
for (const t of [3.6e9, 3.0e9, 2.5e9, 2.3e9, 2.1e9, 1.8e9, 1.6e9]) {
  const o = evo.birthOptions(t).find((x) => x.plan === 'microbe' && x.habitat === 'shallow') || evo.birthOptions(t).find((x) => x.plan === 'microbe');
  if (!o) { console.log(t / 1e9 + 'Ga: no microbe'); continue; }
  const L = evo.makeLineage(o, t, true);
  const path = [];
  for (let ya = t; ya > 0; ya -= Math.max(ya * 0.002, 1e4)) {
    let n;
    while ((n = evo.nodeFor(L, ya))) {
      const pick = n.opts.find((x) => WANT.includes(x.label)) || n.opts[0];
      pick.apply(L); L.taken.add(n.id); L.path.push({ ya, label: pick.label }); path.push(n.id + ':' + pick.label);
    }
    if (L.plan === 'insect') break;
  }
  console.log(`${t / 1e9}Ga ${o.name} -> ${L.plan} | ${path.join(' > ')}`);
}
