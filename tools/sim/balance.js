// 釣り合い：ランダムな時代に生まれ、分かれ道もランダムに選んだときの生存率（2000回）
//   node tools/sim/balance.js            … このリポジトリで
//   node tools/sim/balance.js <フォルダ>  … 別の版の data.js / evo.js で（変更前と比べるとき）
const E = require('./load')(process.argv[2]), evo = E.evo;
function run(seed) {
  const rnd = evo.rng(seed);
  const t = rnd() * E.S;
  const opts = evo.birthOptions(t);
  if (!opts.length) return null;
  const o = opts[Math.floor(rnd() * opts.length)];
  const L = evo.makeLineage(o, t, true);
  const done = new Set();
  let ya = t, picks = 0, guard = 0;
  const check = () => { let n; while ((n = evo.nodeFor(L, ya))) { evo.autoChoose(L, n, rnd); picks++; } };
  check();
  while (ya > 0 && L.alive && guard++ < 20000) {
    const ev = evo.EXTINCTIONS.find((e) => !done.has(e) && e.ya < ya);
    let b = Math.max(0, ya - Math.max(ya * 0.02, 0.5));
    if (ev) b = Math.max(b, ev.ya);
    for (const n of evo.NODES) if (n.from < ya && n.from > b) b = n.from;
    const span = ya - b, k = Math.max(1, Math.ceil(span / 1e6)), dt = span / k;
    for (let i = 0; i < k && L.alive; i++) evo.step(L, ya - dt * (i + 0.5), dt, rnd, picks === 0 && (t - ya) < t * 0.05);
    if (!L.alive) break;
    ya = b;
    if (ev && b === ev.ya) { done.add(ev); evo.applyExtinction(L, ev, rnd); }
    if (L.alive) check();
  }
  return { era: E.eraOf(t).name, alive: L.alive, cause: L.deathCause, start: o.plan };
}
const by = {}, causes = {};
let n = 0, alive = 0;
for (let s = 1; s <= 2000; s++) {
  const r = run(s * 7919);
  if (!r) continue;
  n++; if (r.alive) alive++;
  by[r.era] = by[r.era] || [0, 0]; by[r.era][0]++; if (r.alive) by[r.era][1]++;
  if (!r.alive) causes[r.cause] = (causes[r.cause] || 0) + 1;
}
console.log(`births ${n}, survive ${(alive / n * 100).toFixed(1)}%`);
for (const k in by) console.log(`  ${k}: ${by[k][0]} runs, survive ${(by[k][1] / by[k][0] * 100).toFixed(0)}%`);
console.log('causes', Object.entries(causes).sort((a, b) => b[1] - a[1]).slice(0, 10));
