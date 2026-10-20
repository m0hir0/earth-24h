/* 地球の24時間 v2 — ドット絵の風景（192×64 で描いて拡大表示） */
(function () {
  'use strict';
  const E = window.E24;
  const { NOW, ago } = E;
  /* ============================================================
     ドット絵の風景（192×64 で描いて拡大表示）
     ============================================================ */
  const PW = 192, PH = 64;

  function painter(ctx) {
    const P = {
      rect(x, y, w, h, c) { ctx.fillStyle = c; ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); },
      disc(cx, cy, r, c) {
        for (let dy = -r; dy <= r; dy++) { const w = Math.floor(Math.sqrt(r * r - dy * dy)); P.rect(cx - w, cy + dy, 2 * w + 1, 1, c); }
      },
      dome(cx, by, r, c) {
        for (let dy = 0; dy <= r; dy++) { const w = Math.floor(Math.sqrt(r * r - dy * dy)); P.rect(cx - w, by - dy, 2 * w + 1, 1, c); }
      },
      tri(cx, base, h, c, slope = 1) {           // 山・ピラミッド・屋根
        for (let dy = 0; dy < h; dy++) { const w = Math.round((h - dy) * slope); P.rect(cx - w, base - dy, 2 * w + 1, 1, c); }
      },
      bands(colors, y0 = 0, y1 = PH) {
        const h = (y1 - y0) / colors.length;
        colors.forEach((c, i) => P.rect(0, y0 + Math.floor(i * h), PW, Math.ceil(h) + 1, c));
      },
      ridge(base, amp, seed, c, freq = 0.06, x0 = 0, x1 = PW) {
        for (let x = x0; x < x1; x++) {
          const h = amp * (0.55 + 0.3 * Math.sin(x * freq + seed) + 0.15 * Math.sin(x * freq * 3.7 + seed * 1.7));
          P.rect(x, Math.round(base - h), 1, PH, c);
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
      sprite(rows, pal, x, y, flip = false, s = 1) {   // s: 拡大率（主役の生き物は2）
        for (let j = 0; j < rows.length; j++) {
          const row = rows[j];
          for (let i = 0; i < row.length; i++) {
            const ch = row[flip ? row.length - 1 - i : i];
            if (ch !== '.') P.rect(x + i * s, y + j * s, s, s, pal[ch]);
          }
        }
      },
    };
    return P;
  }

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
    // ドローン
    const dx = wrapX(t * 0.9, PW, 30), dy = 12 + Math.round(Math.sin(t * 0.3) * 2);
    P.rect(dx, dy, 6, 1, '#d8dce8'); P.rect(dx - 1, dy - 1, 2, 1, t % 2 ? '#ffffff' : '#9098b0'); P.rect(dx + 5, dy - 1, 2, 1, t % 2 ? '#9098b0' : '#ffffff'); P.rect(dx + 2, dy + 1, 2, 2, '#ffb347');
    // 道路と自動運転車
    P.ground(44, '#5a5c66');
    P.rect(0, 47, PW, 8, '#363842'); for (let x = 0; x < PW; x += 12) P.rect(x + (t % 12), 51, 6, 1, '#cfd2dc');
    const cx = wrapX(t * 1.3, PW, 30);
    P.sprite(SPR.car, { a: '#eef1f6', b: '#8fd8ff', c: '#111' }, cx, 46);
    P.rect(cx + 5, 45, 2, 1, (t % 4 < 2) ? '#5ee0ff' : '#2a6a80');    // センサー
    P.sprite(SPR.car, { a: '#c9433a', b: '#cfe6f2', c: '#111' }, wrapX(PW - t * 1.0, PW, 30), 50, true);
    // 歩道：人とロボット
    P.rect(0, 56, PW, 8, '#8a8c96');
    for (let k = 0; k < 4; k++) {
      const x = wrapX(k * 47 + t * (k % 2 ? 0.25 : -0.25), PW);
      person(P, x, 64, ['#d0603a', '#3a8a7a', '#c9a23a', '#6a5aa0'][k], true);
      if ((t + k * 5) % 16 < 9) { P.rect(x + 2, 52, 6, 3, '#ffffff'); P.rect(x + 3, 53, 4, 1, '#c96a3e'); P.rect(x + 3, 55, 1, 1, '#ffffff'); }   // AIとの会話の吹き出し
    }
    const rx = wrapX(70 + t * 0.35, PW, 30);                              // 二足歩行ロボット
    P.rect(rx, 50, 4, 3, '#e6e9f0'); P.rect(rx + 1, 51, 2, 1, '#5ee0ff');
    P.rect(rx - 1, 53, 6, 5, '#d0d4de'); P.rect(rx + 1, 54, 2, 1, '#ffb347');
    P.rect(rx, 58, 1, 6 - (t % 2), '#9aa0ae'); P.rect(rx + 3, 58, 1, 5 + (t % 2), '#9aa0ae');
    const bx = wrapX(PW - 40 - t * 0.5, PW, 30);                          // 配達ロボット
    P.rect(bx, 59, 7, 4, '#f2f2f2'); P.rect(bx + 1, 60, 5, 1, '#ffb347'); P.rect(bx, 63, 2, 1, '#222'); P.rect(bx + 5, 63, 2, 1, '#222');
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

  /* ---------------- あなたの系統（生き物の姿） ---------------- */
  const PLAYER_SPR = {
    soft: null, sponge: null, ediacaran: null,
    arthropod: ['trilo', { a: '#e0b04a', b: '#7a5a20' }, 2],
    anomalo: ['anomalo', { a: '#e0805a', b: '#8a4a38' }, 2],
    jawless: ['fish', { a: '#d8b070' }, 2],
    fish: ['fish', { a: '#f0c060' }, 3],
    shark: ['shark', { a: '#7a92a6', b: '#e8eef2' }, 2],
    armorfish: ['armorfish', { a: '#b0a070', b: '#6a6040' }, 2],
    insect: null,
    amphibian: ['amphib', { a: '#4f8a3a', b: '#f0e6c0' }, 2],
    reptile: ['reptile', { a: '#b08a3e', b: '#2a2a1a' }, 2],
    synapsid: ['dimetro', { a: '#b0603a', b: '#e0a060' }, 2],
    marine_reptile: ['plesio', { a: '#4a8aa0', b: '#2a5a6a' }, 2],
    pterosaur: ['pteroA', { a: '#b0704a' }, 2],
    dino_small: ['raptor', { a: '#c06a3a', b: '#f4ead0' }, 2],
    sauropod: ['sauro', { a: '#9a8a6a', b: '#6a5e48' }, 2],
    theropod: ['thero', { a: '#c06a3a', b: '#7a3f28', e: '#f4ead0' }, 2],
    bird: ['bird', { a: '#4a6aa0', b: '#f0c040' }, 3],
    mammal: ['mammal', { a: '#b07a4a' }, 2],
    mammal_large: ['horse', { a: '#8a5a3a', b: '#4a3020' }, 2],
    whale: ['whale', { a: '#4a6278', b: '#c8d4dc' }, 2],
    primate: ['primate', { a: '#8a5a3a', b: '#c8a080' }, 2],
    hominin: ['homA', { a: '#7a4e34', b: '#4c3426' }, 2],
    human: ['hunter', { a: '#c08a66', b: '#3a6a9a', c: '#e0cfa0' }, 2],
  };
  function marker(P, x, y, t) {                       // あなたを示す矢印
    const b = t % 6 < 3 ? 0 : 1;
    P.rect(x - 2, y - 5 + b, 5, 1, '#ffd84a'); P.rect(x - 1, y - 4 + b, 3, 1, '#ffd84a'); P.rect(x, y - 3 + b, 1, 1, '#ffd84a');
  }
  function drawPlayer(P, plan, t, ground = 56) {
    if (plan === 'microbe' || plan === 'cyano' || plan === 'cell' || plan === 'colony') {
      const cx = 96, cy = 30, r = 20;                 // 顕微鏡の窓
      P.disc(cx, cy, r + 2, '#33413f'); P.disc(cx, cy, r, '#dcefe0');
      const col = plan === 'cyano' ? '#3f9a5a' : plan === 'microbe' ? '#8a9a6a' : '#7ab08a';
      const n = plan === 'colony' ? 7 : 5;
      for (let k = 0; k < n; k++) {
        const a = t * 0.06 + k * (6.283 / n), d = plan === 'colony' ? 6 : 11;
        const x = cx + Math.round(Math.cos(a) * d), y = cy + Math.round(Math.sin(a) * d * 0.7);
        if (plan === 'microbe' || plan === 'cyano') { P.rect(x - 3, y - 1, 6, 3, col); P.rect(x - 2, y - 2, 4, 5, col); }
        else { P.disc(x, y, 3, col); P.disc(x, y, 1, '#3e6a4a'); }
      }
      marker(P, cx, cy - r - 1, t);
      return;
    }
    const x = 92;
    if (plan === 'soft' || plan === 'sponge' || plan === 'ediacaran') {
      if (plan === 'sponge') { P.rect(x, ground - 12, 6, 12, '#e0a050'); P.rect(x + 1, ground - 13, 4, 1, '#f0c070'); marker(P, x + 3, ground - 14, t); return; }
      if (plan === 'ediacaran') { for (let y = 0; y < 14; y++) P.rect(x + Math.round(Math.sin(y * 0.3 + t * 0.2)) - 1, ground - y, 4, 1, y % 2 ? '#f0a070' : '#d08050'); marker(P, x + 1, ground - 15, t); return; }
      const y = 24 + Math.round(Math.sin(t * 0.2) * 3);
      P.dome(x, y, 6, 'rgba(255,200,240,0.85)');
      for (let i = -5; i <= 5; i += 2) P.rect(x + i, y + 1, 1, 4 + ((t + i) % 3), 'rgba(255,200,240,0.7)');
      marker(P, x, y - 8, t);
      return;
    }
    if (plan === 'insect') {
      const y = 22 + Math.round(Math.sin(t * 0.4) * 3);
      P.rect(x, y, 10, 2, '#2f6f9a'); P.rect(x + 2, y - 2, 5, 2, t % 2 ? 'rgba(240,250,255,0.95)' : 'rgba(240,250,255,0.5)'); P.rect(x + 2, y + 2, 5, 2, 'rgba(240,250,255,0.7)');
      marker(P, x + 4, y - 4, t);
      return;
    }
    const spec = PLAYER_SPR[plan];
    if (!spec) return;
    const [name, pal, s] = spec;
    const rows = SPR[name];
    const w = rows[0].length * s, h = rows.length * s;
    const swim = ['jawless', 'fish', 'shark', 'armorfish', 'marine_reptile', 'whale', 'anomalo'].includes(plan);
    const fly = plan === 'pterosaur' || plan === 'bird';
    const y = fly ? 14 + Math.round(Math.sin(t * 0.2) * 3) : swim ? 30 + Math.round(Math.sin(t * 0.15) * 2) : ground - h;
    const xx = x - Math.round(w / 2) + Math.round(Math.sin(t * 0.07) * 4);
    P.sprite(fly && t % 4 >= 2 && name === 'pteroA' ? SPR.pteroB : rows, pal, xx, y, false, s);
    marker(P, xx + Math.round(w / 2), y - 1, t);
  }

  function drawScene(ctx, ya, t, opts = {}) {
    const P = painter(ctx);
    ctx.clearRect(0, 0, PW, PH);
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
    if (plan) drawPlayer(P, plan, t, 58);
  }

  const FX_CAPTION = {
    impact: '巨大隕石の衝突・恐竜の時代が終わる',
    eruption: '大噴火で空が暗くなる・生き物の大半が絶滅',
    ice: '氷河が広がる・海が冷え込む',
    oxygen: '酸素が増える・酸素は多くの微生物にとって毒',
  };
  function sceneCaption(ya, opts = {}) {
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
    return 'データセンターとAI・人とロボットが同じ道を歩く';
  }

  // 表示中のキャンバスを 8コマ/秒 で描き直す
  const views = [];
  function sceneView(canvas, getState) {
    canvas.width = PW; canvas.height = PH;
    views.push({ canvas, ctx: canvas.getContext('2d'), getState, key: '' });
  }
  const REDUCE = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function loop(now) {
    const t = REDUCE ? 0 : Math.floor(now / 125);
    for (const v of views) {
      if (!v.canvas.offsetParent) continue;
      const st = v.getState(now);
      if (!st) continue;
      const key = `${t}|${st.ya}|${st.fx}|${st.habitat}|${st.plan}`;
      if (key === v.key) continue;
      v.key = key;
      drawScene(v.ctx, st.ya, t, st);
    }
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);

  E.scenes = { PW, PH, drawScene, sceneCaption, sceneView, FX_CAPTION };
})();
