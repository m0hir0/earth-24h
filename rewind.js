/* 地球の24時間 — 地球をさかのぼる
   上が今（24:00）、下へスクロールするほど過去。段ごとに遠ざかり（最後の100年 → 1万年 → 100万年 → 1億年 → 10億年 → 46億年）、
   前の段のすべては、次の段のいちばん上の細い金の線になる。最後の「46億年ぜんぶ」は本当の縮尺で画面40枚ぶん。
   いちばん下（46億年前）から「今へ戻る」で一気に駆け上がり、最後にあなたの街 → 地球 → 宇宙の小さな点へと引いていく */
(function () {
  'use strict';
  const E = window.E24;
  const { T, S, DAY, fmtAgo, fmtClock, fmtSec, clockDecFor, ERAS, eraOf } = E;
  const { drawScene, CW, CH } = E.scenes;
  const $ = (id) => document.getElementById(id);
  const REDUCE = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  // 段：hi＝その段の底（何年前まで）、h＝高さ（画面の何枚ぶん）、keys＝並べる出来事（data.js の EVENTS の key）
  const STAGES = [
    { hi: 100, h: 1.4, title: '最後の100年', keys: ['第二次世界大戦', 'コンピュータの誕生', '人類、月に立つ', 'ワールド・ワイド・ウェブ', 'スマートフォン', 'ChatGPT公開'], tick: 20 },
    { hi: 1e4, h: 1.4, title: '最後の1万年', keys: ['産業革命', 'コロンブス、アメリカ到達', '釈迦・孔子・ソクラテス', 'ピラミッド', '文字の誕生'], tick: 2000 },
    { hi: 1e6, h: 1.5, title: '最後の100万年', keys: ['農耕の始まり', '最古級の洞窟壁画', '出アフリカ', 'ホモ・サピエンスの誕生', '火を使った確かな証拠'], tick: 2e5 },
    { hi: 1e8, h: 2, title: '最後の1億年', keys: ['ルーシー', '人類の祖先（サヘラントロプス）', '類人猿の祖先', '霊長類の祖先', '恐竜の絶滅', 'ティラノサウルスとトリケラトプス'], tick: 2e7 },
    { hi: 1e9, h: 5, title: '最後の10億年', keys: ['花を咲かせる植物', '恐竜の出現', 'ペルム紀末の大量絶滅', 'ティクターリク', '植物が陸に上がる', 'カンブリア爆発', 'エディアカラ生物群', '全球凍結（スターティアン氷期）', '多細胞生物が増えはじめる'], hours: true },
    { hi: S, h: 40, title: '46億年ぜんぶ', keys: ['最古級の多細胞の藻類', '「退屈な10億年」', '真核生物の出現', '大酸化イベント', 'ストロマトライトの化石', '生命の誕生', '海ができる', '月の誕生', '地球誕生'], hours: true },
  ];
  // 小さなドット絵を添える出来事
  const SCENES = {
    '人類、月に立つ': { ya: 57 }, 'ピラミッド': { ya: 4587 }, 'ホモ・サピエンスの誕生': { ya: 2.5e5 }, '恐竜の絶滅': { ya: 6.6e7, fx: 'impact' },
    'カンブリア爆発': { ya: 5.2e8 }, '生命の誕生': { ya: 3.6e9 }, '地球誕生': { ya: 4.55e9 },
  };
  // 長い空白に置く静かな一言（その時代のようす。古い順に当てはまるものを使う）
  const QUIET = [
    [4.4e9, ['まだ、海もありません。', 'とけた岩と、熱い空。']],
    [3.8e9, ['まだ、生き物はいません。', '海と岩と、空だけ。']],
    [2.4e9, ['海の中に、小さな細胞だけ。', 'まだ、空に酸素はありません。']],
    [5.4e8, ['まだ、目に見える生き物はいません。', '海の中に、小さな細胞だけ。', '何も起きないまま、時間だけが流れていきます。']],
  ];
  const quietOf = (ya, n) => { for (const [from, list] of QUIET) if (ya >= from) return T(list[n % list.length]); return T('このあたりもまだ、{e}。', { e: eraOf(ya).name }); };
  const EV = new Map(E.EVENTS.map((e) => [e.key, e]));
  const BY = 'earth24.birthYear';
  const byLoad = () => { try { const y = Number(localStorage.getItem(BY)); return y >= 1900 && y <= new Date().getFullYear() ? y : 0; } catch (e) { return 0; } };

  $('r-home').textContent = T('← 地球の24時間');
  const other = E.LANG === 'ja' ? 'en' : 'ja';
  $('r-lang').textContent = other === 'en' ? 'English' : '日本語';
  $('r-lang').addEventListener('click', () => E.setLang(other));
  if (E.LANG === 'en') document.title = T('地球をさかのぼる | 地球の24時間');

  const track = $('track');
  const parts = [];                       // スクロール位置から「今どこか」を引くための区切り
  let H = 700;
  const div = (cls, html, parent = track) => { const d = document.createElement('div'); if (cls) d.className = cls; if (html != null) d.innerHTML = html; parent.appendChild(d); return d; };
  const clockOf = (ya) => (ya < 0.5 ? '24:00:00' : fmtClock(ya, clockDecFor(ya)));

  function intro(final) {
    const age = byLoad() ? Math.max(1, new Date().getFullYear() - byLoad()) : 0;
    if (!final) {
      return `<div class="kick">${esc(T('24:00 — 今'))}</div><div class="big">${esc(T('あなたは今、\n46億年の\nいちばん先にいます。'))}</div>
        <p class="body">${esc(T('ここから下へスクロールすると、時間がさかのぼります。少し進むたびに、景色はぐっと遠ざかります。'))}</p>
        <div id="by-box"></div><div class="hint">${esc(T('↓ 下へスクロール'))}</div>`;
    }
    return `<div class="final"><div class="kick">${esc(T('24:00 — 今'))}</div><div class="big">${esc(T('おかえりなさい。'))}</div>
      <p class="body">${esc(T('46億年をさかのぼって、また今に戻ってきました。人類の歴史は、地球時計の最後の5.6秒。'))}${age ? esc(T('あなたの人生（{a}年）は、そのまた最後の{s}。', { a: age, s: fmtSec(age / S * DAY) })) : ''}</p>
      <p class="body"><b>${esc(T('そのいちばん先に、今、あなたがいます。'))}</b></p>
      <div class="actions" id="fin-actions"></div></div>`;
  }
  function birthForm() {
    const box = $('by-box');
    if (!box) return;
    box.textContent = '';
    const y = byLoad();
    if (y) {
      const p = div('body', esc(T('あなたが生まれた{y}年も、いちばん上に印をつけておきます。', { y })), box);
      const b = document.createElement('button'); b.className = 'btn ghost'; b.type = 'button'; b.textContent = T('生まれた年を変える');
      b.addEventListener('click', () => { try { localStorage.removeItem(BY); } catch (e) { /* */ } birthForm(); build(true); });
      p.after(b);
      return;
    }
    const f = document.createElement('form'); f.className = 'year';
    f.innerHTML = '<label><span></span> <input type="number" inputmode="numeric" min="1900" placeholder="1990"></label><button type="submit"></button>';
    f.querySelector('span').textContent = T('生まれた年（任意）');
    f.querySelector('input').max = new Date().getFullYear();
    f.querySelector('button').textContent = T('入れる');
    f.addEventListener('submit', (ev) => {
      ev.preventDefault();
      const v = Number(f.querySelector('input').value);
      if (!(v >= 1900 && v <= new Date().getFullYear())) return;
      try { localStorage.setItem(BY, String(v)); } catch (e) { /* この端末だけ */ }
      build(true);
    });
    box.appendChild(f);
  }

  // 1つの段を作る（上が今、下がその段の底）
  function stage(st, si) {
    const lo = si ? STAGES[si - 1].hi : 0, hi = st.hi, h = Math.round(st.h * H);
    const sec = div('sec');
    sec.style.height = `${h}px`;
    const y = (ya) => (ya / hi) * h;
    // 左のレール：時代の色
    const rail = div('rail', null, sec);
    for (const e of ERAS) {
      if (e.to >= hi) continue;
      const top = y(Math.max(e.to, 0)), bot = y(Math.min(e.from, hi));
      const i = document.createElement('i'); i.style.top = `${top}px`; i.style.height = `${Math.max(1, bot - top)}px`; i.style.background = e.color; rail.appendChild(i);
    }
    // 目盛り
    if (st.hours) {
      for (let hr = 23; hr >= 0; hr--) {
        const ya = (24 - hr) / 24 * S;
        if (ya > hi || ya <= lo) continue;
        div('tick', `<span>${hr}:00</span>`, sec).style.top = `${y(ya)}px`;
      }
    } else {
      for (let ya = st.tick; ya < hi; ya += st.tick) {
        if (ya <= lo) continue;
        const lab = ya < 1e4 ? T('{n}年前', { n: ya.toLocaleString(E.LANG === 'en' ? 'en-US' : 'ja-JP') }) : fmtAgo(ya);   // 「西暦26年」ではなく「2,000年前」
        div('tick', `<span>${esc(lab)}</span>`, sec).style.top = `${y(ya)}px`;
      }
    }
    // いちばん上：今、あなたの人生、さっきまでの段
    if (si === 0) {
      const age = byLoad() ? Math.max(1, new Date().getFullYear() - byLoad()) : 0;
      if (age) div('life', `<span>${esc(T('あなたの人生（{a}年）', { a: age }))}</span>`, sec).style.height = `${y(age)}px`;
      div('now-line', `<span>${esc(T('24:00 — 今'))}</span>`, sec);
    }
    const bh = si ? Math.max(3, y(lo)) : 0;
    const long = bh > H;                                                 // 前の段が画面1枚より長い（46億年の段）
    let bottom = si === 0 ? 26 : bh + 30;
    if (si) {
      const band = div('band', null, rail); band.style.height = `${bh}px`;
      const p = T(STAGES[si - 1].title);
      if (long) {
        // 金色の部分に、さっき通った出来事を薄く残す（本当の位置に）
        div('band-top', esc(T('この金色の部分が、さっきまでの「{p}」', { p })), sec);
        let gb = 26;
        const ghosts = ['ホモ・サピエンスの誕生', '恐竜の絶滅', ...STAGES[si - 1].keys].map((k) => EV.get(k)).filter((e) => e && e.ya <= lo).sort((a, b) => a.ya - b.ya);
        for (const e of ghosts) {
          const y0 = y(e.ya), top = Math.max(y0 - 9, gb + 6);
          const el = div('ev ghost', `<span class="dot"></span><b>${esc(e.name)}</b>`, sec);
          el.style.top = `${top}px`;
          el.querySelector('.dot').style.top = `${y0 - top - 4}px`;
          gb = top + el.offsetHeight;
        }
        div('band-label', esc(T('↑ ここまでが「{p}」', { p })), sec).style.top = `${bh + 4}px`;
      } else {
        div('band-label', esc(T('↑ さっきまでの「{p}」は、すべてこの金の線の中', { p })), sec).style.top = `${bh + 4}px`;
      }
    }
    // 出来事（重なるときは少し下へずらし、点は本当の位置に残す）
    const placed = [];
    const evs = st.keys.map((k) => EV.get(k)).filter((e) => e && e.ya <= hi && e.ya > lo).sort((a, b) => a.ya - b.ya);   // 上（新しい）から順に
    for (const e of evs) {
      const key = e.key;
      const y0 = y(e.ya), top = Math.max(y0 - 10, bottom + 8);
      const el = div('ev', `<span class="dot"></span><b>${esc(e.name)}</b><small>${esc(T('地球時計 {c}', { c: clockOf(e.ya) }))}　${esc(fmtAgo(e.ya))}</small>`, sec);
      el.style.top = `${top}px`;
      el.querySelector('.dot').style.top = `${y0 - top - 6}px`;
      if (SCENES[key]) {
        const cv = document.createElement('canvas'); cv.width = CW; cv.height = CH;
        const o = SCENES[key];
        drawScene(cv.getContext('2d'), o.ya, 3, { fx: o.fx || null });
        el.appendChild(cv);
      }
      bottom = top + el.offsetHeight;
      placed.push([top, bottom]);
    }
    // 長い空白には、ときどき静かな一言（画面2〜3枚に1つ）
    const marks = [[0, si === 0 ? 26 : bh + 30], ...placed, [h, h]];
    let n = si;                                                          // 段ごとに言い出しをずらす
    for (let k = 1; k < marks.length; k++) {
      const gapTop = marks[k - 1][1], gapBot = marks[k][0];
      for (let g = gapTop + 0.6 * H; g < gapBot - 0.4 * H; g += 2.6 * H) {
        div('quiet', esc(quietOf((g / h) * hi, n++)), sec).style.top = `${g}px`;
      }
    }
    parts.push({ el: sec, kind: 'sec', lo, hi, h, title: st.title });
  }

  function build(keepScroll) {
    const sy = window.scrollY;
    H = Math.max(600, Math.min(window.innerHeight || 700, 900));
    track.textContent = '';
    parts.length = 0;
    const it = div('intro', intro(false));
    parts.push({ el: it, kind: 'now' });
    birthForm();
    STAGES.forEach((st, si) => {
      if (si) {
        const prev = STAGES[si - 1];
        const x = st.hi / prev.hi;
        const z = div('zoom', `<div class="x">×${x >= 10 ? Math.round(x) : x.toFixed(1)}</div>
          <div class="big">${esc(T(st.title))}</div>
          <p class="body">${esc(T('地球時計では、最後の{s}。', { s: fmtSec(st.hi / S * DAY) }))}</p>`);
        parts.push({ el: z, kind: 'zoom', ya: prev.hi, title: st.title });
      } else {
        const z = div('zoom', `<div class="big">${esc(T(st.title))}</div><p class="body">${esc(T('地球時計では、最後の{s}。', { s: fmtSec(st.hi / S * DAY) }))}</p>`);
        parts.push({ el: z, kind: 'zoom', ya: 0, title: st.title });
      }
      stage(st, si);
    });
    const out = div('outro', `<div class="kick">${esc(T('0:00 — 46億年前'))}</div><div class="big">${esc(T('ここで、地球が生まれました。'))}</div>
      <div class="actions"><button class="btn main" type="button" id="go-now"></button></div>`);
    parts.push({ el: out, kind: 'end' });
    $('go-now').textContent = T('今へ戻る（46億年を一気に）');
    $('go-now').addEventListener('click', backToNow);
    if (keepScroll) window.scrollTo(0, sy);
    hud();
  }

  // 上の時計：画面の上のほうにある場所の時刻
  function hud() {
    const probe = window.scrollY + $('h-clock').closest('.hud').offsetHeight + 24;
    let ya = 0, title = '';
    for (const p of parts) {
      const top = p.el.offsetTop, bot = top + p.el.offsetHeight;
      if (probe < top) break;
      if (p.kind === 'sec') { ya = Math.min(p.hi, Math.max(0, (probe - top) / p.h * p.hi)); title = p.title; }
      else if (p.kind === 'zoom') { ya = p.ya; title = p.title; }
      else if (p.kind === 'end') { ya = S; title = '46億年ぜんぶ'; }
      else { ya = 0; title = ''; }
      if (probe < bot) break;
    }
    $('h-stage').textContent = title ? T(title) : '';
    $('h-clock').textContent = T('地球時計 {c}', { c: clockOf(ya) });
    $('h-ago').textContent = ya < 0.5 ? T('今') : fmtAgo(ya);
    $('h-bar').style.width = `${(ya / S) * 100}%`;
    $('h-pct').textContent = T('46億年の{p}%', { p: pctOf(ya) });
    if (au && au.on) au.amb.setDepth(depthOf());                      // 深くなるほど低く、今へ戻ると上がっていく
  }
  const depthOf = () => Math.min(1, window.scrollY / Math.max(1, document.documentElement.scrollHeight - window.innerHeight));
  // 46億年のうち何%か（小さいときは0が並ぶまま見せる：0.0000022%）
  function pctOf(ya) {
    const p = (ya / S) * 100;
    if (p <= 0) return '0';
    if (p >= 1) return p.toFixed(p >= 99.95 ? 0 : 1);
    return p.toFixed(Math.min(12, Math.ceil(-Math.log10(p)) + 1));
  }

  // 静かなアンビエント音楽（任意。最初は消えている。中身は ambient.js）
  let au = null;
  function sound(on) {
    if (on && !au) {
      const C = window.AudioContext || window.webkitAudioContext;
      if (!C || !E.ambient) return;
      const ctx = new C();
      const amb = E.ambient.create(ctx);
      amb.setDepth(depthOf());
      au = { ctx, amb, on: false, timer: 0 };
    }
    if (!au) return;
    au.on = on;
    clearInterval(au.timer);
    if (on) {
      au.ctx.resume();
      const tick = () => au.amb.schedule(au.ctx.currentTime + 1.5);
      tick(); au.timer = setInterval(tick, 300);
    }
    au.amb.fade(on);
    $('r-sound').setAttribute('aria-pressed', String(on));
    $('r-sound').textContent = on ? T('♪ 音を消す') : T('♪ 音');
  }
  document.addEventListener('visibilitychange', () => {                // ほかのタブにいるあいだは止める
    if (!au || !au.on) return;
    if (document.hidden) au.ctx.suspend(); else au.ctx.resume();
  });
  $('r-sound').textContent = T('♪ 音');
  $('r-sound').addEventListener('click', () => sound(!(au && au.on)));
  let ticking = false;
  window.addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(() => { ticking = false; hud(); }); } }, { passive: true });
  let lastW = window.innerWidth;
  window.addEventListener('resize', () => { if (Math.abs(window.innerWidth - lastW) > 40) { lastW = window.innerWidth; build(true); } });

  // いちばん下から、今へ一気に戻る（時計が 0:00 から 24:00 へ駆け上がる）
  function backToNow() {
    const from = window.scrollY, dur = REDUCE ? 400 : 6000, t0 = performance.now();
    const ease = (k) => (k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2);
    const step = () => {
      const k = Math.min(1, (performance.now() - t0) / dur);
      window.scrollTo(0, from * (1 - ease(k)));
      hud();
      if (k < 1) setTimeout(step, 16);
      else { finish(); pullback(); }
    };
    step();
  }
  function finish() {
    const it = parts[0].el;
    it.innerHTML = intro(true);
    const box = $('fin-actions');
    const text = T('46億年をスクロールでさかのぼったら、人類の歴史は、いちばん上の細い線の中だった。');
    const x = new URL('https://twitter.com/intent/tweet');
    x.searchParams.set('text', `${text}\n${T('#地球の24時間')}`);
    x.searchParams.set('url', 'https://earth24h.com/rewind');
    const share = document.createElement('a'); share.className = 'btn main'; share.href = x.toString(); share.target = '_blank'; share.rel = 'noopener'; share.textContent = T('Xでシェア');
    const row = document.createElement('div'); row.className = 'row';
    const again = document.createElement('a'); again.className = 'btn ghost'; again.href = 'again.html'; again.textContent = T('地球をもう一度');
    const game = document.createElement('a'); game.className = 'btn ghost'; game.href = './'; game.textContent = T('進化ガチャで遊ぶ');
    row.append(again, game);
    box.append(share, row);
  }

  // 今に戻ったあと：あなたの街から引いていき、地球、そして宇宙の小さな点へ
  function pullback() {
    const pb = $('pb'), cv = $('pb-c'), cap = $('pb-cap'), skip = $('pb-skip');
    pb.hidden = false; pb.classList.remove('out');
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const W = (cv.width = Math.round(window.innerWidth * dpr)), HH = (cv.height = Math.round(window.innerHeight * dpr));
    const ctx = cv.getContext('2d');
    const city = document.createElement('canvas'); city.width = CW; city.height = CH;
    const cctx = city.getContext('2d');
    const gl = document.createElement('canvas'); gl.width = gl.height = E.globe.N;
    const gctx = gl.getContext('2d');
    let seed = 7;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    const stars = Array.from({ length: 140 }, () => [rnd() * W, rnd() * HH, rnd() < 0.15 ? 2 : 1, rnd()]);
    const CAPS = [[0.3, '今、ここ。'], [4.2, '46億年、回りつづけてきた星。'], [10, 'その小さな点の上に、\nあなたがいます。']];
    const END = 10.5, cx = W / 2, cy = HH * 0.42;
    const big = Math.max(W, HH) * 1.3, full = Math.min(W, HH) * 0.8, small = 2.2 * dpr;
    const lg = (a, b, k) => a * Math.pow(b / a, Math.min(1, Math.max(0, k)));   // 大きさは倍率で縮める
    // 地球の直径：画面より大きい → 丸ごと見える大きさでしばらく回る → 点になる
    const diam = (s) => (s < 4.5 ? lg(big, full, ease((s - 2.2) / 2.3)) : s < 6.8 ? lg(full, full * 0.75, (s - 4.5) / 2.3) : lg(full * 0.75, small, (s - 6.8) / 3.2));
    const city0 = Math.max(W * 1.15, HH * 0.42 * CW / CH);
    const ease = (k) => 1 - Math.pow(1 - Math.min(1, Math.max(0, k)), 3);
    let t0 = performance.now() - (REDUCE ? END * 1000 : 0), shown = -1, done = false;
    skip.textContent = T('スキップ');
    const close = () => {
      if (done) return;
      done = true;
      pb.classList.add('out');
      setTimeout(() => { pb.hidden = true; }, 900);
    };
    skip.onclick = (ev) => { ev.stopPropagation(); close(); };
    pb.onclick = () => { if ((performance.now() - t0) / 1000 > END) close(); };
    const frame = () => {
      if (done) return;
      const s = (performance.now() - t0) / 1000;
      ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, HH);
      // 星：引くにつれて見えてくる
      const sa = ease((s - 1.5) / 3);
      for (const [x, y, r, tw] of stars) { ctx.globalAlpha = sa * (0.45 + 0.4 * Math.sin(s * 1.3 + tw * 9)); ctx.fillStyle = '#cfd8ff'; ctx.fillRect(x, y, r * dpr * 0.6, r * dpr * 0.6); }
      ctx.imageSmoothingEnabled = false;
      // 地球：画面いっぱいから小さな点へ
      if (s > 2.2) {
        const d = diam(s);
        ctx.globalAlpha = ease((s - 2.2) / 1.2);
        if (d > 10 * dpr) {
          E.globe.draw(gctx, 0.3, s * 0.25);
          ctx.drawImage(gl, cx - d / 2, cy - d / 2, d, d);
        } else {
          const r = Math.max(small / 2, d / 2);
          const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r * 5);
          g.addColorStop(0, 'rgba(150,190,255,0.55)'); g.addColorStop(1, 'rgba(150,190,255,0)');
          ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, r * 5, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = '#9cc4ff'; ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
        }
      }
      // あなたの街：はじめは画面いっぱい、小さくなりながら消える
      if (s < 3.4) {
        const k = ease(s / 3.4);
        drawScene(cctx, 0.3, Math.floor(s * 8), {});
        const w = lg(city0, W * 0.3, k), h = w * CH / CW;
        ctx.globalAlpha = 1 - ease((s - 1.8) / 1.6);
        ctx.drawImage(city, cx - w / 2, cy - h / 2, w, h);
      }
      ctx.globalAlpha = 1;
      // ことば
      let c = -1;
      CAPS.forEach(([at], i) => { if (s >= at) c = i; });
      if (c !== shown) {
        shown = c;
        cap.classList.remove('on');
        setTimeout(() => { cap.textContent = c >= 0 ? T(CAPS[c][1]) : ''; cap.classList.add('on'); }, c > 0 ? 500 : 0);
      }
      if (s > END + 1) skip.textContent = T('戻る');
      requestAnimationFrame(frame);
    };
    frame();
  }

  build(false);
})();
