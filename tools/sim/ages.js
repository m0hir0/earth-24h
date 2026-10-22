// 「〇〇を、どう生きる？」でいつも同じ選択肢を選んだときの生存率（動物で生まれた場合、各3000回）
//   node tools/sim/ages.js [フォルダ]
const E = require('./load')(process.argv[2]), evo = E.evo;
function run(seed, pick) {
  const rnd = evo.rng(seed);
  const t = 5.3e8 * rnd() + 1e6;
  const opts = evo.birthOptions(t).filter((o) => !['human', 'hominin'].includes(o.plan));
  if (!opts.length) return null;
  const L = evo.makeLineage(opts[Math.floor(rnd() * opts.length)], t, true);
  const done = new Set(); let ya = t, picks = 0, guard = 0;
  const check = () => { let n; while ((n = evo.nodeFor(L, ya))) {
    if (n.id.startsWith('age')) { const o = n.opts[pick]; o.apply(L); L.taken.add(n.id); } else evo.autoChoose(L, n, rnd);
    picks++; } };
  check();
  while (ya > 0 && L.alive && guard++ < 20000) {
    const ev = evo.EXTINCTIONS.find((e) => !done.has(e) && e.ya < ya);
    let b = Math.max(0, ya - Math.max(ya * 0.02, 0.5)); if (ev) b = Math.max(b, ev.ya);
    for (const n of evo.NODES) if (n.from < ya && n.from > b) b = n.from;
    const span = ya - b, k = Math.max(1, Math.ceil(span / 1e6)), dt = span / k;
    for (let i = 0; i < k && L.alive; i++) evo.step(L, ya - dt * (i + 0.5), dt, rnd, picks === 0 && (t - ya) < t * 0.05);
    if (!L.alive) break; ya = b;
    if (ev && b === ev.ya) { done.add(ev); evo.applyExtinction(L, ev, rnd); }
    if (L.alive) check();
  }
  return L.alive;
}
const names = ['体を大きくする', '小さく何でも食べる', '新しい場所に広がる', '守りを固める'];
for (let pick = 0; pick < 4; pick++) {
  let n = 0, a = 0;
  for (let s = 1; s <= 3000; s++) { const r = run(s * 7919, pick); if (r === null) continue; n++; if (r) a++; }
  console.log(names[pick].padEnd(10, '　'), (a / n * 100).toFixed(1) + '%');
}
