/* 地球の24時間 v2 — 画面と動き */
(function () {
  'use strict';
  const E = window.E24;
  const {
    S, DAY, ago, fmtYears, fmtAgo, fmtSec, fmtCountdown, fmtClock, clockDecFor, fmtOneIn, fmtProb,
    fracOf, jstSec, yaOfJst, ERAS, eraOf, periodLabel, EVENTS, status, AI_STORY,
  } = E;
  const { sceneView, sceneCaption, drawScene, PW, PH } = E.scenes;
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
    const tab = ['birth', 'play', 'result'].includes(name) ? 'evo' : name;
    if (tab === 'evo') evoScreen = name;
    document.querySelectorAll('.tab').forEach((t) => t.setAttribute('aria-selected', String(t.dataset.tab === tab)));
    if (name === 'home') homeInit();
    if (name === 'now') zoomShow();
    window.scrollTo(0, 0);
  }
  // 「生まれる」タブ：プレイ中ならその続きへ、それ以外はガチャの画面へ
  document.querySelectorAll('.tab').forEach((t) => t.addEventListener('click', () => show(t.dataset.tab === 'evo' ? (evoScreen === 'play' && P.on ? 'play' : 'birth') : t.dataset.tab)));

  /* ============================================================
     いまの地球（日本時間と同期）
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
    const ya = yaOfJst(jstSec());
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
    const sec = jstSec();
    if (sec < home.lastSec - 1) homeInit();                 // 日付が変わった＝地球がまた生まれた
    home.lastSec = sec;
    const ya = yaOfJst(sec);
    home.ya = ya;
    const left = DAY - sec;
    const dec = left < 1 ? 3 : left < 60 ? 2 : 0;
    document.body.classList.toggle('final', left < 60);

    let fired = null;
    while (home.next < EVENTS.length && EVENTS[home.next].ya >= ya) {
      fired = EVENTS[home.next++];
      homeLog(fired);
      const since = (fired.ya - ya) / S * DAY;                // 何秒前の出来事か
      if (FX_BY_EVENT[fired.name] && since < 30) { home.fx = FX_BY_EVENT[fired.name]; home.fxUntil = performance.now() + (30 - since) * 1000; }
    }
    if (fired) homeEvt(fired, true);

    $('h-jst').textContent = jstText(sec, dec);
    $('h-ago').textContent = fmtAgo(ya);
    hDial.set(fracOf(ya) * 360);
    const nowMs = performance.now();
    if (nowMs - GL.last > 100) { GL.last = nowMs; E.globe.draw(GL.ctx, ya, REDUCE ? 0.6 : nowMs * 0.00028); }
    setClock($('h-clock'), fmtClock(ya, clockDecFor(ya)));
    $('h-era').textContent = eraOf(ya).name;
    $('h-left').textContent = `24:00まで ${left < 60 ? fmtSec(left) : fmtCountdown(left)}`;
    const cap = sceneCaption(ya, { fx: performance.now() < home.fxUntil ? home.fx : null });
    if (cap !== home.cap) { home.cap = cap; $('h-cap').textContent = cap; }

    // 1秒ごとでよい表示
    const whole = Math.floor(sec * (left < 60 ? 10 : 1));
    if (whole === home.secShown) return;
    home.secShown = whole;
    $('h-period').textContent = periodLabel(ya);
    $('h-globe-cap').textContent = `地球のすがた：${E.globe.label(ya)}`;
    const o2 = status.oxygen(ya), day = status.dayLength(ya), sun = status.sun(ya);
    $('h-o2').textContent = o2 < 0.01 ? 'ほぼ0%' : `約${o2 < 1 ? o2.toFixed(1) : Math.round(o2)}%`;
    $('h-o2-f').style.width = `${Math.min(100, (o2 / 35) * 100)}%`;
    $('h-day').textContent = `約${day.toFixed(1)}時間`;
    $('h-day-f').style.width = `${(day / 24) * 100}%`;
    $('h-sun').textContent = `${Math.round(sun)}`;
    $('h-sun-f').style.width = `${sun}%`;
    if (home.last) {
      const ago2 = (home.last.ya - ya) / S * DAY;
      $('h-evt-t').textContent = `${fmtClock(home.last.ya, clockDecFor(home.last.ya))}・${fmtAgo(home.last.ya)}・${ago2 < 1 ? 'たった今' : `${fmtCountdown(ago2)}前`}`;
    }
    $('h-human').innerHTML = ya > 3e5
      ? `ホモ・サピエンスの誕生（毎晩 <b>${fmtClock(3e5)}</b>）まで、あと <b>${fmtCountdown((ya - 3e5) / S * DAY)}</b>`
      : `人類の時代です。24:00まで、あと <b>${fmtSec(left)}</b>`;
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
      cd.textContent = s < 60 ? `あと${fmtSec(s)}` : `あと${fmtCountdown(s)}`;
      li.append(tt, nm, cd);
      ul.appendChild(li);
    }
  }
  // 上部の「いまの地球」：どの画面にいても、裏で24時間時計が動き続ける
  let liveShown = '';
  function liveTick() {
    const sec = jstSec(), ya = yaOfJst(sec);
    const t = jstText(sec, 0);
    if (t === liveShown) return;
    liveShown = t;
    $('live-jst').textContent = t;
    $('live-ago').textContent = fmtAgo(ya);
    $('live-era').textContent = `・${periodLabel(ya)}`;
    if (!G.spinning) $('b-now').textContent = `いまの地球時計の時代（${fmtAgo(ya)}）に生まれる`;
    if (!G.touched) {                                              // まだ回していなければ、いまの地球の風景を見せる
      G.viewYa = ya;
      $('b-cap').textContent = `いまの地球時計の風景（${fmtAgo(ya)}）：${sceneCaption(ya)}`;
    }
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
    { a: S * 3 / 1440, b: 3e5, f: 0.12, sub: '人類の祖先から、ホモ・サピエンスへ' },
    { a: 3e5, b: 1.2e4, f: 0.14, sub: 'サピエンスが世界へ広がる' },
    { a: 1.2e4, b: ago(1769), f: 0.16, sub: '農耕から、文明と国へ' },
    { a: ago(1769), b: ago(1956.6), f: 0.16, sub: '産業革命から、AIという言葉が生まれるまで' },
    { a: ago(1956.6), b: ago(2012.8), f: 0.16, sub: 'コンピュータとAIの研究' },
    { a: ago(2012.8), b: 0, f: 0.26, sub: 'AIの台頭' },
  ];
  const ZDEC = [0, 2, 4, 6, 7, 8];
  const Z_T = 180;                                                  // ×1で約3分
  const segLabel = (i) => `最後の${fmtSec(ZSEG[i].a / S * DAY)}`;
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
      el('text', { x: 616, y: 70, class: 'strip-end', 'text-anchor': 'end' }, svg).textContent = g.b > 0 ? fmtAgo(g.b) : '今';
      $('z-strip-cap').textContent = `${segLabel(i)}を拡大中：${g.sub}`;
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

  let zBannerTimer = 0;
  function zBanner(text) {
    const b = $('z-banner'); b.textContent = text; b.classList.add('show');
    clearTimeout(zBannerTimer); zBannerTimer = setTimeout(() => b.classList.remove('show'), 3200);
  }
  function zEvent(e, animate) {
    const c = $('z-evt');
    c.classList.toggle('ai', e.kind === 'ai');
    $('z-evt-t').textContent = `${fmtClock(e.ya, ZDEC[zSegOf(e.ya)])}・${fmtAgo(e.ya)}`;
    $('z-evt-n').textContent = e.name;
    $('z-evt-s').textContent = e.note || '';
    if (animate) { c.classList.remove('pop'); void c.offsetWidth; c.classList.add('pop'); }
  }
  function zReset() {
    Object.assign(Z, { p: 0, seg: -1, next: 0, ya: ZSEG[0].a, last: 0, ended: false, playing: true });
    $('z-end').hidden = true;
    $('z-banner').classList.remove('show');
    $('z-play').textContent = '⏸ 一時停止';
    zEvent({ ya: ZSEG[0].a, name: '最後の3分間へ', note: '人類の祖先が現れる直前から、今日までを再生します。', kind: '' }, false);
    zRender();
    $('z-seek').value = 0;
  }
  function zRender() {
    const ya = Z.ya, i = zSegOf(ya);
    if (!Z.dragging) $('z-seek').value = Math.round(Z.p * 1000);
    if (i !== Z.seg) {
      [...$('z-seek-labels').children].forEach((sp, k) => sp.classList.toggle('on', k === i));
      if (Z.seg >= 0 && i > Z.seg && !Z.quiet) zBanner(`ここから時間を約${Math.round(zRate(Z.seg) / zRate(i))}倍ゆっくり流します\n1秒 = ${fmtYears(zRate(i))}年`);
      Z.seg = i;
      zStrip.build(i);
      $('z-chip').textContent = segLabel(i);
    }
    const clock = fmtClock(ya, ZDEC[i]);
    $('z-clock').textContent = `地球時計 ${clock}`;
    $('z-ago').textContent = fmtAgo(ya);
    $('z-rate').textContent = `1秒 = ${fmtYears(Math.max(zRate(i), 0.1))}年`;
    $('z-remain').innerHTML = ya > 0 ? `24:00まで、地球時計で あと <b>${fmtSec(ya / S * DAY)}</b>` : '<b>24:00 — 今</b>';
    const cap = sceneCaption(Math.max(ya, 0.3));
    if (cap !== Z.cap) { Z.cap = cap; $('z-cap').textContent = cap; }
    zStrip.update(ya);
    let fired = null;
    while (Z.next < ZEV.length && ZEV[Z.next].ya >= ya) fired = ZEV[Z.next++];
    if (fired) zEvent(fired, true);
  }
  function zLoop(ts) {
    requestAnimationFrame(zLoop);
    if ($('screen-now').hidden || !Z.playing || Z.ended || Z.dragging) { Z.last = 0; return; }
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
    $('z-play').textContent = '▶ 再生';
    $('z-end-t').textContent = `46億年を24時間にすると、人類の歴史は最後の5.6秒。「人工知能」という言葉が生まれてからは、最後の約${fmtSec(ago(1956.6) / S * DAY)}。ChatGPTの公開からは、約${fmtSec(ago(2022.91) / S * DAY)}です。`;
    $('z-end').hidden = false;
  }
  $('z-play').addEventListener('click', () => {
    if (Z.ended) { zReset(); return; }
    Z.playing = !Z.playing;
    $('z-play').textContent = Z.playing ? '⏸ 一時停止' : '▶ 再生';
  });
  document.querySelectorAll('[data-zspeed]').forEach((b) => b.addEventListener('click', () => {
    Z.speed = Number(b.dataset.zspeed);
    document.querySelectorAll('[data-zspeed]').forEach((x) => x.classList.toggle('on', x === b));
    if (Z.seg >= 0) $('z-rate').textContent = `1秒 = ${fmtYears(Math.max(zRate(Z.seg), 0.1))}年`;
  }));
  $('z-restart').addEventListener('click', zReset);

  // ゲージをドラッグして、進めたり戻したりする
  const Z_INTRO = { ya: ZSEG[0].a, name: '最後の3分間へ', note: '人類の祖先が現れる直前から、今日までを再生します。', kind: '' };
  {
    const box = $('z-seek-labels');
    box.style.gridTemplateColumns = ZSEG.map((g) => `${g.f}fr`).join(' ');
    ZSEG.forEach((g, i) => { const sp = document.createElement('span'); sp.textContent = i === ZSEG.length - 1 ? 'AIの台頭' : segLabel(i).replace('最後の', ''); box.appendChild(sp); });
  }
  const zCum = (i) => ZSEG.slice(0, i).reduce((a, g) => a + g.f, 0);
  function zSeek(p) {
    Z.p = Math.max(0, Math.min(1, p));
    Z.ya = zYa(Z.p);
    Z.next = ZEV.findIndex((e) => e.ya < Z.ya);
    if (Z.next < 0) Z.next = ZEV.length;
    Z.quiet = true; zRender(); Z.quiet = false;
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

  let aiBuilt = false;
  function zoomShow() {
    if (!Z.playing && !Z.ended && Z.p === 0) zReset();
    if (aiBuilt) return;
    aiBuilt = true;
    const aiSec = ago(1956.6) / S * DAY, gptSec = ago(2022.91) / S * DAY;
    $('n-ai-head').innerHTML =
      `<div class="ai-stat">「人工知能」という言葉が生まれてから今日まで：地球時計で <b>約${fmtSec(aiSec)}</b>。まばたき1回（約0.1秒）の、さらに約${Math.round(0.1 / aiSec)}分の1。</div>` +
      `<div class="ai-stat">ChatGPTの公開から今日まで：<b>約${fmtSec(gptSec)}</b>。</div>`;
    const list = $('n-ai-list');
    AI_STORY.forEach(([year, ttl, dsc], i) => {
      const li = document.createElement('li');
      const last = i === AI_STORY.length - 1;
      if (last) li.className = 'now';
      li.innerHTML = '<div class="yr num"></div><div class="ttl"></div><div class="dsc"></div><div class="clk"></div>';
      li.children[0].textContent = last ? `${year}年（今）` : `${year}年`;
      li.children[1].textContent = ttl;
      li.children[2].textContent = dsc;
      li.children[3].textContent = last ? '24:00 — 今' : `24:00の約${fmtSec(ago(year + 0.5) / S * DAY)}前`;
      list.appendChild(li);
    });
  }
  requestAnimationFrame(zLoop);

  /* ============================================================
     進化ガチャ：誕生
     ============================================================ */
  const bDial = buildDial($('b-dial'), { reveal: false });
  bDial.set(0);
  const G = { angle: 0, spinning: false, viewYa: null, birth: null };
  sceneView($('b-scene'), () => (G.viewYa == null ? null : { ya: G.viewYa, plan: G.birth ? G.birth.player.plan : null, habitat: G.birth ? G.birth.player.habitat : null }));

  function dedupeNames(list) {
    const seen = {};
    list.forEach((L) => { seen[L.name] = (seen[L.name] || 0) + 1; if (seen[L.name] > 1) L.name = `${L.name}（別の系統）`; });
  }
  function traitBars(box, L) {
    if (!box.children.length) {
      for (const k of evo.TRAITS) {
        const row = document.createElement('div'); row.className = 'trait';
        row.innerHTML = `<span></span><div class="track"><div class="fill"></div></div><b class="num"></b>`;
        row.children[0].textContent = evo.TRAIT_LABEL[k];
        box.appendChild(row);
      }
    }
    evo.TRAITS.forEach((k, i) => {
      const row = box.children[i];
      row.querySelector('.fill').style.width = `${L.traits[k]}%`;
      row.querySelector('b').textContent = Math.round(L.traits[k]);
    });
  }

  $('b-spin').addEventListener('click', () => spinTo(Math.random() * S));
  $('b-now').addEventListener('click', () => spinTo(yaOfJst(jstSec())));
  function spinTo(t) {
    if (G.spinning) return;
    G.spinning = true;
    G.touched = true;
    $('b-spin').disabled = true;
    $('b-now').disabled = true;
    $('b-none').hidden = true;
    $('b-cert-wrap').hidden = true;
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
      G.viewYa = ya;
      setClock($('b-clock'), fmtClock(ya));
      $('b-ago').textContent = fmtAgo(ya);
      $('b-era').textContent = eraOf(ya).name;
      $('b-cap').textContent = sceneCaption(ya);
      if (k < 1) { requestAnimationFrame(stepAnim); return; }
      G.angle = target; bDial.set(target);
      G.spinning = false;
      $('b-spin').disabled = false;
      $('b-now').disabled = false;
      $('b-spin').textContent = 'もう一度生まれる';
      onBorn(t);
      $('b-cert-wrap').hidden || $('b-cert-wrap').scrollIntoView({ block: 'start', behavior: REDUCE ? 'auto' : 'smooth' });
    };
    requestAnimationFrame(stepAnim);
  }

  function onBorn(t) {
    G.viewYa = t;
    setClock($('b-clock'), fmtClock(t));
    $('b-ago').textContent = fmtAgo(t);
    $('b-era').textContent = eraOf(t).name;
    $('b-cap').textContent = sceneCaption(t);
    const options = evo.birthOptions(t);
    if (!options.length) {
      $('b-none').hidden = false;
      $('b-none-t').textContent = `${fmtAgo(t)}（地球時計 ${fmtClock(t)}）。地球はまだ熱く、生命が生まれる前でした。この時代を引く確率は${fmtProb((S - 3.8e9) / S)}。生命が生まれるのは、地球時計の4:10ごろです。`;
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
    $('b-line1').textContent = 'あなたは';
    $('b-who').textContent = `${player.name}として生まれました`;
    $('b-line2').textContent = `${fmtAgo(t)}・地球時計 ${fmtClock(t)}・${periodLabel(t)}`;
    $('b-plan').textContent = evo.PLANS[player.plan].name;
    $('b-hab').textContent = evo.HAB_LABEL[player.habitat] || '';
    $('b-prob').textContent = fmtProb((era.from - era.to) / S);
    $('b-left').textContent = `${fmtYears(t)}年（地球時計で${fmtSec(t / S * DAY)}）`;
    $('b-traits').textContent = '';
    traitBars($('b-traits'), player);
    const ul = $('b-rivals'); ul.textContent = '';
    rivals.forEach((r) => {
      const li = document.createElement('li');
      li.innerHTML = '<span></span><span class="st muted"></span>';
      li.children[0].textContent = r.name;
      li.children[1].textContent = evo.PLANS[r.plan].name;
      ul.appendChild(li);
    });
    $('b-cert-wrap').hidden = false;
  }

  /* ============================================================
     進化ガチャ：プレイ
     ============================================================ */
  const P = { on: false };
  sceneView($('p-scene'), (now) => (P.on || P.L ? { ya: P.ya, plan: P.L.alive ? P.L.plan : null, habitat: P.L.habitat, fx: now < P.fxUntil ? P.fx : null } : null));

  const yaAtP = (p) => P.ya0 * Math.pow(1 - Math.min(1, Math.max(0, p)), 2);   // 今に近いほどゆっくり
  const pAtYa = (ya) => 1 - Math.sqrt(Math.max(0, ya) / P.ya0);

  $('b-start').addEventListener('click', () => {
    if (!G.birth) return;
    const T = 600;                                                 // ×1でおよそ10分（分かれ道で止まる時間は含まない）
    const { t, player, rivals } = G.birth;
    Object.assign(P, {
      on: true, L: player, rivals, ya0: t, ya: t, T, elapsed: 0, speed: 1, paused: false, skipping: false,
      pending: null, last: 0, fx: null, fxUntil: 0, rnd: evo.rng(Math.floor(Math.random() * 2 ** 31)),
      done: new Set(), log: [], startedAt: t,
    });
    $('p-log').textContent = '';
    document.querySelectorAll('#p-controls [data-speed]').forEach((b) => b.classList.toggle('on', b.dataset.speed === '1'));
    $('p-pause').textContent = '⏸ 一時停止';
    $('p-traits').textContent = '';
    plog(t, `${fmtAgo(t)}、「${player.name}」として生まれた。`);
    show('play');
    checkNode();
    renderPlay(true);
    requestAnimationFrame(playLoop);
  });

  function plog(ya, text, cls) {
    const li = document.createElement('li');
    const tt = document.createElement('span'); tt.className = 'tt'; tt.textContent = `${fmtClock(ya, clockDecFor(ya))}・${fmtAgo(ya)}`;
    const tx = document.createElement('span'); tx.textContent = text; if (cls) tx.className = cls;
    li.append(tt, tx);
    $('p-log').prepend(li);
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
      b.innerHTML = '<b></b><span></span>';
      b.children[0].textContent = o.label; b.children[1].textContent = o.desc;
      b.addEventListener('click', () => choose(node, o));
      box.appendChild(b);
    });
    $('p-choice').hidden = false;
    $('p-choice').scrollIntoView({ block: 'nearest', behavior: REDUCE ? 'auto' : 'smooth' });
    return true;
  }
  function choose(node, o) {
    const L = P.L;
    o.apply(L);
    L.taken.add(node.id);
    L.path.push({ ya: P.ya, label: o.label });
    plog(P.ya, `分かれ道：${o.label}${o.real ? `。${o.real}` : ''}`);
    $('p-choice').hidden = true;
    P.pending = null;
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
    plog(ev.ya, `${ev.name}：${me.before}種 → ${me.after}種${dead ? '。系統が絶滅した' : ''}`, dead ? 'dead' : '');
    others.forEach(({ R, res }) => { if (res && !R.alive) plog(ev.ya, `${R.name}の系統が、${ev.name}で絶滅した`); });
    if (me.p < 0.05 && !dead) return;                              // ほとんど影響のない出来事は記録だけ
    P.pending = { type: 'event', ev };
    P.skipping = false;
    $('p-ev-t').textContent = ev.name;
    $('p-ev-f').textContent = ev.fact;
    const you = $('p-ev-you');
    you.className = `you ${dead ? 'dead' : 'live'}`;
    you.textContent = dead
      ? `あなたの系統：${me.before}種 → 0種。ここで絶滅しました。`
      : `あなたの系統：${me.before}種 → ${me.after}種。なんとか生き延びた。`;
    const real = $('p-ev-real');
    real.hidden = me.p < 1;
    real.textContent = P.L.flags.admix && ev.ya === 4e4
      ? '系統は途絶えました。でも、あなたたちの遺伝子の一部は、ホモ・サピエンスの中で今も生きています。'
      : '実際の歴史でも、この仲間はここですべて姿を消しました。';
    const ul = $('p-ev-rivals'); ul.textContent = '';
    others.forEach(({ R, res }) => {
      const li = document.createElement('li');
      li.innerHTML = '<span></span><span class="st"></span>';
      li.children[0].textContent = R.name;
      const st = li.children[1];
      if (!res) { st.textContent = 'すでに絶滅'; st.className = 'st muted'; }
      else { st.textContent = `${res.before} → ${res.after}種`; st.className = `st ${R.alive ? 'live' : 'dead'}`; }
      ul.appendChild(li);
    });
    $('p-event').hidden = false;
    $('p-event').scrollIntoView({ block: 'nearest', behavior: REDUCE ? 'auto' : 'smooth' });
  }
  $('p-ev-ok').addEventListener('click', () => {
    $('p-event').hidden = true;
    P.pending = null;
    if (!P.L.alive) { endPlay(); return; }
    checkNode();
  });

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
          if (was && !L.alive) plog(L.deathYa, `${L.isPlayer ? 'あなた' : L.name}の系統が、数を減らし続けて絶滅した`, L.isPlayer ? 'dead' : '');
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
    }
    renderPlay(false);
    requestAnimationFrame(playLoop);
  }

  let lastSlow = 0;
  function renderPlay(force) {
    const ya = P.ya, L = P.L;
    setClock($('p-clock'), `地球時計 ${fmtClock(ya, clockDecFor(ya))}`);
    $('p-ago').textContent = fmtAgo(ya);
    $('p-period').textContent = periodLabel(ya);
    const p = pAtYa(ya);
    const rate = (2 * P.ya0 * (1 - p) / P.T) * (P.skipping ? 80 : P.speed);
    $('p-rate').textContent = `1秒 = ${fmtYears(Math.max(rate, 0.1))}年`;
    $('p-cap').textContent = sceneCaption(ya, { fx: performance.now() < P.fxUntil ? P.fx : null, habitat: L.habitat });
    const now = performance.now();
    if (!force && now - lastSlow < 250) return;
    lastSlow = now;
    $('p-name').textContent = L.name;
    $('p-sub').textContent = `${evo.PLANS[L.plan].name}・${evo.HAB_LABEL[L.habitat] || ''}`;
    $('p-n').textContent = L.alive ? (L.N >= evo.CAP ? `${evo.CAP}+` : Math.round(L.N)) : 0;
    const { lam, mu } = evo.rates(L, ya);
    const r = L.plan === 'human' ? 0 : Math.min(1, (mu / lam) / 1.4);
    $('p-risk').style.left = `${r * 100}%`;
    traitBars($('p-traits'), L);
    const ul = $('p-rivals'); ul.textContent = '';
    P.rivals.forEach((R) => {
      const li = document.createElement('li');
      li.innerHTML = '<span><span class="rn"></span><small></small></span><span class="st"></span>';
      li.querySelector('.rn').textContent = R.name;
      li.querySelector('small').textContent = evo.PLANS[R.plan].name;
      const st = li.querySelector('.st');
      if (R.alive) { st.textContent = `${R.N >= evo.CAP ? evo.CAP + '+' : Math.round(R.N)}種`; st.classList.add('live'); }
      else { st.textContent = `絶滅（${fmtAgo(R.deathYa)}）`; st.classList.add('dead'); }
      ul.appendChild(li);
    });
  }

  $('p-pause').addEventListener('click', () => {
    P.paused = !P.paused;
    $('p-pause').textContent = P.paused ? '▶ 再開' : '⏸ 一時停止';
  });
  document.querySelectorAll('#p-controls [data-speed]').forEach((b) => b.addEventListener('click', () => {
    P.speed = Number(b.dataset.speed); P.skipping = false;
    document.querySelectorAll('#p-controls [data-speed]').forEach((x) => x.classList.toggle('on', x === b));
  }));
  $('p-next').addEventListener('click', () => { P.skipping = true; P.paused = false; $('p-pause').textContent = '⏸ 一時停止'; });
  $('p-quit').addEventListener('click', () => { P.on = false; show('birth'); });

  /* ============================================================
     進化ガチャ：結末
     ============================================================ */
  const R = { ya: 0, ending: null, share: null };
  sceneView($('r-scene'), () => (R.ending ? { ya: R.ya, ending: R.ending } : null));
  const AI_END = {
    together: 'AIと人が一緒に、まだ誰も見たことのない答えを探しはじめています。',
    delegate: '多くをAIに任せた世界。その先がどうなるかは、まだ誰にもわかりません。',
    careful: 'ルールをつくりながら、AIとの付き合い方を探しています。',
  };
  // 結末の場面：生き残れば今日の子孫の暮らし、絶滅すればその化石が眠る地層
  function endScene(alive, endYa, plan, habitat, cause) {
    const e = evo.endingOf({ a: alive, p: plan, h: habitat, c: cause });
    return { ya: alive ? 0.3 : Math.max(endYa, 1), ending: { ...e, plan } };
  }
  const endingLabel = (e) => `結末 No.${String(e.no).padStart(2, '0')}「${e.title}」`;
  const foundEndings = () => new Set(histLoad().map((h) => evo.endingOf(h).id));
  function rivalStatus(Rv) {
    return Rv.alive ? `今も生きている（${Rv.N >= evo.CAP ? evo.CAP + '+' : Math.round(Rv.N)}種）` : `${fmtAgo(Rv.deathYa)}に絶滅`;
  }
  function endPlay() {
    P.on = false;
    const L = P.L, alive = L.alive;
    const endYa = alive ? 0 : L.deathYa;
    Object.assign(R, endScene(alive, endYa, L.plan, L.habitat, L.deathCause));
    const isNew = !foundEndings().has(R.ending.id);
    $('r-ending').textContent = endingLabel(R.ending);
    $('r-new').hidden = !isNew;
    $('r-kick').textContent = alive ? '24:00 — 今' : `${fmtAgo(endYa)}・地球時計 ${fmtClock(endYa, clockDecFor(endYa))}`;
    const big = $('r-big');
    big.textContent = alive ? '今も生きている' : '絶滅';
    big.className = `big ${alive ? 'live' : 'dead'}`;
    let lead;
    if (alive) {
      lead = `「${L.firstName}」から始まったあなたの系統は、今日まで生き残りました。今の子孫：${evo.PLANS[L.plan].today}。`;
      if (L.plan === 'human' && L.flags.ai) lead += ` ${AI_END[L.flags.ai]}`;
    } else {
      lead = `「${L.firstName}」から始まったあなたの系統は、${L.deathCause.includes('背景') ? '数を減らし続けて' : `「${L.deathCause}」で`}姿を消しました。`;
    }
    $('r-lead').textContent = lead;
    $('r-cap').textContent = R.ending.desc;
    const span = L.bornYa - endYa;
    const rows = [
      ['生まれた', `${fmtAgo(L.bornYa)}（地球時計 ${fmtClock(L.bornYa)}）`],
      [alive ? '今' : '絶滅した', alive ? '24:00' : `${fmtAgo(endYa)}（地球時計 ${fmtClock(endYa, clockDecFor(endYa))}）`],
      ['続いた期間', `${fmtYears(span)}年（地球時計で${fmtSec(span / S * DAY)}）`],
      ['いちばん多いときの種の数', L.maxN >= evo.CAP ? `${evo.CAP}種以上` : `${Math.round(L.maxN)}種`],
      ['最後の姿', L.name === evo.PLANS[L.plan].name ? L.name : `${L.name}（${evo.PLANS[L.plan].name}）`],
    ];
    const st = $('r-stats'); st.textContent = '';
    rows.forEach(([k, v]) => { const li = document.createElement('li'); li.innerHTML = '<span></span><span class="val"></span>'; li.children[0].textContent = k; li.children[1].textContent = v; st.appendChild(li); });
    const path = $('r-path'); path.textContent = '';
    if (!L.path.length) { const li = document.createElement('li'); li.textContent = '分かれ道に出会う前に、物語が終わった'; path.appendChild(li); }
    L.path.forEach((s) => { const li = document.createElement('li'); li.textContent = `${fmtAgo(s.ya)}：${s.label}`; path.appendChild(li); });
    const rv = $('r-rivals'); rv.textContent = '';
    P.rivals.forEach((Rv) => {
      const li = document.createElement('li');
      li.innerHTML = '<span></span><span class="st"></span>';
      li.children[0].textContent = Rv.firstName === Rv.name ? Rv.name : `${Rv.firstName} → ${Rv.name}`;
      li.children[1].textContent = rivalStatus(Rv);
      li.children[1].className = `st ${Rv.alive ? 'live' : 'dead'}`;
      rv.appendChild(li);
    });
    const card = drawCard(L, alive, endYa);
    $('r-img').src = card.toDataURL('image/png');
    $('r-save').hidden = EMBEDDED;
    $('r-hint').hidden = !EMBEDDED;
    const data = resultData(L, alive, endYa);
    histAdd(data);
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
    const sc = document.createElement('canvas'); sc.width = PW; sc.height = PH;
    const es = endScene(alive, endYa, L.plan, L.habitat, L.deathCause);
    drawScene(sc.getContext('2d'), es.ya, 3, es);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(sc, 24, 24, PW * 6, PH * 6);
    const fit = (text, weight, size, min, maxW) => {
      ctx.font = `${weight} ${size}px ${FONT}`;
      while (ctx.measureText(text).width > maxW && size > min) { size -= 1; ctx.font = `${weight} ${size}px ${FONT}`; }
    };
    ctx.textBaseline = 'alphabetic'; ctx.textAlign = 'left';
    ctx.fillStyle = '#9fb0c8'; ctx.font = `800 24px ${FONT}`;
    ctx.fillText(`進化ガチャ｜結末 No.${String(es.ending.no).padStart(2, '0')} / ${evo.ENDINGS.length}`, 28, 450);
    const label = alive ? '今も生きている' : '絶滅';
    ctx.font = `900 22px ${FONT}`;
    const bw = ctx.measureText(label).width + 24;
    ctx.fillStyle = alive ? '#2f8a5a' : '#c8402f'; roundRect(ctx, 28, 474, bw, 36, 8); ctx.fill();
    ctx.fillStyle = '#ffffff'; ctx.fillText(label, 40, 500);
    const main = `「${es.ending.title}」`;
    fit(main, 900, 48, 28, 1150 - bw - 20);
    ctx.fillText(main, 28 + bw + 10, 511);
    const sub = alive
      ? `${fmtAgo(L.bornYa)}に「${L.firstName}」として生まれ、${L.name}として今日まで`
      : `${fmtAgo(L.bornYa)}に「${L.firstName}」として生まれ、${fmtAgo(endYa)}に${L.name}として絶滅`;
    ctx.fillStyle = '#ffb48f'; fit(sub, 800, 26, 18, 1150);
    ctx.fillText(sub, 28, 560);
    ctx.fillStyle = '#7f8ea6'; ctx.font = `700 20px ${FONT}`;
    ctx.fillText('地球の24時間  #地球の24時間 #進化ガチャ', 28, 604);
    return cv;
  }
  // 1回の人生（系統）の記録。シェアのリンクにも、履歴にも同じ形で使う
  function resultData(L, alive, endYa) {
    return { v: 1, b: Math.round(L.bornYa), f: L.firstName, n: L.name, p: L.plan, h: L.habitat, a: alive ? 1 : 0, e: Math.round(endYa), k: L.path.map((x) => x.label), c: alive ? '' : L.deathCause };
  }
  function cleanData(d) {
    if (!d || d.v !== 1 || !evo.PLANS[d.p] || !(d.b > 0 && d.b <= S) || !(d.e >= 0 && d.e <= d.b)) return null;
    const str = (x, n) => String(x || '').slice(0, n);
    return { v: 1, b: d.b, e: d.e, a: d.a ? 1 : 0, f: str(d.f, 40), n: str(d.n, 40), p: d.p, h: str(d.h, 10), c: str(d.c, 60), k: (Array.isArray(d.k) ? d.k : []).slice(0, 20).map((x) => str(x, 40)) };
  }
  function shareTextFrom(d) {
    const e = evo.endingOf(d);
    const body = d.a
      ? `${fmtAgo(d.b)}に「${d.f}」として生まれ、${d.k.length}回の分かれ道を選んで、${d.n}として今日まで生き残った。`
      : `${fmtAgo(d.b)}に「${d.f}」として生まれ、${fmtAgo(d.e)}、${d.n}として絶滅した。`;
    return `${body}\n${endingLabel(e)}\n#地球の24時間 #進化ガチャ`;
  }
  // 結果をリンクに埋め込む（#r=...）。開いた人には、この結果と「あなたも生まれてみる」が出る
  const b64 = (str) => btoa(unescape(encodeURIComponent(str))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  const unb64 = (str) => decodeURIComponent(escape(atob(str.replace(/-/g, '+').replace(/_/g, '/'))));
  function shareUrlFrom(d) {
    if (EMBEDDED || !/^https?:/.test(location.protocol)) return '';
    const { v, b, f, n, p, h, a, e, k, c } = d;
    return `${location.origin}${location.pathname}#r=${b64(JSON.stringify({ v, b, f, n, p, h, a, e, k, c }))}`;
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
    try { await navigator.clipboard.writeText(R.share.url); $('r-copy-ok').textContent = 'リンクをコピーしました'; }
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
    const alive = list.filter((d) => d.a).length;
    const longest = list.reduce((m, d) => (d.b - d.e > m.b - m.e ? d : m), list[0]);
    $('hist-sum').textContent = `これまで${list.length}回生まれ、${alive}回は今日まで生き残りました（生存率${Math.round(alive / list.length * 100)}%）。いちばん長く続いたのは「${longest.f}」からの系統（${fmtYears(longest.b - longest.e)}年）。`;
    list.forEach((d) => {
      const li = document.createElement('li');
      const b = document.createElement('button');
      b.innerHTML = '<span class="tag"></span><span class="hn"><span class="hm"></span><span class="hs"></span></span>';
      const tag = b.querySelector('.tag');
      tag.textContent = d.a ? '生存' : '絶滅';
      tag.classList.add(d.a ? 'alive' : 'dead');
      b.querySelector('.hm').textContent = `「${evo.endingOf(d).title}」 ${d.f === d.n ? d.n : `${d.f} → ${d.n}`}`;
      b.querySelector('.hs').textContent = `${fmtAgo(d.b)}〜${d.a ? '今' : fmtAgo(d.e)}・分かれ道${d.k.length}回・${fmtDate(d.t)}`;
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
        const cv = document.createElement('canvas'); cv.width = PW; cv.height = PH;
        const last = list.find((h) => evo.endingOf(h).id === e.id);
        const st = endScene(!!last.a, last.e, last.p, last.h, last.c);
        drawScene(cv.getContext('2d'), st.ya, 3, st);
        b.appendChild(cv);
        b.addEventListener('click', () => openHist(last));
      } else {
        const ph = document.createElement('div'); ph.className = 'zk-lock'; ph.textContent = '？';
        b.appendChild(ph);
        b.disabled = true;
      }
      const cap = document.createElement('span');
      cap.textContent = has ? `${String(e.no).padStart(2, '0')} ${e.title}` : `${String(e.no).padStart(2, '0')} ${e.alive ? (e.alt ? 'もしもの生存' : '生き残る') : '絶滅'}`;
      if (e.alt) b.classList.add('alt');
      b.appendChild(cap);
      box.appendChild(b);
    });
  }
  function openHist(d) {
    HD.d = d;
    HD.st = endScene(d.a, d.e, d.p, d.h, d.c);
    $('hd-ending').textContent = `${endingLabel(HD.st.ending)}：${HD.st.ending.desc}`;
    const t = $('hd-ttl');
    t.textContent = d.a ? '今も生きている' : '絶滅';
    t.className = `ttl ${d.a ? 'alive' : 'dead'}`;
    $('hd-text').textContent = d.a
      ? `${fmtAgo(d.b)}に「${d.f}」として生まれ、${d.k.length}回の分かれ道を選んで、${d.n}として今日まで生き残りました。今の子孫：${evo.PLANS[d.p].today}。`
      : `${fmtAgo(d.b)}に「${d.f}」として生まれ、${fmtAgo(d.e)}、${d.n}として絶滅しました${d.c && !d.c.includes('背景') ? `（${d.c}）` : ''}。続いた期間は${fmtYears(d.b - d.e)}年。`;
    const ol = $('hd-path'); ol.textContent = '';
    d.k.forEach((x) => { const li = document.createElement('li'); li.textContent = x; ol.appendChild(li); });
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
    try { await navigator.clipboard.writeText(url); $('hd-copy-ok').textContent = 'リンクをコピーしました'; }
    catch (e) { $('hd-copy-ok').textContent = url; }
  });
  let clearArmed = 0;
  $('hist-clear').addEventListener('click', () => {
    if (Date.now() - clearArmed > 4000) { clearArmed = Date.now(); $('hist-clear').textContent = 'もう一度押すと、すべての記録を消します'; return; }
    histSave([]); clearArmed = 0; $('hist-clear').textContent = '記録をすべて消す';
    $('hist-detail').hidden = true; HD.st = null;
    renderHist();
  });

  // シェアされた結果を表示する
  const SH = { st: null };
  sceneView($('s-scene'), () => SH.st);
  function showShared(d) {
    SH.st = endScene(d.a, d.e, d.p, d.h, d.c);
    $('s-ending').textContent = `${endingLabel(SH.st.ending)}：${SH.st.ending.desc}`;
    const t = $('s-ttl');
    t.textContent = d.a ? '今も生きている' : '絶滅';
    t.className = `ttl ${d.a ? 'live' : 'dead'}`;
    $('s-text').textContent = d.a
      ? `${fmtAgo(d.b)}に「${d.f}」として生まれ、${d.k.length}回の分かれ道を選んで、${d.n}として今日まで生き残りました。`
      : `${fmtAgo(d.b)}に「${d.f}」として生まれ、${fmtAgo(d.e)}、${d.n}として絶滅しました${d.c && !d.c.includes('背景') ? `（${d.c}）` : ''}。`;
    const ol = $('s-path'); ol.textContent = '';
    d.k.forEach((x) => { const li = document.createElement('li'); li.textContent = x; ol.appendChild(li); });
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

  /* ---------- 起動 ---------- */
  homeInit();
  liveTick();
  requestAnimationFrame(homeLoop);
  renderHist();
  const shared = readShared();
  if (shared) showShared(shared);
  if (location.hash === '#clock') show('home');
  else if (location.hash === '#now') show('now');
})();
