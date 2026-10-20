/* 地球の24時間 — 時代で姿が変わる、回るドット絵の地球 */
(function () {
  'use strict';
  const E = window.E24;
  const N = 72;                      // 地球の直径（ドット）
  const TW = 128, TH = 64;           // 地図（正距円筒）の大きさ

  /* ---------------- ノイズ ---------------- */
  function hash(x, y, z) {
    let h = (x * 374761393 + y * 668265263 + z * 2147483647) | 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  }
  const lerp = (a, b, t) => a + (b - a) * t;
  const fade = (t) => t * t * (3 - 2 * t);
  function vnoise(x, y, z) {
    const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
    const xf = fade(x - xi), yf = fade(y - yi), zf = fade(z - zi);
    const c = (dx, dy, dz) => hash(xi + dx, yi + dy, zi + dz);
    return lerp(
      lerp(lerp(c(0, 0, 0), c(1, 0, 0), xf), lerp(c(0, 1, 0), c(1, 1, 0), xf), yf),
      lerp(lerp(c(0, 0, 1), c(1, 0, 1), xf), lerp(c(0, 1, 1), c(1, 1, 1), xf), yf), zf);
  }
  // 球面上の点（経度・緯度、度）でのノイズ。継ぎ目が出ない
  function sphNoise(lon, lat, scale, seed) {
    const a = lon * Math.PI / 180, b = lat * Math.PI / 180;
    const x = Math.cos(b) * Math.cos(a), y = Math.cos(b) * Math.sin(a), z = Math.sin(b);
    let v = 0, amp = 0.6, f = scale;
    for (let o = 0; o < 3; o++) { v += amp * vnoise(x * f + seed, y * f + seed * 2, z * f + seed * 3); amp *= 0.5; f *= 2.1; }
    return v / 1.05;
  }

  /* ---------------- 大陸の形（経度, 緯度） ---------------- */
  const MODERN = [
    [[-168, 66], [-140, 70], [-95, 72], [-78, 62], [-56, 52], [-66, 44], [-80, 26], [-97, 18], [-88, 15], [-78, 8], [-105, 20], [-118, 33], [-125, 42], [-133, 56], [-165, 60]],
    [[-55, 60], [-22, 70], [-28, 83], [-62, 81], [-73, 77]],
    [[-80, 10], [-62, 11], [-35, -6], [-40, -23], [-58, -38], [-68, -55], [-75, -45], [-71, -18], [-81, -5]],
    [[-10, 36], [-9, 44], [-2, 48], [5, 52], [8, 57], [5, 62], [14, 70], [30, 71], [42, 66], [44, 45], [28, 41], [22, 37], [12, 44]],
    [[-17, 15], [-6, 36], [11, 37], [33, 31], [43, 12], [51, 12], [40, -15], [33, -28], [20, -35], [13, -20], [9, 4], [-8, 4]],
    [[44, 45], [42, 66], [60, 70], [80, 73], [110, 77], [140, 72], [180, 68], [178, 62], [160, 60], [140, 52], [128, 40], [122, 30], [120, 22], [108, 10], [100, 2], [97, 16], [90, 22], [80, 8], [72, 20], [57, 25], [48, 30], [35, 36]],
    [[35, 30], [43, 13], [52, 16], [57, 24], [48, 30]],
    [[114, -22], [129, -12], [142, -11], [153, -26], [147, -39], [135, -35], [116, -35]],
    [[130, 31], [136, 34], [141, 37], [142, 41], [145, 44], [141, 45], [139, 38], [132, 34]],
    [[96, 5], [118, -8], [141, -6], [131, -1], [106, -6]],
    [[-6, 50], [2, 51], [-2, 58], [-6, 57]],
    [[44, -13], [50, -16], [47, -25], [43, -22]],
    [[167, -46], [178, -38], [174, -41], [168, -44]],
  ];
  const PALEOZOIC = [
    [[-40, -8], [40, -4], [62, -40], [22, -82], [-40, -72], [-55, -30]],     // ゴンドワナ
    [[-100, -5], [-55, 5], [-50, 38], [-95, 42]],                            // ローレンシア
    [[0, 18], [30, 20], [32, 46], [2, 44]],                                  // バルティカ
    [[62, 8], [100, 12], [102, 42], [62, 40]],                               // シベリア
  ];
  const PANGAEA = [
    [[-70, 72], [10, 78], [90, 64], [118, 38], [70, 28], [40, 12], [70, -20], [45, -62], [-10, -82], [-62, -52], [-48, -10], [-66, 22], [-96, 48]],
  ];
  const BREAKUP = [
    [[-105, 22], [-20, 30], [40, 34], [118, 36], [120, 70], [-60, 76]],     // ローラシア
    [[-72, 2], [-12, 8], [58, 0], [52, -40], [22, -72], [-62, -52]],        // ゴンドワナ
  ];
  function inPoly(x, y, poly) {
    let inside = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const [xi, yi] = poly[i], [xj, yj] = poly[j];
      if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
    }
    return inside;
  }
  const inAny = (lon, lat, polys) => polys.some((p) => inPoly(lon, lat, p));

  /* ---------------- 時代ごとの地図 ---------------- */
  function stageOf(ya) {
    if (ya > 4.0e9) return 'molten';
    if (ya > 2.5e9) return 'archean';
    if (ya <= 7.2e8 && ya > 6.35e8) return 'snowball';
    if (ya > 6.35e8) return 'proterozoic';
    if (ya > 4.7e8) return 'paleo-bare';
    if (ya > 3.35e8) return 'paleo-green';
    if (ya > 1.75e8) return 'pangaea';
    if (ya > 6.6e7) return 'breakup';
    if (ya > 3.4e7) return 'cenozoic';
    if (ya > 2.58e6) return 'antarctic-ice';
    return 'modern';
  }
  const hex = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
  const C = {
    lava: hex('#ff8a2a'), crust: hex('#3a1612'), crust2: hex('#5a2216'),
    seaGreen: hex('#3d7c72'), seaGreen2: hex('#346c64'), sea: hex('#2f6aa8'), sea2: hex('#295e98'),
    rock: hex('#8a6e55'), rock2: hex('#76604a'), green: hex('#4f8a3a'), green2: hex('#3f7a32'), desert: hex('#c8ac72'),
    ice: hex('#eef4f8'), ice2: hex('#d6e4ee'),
  };
  const texCache = new Map();
  function texture(stage) {
    if (texCache.has(stage)) return texCache.get(stage);
    const tex = new Uint8ClampedArray(TW * TH * 3);
    for (let v = 0; v < TH; v++) {
      const lat = 90 - (v + 0.5) * 180 / TH;
      for (let u = 0; u < TW; u++) {
        const lon = (u + 0.5) * 360 / TW - 180;
        const n = sphNoise(lon, lat, 2.2, 7);
        const jlon = lon + (sphNoise(lon, lat, 4, 11) - 0.5) * 14, jlat = lat + (sphNoise(lon, lat, 4, 13) - 0.5) * 10;
        let c;
        if (stage === 'molten') c = n > 0.62 ? C.lava : n > 0.5 ? C.crust2 : C.crust;
        else if (stage === 'snowball') c = n > 0.55 ? C.ice2 : C.ice;
        else if (stage === 'archean') c = n > 0.7 ? C.rock : n > 0.5 ? C.seaGreen2 : C.seaGreen;
        else if (stage === 'proterozoic') {
          const d = Math.acos(Math.cos(jlat * Math.PI / 180) * Math.cos((jlon - 20) * Math.PI / 180)) * 180 / Math.PI;
          c = d < 42 ? (n > 0.55 ? C.rock2 : C.rock) : n > 0.55 ? C.sea2 : C.sea;
        } else {
          const polys = stage.startsWith('paleo') ? PALEOZOIC : stage === 'pangaea' ? PANGAEA : stage === 'breakup' ? BREAKUP : MODERN;
          const land = inAny(jlon, jlat, polys) || ((stage === 'antarctic-ice' || stage === 'modern' || stage === 'cenozoic') && lat < -66);
          if (land) {
            if (stage === 'paleo-bare') c = n > 0.55 ? C.rock2 : C.rock;
            else if ((stage === 'modern' || stage === 'antarctic-ice') && lat < -64) c = C.ice;
            else if (stage === 'modern' && lat > 66 && n > 0.45) c = C.ice;
            else if (Math.abs(lat) < 32 && Math.abs(lat) > 14 && n > 0.56) c = C.desert;
            else c = n > 0.55 ? C.green2 : C.green;
          } else if (stage === 'modern' && lat > 78) c = C.ice2;
          else c = n > 0.55 ? C.sea2 : C.sea;
        }
        const i = (v * TW + u) * 3;
        tex[i] = c[0]; tex[i + 1] = c[1]; tex[i + 2] = c[2];
      }
    }
    texCache.set(stage, tex);
    return tex;
  }
  let cloudTex = null;
  function clouds() {
    if (cloudTex) return cloudTex;
    cloudTex = new Uint8ClampedArray(TW * TH);
    for (let v = 0; v < TH; v++) for (let u = 0; u < TW; u++) {
      const lat = 90 - (v + 0.5) * 180 / TH, lon = (u + 0.5) * 360 / TW - 180;
      const n = sphNoise(lon, lat, 3.2, 29);
      cloudTex[v * TW + u] = n > 0.6 ? Math.min(220, (n - 0.6) * 900) : 0;
    }
    return cloudTex;
  }

  /* ---------------- 球に描く ---------------- */
  const L = (() => { const v = [-0.45, 0.5, 0.74], m = Math.hypot(...v); return v.map((x) => x / m); })();
  function draw(ctx, ya, rot) {
    const stage = stageOf(ya);
    const tex = texture(stage), cl = clouds();
    const img = ctx.createImageData(N, N), px = img.data;
    const r = N / 2 - 0.5;
    const hasAir = stage !== 'molten';
    const crot = rot * 1.35;
    for (let y = 0; y < N; y++) {
      for (let x = 0; x < N; x++) {
        const dx = (x + 0.5 - N / 2) / r, dy = (y + 0.5 - N / 2) / r, d2 = dx * dx + dy * dy;
        if (d2 > 1) continue;
        const z = Math.sqrt(1 - d2);
        const lat = Math.asin(-dy), lon = Math.atan2(dx, z);
        const uu = (((lon + rot) / (2 * Math.PI)) % 1 + 1) % 1;
        const u = Math.min(TW - 1, Math.floor(uu * TW)), v = Math.min(TH - 1, Math.floor((0.5 - lat / Math.PI) * TH));
        const ti = (v * TW + u) * 3;
        let R = tex[ti], G = tex[ti + 1], B = tex[ti + 2];
        if (hasAir) {                                                    // 雲
          const cu = Math.min(TW - 1, Math.floor(((((lon + crot) / (2 * Math.PI)) % 1 + 1) % 1) * TW));
          const a = cl[v * TW + cu] / 255 * (stage === 'snowball' ? 0.4 : 0.85);
          R = lerp(R, 250, a); G = lerp(G, 252, a); B = lerp(B, 255, a);
        }
        const lit = Math.max(0, dx * L[0] + -dy * L[1] + z * L[2]);
        let s = 0.28 + 0.82 * lit;
        if (stage === 'molten') s = Math.max(s, R > 200 ? 0.95 : 0);    // 溶岩は自分で光る
        R *= s; G *= s; B *= s;
        if (hasAir && d2 > 0.8) { const t = (d2 - 0.8) / 0.2 * 0.5; R = lerp(R, 140, t); G = lerp(G, 190, t); B = lerp(B, 255, t); }
        const i = (y * N + x) * 4;
        px[i] = R; px[i + 1] = G; px[i + 2] = B; px[i + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
  }
  const LABEL = {
    molten: 'マグマに覆われた地球', archean: '鉄を含む緑がかった海と、小さな陸', proterozoic: '超大陸と、生き物のいない岩の陸',
    snowball: '全球凍結。地球全体が氷に覆われる', 'paleo-bare': 'いくつもの大陸。陸はまだ岩だけ', 'paleo-green': '陸に植物が広がる',
    pangaea: '超大陸パンゲア', breakup: 'パンゲアが南北に分かれる', cenozoic: '今に近い大陸の形', 'antarctic-ice': '南極に氷床ができる', modern: '今の地球',
  };
  E.globe = { N, draw, stageOf, label: (ya) => E.tr(LABEL[stageOf(ya)]) };
})();
