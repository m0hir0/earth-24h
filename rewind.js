/* 地球の24時間 — 地球をさかのぼる
   下へスクロールすると時間がさかのぼる。画面にはいつも「今（いちばん上）」から「あなたのいる時点（いちばん下）」までが入る。
   なので進むほど縮尺がなめらかに変わり、上にあるもの（人の一生、ホモ・サピエンス、恐竜のあと…）は細く縮んでいく。
   ×100 のような区切りは置かない（途中で単位を変えない、ユーザー判断）。前半は倍率、後半は地球時計の進み方がそろうように配分（refAt）。
   いちばん下（46億年前）から「今へ戻る」で一気に駆け上がり、最後にあなたの街 → 地球 → 宇宙の小さな点へと引いていく */
(function () {
  'use strict';
  const E = window.E24;
  const { T, S, DAY, fmtAgo, fmtClock, fmtSec, clockDecFor, ERAS, eraOf } = E;
  const { drawScene, CW, CH, sceneView } = E.scenes;
  const $ = (id) => document.getElementById(id);
  const REDUCE = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  // 時計が指す高さ：画面の上から55%。出来事の名前が大きい字から小さい字に変わるところで、自然と目で追っている所（ユーザーの指摘）。
  // 画面の底（D）はその先＝ D = RY / REF。最後は RY が46億年前に届き、その下は「地球が生まれる前」
  const REF = 0.55;
  // スクロールと縮尺：画面 x 枚目で、時計の年が RY。x = f(RY) − f(はじめ)、はじめの画面の底＝1年
  //   ZA：1枚ごとに同じ倍率で遠ざかる。ZC：最初の100年あまり（飛行機の初飛行のころまで）はそれよりゆっくり（文字が重ならないように、ユーザーの要望）。
  //   ZB：後半は1枚ごとに地球時計が同じだけ（約45分）進む。前は区間ごとに倍率を決めていて、中盤はもっさり・終盤は急に速かった（ユーザーの指摘）
  const ZA = 1.09, ZC = 1.0, ZT = 100, ZB = 29.8;
  const f = (r) => (ZA + ZC) * Math.log(r) - ZC * 0.5 * Math.log(1 + (r / ZT) ** 2) + ZB * r / S;
  const R0 = REF * 1, SCREENS = f(S) - f(R0);
  const refAt = (u) => {                                               // u：0〜1（ズームの区間の中の位置）→ 時計の年
    const x = Math.min(1, Math.max(0, u)) * SCREENS + f(R0);
    let lo = Math.log(R0), hi = Math.log(S);
    for (let k = 0; k < 50; k++) { const m = (lo + hi) / 2; if (f(Math.exp(m)) < x) lo = m; else hi = m; }
    return Math.exp((lo + hi) / 2);
  };
  // 並べる出来事（data.js の EVENTS の key）
  const KEYS = ['ChatGPT公開', '新型コロナのパンデミック', 'スマートフォン', 'ワールド・ワイド・ウェブ', '人類、月に立つ', 'コンピュータの誕生', '第二次世界大戦',
    'ペニシリンの発見', '第一次世界大戦', '飛行機の初飛行',
    '産業革命', 'コロンブス、アメリカ到達', '釈迦・孔子・ソクラテス', 'ピラミッド', '文字の誕生', '農耕の始まり', '最古級の洞窟壁画', '出アフリカ',
    'ホモ・サピエンスの誕生', '火を使った確かな証拠', 'ルーシー', '人類の祖先（サヘラントロプス）', '類人猿の祖先', '霊長類の祖先', '恐竜の絶滅',
    'ティラノサウルスとトリケラトプス', '花を咲かせる植物', '恐竜の出現', 'ペルム紀末の大量絶滅', 'ティクターリク', '植物が陸に上がる', 'カンブリア爆発',
    'エディアカラ生物群', '全球凍結（スターティアン氷期）', '多細胞生物が増えはじめる', '最古級の多細胞の藻類', '「退屈な10億年」のまっただ中', '真核生物の出現',
    '大酸化イベント', 'ストロマトライトの化石', '生命の誕生', '海ができる', '月の誕生', '地球誕生'];
  const EV = new Map(E.EVENTS.map((e) => [e.key, e]));
  const EVS = KEYS.map((k) => EV.get(k)).filter(Boolean).sort((a, b) => a.ya - b.ya);
  // あなた自身の時間（金色の名前）。いちばん最初の画面で「自分のこと」と思ってもらうために
  const today = new Date(), Y0 = today.getFullYear();
  const yearNow = Y0 + (today - new Date(Y0, 0, 1)) / (365.25 * 864e5);
  const sinceNewYear = yearNow - Y0;                                   // この前のお正月は何年前か（端末の日付）
  const MINE = [[1 / 12, '先月'], [1, '1年前の今日'], [yearNow - (Y0 - 1 + 358.5 / 365.25), '去年のクリスマス'], [5, '5年前のあなた'], [10, '10年前のあなた'],
    [20, '20年前のあなた'], [70, '祖父母が子どもだったころ'], [105, '今生きている人は、まだほぼ誰もいない']];
  if (sinceNewYear > 0.14 && sinceNewYear < 0.94) MINE.push([sinceNewYear, 'この前のお正月']);   // 先月・1年前と重なる時期は出さない
  const ALL_MINE = MINE.map(([ya, name]) => ({ ya, name: T(name), mine: true }));
  // みんなが知っている出来事（「そうだったよね」と思える、暮らしの中の出来事）。[西暦, 名前, jp＝日本語のときだけ]
  const MEMO = [
    [2021.55, '東京オリンピック（2021年）', 'jp'], [2019.33, '令和のはじまり', 'jp'], [2005.1, 'YouTubeのはじまり'], [2000.0, '2000年（ミレニアム）'],
    [1998.7, 'Googleの誕生'], [1996.15, 'ポケモン（赤・緑）'], [1995.65, 'Windows 95'], [1989.86, 'ベルリンの壁の崩壊'], [1989.02, '平成のはじまり', 'jp'],
    [1985.7, 'スーパーマリオブラザーズ'], [1979.5, 'ウォークマン'], [1964.8, '東京オリンピックと新幹線', 'jp'], [1953.1, 'テレビ放送のはじまり', 'jp'],
  ].filter((m) => !m[2] || E.LANG === 'ja').map(([y, name]) => ({ ya: yearNow - y, name: T(name) }));
  // さかのぼると、「退屈な10億年」には新しい側（8億年前）から入る。data.js の17.5億年前（はじまり）では、通り過ぎたあとに名前が出てしまう
  MEMO.push({ ya: 8e8, name: T('「退屈な10億年」に入る') });
  const ALL = [...EVS, ...MEMO, ...ALL_MINE].sort((a, b) => a.ya - b.ya);
  // 長い空白に出す静かな一言（その時代のようす。古い順に当てはまるものを使う）
  const QUIET = [
    [4.4e9, ['まだ、海もありません。', 'とけた岩と、熱い空。']],
    [3.8e9, ['まだ、生き物はいません。', '海と岩と、空だけ。']],
    [2.4e9, ['海の中に、小さな細胞だけ。', 'まだ、空に酸素はありません。']],
    [5.4e8, ['まだ、目に見える生き物はいません。', '海の中に、小さな細胞だけ。', '何も起きないまま、時間だけが流れていきます。']],
  ];
  const quietOf = (ya, n) => { for (const [from, list] of QUIET) if (ya >= from) return T(list[n % list.length]); return ''; };

  $('r-home').textContent = T('← 地球の24時間');
  const other = E.LANG === 'ja' ? 'en' : 'ja';
  $('r-lang').textContent = other === 'en' ? 'English' : '日本語';
  $('r-lang').addEventListener('click', () => E.setLang(other));
  if (E.LANG === 'en') document.title = T('地球をさかのぼる | 地球の24時間');
  try { localStorage.removeItem('earth24.birthYear'); } catch (e) { /* 生まれた年の入力は廃止 */ }

  // 地球時計：24:00 にごく近いときは、小数を並べるかわりに「24:00の19マイクロ秒前」
  const clockOf = (ya) => {
    if (ya <= 0) return '24:00:00';
    const left = (ya / S) * DAY;
    return left < 1e-3 ? T('24:00の{s}前', { s: fmtSec(left) }) : fmtClock(ya, clockDecFor(ya));
  };
  const digitsOf = (ya) => {                                          // 上の時計は数字のまま（23:59:59.999981）。0が並ぶところまで見せる
    const left = (ya / S) * DAY;
    return left > 0 && left < 1e-3 ? Math.min(9, Math.ceil(-Math.log10(left)) + 1) : clockDecFor(ya);
  };
  const LOC = E.LANG === 'en' ? 'en-US' : 'ja-JP';
  const agoOf = (ya) => {                                              // 「西暦26年」ではなく「2,000年前」。1年より近いときは月・日で
    if (ya < 1 / 12 - 1e-9) return T('{n}日前', { n: Math.max(1, Math.round(ya * 365)) });
    if (ya < 1 - 1e-9) return T('{n}か月前', { n: Math.round(ya * 12) });
    const n = ya < 100 ? Math.round(ya * 10) / 10 : Math.round(ya);    // 小数は100年まで
    if (n === 1) return T('1年前');
    if (ya < 1e4) return T('{n}年前', { n: n.toLocaleString(LOC) });
    return fmtAgo(ya);
  };

  // はじめと、戻ってきたとき
  function intro(final) {
    if (!final) {
      return `<div class="kick">${esc(T('24:00 — 今'))}</div><div class="big">${esc(T('あなたは今、\n46億年の\nいちばん先にいます。'))}</div>
        <p class="body">${esc(T('下へスクロールすると、時間がさかのぼります。画面にはいつも、今から、あなたのいる時点までが入ります。'))}</p>
        <div class="hint">${esc(T('↓ 下へスクロール'))}</div>`;
    }
    return `<div class="final"><div class="kick">${esc(T('24:00 — 今'))}</div><div class="big">${esc(T('おかえりなさい。'))}</div>
      <p class="body">${esc(T('46億年をさかのぼって、また今に戻ってきました。人類の歴史は、地球時計の最後の5.6秒。'))}${esc(T('人の一生（100年）は、そのまた最後の{s}。', { s: fmtSec(100 / S * DAY) }))}</p>
      <p class="body"><b>${esc(T('そのいちばん先に、今、あなたがいます。'))}</b></p>
      <div class="actions" id="fin-actions"></div></div>`;
  }
  $('intro').innerHTML = intro(false);
  $('outro').innerHTML = `<div class="kick">${esc(T('0:00 — 46億年前'))}</div><div class="big">${esc(T('ここで、地球が生まれました。'))}</div>
    <div class="actions"><button class="btn main" type="button" id="go-now"></button></div>`;
  $('go-now').textContent = T('今へ戻る（46億年を一気に）');
  $('go-now').addEventListener('click', backToNow);

  // ズームの区間：高さ＝画面 SCREENS 枚＋見える高さ。中の .stage が上に貼りついたまま、縮尺だけが変わる
  const zoomer = $('zoomer'), stageEl = $('stage'), cv = $('tl'), ctx = cv.getContext('2d');
  let hudH = 100, W = 360, Ht = 500, dpr = 1, D = 1, RY = REF, U = 0;
  sceneView($('now-scene'), () => ({ ya: Number(RY.toPrecision(2)), fx: Math.abs(RY - 6.6e7) < 1.2e6 ? 'impact' : null }));   // 年は丸めて、スクロールのたびに描き直さない
  function layout() {
    hudH = document.querySelector('.hud').offsetHeight;
    const vh = window.innerHeight;
    stageEl.style.top = `${hudH}px`;
    stageEl.style.height = `${vh - hudH}px`;
    zoomer.style.height = `${SCREENS * vh + (vh - hudH)}px`;
    dpr = Math.min(2, window.devicePixelRatio || 1);
    W = cv.clientWidth; Ht = cv.clientHeight;
    cv.width = Math.round(W * dpr); cv.height = Math.round(Ht * dpr);
  }
  // 今のスクロールから、ズームの位置 U と画面の底の年 D
  function where() {
    const start = zoomer.offsetTop - hudH, len = zoomer.offsetHeight - (window.innerHeight - hudH);
    U = Math.min(1, Math.max(0, (window.scrollY - start) / Math.max(1, len)));
    RY = refAt(U); D = RY / REF;
    return window.scrollY < start ? 'intro' : window.scrollY > start + len + 40 ? 'outro' : 'zoom';
  }
  const css = getComputedStyle(document.documentElement);
  const COL = Object.fromEntries(['gold', 'muted', 'text', 'bg'].map((n) => [n, css.getPropertyValue(`--${n}`).trim()]));
  const niceStep = (x) => {
    if (x < 1) return [1 / 12, 2 / 12, 3 / 12, 6 / 12, 1].find((m) => m >= x) || 1;   // 1年より細かいときは月で
    const p = Math.pow(10, Math.floor(Math.log10(x))), m = x / p;
    return (m < 1.5 ? 1 : m < 3.5 ? 2 : m < 7.5 ? 5 : 10) * p;
  };

  function draw() {
    const at = where();
    hud(at);
    if (document.querySelector('.hud').offsetHeight !== hudH) { layout(); where(); }   // 上の帯の高さが変わったら合わせる
    const g = ctx;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, W, Ht);
    const top = 26, bot = Ht - 10, span = bot - top;
    const Y = (ya) => top + (ya / D) * span;
    const { gold, muted, text, bg } = COL;
    const font = (px, w = 700) => `${w} ${px}px system-ui, -apple-system, "Hiragino Kaku Gothic ProN", "Noto Sans JP", sans-serif`;
    // 左のレール：時代の色
    for (const e of ERAS) {
      if (e.to >= D) continue;
      const y1 = Y(Math.max(e.to, 0)), y2 = Y(Math.min(e.from, D));
      g.fillStyle = e.color; g.fillRect(6, y1, 10, Math.max(1, y2 - y1));
    }
    // 目盛り（縮尺に合わせて、きりのいい年ごとに）
    const step = niceStep(D / 5);
    const ticks = [];                                                  // 数字は、出来事の名前と重ならないところだけ（あとで書く）
    for (let k = 1; k * step < Math.min(D * 0.97, S); k++) {
      const y = Y(k * step);
      g.strokeStyle = 'rgba(170,182,200,.13)'; g.setLineDash([3, 4]); g.beginPath(); g.moveTo(20, y); g.lineTo(W, y); g.stroke(); g.setLineDash([]);
      ticks.push([y, agoOf(k * step)]);
    }
    // 46億年前より下：地球が生まれる前
    if (D > S) {
      const ys = Y(S);
      g.fillStyle = 'rgba(170,182,200,.35)'; g.fillRect(0, ys, W, 1);
      g.font = font(12, 700); g.textAlign = 'left'; g.textBaseline = 'top'; g.fillStyle = muted;
      if (bot - ys > 40) g.fillText(T('地球が生まれる前'), 40, ys + Math.min(60, (bot - ys) / 2));
    }
    // 時計が指している高さ：左に小さな印と、うすい線
    const yr = top + REF * span;
    g.fillStyle = 'rgba(255,216,74,.10)'; g.fillRect(20, yr, W - 20, 1);
    g.fillStyle = gold; g.beginPath(); g.moveTo(0, yr - 5); g.lineTo(5, yr); g.lineTo(0, yr + 5); g.fill();
    // いちばん上：今
    g.fillStyle = gold; g.fillRect(0, top - 1, W, 2);
    g.font = font(12, 900); g.textAlign = 'left'; g.textBaseline = 'bottom'; g.fillText(T('24:00 — 今'), 40, top - 4);
    const used = [];                                                   // 文字を置いた高さ（重ならないように）
    const free = (a, b) => used.every(([p, q]) => b < p || a > q);
    // 文字：うしろの目盛りの数字を隠すように、地の色を敷いてから
    const label = (str, y, f, color, alpha, h) => {
      g.font = f; g.textBaseline = 'middle'; g.textAlign = 'left';
      g.globalAlpha = 1; g.fillStyle = bg; g.fillRect(37, y - h / 2, g.measureText(str).width + 6, h);
      g.globalAlpha = alpha; g.fillStyle = color; g.fillText(str, 40, y);
    };
    // 出来事：点はいつも本当の位置に。名前は下（いま通り過ぎているところ）から順に、重ならないものだけ
    const vis = ALL.filter((e) => e.ya <= D);
    for (const e of vis) { g.fillStyle = e.mine ? gold : text; g.beginPath(); g.arc(11, Y(e.ya), 3.2, 0, Math.PI * 2); g.fill(); }
    let lowest = bot;
    for (let i = vis.length - 1; i >= 0; i--) {
      const e = vis[i], y = Y(e.ya), near = (y - top) / span;       // near：1 に近いほど画面の下（いま通り過ぎている）
      if (y - top < 14) break;                                          // 上に押し縮められたものは点だけ
      const big = near > REF, hh = big ? 36 : 18;                      // 時計の線より下（これから通る）は大きく
      const ly = Math.min(y, lowest - hh / 2 - 4, bot - hh / 2 + 4);
      if (ly - hh / 2 < top + 4 || !free(ly - hh / 2, ly + hh / 2)) continue;
      used.push([ly - hh / 2, ly + hh / 2]); lowest = ly - hh / 2;
      const a = big ? 1 : 0.55;
      g.globalAlpha = a; g.strokeStyle = muted; g.beginPath(); g.moveTo(15, y); g.lineTo(36, ly - (big ? 8 : 0)); g.stroke();
      label(e.name, ly - (big ? 8 : 0), font(big ? 15.5 : 13, big ? 800 : 700), e.mine ? gold : text, a, big ? 20 : 16);
      if (big) label(`${T('地球時計 {c}', { c: clockOf(e.ya) })}　${agoOf(e.ya)}`, ly + 10, font(11.5, 500), muted, 1, 15);
      g.globalAlpha = 1;
    }
    g.font = font(10.5, 500); g.textAlign = 'right'; g.textBaseline = 'bottom'; g.fillStyle = muted;
    for (const [y, str] of ticks) if (free(y - 14, y)) g.fillText(str, W - 2, y - 2);
    g.textAlign = 'left';
    // 下の絵：いま画面の底にいる時代の地球。長い空白には静かな一言
    const last = vis.length ? vis[vis.length - 1].ya : 0;              // 画面2.5枚ぶん、何も通り過ぎていなければ
    const quiet = RY >= 5.4e8 && last < refAt(Math.max(0, U - 2.5 / SCREENS)) / REF ? quietOf(RY, Math.floor(U * 18)) : '';
    $('now-cap').textContent = quiet;
  }

  // 上の時計：画面の底（あなたのいる時点）の時刻
  function hud(at) {
    const ya = at === 'intro' ? 0 : at === 'outro' ? S : RY;
    $('h-stage').textContent = at === 'intro' ? '' : eraOf(Math.max(ya, 1)).name;
    const c = T('地球時計 {c}', { c: ya < 0.5 ? '24:00:00' : fmtClock(ya, digitsOf(ya)) });
    $('h-clock').textContent = c;
    $('h-clock').classList.toggle('long', c.length > 24);              // 英語で桁が多いときは1行に収まるよう小さく
    $('h-ago').textContent = ya < 0.5 ? T('今') : agoOf(ya);
    $('h-bar').style.width = `${(ya / S) * 100}%`;
    $('h-pct').textContent = T('46億年の{p}%', { p: pctOf(ya) });
    if (au && au.on) au.amb.setDepth(depthOf());                      // 深くなるほど低く、今へ戻ると上がっていく
  }
  const depthOf = () => (where() === 'intro' ? 0 : U);

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
  const redraw = () => { if (ticking) { ticking = false; draw(); } };
  window.addEventListener('scroll', () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(redraw);
    setTimeout(redraw, 120);                                           // 描き直しの合図が来ないとき（裏のタブなど）の控え
  }, { passive: true });
  let lastW = window.innerWidth, lastH = window.innerHeight;
  window.addEventListener('resize', () => {
    if (Math.abs(window.innerWidth - lastW) < 2 && Math.abs(window.innerHeight - lastH) < 120) return;   // スマホのアドレスバーの出入りでは作り直さない
    lastW = window.innerWidth; lastH = window.innerHeight;
    layout(); draw();
  });

  // いちばん下から、今へ一気に戻る（時計が 0:00 から 24:00 へ駆け上がり、縮んでいたものがまた広がる）
  function backToNow() {
    const from = window.scrollY, dur = REDUCE ? 400 : 7000, t0 = performance.now();
    const ease = (k) => (k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2);
    const step = () => {
      const k = Math.min(1, (performance.now() - t0) / dur);
      window.scrollTo(0, from * (1 - ease(k)));
      draw();
      if (k < 1) setTimeout(step, 16);
      else { finish(); pullback(); }
    };
    step();
  }
  function finish() {
    $('intro').innerHTML = intro(true);
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

  hud('intro');
  layout();
  draw();
})();

