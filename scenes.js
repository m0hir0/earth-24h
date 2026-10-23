/* 地球の24時間 v2 — ドット絵の風景（192×64 の座標で、2倍の細かさ 384×128 に描いて拡大表示） */
(function () {
  'use strict';
  const E = window.E24;
  const { NOW, ago } = E;
  /* ============================================================
     ドット絵の風景（192×64 で描いて拡大表示）
     ============================================================ */
  const PW = 192, PH = 64;                        // 絵の座標（1マス＝「ふつうの点」）
  const K = 2;                                    // 実際の点はその半分の大きさ（一段細かい）

  function painter(ctx, override = null) {
    // 細かい点の単位で塗る
    const raw = (x, y, w, h, c) => { ctx.fillStyle = override || c; ctx.fillRect(x, y, w, h); };
    const P = {
      K,
      rect(x, y, w, h, c) {
        const x0 = Math.round(x * K), y0 = Math.round(y * K);
        raw(x0, y0, Math.round((x + w) * K) - x0, Math.round((y + h) * K) - y0, c);
      },
      raw,
      // 丸。中心のマス (cx, cy) から半径 r マス。細かい点でなめらかに
      disc(cx, cy, r, c) {
        const ox = (cx + 0.5) * K, oy = (cy + 0.5) * K, R = (r + 0.5) * K;
        for (let j = Math.floor(oy - R); j < Math.ceil(oy + R); j++) {
          const d = j + 0.5 - oy; if (Math.abs(d) > R) continue;
          const w = Math.sqrt(R * R - d * d), a = Math.round(ox - w); raw(a, j, Math.round(ox + w) - a, 1, c);
        }
      },
      dome(cx, by, r, c) {
        const ox = (cx + 0.5) * K, oy = (by + 1) * K, R = (r + 0.5) * K;
        for (let j = Math.floor(oy - R); j < oy; j++) {
          const d = j + 0.5 - oy, w = Math.sqrt(Math.max(0, R * R - d * d)), a = Math.round(ox - w); raw(a, j, Math.round(ox + w) - a, 1, c);
        }
      },
      tri(cx, base, h, c, slope = 1) {           // 山・ピラミッド・屋根
        const ox = (cx + 0.5) * K, by = (base + 1) * K;
        for (let j = 0; j < h * K; j++) { const w = ((h - j / K) * slope + 0.5) * K, a = Math.round(ox - w); raw(a, by - 1 - j, Math.round(ox + w) - a, 1, c); }
      },
      bands(colors, y0 = 0, y1 = PH) {
        const h = (y1 - y0) / colors.length;
        colors.forEach((c, i) => P.rect(0, y0 + Math.floor(i * h), PW, Math.ceil(h) + 1, c));
      },
      ridge(base, amp, seed, c, freq = 0.06, x0 = 0, x1 = PW) {
        for (let x = x0; x < x1; x += 1 / K) {
          const h = amp * (0.55 + 0.3 * Math.sin(x * freq + seed) + 0.15 * Math.sin(x * freq * 3.7 + seed * 1.7));
          P.rect(x, Math.round((base - h) * K) / K, 1 / K, PH, c);
        }
      },
      ground(y, c, x0 = 0, x1 = PW) { P.rect(x0, y, x1 - x0, PH - y, c); },
      water(y, c, hi, t, x0 = 0, x1 = PW) {
        P.rect(x0, y, x1 - x0, PH - y, c);
        for (let row = 0; y + 2 + row * 4 < PH; row++) {
          for (let k = 0; k < 16; k++) {
            const x = ((k * 17 + row * 9 + t * (row % 2 ? 0.5 : -0.5)) % (PW + 8) + PW + 8) % (PW + 8) - 4;
            if (x >= x0 && x + 3 <= x1) P.rect(x, y + 2 + row * 4, 3, 1, hi);
          }
        }
      },
      cloud(x, y, c) { P.rect(x, y + 2, 16, 3, c); P.rect(x + 3, y, 7, 2, c); P.rect(x + 9, y + 1, 4, 1, c); },
      clouds(t, c, n = 3, y = 5, speed = 0.15) {
        for (let k = 0; k < n; k++) P.cloud(((k * 71 + t * speed) % (PW + 24)) - 20, y + (k % 2) * 6, c);
      },
      // s: 拡大率（主役の生き物は2）。細かい絵（{d:2, rows}）は1マスが s/2
      sprite(spr, pal, x, y, flip = false, s = 1) {
        const rows = spr.rows || spr, c = s / (spr.d || 1);
        for (let j = 0; j < rows.length; j++) {
          const row = rows[j];
          for (let i = 0; i < row.length; i++) {
            const ch = row[flip ? row.length - 1 - i : i];
            if (ch !== '.') P.rect(x + i * c, y + j * c, c, c, pal[ch] || INK[ch] || pal.a);
          }
        }
      },
    };
    return P;
  }

  const INK = { k: '#1a1a1a', w: '#f4f0e6' };       // 目（k）と歯・白いところ（w）の色
  // 生き物と乗り物（右向き。flip で左向き）
  const SPR = {
    trilo:   ['.aaaaa.', 'abababa', '.aaaaa.', '..b.b..'],
    anomalo: ['...aaaaaaa...', 'bbaaaaaaaaaa.', '..aaaaaaaaaab', 'bbaaaaaaaaaa.', '...aaaaaaa...'],
    fish:    ['a.aaa.', 'aaaaaa', 'a.aaa.'],
    amphib:  ['..aaaa..', 'aaaaaaab', '.a....a.'],
    reptile: ['a.aaaaa..', '.aaaaaaab', '..a...a..'],
    sauro: [
      '.....................aa.', '....................aaab', '....................aa..', '...................aa...',
      '..................aa....', '.................aa.....', '.......aaaaaaa..aa......', '....aaaaaaaaaaaaaa......',
      '..aaaaaaaaaaaaaaa.......', 'aaa..aaaaaaaaaaa........', '.....bb.bb.bb.bb........', '.....bb.bb.bb.bb........',
      '.....bb.bb.bb.bb........'],
    thero: [
      '........aaaaa.', '.......aaaaeaa', '.......aaaaaaa', '.......aaab...', '......aaaa....', '.a...aaaaab...',
      '..aaaaaaaa....', '...aaaaaaa....', '.....a..a.....', '.....a..a.....', '....bb..bb....'],
    pteroA:  ['a.........a', '.aa.....aa.', '...aaaaa...', '.....aaa...'],
    pteroB:  ['...........', '...aaaaa...', '.aaaaaaaaa.', 'a....aa...a'],
    mammal:  ['.......aa', 'aaaaaaaaa', '.aaaaaaa.', '.a.a..a.a'],
    homA:    ['.aa.', '.aa.', 'aaaa', 'aaaa', '.aa.', '.bb.', '.bb.', 'b..b'],
    homB:    ['.aa.', '.aa.', 'aaaa', 'aaaa', '.aa.', '.bb.', '.bb.', '.bb.'],
    hunter:  ['....c', '.aa.c', '.aa.c', 'bbbbc', 'bbbbc', 'bbbbc', '.bb.c', '.bb..', '.b.b.', '.b.b.'],
    mammoth: [
      '....aaaaaaa.....', '..aaaaaaaaaaa...', '.aaaaaaaaaaaaa..', 'aaaaaaaaaaaaaaa.', 'aaaaaaaaaaaaaaaa',
      'aaaaaaaaaaaaa.ab', '.aaaaaaaaaaaa.ab', '.aaaaaaaaaaa..bb', '.aa.aa..aa.aa...', '.aa.aa..aa.aa...', '.aa.aa..aa.aa...'],
    farmer:  ['.aa.', '.aa.', 'bbbb', 'bbbb', '.bb.', '.cc.', '.c.c'],
    car:     ['...aaaaa....', '..abbabba...', 'aaaaaaaaaaaa', 'aaaaaaaaaaaa', '.cc.....cc..'],
    loco: [
      '.aa...........', '.aa......bbbb.', 'aaaaaaaaabddb.', 'aaaaaaaaabbbb.', 'aaaaaaaaaaaaaa', 'aaaaaaaaaaaaaa',
      '.cc.cc..cc.cc.', '.cc.cc..cc.cc.'],
    biplane: ['..aaaaaaa..', 'b.....a....', 'bbbbbbbbbbb', '..aaaaaaa..'],
    jet:     ['.......a...', 'aaaaaaaaaa.', '....aa.....'],
    shark:   ['.......a........', '......aa........', '..aaaaaaaaaaa..a', 'aaaaaaaaaaaaaaaa', '.bbbbbbbbbbbb..a', '.....a..........'],
    armorfish: ['bbbbb.......', 'bbbbbaaaaaa.', 'bbbbbaaaaaaa', '.aaaaaaaaaa.', '.....a..a...'],
    plesio:  ['..............aa', '.............aa.', '....aaaaa...aa..', '..aaaaaaaaaaa...', '.a..a....a......'],
    whale:   ['....aaaaaaaaaaa.....', '..aaaaaaaaaaaaaaa...', 'aaaaaaaaaaaaaaaaaa.a', '.bbbbbbbbbbbbbbbbaaa', '...............a...a'],
    dimetro: ['...a.a.a.a....', '..aaaaaaaaa...', '..abababab....', '.aaaaaaaaaaaa.', 'aaaaaaaaaaaaab', '..a...a...a...'],
    raptor:  ['.......aaa', '......aaab', '......aa..', 'a....aaa..', '.aaaaaaa..', '..aaaaa...', '...a..a...', '..aa.aa...'],
    bird:    ['..aa.', '.aaab', 'aaaa.', '.a.a.'],
    horse:   ['.........aa.', '........aaab', 'aaaaaaaaaa..', 'aaaaaaaaaa..', '.aaaaaaaaa..', '.a.a...a.a..', '.a.a...a.a..', '.b.b...b.b..'],
    primate: ['....aa', '....ab', 'a.aaaa', 'aaaaa.', '.a..a.', '.a..a.'],
  };

  // 小物
  function volcano(P, cx, base, h, t, c) {
    P.tri(cx, base, h, c, 1.5);
    P.rect(cx - 2, base - h, 5, 1, '#ff7a1a');
    for (let dy = 1; dy < h; dy++) {
      P.rect(cx + Math.round(Math.sin(dy * 0.7) * 1.2 + dy * 0.45), base - h + dy, 2, 1, (dy + t) % 4 < 2 ? '#ff7a1a' : '#e0602b');
    }
    for (let k = 0; k < 4; k++) {
      const ph = (t + k * 6) % 24;
      P.disc(cx + Math.round(Math.sin((t + k * 3) * 0.2) * 2) + (ph >> 2), base - h - 3 - ph, 1 + (ph >> 3), 'rgba(70,50,50,0.7)');
    }
  }
  function fire(P, x, base, t) {
    P.rect(x - 3, base - 1, 7, 1, '#5a3a24');
    const f = t % 3;
    P.rect(x - 2, base - 3, 5, 2, '#e0602b');
    P.rect(x - 1, base - 5 - (f === 1 ? 1 : 0), 3, 2, '#ffb347');
    P.rect(x, base - 7 - f, 1, 2, '#ffe39a');
  }
  function smoke(P, x, y, t, c = 'rgba(90,90,90,0.55)', n = 4) {
    for (let k = 0; k < n; k++) { const ph = (t + k * 5) % 20; P.disc(x + (ph >> 2), y - ph, 1 + (ph >> 3), c); }
  }
  function palm(P, x, base, h, c = '#3f6b3a', trunk = '#7a5a3a') {
    P.rect(x, base - h, 2, h, trunk);
    for (let i = 0; i < 6; i++) { P.rect(x - 6 + i, base - h + Math.abs(2 - i) - 1, 1, 1, c); P.rect(x + 2 + i, base - h + Math.abs(3 - i) - 1, 1, 1, c); }
    P.rect(x - 4, base - h - 1, 10, 2, c);
  }
  function fernTree(P, x, base, h, c = '#3e6a3c', trunk = '#5a4a32') {
    P.rect(x, base - h, 2, h, trunk);
    for (let i = 0; i < 4; i++) { const y = base - h + i * 3; P.rect(x - 5 + i, y, 12 - 2 * i, 2, c); }
  }
  function roundTree(P, x, base, h, c = '#4e8a44', trunk = '#6a4a30') {
    P.rect(x, base - h + 4, 2, h - 4, trunk);
    P.disc(x + 1, base - h + 2, 5, c);
    P.disc(x - 2, base - h + 4, 3, c);
  }
  function acacia(P, x, base, h, c = '#5e7a3a', trunk = '#5a4430') {
    P.rect(x, base - h, 1, h, trunk);
    P.rect(x - 2, base - h + 2, 1, 2, trunk); P.rect(x + 2, base - h + 1, 1, 2, trunk);
    P.rect(x - 9, base - h - 1, 19, 2, c); P.rect(x - 6, base - h - 2, 13, 1, c);
  }
  function hut(P, x, base, wall = '#b08a5a', roof = '#7a5a34') {
    P.rect(x, base - 5, 9, 5, wall); P.rect(x + 3, base - 3, 2, 3, '#4a3424');
    P.tri(x + 4, base - 5, 4, roof, 1.4);
  }
  function person(P, x, base, body, phone) {
    P.rect(x, base - 7, 2, 2, '#c9946e'); P.rect(x - 1, base - 5, 4, 3, body); P.rect(x, base - 2, 1, 2, '#3a3a44'); P.rect(x + 1, base - 2, 1, 2, '#3a3a44');
    if (phone) P.rect(x + 2, base - 5, 1, 1, '#9fe3ff');
  }
  function building(P, x, base, w, h, c, win, lit, seed) {
    P.rect(x, base - h, w, h, c);
    const r = seed * 9301;
    for (let yy = base - h + 2; yy < base - 2; yy += 3) {
      for (let xx = x + 1; xx < x + w - 1; xx += 3) {
        const on = ((xx * 7 + yy * 13 + r) % 5) === 0;
        P.rect(xx, yy, 1, 1, on ? lit : win);
      }
    }
  }
  const wrapX = (v, span, pad = 24) => ((v % (span + pad)) + span + pad) % (span + pad) - pad / 2;

  // 時代ごとの風景
  function sceneHadean(P, ya, t) {
    P.bands(['#2b1016', '#43151a', '#5e1c1a', '#7c2a1b', '#9b3a1d', '#b9531f']);
    if (ya <= 4.5e9) { P.disc(152, 15, 10, '#cdb9a0'); P.disc(149, 12, 2, '#b29c82'); P.disc(156, 18, 2, '#b29c82'); P.disc(153, 8, 1, '#b29c82'); }
    for (let k = 0; k < 3; k++) {
      const ph = (t * 2 + k * 31) % 70, mx = 18 + k * 58 + ph, my = -4 + ph * 0.7;
      if (my < 40) { P.rect(mx, my, 2, 2, '#fff1c2'); P.rect(mx - 3, my - 2, 3, 1, '#ffb35a'); P.rect(mx - 6, my - 4, 3, 1, '#e0602b'); }
    }
    P.ridge(46, 8, 1.3, '#3a1c1a', 0.05);
    volcano(P, 46, 47, 20, t, '#2e1714');
    volcano(P, 128, 48, 14, t + 7, '#2e1714');
    if (ya <= 4.0e9) {
      P.water(48, '#3a2f36', '#5a4a52', t);
      for (let k = 0; k < 5; k++) { const ph = (t + k * 5) % 16; P.rect(14 + k * 38 + (ph >> 2), 47 - ph, 2, 2, 'rgba(230,220,220,0.3)'); }
    } else {
      P.ground(48, '#24120f');
      for (let k = 0; k < 9; k++) {
        const x = k * 22 + 4, y = 51 + (k * 7) % 11;
        P.rect(x, y, 10, 1, (t + k) % 6 < 3 ? '#ff7a1a' : '#ffb347'); P.rect(x + 4, y + 1, 5, 1, '#e0602b');
      }
    }
  }

  function sceneArchean(P, ya, t, oxy) {
    P.bands(oxy ? ['#93b3c6', '#a6c0cc', '#b9cbcf', '#cbd5d2', '#dcdfd6'] : ['#c98a4f', '#d49a5e', '#dda96f', '#e5b883', '#ecc79a']);
    P.disc(30, 13, 6, oxy ? '#fff4d6' : '#fbe3b0');
    if (oxy) P.clouds(t, '#eef2f2', 2, 6, 0.1);
    P.ridge(40, 11, 2.1, oxy ? '#8f7464' : '#7d5f4c', 0.05);
    P.ground(44, oxy ? '#7a5546' : '#6b5244', 0, 96);
    // 岩
    for (let k = 0; k < 6; k++) P.dome(8 + k * 15, 46 + (k % 3) * 5, 3 + (k % 2) * 2, oxy ? '#8e5a45' : '#5a4436');
    if (oxy) for (let y = 47; y < 64; y += 3) P.rect(0, y, 90, 1, '#a4523c');   // 赤い縞（縞状鉄鉱層）
    P.water(45, oxy ? '#4a7f97' : '#5d7a74', oxy ? '#79a9bd' : '#86a199', t, 96, PW);
    P.rect(92, 44, 8, PH - 44, oxy ? '#b9a084' : '#a68d70');                 // 砂浜
    if (ya < 3.5e9) for (let k = 0; k < 6; k++) P.dome(108 + k * 14, 50 + (k % 2) * 3, 3 + (k % 3), oxy ? '#5f7d6a' : '#6d7a5e');
  }

  function sceneProterozoic(P, t, inset = true) {
    P.bands(['#86b6d6', '#9cc3db', '#b2d0de', '#c7dbdf']);
    P.clouds(t, '#f4f7f8', 3, 6, 0.12);
    P.ridge(40, 10, 0.8, '#8b7563', 0.05);
    P.ground(44, '#7b6453', 0, 90);
    for (let k = 0; k < 5; k++) P.dome(10 + k * 17, 46 + (k % 2) * 6, 3, '#5f4c40');
    P.rect(88, 44, 8, PH - 44, '#b9a487');
    P.water(45, '#3f7c8a', '#6aa3ae', t, 96, PW);
    if (!inset) return;
    // 顕微鏡の窓（細胞）
    const cx = 150, cy = 24, r = 15;
    P.disc(cx, cy, r + 2, '#33413f');
    P.disc(cx, cy, r, '#d7ecd9');
    for (let k = 0; k < 4; k++) {
      const a = t * 0.08 + k * 1.6, x = cx + Math.round(Math.cos(a) * (k ? 8 : 0)), y = cy + Math.round(Math.sin(a) * (k ? 6 : 0));
      P.disc(x, y, 4, '#9cc9a4'); P.disc(x, y, 1, '#4e7f5a');
    }
    P.rect(cx + r - 2, cy + r - 2, 6, 3, '#33413f');
  }

  function sceneUnderwater(P, t, kind) {
    P.bands(['#2a6f95', '#25658a', '#205a7c', '#1b4f6d', '#17445f', '#133a52']);
    for (let k = 0; k < 5; k++) for (let y = 0; y < 46; y += 1) P.rect(10 + k * 42 + y * 0.35, y, 2, 1, 'rgba(255,255,255,0.05)');
    P.ridge(56, 4, 0.7, '#c2ae84', 0.09);
    P.ground(58, '#ad9a74');
    for (let k = 0; k < 6; k++) { const ph = (t + k * 7) % 40; P.rect(20 + k * 31 + Math.round(Math.sin((t + k) * 0.3)), 52 - ph, 1, 1, 'rgba(220,240,255,0.6)'); }
    if (kind === 'algae') {
      for (let k = 0; k < 12; k++) {
        const x = 8 + k * 16, h = 6 + (k % 4) * 3;
        for (let y = 0; y < h; y++) P.rect(x + Math.round(Math.sin(y * 0.5 + t * 0.25 + k) * 1.2), 56 - y, 1, 1, '#4f8a5a');
      }
      for (let k = 0; k < 5; k++) P.dome(20 + k * 38, 57, 3, '#6a9a6a');
    } else if (kind === 'ediacara') {
      for (let k = 0; k < 9; k++) {
        const x = 10 + k * 21, h = 8 + (k % 3) * 4;
        for (let y = 0; y < h; y++) {
          const sway = Math.round(Math.sin(y * 0.3 + t * 0.2 + k) * 1);
          P.rect(x + sway - 1, 56 - y, 3, 1, y % 2 ? '#d29a72' : '#b9805c');
        }
      }
      for (let k = 0; k < 6; k++) { P.disc(16 + k * 33, 58, 3, '#c98a6a'); P.disc(16 + k * 33, 58, 1, '#a46a4e'); }
    } else {                                                        // カンブリア
      for (let k = 0; k < 7; k++) { const x = 6 + k * 28; P.rect(x, 48 - (k % 3) * 3, 3, 10 + (k % 3) * 3, '#c9a24f'); P.rect(x + 1, 47 - (k % 3) * 3, 1, 1, '#e8c86a'); }
      for (let k = 0; k < 4; k++) P.sprite(SPR.trilo, { a: '#a8946a', b: '#5e5240' }, wrapX(k * 52 + t * 0.4 * (k % 2 ? 1 : -1), PW, 20), 49 + (k % 2) * 2, k % 2 === 0, 2);
      P.sprite(SPR.anomalo, { a: '#d0806a', b: '#8a4a38' }, wrapX(t * 0.9, PW, 50), 18 + Math.round(Math.sin(t * 0.15) * 2), false, 2);
      for (let k = 0; k < 2; k++) {
        const x = 40 + k * 90, y = 12 + Math.round(Math.sin(t * 0.2 + k) * 3);
        P.dome(x, y, 4, 'rgba(230,200,240,0.7)');
        for (let i = -3; i <= 3; i += 2) P.rect(x + i, y + 1, 1, 3 + ((t + i) % 2), 'rgba(230,200,240,0.6)');
      }
    }
  }

  function sceneSnowball(P, t) {
    P.bands(['#c3d1db', '#cfdbe3', '#dbe4ea', '#e6edf1']);
    P.disc(150, 12, 5, '#fffaf0');
    P.ridge(42, 10, 0.4, '#eef3f6', 0.05);
    P.ground(46, '#f6f9fb');
    for (let k = 0; k < 7; k++) P.rect(8 + k * 27, 50 + (k % 3) * 4, 14, 1, '#d6e2ea');
    for (let k = 0; k < 40; k++) {
      const x = (k * 37 + t * (1 + k % 3) * 0.5) % PW, y = (k * 13 + t * (1 + k % 2)) % PH;
      P.rect(x, y, 1, 1, '#ffffff');
    }
  }

  function scenePaleoLand(P, ya, t) {
    P.bands(['#9fc3b8', '#b1cfc1', '#c3dac9', '#d3e2cf']);
    P.clouds(t, '#f2f6f1', 3, 5, 0.12);
    P.ridge(38, 10, 1.7, '#7fa48c', 0.05);
    P.ground(44, '#4f6b3a');
    P.water(49, '#4d7a6e', '#79a296', t, 118, PW);
    if (ya < 3.8e8) {
      for (let k = 0; k < 6; k++) fernTree(P, 6 + k * 19, 46, 14 + (k % 3) * 5);
      for (let k = 0; k < 5; k++) { const x = 14 + k * 23; P.rect(x, 34 + (k % 2) * 4, 1, 12, '#5a7a3e'); }
    } else {
      for (let k = 0; k < 14; k++) { const x = 4 + k * 8; P.rect(x, 40 + (k % 3), 1, 6, '#5e8a44'); P.rect(x - 1, 40 + (k % 3), 3, 1, '#6e9a50'); }
    }
    if (ya < 3.7e8) P.sprite(SPR.amphib, { a: '#3f5a34', b: '#f0e6c0' }, 100 + Math.round(Math.sin(t * 0.1) * 3), 42, false, 2);
    if (ya < 3.1e8) P.sprite(SPR.reptile, { a: '#9a7a3e', b: '#2a2a1a' }, wrapX(40 + t * 0.35, 100, 30), 52, false, 2);
    if (ya < 3.2e8) {
      const x = wrapX(t * 1.2, PW, 20), y = 20 + Math.round(Math.sin(t * 0.4) * 4);
      P.rect(x, y, 6, 1, '#2f5f7a'); P.rect(x + 1, y - 1, 2, 1, t % 2 ? 'rgba(230,245,255,0.9)' : 'rgba(230,245,255,0.4)'); P.rect(x + 1, y + 1, 2, 1, 'rgba(230,245,255,0.6)');
    }
  }

  function sceneDino(P, ya, t) {
    P.bands(['#8fc0d8', '#a3cbdc', '#b8d6df', '#cde0df']);
    P.clouds(t, '#f6f8f6', 3, 4, 0.12);
    volcano(P, 160, 38, 12, t, '#9a9a88');
    P.ridge(40, 8, 2.5, '#86a07a', 0.05);
    P.ground(46, '#7d9a52');
    P.rect(0, 52, PW, 1, '#6c8a45'); P.rect(0, 58, PW, 1, '#6c8a45');
    palm(P, 12, 47, 18); palm(P, 92, 47, 14); palm(P, 178, 47, 20);
    for (let k = 0; k < 5; k++) P.dome(30 + k * 34, 47, 3, '#4f7a3e');
    P.sprite(SPR.sauro, { a: '#7a6e5c', b: '#544b3e' }, wrapX(10 + t * 0.25, PW, 70), 22, false, 2);
    P.sprite(SPR.thero, { a: '#a8603a', b: '#6a3f28', e: '#f4ead0' }, 126 + Math.round(Math.sin(t * 0.1) * 6), 26 + (t % 4 < 2 ? 0 : 1), true, 2);
    const px = wrapX(PW - t * 0.8, PW, 40);
    P.sprite(t % 4 < 2 ? SPR.pteroA : SPR.pteroB, { a: '#6e4e3e' }, px, 6 + Math.round(Math.sin(t * 0.2) * 2), false, 2);
    if (ya < 1.5e8) for (let k = 0; k < 3; k++) { const x = wrapX(t * 0.6 + k * 9, PW), y = 22 + k * 2; P.rect(x, y, 3, 1, '#5a4a3a'); P.rect(x + 1, y - (t % 2), 1, 1, '#5a4a3a'); }
  }

  function sceneMammal(P, ya, t) {
    P.bands(['#8ec5e6', '#a5d1ea', '#bddcec', '#d3e6ea']);
    P.clouds(t, '#fbfcfc', 3, 5, 0.12);
    P.ridge(38, 10, 3.1, '#7fae7a', 0.05);
    P.ground(45, '#7aa956');
    for (let k = 0; k < 20; k++) P.rect(4 + k * 10, 47 + (k % 3) * 5, 2, 1, '#5f8f42');
    roundTree(P, 20, 46, 20); roundTree(P, 40, 46, 16); roundTree(P, 168, 46, 22);
    if (ya < 6e7) {                                                     // 木の上の霊長類
      P.rect(23, 27 + (t % 6 < 3 ? 0 : 1), 3, 3, '#5a3a24'); P.rect(169, 25, 3, 3, '#5a3a24');
    }
    for (let k = 0; k < 3; k++) P.sprite(SPR.mammal, { a: k === 1 ? '#7d5a3a' : '#9a6e48' }, wrapX(60 + k * 34 + t * 0.2 * (k % 2 ? 1 : -1), PW, 40), 44 + k * 5, k % 2 === 0, 2);
  }

  function sceneImpact(P, t) {
    P.bands(['#3a1a14', '#6b2a18', '#a2441c', '#d36a24', '#f09a3a']);
    const ph = t % 24;
    if (ph < 10) {                                                      // 落ちてくる隕石
      const x = 40 + ph * 9, y = 2 + ph * 4;
      for (let i = 1; i < 8; i++) P.rect(x - i * 2 - 1, y - i * 0.9 - 1, 3, 2, `rgba(255,${200 - i * 12},120,${0.8 - i * 0.09})`);
      P.disc(x, y, 3, '#fff1c2'); P.disc(x, y, 2, '#ffffff');
    } else {
      P.disc(140, 46, Math.min(30, (ph - 9) * 4), 'rgba(255,220,150,0.55)');
      P.disc(140, 46, Math.min(16, (ph - 9) * 2), '#fff4d0');
    }
    P.ridge(44, 6, 1.1, '#2a1410', 0.06);
    P.ground(47, '#1e0f0c');
    palm(P, 20, 48, 16, '#1a0d0a', '#1a0d0a'); palm(P, 74, 48, 12, '#1a0d0a', '#1a0d0a');
    P.sprite(SPR.sauro, { a: '#140a08', b: '#140a08' }, 24, 22, false, 2);
  }

  function sceneHominin(P, ya, t) {
    P.bands(['#9cc6e0', '#b6d3e0', '#d0dfdc', '#e6e2cc']);
    P.disc(160, 12, 6, '#fff3cf');
    P.ridge(40, 7, 0.9, '#b9a77a', 0.05);
    P.ground(44, '#d2b46a');
    for (let k = 0; k < 26; k++) { const x = 3 + k * 7.4, y = 46 + (k % 4) * 4; P.rect(x, y - 1, 1, 2, '#b8963f'); P.rect(x + 2, y - 2, 1, 3, '#b8963f'); }
    acacia(P, 30, 45, 14); acacia(P, 120, 45, 11); acacia(P, 176, 45, 15);
    const gx = wrapX(30 + t * 0.4, ya < 1.8e6 ? 110 : PW, 40);
    for (let k = 0; k < 3; k++) P.sprite((t + k) % 4 < 2 ? SPR.homA : SPR.homB, { a: '#5e3e2a', b: '#3e2a1e' }, gx + k * 11, 43 + (k === 1 ? 2 : 0), false, 2);
    if (ya < 1.8e6) { fire(P, 158, 60, t); P.sprite(SPR.homB, { a: '#5e3e2a', b: '#3e2a1e' }, 140, 44, false, 2); P.sprite(SPR.homB, { a: '#4e3424', b: '#3e2a1e' }, 168, 44, false, 2); }
  }

  function sceneSapiens(P, ya, t) {
    P.bands(['#4b5a8a', '#6b6a95', '#9a7a92', '#c98f86', '#e6ab7c']);
    for (let k = 0; k < 8; k++) P.rect((k * 53) % PW, 3 + (k * 7) % 12, 1, 1, t % 8 === k ? '#ffffff' : '#d9dcf0');
    P.ridge(40, 9, 2.4, '#5a5068', 0.05);
    P.ground(46, '#6f6a50');
    // 洞窟
    P.dome(22, 47, 24, '#5c4c44');
    P.rect(0, 23, 22, 24, '#5c4c44');
    P.dome(22, 47, 9, '#241c18');
    if (ya < 4e4) {                                                     // 壁画
      P.rect(36, 30, 2, 3, '#c8553a'); P.rect(35, 31, 1, 1, '#c8553a'); P.rect(38, 31, 1, 1, '#c8553a');
      P.rect(28, 27, 6, 2, '#b8743a'); P.rect(29, 29, 1, 2, '#b8743a'); P.rect(32, 29, 1, 2, '#b8743a');
    }
    fire(P, 22, 52, t);
    P.sprite(SPR.mammoth, { a: '#5a3a2a', b: '#efe4cc' }, wrapX(PW - 50 - t * 0.15, PW, 70), 34, true, 2);
    const hx = 62 + Math.round(Math.sin(t * 0.05) * 10);
    P.sprite(SPR.hunter, { a: '#c08a66', b: '#6b4a32', c: '#e0cfa0' }, hx, 37, false, 2);
    P.sprite(SPR.hunter, { a: '#a8764f', b: '#5a3e2a', c: '#e0cfa0' }, hx + 14, 39, false, 2);
  }

  function sceneCiv(P, ya, t) {
    P.bands(['#8fc3e3', '#a7cfe6', '#c0dbe8', '#d8e6e6']);
    P.clouds(t, '#fbfcfc', 3, 5, 0.1);
    P.ridge(38, 7, 1.9, '#8aa77a', 0.05);
    if (ya < 4600) { P.tri(152, 41, 14, '#d8c08a', 1.2); for (let dy = 0; dy < 14; dy++) P.rect(152, 41 - dy, Math.round((14 - dy) * 1.2) + 1, 1, '#b89e68'); P.tri(176, 41, 8, '#d0b884', 1.2); }
    P.ground(42, '#8bb35a');
    for (let y = 47; y < PH; y += 3) P.rect(84, y, PW - 84, 2, (y >> 1) % 2 ? '#d9c25a' : '#c9b04c');
    for (let x = 86; x < PW; x += 4) P.rect(x, 46 + ((x + t) % 3 === 0 ? 0 : 1), 1, 1, '#e8d27a');
    P.rect(0, 58, 84, 6, '#5f95b5'); P.water(58, '#5f95b5', '#8fbcd6', t, 0, 84);
    hut(P, 12, 50); hut(P, 30, 51, '#a47e50'); hut(P, 52, 50);
    smoke(P, 16, 43, t, 'rgba(200,200,200,0.55)', 3);
    if (ya < 5200) { P.rect(66, 40, 10, 10, '#c9a876'); P.rect(68, 37, 6, 3, '#b8966a'); P.rect(70, 44, 2, 6, '#7a5a3a'); }
    P.sprite(SPR.farmer, { a: '#b98563', b: '#f0e6cc', c: '#7a5a3c' }, 104 + Math.round(Math.sin(t * 0.08) * 8), 46, false, 2);
    P.sprite(SPR.farmer, { a: '#a8764f', b: '#d8604a', c: '#6a4a32' }, 150 - Math.round(Math.sin(t * 0.08) * 6), 49, false, 2);
  }

  function sceneModern(P, ya, t) {
    const Y = NOW - ya;
    if (Y < 1880) {
      P.bands(['#a9a69a', '#b8b4a5', '#c8c2b0', '#d6cfba']);
      P.ridge(40, 5, 1.2, '#9b9384', 0.08);
      for (let k = 0; k < 4; k++) {
        const x = 20 + k * 44;
        P.rect(x, 32, 30, 14, '#8a5a44');
        for (let i = 0; i < 5; i++) P.tri(x + 3 + i * 6, 32, 3, '#6e4636', 1);
        P.rect(x + 22, 18, 3, 14, '#6e4636');
        smoke(P, x + 23, 15, t + k * 3, 'rgba(80,76,72,0.6)', 5);
      }
      P.ground(46, '#6c655a');
      P.rect(0, 55, PW, 1, '#3a3632'); for (let x = 0; x < PW; x += 5) P.rect(x, 56, 3, 1, '#4a4440');
      const tx = wrapX(PW - t * 1.0, PW, 70);
      P.sprite(SPR.loco, { a: '#3c3a40', b: '#9a3a2e', c: '#1f1e22', d: '#e8c56a' }, tx, 47);
      for (let k = 0; k < 2; k++) { P.rect(tx + 15 + k * 13, 49, 11, 5, '#7a4a3a'); P.rect(tx + 16 + k * 13, 54, 2, 1, '#1f1e22'); P.rect(tx + 23 + k * 13, 54, 2, 1, '#1f1e22'); }
      smoke(P, tx + 2, 44, t, 'rgba(240,240,240,0.7)', 4);
      return;
    }
    if (Y < 1950) {
      P.bands(['#9ccbe6', '#b2d6ea', '#c8e0ec', '#dce8ea']);
      P.clouds(t, '#fbfcfc', 3, 4, 0.12);
      P.sprite(SPR.biplane, { a: '#b84a3a', b: '#5a3a2a' }, wrapX(t * 0.7, PW, 30), 12 + Math.round(Math.sin(t * 0.15) * 2));
      for (let k = 0; k < 6; k++) building(P, 6 + k * 32, 46, 22, 14 + (k % 3) * 5, ['#a8735a', '#b8866a', '#9a6a52'][k % 3], '#e8dcc8', '#fff0b0', k);
      for (let k = 0; k < 4; k++) P.rect(20 + k * 50, 28, 1, 18, '#4a3a32');
      P.rect(0, 29, PW, 1, 'rgba(40,40,40,0.5)');
      P.ground(46, '#8a8578');
      P.rect(0, 51, PW, 8, '#5a5a5e'); for (let x = 0; x < PW; x += 10) P.rect(x + (t % 10), 55, 5, 1, '#d8d4c4');
      P.sprite(SPR.car, { a: '#2a2a2e', b: '#cfe6f2', c: '#111' }, wrapX(t * 1.2, PW, 30), 50);
      P.sprite(SPR.car, { a: '#6a2a2a', b: '#cfe6f2', c: '#111' }, wrapX(PW - t * 0.9, PW, 30), 53, true);
      person(P, 60 + Math.round(Math.sin(t * 0.05) * 6), 50, '#4a5a7a'); person(P, 140, 50, '#7a5a4a');
      return;
    }
    if (Y < 2000) {
      P.bands(['#86bde3', '#9ccbe8', '#b4d8ec', '#cde4ee']);
      P.clouds(t, '#fbfcfc', 2, 4, 0.12);
      if (Y >= 1957) {                                                  // ロケット
        const ph = t % 48, rx = 176, ry = 40 - ph * 1.2;
        if (ry > -6) { P.rect(rx, ry, 2, 5, '#f2f2f2'); P.rect(rx, ry + 5, 2, 2, '#ff9a3a'); for (let i = 1; i < 8; i++) P.disc(rx + 1, ry + 7 + i * 2, 1, 'rgba(240,240,240,0.5)'); }
      }
      for (let k = 0; k < 9; k++) building(P, 4 + k * 19, 46, 14, 12 + ((k * 7) % 5) * 5, ['#8a96a6', '#a0a8b2', '#7a8696'][k % 3], '#c9d6e2', '#fff0b0', k);
      P.rect(70, 12, 1, 8, '#555'); P.rect(68, 14, 5, 1, '#555');
      P.ground(46, '#7f8478');
      P.rect(0, 50, PW, 10, '#4c4e54'); for (let x = 0; x < PW; x += 12) P.rect(x + (t % 12), 55, 6, 1, '#e8e4d0');
      for (let k = 0; k < 3; k++) P.sprite(SPR.car, { a: ['#c9433a', '#3a6ac9', '#e0b03a'][k], b: '#cfe6f2', c: '#111' }, wrapX(k * 64 + t * 1.4, PW, 30), 50);
      P.sprite(SPR.car, { a: '#ececec', b: '#cfe6f2', c: '#111' }, wrapX(PW - t * 1.1, PW, 30), 54, true);
      return;
    }
    if (Y < 2022) sceneSmartCity(P, ya, t);
    else sceneAI(P, ya, t);
  }


  // スマホの街（2000〜2021）と、AIの時代（2022〜）
  function sceneSmartCity(P, ya, t) {
    P.bands(['#7fb6e0', '#96c4e6', '#afd3ea', '#c9e1ee']);
    P.clouds(t, '#fbfcfc', 2, 4, 0.12);
    P.sprite(SPR.jet, { a: '#e8eef2' }, wrapX(PW - t * 0.6, PW, 30), 9, true);
    for (let k = 0; k < 10; k++) building(P, 2 + k * 19, 46, 15, 18 + ((k * 5) % 4) * 6, ['#7ea4c4', '#94b4cc', '#6a8fb0'][k % 3], '#b8d0e2', '#fff4c0', k + 3);
    P.ground(46, '#8a9088');
    P.rect(0, 50, PW, 8, '#4c4e54'); for (let x = 0; x < PW; x += 12) P.rect(x + (t % 12), 54, 6, 1, '#e8e4d0');
    for (let k = 0; k < 2; k++) P.sprite(SPR.car, { a: ['#ffffff', '#3a3a3e'][k], b: '#cfe6f2', c: '#111' }, wrapX(k * 90 + t * 1.3, PW, 30), 49);
    P.rect(0, 58, PW, 6, '#b8b4aa');
    for (let k = 0; k < 6; k++) person(P, wrapX(k * 33 + t * (k % 2 ? 0.25 : -0.25), PW), 64, ['#d0603a', '#3a5a8a', '#5a8a5a'][k % 3], true);
  }

  function sceneAI(P, ya, t) {
    // 夕方の空と街
    P.bands(['#2d3a6a', '#4a4f86', '#7a6a9a', '#b98aa0', '#e3a98e']);
    for (let k = 0; k < 6; k++) P.rect((k * 61) % PW, 2 + (k * 5) % 8, 1, 1, '#e8e8ff');
    for (let k = 0; k < 9; k++) building(P, 34 + k * 17, 44, 13, 16 + ((k * 7) % 4) * 6, ['#3c4668', '#46507a', '#343c5c'][k % 3], '#56608a', '#ffe08a', k + 7);
    // データセンター（左）
    P.rect(0, 22, 34, 24, '#262b3c');
    P.rect(0, 20, 34, 2, '#1c2030');
    for (let r = 0; r < 4; r++) for (let c = 0; c < 6; c++) {
      const on = (r * 7 + c * 3 + t) % 5 !== 0;
      P.rect(3 + c * 5, 25 + r * 5, 3, 1, on ? '#5ee0ff' : '#2a6a80');
      P.rect(3 + c * 5, 27 + r * 5, 1, 1, (r + c + t) % 3 ? '#7dff9a' : '#245a34');
    }
    P.rect(26, 14, 2, 6, '#1c2030'); smoke(P, 27, 12, t, 'rgba(220,230,255,0.35)', 3);   // 冷却の湯気
    // 大きな画面：AIとの会話
    P.rect(120, 8, 50, 26, '#141826');
    P.rect(122, 10, 46, 22, '#f2f4fa');
    P.rect(125, 13, 24, 4, '#d8dcef'); P.rect(126, 14, 18, 1, '#8890b0'); P.rect(126, 15, 12, 1, '#8890b0');   // 人の質問
    const typed = Math.min(30, (t % 40) * 1.5);
    P.rect(135, 20, 30, 9, '#ffe7d6');
    P.rect(137, 22, Math.max(2, Math.round(typed * 0.8)), 1, '#c96a3e');
    if (typed > 12) P.rect(137, 24, Math.round((typed - 12) * 1.2), 1, '#c96a3e');
    if (typed > 22) P.rect(137, 26, Math.round((typed - 22) * 1.8), 1, '#c96a3e');
    P.rect(144, 34, 2, 10, '#141826');
    // 道路と自動運転車
    P.ground(44, '#5a5c66');
    P.rect(0, 47, PW, 8, '#363842'); for (let x = 0; x < PW; x += 12) P.rect(x + (t % 12), 51, 6, 1, '#cfd2dc');
    const cx = wrapX(t * 1.3, PW, 30);
    P.sprite(SPR.car, { a: '#eef1f6', b: '#cfe6f2', c: '#111' }, cx, 46);
    P.sprite(SPR.car, { a: '#c9433a', b: '#cfe6f2', c: '#111' }, wrapX(PW - t * 1.0, PW, 30), 50, true);
    // 歩道：スマホでAIと話す人たち
    P.rect(0, 56, PW, 8, '#8a8c96');
    for (let k = 0; k < 6; k++) {
      const x = wrapX(k * 33 + t * (k % 2 ? 0.25 : -0.25), PW);
      person(P, x, 64, ['#d0603a', '#3a8a7a', '#c9a23a', '#6a5aa0', '#4a6a9a', '#9a5a6a'][k], true);
      if ((t + k * 5) % 16 < 9) { P.rect(x + 2, 52, 6, 3, '#ffffff'); P.rect(x + 3, 53, 4, 1, '#c96a3e'); P.rect(x + 3, 55, 1, 1, '#ffffff'); }   // AIとの会話の吹き出し
    }
  }

  // 海の中（古生代〜新生代）。系統が海で暮らしているとき
  function sceneSea(P, ya, t) {
    P.bands(['#2f7aa0', '#2a6e93', '#246284', '#1f5674', '#1a4a64', '#163f56']);
    for (let k = 0; k < 5; k++) for (let y = 0; y < 46; y++) P.rect(14 + k * 40 + y * 0.35, y, 2, 1, 'rgba(255,255,255,0.05)');
    P.ridge(57, 4, 1.3, '#bba67c', 0.08);
    P.ground(59, '#a8946e');
    for (let k = 0; k < 10; k++) {                                       // 海藻
      const x = 6 + k * 19, h = 6 + (k % 3) * 4;
      for (let y = 0; y < h; y++) P.rect(x + Math.round(Math.sin(y * 0.5 + t * 0.25 + k)), 58 - y, 1, 1, '#3f7a4a');
    }
    for (let k = 0; k < 6; k++) { const ph = (t + k * 7) % 40; P.rect(20 + k * 31, 54 - ph, 1, 1, 'rgba(220,240,255,0.6)'); }
    if (ya > 2.519e8) {                                                  // 古生代の海
      for (let k = 0; k < 3; k++) P.sprite(SPR.trilo, { a: '#a8946a', b: '#5e5240' }, wrapX(k * 70 + t * 0.3, PW, 20), 52, k % 2 === 0, 2);
      nautilus(P, wrapX(PW - t * 0.4, PW, 20), 18, '#e6d2a8');
      if (ya < 4.3e8) P.sprite(SPR.armorfish, { a: '#7a7a6a', b: '#4a4a40' }, wrapX(30 + t * 0.6, PW, 30), 30, false, 2);
    } else if (ya > 6.6e7) {                                             // 中生代の海
      for (let k = 0; k < 3; k++) nautilus(P, wrapX(k * 64 - t * 0.3, PW, 20), 20 + k * 9, '#d9b88a');
      P.sprite(SPR.plesio, { a: '#5e7a8a', b: '#3e5a6a' }, wrapX(t * 0.5, PW, 40), 30, false, 2);
    } else {                                                             // 新生代の海
      P.sprite(SPR.whale, { a: '#4a6278', b: '#c8d4dc' }, wrapX(t * 0.35, PW, 50), 16, false, 2);
      for (let k = 0; k < 7; k++) P.sprite(SPR.fish, { a: '#e0c27a' }, wrapX(100 + k * 6 - t * 0.9, PW, 40), 38 + (k % 3) * 3, true);
    }
  }
  function nautilus(P, x, y, c) {
    P.disc(x, y, 4, c); P.disc(x, y, 2, '#b08a5a'); P.rect(x + 4, y - 1, 3, 3, c);
    for (let i = 0; i < 3; i++) P.rect(x + 7, y - 1 + i, 2, 1, '#c9a070');
  }

  // 深海の熱水噴出孔（酸素から逃げた微生物など）
  function sceneVent(P, t) {
    P.bands(['#0e1f33', '#0c1a2c', '#0a1626', '#081220']);
    P.ridge(58, 5, 0.6, '#2a2a30', 0.08);
    P.ground(60, '#222228');
    for (let k = 0; k < 3; k++) {
      const x = 30 + k * 60, h = 16 + k * 4;
      P.rect(x - 3, 60 - h, 7, h, '#3a3236'); P.rect(x - 2, 60 - h - 2, 5, 2, '#4a3e40');
      for (let i = 0; i < 6; i++) { const ph = (t + i * 4 + k * 3) % 26; P.disc(x + Math.round(Math.sin((t + i) * 0.4)), 58 - h - ph, 1 + (ph >> 3), 'rgba(40,40,46,0.85)'); }
      P.rect(x - 1, 60 - h, 3, 1, (t + k) % 4 < 2 ? '#ff7a3a' : '#c84a2a');
    }
    for (let k = 0; k < 30; k++) P.rect((k * 37 + t * 0.2) % PW, 50 + (k * 7) % 9, 1, 1, k % 3 ? '#8ad0c8' : '#e0f0a0');   // 微生物のマット
  }

  /* ---------------- あなたの系統（生き物の姿） ----------------
     look = { plan: 体のつくり, v: 変種, size: 大きさ, armor: 守り, feather: 羽毛 }
     分かれ道で体のつくりや特徴が変わると、絵も変わる */
  const MICRO_PLANS = ['microbe', 'cyano', 'cell', 'colony'];
  const PLAYER_SPR = {
    arthropod: ['trilo', { a: '#d4a24c', b: '#7a5a20', c: '#ecc878', e: '#1a1a1a' }, 2],
    insect: ['dragonfly', { a: '#2f6f9a', b: '#1f4f7a', k: '#18304a', w: 'rgba(235,248,255,0.85)' }, 2],
    sponge: ['sponge', { a: '#e0a050', b: '#7a4a20', c: '#b07030' }, 2],
    ediacaran: ['dickinsonia', { a: '#d89060', b: '#a05a3a', c: '#f0b080' }, 2],
    anomalo: ['anomalo', { a: '#e0805a', b: '#c0603a', c: '#f0a888', d: '#c8684a', e: '#c86a48', f: '#a8482a', s: '#f8e8c8' }, 2],
    jawless: ['eel', { a: '#8a7a6a', b: '#6a5a4a', c: '#b8a898' }, 2],
    fish: ['fish', { a: '#f0c060', c: '#f8e4a8' }, 3],
    shark: ['shark', { a: '#7a92a6', c: '#e8eef2', k: '#24303c' }, 2],
    armorfish: ['armorfish', { a: '#8a8470', b: '#b0a070', c: '#d4cca8' }, 2],
    amphibian: ['amphib', { a: '#4f8a3a', c: '#e0d8a0' }, 2],
    reptile: ['reptile', { a: '#b08a3e', b: '#7a5a28' }, 2],
    synapsid: ['dimetro', { a: '#b0603a', b: '#e0a060', c: '#d08a5a' }, 2],
    marine_reptile: ['plesio', { a: '#4a8aa0', b: '#2a5a6a', c: '#a8d0dc' }, 2],
    pterosaur: ['pteroA', { a: '#b0704a' }, 2],
    dino_small: ['raptor', { a: '#c06a3a', c: '#2a2a2a' }, 2],
    sauropod: ['sauro', { a: '#9a8a6a', b: '#6a5e48', c: '#c0b498' }, 2],
    theropod: ['thero', { a: '#c06a3a', b: '#7a3f28', c: '#2a2a2a' }, 2],
    bird: ['bird', { a: '#4a6aa0', b: '#f0c040' }, 3],
    mammal: ['mammal', { a: '#b07a4a', b: '#f0b0a0' }, 2],
    mammal_large: ['horse', { a: '#8a5a3a', b: '#3a2418' }, 2],
    whale: ['whale', { a: '#4a6278', c: '#c8d4dc' }, 2],
    primate: ['primate', { a: '#8a5a3a', c: '#d8b090' }, 2],
    hominin: ['homA', { a: '#7a4e34', b: '#4c3426' }, 2],
    human: ['hunter', { a: '#c08a66', b: '#3a6a9a', c: '#e0cfa0' }, 2],
  };
  const VARIANT_SPR = {
    millipede: ['millipede', { a: '#8a5a3a', b: '#5a3820', c: '#4a3020' }, 2],
    horseshoe: ['horseshoe', { a: '#8a7a5a', b: '#6a5a3e', c: '#4a3e2a' }, 2],
    turtle: ['turtle', { a: '#6a8a4a', b: '#3e5a2e', c: '#9ab07a' }, 2],
    feather: ['raptor', { a: '#3a7ab0', c: '#2a2a2a' }, 2],
  };
  Object.assign(SPR, {
    horseshoe: ['..aaaaaa......', '.aaaaaaaa.....', 'aaabbbbaaa....', 'aaaaaaaaaabbbb', '.a.a..a.a.....'],
    millipede: ['.aaaaaaaaaaaa.', 'aaaaaaaaaaaaab', 'b.b.b.b.b.b.b.', '.b.b.b.b.b.b..'],
    eel: ['..aaaaaaaaaaa.', 'aaaaaaaaaaaaab', '..aaaaaaaaaaa.'],
    turtle: ['...aaaaa....', '..aaabaaa...', '.aaabbbaaacc', 'aaaaaaaaaacc', '.c.c...c.c..'],
  });
  // 細かいドットで描き直した生き物（1マス＝ふつうの点の半分）。a 体、b 濃いところ、c 明るいところ、k 目
  const HI = {
    trilo: [
      '....aaaaaaaaa...',
      '..aabababababaa.',
      '.abababababaaeaa',
      'abcbcbcbcbccccaa',
      'abcbcbcbcbccccaa',
      'abcbcbcbcbccccaa',
      '.abababababaaeaa',
      '..aabababababaa.',
      '....aaaaaaaaa...',
    ],
    anomalo: [
      '..........................kkk.........',
      '..........................kwk.........',
      '...........................a..........',
      'bb....dd.dd.dd.dd.dd.dd.dd.a.....fff..',
      '.bb..ddddddddddddddddddddd.a...ff.ssf.',
      '...aaaaaaaaaaaaaaaaaaaaaaaaaaaffs...ff',
      'bbaacacacacacacacacacacacaaaaa........',
      'bbaaaaaaaaaaaaaaaaaaaaaaaaeeeek.......',
      'bbaacacacacacacacacacacacaaaaa........',
      '...aaaaaaaaaaaaaaaaaaaaaaaaaaaffs...ff',
      '.bb..ddddddddddddddddddddd.a...ff.ssf.',
      'bb....dd.dd.dd.dd.dd.dd.dd.a.....fff..',
      '...........................a..........',
      '..........................kwk.........',
      '..........................kkk.........',
    ],
    eel: [
      '.......................',
      '..aaaaaaaaaaaaaaaaaaa..',
      'aabcbcbcbcbcbcbcbcaakaa',
      '.aaaaaaaaaaaaaaaaaaaaa.',
      '..c.c..................',
    ],
    fish: [
      '........aaa.....',
      'a.....aaaaaaa...',
      'aa...aaaaaaaaa..',
      'aaa.aaaaaaaaakaa',
      'aaaaaaaaaaabaaaa',
      'aaa.cccccccbcccc',
      'aa...cccccccccc.',
      'a.......cc......',
    ],
    shark: [
      '...............a...............',
      '..............aa...............',
      '.............aaa...............',
      'a..........aaaaaaaaaaa.........',
      'aa.....aaaaaaaaaaaaaaaaaa......',
      'aaa.aaaaaaaaaaaaaaaaaaakaaa....',
      'aaaaaaaaaaaaaaaaaaaaaaaaaaaaa..',
      'aaa.ccccccccccccccccccccccccccc',
      'aa.....cccccaccccccccccc.kkkk..',
      'a.........aa.....aa............',
      '..........a.......a............',
    ],
    armorfish: [
      '................bbbbbbb.....',
      '............bbbbbbbbbbbbb...',
      '..........bbbbbbbdbbbbkbbb..',
      'a.....aaaabbbbbbbdbbbbbbbbb.',
      'aa..aaaaaaabbbbbbdbbbbbbbbbb',
      'aaaaaaaaaaabbbbbbdbbbbbwwww.',
      'aa..aaaaaaaccccccbbbbbbbbbbb',
      'a......aaaaccccccbbbbbbbbbb.',
      '..........aa....bbb.........',
    ],
    amphib: [
      '...........aaaaaa...',
      '........aaaaaaaaaka.',
      'a....aaaaaaaaaaaaaaa',
      'aaaaaaaaaaaaaaaaccc.',
      '.aaaaaccccccccccc...',
      '....aa.......aa.....',
      '...aa.......aa......',
    ],
    reptile: [
      '............aaaa....',
      '.........aaaaaakaa..',
      'aaa...aaaaaaaaaaaaab',
      '..aaaaaabababababa..',
      '.....aa.......aa....',
      '....a.a......a.a....',
    ],
    dimetro: [
      '.......a.a.a.a.a..........',
      '......abababababa.........',
      '.....abbbbbbbbbbba........',
      '.....abbbbbbbbbbbba.......',
      '....abbbbbbbbbbbbba.......',
      '....aaaaaaaaaaaaaaa..aaaa.',
      'a..aaaaaaaaaaaaaaaaaaaaka.',
      '.aaaaaaaaaaaaaaaaaaaaaaaaa',
      '...cccccccccccccccccaawww.',
      '....aa.aa.....aa.aa.......',
      '...aa.aa.....aa.aa........',
    ],
    plesio: [
      '.............................aaa.',
      '............................aaaka',
      '...........................aaaaaa',
      '..........................aaa....',
      '.........................aaa.....',
      '....aaaaaaaaaaaaaaaa...aaa.......',
      '.aaaaaaaaaaaaaaaaaaaaaaaa........',
      'aaaaaaaaaaaaaaaaaaaaaaaa.........',
      '..ccccccccccccccccccccc..........',
      '.....bbb.........bbb.............',
      '....bbb.........bbb..............',
    ],
    pteroA: [
      'a......................a',
      '.aa..................aa.',
      '..aaa..............aaa..',
      '...aaaa..........aaaa...',
      '....aaaaa..aa..aaaaa....',
      '.....aaaaaaaaaaaaaa.....',
      '..........aaaaaakaaaa...',
      '...........aaaa....aaa..',
      '...........a.a..........',
    ],
    pteroB: [
      '........................',
      '........................',
      '..........aaaaaa..aa....',
      '.......aaaaaaaaaaaakaaa.',
      '....aaaaaa.aaaa.aaaaa.aa',
      '..aaaa.....a..a....aaaa.',
      '.aaa................aaa.',
      'aa....................aa',
    ],
    raptor: [
      '..............aaaa..',
      '.............aaakaa.',
      '.............aaaaaaa',
      '.............aawwww.',
      '............aaaa....',
      '...........aaaa.....',
      'a.........aaaaa.....',
      '.aa......aaaaaa.....',
      '..aaaaaaaaaaaaa.....',
      '...aaaaaaaaaaaa.c...',
      '.....aaaaaaaa..c....',
      '......aa..aa........',
      '......a...a.........',
      '.....aa...aa........',
      '....aa...aa.........',
    ],
    sauro: [
      '...........................................aaaa.',
      '..........................................aaakaa',
      '.........................................aaaaaaa',
      '........................................aaa.....',
      '.......................................aaa......',
      '......................................aaa.......',
      '.....................................aaa........',
      '....................................aaa.........',
      '...................................aaa..........',
      '..................................aaa...........',
      '.................aaaaaaaaaaaa....aaa............',
      '............aaaaaaaaaaaaaaaaaaaaaaa.............',
      '.........aaaaaaaaaaaaaaaaaaaaaaaaa..............',
      '.......aaaaaaaaaaaaaaaaaaaaaaaaaa...............',
      '.....aaaaaaaaaaaaaaaaaaaaaaaaaaa................',
      '...aaaa..aaaaaaaaaaaaaaaaaaaaaa.................',
      '.aaa.....cccccccccccccccccccc...................',
      'aa..........bbbb.......bbbb.....................',
      '............bbbb.......bbbb.....................',
      '............bbbb.......bbbb.....................',
      '............bbbb.......bbbb.....................',
      '...........bbbbb......bbbbb.....................',
    ],
    thero: [
      '................aaaaaaa.....',
      '...............aaaaaaakaa...',
      '...............aaaaaaaaaaaa.',
      '...............aaaaaaawwwwa.',
      '...............aaaaaaaaaaa..',
      '..............aaaaa.wwww....',
      '.............aaaaa..........',
      '............aaaaaa.cc.......',
      'a...........aaaaaa..c.......',
      '.aa........aaaaaaa..........',
      '..aaa....aaaaaaaaa..........',
      '...aaaaaaaaaaaaaaa..........',
      '....aaaaaaaaaaaaaa..........',
      '......aaaaaaaaaaa...........',
      '.........aaa..aaa...........',
      '.........aa....aa...........',
      '.........aa....aa...........',
      '........aaa...aaa...........',
      '.......bbb...bbb............',
    ],
    bird: [
      '.......aaa..',
      '......aaakbb',
      '......aaaa..',
      'aa..aaaaa...',
      '.aaaaaaaa...',
      '..aaaaaaa...',
      '...aaaaa....',
      '....b..b....',
      '...bb.bb....',
    ],
    mammal: [
      '..............aa....',
      '.............aaaa...',
      '.a.....aaaaaaaaaka..',
      '..aaaaaaaaaaaaaaaaab',
      '....aaaaaaaaaaaaaa..',
      '.....aaaaaaaaaaa....',
      '.....a.a.....a.a....',
    ],
    horse: [
      '....................aa..',
      '...................aaa..',
      '..................aaaaa.',
      '.................aaaakaa',
      '...........aaa..aaaaaaab',
      '.aaaaaaaaaaaaaaaaaa..aaa',
      'aaaaaaaaaaaaaaaaaaa.....',
      'a.aaaaaaaaaaaaaaaaa.....',
      '..aaaaaaaaaaaaaaaa......',
      '..aa.aa......aa.aa......',
      '..a..a........a..a......',
      '..a..a........a..a......',
      '..a..a........a..a......',
      '..b..b........b..b......',
    ],
    whale: [
      '..........aaaaaaaaaaaaaaa...............',
      '.......aaaaaaaaaaaaaaaaaaaaaaa..........',
      '....aaaaaaaaaaaaaaaaaaaaaaaaaaaaa.......',
      'a.aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa.....',
      'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaakaa...',
      'aaa.cccccccccccccccccccccccccccccaaaaaaa',
      'a.....ccccccccccccccccccccccccccc.......',
      '...............aa.......................',
      '................aa......................',
    ],
    primate: [
      '.........aaa.',
      '........aaccc',
      '........aakca',
      '........aaaaa',
      '.......aaaa..',
      'a.....aaaaaa.',
      '.a...aaaaa.c.',
      '..aaaaaaaa...',
      '...aaaaaaa...',
      '...aa...aa...',
      '...a....a....',
      '..aa...aa....',
    ],
    homA: [
      '..aaa...',
      '..aaaa..',
      '..aaa...',
      '...a....',
      '..aaaa..',
      '.aaaaaa.',
      '.a.aa.a.',
      '.a.aa.a.',
      '...bb...',
      '..bbbb..',
      '..b..b..',
      '.bb...b.',
      '.b....b.',
    ],
    homB: [
      '..aaa...',
      '..aaaa..',
      '..aaa...',
      '...a....',
      '..aaaa..',
      '.aaaaaa.',
      '.a.aa.a.',
      '.a.aa.a.',
      '...bb...',
      '...bb...',
      '...bb...',
      '...bb...',
      '...bb...',
    ],
    hunter: [
      '.........c',
      '...aa....c',
      '..aaaa...c',
      '..aaa....c',
      '...a.....c',
      '..bbbb..ac',
      '.bbbbbbaac',
      '.bbbbbb..c',
      '.abbbb...c',
      '..bbbb...c',
      '..bbbb....',
      '..b..b....',
      '..b..b....',
      '..a..a....',
      '.aa.aa....',
    ],
    millipede: [
      '..aaaaaaaaaaaaaaaaaaaaaa....',
      '.aabababababababababababa...',
      'aabababababababababababaaka.',
      '.aaaaaaaaaaaaaaaaaaaaaaaaaa.',
      '..c.c.c.c.c.c.c.c.c.c.c.c...',
      '.c.c.c.c.c.c.c.c.c.c.c.c....',
    ],
    horseshoe: [
      '..........aaaaaaaaaa........',
      '.......aaaaaaaaaaaaaaaa.....',
      '.....aaaaabbbbbbbaaakaaa....',
      '....aaaabbbbbbbbbbaaaaaaa...',
      'bbbbaaaaaaaaaaaaaaaaaaaaa...',
      '...aaaaaaaaaaaaaaaaaaaaaa...',
      '....c.c.c.c.c.c.c.c.c.......',
    ],
    turtle: [
      '.......aaaaaaa...........',
      '.....aabababababa........',
      '....abbabbabbabbaa.......',
      '...abbbbabbbbabbbba......',
      '...aaaaaaaaaaaaaaaaa.ccc.',
      '.ccbbbbbbbbbbbbbbbbbcckc.',
      '..cc...cc.....cc..cccccc.',
      '...c...cc.....cc.........',
    ],
    dragonfly: [
      '..........wwww.wwww.....',
      '.........wwwwwwwwwwww...',
      '..........wwwwwwwwww....',
      'aaaaaaaaaaaaaaabbbbkk...',
      'aaaaaaaaaaaaaaabbbbkkk..',
      '................b.b.b...',
    ],
    sponge: [
      '..aaaaaaaa..',
      '.ab......ba.',
      '.abbbbbbbba.',
      '.aaaaaaaaaa.',
      '.acaaacaaaa.',
      'aaaaaaaaacaa',
      'aacaaaaaaaaa',
      'aaaaacaaaaaa',
      'aaaaaaaaacaa',
      'acaaaaaaaaaa',
      'aaaaacaaaaca',
      'aaaaaaaaaaaa',
      '.aacaaaaacaa',
      '.aaaaaacaaa.',
      '..aaaaaaaa..',
      '..aaaaaaaa..',
    ],
    dickinsonia: [
      '......aaaaaaaa......',
      '...aaacacacacacaa...',
      '.aacacacacacacacaca.',
      'acacacacacacacacacac',
      'bbbbbbbbbbbbbbbbbbbb',
      'acacacacacacacacacac',
      '.aacacacacacacacaca.',
      '...aaacacacacacaa...',
      '......aaaaaaaa......',
    ],
  };
  for (const k in HI) SPR[k] = { d: 2, rows: HI[k] };
  const DEFAULT_V = { microbe: 'rod', cyano: 'cyano', cell: 'euk', colony: 'alga', arthropod: 'trilo' };
  const lookOf = (x) => (typeof x === 'string' ? { plan: x, v: DEFAULT_V[x] || '' } : { ...x, v: x.v || DEFAULT_V[x.plan] || '' });
  const specOf = (look) => VARIANT_SPR[look.v] || PLAYER_SPR[look.plan];
  const formScale = (look, base) => Math.max(1, Math.min(3, Math.round(base * (0.7 + (look.size == null ? 45 : look.size) / 150))));

  // 顕微鏡で見る微生物。変種ごとに形が違う
  function drawMicro(P, v, cx, cy, r, t, frame = true) {
    if (frame) { P.disc(cx, cy, r + 2, '#33413f'); P.disc(cx, cy, r, '#dcefe0'); }
    const at = (k, n, d) => { const a = t * 0.05 + k * (6.283 / n); return [cx + Math.round(Math.cos(a) * d), cy + Math.round(Math.sin(a) * d * 0.75)]; };
    if (v === 'archaea') {                                   // 熱水の古細菌：丸くて、とげ
      for (let k = 0; k < 5; k++) { const [x, y] = at(k, 5, k ? 11 : 0); P.disc(x, y, 3, '#d8703a'); P.disc(x, y, 1, '#f0a060');
        [[-4, 0], [4, 0], [0, -4], [0, 4], [-3, -3], [3, 3], [3, -3], [-3, 3]].forEach(([dx, dy]) => P.rect(x + dx, y + dy, 1, 1, '#9a3a20')); }
    } else if (v === 'oxy') {                                // 酸素を使う細菌：細長い体と、べん毛
      for (let k = 0; k < 4; k++) { const [x, y] = at(k, 4, 9); P.rect(x - 3, y - 1, 7, 3, '#4a7ac0'); P.rect(x - 2, y - 2, 5, 5, '#4a7ac0'); P.rect(x - 1, y, 3, 1, '#8ab0e0');
        for (let i = 0; i < 5; i++) P.rect(x + 4 + i, y + ((i + t) % 2 ? 1 : -1), 1, 1, '#2a4a80'); }
    } else if (v === 'hunter') {                             // ほかの微生物を食べる：アメーバのような体
      const w = Math.round(Math.sin(t * 0.3) * 2);
      P.disc(cx, cy, 8, '#b08ac8'); P.disc(cx + 8 + w, cy - 3, 3, '#b08ac8'); P.disc(cx - 7, cy + 5 - w, 3, '#b08ac8'); P.disc(cx - 3, cy - 8, 3, '#b08ac8');
      P.disc(cx + 2, cy + 1, 2, '#8a9a5a'); P.disc(cx - 2, cy - 2, 2, '#7a5aa0');
    } else if (v === 'cyano') {                              // シアノバクテリア：数珠つなぎの糸
      for (let c = 0; c < 3; c++) for (let i = 0; i < 7; i++) {
        const x = cx - 15 + i * 4 + c * 2, y = cy - 8 + c * 8 + Math.round(Math.sin(i * 0.8 + t * 0.15 + c) * 2);
        P.disc(x, y, 2, i === 3 && c === 1 ? '#2a7a4a' : '#3fa05a'); P.rect(x, y, 1, 1, '#8ad89a');
      }
    } else if (v === 'euk') {                                // 核を持つ細胞：核とミトコンドリア
      P.disc(cx, cy, 11, '#b8dca8'); P.disc(cx, cy, 10, '#cde8bc');
      P.disc(cx - 2, cy - 1, 4, '#7a5aa0'); P.disc(cx - 3, cy - 2, 1, '#a88ad0');
      [[5, 4], [4, -5], [-6, 5]].forEach(([dx, dy], i) => { P.rect(cx + dx - 1, cy + dy, 4, 2, '#e08a3a'); P.rect(cx + dx, cy + dy, 2, 1, (t + i) % 4 < 2 ? '#f0b060' : '#e08a3a'); });
    } else if (v === 'para') {                               // ゾウリムシ：くつのような形と、せん毛
      for (let dx = -12; dx <= 12; dx++) { const h = Math.round(5 * Math.sqrt(1 - (dx / 13) ** 2)) - (dx > 2 && dx < 7 ? 1 : 0); P.rect(cx + dx, cy - h, 1, h * 2 + 1, '#a8c8e8'); if ((dx + t) % 2 === 0) { P.rect(cx + dx, cy - h - 1, 1, 1, '#5a7aa0'); P.rect(cx + dx, cy + h + 1, 1, 1, '#5a7aa0'); } }
      P.disc(cx - 2, cy, 2, '#5a6a9a'); P.rect(cx + 4, cy - 1, 2, 2, '#e8f0f8');
    } else if (v === 'volvox') {                             // 細胞のかたまり：ボルボックスのような球
      P.disc(cx, cy, 12, '#9ad09a'); P.disc(cx, cy, 11, '#bfe4b8');
      for (let k = 0; k < 14; k++) { const a = k * 0.449 + t * 0.03; P.rect(cx + Math.round(Math.cos(a) * 10), cy + Math.round(Math.sin(a) * 10), 1, 1, '#2f7a3f'); }
      P.disc(cx - 3, cy + 2, 3, '#4f9a4f'); P.disc(cx + 4, cy - 3, 2, '#4f9a4f');
    } else if (v === 'alga') {                               // 紅藻・藻類：枝分かれする赤い糸
      const col = '#c0505a';
      for (let i = 0; i < 18; i++) { const x = cx - 2 + Math.round(Math.sin(i * 0.4 + t * 0.1) * 2); P.rect(x, cy + 11 - i, 3, 1, col); }
      for (const [bx, by, dir] of [[cx, cy + 3, 1], [cx, cy - 3, -1], [cx, cy + 7, -1], [cx + 1, cy - 7, 1]]) for (let i = 0; i < 8; i++) P.rect(bx + dir * i, by - Math.round(i * 0.7), 2, 2, i % 3 ? col : '#e07a80');
    } else {                                                 // rod：浅い海の細菌。カプセル形で、分裂しているものも
      for (let k = 0; k < 5; k++) { const [x, y] = at(k, 5, k ? 10 : 0); const vert = k % 2;
        if (vert) { P.rect(x - 1, y - 3, 3, 7, '#8a9a5a'); P.rect(x, y - 3, 1, 7, '#a8b878'); }
        else { P.rect(x - 3, y - 1, 7, 3, '#8a9a5a'); P.rect(x - 3, y, 7, 1, '#a8b878'); }
        if (k === 0) { P.rect(x + 4, y - 1, 7, 3, '#8a9a5a'); P.rect(x + 3, y - 1, 1, 3, '#5a6a3a'); } }
    }
  }
  // とげ：体のいちばん上にそって
  function spikes(P, rows, x0, y0, s, c) {
    const W = rows[0].length;
    for (let i = 1; i < W - 1; i += 3) {
      let top = -1;
      for (let j = 0; j < rows.length; j++) if (rows[j][i] !== '.') { top = j; break; }
      if (top >= 0) P.rect(x0 + i * s, y0 + (top - 1) * s, s, s, c);
    }
  }
  // 生き物を1体描く。戻り値は頭の上の y（矢印を置く位置）
  function drawForm(P, look, t, cx, ground, card = false) {
    look = lookOf(look);
    const plan = look.plan, sz = look.size == null ? 45 : look.size;
    if (MICRO_PLANS.includes(plan)) { const r = card ? 22 : 20, cy = card ? 24 : 30; drawMicro(P, look.v, cx, cy, r, t, !card); return cy - r - 1; }
    if (plan === 'soft') {                                   // ゴカイのような、くねる体（細かい点）
      const n = 14 + Math.round(sz / 5), y0 = ground - 3, x0 = cx - Math.round(n / 2);
      const yy = (i) => y0 + Math.round(Math.sin(i * 0.45 + t * 0.4) * 3) / 2;
      for (let i = 0; i < n; i++) {
        P.rect(x0 + i, yy(i), 1, 1.5, i % 2 ? '#d0607a' : '#e07a8a');
        if (i % 2 === 0) { P.rect(x0 + i + 0.5, yy(i) - 0.5, 0.5, 0.5, '#f0b0b8'); P.rect(x0 + i + 0.5, yy(i) + 1.5, 0.5, 0.5, '#f0b0b8'); }
      }
      P.rect(x0 + n, yy(n) - 0.5, 2, 2, '#a03a50'); P.rect(x0 + n + 1, yy(n), 0.5, 0.5, '#1a1a1a');
      P.rect(x0 + n + 2, yy(n) - 0.5, 1, 0.5, '#a03a50'); P.rect(x0 + n + 2, yy(n) + 1, 1, 0.5, '#a03a50');
      return y0 - 4;
    }
    const spec = specOf(look);
    if (!spec) return ground;
    const [name, pal] = spec;
    let spr = SPR[name];
    const rows = spr.rows || spr, d = spr.d || 1;
    let s = formScale(look, spec[2]);
    if (card) s = Math.max(1, Math.min(2 * d, Math.floor(56 * d / rows[0].length), Math.floor(38 * d / rows.length)));   // カードでは大きく（細かさは保つ）
    const cell = s / d, w = rows[0].length * cell, h = rows.length * cell;
    const swim = ['jawless', 'fish', 'shark', 'armorfish', 'marine_reptile', 'whale', 'anomalo'].includes(plan);
    const fly = plan === 'pterosaur' || plan === 'bird' || plan === 'insect';
    const y = card ? ground - h - (swim || fly ? 6 : 0) : fly ? 14 + Math.round(Math.sin(t * 0.2) * 3) : swim ? 30 - Math.round(h / 2) + Math.round(Math.sin(t * 0.15) * 2) : ground - h;
    const x = cx - Math.round(w / 2) + (card ? 0 : Math.round(Math.sin(t * 0.07) * 4));
    if (fly && name === 'pteroA' && t % 4 >= 2 && !card) spr = SPR.pteroB;
    P.sprite(spr, pal, x, y, false, s);
    if ((look.armor || 0) >= 65 && !['arthropod', 'armorfish', 'turtle', 'horseshoe'].includes(look.v || plan) && plan !== 'arthropod' && plan !== 'armorfish') spikes(P, rows, x, y, cell, '#5a4a3a');
    if (look.feather && (plan === 'dino_small' || plan === 'theropod')) {    // 羽毛：頭のとさかと、背中・しっぽの羽
      const f = cell;
      [[w - 4 * f, -f, '#e0503a'], [w - 3 * f, -2 * f, '#f0c040'], [w - 5 * f, 0, '#e0503a']].forEach(([dx, dy, c]) => P.rect(x + dx, y + dy, f * 2, f, c));
      for (let i = 0; i < 4; i++) P.rect(x - f * (i % 2), y + (6 + i) * f, f * 3, f, i % 2 ? '#e0503a' : '#f0c040');
    }
    return y - 1;
  }
  function drawPlayer(P, look, t, ground = 56) {
    const top = drawForm(P, look, t, 92, ground);
    marker(P, 92, top, t);
  }
  function marker(P, x, y, t) {                       // あなたを示す矢印
    const b = t % 6 < 3 ? 0 : 1;
    P.rect(x - 2, y - 5 + b, 5, 1, '#ffd84a'); P.rect(x - 1, y - 4 + b, 3, 1, '#ffd84a'); P.rect(x, y - 3 + b, 1, 1, '#ffd84a');
  }
  // 生き物だけを小さなキャンバス（64×48）に。silhouette で白一色（進化の演出用）
  function drawCreatureCard(ctx, look, t = 0, silhouette = null) {
    ctx.clearRect(0, 0, 64 * K, 48 * K);
    const P = painter(ctx, silhouette);
    drawForm(P, look, t, 32, 44, true);
  }

  /* ============================================================
     結末の場面：今日の子孫の暮らし／化石が眠る地層
     ============================================================ */
  function oval(P, cx, cy, rx, ry, c) {
    for (let dy = -ry; dy <= ry; dy += 1 / K) { const w = rx * Math.sqrt(Math.max(0, 1 - (dy / (ry + 0.5)) ** 2)) + 0.5; P.rect(cx + 0.5 - w, cy + dy, 2 * w, 1 / K, c); }
  }
  function flowers(P, y0, y1, t, n, seed) {
    const cols = ['#f06a8a', '#ffd84a', '#ffffff', '#b07ae0', '#ff9a3a'];
    for (let k = 0; k < n; k++) {
      const x = (k * 37 + seed * 11) % PW, y = y0 + ((k * 13 + seed) % (y1 - y0));
      P.rect(x, y + 1, 1, 2, '#3f7a32');
      P.rect(x - 1, y, 3, 1, cols[k % cols.length]); P.rect(x, y - 1, 1, 1, cols[k % cols.length]);
    }
  }
  function fish(P, x, y, c, flip) { P.sprite(SPR.fish, { a: c }, x, y, flip); }

  const TODAY = {
    hotspring(P, t) {
      // 雪の山の温泉。湯のふちのオレンジや黄色は、熱に強い微生物がつくる色
      P.bands(['#8fb4d4', '#a6c4dc', '#bed4e4', '#d6e2ec']);
      P.tri(150, 34, 24, '#6f7f92', 1.5); P.tri(150, 34, 10, '#f2f6fa', 1.5); P.tri(108, 36, 16, '#7f8fa0', 1.6); P.tri(108, 36, 6, '#f2f6fa', 1.6);
      for (let k = 0; k < 12; k++) { const x = 4 + k * 16; P.tri(x, 40, 9 + (k % 3) * 2, '#3e5a46', 0.45); P.rect(x - 1, 34 + (k % 2), 1, 1, '#f2f6fa'); }
      P.ground(40, '#e6dccb');
      for (let k = 0; k < 22; k++) P.rect((k * 23) % PW, 41 + (k * 7) % 22, 3, 1, '#f6f2ea');      // 雪
      [['#b85a2a', 38, 11], ['#e08a32', 34, 9], ['#f0c850', 29, 8], ['#a8d8a0', 24, 6], ['#5ab8d8', 18, 5], ['#2f86c0', 11, 3]].forEach(([c, rx, ry]) => oval(P, 48, 53, rx, ry, c));
      for (let k = 0; k < 6; k++) P.dome(12 + k * 14, 46 + (k % 2), 2, '#8a8478');                  // 湯船の石
      // 湯につかるサル
      P.disc(34, 50, 3, '#8a6a4a'); P.rect(33, 50, 3, 2, '#e0a090'); P.rect(33, 50, 1, 1, '#3a2a20'); P.rect(35, 50, 1, 1, '#3a2a20');
      // 立ちのぼる湯けむり
      for (let k = 0; k < 9; k++) { const ph = (t * 0.8 + k * 7) % 40, x = 22 + k * 7 + Math.round(Math.sin((t + k * 9) * 0.12) * 3) + Math.floor(ph / 6); P.disc(x, 48 - ph, 2 + Math.floor(ph / 10), `rgba(255,255,255,${Math.max(0, 0.75 - ph / 55)})`); }
      // ♨ の看板
      P.rect(170, 40, 2, 16, '#6a4a2a'); P.rect(160, 26, 22, 15, '#7a5a3a'); P.rect(162, 28, 18, 11, '#f4ead0');
      P.rect(164, 36, 14, 1, '#c0302a'); P.rect(165, 37, 12, 1, '#c0302a'); P.rect(167, 38, 8, 1, '#c0302a');
      for (let i = 0; i < 3; i++) { const x = 166 + i * 4; P.rect(x, 30, 1, 1, '#c0302a'); P.rect(x + 1, 31, 1, 1, '#c0302a'); P.rect(x, 32, 1, 1, '#c0302a'); P.rect(x + 1, 33, 1, 1, '#c0302a'); P.rect(x, 34, 1, 1, '#c0302a'); }
      return 58;
    },
    stromatolite(P, t) {
      P.bands(['#7fbbe8', '#98c9ec', '#b4d8ee', '#d0e6ee']);
      P.disc(30, 12, 6, '#fff3cf');
      P.clouds(t, '#ffffff', 2, 5, 0.1);
      P.ground(36, '#e8d8a8', 140, PW);
      P.water(36, '#5aa6c8', '#8fcbe0', t, 0, 140);
      for (let k = 0; k < 8; k++) { const x = 10 + k * 17, y = 46 + (k % 3) * 5; P.dome(x, y, 4 + (k % 3), '#6a5a48'); P.rect(x - 3, y - 1, 7, 1, '#7d6a54'); }
      return 58;
    },
    pond(P, t) {
      P.bands(['#8ec5e6', '#a6d1ea', '#bfdcec', '#d6e8ec']);
      for (let k = 0; k < 7; k++) roundTree(P, 6 + k * 28, 38, 18 + (k % 3) * 4, '#4e8a44');
      P.ground(36, '#6e9e4e');
      oval(P, 96, 50, 80, 12, '#4a8aa8');
      for (let k = 0; k < 9; k++) { const x = 30 + k * 16, y = 46 + (k % 3) * 4; oval(P, x, y, 4, 2, '#4f9a4a'); if (k % 4 === 0) P.rect(x + 1, y - 1, 2, 1, '#f0a0c0'); }
      for (let k = 0; k < 8; k++) P.rect(8 + k * 3, 38 + (k % 2), 1, 10, '#7a9a4a');
      return 58;
    },
    kelp(P, t) {
      P.bands(['#3f9ab0', '#358aa2', '#2c7a92', '#256a82', '#1f5a72', '#194c62']);
      for (let k = 0; k < 5; k++) for (let y = 0; y < 50; y++) P.rect(12 + k * 40 + y * 0.3, y, 2, 1, 'rgba(255,255,255,0.06)');
      P.ground(60, '#8a7a5a');
      for (let k = 0; k < 14; k++) {
        const x = 4 + k * 14, h = 34 + (k % 4) * 6;
        for (let y = 0; y < h; y++) { const sw = Math.round(Math.sin(y * 0.18 + t * 0.2 + k) * 2); P.rect(x + sw, 60 - y, 2, 1, k % 2 ? '#7a6a2a' : '#8a7a32'); if (y % 6 === 3) P.rect(x + sw + 2, 60 - y, 3, 1, '#9a8a3a'); }
      }
      for (let k = 0; k < 6; k++) fish(P, wrapX(40 + k * 9 + t * 0.6, PW, 30), 18 + (k % 3) * 3, '#c8d8e8');
      return 58;
    },
    reef(P, t) {
      P.bands(['#3fb0d0', '#36a2c4', '#2e92b6', '#2682a6', '#1f7296']);
      for (let k = 0; k < 6; k++) for (let y = 0; y < 44; y++) P.rect(8 + k * 34 + y * 0.35, y, 2, 1, 'rgba(255,255,255,0.07)');
      P.ground(58, '#e8d8a8');
      const coral = ['#f07a8a', '#ff9a5a', '#b07ae0', '#ffd25a', '#5ac8a0'];
      for (let k = 0; k < 12; k++) {
        const x = 6 + k * 16, c = coral[k % coral.length];
        if (k % 3 === 0) P.dome(x, 58, 6, c);
        else if (k % 3 === 1) { P.rect(x, 46, 2, 12, c); P.rect(x - 3, 49, 2, 6, c); P.rect(x + 3, 47, 2, 8, c); }
        else for (let i = 0; i < 6; i++) P.rect(x - i, 52 - i, 1 + i * 2, 1, c);
      }
      for (let k = 0; k < 10; k++) fish(P, wrapX(k * 21 + t * (k % 2 ? 0.7 : -0.5), PW, 30), 14 + (k % 4) * 6, ['#ffd84a', '#ff8a3a', '#5ac8ff', '#ffffff'][k % 4], k % 2 === 0);
      return 58;
    },
    beach(P, t) {
      P.bands(['#1a2448', '#24305a', '#2e3c6c', '#3a4a7c']);
      P.disc(150, 12, 7, '#f4f0d8');
      for (let k = 0; k < 12; k++) P.rect((k * 47) % PW, 3 + (k * 7) % 16, 1, 1, '#d8dcf0');
      P.water(34, '#2a3a6a', '#5a6aa0', t, 0, PW);
      for (let k = 0; k < 4; k++) P.rect(140 + k * 3, 36 + k * 2, 14 - k * 3, 1, 'rgba(244,240,216,0.5)');
      P.ground(48, '#c9b48a');
      P.rect(0, 47, PW, 1, 'rgba(255,255,255,0.4)');
      for (let k = 0; k < 4; k++) P.sprite(SPR.trilo, { a: '#7a6a4a', b: '#4a3e2a' }, 20 + k * 40, 54 + (k % 2) * 3, k % 2 === 0, 2);
      return 60;
    },
    forestfloor(P, t) {
      P.bands(['#3a5a3a', '#44663e', '#4e7244']);
      for (let k = 0; k < 6; k++) { P.rect(8 + k * 34, 0, 8, 44, '#4a3a2a'); P.rect(10 + k * 34, 0, 2, 44, '#5a4a36'); }
      P.ground(44, '#6a4e32');
      for (let k = 0; k < 40; k++) P.rect((k * 23) % PW, 46 + (k * 7) % 16, 3, 1, ['#c87a3a', '#a85a2a', '#d8a04a'][k % 3]);
      for (let k = 0; k < 5; k++) { const x = 20 + k * 37; P.rect(x, 50, 1, 4, '#f0e6d0'); P.dome(x, 50, 3, ['#d8402f', '#c8a07a'][k % 2]); }
      for (let k = 0; k < 8; k++) { const ph = (t + k * 5) % 24; P.rect((k * 29 + 10) % PW, 10 + ph, 1, 1, 'rgba(255,255,200,0.6)'); }
      return 60;
    },
    meadow(P, t) {
      P.bands(['#7fbde8', '#98cbec', '#b4daf0', '#d0e8f0']);
      P.clouds(t, '#ffffff', 3, 4, 0.12);
      P.ridge(36, 8, 2.1, '#7ab06a', 0.05);
      P.ground(40, '#6eaa4e');
      flowers(P, 42, 63, t, 46, 3);
      for (let k = 0; k < 3; k++) { const x = wrapX(30 + k * 60 + t * 0.6, PW), y = 26 + Math.round(Math.sin(t * 0.3 + k) * 3); P.rect(x, y, 2, 2, ['#ffd84a', '#ff8a3a', '#ffffff'][k]); P.rect(x + 2, y - (t % 2), 2, 2, ['#ffd84a', '#ff8a3a', '#ffffff'][k]); }
      return 60;
    },
    river(P, t) {
      P.bands(['#8ec5e6', '#a6d1ea', '#c0dcea', '#d6e6e6']);
      for (let k = 0; k < 6; k++) roundTree(P, 10 + k * 34, 34, 16 + (k % 2) * 4, '#4a7a3e');
      P.ground(32, '#7a9a52');
      P.water(40, '#5a8a8a', '#8abcb8', t, 0, PW);
      P.rect(110, 44, 40, 4, '#6a4a30'); P.rect(112, 43, 36, 1, '#7a5a3a');
      for (let k = 0; k < 2; k++) { P.dome(118 + k * 14, 43, 4, '#4a6a3a'); P.rect(122 + k * 14, 41, 2, 2, '#4a6a3a'); }
      for (let k = 0; k < 10; k++) P.rect(4 + k * 4, 36 + (k % 3), 1, 10, '#6a8a3a');
      return 60;
    },
    ocean(P, t) {
      P.bands(['#2a7ab0', '#2368a0', '#1d5890', '#174a7e', '#123c6c', '#0e305a']);
      for (let k = 0; k < 6; k++) for (let y = 0; y < 40; y++) P.rect(10 + k * 34 + y * 0.4, y, 2, 1, 'rgba(255,255,255,0.06)');
      for (let k = 0; k < 7; k++) fish(P, wrapX(120 + k * 11 - t * 0.8, PW, 60), 46 + (k % 3) * 5, '#7f9fb4', true);
      for (let k = 0; k < 8; k++) { const ph = (t + k * 7) % 50; P.rect(20 + k * 23, 60 - ph, 1, 1, 'rgba(220,240,255,0.6)'); }
      return 58;
    },
    paddy(P, t) {
      P.bands(['#5a5a9a', '#9a6a9a', '#e08a7a', '#f0b07a', '#f8d08a']);
      P.ridge(30, 10, 1.4, '#4a4a6a', 0.04);
      P.ridge(34, 6, 3.3, '#3e5a4a', 0.07);
      // 家と電柱
      P.rect(150, 24, 18, 10, '#6a5040'); P.tri(159, 24, 7, '#3a3030', 1.6); P.rect(156, 28, 3, 3, '#ffd88a');
      P.rect(40, 14, 1, 22, '#3a3a3a'); P.rect(37, 16, 7, 1, '#3a3a3a'); P.rect(0, 17, PW, 1, 'rgba(40,40,40,0.5)');
      P.ground(34, '#6a8a4a');
      // 田んぼ（水に空が映る）
      for (let r = 0; r < 4; r++) {
        const y = 37 + r * 7;
        P.rect(0, y, PW, 5, ['#e8a07a', '#d8907a', '#c88a8a', '#b88a9a'][r]);
        for (let x = (r * 3) % 6; x < PW; x += 6) { P.rect(x, y, 1, 3, '#4f8a3a'); P.rect(x + 1, y - 1, 1, 3, '#5f9a44'); }
        P.rect(0, y + 5, PW, 2, '#7a6a4a');
      }
      for (let k = 0; k < 6; k++) { const ph = (t + k * 4) % 30; if (ph < 15) P.rect((k * 31 + 7) % PW, 30 + (k * 5) % 20, 1, 1, '#fff8b0'); }  // ホタル
      return 63;
    },
    sky(P, t) {
      P.bands(['#5aa8e8', '#78b8ec', '#98c8f0', '#b8d8f2', '#d4e6f2']);
      P.disc(160, 10, 6, '#fff6d8');
      P.clouds(t, '#ffffff', 4, 6, 0.15);
      P.ridge(54, 8, 1.7, '#5a8a4a', 0.06);
      P.ground(58, '#4e7a3e');
      for (let k = 0; k < 9; k++) { const x = wrapX(40 + (k % 5) * 8 + Math.floor(k / 5) * 4 + t * 0.7, PW, 60), y = 30 + Math.abs((k % 5) - 2) * 3 + Math.floor(k / 5) * 5; P.rect(x, y, 3, 1, '#3a3a4a'); P.rect(x + 1, y - (t % 2), 1, 1, '#3a3a4a'); }
      return 58;
    },
    forestnight(P, t) {
      P.bands(['#0e1630', '#162040', '#1e2a50', '#26345c']);
      P.disc(150, 12, 6, '#f4f0d8'); P.disc(152, 11, 6, '#162040');
      for (let k = 0; k < 18; k++) P.rect((k * 53) % PW, 2 + (k * 11) % 22, 1, 1, t % 10 === k % 10 ? '#ffffff' : '#c8cce8');
      for (let k = 0; k < 8; k++) { const x = 4 + k * 26, h = 30 + (k % 3) * 6; P.tri(x, 52, h, '#0c1a14', 0.35); P.rect(x - 1, 52 - 4, 2, 4, '#0a1410'); }
      P.ground(52, '#14241a');
      for (let k = 0; k < 7; k++) { const ph = (t + k * 3) % 16; if (ph < 10) P.rect((k * 29 + 12) % PW, 36 + (k * 7) % 14, 1, 1, '#d8ff8a'); }
      return 60;
    },
    grassland(P, t) {
      P.bands(['#8cc4ec', '#a4d0ee', '#bfdcee', '#dce8e8']);
      P.clouds(t, '#ffffff', 3, 5, 0.1);
      P.ridge(36, 6, 0.6, '#9aa8b8', 0.04);
      P.ground(40, '#c8b05a');
      for (let k = 0; k < 40; k++) P.rect((k * 19) % PW, 42 + (k * 7) % 20, 1, 2, '#a8903a');
      for (let k = 0; k < 4; k++) P.sprite(SPR.horse, { a: '#3a2a20', b: '#2a1a14' }, wrapX(120 + k * 14 + t * 0.2, PW, 60), 36, false, 1);
      acacia(P, 30, 42, 14, '#5a7a3a');
      return 60;
    },
    whale(P, t) {
      P.bands(['#8cc8f0', '#a4d4f2', '#c0e0f2']);
      P.clouds(t, '#ffffff', 2, 3, 0.1);
      P.water(24, '#2a6aa8', '#6aa0d0', t, 0, PW);
      P.bands(['#2a6aa8', '#22609a', '#1a548a', '#144878', '#0e3c66'], 26, PH);
      const ph = t % 30;
      if (ph < 12) for (let i = 0; i < 6; i++) P.rect(96 + Math.round(Math.sin(i + t) * 2), 22 - i * 2 - Math.floor(ph / 2), 2, 2, 'rgba(255,255,255,0.8)');   // 潮吹き
      for (let k = 0; k < 6; k++) fish(P, wrapX(20 + k * 13 - t * 0.6, PW, 50), 52 + (k % 3) * 3, '#6f8fa6', true);
      return 58;
    },
    jungle(P, t) {
      P.bands(['#6aa070', '#5a9064', '#4a8058']);
      for (let k = 0; k < 9; k++) { P.rect(6 + k * 22, 10, 4, 50, '#4a3a26'); P.disc(8 + k * 22, 10 + (k % 3) * 4, 10, k % 2 ? '#2f6a3a' : '#3a7a42'); }
      for (let k = 0; k < 12; k++) for (let y = 0; y < 20 + (k % 4) * 6; y++) P.rect(10 + k * 16 + Math.round(Math.sin(y * 0.3 + t * 0.1) * 1), y, 1, 1, '#4f8a3a');
      P.ground(56, '#3a5a2a');
      for (let k = 0; k < 6; k++) P.rect(14 + k * 31, 52 + (k % 2) * 3, 3, 2, ['#f06a8a', '#ffd84a'][k % 2]);
      return 58;
    },
    table(P, t) {
      // 発酵の食卓：パン・チーズ・納豆・ヨーグルト、棚にはみその樽
      P.bands(['#f2e6d0', '#ead8bc']);
      P.rect(14, 6, 40, 26, '#8a6a4a'); P.rect(16, 8, 36, 22, '#bfe0f4'); P.rect(33, 8, 2, 22, '#8a6a4a'); P.disc(24, 14, 3, '#fff4c0');
      P.rect(130, 16, 50, 3, '#8a6a4a');
      P.rect(134, 7, 9, 9, '#c9a46a'); P.rect(134, 6, 9, 2, '#8a5a3a'); P.rect(134, 10, 9, 1, '#8a5a3a');      // みその樽
      P.rect(147, 9, 7, 7, '#e8e0c8'); P.rect(147, 8, 7, 1, '#b0a080');                                       // 漬物のかめ
      P.rect(158, 6, 3, 10, '#5a8a3a'); P.rect(158, 5, 3, 1, '#3a5a2a'); P.rect(164, 9, 8, 7, '#a8703a');     // 酒のびん・おけ
      P.rect(16, 44, 168, 4, '#a87850'); P.rect(24, 48, 3, 16, '#7a5636'); P.rect(174, 48, 3, 16, '#7a5636');
      P.dome(46, 44, 8, '#d49a52'); P.rect(41, 39, 2, 1, '#a86a2a'); P.rect(46, 38, 2, 1, '#a86a2a'); P.rect(51, 39, 2, 1, '#a86a2a');   // パン
      smoke(P, 46, 34, t, 'rgba(255,255,255,0.6)', 3);
      P.rect(62, 38, 13, 6, '#f2cc4a'); P.rect(62, 37, 9, 1, '#f6dc7a'); P.rect(65, 40, 2, 2, '#d8a830'); P.rect(70, 39, 1, 1, '#d8a830'); P.rect(72, 42, 1, 1, '#d8a830');  // チーズ
      P.rect(103, 39, 16, 1, '#3a3a3a'); P.rect(104, 40, 14, 4, '#2a2a2a'); P.rect(106, 37, 10, 2, '#b8843a');                   // 納豆
      for (let k = 0; k < 4; k++) P.rect(107 + k * 2, 33 + ((t + k) % 6 < 3 ? 0 : 1), 1, 4, 'rgba(255,255,255,0.75)');
      P.rect(116, 30, 1, 10, '#c87a3a'); P.rect(118, 30, 1, 10, '#c87a3a');
      P.rect(126, 38, 8, 6, '#f6f6f6'); P.rect(126, 37, 8, 1, '#7aa0d0'); P.rect(128, 40, 4, 1, '#e8eef6');     // ヨーグルト
      P.rect(0, 62, PW, 2, '#b89a78');
      return 44;
    },
    room(P, t) {
      P.bands(['#e8dcc8', '#e0d2bc']);
      // 窓：夜の街
      P.rect(16, 6, 64, 34, '#4a3a2a'); P.rect(18, 8, 60, 30, '#1c2440');
      for (let k = 0; k < 7; k++) building(P, 18 + k * 9, 38, 8, 8 + (k * 5) % 14, '#2a3456', '#3a4670', '#ffe08a', k + 2);
      P.rect(47, 8, 2, 30, '#4a3a2a');
      // 棚と植物
      P.rect(130, 20, 46, 3, '#8a6a4a'); P.rect(134, 12, 5, 8, '#c86a3a'); P.rect(140, 14, 4, 6, '#3a6a9a'); P.rect(146, 11, 6, 9, '#e8c06a');
      P.rect(162, 16, 6, 4, '#a85a3a'); P.disc(165, 13, 4, '#4f8a3a');
      // 机とパソコン
      P.rect(70, 44, 110, 4, '#9a7250'); P.rect(76, 48, 3, 16, '#7a5a3a'); P.rect(172, 48, 3, 16, '#7a5a3a');
      P.rect(108, 26, 40, 18, '#2a2a30'); P.rect(110, 28, 36, 14, '#f4f6fb');
      P.rect(112, 30, 18, 3, '#dfe3f2'); P.rect(113, 31, 14, 1, '#8890b0');
      const typed = (t % 40);
      P.rect(122, 35, 22, 6, '#ffe7d6'); P.rect(124, 37, Math.min(18, typed), 1, '#c96a3e'); if (typed > 18) P.rect(124, 39, Math.min(14, typed - 18), 1, '#c96a3e');
      P.rect(118, 44, 20, 1, '#5a5a62');
      P.rect(156, 40, 5, 4, '#f0f0f0'); smoke(P, 158, 38, t, 'rgba(255,255,255,0.6)', 3);   // マグカップ
      // 机に向かう人（後ろ姿）
      P.rect(86, 46, 18, 3, '#4a4a52'); P.rect(88, 49, 2, 15, '#3a3a42'); P.rect(100, 49, 2, 15, '#3a3a42');
      P.rect(89, 30, 12, 14, '#3a6a9a'); P.rect(91, 22, 8, 8, '#3a2a22'); P.rect(100, 34, 8, 3, '#3a6a9a'); P.rect(107, 35, 2, 2, '#e0b090');
      // 床
      P.rect(0, 62, PW, 2, '#b89a78');
      return 64;
    },
  };

  // 化石の地層。layer は絶滅の原因の層（impact 隕石 / eruption 噴火 / ice 氷河 / oxygen 縞状鉄鉱 / anoxic 黒い泥 / coal 石炭 / anthro 人間）
  function sceneFossil(P, plan, layer, t, look) {
    P.bands(['#a9cde6', '#c4dcea'], 0, 9);
    P.rect(0, 9, PW, 3, layer === 'ice' ? '#eef3f6' : '#6f9a4a');
    for (let k = 0; k < 30; k++) P.rect((k * 13) % PW, 8, 1, 1, layer === 'ice' ? '#ffffff' : '#5a8a3a');
    if (layer === 'impact') { oval(P, 40, 10, 14, 3, '#8a6a4a'); oval(P, 40, 10, 10, 2, '#6a5040'); P.rect(70, 2, 2, 2, '#fff1c2'); P.rect(66, 0, 4, 1, 'rgba(255,180,90,0.7)'); }
    if (layer === 'eruption') { P.tri(40, 8, 7, '#6a5a5a', 1.4); P.rect(39, 1, 3, 1, '#ff7a1a'); smoke(P, 40, 0, t, 'rgba(80,70,70,0.6)', 3); }
    if (layer === 'anthro') for (let k = 0; k < 6; k++) P.rect(10 + k * 9, 9 - (3 + (k * 3) % 5), 6, 3 + (k * 3) % 5, ['#8a96a6', '#a0a8b2'][k % 2]);
    if (layer === 'coal') { P.rect(30, 2, 2, 7, '#3a3a3a'); P.rect(26, 2, 10, 1, '#3a3a3a'); }
    if (layer === 'oxygen') for (let k = 0; k < 5; k++) P.dome(20 + k * 14, 9, 2, '#a8503a');
    // 化石を掘る人
    const dig = t % 8 < 4;
    P.rect(150, 2, 2, 2, '#e0b090'); P.rect(149, 4, 4, 4, '#d8603a'); P.rect(150, 8, 1, 2, '#3a3a44'); P.rect(152, 8, 1, 2, '#3a3a44');
    P.rect(dig ? 154 : 153, dig ? 5 : 3, 1, 4, '#8a6a4a'); P.rect(dig ? 153 : 152, dig ? 9 : 3, 3, 1, '#9aa0aa');
    // 地層
    const cols = ['#c9a77a', '#b98f62', '#d4b98c', '#a87e58', '#c2a070', '#9a7454', '#b38a62', '#cfae80'];
    let y = 12, i = 0;
    while (y < PH) {
      const h = 5 + (i * 3) % 5;
      for (let x = 0; x < PW; x++) { const yy = y + Math.round(Math.sin(x * 0.05 + i) * 1.2); P.rect(x, yy, 1, h + 2, cols[i % cols.length]); }
      y += h; i++;
    }
    const fy = 46;                                                       // 化石のある層
    const lay = (yy, h, c) => { for (let x = 0; x < PW; x++) P.rect(x, yy + Math.round(Math.sin(x * 0.05 + 3) * 1.2), 1, h, c); };
    if (layer === 'impact') { lay(fy - 11, 1, '#1e1a1a'); lay(fy - 10, 1, '#8a4a3a'); }
    if (layer === 'eruption') { lay(fy - 13, 4, '#4a4448'); lay(fy - 9, 1, '#2e2a2e'); }
    if (layer === 'ice') { lay(fy - 12, 3, '#dfe8ee'); for (let k = 0; k < 14; k++) P.rect((k * 17) % PW, fy - 12 + (k % 3), 2, 1, '#8a8a90'); }
    if (layer === 'oxygen') for (let r = 0; r < 6; r++) lay(fy - 14 + r * 2, 1, r % 2 ? '#a8402f' : '#6a6a72');
    if (layer === 'anoxic') lay(fy - 12, 4, '#2a2622');
    if (layer === 'coal') { lay(fy - 13, 3, '#18161a'); lay(fy - 10, 1, '#3a3438'); }
    if (layer === 'anthro') { lay(13, 2, '#7a7a82'); for (let k = 0; k < 10; k++) P.rect((k * 23) % PW, 14, 2, 1, ['#e0503a', '#3a8ae0', '#f0e04a'][k % 3]); }
    // 化石
    P.rect(60, fy - 8, 72, 18, 'rgba(0,0,0,0.10)');
    const bone = '#efe5cc', shade = '#7a6248';
    if (['microbe', 'cyano', 'cell', 'colony'].includes(plan)) {
      for (let k = 0; k < 5; k++) for (let r = 0; r < 4; r++) { const x = 72 + k * 12; P.dome(x, fy + 6 - r * 2, 5 - r, r % 2 ? '#8a6e55' : bone); }
      return;
    }
    if (plan === 'soft') {                                 // ゴカイ：くねった節の跡
      oval(P, 96, fy + 1, 20, 6, '#7d6f5e'); oval(P, 96, fy + 1, 19, 5, '#968672');
      for (let i = 0; i < 30; i++) {
        const x = 82 + i, y = fy + Math.round(Math.sin(i * 0.35) * 3) / 2;
        P.rect(x - 0.5, y - 0.5, 1, 2, '#cbbba0'); P.rect(x + 0.5, y + 0.5, 1, 2, '#4e4436'); P.rect(x, y, 1, 2, i % 2 ? '#a8977c' : '#8a7a63');
      }
      return;
    }
    const spec = specOf(lookOf(look || plan));
    if (!spec) return;
    const spr = SPR[spec[0]], rows = spr.rows || spr, d = spr.d || 1;
    const s = !VERTEBRATES.has(plan) && rows[0].length / d < 11 ? 3 : 2, cell = s / d;   // 小さな化石は大きめに
    const w = rows[0].length * cell, h = rows.length * cell;
    const x0 = 96 - Math.round(w / 2), y0 = fy + 2 - Math.round(h / 2);
    const mono = (c) => Object.fromEntries([...'abcdefksw'].map((k) => [k, c]));
    if (VERTEBRATES.has(plan)) {                                         // 骨格
      const fs = { d: spr.d || 1, rows: skeleton(rows) };
      P.sprite(fs, mono(shade), x0 + cell / 2, y0 + cell / 2, true, s);
      P.sprite(fs, mono(bone), x0, y0, true, s);
      return;
    }
    // 背骨のない生き物：石のかたまり（ノジュール）に残った、凹凸のある跡
    oval(P, x0 + w / 2, y0 + h / 2, w / 2 + 5, h / 2 + 4, '#7d6f5e');
    oval(P, x0 + w / 2, y0 + h / 2, w / 2 + 4, h / 2 + 3, '#968672');
    for (let k = 0; k < 6; k++) P.rect(x0 - 2 + ((k * 7) % (w + 4)), y0 - 1 + ((k * 5) % (h + 2)), 1, 0.5, '#87776a');
    const STONE = { a: '#a8977c', b: '#6e604c', c: '#c2b296', d: '#8a7a63', e: '#4e4436', f: '#7a6b56', s: '#c4b498', k: '#4e4436', w: '#c2b296' };
    P.sprite(spr, mono('#cbbba0'), x0 - cell / 2, y0 - cell / 2, true, s);   // 光の当たる縁
    P.sprite(spr, mono('#4e4436'), x0 + cell / 2, y0 + cell / 2, true, s);   // 影
    P.sprite(spr, STONE, x0, y0, true, s);
  }

  // 背骨のある生き物の化石は、骨格にして描く：
  // 体の内側はあばら骨のしま、腹の縁はあばら骨の先だけ、目はくぼみ。細い首・尾・あしは骨の列のまま
  const VERTEBRATES = new Set(['jawless', 'fish', 'shark', 'armorfish', 'amphibian', 'reptile', 'synapsid', 'marine_reptile', 'pterosaur',
    'dino_small', 'sauropod', 'theropod', 'bird', 'mammal', 'mammal_large', 'whale', 'primate', 'hominin', 'human']);
  function skeleton(rows) {
    const H = rows.length, W = rows[0].length;
    const on = (i, j) => j >= 0 && j < H && i >= 0 && i < W && rows[j][i] !== '.';
    const socket = new Set();                             // 目のくぼみ（目のまわり2×2）
    rows.forEach((row, j) => [...row].forEach((ch, i) => { if (ch === 'k') [[0, 0], [-1, 0], [0, 1], [-1, 1]].forEach(([di, dj]) => socket.add(`${i + di},${j + dj}`)); }));
    return rows.map((row, j) => [...row].map((ch, i) => {
      if (ch === '.' || socket.has(`${i},${j}`)) return '.';
      if (ch === 'w') return i % 2 ? 'a' : '.';          // 歯
      if (j + 1 < H && rows[j + 1][i] === 'w') return '.'; // 口のすきま
      const up = on(i, j - 1), dn = on(i, j + 1), lf = on(i - 1, j), rt = on(i + 1, j);
      const inside = up && dn && lf && rt;
      if (inside) {
        const thick = on(i, j - 2) && on(i, j + 2);       // 胴体の中（首や尾ではない）
        return !thick || i % 2 === 0 ? 'a' : '.';
      }
      if (up && !dn && lf && rt && on(i, j - 2)) return i % 2 === 0 ? 'a' : '.';   // 腹の縁：あばら骨の先
      return 'a';
    }).join(''));
  }

  function drawEnding(P, e, t) {
    if (e.unborn) { sceneHadean(P, e.ya || 4.3e9, t); return; }
    if (e.alive) {
      const ground = (TODAY[e.scene] || TODAY.meadow)(P, t);
      if (e.plan !== 'human') drawPlayer(P, e.look || e.plan, t, ground);
    } else {
      sceneFossil(P, e.plan, e.layer, t, e.look);
    }
  }

  function drawScene(ctx, ya, t, opts = {}) {
    const P = painter(ctx);
    ctx.clearRect(0, 0, PW * K, PH * K);
    if (opts.ending) { drawEnding(P, opts.ending, t); return; }
    const { fx, habitat, plan } = opts;
    const micro = plan === 'microbe' || plan === 'cyano' || plan === 'cell' || plan === 'colony';
    if (fx === 'impact') sceneImpact(P, t);
    else if (habitat === 'deep') sceneVent(P, t);
    else if (habitat === 'sea' && ya <= 4.2e8) sceneSea(P, ya, t);
    else if (ya > 3.8e9) sceneHadean(P, ya, t);
    else if (ya > 2.4e9) sceneArchean(P, ya, t, false);
    else if (ya > 2.0e9) sceneArchean(P, ya, t, true);
    else if (ya > 1.0e9) sceneProterozoic(P, t, !micro);
    else if (ya > 7.2e8 || (ya > 5.388e8 && ya <= 6.35e8)) sceneUnderwater(P, t, ya > 5.75e8 ? 'algae' : 'ediacara');
    else if (ya > 6.35e8) sceneSnowball(P, t);
    else if (ya > 4.2e8) sceneUnderwater(P, t, 'cambrian');
    else if (ya > 2.3e8) scenePaleoLand(P, ya, t);
    else if (ya > 6.6e7) sceneDino(P, ya, t);
    else if (ya > 7e6) sceneMammal(P, ya, t);
    else if (ya > 3e5) sceneHominin(P, ya, t);
    else if (ya > 1.2e4) sceneSapiens(P, ya, t);
    else if (ya > ago(1769)) sceneCiv(P, ya, t);
    else sceneModern(P, ya, t);
    if (fx === 'eruption') {
      P.rect(0, 0, PW, PH, 'rgba(70,20,10,0.55)');
      for (let k = 0; k < 30; k++) P.rect((k * 41 + t) % PW, (k * 17 + t * 2) % PH, 1, 1, 'rgba(60,50,50,0.9)');
    }
    if (fx === 'ice') {
      P.rect(0, 0, PW, PH, 'rgba(220,235,245,0.55)');
      for (let k = 0; k < 40; k++) P.rect((k * 37 + t * 0.5 * (1 + k % 3)) % PW, (k * 13 + t * (1 + k % 2)) % PH, 1, 1, '#ffffff');
    }
    if (fx === 'oxygen') P.rect(0, 0, PW, PH, `rgba(160,40,30,${0.25 + 0.1 * Math.sin(t * 0.5)})`);
    if (plan) drawPlayer(P, opts.look || plan, t, 58);
  }

  const FX_CAPTION = {
    impact: '巨大隕石の衝突・恐竜の時代が終わる',
    eruption: '大噴火で空が暗くなる・生き物の大半が絶滅',
    ice: '氷河が広がる・海が冷え込む',
    oxygen: '酸素が増える・酸素は多くの微生物にとって毒',
  };
  const sceneCaption = (ya, opts) => E.tr(captionJa(ya, opts));
  function captionJa(ya, opts = {}) {
    const { fx, habitat } = opts;
    if (fx && FX_CAPTION[fx]) return FX_CAPTION[fx];
    if (habitat === 'deep') return '深海の熱水噴出孔・酸素の届かない場所';
    if (habitat === 'sea' && ya <= 4.2e8) {
      if (ya > 2.519e8) return '古生代の海・三葉虫とオウムガイの仲間';
      if (ya > 6.6e7) return '中生代の海・アンモナイトと首長竜';
      return '新生代の海・クジラと魚の群れ';
    }
    if (ya > 3.8e9) return ya > 4.51e9 ? '降りそそぐ隕石・溶岩の大地' : ya > 4.3e9 ? '生まれたばかりの月・噴き出す火山' : '熱い海ができる・生命はまだいない';
    if (ya > 2.4e9) return ya > 3.48e9 ? '岩だけの陸と浅い海・酸素のない空' : '浅い海に、微生物がつくる岩（ストロマトライト）';
    if (ya > 2.0e9) return '酸素で鉄がさび、赤い縞の地層ができる';
    if (ya > 1.0e9) return '陸はまだ岩だけ・海に核を持つ細胞';
    if (ya > 7.2e8) return '海の中・藻のような多細胞生物';
    if (ya > 6.35e8) return '全球凍結・地球全体が氷に覆われる';
    if (ya > 5.388e8) return ya > 5.75e8 ? '海の中・藻のような多細胞生物' : '海の底・葉のような形のエディアカラ生物';
    if (ya > 4.2e8) return '海の中・三葉虫とアノマロカリス';
    if (ya > 2.3e8) return ya > 3.85e8 ? '水辺に小さな植物が広がる' : ya > 3.12e8 ? 'シダの森・陸に上がった両生類' : 'シダの森・は虫類と大きなトンボ';
    if (ya > 6.6e7) return 'ソテツの森・首の長い恐竜と肉食恐竜・空に翼竜';
    if (ya > 7e6) return '森と草原・哺乳類が増える';
    if (ya > 3e5) return ya > 1.9e6 ? 'サバンナを二本足で歩く人類の祖先' : 'サバンナで火を囲む原人';
    if (ya > 1.2e4) return ya > 4.5e4 ? '洞窟のそば・マンモスを追う狩人' : '洞窟に絵を描く・マンモスを追う狩人';
    if (ya > ago(1769)) return ya > 4586 ? '畑と小さな村・農耕の始まり' : '畑の向こうにピラミッド・都市と文明';
    const Y = NOW - ya;
    if (Y < 1880) return '工場の煙と蒸気機関車';
    if (Y < 1950) return 'れんがの街と自動車・空に複葉機';
    if (Y < 2000) return 'ビルの街と道路・ロケットが宇宙へ';
    if (Y < 2022) return '高層ビルとスマートフォン';
    return 'データセンターの灯り・スマホでAIと話す人たち';
  }

  // 表示中のキャンバスを 8コマ/秒 で描き直す
  const views = [];
  function sceneView(canvas, getState) {
    canvas.width = PW * K; canvas.height = PH * K;
    views.push({ canvas, ctx: canvas.getContext('2d'), getState, key: '' });
  }
  const REDUCE = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function loop(now) {
    const t = REDUCE ? 0 : Math.floor(now / 125);
    for (const v of views) {
      if (!v.canvas.offsetParent) continue;
      const st = v.getState(now);
      if (!st) continue;
      const key = `${t}|${st.ya}|${st.fx}|${st.habitat}|${st.plan}|${st.ending ? st.ending.id + st.ending.plan : ''}|${JSON.stringify(st.look || (st.ending && st.ending.look) || '')}`;
      if (key === v.key) continue;
      v.key = key;
      drawScene(v.ctx, st.ya, t, st);
    }
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);

  E.scenes = { PW, PH, K, CW: PW * K, CH: PH * K, CARD_W: 64 * K, CARD_H: 48 * K, drawScene, sceneCaption, sceneView, FX_CAPTION, drawCreatureCard };
})();
