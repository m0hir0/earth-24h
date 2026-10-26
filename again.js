/* 地球の24時間 — 地球をもう一度
   1. 999個の仮想地球を試す＋今の地球の印1個。抽選と集計は仮想地球のみ
   2. この地球の糸：現実には人類が生まれた。最初の細胞から、あなたの祖先をたどる
   3. あなた：両親にない新しい変化を持って生まれた、46億年分の偶然のいちばん新しい1つ
   進化に意志はない。どの場面も「たまたま」で語る。関門の確率は、想像のための仮の数字 */
(function () {
  'use strict';
  const E = window.E24;
  const { T, S, DAY, fmtAgo, fmtClock, fmtSec } = E;
  const { drawScene, sceneView, CW, CH } = E.scenes;
  const $ = (id) => document.getElementById(id);
  const REDUCE = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const sleep = (ms) => new Promise((r) => setTimeout(r, REDUCE ? Math.min(ms, 200) : ms));
  const N = 1000, TRIALS = N - 1, COLS = 40, CELL = 8;

  // p は前の関門まで通過した条件下の仮の通過率。地球ごとに独立に抽選する。
  // 確率・順序・fate は演出用の仮定。実際の進化の必須条件や再現確率の推定ではない。
  const GATES = [
    { ya: 3.8e9, q: '生命が生まれるか', p: 0.7, fate: 'lifeless' },
    { ya: 2.4e9, q: '光で酸素をつくる生き物が現れ、空気に酸素がたまるか', p: 0.5, fate: 'microbes' },
    { ya: 2.0e9, q: 'ある細胞が細菌を飲みこみ、核を持つ細胞が生まれるか', p: 0.1, fate: 'microbes' },
    { ya: 7.2e8, q: '地球全体が凍りつく時代を越えられるか', p: 0.7, fate: 'frozen' },
    { ya: 5.4e8, q: '細胞が集まり、目やあしを持つ動物が現れるか', p: 0.5, fate: 'cells' },
    { ya: 3.75e8, q: '背骨を持つ魚が、陸に上がるか', p: 0.4, fate: 'sea' },
    { ya: 2.52e8, q: '史上最大の大絶滅で、哺乳類の祖先が生き残るか', p: 0.3, fate: 'reptiles' },
    { ya: 6.6e7, q: '隕石が落ちて、恐竜の時代が終わるか', p: 0.15, fate: 'dinos' },
    { ya: 7e6, q: 'サルの仲間が草原で立ち上がり、脳が大きくなるか', p: 0.1, fate: 'mammals' },
    { ya: 3e5, q: '氷河時代を越えて、わたしたちホモ・サピエンスが残るか', p: 0.3, fate: 'others' },
  ];
  const FATES = {
    lifeless: ['生命のいない星', '#6e5e50'], microbes: ['微生物だけの星', '#3f8f8a'], frozen: ['凍りついたままの星', '#cfe3ef'],
    cells: ['小さな細胞だけの海の星', '#4a78b8'], sea: ['海の動物だけの星', '#2a58a0'], reptiles: ['は虫類と昆虫の星', '#6f8f34'],
    dinos: ['恐竜が今も歩く星', '#a8843a'], mammals: ['人類のいない、けものの星', '#a8643a'], others: ['別の人類が暮らす星', '#d0763a'],
    humans: ['わたしたちのような人類の星', '#ffd84a'],
  };
  // この地球の、あなたへの糸（実際の祖先の道。どれも「たまたま」）
  const THREAD = [
    { ya: 3.8e9, plan: 'microbe', v: 'rod', h: 'shallow', t: 'はじまりの細胞', b: '海のどこかで、たまたま自分をコピーできる分子のかたまりが生まれました。ここから先の生き物は、すべてこの子孫です。' },
    { ya: 2.0e9, plan: 'cell', v: 'euk', h: 'shallow', t: '飲みこんで、消化しそこねた', b: 'ある細胞が細菌を飲みこみ、たまたま消化しそこねました。中で生き続けた細菌は、やがてエネルギーをつくるミトコンドリアになります。地球の歴史で、たった一度きりの出来事だったと考えられています。' },
    { ya: 6e8, plan: 'colony', v: 'volvox', h: 'sea', t: 'くっついたまま、離れなかった', b: '分裂した細胞が、たまたまくっついたまま離れませんでした。役割を分けあう、大きな体のはじまりです。' },
    { ya: 5.2e8, plan: 'jawless', v: '', h: 'sea', t: '背骨のもとを持つ、小さな魚', b: 'カンブリア紀の海を、体に一本の筋が通った数センチの魚が泳いでいました。背骨を持つ動物の、とても古い親戚です。' },
    { ya: 3.75e8, plan: 'amphibian', v: '', h: 'land', t: 'ひれで、水辺をはった', b: 'ひれに骨のある魚が、浅い水辺でひれを使って体を支え、はうように進みました。陸を歩く四つ足の祖先です。' },
    { ya: 2.52e8, plan: 'synapsid', v: '', h: 'land', fx: 'eruption', t: '大絶滅の、生き残り', b: '火山の大噴火で、海の生き物の8割以上が消えました。たまたま生き残った小さな仲間の中に、哺乳類の祖先がいました。' },
    { ya: 6.6e7, plan: 'mammal', v: '', h: 'land', fx: 'impact', t: '小さかったから', b: '直径10kmの隕石が落ち、鳥以外の恐竜はすべて消えました。ネズミほどの大きさで、穴にもぐり、何でも食べた祖先は、たまたま生き延びました。' },
    { ya: 5.5e7, plan: 'primate', v: '', h: 'land', t: '木の上へ', b: '恐竜のいなくなった森で、木の上で暮らす小さなサルの仲間が増えました。ものをつかむ手と、前を向いた目を持っていました。' },
    { ya: 6e6, plan: 'hominin', v: '', h: 'land', t: '森が減って、立ち上がった', b: 'アフリカの森が少しずつ草原に変わっていくころ、二本の足で立って歩く仲間が現れました。' },
    { ya: 3e5, plan: 'human', v: '', h: 'land', t: 'ホモ・サピエンス', b: 'わたしたちホモ・サピエンスが、アフリカで生まれました。ほかの人類はやがてみな消え、残ったのはわたしたちだけです。' },
  ];

  /* ---------- 画面の部品 ---------- */
  $('a-home').textContent = T('← 地球の24時間');
  const other = E.LANG === 'ja' ? 'en' : 'ja';
  $('a-lang').textContent = other === 'en' ? 'English' : '日本語';
  $('a-lang').addEventListener('click', () => E.setLang(other));
  if (E.LANG === 'en') document.title = T('地球をもう一度 | 地球の24時間');

  function say(html, cls = '') {
    const box = $('a-text');
    box.innerHTML = '';
    const d = document.createElement('div'); d.className = `fade ${cls}`; d.innerHTML = html; box.appendChild(d);
    return d;
  }
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  function buttons(list) {
    const box = $('a-actions'); box.textContent = '';
    return new Promise((resolve) => {
      for (const [label, cls, val] of list) {
        const b = document.createElement('button'); b.type = 'button'; b.className = `btn ${cls || ''}`; b.textContent = label;
        b.addEventListener('click', () => { box.textContent = ''; resolve(val); });
        box.appendChild(b);
      }
    });
  }
  const clock = (ya) => { $('a-clock').innerHTML = `${esc(T('地球時計'))} <b>${esc(fmtClock(ya))}</b>　${esc(fmtAgo(ya))}`; };

  /* ---------- 1000個の地球 ---------- */
  const G = { st: [], fx: [], ours: N >> 1, timer: 0 };      // st: null＝まだくぐっている、文字列＝その星になった
  const ctx = $('a-grid').getContext('2d');
  const GLOBE = [[2, 2], [1, 4], [0, 6], [0, 6], [1, 4], [2, 2]];   // 6×6 の丸い地球（行ごとの開始位置と幅）
  function globe(i, color, now) {
    const x = (i % COLS) * CELL + 1, y = Math.floor(i / COLS) * CELL + 1;
    ctx.fillStyle = color;
    GLOBE.forEach(([o, w], r) => ctx.fillRect(x + o, y + r, w, 1));
    if (color === LIVE) { ctx.fillStyle = '#4fae5a'; ctx.fillRect(x + 1, y + 2, 2, 1); ctx.fillRect(x + 3, y + 3, 2, 1); }
    if (i === G.ours) {                                       // この地球には金の輪
      ctx.fillStyle = (now >> 9) % 2 ? '#ffd84a' : '#fff1a8';
      ctx.fillRect(x - 1, y - 1, 8, 1); ctx.fillRect(x - 1, y + 6, 8, 1); ctx.fillRect(x - 1, y, 1, 6); ctx.fillRect(x + 6, y, 1, 6);
    }
  }
  const LIVE = '#4f8fe0';
  function drawGrid() {
    const now = performance.now();
    ctx.clearRect(0, 0, 320, 200);
    for (let i = 0; i < N; i++) {
      const s = G.st[i];
      let color = s ? FATES[s][0 + 1] : LIVE;
      const f = G.fx[i];
      if (f) {
        const k = now - f;
        if (k < 0) color = LIVE;
        else if (k < 140) color = '#ffffff';
      }
      ctx.globalAlpha = s && s !== 'humans' && !(f && now - f < 140) ? 0.5 : 1;
      globe(i, color, now);
    }
    ctx.globalAlpha = 1;
  }
  function reset() {
    G.humans = 0;
    G.st = new Array(N).fill(null); G.fx = new Array(N).fill(0);
    clearInterval(G.timer);
    G.timer = setInterval(drawGrid, 33);
    $('a-grid').hidden = false; $('a-scene').hidden = true;
    $('a-ours').textContent = T('◎ 今の地球・抽選外');
  }
  const alive = () => G.st.reduce((n, s, i) => n + (!s && i !== G.ours ? 1 : 0), 0);
  // 星の内訳。midway のときは、まだ進んでいる地球を数えない
  function tally(midway) {
    const c = {};
    G.st.forEach((s, i) => { if (i !== G.ours && (s || !midway)) { const k = s || 'humans'; c[k] = (c[k] || 0) + 1; } });
    return c;
  }
  function legend(c) {
    return `<ul class="legend">${Object.keys(FATES).filter((k) => c[k]).map((k) => `<li><i style="background:${FATES[k][1]}"></i><span>${esc(T(FATES[k][0]))}</span><span class="n">${c[k]}</span></li>`).join('')}</ul>`;
  }

  // 抽選は999個のみ。◎は人類が存在する現実を示す参照点で、成功例の標本ではない。
  function passGate(g, random = Math.random, t0 = performance.now()) {
    let failed = 0;
    for (let i = 0; i < N; i++) {
      if (G.st[i] || i === G.ours) continue;
      if (random() >= g.p) { G.st[i] = g.fate; G.fx[i] = t0 + random() * (REDUCE ? 0 : 1400); failed++; }
    }
    return failed;
  }

  async function replay() {
    reset();
    clock(S);
    say(`<div class="kick">${esc(T('地球をもう一度'))}</div><h1>${esc(T('46億年を、\nもう一度。'))}</h1>
      <p class="body">${esc(T('地球が生まれた日から、もう一度。生命が生まれるか、隕石が落ちるか——偶然の関門をくぐれなかった地球は、そこで別の姿の星になります。わたしたちのような人類が現れる地球は、いくつあるでしょう。'))}</p>
      <p class="body">${esc(T('画面の{total}個は、仮想地球{all}個と、今の地球を示す◎1個です。◎は抽選・集計に含めません。', { total: N, all: TRIALS }))}</p>
      <p class="note">${esc(T('関門の確率は科学的にわかっていないため、ここでは想像のための仮の数字を使います。関門の並びと別の星の姿も単純化した仮定です。この結果は、人類やあなたが生まれる本当の確率を推定するものではありません。'))}</p>`);
    await buttons([[T('やり直しを始める'), '', 1]]);
    for (let gi = 0; gi < GATES.length; gi++) {
      const g = GATES[gi];
      clock(g.ya);
      const left = alive();
      say(`<div class="kick">${esc(T('関門 {n} / {all}', { n: gi + 1, all: GATES.length }))}</div><div class="big">${esc(T(g.q))}</div>
        <p class="count">${esc(T('まだ進んでいる仮想地球'))} <b>${left}</b> / ${TRIALS}</p>
        <p class="note">${esc(T('ここまで進んだ仮想地球が、次へ進む確率：{p}（仮）', { p: `${Math.round(g.p * 100)}%` }))}</p>`);
      await sleep(1300);
      // くぐれなかった地球が、ばらばらに別の星へ
      const failed = passGate(g);
      await sleep(1700);
      const now = alive();
      say(`<div class="kick">${esc(T('関門 {n} / {all}', { n: gi + 1, all: GATES.length }))}</div><div class="big">${esc(T(g.q))}</div>
        <p class="count">${esc(T('まだ進んでいる仮想地球'))} <b>${now}</b> / ${TRIALS}</p>
        <p class="body">${failed ? esc(T('{n}個の仮想地球が、ここで「{f}」になりました。', { n: failed, f: T(FATES[g.fate][0]) })) : now ? '' : esc(T('もう、進んでいる仮想地球はありません。'))}</p>
        <p class="ours">${esc(T('◎ は今の地球。人類が生まれた事実を示す印です。'))}</p>${legend(tally(true))}`);
      await sleep(now || failed ? 2000 : 1300);
    }
    // 結果
    clock(0.5);
    // 抽選で残った仮想地球と、現実を示す◎を人類の色にそろえる。◎は集計外のまま。
    G.st = G.st.map((s) => s || 'humans');
    const c = tally(), humans = c.humans || 0;
    G.humans = humans;
    say(`<div class="kick">${esc(T('仮の条件で試した{all}個の内訳（◎は集計外）', { all: TRIALS }))}</div>
      <div class="big">${esc(humans ? T('{all}個の仮想地球のうち、\nわたしたちのような人類が現れたのは{n}個。', { all: TRIALS, n: humans }) : T('{all}個の仮想地球では、\nわたしたちのような人類は現れませんでした。', { all: TRIALS }))}</div>
      ${legend(c)}
      <p class="ours">${esc(T('◎ 今の地球：人類が存在する1個（抽選・集計外）'))}</p>
      <p class="note">${esc(T('この結果は仮の確率を置いた物語です。実際に地球をやり直したときの確率はわかっていません。'))}</p>
      <p class="body"><b>${esc(T('現実の地球では、人類が生まれ、今あなたがいます。'))}</b></p>`);
    await buttons([[T('この地球の糸をたどる'), '', 1]]);
    await thread();
  }

  /* ---------- この地球の糸 ---------- */
  const SC = { st: null };
  sceneView($('a-scene'), () => SC.st);
  async function thread() {
    clearInterval(G.timer);
    $('a-grid').hidden = true; $('a-scene').hidden = false;
    $('a-ours').textContent = T('あなたの祖先');
    for (let i = 0; i < THREAD.length; i++) {
      const s = THREAD[i];
      SC.st = { ya: s.ya, plan: s.plan, habitat: s.h, fx: s.fx || null, look: { plan: s.plan, v: s.v, size: 45 } };
      clock(s.ya);
      say(`<div class="dots">${THREAD.map((_, k) => `<i class="${k <= i ? 'on' : ''}"></i>`).join('')}<i></i></div>
        <div class="kick">${esc(fmtAgo(s.ya))}</div><div class="big">${esc(T(s.t))}</div><p class="body">${esc(T(s.b))}</p>`);
      await buttons([[T('つぎへ'), '', 1]]);
    }
    await you();
  }

  /* ---------- あなた ---------- */
  const BY = 'earth24.birthYear';
  const byLoad = () => { try { const y = Number(localStorage.getItem(BY)); return y >= 1900 && y <= new Date().getFullYear() ? y : 0; } catch (e) { return 0; } };
  async function you() {
    SC.st = { ya: 0.3 };
    clock(0.3);
    const y = byLoad();
    const show = (year) => {
      const age = year ? Math.max(1, new Date().getFullYear() - year) : 0;
      say(`<div class="dots">${THREAD.map(() => '<i class="on"></i>').join('')}<i class="on"></i></div>
        <div class="kick">${esc(T('24:00 — 今'))}</div><div class="big">${esc(T('そして、あなた。'))}</div>
        <p class="body">${esc(T('あなたは、両親のどちらも持っていない新しい遺伝子の変化を、およそ数十個持って生まれました。あなたもまた、偶然から生まれた、いちばん新しい1つです。'))}</p>
        ${age ? `<p class="body">${esc(T('あなたの人生（{a}年）は、地球時計でわずか{s}。', { a: age, s: fmtSec(age / S * DAY) }))}</p>` : ''}`);
      if (!year) {
        const f = document.createElement('form'); f.className = 'year';
        f.innerHTML = `<label><span></span> <input type="number" inputmode="numeric" min="1900" placeholder="1990"></label><button type="submit"></button>`;
        f.querySelector('span').textContent = T('生まれた年（任意）');
        f.querySelector('input').max = new Date().getFullYear();
        f.querySelector('button').textContent = T('入れる');
        f.addEventListener('submit', (ev) => {
          ev.preventDefault();
          const v = Number(f.querySelector('input').value);
          if (!(v >= 1900 && v <= new Date().getFullYear())) return;
          try { localStorage.setItem(BY, String(v)); } catch (e) { /* この端末だけ */ }
          show(v);
        });
        $('a-text').firstChild.appendChild(f);
      }
    };
    show(y);
    await buttons([[T('つぎへ'), '', 1]]);
    await finale();
  }

  async function finale() {
    const n = G.humans || 0;
    const line = T('仮の確率で試した{all}個の仮想地球で、わたしたちのような人類が現れたのは{n}個。本当の確率はわからない。それでも、今この地球に、わたしはいる。', { all: TRIALS, n });
    say(`<div class="final"><div class="big">${esc(T('46億年分の偶然の、\nいちばん新しい1つが、\nあなたです。'))}</div>
      <p class="body">${esc(line)}</p></div>`);
    const url = 'https://earth24h.com/again';
    const x = new URL('https://twitter.com/intent/tweet');
    x.searchParams.set('text', `${line}\n${T('#地球をもう一度 #地球の24時間')}`);
    x.searchParams.set('url', url);
    const box = $('a-actions'); box.textContent = '';
    const share = document.createElement('a'); share.className = 'btn'; share.href = x.toString(); share.target = '_blank'; share.rel = 'noopener'; share.textContent = T('Xでシェア');
    const row = document.createElement('div'); row.className = 'row';
    const again = document.createElement('button'); again.type = 'button'; again.className = 'btn ghost'; again.textContent = T('もう一度やり直す');
    again.addEventListener('click', () => { box.textContent = ''; replay(); });
    const game = document.createElement('a'); game.className = 'btn ghost'; game.href = './'; game.textContent = T('進化ガチャで遊ぶ');
    row.append(again, game);
    box.append(share, row);
  }

  replay();
})();
