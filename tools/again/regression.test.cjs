// node --test tools/again/regression.test.cjs
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const load = require('./load.cjs');
const total = (c) => Object.values(c).reduce((a, b) => a + b, 0);

test('10 conditional gate probabilities retain the original product', () => {
  const { GATES } = load();
  assert.equal(GATES.length, 10);
  assert.ok(Math.abs(GATES.reduce((p, g) => p * g.p, 1) - 0.000006615) < 1e-18);
});

test('1000 dots = 999 trials plus one non-random reference Earth', () => {
  const a = load(); a.reset();
  assert.equal(a.G.st.length, 1000); assert.equal(a.TRIALS, 999); assert.equal(a.alive(), 999);
  assert.equal(total(a.tally(true)), 0);
  let draws = 0;
  assert.equal(a.passGate({ p: 0, fate: 'lifeless' }, () => { draws++; return 0; }), 999);
  assert.equal(draws, 999 * 2); // one draw + one animation offset, never for ◎
  assert.equal(a.G.st[a.G.ours], null);
  assert.equal(a.alive(), 0); assert.equal(total(a.tally(true)), 999);
  assert.equal(a.passGate({ p: 1, fate: 'sea' }, () => { throw Error('dead Earth sampled again'); }), 0);
});

test('boundary: draws below p pass; a draw equal to p fails', () => {
  const a = load(); a.reset();
  assert.equal(a.passGate({ p: 0.5, fate: 'sea' }, () => 0.5 - Number.EPSILON), 0);
  assert.equal(a.alive(), 999);
  assert.equal(a.passGate({ p: 0.5, fate: 'sea' }, () => 0.5), 999);
  assert.equal(a.alive(), 0);
});

test('midway counts plus living trials conserve 999; repeated fate categories merge', () => {
  const a = load(); a.reset();
  a.G.st[0] = 'microbes'; a.G.st[1] = 'microbes'; a.G.st[2] = 'sea';
  assert.equal(a.tally(true).microbes, 2);
  assert.equal(total(a.tally(true)) + a.alive(), 999);
  assert.equal(a.tally().humans, 996); assert.equal(total(a.tally()), 999);
});

// Run the actual async UI flow to its result, then through the thread and share screen.
async function result(lang, humans, override) {
  let calls = 0;
  const random = humans === 0 ? () => 1 - Number.EPSILON : humans === 999 ? () => 0 :
    () => { const i = calls++; return i === 0 || i >= 1997 ? 0 : 1 - Number.EPSILON; };
  const a = load(lang, override || random);
  const flow = a.replay();
  const click = () => a.elements.get('a-actions').firstChild.events.click();
  click();
  for (let i = 0; i < 80; i++) await Promise.resolve();
  assert.equal(a.G.humans, humans);
  assert.equal(total(a.tally()), 999);
  assert.equal(a.G.st[a.G.ours], 'humans');
  assert.equal(a.G.st.filter(s => s === 'humans').length, humans + 1);
  const gateScreens = a.screens.filter(s => s.includes('class="count"'));
  assert.equal(gateScreens.length, 20);
  for (const screen of gateScreens) assert.match(screen, /<b>\d+<\/b> \/ 999/);
  assert.match(a.text(), /999/);
  assert.match(a.text(), lang === 'ja' ? /わたしたちのような人類/ : /humans like us/i);
  assert.doesNotMatch(a.text(), /1000|1,000|\{all\}|\{n\}/);
  if (lang === 'ja') { assert.match(a.text(), /仮想地球/); assert.match(a.text(), /◎は集計外/); assert.match(a.text(), /仮の確率/); }
  else { assert.doesNotMatch(a.text(), /[ぁ-んァ-ン一-龥]/); assert.match(a.text(), /imaginary Earths/); assert.match(a.text(), /made-up odds/); }
  click(); // thread
  for (let i = 0; i < 11; i++) {
    for (let j = 0; j < 5; j++) await Promise.resolve();
    click();
  }
  await flow;
  const share = new URL(a.elements.get('a-actions').firstChild.href).searchParams.get('text');
  assert.match(share, /999/); assert.doesNotMatch(share, /1000|1,000|\{all\}|\{n\}/);
  assert.match(share, lang === 'ja' ? /仮の確率.*本当の確率はわからない/ : /made-up odds.*real odds are unknown/);
  return a;
}
for (const lang of ['ja', 'en']) for (const humans of [0, 1, 999]) {
  test(`result + share are scoped to imaginary Earths: ${lang}, ${humans} survivors`, async () => {
    const a = await result(lang, humans);
    const row = a.elements.get('a-actions').children[1];
    row.firstChild.events.click();
    assert.equal(a.alive(), 999); assert.equal(a.G.st[a.G.ours], null);
    assert.equal(a.G.humans, 0);
    assert.equal(total(a.tally(true)), 0); assert.ok(a.G.fx.every(x => x === 0));
    assert.match(a.text(), /1000/); assert.match(a.text(), /999/);
  });
}

for (const lang of ['ja', 'en']) test(`other humans are distinct from humans like us: ${lang}`, async () => {
  let draws = 0;
  const a = await result(lang, 0, () => draws++ < 999 * 9 ? 0 : 1 - Number.EPSILON);
  assert.equal(a.tally().others, 999);
  assert.match(a.text(), lang === 'ja' ? /わたしたちのような人類/ : /humans like us/i);
});

test('again metadata does not assert a simulated outcome as real history', () => {
  const html = fs.readFileSync(path.resolve(__dirname, '../../again.html'), 'utf8');
  for (const name of ['name="description"', 'property="og:description"']) {
    const line = html.split('\n').find(l => l.includes(name));
    assert.match(line, /仮の確率/); assert.match(line, /999/); assert.match(line, /本当/);
    assert.doesNotMatch(line, /1000回|人類は現れなかった/);
  }
});
