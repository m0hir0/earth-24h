// 架空データ検証：node tools/again/distribution.cjs [反復数=100000] [seed=20261026]
// 科学的な発生率の検証ではなく、現行の仮の条件を置いた実装の分布を検証する。
const assert = require('node:assert/strict');
const load = require('./load.cjs');
const runs = Number(process.argv[2] || 100000);
const seed = Number(process.argv[3] || 20261026);
assert.ok(Number.isSafeInteger(runs) && runs >= 1000);
assert.ok(Number.isInteger(seed) && seed >= 0 && seed <= 0xffffffff);
let state = seed >>> 0;
function random() { // Mulberry32: 再現用。実際の地球史のデータではない。
  let t = state += 0x6D2B79F5; state >>>= 0;
  t = Math.imul(t ^ t >>> 15, t | 1);
  t ^= t + Math.imul(t ^ t >>> 7, t | 61);
  return ((t ^ t >>> 14) >>> 0) / 4294967296;
}
const a = load();
const p = a.GATES.reduce((p, g) => p * g.p, 1);
const n = a.TRIALS;
const histogram = [0, 0, 0, 0];
const survivors = new Array(a.GATES.length).fill(0);
let humans = 0;
for (let r = 0; r < runs; r++) {
  a.G.st = new Array(a.N).fill(null); a.G.fx = new Array(a.N).fill(0);
  let living = n;
  for (let i = 0; i < a.GATES.length; i++) {
    living -= a.passGate(a.GATES[i], random, 100);
    survivors[i] += living;
  }
  assert.equal(a.G.st[a.G.ours], null);
  const tally = a.tally();
  assert.equal(Object.values(tally).reduce((s, v) => s + v, 0), n);
  assert.equal(tally.humans || 0, living);
  humans += living; histogram[Math.min(living, 3)]++;
}
const probs = [(1 - p) ** n];
for (let k = 1; k <= 2; k++) probs[k] = probs[k - 1] * (n - k + 1) / k * p / (1 - p);
probs[3] = 1 - probs.reduce((s, v) => s + v, 0);
const distribution = histogram.map((count, i) => {
  const expected = runs * probs[i], sd = Math.sqrt(runs * probs[i] * (1 - probs[i]));
  // 希少な裾では正規近似を使わず、下で2個以上をまとめて確認する。
  if (i < 2) assert.ok(Math.abs(count - expected) <= 6 * sd, `histogram ${i}: ${count} vs ${expected}`);
  return { humans: i < 3 ? String(i) : '3+', count, percent: count / runs * 100, theoreticalPercent: probs[i] * 100 };
});
const tailP = probs[2] + probs[3], tailCount = histogram[2] + histogram[3];
assert.ok(Math.abs(tailCount - runs * tailP) <= 6 * Math.sqrt(runs * tailP * (1 - tailP)));
const expectedHumans = runs * n * p;
assert.ok(Math.abs(humans - expectedHumans) < 6 * Math.sqrt(runs * n * p * (1 - p)));
let cumulative = 1;
const gates = a.GATES.map((g, i) => {
  cumulative *= g.p;
  const expected = runs * n * cumulative;
  assert.ok(Math.abs(survivors[i] - expected) <= 6 * Math.sqrt(runs * n * cumulative * (1 - cumulative)) + 1);
  return { gate: i + 1, meanSurvivors: survivors[i] / runs, theoreticalMean: n * cumulative };
});
console.log(JSON.stringify({ kind: 'synthetic-data-only', seed, runs, random: 'Mulberry32', trialsPerRun: n,
  referenceEarthsExcluded: 1, perEarthProbability: p, perEarthPercent: 100 * p,
  expectedHumansPerRun: n * p, observedMeanHumans: humans / runs,
  distribution, gates, checks: 'passed (6-sigma tolerance; histogram tail pooled as 2+; fixed seed)' }, null, 2));
