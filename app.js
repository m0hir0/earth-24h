/* 地球の24時間 v2 — 画面と動き */
(function () {
  'use strict';
  const E = window.E24;
  const { T, tr } = E;
  const {
    S, DAY, ago, fmtYears, fmtAgo, fmtSec, fmtCountdown, fmtClock, clockDecFor, fmtOneIn, fmtProb,
    fracOf, ERAS, eraOf, periodLabel, EVENTS, status, AI_STORY,
  } = E;
  const { sceneView, sceneCaption, drawScene, drawCreatureCard, PW, PH, CW, CH, CARD_W, CARD_H } = E.scenes;
  const { yaOfSec, fmtSpan } = E;
  const evo = E.evo;
  const $ = (id) => document.getElementById(id);
  const EMBEDDED = (() => { try { return window.self !== window.top; } catch (e) { return true; } })();
  const REDUCE = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ============================================================
     ダイヤル（SVG）
     ============================================================ */
  const NS = 'http://www.w3.org/2000/svg';
  function el(tag, attrs, parent) {
    const e = document.createElementNS(NS, tag);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }
  const C = 200;
  const pt = (r, deg) => { const a = deg * Math.PI / 180; return [C + r * Math.sin(a), C - r * Math.cos(a)]; };
  function annulus(a0, a1, r0, r1) {
    const large = a1 - a0 > 180 ? 1 : 0;
    const [x0, y0] = pt(r1, a0), [x1, y1] = pt(r1, a1), [x2, y2] = pt(r0, a1), [x3, y3] = pt(r0, a0);
    return `M${x0},${y0} A${r1},${r1} 0 ${large} 1 ${x1},${y1} L${x2},${y2} A${r0},${r0} 0 ${large} 0 ${x3},${y3} Z`;
  }
  function pie(deg) {
    if (deg <= 0) return 'M0,0';
    if (deg >= 359.999) return `M${C},${C - 210} A210,210 0 1 1 ${C - 0.01},${C - 210} Z`;
    const [x, y] = pt(210, deg);
    return `M${C},${C} L${C},${C - 210} A210,210 0 ${deg > 180 ? 1 : 0} 1 ${x},${y} Z`;
  }
  let maskSeq = 0;
  function buildDial(svg, { reveal }) {
    svg.setAttribute('viewBox', '0 0 400 400');
    const R0 = 150, R1 = 186;
    let revealPath = null, gFull = null;
    const gBase = el('g', { opacity: reveal ? 0.2 : 1 }, svg);
    if (reveal) {
      const id = `reveal-${++maskSeq}`;
      const mask = el('mask', { id }, el('defs', {}, svg));
      revealPath = el('path', { d: 'M0,0', fill: '#fff' }, mask);
      gFull = el('g', { mask: `url(#${id})` }, svg);
    }
    for (const e of ERAS) {
      const d = annulus(fracOf(e.from) * 360, fracOf(e.to) * 360, R0, R1);
      el('path', { d, fill: e.color, class: 'era-seg' }, gBase);
      if (gFull) el('path', { d, fill: e.color, class: 'era-seg' }, gFull);
    }
    for (let h = 0; h < 24; h++) {
      const major = h % 3 === 0;
      const [x0, y0] = pt(R0 - 4, h * 15), [x1, y1] = pt(R0 - (major ? 14 : 9), h * 15);
      el('line', { x1: x0, y1: y0, x2: x1, y2: y1, class: major ? 'tick major' : 'tick' }, svg);
      if (major) { const [tx, ty] = pt(R0 - 27, h * 15); el('text', { x: tx, y: ty, class: 'hour-label' }, svg).textContent = h === 0 ? '0/24' : h; }
    }
    const hand = el('g', { class: 'hand' }, svg);
    el('line', { x1: C, y1: C - R0 + 6, x2: C, y2: C - R1 - 10 }, hand);
    el('circle', { cx: C, cy: C - R1 - 10, r: 7 }, hand);
    return {
      set(deg) {
        hand.setAttribute('transform', `rotate(${deg} ${C} ${C})`);
        if (revealPath) revealPath.setAttribute('d', pie(deg));
      },
    };
  }
  function setClock(elm, text) {
    elm.textContent = text;
    elm.classList.toggle('long', text.length > 10);
  }

  /* ============================================================
     画面の切り替え
     ============================================================ */
  const SCREENS = { home: 'screen-home', now: 'screen-now', birth: 'screen-birth', play: 'screen-play', result: 'screen-result' };
  let evoScreen = 'birth';
  function show(name) {
    for (const k in SCREENS) $(SCREENS[k]).hidden = k !== name;
    if (name !== 'birth') $('b-cert-modal').hidden = true;
    const tab = ['birth', 'play', 'result'].includes(name) ? 'evo' : name;
    if (tab === 'evo') evoScreen = name;
    document.querySelectorAll('.tab').forEach((t) => t.setAttribute('aria-selected', String(t.dataset.tab === tab)));
    if (name === 'home') homeInit();
    if (name === 'now' && updateZoomLock()) zoomShow();
    window.scrollTo(0, 0);
  }
  // 「生まれる」タブ：プレイ中ならその続きへ、それ以外はガチャの画面へ
  document.querySelectorAll('.tab').forEach((t) => t.addEventListener('click', () => show(t.dataset.tab === 'evo' ? (evoScreen === 'play' && P.on ? 'play' : 'birth') : t.dataset.tab)));

  /* ============================================================
     いまの地球（現地時間と同期）
     ============================================================ */
  const hDial = buildDial($('h-dial'), { reveal: true });
  const GL = { ctx: null, last: 0 };
  { const c = $('h-globe'); c.width = c.height = E.globe.N; GL.ctx = c.getContext('2d'); }
  const FX_BY_EVENT = { '大酸化イベント': 'oxygen', '全球凍結（スターティアン氷期）': 'ice', '2度目の全球凍結（マリノア氷期）': 'ice', 'ペルム紀末の大量絶滅': 'eruption', '恐竜の絶滅': 'impact' };
  const home = { next: 0, lastSec: -1, logN: 0, last: null, ya: S, fx: null, fxUntil: 0, secShown: -1, cap: '' };
  sceneView($('h-scene'), (now) => ({ ya: home.ya, fx: now < home.fxUntil ? home.fx : null }));

  function homeLog(e) {
    const li = document.createElement('li');
    const tt = document.createElement('span'); tt.className = 'tt'; tt.textContent = fmtClock(e.ya, clockDecFor(e.ya));
    li.append(tt, `${e.name}（${fmtAgo(e.ya)}）`);
    $('h-log').prepend(li);
    $('h-log-n').textContent = ++home.logN;
  }
  function homeEvt(e, animate) {
    home.last = e;
    $('h-evt-n').textContent = e.name;
    $('h-evt-s').textContent = e.note;
    if (animate) { const c = $('h-evt'); c.classList.remove('pop'); void c.offsetWidth; c.classList.add('pop'); }
  }
  function homeInit() {
    const ya = yaOfSec(E.clockSec());
    $('h-log').textContent = ''; home.logN = 0; home.next = 0;
    while (home.next < EVENTS.length && EVENTS[home.next].ya >= ya) homeLog(EVENTS[home.next++]);
    homeEvt(EVENTS[Math.max(0, home.next - 1)], false);
    home.secShown = -1;
  }
  function jstText(sec, dec) {
    const p = Math.pow(10, dec);
    const t = Math.floor(sec * p) / p;
    const h = Math.floor(t / 3600), m = Math.floor((t % 3600) / 60), s = t - h * 3600 - m * 60;
    const ss = dec ? s.toFixed(dec).padStart(dec + 3, '0') : String(Math.floor(s)).padStart(2, '0');
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${ss}`;
  }
  function homeTick() {
    const sec = E.clockSec();
    if (sec < home.lastSec - 1) homeInit();                 // 日付が変わった＝地球がまた生まれた
    home.lastSec = sec;
    const ya = yaOfSec(sec);
    home.ya = ya;
    const left = DAY - sec;
    const dec = left < 1 ? 3 : left < 60 ? 2 : 0;
    document.body.classList.toggle('final', left < 60);

    let fired = null;
    while (home.next < EVENTS.length && EVENTS[home.next].ya >= ya) {
      fired = EVENTS[home.next++];
      homeLog(fired);
      const since = (fired.ya - ya) / S * DAY;                // 何秒前の出来事か
      if (FX_BY_EVENT[fired.key] && since < 30) { home.fx = FX_BY_EVENT[fired.key]; home.fxUntil = performance.now() + (30 - since) * 1000; }
    }
    if (fired) homeEvt(fired, true);

    $('h-jst').textContent = jstText(sec, dec);
    $('h-ago').textContent = fmtAgo(ya);
    hDial.set(fracOf(ya) * 360);
    const nowMs = performance.now();
    if (nowMs - GL.last > 100) { GL.last = nowMs; E.globe.draw(GL.ctx, ya, REDUCE ? 0.6 : nowMs * 0.00028); }
    setClock($('h-clock'), fmtClock(ya, clockDecFor(ya)));
    $('h-era').textContent = eraOf(ya).name;
    $('h-left').textContent = T('24:00まで {t}', { t: left < 60 ? fmtSec(left) : fmtCountdown(left) });
    const cap = sceneCaption(ya, { fx: performance.now() < home.fxUntil ? home.fx : null });
    if (cap !== home.cap) { home.cap = cap; $('h-cap').textContent = cap; }

    // 1秒ごとでよい表示
    const whole = Math.floor(sec * (left < 60 ? 10 : 1));
    if (whole === home.secShown) return;
    home.secShown = whole;
    $('h-period').textContent = periodLabel(ya);
    $('h-globe-cap').textContent = T('地球のすがた：{x}', { x: E.globe.label(ya) });
    const o2 = status.oxygen(ya), day = status.dayLength(ya), sun = status.sun(ya);
    $('h-o2').textContent = o2 < 0.01 ? T('ほぼ0%') : T('約{v}%', { v: o2 < 1 ? o2.toFixed(1) : Math.round(o2) });
    $('h-o2-f').style.width = `${Math.min(100, (o2 / 35) * 100)}%`;
    $('h-day').textContent = T('約{v}時間', { v: day.toFixed(1) });
    $('h-day-f').style.width = `${(day / 24) * 100}%`;
    $('h-sun').textContent = `${Math.round(sun)}`;
    $('h-sun-f').style.width = `${sun}%`;
    if (home.last) {
      const ago2 = (home.last.ya - ya) / S * DAY;
      $('h-evt-t').textContent = `${fmtClock(home.last.ya, clockDecFor(home.last.ya))} · ${fmtAgo(home.last.ya)} · ${ago2 < 1 ? T('たった今') : T('{t}前', { t: fmtCountdown(ago2) })}`;
    }
    $('h-human').innerHTML = ya > 3e5
      ? T('ホモ・サピエンスの誕生（毎晩 <b>{c}</b>）まで、あと <b>{t}</b>', { c: fmtClock(3e5), t: fmtCountdown((ya - 3e5) / S * DAY) })
      : T('人類の時代です。24:00まで、あと <b>{t}</b>', { t: fmtSec(left) });
    // これから起きること
    const ul = $('h-next'); ul.textContent = '';
    for (let i = home.next; i < Math.min(EVENTS.length, home.next + 6); i++) {
      const e = EVENTS[i];
      const li = document.createElement('li');
      if (e.kind === 'ai') li.className = 'kind-ai';
      const tt = document.createElement('span'); tt.className = 'tt'; tt.textContent = fmtClock(e.ya, Math.min(clockDecFor(e.ya), 4));
      const nm = document.createElement('span'); nm.className = 'nm'; nm.textContent = e.name;
      const sm = document.createElement('small'); sm.textContent = fmtAgo(e.ya); nm.appendChild(sm);
      const cd = document.createElement('span'); cd.className = 'cd';
      const s = (ya - e.ya) / S * DAY;
      cd.textContent = T('あと{t}', { t: s < 60 ? fmtSec(s) : fmtCountdown(s) });
      li.append(tt, nm, cd);
      ul.appendChild(li);
    }
  }
  // 上部の「いまの地球」：どの画面にいても、裏で24時間時計が動き続ける
  let liveShown = '';
  function liveTick() {
    const sec = E.clockSec(), ya = yaOfSec(sec);
    const t = jstText(sec, 0);
    if (t === liveShown) return;
    liveShown = t;
    $('live-jst').textContent = t;
    $('live-ago').textContent = fmtAgo(ya);
    $('live-era').textContent = `${E.LANG === 'en' ? '· ' : '・'}${periodLabel(ya)}`;
    if (!G.spinning) $('b-now').textContent = T('いまの地球時計の時代（{a}）に生まれる', { a: fmtAgo(ya) });
  }
  let lastHomeTick = 0;
  function homeLoop() {
    liveTick();
    if (!$('screen-home').hidden) { homeTick(); lastHomeTick = performance.now(); }
    requestAnimationFrame(homeLoop);
  }
  // アニメーションが止まる環境（裏のタブ、プレビュー）でも時計は進める
  setInterval(() => {
    liveTick();
    if (!$('screen-home').hidden && performance.now() - lastHomeTick > 400) { homeTick(); lastHomeTick = performance.now(); }
  }, 500);
  $('live').addEventListener('click', () => show('home'));
  document.addEventListener('visibilitychange', () => { if (!document.hidden && !$('screen-home').hidden) homeInit(); });

  /* ============================================================
     今を拡大：23:57からの最後の3分間を、時間をゆるめながら再生する
     ============================================================ */
  const ZSEG = [
    { a: S * 3 / 1440, b: 3e5, f: 0.12, sub: T('人類の祖先から、ホモ・サピエンスへ') },
    { a: 3e5, b: 1.2e4, f: 0.14, sub: T('サピエンスが世界へ広がる') },
    { a: 1.2e4, b: ago(1769), f: 0.16, sub: T('農耕から、文明と国へ') },
    { a: ago(1769), b: ago(1956.6), f: 0.16, sub: T('産業革命から、AIという言葉が生まれるまで') },
    { a: ago(1956.6), b: ago(2012.8), f: 0.16, sub: T('コンピュータとAIの研究') },
    { a: ago(2012.8), b: 0, f: 0.26, sub: T('AIの台頭') },
  ];
  const ZDEC = [0, 2, 4, 6, 7, 8];
  const Z_T = 180;                                                  // ×1で約3分
  const segLabel = (i) => T('最後の{t}', { t: fmtSec(ZSEG[i].a / S * DAY) });
  // 出来事：EVENTS に、AIの歩みの詳しい説明を合わせる
  const AI_BY_YEAR = new Map(AI_STORY.map(([y, t, d]) => [y, { t, d }]));
  const ZEV = EVENTS.filter((e) => e.ya <= ZSEG[0].a && e.ya > 0).map((e) => {
    if (e.kind !== 'ai') return e;
    const st = AI_BY_YEAR.get(Math.floor(E.NOW - e.ya));
    return st ? { ...e, note: st.d } : e;
  });
  for (const [y, t, d] of AI_STORY) {
    if (y >= E.NOW_YEAR) continue;
    if (ZEV.some((e) => e.kind === 'ai' && Math.floor(E.NOW - e.ya) === y)) continue;
    ZEV.push({ ya: ago(y + 0.5), name: t, note: d, kind: 'ai' });
  }
  ZEV.sort((x, y) => y.ya - x.ya);

  const Z_INTRO = { ya: ZSEG[0].a, name: T('最後の3分間へ'), note: T('人類の祖先が現れる直前から、今日までを再生します。'), kind: '' };
  const Z = { p: 0, speed: 1, playing: false, seg: -1, next: 0, ya: ZSEG[0].a, last: 0, ended: false, cap: '' };
  sceneView($('z-scene'), () => ({ ya: Math.max(Z.ya, 0.3) }));
  function zYa(p) {
    if (p >= 1) return 0;
    let cum = 0;
    for (let i = 0; i < ZSEG.length; i++) {
      const g = ZSEG[i];
      if (p <= cum + g.f || i === ZSEG.length - 1) return g.a - (g.a - g.b) * Math.min(1, Math.max(0, (p - cum) / g.f));
      cum += g.f;
    }
    return 0;
  }
  const zSegOf = (ya) => { for (let i = 0; i < ZSEG.length; i++) if (ya > ZSEG[i].b) return i; return ZSEG.length - 1; };
  const zRate = (i) => (ZSEG[i].a - ZSEG[i].b) / (ZSEG[i].f * Z_T) * Z.speed;

  const zStrip = {
    seg: -1, dots: [], fill: null, cursor: null, label: null,
    x(ya) { const g = ZSEG[this.seg]; return 24 + 592 * (g.a - ya) / (g.a - g.b); },
    build(i) {
      this.seg = i;
      const svg = $('z-strip'); svg.textContent = '';
      const g = ZSEG[i];
      el('line', { x1: 24, y1: 40, x2: 616, y2: 40, class: 'strip-axis' }, svg);
      this.fill = el('line', { x1: 24, y1: 40, x2: 24, y2: 40, class: 'strip-fill' }, svg);
      this.dots = ZEV.filter((e) => e.ya <= g.a && e.ya >= g.b).map((e) => ({
        e, node: el('circle', { cx: this.x(e.ya), cy: 40, r: 5.5, class: `strip-dot${e.kind === 'ai' ? ' ai' : ''}` }, svg),
      }));
      this.label = el('text', { x: 24, y: 22, class: 'strip-label' }, svg);
      this.cursor = el('path', { d: 'M0,0', class: 'strip-cursor' }, svg);
      el('text', { x: 24, y: 70, class: 'strip-end' }, svg).textContent = fmtAgo(g.a);
      el('text', { x: 616, y: 70, class: 'strip-end', 'text-anchor': 'end' }, svg).textContent = g.b > 0 ? fmtAgo(g.b) : T('今');
      $('z-strip-cap').textContent = T('{s}を拡大中：{sub}', { s: mid(segLabel(i)), sub: g.sub });
    },
    update(ya) {
      const x = this.x(ya);
      this.fill.setAttribute('x2', x);
      this.cursor.setAttribute('d', `M${x},31 l-6,-9 h12 Z`);
      let last = null;
      for (const d of this.dots) { const passed = d.e.ya >= ya; d.node.classList.toggle('passed', passed); if (passed) last = d; }
      if (!last) { this.label.textContent = ''; return; }
      const lx = this.x(last.e.ya), anchor = lx > 470 ? 'end' : lx < 170 ? 'start' : 'middle';
      this.label.setAttribute('x', anchor === 'end' ? Math.min(lx + 6, 616) : anchor === 'start' ? Math.max(lx - 6, 24) : lx);
      this.label.setAttribute('text-anchor', anchor);
      this.label.textContent = last.e.name;
    },
  };

  function zEvent(e, animate) {
    const c = $('z-evt');
    c.classList.toggle('ai', e.kind === 'ai');
    $('z-evt-t').textContent = `${fmtClock(e.ya, ZDEC[zSegOf(e.ya)])}${SEP}${fmtAgo(e.ya)}`;
    $('z-evt-n').textContent = e.name;
    $('z-evt-s').textContent = e.note || '';
    if (animate) { c.classList.remove('pop'); void c.offsetWidth; c.classList.add('pop'); }
  }
  function zReset() {
    Object.assign(Z, { p: 0, seg: -1, next: 0, ya: ZSEG[0].a, last: 0, ended: false, playing: true });
    $('z-end').hidden = true;
    $('z-play').textContent = T('⏸ 一時停止');
    zEvent(Z_INTRO, false);
    zRender();
    $('z-seek').value = 0;
  }
  function zRender() {
    const ya = Z.ya, i = zSegOf(ya);
    if (!Z.dragging) $('z-seek').value = Math.round(Z.p * 1000);
    if (i !== Z.seg) {
      [...$('z-seek-labels').children].forEach((sp, k) => sp.classList.toggle('on', k === i));
      Z.seg = i;
      zStrip.build(i);
      $('z-chip').textContent = segLabel(i);
    }
    const clock = fmtClock(ya, ZDEC[i]);
    $('z-clock').textContent = T('地球時計 {c}', { c: clock });
    $('z-ago').textContent = fmtAgo(ya);
    $('z-rate').textContent = T('1秒 = {y}年', { y: fmtYears(Math.max(zRate(i), 0.1)) });
    $('z-remain').innerHTML = ya > 0 ? T('24:00まで、地球時計で あと <b>{t}</b>', { t: fmtSec(ya / S * DAY) }) : `<b>${T('24:00 — 今')}</b>`;
    const cap = sceneCaption(Math.max(ya, 0.3));
    if (cap !== Z.cap) { Z.cap = cap; $('z-cap').textContent = cap; }
    zStrip.update(ya);
    let fired = null;
    while (Z.next < ZEV.length && ZEV[Z.next].ya >= ya) fired = ZEV[Z.next++];
    if (fired) zEvent(fired, true);
  }
  function zLoop(ts) {
    requestAnimationFrame(zLoop);
    if ($('screen-now').hidden || $('z-body').hidden || !Z.playing || Z.ended || Z.dragging) { Z.last = 0; return; }
    if (!Z.last) Z.last = ts;
    const dt = Math.min((ts - Z.last) / 1000, 0.25);
    Z.last = ts;
    Z.p = Math.min(1, Z.p + dt * Z.speed / Z_T);
    Z.ya = zYa(Z.p);
    zRender();
    if (Z.p >= 1) zFinish();
  }
  function zFinish() {
    Z.ended = true; Z.playing = false;
    $('z-play').textContent = T('▶ 再生');
    $('z-end-t').textContent = T('46億年を24時間にすると、人類の歴史は最後の5.6秒。「人工知能」という言葉が生まれてからは、最後の約{a}。ChatGPTの公開からは、約{b}です。', { a: fmtSec(ago(1956.6) / S * DAY), b: fmtSec(ago(2022.91) / S * DAY) });
    $('z-end').hidden = false;
  }
  $('z-play').addEventListener('click', () => {
    if (Z.ended) { zReset(); return; }
    Z.playing = !Z.playing;
    $('z-play').textContent = Z.playing ? T('⏸ 一時停止') : T('▶ 再生');
  });
  document.querySelectorAll('[data-zspeed]').forEach((b) => b.addEventListener('click', () => {
    Z.speed = Number(b.dataset.zspeed);
    document.querySelectorAll('[data-zspeed]').forEach((x) => x.classList.toggle('on', x === b));
    if (Z.seg >= 0) $('z-rate').textContent = T('1秒 = {y}年', { y: fmtYears(Math.max(zRate(Z.seg), 0.1)) });
  }));
  $('z-restart').addEventListener('click', zReset);

  // ゲージをドラッグして、進めたり戻したりする
  
  {
    const box = $('z-seek-labels');
    box.style.gridTemplateColumns = ZSEG.map((g) => `${g.f}fr`).join(' ');
    ZSEG.forEach((g, i) => { const sp = document.createElement('span'); sp.textContent = i === ZSEG.length - 1 ? T('AIの台頭') : fmtSec(ZSEG[i].a / S * DAY); box.appendChild(sp); });
  }
  const zCum = (i) => ZSEG.slice(0, i).reduce((a, g) => a + g.f, 0);
  function zSeek(p) {
    Z.p = Math.max(0, Math.min(1, p));
    Z.ya = zYa(Z.p);
    Z.next = ZEV.findIndex((e) => e.ya < Z.ya);
    if (Z.next < 0) Z.next = ZEV.length;
    zRender();
    zEvent(ZEV[Z.next - 1] || Z_INTRO, false);
    if (Z.p >= 1) { if (!Z.ended) zFinish(); }
    else if (Z.ended) { Z.ended = false; $('z-end').hidden = true; }
  }
  const seek = $('z-seek');
  seek.addEventListener('input', () => { Z.dragging = true; zSeek(seek.value / 1000); });
  seek.addEventListener('change', () => { Z.dragging = false; });
  seek.addEventListener('pointerup', () => { Z.dragging = false; });
  // 拡大中の区間の帯も、つかんで動かせる
  const strip = $('z-strip');
  function stripTo(ev) {
    const r = strip.getBoundingClientRect();
    const frac = Math.max(0, Math.min(1, ((ev.clientX - r.left) / r.width * 640 - 24) / 592));
    const i = zStrip.seg;
    zSeek(zCum(i) + ZSEG[i].f * Math.min(frac, 0.9999));
  }
  strip.addEventListener('pointerdown', (ev) => { Z.dragging = true; strip.setPointerCapture(ev.pointerId); stripTo(ev); });
  strip.addEventListener('pointermove', (ev) => { if (Z.dragging && strip.hasPointerCapture(ev.pointerId)) stripTo(ev); });
  const stripEnd = () => { Z.dragging = false; };
  strip.addEventListener('pointerup', stripEnd);
  strip.addEventListener('pointercancel', stripEnd);
  $('z-again').addEventListener('click', zReset);

  // 今を拡大は、一度「生まれる」を最後まで遊ぶと見られる
  const ZOOM_KEY = 'earth24.zoom';
  function zoomUnlocked() {
    try { if (localStorage.getItem(ZOOM_KEY)) return true; } catch (e) { /* 保存できない環境 */ }
    return histLoad().some((d) => !d.u);
  }
  function updateZoomLock() {
    const ok = zoomUnlocked();
    $('tab-lock').toggleAttribute('hidden', ok); $('z-lock').hidden = ok; $('z-body').hidden = !ok;
    return ok;
  }
  function unlockZoom() {
    try { localStorage.setItem(ZOOM_KEY, '1'); } catch (e) { /* 履歴があれば解放のまま */ }
    updateZoomLock();
  }
  $('z-go').addEventListener('click', () => show('birth'));

  let aiBuilt = false;
  function zoomShow() {
    if (!Z.playing && !Z.ended && Z.p === 0) zReset();
    if (aiBuilt) return;
    aiBuilt = true;
    const aiSec = ago(1956.6) / S * DAY, gptSec = ago(2022.91) / S * DAY;
    $('n-ai-head').innerHTML =
      `<div class="ai-stat">${T('「人工知能」という言葉が生まれてから今日まで：地球時計で <b>約{a}</b>。まばたき1回（約0.1秒）の、さらに約{n}分の1。', { a: fmtSec(aiSec), n: Math.round(0.1 / aiSec) })}</div>` +
      `<div class="ai-stat">${T('ChatGPTの公開から今日まで：<b>約{a}</b>。', { a: fmtSec(gptSec) })}</div>`;
    const list = $('n-ai-list');
    AI_STORY.forEach(([year, ttl, dsc], i) => {
      const li = document.createElement('li');
      const last = i === AI_STORY.length - 1;
      if (last) li.className = 'now';
      li.innerHTML = '<div class="yr num"></div><div class="ttl"></div><div class="dsc"></div><div class="clk"></div>';
      li.children[0].textContent = last ? T('{y}年（今）', { y: year }) : T('{y}年', { y: year });
      li.children[1].textContent = ttl;
      li.children[2].textContent = dsc;
      li.children[3].textContent = last ? T('24:00 — 今') : T('24:00の約{t}前', { t: fmtSec(ago(year + 0.5) / S * DAY) });
      list.appendChild(li);
    });
  }
  requestAnimationFrame(zLoop);

  /* ============================================================
     生き物の姿：体のつくり＋変種＋特徴（大きさ・守り・羽毛）
     ============================================================ */
  function variantOf(plan, f, hab, armor) {
    if (plan === 'microbe') return hab === 'deep' ? 'archaea' : f.predator ? 'hunter' : f.o2 ? 'oxy' : 'rod';
    if (plan === 'cyano') return 'cyano';
    if (plan === 'cell') return f.sex ? 'para' : 'euk';
    if (plan === 'colony') return f.photo ? 'alga' : 'volvox';
    if (plan === 'arthropod') return hab === 'land' ? 'millipede' : f.burrow ? 'horseshoe' : 'trilo';
    if (plan === 'reptile' && armor >= 70) return 'turtle';
    if ((plan === 'dino_small' || plan === 'theropod') && f.feather) return 'feather';
    return '';
  }
  const lookOfL = (L) => ({ plan: L.plan, v: variantOf(L.plan, L.flags, L.habitat, L.traits.armor), size: Math.round(L.traits.size), armor: Math.round(L.traits.armor), feather: !!L.flags.feather });
  const formKey = (k) => `${k.plan}:${k.v}`;
  // 姿が変わったのに名前が変わらなかったときの、新しい姿の名前（保存用の日本語）
  const VARIANT_NAMES = {
    rod: '浅い海の微生物', archaea: '熱水の古細菌', oxy: '酸素を使う細菌', hunter: '微生物を食べる微生物', cyano: 'シアノバクテリア',
    euk: '核を持つ細胞', para: 'ゾウリムシの仲間', volvox: 'ボルボックスの仲間', alga: '藻類の祖先',
    trilo: '三葉虫の仲間', horseshoe: 'カブトガニの仲間', millipede: '陸の節足動物', turtle: 'カメの仲間', feather: '羽毛恐竜',
  };
  // 記録（g: [[体のつくり, 変種, 名前], ...]）から姿へ
  const lookOfG = (g) => ({ plan: g[0], v: g[1] });
  function renderChain(box, g) {
    box.textContent = '';
    (g || []).forEach((f, i) => {
      if (i) { const a = document.createElement('span'); a.className = 'arrow'; a.textContent = '→'; box.appendChild(a); }
      const w = document.createElement('div'); w.className = 'form';
      const cv = document.createElement('canvas'); cv.width = CARD_W; cv.height = CARD_H;
      drawCreatureCard(cv.getContext('2d'), lookOfG(f), 3);
      const n = document.createElement('span'); n.className = 'fn'; n.textContent = tr(f[2]);
      w.append(cv, n); box.appendChild(w);
    });
    box.hidden = !(g && g.length);
  }

  /* ============================================================
     進化ガチャ：誕生
     ============================================================ */
  const bDial = buildDial($('b-dial'), { reveal: false });
  bDial.set(0);
  const G = { angle: 0, spinning: false, birth: null };

  const DUP = ['', '', '②', '③', '④', '⑤'];
  const nameOf = (L) => tr(L.name) + (L.dup ? ` ${DUP[L.dup] || ''}` : '');
  const SEP = E.LANG === 'en' ? ' · ' : '・';
  const mid = (s) => (E.LANG === 'en' ? s.replace(/^The /, 'the ') : s);      // 文の途中に入れるとき
  const causeNote = (c) => (c && !c.includes('背景') ? T('（{c}）', { c: tr(c) }) : '');
  function dedupeNames(list) {
    const seen = {};
    list.forEach((L) => { seen[L.name] = (seen[L.name] || 0) + 1; if (seen[L.name] > 1) L.dup = seen[L.name]; });
  }
  // 種の数は、その仲間の実際の種数の目安に合わせて見せる（evo.realCount）
  function fmtCount(n) {
    if (E.LANG === 'en') return n.toLocaleString('en-US');
    if (n >= 10000) return `${E.trim((n / 10000).toFixed(n >= 100000 ? 0 : 1))}万`;
    return n.toLocaleString('ja-JP');
  }
  const spc = (L, n) => fmtCount(evo.realCount(L, n));
  function traitBars(box, L) {
    if (!box.children.length) {
      for (const k of evo.TRAITS) {
        const row = document.createElement('div'); row.className = 'trait';
        row.innerHTML = `<span></span><div class="track"><div class="fill"></div></div><b class="num"></b><em class="dl"></em>`;
        row.children[0].textContent = (box.classList.contains('compact') ? evo.TRAIT_SHORT : evo.TRAIT_LABEL)[k];
        box.appendChild(row);
      }
    }
    evo.TRAITS.forEach((k, i) => {
      const row = box.children[i];
      const v = Math.round(L.traits[k]), prev = row.dataset.v;
      row.querySelector('.fill').style.width = `${L.traits[k]}%`;
      row.querySelector('b').textContent = v;
      if (prev !== undefined && Number(prev) !== v) {
        const dl = row.querySelector('.dl'), up = v > prev;
        dl.textContent = `${up ? '▲' : '▼'}${Math.abs(v - prev)}`;
        dl.className = `dl ${up ? 'up' : 'down'}`; void dl.offsetWidth; dl.classList.add('show');
      }
      row.dataset.v = v;
    });
  }

  $('b-spin').addEventListener('click', () => spinTo(Math.random() * S));
  // 誕生の記録はポップアップ。閉じても「誕生の記録を見る」で開き直せる
  const openCert = (v) => { $('b-cert-modal').hidden = !v; if (v) { $('b-cert').scrollTop = 0; $('b-start').focus({ preventScroll: true }); } };
  $('b-close').addEventListener('click', () => openCert(false));
  $('b-reopen').addEventListener('click', () => openCert(true));
  $('b-cert-modal').addEventListener('click', (ev) => { if (ev.target === ev.currentTarget) openCert(false); });
  document.addEventListener('keydown', (ev) => { if (ev.key === 'Escape' && !$('b-cert-modal').hidden) openCert(false); });
  $('b-again').addEventListener('click', () => { openCert(false); spinTo(Math.random() * S); });
  $('b-now').addEventListener('click', () => spinTo(yaOfSec(E.clockSec())));
  function spinTo(t) {
    if (G.spinning) return;
    G.spinning = true;
    $('b-spin').disabled = true;
    $('b-now').disabled = true;
    $('b-none').hidden = true;
    $('b-cert-wrap').hidden = true;
    openCert(false);
    G.birth = null;
    const target = fracOf(t) * 360;
    const start = G.angle % 360;
    const end = start + 360 * 3 + ((target - start + 360) % 360);
    const dur = REDUCE ? 300 : 2400, t0 = performance.now();
    const stepAnim = (now) => {
      const k = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - k, 3);
      const deg = start + (end - start) * e;
      bDial.set(deg);
      const ya = Math.max(1, (1 - (deg % 360) / 360) * S);
      setClock($('b-clock'), fmtClock(ya));
      $('b-ago').textContent = fmtAgo(ya);
      $('b-era').textContent = eraOf(ya).name;
      if (k < 1) { requestAnimationFrame(stepAnim); return; }
      G.angle = target; bDial.set(target);
      G.spinning = false;
      $('b-spin').disabled = false;
      $('b-now').disabled = false;
      $('b-spin').textContent = T('もう一度生まれる');
      onBorn(t);
    };
    requestAnimationFrame(stepAnim);
  }

  function onBorn(t) {
    setClock($('b-clock'), fmtClock(t));
    $('b-ago').textContent = fmtAgo(t);
    $('b-era').textContent = eraOf(t).name;
    const options = evo.birthOptions(t);
    if (!options.length) {
      $('b-none').hidden = false;
      const unborn = { v: 1, u: 1, b: Math.round(t), e: Math.round(t), a: 0, f: '', n: '', p: 'microbe', h: '', k: [], c: '' };
      const isNewU = !foundEndings().has('u-unborn');
      histAdd(unborn);
      $('b-none-rec').textContent = isNewU ? T('はじめての結末！「{t}」として図鑑に残りました。', { t: evo.endingOf(unborn).title }) : T('「あなたが生きた系統」に記録しました。');
      $('b-none-t').textContent = T('{a}（地球時計 {c}）。地球はまだ熱く、生命が生まれる前でした。この時代を引く確率は{p}。生命が生まれるのは、地球時計の4:10ごろです。', { a: fmtAgo(t), c: fmtClock(t), p: fmtProb((S - 3.8e9) / S) });
      return;
    }
    const pick = () => options[Math.floor(Math.random() * options.length)];
    const player = evo.makeLineage(pick(), t, true);
    const rivals = [0, 1, 2, 3].map(() => evo.makeLineage(pick(), t, false));
    dedupeNames([player, ...rivals]);
    player.firstName = player.name;
    rivals.forEach((r) => (r.firstName = r.name));
    G.birth = { t, player, rivals };
    const era = eraOf(t);
    $('b-no').textContent = `No. ${String(Math.floor(Math.random() * 1e6)).padStart(6, '0')}`;
    $('b-who').textContent = T('あなたは、{n}として生まれました', { n: nameOf(player) });
    $('b-about').textContent = evo.ABOUT[player.name] || '';
    $('b-about').hidden = !evo.ABOUT[player.name];
    $('b-line2').textContent = `${fmtAgo(t)} · ${T('地球時計 {c}', { c: fmtClock(t) })} · ${periodLabel(t)}`;
    $('b-plan').textContent = evo.PLANS[player.plan].name;
    $('b-hab').textContent = evo.HAB_LABEL[player.habitat] || '';
    $('b-prob').textContent = fmtProb((era.from - era.to) / S);
    $('b-left').textContent = T('{y}（地球時計で{t}）', { y: fmtSpan(t), t: fmtSec(t / S * DAY) });
    drawCreatureCard($('b-pic').getContext('2d'), lookOfL(player), 3);
    const ul = $('b-rivals'); ul.textContent = '';
    rivals.forEach((r) => {
      const li = document.createElement('li');
      li.innerHTML = '<span></span><span class="st muted"></span>';
      li.children[0].textContent = nameOf(r);
      li.children[1].textContent = evo.PLANS[r.plan].name;
      ul.appendChild(li);
    });
    $('b-cert-wrap').hidden = false;
    openCert(true);
  }

  /* ============================================================
     進化ガチャ：プレイ
     ============================================================ */
  const P = { on: false };
  sceneView($('p-scene'), (now) => (P.on || P.L ? { ya: P.ya, plan: P.L.alive ? P.L.plan : null, habitat: P.L.habitat, look: lookOfL(P.L), fx: now < P.fxUntil ? P.fx : null } : null));
  const pDial = buildDial($('p-dial'), { reveal: true });

  const yaAtP = (p) => P.ya0 * Math.pow(1 - Math.min(1, Math.max(0, p)), 2);   // 今に近いほどゆっくり
  const pAtYa = (ya) => 1 - Math.sqrt(Math.max(0, ya) / P.ya0);

  $('b-start').addEventListener('click', () => {
    if (!G.birth) return;
    const PLAY_SEC = 600;                                          // ×1でおよそ10分（分かれ道で止まる時間は含まない）
    const { t, player, rivals } = G.birth;
    Object.assign(P, {
      on: true, L: player, rivals, ya0: t, ya: t, T: PLAY_SEC, elapsed: 0, speed: 1, paused: false, skipping: false,
      pending: null, last: 0, fx: null, fxUntil: 0, rnd: evo.rng(Math.floor(Math.random() * 2 ** 31)),
      done: new Set(), log: [], startedAt: t, lifeT: 0, lifeNext: 4, lifeRecent: [],
    });
    $('p-log').textContent = '';
    player.forms = [{ ya: t, look: lookOfL(player), name: player.name }];
    document.querySelectorAll('#p-controls [data-speed]').forEach((b) => b.classList.toggle('on', b.dataset.speed === '1'));
    $('p-pause').textContent = T('⏸ 一時停止');
    $('p-traits').textContent = '';
    plog(t, T('「{n}」として生まれた。', { n: nameOf(player) }), 'birth');
    show('play');
    checkNode();
    renderPlay(true);
    requestAnimationFrame(playLoop);
  });

  // 系統のタイムライン。kind: birth / choice / evo / event / dead / rival
  function logItem(e) {
    const li = document.createElement('li'); li.className = `k-${e.kind}`;
    const tt = document.createElement('span'); tt.className = 'tt'; tt.textContent = `${fmtClock(e.ya, clockDecFor(e.ya))}${SEP}${fmtAgo(e.ya)}`;
    const tx = document.createElement('span'); tx.textContent = e.text; if (e.kind === 'dead') tx.className = 'dead';
    li.append(tt, tx);
    if (e.d) {
      const chips = document.createElement('div'); chips.className = 'chips';
      for (const k of evo.TRAITS) if (e.d[k]) { const c = document.createElement('i'); c.className = e.d[k] > 0 ? 'up' : 'down'; c.textContent = `${evo.TRAIT_LABEL[k]} ${e.d[k] > 0 ? '▲' : '▼'}${Math.abs(e.d[k])}`; chips.appendChild(c); }
      if (chips.children.length) li.appendChild(chips);
    }
    return li;
  }
  const traitDelta = (before, L) => {
    const d = {};
    for (const k of evo.TRAITS) { const x = Math.round(L.traits[k]) - Math.round(before[k]); if (x) d[k] = x; }
    return Object.keys(d).length ? d : null;
  };
  function plog(ya, text, kind = 'info', d = null) {
    const e = { ya, text, kind, d };
    P.log.push(e);
    $('p-log').prepend(logItem(e));
    P.mapDirty = true;
  }
  // 横長の地図：生まれてから今日まで。時代の色の帯と、出来事の印
  function drawLineMap(svg, log, ya0, cur) {
    svg.textContent = '';
    const x = (ya) => 12 + 616 * (1 - Math.max(0, ya) / ya0);          // 年数どおり
    for (const e of ERAS) {
      const a = Math.min(e.from, ya0), b = Math.max(e.to, 0);
      if (a <= b) continue;
      el('rect', { x: x(a), y: 18, width: Math.max(1, x(b) - x(a)), height: 14, fill: e.color, opacity: 0.55 }, svg);
    }
    for (const e of log) if (e.kind === 'life') el('circle', { cx: x(e.ya), cy: 25, r: 3.5, class: 'lm-life' }, svg);
    for (const e of log) {
      const cx = x(e.ya);
      if (e.kind === 'choice') el('circle', { cx, cy: 25, r: 7, class: 'lm-choice' }, svg);
      else if (e.kind === 'evo') el('rect', { x: cx - 7, y: 18, width: 14, height: 14, transform: `rotate(45 ${cx} 25)`, class: 'lm-evo' }, svg);
      else if (e.kind === 'event') el('path', { d: `M${cx},13 l9,15 h-18 Z`, class: 'lm-event' }, svg);
      else if (e.kind === 'dead') { el('line', { x1: cx - 8, y1: 17, x2: cx + 8, y2: 33, class: 'lm-dead' }, svg); el('line', { x1: cx + 8, y1: 17, x2: cx - 8, y2: 33, class: 'lm-dead' }, svg); }
      else if (e.kind === 'birth') el('circle', { cx, cy: 25, r: 7, class: 'lm-birth' }, svg);
    }
    if (cur != null) el('line', { x1: x(cur), y1: 10, x2: x(cur), y2: 40, class: 'lm-cursor' }, svg);
    el('text', { x: 12, y: 60, class: 'lm-label' }, svg).textContent = fmtAgo(ya0);
    el('text', { x: 628, y: 60, class: 'lm-label', 'text-anchor': 'end' }, svg).textContent = T('今');
  }

  function checkNode() {
    if (!P.L.alive || P.pending) return false;
    for (const R of P.rivals) { if (!R.alive) continue; const n = evo.nodeFor(R, P.ya); if (n) evo.autoChoose(R, n, P.rnd); }
    const node = evo.nodeFor(P.L, P.ya);
    if (!node) return false;
    P.pending = { type: 'choice', node };
    P.skipping = false;
    $('p-q').textContent = node.q;
    $('p-ctx').textContent = node.ctx;
    const box = $('p-opts'); box.textContent = '';
    node.opts.forEach((o) => {
      const b = document.createElement('button'); b.className = 'opt';
      b.innerHTML = '<b></b><span></span><div class="chips"></div>';
      b.children[0].textContent = tr(o.label); b.children[1].textContent = o.desc;
      const fx = previewOption(P.L, o), chips = b.children[2];
      const chip = (text, cls) => { const c = document.createElement('i'); c.className = cls; c.textContent = text; chips.appendChild(c); };
      if (fx.plan) chip(T('→ {p}', { p: evo.PLANS[fx.plan].name }), 'form');
      if (fx.hab) chip(T('暮らす場所 → {h}', { h: evo.HAB_LABEL[fx.hab] }), 'hab');
      for (const k of evo.TRAITS) if (fx.d[k]) chip(`${evo.TRAIT_LABEL[k]} ${fx.d[k] > 0 ? '▲' : '▼'}${Math.abs(fx.d[k])}`, fx.d[k] > 0 ? 'up' : 'down');
      if (fx.n) chip(T('種の数 ×{x}', { x: trimNum(fx.n) }), 'up');
      if (!chips.children.length) chips.remove();
      b.addEventListener('click', () => choose(node, o));
      box.appendChild(b);
    });
    $('p-choice').hidden = false;
    $('ch-box').scrollTop = 0;
    box.firstChild.focus({ preventScroll: true });
    return true;
  }
  // 選んだらどう変わるかを、写しで試して調べる
  function previewOption(L, o) {
    const c = { ...L, traits: { ...L.traits }, flags: { ...L.flags }, taken: new Set(L.taken), path: [...L.path] };
    o.apply(c);
    const d = {};
    for (const k of evo.TRAITS) { const x = Math.round(c.traits[k] - L.traits[k]); if (x) d[k] = x; }
    return { d, plan: c.plan !== L.plan ? c.plan : null, hab: c.habitat !== L.habitat ? c.habitat : null, n: c.N > L.N + 0.5 ? c.N / L.N : null };
  }
  const trimNum = (x) => E.trim(x.toFixed(1));
  function choose(node, o) {
    const L = P.L;
    const before = lookOfL(L), beforeName = nameOf(L), beforeTraits = { ...L.traits };
    o.apply(L);
    L.taken.add(node.id);
    L.path.push({ ya: P.ya, label: o.label });
    plog(P.ya, T('分かれ道：{l}', { l: tr(o.label) }) + (o.real ? ` ${o.real}` : ''), 'choice', traitDelta(beforeTraits, L));
    $('p-choice').hidden = true;
    P.pending = null;
    const after = lookOfL(L);
    if (formKey(before) !== formKey(after)) {
      if (tr(L.name) === beforeName.replace(/ [②-⑤]$/, '')) L.name = VARIANT_NAMES[after.v] || evo.PLANS[after.plan].ja;
      L.forms.push({ ya: P.ya, look: after, name: L.name });
      plog(P.ya, T('{a}は、{b}に進化した！', { a: beforeName, b: nameOf(L) }), 'evo');
      playEvolution(before, after, beforeName, nameOf(L), () => { renderPlay(true); checkNode(); });
      return;
    }
    renderPlay(true);
    checkNode();                                                   // 同じ時代に続けて訪れる分かれ道
  }

  function handleExtinction(ev) {
    P.done.add(ev);
    P.fx = ev.fx || null; P.fxUntil = performance.now() + 4500;
    const me = evo.applyExtinction(P.L, ev, P.rnd);
    const others = P.rivals.map((R) => ({ R, res: evo.applyExtinction(R, ev, P.rnd) }));
    if (!me) return;
    const dead = !P.L.alive;
    plog(ev.ya, T('{e}：{b}種 → {a}種', { e: tr(ev.name), b: spc(P.L, me.before), a: spc(P.L, me.after) }) + (dead ? T('。系統が絶滅した') : ''), dead ? 'dead' : me.p >= 0.05 ? 'event' : 'info');
    others.forEach(({ R, res }) => { if (res && !R.alive) plog(ev.ya, T('{n}の系統が、{e}で絶滅した', { n: nameOf(R), e: mid(tr(ev.name)) }), 'rival'); });
    if (me.p < 0.05 && !dead) return;                              // ほとんど影響のない出来事は記録だけ
    P.pending = { type: 'event', ev };
    P.skipping = false;
    $('p-ev-t').textContent = tr(ev.name);
    $('p-ev-f').textContent = ev.fact;
    const you = $('p-ev-you');
    you.className = `you ${dead ? 'dead' : 'live'}`;
    you.textContent = dead
      ? T('あなたの系統：{b}種 → 0種。ここで絶滅しました。', { b: spc(P.L, me.before) })
      : T('あなたの系統：{b}種 → {a}種。なんとか生き延びた。', { b: spc(P.L, me.before), a: spc(P.L, me.after) });
    const real = $('p-ev-real');
    real.hidden = me.p < 1;
    real.textContent = P.L.flags.admix && ev.ya === 4e4
      ? T('系統は途絶えました。でも、あなたたちの遺伝子の一部は、ホモ・サピエンスの中で今も生きています。')
      : T('実際の歴史でも、この仲間はここですべて姿を消しました。');
    const ul = $('p-ev-rivals'); ul.textContent = '';
    others.forEach(({ R, res }) => {
      const li = document.createElement('li');
      li.innerHTML = '<span></span><span class="st"></span>';
      li.children[0].textContent = nameOf(R);
      const st = li.children[1];
      if (!res) { st.textContent = T('すでに絶滅'); st.className = 'st muted'; }
      else { st.textContent = T('{b} → {a}種', { b: spc(R, res.before), a: spc(R, res.after) }); st.className = `st ${R.alive ? 'live' : 'dead'}`; }
      ul.appendChild(li);
    });
    $('ev-modal').hidden = false;
    const box = $('ev-box'); box.scrollTop = 0;
    box.classList.remove('hit'); void box.offsetWidth; box.classList.add('hit');
    $('p-ev-ok').focus({ preventScroll: true });
  }
  sceneView($('ch-scene'), () => ($('p-choice').hidden || !P.L ? null : { ya: P.ya, plan: P.L.plan, habitat: P.L.habitat, look: lookOfL(P.L) }));
  sceneView($('ev-scene'), () => ($('ev-modal').hidden || !P.L ? null : { ya: P.ya, plan: P.L.alive ? P.L.plan : null, habitat: P.L.habitat, look: lookOfL(P.L), fx: P.fx }));
  $('p-ev-ok').addEventListener('click', () => {
    $('ev-modal').hidden = true;
    P.pending = null;
    if (!P.L.alive) { endPlay(); return; }
    checkNode();
  });

  // 進化の演出：今の姿と次の姿が白く光って入れ替わり、新しい姿が現れる（タップで飛ばせる）
  function playEvolution(fromLook, toLook, fromName, toName, done) {
    P.pending = { type: 'evo' };
    const m = $('evo-modal'), cv = $('evo-cv'), ctx = cv.getContext('2d');
    m.classList.remove('done');
    m.hidden = false;
    $('evo-msg').textContent = T('{n}の体が、変わりはじめた…！', { n: fromName });
    $('evo-sub').textContent = '';
    $('evo-ok').hidden = true;
    const t0 = performance.now(), DUR = REDUCE ? 500 : 4200;
    let finished = false, last = 0;
    function finish() {
      if (finished) return;
      finished = true;
      drawCreatureCard(ctx, toLook, 3);
      m.classList.add('done');
      $('evo-msg').textContent = T('{a}は、{b}に進化した！', { a: fromName, b: toName });
      $('evo-sub').textContent = evo.PLANS[toLook.plan].name;
      $('evo-ok').hidden = false;
      $('evo-ok').focus();
    }
    function frame(now) {
      if (finished) return;
      const k = (now - t0) / DUR;
      if (k >= 1) { finish(); return; }
      if (now - last > 40) {
        last = now;
        if (k < 0.15) drawCreatureCard(ctx, fromLook, Math.floor(now / 125));
        else if (k < 0.9) { const q = (k - 0.15) / 0.75; drawCreatureCard(ctx, Math.sin(q * q * 70) > 0 ? toLook : fromLook, 0, '#ffffff'); }
        else { ctx.fillStyle = "#ffffff"; ctx.fillRect(0, 0, CARD_W, CARD_H); }
      }
      requestAnimationFrame(frame);
    }
    // 画面が止まっていても最後まで進むように
    const guard = setTimeout(finish, DUR + 200);
    cv.onclick = finish;
    $('evo-ok').onclick = () => { clearTimeout(guard); m.hidden = true; P.pending = null; if (done) done(); };
    requestAnimationFrame(frame);
  }

  // ya を target まで進める（大量絶滅と分かれ道で止まる）
  function advance(target) {
    const all = [P.L, ...P.rivals];
    let guard = 0;
    while (P.ya > target && !P.pending && P.L.alive && guard++ < 400) {
      const ya = P.ya;
      const ev = evo.EXTINCTIONS.find((e) => !P.done.has(e) && e.ya < ya && e.ya >= target);
      let b = Math.max(target, ya - Math.max(ya * 0.02, 0.5));
      if (ev) b = Math.max(b, ev.ya);
      for (const n of evo.NODES) if (n.from < ya && n.from > b) b = n.from;
      // 種の数を進める（1回あたり最大100万年）
      const span = ya - b, k = Math.max(1, Math.ceil(span / 1e6)), dt = span / k;
      const grace = P.L.path.length === 0 && P.elapsed < 30;
      for (let i = 0; i < k; i++) {
        const yy = ya - dt * (i + 0.5);
        for (const L of all) {
          const was = L.alive;
          evo.step(L, yy, dt, P.rnd, L.isPlayer && grace);
          if (was && !L.alive) plog(L.deathYa, L.isPlayer ? T('あなたの系統が、数を減らし続けて絶滅した') : T('{n}の系統が、数を減らし続けて絶滅した', { n: nameOf(L) }), L.isPlayer ? 'dead' : 'rival');
        }
        if (!P.L.alive) break;
      }
      P.ya = P.L.alive ? b : P.L.deathYa;
      if (!P.L.alive) break;
      if (ev && b === ev.ya) handleExtinction(ev);
      if (!P.pending) checkNode();
    }
    P.elapsed = pAtYa(P.ya) * P.T;
  }

  // 暮らしの一場面：何を食べ、どう暮らしていたか（実際の時間で十数秒ごと）
  function lifeTick() {
    P.lifeT = 0; P.lifeNext = 13 + P.rnd() * 9;
    const ep = evo.lifeEpisode(P.L, P.rnd, P.lifeRecent);
    P.lifeRecent = [ep.text, ...P.lifeRecent].slice(0, 5);
    const before = { ...P.L.traits };
    if (ep.fx) evo.bump(P.L, ep.fx);
    plog(P.ya, tr(ep.text), 'life', traitDelta(before, P.L));
    renderPlay(true);
  }

  function playLoop(ts) {
    if (!P.on) return;
    if ($('screen-play').hidden) { P.last = 0; requestAnimationFrame(playLoop); return; }
    if (!P.last) P.last = ts;
    const dt = Math.min((ts - P.last) / 1000, 0.25);
    P.last = ts;
    if (!P.paused && !P.pending && P.L.alive) {
      const adv = dt * (P.skipping ? 80 : P.speed);
      const target = yaAtP((P.elapsed + adv) / P.T);
      advance(target <= 1e-6 ? 0 : target);
      if (P.L.alive && P.ya <= 0 && !P.pending) { endPlay(); return; }
      if (!P.L.alive && !P.pending) { endPlay(); return; }
      if (!P.skipping && !P.pending && P.L.alive && (P.lifeT += dt) >= P.lifeNext) lifeTick();
    }
    renderPlay(false);
    requestAnimationFrame(playLoop);
  }

  let lastSlow = 0;
  function renderPlay(force) {
    const ya = P.ya, L = P.L;
    setClock($('p-clock'), T('地球時計 {c}', { c: fmtClock(ya, clockDecFor(ya)) }));
    pDial.set(fracOf(ya) * 360);
    $('p-ago').textContent = fmtAgo(ya);
    $('p-period').textContent = periodLabel(ya);
    const p = pAtYa(ya);
    const rate = (2 * P.ya0 * (1 - p) / P.T) * (P.skipping ? 80 : P.speed);
    $('p-rate').textContent = T('1秒 = {y}年', { y: fmtYears(Math.max(rate, 0.1)) });
    $('p-cap').textContent = sceneCaption(ya, { fx: performance.now() < P.fxUntil ? P.fx : null, habitat: L.habitat });
    const now = performance.now();
    if (!force && now - lastSlow < 250) return;
    lastSlow = now;
    $('p-name').textContent = nameOf(L);
    drawLineMap($('p-map'), P.log, P.ya0, ya);
    $('p-sub').textContent = `${evo.PLANS[L.plan].name}${SEP}${evo.HAB_LABEL[L.habitat] || ''}`;
    $('p-n').textContent = L.alive ? spc(L) : 0;
    const { lam, mu } = evo.rates(L, ya);
    const r = L.plan === 'human' ? 0 : Math.min(1, (mu / lam) / 1.4);
    $('p-risk').style.left = `${r * 100}%`;
    traitBars($('p-traits'), L);
    const ul = $('p-rivals'); ul.textContent = '';
    P.rivals.forEach((R) => {
      const li = document.createElement('li');
      li.innerHTML = '<span><span class="rn"></span><small></small></span><span class="st"></span>';
      li.querySelector('.rn').textContent = nameOf(R);
      li.querySelector('small').textContent = evo.PLANS[R.plan].name;
      const st = li.querySelector('.st');
      if (R.alive) { st.textContent = T('{n}種', { n: spc(R) }); st.classList.add('live'); }
      else { st.textContent = T('絶滅（{a}）', { a: fmtAgo(R.deathYa) }); st.classList.add('dead'); }
      ul.appendChild(li);
    });
  }

  $('p-pause').addEventListener('click', () => {
    P.paused = !P.paused;
    $('p-pause').textContent = P.paused ? T('▶ 再開') : T('⏸ 一時停止');
  });
  document.querySelectorAll('#p-controls [data-speed]').forEach((b) => b.addEventListener('click', () => {
    P.speed = Number(b.dataset.speed); P.skipping = false;
    document.querySelectorAll('#p-controls [data-speed]').forEach((x) => x.classList.toggle('on', x === b));
  }));
  $('p-next').addEventListener('click', () => { P.skipping = true; P.paused = false; $('p-pause').textContent = T('⏸ 一時停止'); });
  $('r-zoom').addEventListener('click', () => show('now'));
  $('p-quit').addEventListener('click', () => { P.on = false; show('birth'); });

  /* ============================================================
     進化ガチャ：結末
     ============================================================ */
  const R = { ya: 0, ending: null, share: null };
  sceneView($('r-scene'), () => (R.ending ? { ya: R.ya, ending: R.ending } : null));
  const AI_END = {
    together: T('AIと人が一緒に、まだ誰も見たことのない答えを探しはじめています。'),
    delegate: T('多くをAIに任せた世界。その先がどうなるかは、まだ誰にもわかりません。'),
    careful: T('ルールをつくりながら、AIとの付き合い方を探しています。'),
  };
  // 結末の場面：生き残れば今日の子孫の暮らし、絶滅すればその化石が眠る地層
  function endScene(alive, endYa, plan, habitat, cause, look) {
    const e = evo.endingOf({ a: alive, p: plan, h: habitat, c: cause });
    return { ya: alive ? 0.3 : Math.max(endYa, 1), ending: { ...e, plan, look: look || { plan } } };
  }
  const sceneOfData = (d) => (d.u ? { ya: d.b, ending: { ...evo.endingOf(d), ya: d.b } } : endScene(d.a, d.e, d.p, d.h, d.c, d.g && d.g.length ? lookOfG(d.g[d.g.length - 1]) : null));
  const endingLabel = (e) => T('結末 No.{no}「{t}」', { no: String(e.no).padStart(2, '0'), t: e.title });
  const foundEndings = () => new Set(histLoad().map((h) => evo.endingOf(h).id));
  function rivalStatus(Rv) {
    return Rv.alive ? T('今も生きている（{n}種）', { n: spc(Rv) }) : T('{a}に絶滅', { a: fmtAgo(Rv.deathYa) });
  }
  function endPlay() {
    P.on = false;
    const L = P.L, alive = L.alive;
    const endYa = alive ? 0 : L.deathYa;
    Object.assign(R, endScene(alive, endYa, L.plan, L.habitat, L.deathCause, lookOfL(L)));
    const isNew = !foundEndings().has(R.ending.id);
    $('r-ending').textContent = endingLabel(R.ending);
    $('r-new').hidden = !isNew;
    $('r-kick').textContent = alive ? T('24:00 — 今') : `${fmtAgo(endYa)} · ${T('地球時計 {c}', { c: fmtClock(endYa, clockDecFor(endYa)) })}`;
    const big = $('r-big');
    big.textContent = alive ? T('今も生きている') : T('絶滅');
    big.className = `big ${alive ? 'live' : 'dead'}`;
    let lead;
    if (alive) {
      lead = T('「{f}」から始まったあなたの系統は、今日まで生き残りました。今の子孫：{d}。', { f: tr(L.firstName), d: evo.PLANS[L.plan].today });
      if (L.plan === 'human' && L.flags.ai) lead += ` ${AI_END[L.flags.ai]}`;
    } else {
      lead = L.deathCause.includes('背景') ? T('「{f}」から始まったあなたの系統は、数を減らし続けて姿を消しました。', { f: tr(L.firstName) }) : T('「{f}」から始まったあなたの系統は、「{c}」で姿を消しました。', { f: tr(L.firstName), c: mid(tr(L.deathCause)) });
    }
    $('r-lead').textContent = lead;
    $('r-cap').textContent = R.ending.desc;
    const span = L.bornYa - endYa;
    const rows = [
      [T('生まれた'), T('{a}（地球時計 {c}）', { a: fmtAgo(L.bornYa), c: fmtClock(L.bornYa) })],
      [alive ? T('今') : T('絶滅した'), alive ? '24:00' : T('{a}（地球時計 {c}）', { a: fmtAgo(endYa), c: fmtClock(endYa, clockDecFor(endYa)) })],
      [T('続いた期間'), T('{y}（地球時計で{t}）', { y: fmtSpan(span), t: fmtSec(span / S * DAY) })],
      [T('いちばん多いときの種の数'), T('{n}種', { n: spc(L, L.maxN) })],
      [T('最後の姿'), nameOf(L) === evo.PLANS[L.plan].name ? nameOf(L) : T('{n}（{p}）', { n: nameOf(L), p: evo.PLANS[L.plan].name })],
    ];
    const st = $('r-stats'); st.textContent = '';
    rows.forEach(([k, v]) => { const li = document.createElement('li'); li.innerHTML = '<span></span><span class="val"></span>'; li.children[0].textContent = k; li.children[1].textContent = v; st.appendChild(li); });
    const path = $('r-path'); path.textContent = '';
    if (!L.path.length) { const li = document.createElement('li'); li.textContent = T('分かれ道に出会う前に、物語が終わった'); path.appendChild(li); }
    L.path.forEach((s) => { const li = document.createElement('li'); li.textContent = `${fmtAgo(s.ya)}: ${tr(s.label)}`; path.appendChild(li); });
    const rv = $('r-rivals'); rv.textContent = '';
    P.rivals.forEach((Rv) => {
      const li = document.createElement('li');
      li.innerHTML = '<span></span><span class="st"></span>';
      li.children[0].textContent = Rv.firstName === Rv.name ? nameOf(Rv) : `${tr(Rv.firstName)} → ${nameOf(Rv)}`;
      li.children[1].textContent = rivalStatus(Rv);
      li.children[1].className = `st ${Rv.alive ? 'live' : 'dead'}`;
      rv.appendChild(li);
    });
    renderChain($('r-chain'), L.forms.map((f) => [f.look.plan, f.look.v, f.name]));
    drawLineMap($('r-map'), P.log, P.ya0, null);
    const rl = $('r-log'); rl.textContent = '';
    P.log.forEach((e) => rl.appendChild(logItem(e)));
    const card = drawCard(L, alive, endYa);
    $('r-img').src = card.toDataURL('image/png');
    $('r-save').hidden = EMBEDDED;
    $('r-hint').hidden = !EMBEDDED;
    const data = resultData(L, alive, endYa);
    const firstLife = !zoomUnlocked();
    histAdd(data);
    $('r-unlock').hidden = !firstLife;
    if (firstLife) unlockZoom();
    R.share = { text: shareTextFrom(data), url: shareUrlFrom(data), card };
    $('r-x').href = xUrl(R.share);
    $('r-share').hidden = EMBEDDED || !navigator.share;
    $('r-copy').hidden = !R.share.url;
    $('r-copy-ok').textContent = '';
    show('result');
  }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }
  const FONT = '"Hiragino Kaku Gothic ProN", "Noto Sans JP", system-ui, sans-serif';
  function drawCard(L, alive, endYa) {
    const cv = document.createElement('canvas'); cv.width = 1200; cv.height = 630;
    const ctx = cv.getContext('2d');
    ctx.fillStyle = '#0c111b'; ctx.fillRect(0, 0, 1200, 630);
    const sc = document.createElement('canvas'); sc.width = CW; sc.height = CH;
    const es = endScene(alive, endYa, L.plan, L.habitat, L.deathCause, lookOfL(L));
    drawScene(sc.getContext('2d'), es.ya, 3, es);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(sc, 24, 24, PW * 6, PH * 6);
    const fit = (text, weight, size, min, maxW) => {
      ctx.font = `${weight} ${size}px ${FONT}`;
      while (ctx.measureText(text).width > maxW && size > min) { size -= 1; ctx.font = `${weight} ${size}px ${FONT}`; }
    };
    ctx.textBaseline = 'alphabetic'; ctx.textAlign = 'left';
    ctx.fillStyle = '#9fb0c8'; ctx.font = `800 24px ${FONT}`;
    ctx.fillText(T('進化ガチャ｜結末 No.{no} / {all}', { no: String(es.ending.no).padStart(2, '0'), all: evo.ENDINGS.length }), 28, 450);
    const label = alive ? T('今も生きている') : T('絶滅');
    ctx.font = `900 22px ${FONT}`;
    const bw = ctx.measureText(label).width + 24;
    ctx.fillStyle = alive ? '#2f8a5a' : '#c8402f'; roundRect(ctx, 28, 474, bw, 36, 8); ctx.fill();
    ctx.fillStyle = '#ffffff'; ctx.fillText(label, 40, 500);
    const main = `「${es.ending.title}」`;
    fit(main, 900, 48, 28, 1150 - bw - 20);
    ctx.fillText(main, 28 + bw + 10, 511);
    const sub = alive
      ? T('{a}に「{f}」として生まれ、{n}として今日まで', { a: fmtAgo(L.bornYa), f: tr(L.firstName), n: tr(L.name) })
      : T('{a}に「{f}」として生まれ、{e}に{n}として絶滅', { a: fmtAgo(L.bornYa), f: tr(L.firstName), e: fmtAgo(endYa), n: tr(L.name) });
    ctx.fillStyle = '#ffb48f'; fit(sub, 800, 26, 18, 1150);
    ctx.fillText(sub, 28, 560);
    ctx.fillStyle = '#7f8ea6'; ctx.font = `700 20px ${FONT}`;
    ctx.fillText(T('地球の24時間  #地球の24時間 #進化ガチャ'), 28, 604);
    return cv;
  }
  // 1回の人生（系統）の記録。シェアのリンクにも、履歴にも同じ形で使う
  function resultData(L, alive, endYa) {
    return { v: 1, b: Math.round(L.bornYa), f: L.firstName, n: L.name, p: L.plan, h: L.habitat, a: alive ? 1 : 0, e: Math.round(endYa), k: L.path.map((x) => x.label), c: alive ? '' : L.deathCause,
      g: (L.forms || []).slice(-12).map((f) => [f.look.plan, f.look.v, f.name]) };
  }
  function cleanData(d) {
    if (!d || d.v !== 1 || !evo.PLANS[d.p] || !(d.b > 0 && d.b <= S) || !(d.e >= 0 && d.e <= d.b)) return null;
    const str = (x, n) => String(x || '').slice(0, n);
    const g = (Array.isArray(d.g) ? d.g : []).filter((f) => Array.isArray(f) && evo.PLANS[f[0]]).slice(0, 12).map((f) => [f[0], str(f[1], 12), str(f[2], 40)]);
    return { v: 1, u: d.u ? 1 : 0, b: d.b, e: d.e, a: d.a ? 1 : 0, f: str(d.f, 40), n: str(d.n, 40), p: d.p, h: str(d.h, 10), c: str(d.c, 60), k: (Array.isArray(d.k) ? d.k : []).slice(0, 20).map((x) => str(x, 40)), g };
  }
  function shareTextFrom(d) {
    const e = evo.endingOf(d);
    if (d.u) return `${T('{a}に生まれようとしたが、地球はまだ生命のいない灼熱の星だった。', { a: fmtAgo(d.b) })}\n${endingLabel(e)}\n${T('#地球の24時間 #進化ガチャ')}`;
    const body = d.a
      ? T('{a}に「{f}」として生まれ、{k}回の分かれ道を選んで、{n}として今日まで生き残った。', { a: fmtAgo(d.b), f: tr(d.f), k: d.k.length, n: tr(d.n) })
      : T('{a}に「{f}」として生まれ、{e}、{n}として絶滅した。', { a: fmtAgo(d.b), f: tr(d.f), e: fmtAgo(d.e), n: tr(d.n) });
    return `${body}\n${endingLabel(e)}\n${T('#地球の24時間 #進化ガチャ')}`;
  }
  // 結果をリンクに埋め込む（#r=...）。開いた人には、この結果と「あなたも生まれてみる」が出る
  const b64 = (str) => btoa(unescape(encodeURIComponent(str))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  const unb64 = (str) => decodeURIComponent(escape(atob(str.replace(/-/g, '+').replace(/_/g, '/'))));
  function shareUrlFrom(d) {
    if (EMBEDDED || !/^https?:/.test(location.protocol)) return '';
    const { v, u, b, f, n, p, h, a, e, k, c, g } = d;
    return `${location.origin}${location.pathname}#r=${b64(JSON.stringify({ v, u, b, f, n, p, h, a, e, k, c, g }))}`;
  }
  function readShared() {
    const m = location.hash.match(/^#r=([A-Za-z0-9_-]+)$/);
    if (!m) return null;
    try { return cleanData(JSON.parse(unb64(m[1]))); } catch (e) { return null; }
  }
  function xUrl(sh) {
    const u = new URL('https://twitter.com/intent/tweet');
    u.searchParams.set('text', sh.text);
    if (sh.url) u.searchParams.set('url', sh.url);
    return u.toString();
  }
  $('r-save').addEventListener('click', () => {
    const a = document.createElement('a'); a.href = $('r-img').src; a.download = 'earth-24h-evolution.png'; a.click();
  });
  $('r-copy').addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(R.share.url); $('r-copy-ok').textContent = T('リンクをコピーしました'); }
    catch (e) { $('r-copy-ok').textContent = R.share.url; }
  });
  $('r-share').addEventListener('click', () => {
    R.share.card.toBlob(async (blob) => {
      const file = new File([blob], 'earth-24h-evolution.png', { type: 'image/png' });
      const data = { text: R.share.text, files: [file] };
      if (R.share.url) data.url = R.share.url;
      try {
        if (navigator.canShare && navigator.canShare(data)) await navigator.share(data);
        else await navigator.share({ text: R.share.text, url: R.share.url || undefined });
      } catch (e) { /* キャンセル */ }
    });
  });

  /* ---------- 生きた系統の履歴（この端末のブラウザに保存） ---------- */
  const HKEY = 'earth24.history';
  let memHist = [];
  function histLoad() {
    try {
      const raw = JSON.parse(localStorage.getItem(HKEY));
      if (!Array.isArray(raw)) return memHist;
      return raw.map((x) => { const d = cleanData(x); return d ? { ...d, t: Number(x.t) || 0, id: String(x.id || '') } : null; }).filter(Boolean);
    } catch (e) { return memHist; }
  }
  function histSave(list) {
    memHist = list;
    try { localStorage.setItem(HKEY, JSON.stringify(list)); } catch (e) { /* 保存できなくても、このページの間は残る */ }
  }
  function histAdd(d) {
    const list = histLoad();
    list.unshift({ ...d, t: Date.now(), id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6) });
    histSave(list.slice(0, 100));
    renderHist();
  }
  const HD = { st: null, d: null };
  sceneView($('hd-scene'), () => HD.st);
  const fmtDate = (t) => { const x = new Date(t); return `${x.getMonth() + 1}/${x.getDate()} ${x.getHours()}:${String(x.getMinutes()).padStart(2, '0')}`; };
  function renderHist() {
    const list = histLoad();
    const ul = $('hist-list'); ul.textContent = '';
    $('hist-empty').hidden = list.length > 0;
    $('hist-clear').hidden = list.length === 0;
    renderZukan();
    if (!list.length) { $('hist-sum').textContent = ''; return; }
    const born = list.filter((d) => !d.u), unborn = list.length - born.length;
    const alive = born.filter((d) => d.a).length;
    let sum = '';
    if (born.length) {
      const longest = born.reduce((m, d) => (d.b - d.e > m.b - m.e ? d : m), born[0]);
      sum = T('これまで{n}回生まれ、{a}回は今日まで生き残りました（生存率{p}%）。いちばん長く続いたのは「{f}」からの系統（{y}）。', { n: born.length, a: alive, p: Math.round(alive / born.length * 100), f: tr(longest.f), y: fmtSpan(longest.b - longest.e) });
    }
    if (unborn) sum += (sum ? ' ' : '') + T('生まれる前の地球を引いたのは{n}回。', { n: unborn });
    $('hist-sum').textContent = sum;
    list.forEach((d) => {
      const li = document.createElement('li');
      const b = document.createElement('button');
      b.innerHTML = '<span class="tag"></span><span class="hn"><span class="hm"></span><span class="hs"></span></span>';
      const tag = b.querySelector('.tag');
      tag.textContent = d.u ? T('誕生前') : d.a ? T('生存') : T('絶滅');
      tag.classList.add(d.u ? 'unborn' : d.a ? 'alive' : 'dead');
      b.querySelector('.hm').textContent = d.u ? `「${evo.endingOf(d).title}」` : `「${evo.endingOf(d).title}」 ${d.f === d.n ? tr(d.n) : `${tr(d.f)} → ${tr(d.n)}`}`;
      b.querySelector('.hs').textContent = d.u ? `${fmtAgo(d.b)}${SEP}${T('生命が生まれる前')}${SEP}${fmtDate(d.t)}` : T('{a}〜{e}・分かれ道{k}回・{d}', { a: fmtAgo(d.b), e: d.a ? T('今') : fmtAgo(d.e), k: d.k.length, d: fmtDate(d.t) });
      b.addEventListener('click', () => openHist(d));
      li.appendChild(b);
      ul.appendChild(li);
    });
  }
  // 結末の図鑑：見つけた結末は風景つき、まだの結末は「？」
  function renderZukan() {
    const found = foundEndings();
    const box = $('zukan'); box.textContent = '';
    $('zukan-n').textContent = `${found.size} / ${evo.ENDINGS.length}`;
    const list = histLoad();
    evo.ENDINGS.forEach((e) => {
      const b = document.createElement('button');
      b.className = 'zk';
      const has = found.has(e.id);
      if (has) {
        const cv = document.createElement('canvas'); cv.width = CW; cv.height = CH;
        const last = list.find((h) => evo.endingOf(h).id === e.id);
        const st = sceneOfData(last);
        drawScene(cv.getContext('2d'), st.ya, 3, st);
        b.appendChild(cv);
        b.addEventListener('click', () => openHist(last));
      } else {
        const ph = document.createElement('div'); ph.className = 'zk-lock'; ph.textContent = '？';
        b.appendChild(ph);
        b.disabled = true;
      }
      const cap = document.createElement('span');
      cap.textContent = has ? `${String(e.no).padStart(2, '0')} ${e.title}` : `${String(e.no).padStart(2, '0')} ${e.unborn ? T('誕生前') : e.alive ? (e.alt ? T('もしもの生存') : T('生き残る')) : T('絶滅')}`;
      if (e.alt) b.classList.add('alt');
      b.appendChild(cap);
      box.appendChild(b);
    });
  }
  function openHist(d) {
    HD.d = d;
    HD.st = sceneOfData(d);
    renderChain($('hd-chain'), d.g);
    $('hd-ending').textContent = `${endingLabel(HD.st.ending)}：${HD.st.ending.desc}`;
    const t = $('hd-ttl');
    t.textContent = d.u ? T('生まれられなかった') : d.a ? T('今も生きている') : T('絶滅');
    t.className = `ttl ${d.u ? '' : d.a ? 'alive' : 'dead'}`;
    $('hd-text').textContent = d.u ? T('{a}に生まれようとしたが、地球はまだ生命のいない灼熱の星だった。', { a: fmtAgo(d.b) }) : d.a
      ? T('{a}に「{f}」として生まれ、{k}回の分かれ道を選んで、{n}として今日まで生き残りました。今の子孫：{d}。', { a: fmtAgo(d.b), f: tr(d.f), k: d.k.length, n: tr(d.n), d: evo.PLANS[d.p].today })
      : T('{a}に「{f}」として生まれ、{e}、{n}として絶滅しました{c}。続いた期間は{y}。', { a: fmtAgo(d.b), f: tr(d.f), e: fmtAgo(d.e), n: tr(d.n), c: causeNote(d.c), y: fmtSpan(d.b - d.e) });
    const ol = $('hd-path'); ol.textContent = '';
    d.k.forEach((x) => { const li = document.createElement('li'); li.textContent = tr(x); ol.appendChild(li); });
    const url = shareUrlFrom(d);
    $('hd-x').href = xUrl({ text: shareTextFrom(d), url });
    $('hd-copy').hidden = !url;
    $('hd-copy-ok').textContent = '';
    $('hist-detail').hidden = false;
    $('hist-detail').scrollIntoView({ block: 'nearest', behavior: REDUCE ? 'auto' : 'smooth' });
  }
  $('hd-close').addEventListener('click', () => { $('hist-detail').hidden = true; HD.st = null; });
  $('hd-copy').addEventListener('click', async () => {
    const url = shareUrlFrom(HD.d);
    try { await navigator.clipboard.writeText(url); $('hd-copy-ok').textContent = T('リンクをコピーしました'); }
    catch (e) { $('hd-copy-ok').textContent = url; }
  });
  let clearArmed = 0;
  $('hist-clear').addEventListener('click', () => {
    if (Date.now() - clearArmed > 4000) { clearArmed = Date.now(); $('hist-clear').textContent = T('もう一度押すと、すべての記録を消します'); return; }
    histSave([]); clearArmed = 0; $('hist-clear').textContent = T('記録をすべて消す');
    $('hist-detail').hidden = true; HD.st = null;
    renderHist();
  });

  // シェアされた結果を表示する
  const SH = { st: null };
  sceneView($('s-scene'), () => SH.st);
  function showShared(d) {
    SH.st = sceneOfData(d);
    renderChain($('s-chain'), d.g);
    $('s-ending').textContent = `${endingLabel(SH.st.ending)}：${SH.st.ending.desc}`;
    const t = $('s-ttl');
    t.textContent = d.u ? T('生まれられなかった') : d.a ? T('今も生きている') : T('絶滅');
    t.className = `ttl ${d.u ? '' : d.a ? 'live' : 'dead'}`;
    $('s-text').textContent = d.u ? T('{a}に生まれようとしたが、地球はまだ生命のいない灼熱の星だった。', { a: fmtAgo(d.b) }) : d.a
      ? T('{a}に「{f}」として生まれ、{k}回の分かれ道を選んで、{n}として今日まで生き残りました。', { a: fmtAgo(d.b), f: tr(d.f), k: d.k.length, n: tr(d.n) })
      : T('{a}に「{f}」として生まれ、{e}、{n}として絶滅しました{c}。', { a: fmtAgo(d.b), f: tr(d.f), e: fmtAgo(d.e), n: tr(d.n), c: causeNote(d.c) });
    const ol = $('s-path'); ol.textContent = '';
    d.k.forEach((x) => { const li = document.createElement('li'); li.textContent = tr(x); ol.appendChild(li); });
    $('shared').hidden = false;
  }
  $('s-play').addEventListener('click', () => {
    $('shared').hidden = true;
    history.replaceState(null, '', location.pathname);
    spinTo(Math.random() * S);
  });
  $('r-again').addEventListener('click', () => { show('birth'); spinTo(Math.random() * S); });
  $('r-home').addEventListener('click', () => show('home'));
  $('r-hist').addEventListener('click', () => {
    show('birth');
    const list = histLoad();
    if (list.length) openHist(list[0]);
    $('hist').scrollIntoView({ block: 'start', behavior: REDUCE ? 'auto' : 'smooth' });
  });

  // 開発用（localhost のときだけ）：生まれる時代と生き物を指定して試す
  if (/^(localhost|127\.0\.0\.1)$/.test(location.hostname)) {
    window.__e24 = {
      spin: (ya) => spinTo(ya),
      born(ya, name) {
        show('birth');
        const opts = evo.birthOptions(ya);
        const o = opts.find((x) => !name || x.name.includes(name)) || opts[0];
        const orig = evo.birthOptions;
        evo.birthOptions = () => [o];
        onBorn(ya);
        evo.birthOptions = orig;
        G.birth.rivals = [0, 1, 2, 3].map(() => evo.makeLineage(opts[Math.floor(Math.random() * opts.length)], ya, false));
        G.birth.rivals.forEach((r) => (r.firstName = r.name));
      },
    };
  }

  // 言語の切り替え
  {
    const lb = $('lang-toggle'), other = E.LANG === 'ja' ? 'en' : 'ja';
    lb.textContent = other === 'en' ? 'English' : '日本語';
    lb.setAttribute('lang', other);
    lb.addEventListener('click', () => E.setLang(other));
  }
  E.applyStatic();
  if (E.LANG === 'en') document.title = T('地球の24時間');

  /* ---------- 起動 ---------- */
  homeInit();
  liveTick();
  requestAnimationFrame(homeLoop);
  renderHist();
  updateZoomLock();
  const shared = readShared();
  if (shared) showShared(shared);
  if (location.hash === '#clock') show('home');
  else if (location.hash === '#now') show('now');
})();
