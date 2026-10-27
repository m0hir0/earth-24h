/* 地球の24時間 — 静かなアンビエント音楽（ファイルを使わず、その場で作る）
   ゆっくり移り変わる和音（Dの明るい響き）と、ときどき鳴る鈴の音、長い残響。
   E.ambient.create(ctx) → { input: なし, out, setDepth(0〜1), fade(on), schedule(この時刻まで) }
   depth が深いほど（46億年の底に近いほど）全体の音程が下がり、音色は暗く、鈴はまばらになる。今へ戻ると上がっていく */
(function () {
  'use strict';
  const E = window.E24 || (window.E24 = {});
  const hz = (m) => 440 * Math.pow(2, (m - 69) / 12);
  // 和音（MIDI の音の番号）：D△9 → Bm9 → G△7(#11) → A sus
  const CHORDS = [
    [38, 57, 61, 64, 66],
    [35, 54, 57, 61, 62],
    [43, 54, 59, 61, 62],
    [45, 52, 57, 59, 64],
  ];
  const BELL = [74, 76, 78, 81, 83, 86, 88, 90];    // Dのペンタトニック
  const CHORD_SEC = 9, DOWN = -700;                  // 和音は9秒ごと、いちばん深いところで5度下

  function impulse(ctx, sec, decay) {                // 残響：だんだん消えていく雑音
    const n = Math.floor(ctx.sampleRate * sec), b = ctx.createBuffer(2, n, ctx.sampleRate);
    for (let c = 0; c < 2; c++) {
      const d = b.getChannelData(c);
      for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, decay);
    }
    return b;
  }

  function create(ctx) {
    const out = ctx.createGain(); out.gain.value = 0;
    const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -18; comp.ratio.value = 3;
    out.connect(comp); comp.connect(ctx.destination);
    const rev = ctx.createConvolver(); rev.buffer = impulse(ctx, 5, 2.6);
    const wet = ctx.createGain(); wet.gain.value = 0.6; rev.connect(wet); wet.connect(out);
    const dry = ctx.createGain(); dry.gain.value = 0.4; dry.connect(out);
    const bus = ctx.createGain(); bus.connect(dry); bus.connect(rev);
    const tone = ctx.createBiquadFilter(); tone.type = 'lowpass'; tone.frequency.value = 1400; tone.Q.value = 0.5; tone.connect(bus);
    const echo = ctx.createDelay(2); echo.delayTime.value = 0.62;                      // 鈴のこだま
    const fb = ctx.createGain(); fb.gain.value = 0.32; echo.connect(fb); fb.connect(echo); echo.connect(rev);

    let depth = 0, cents = 0, nextChord = ctx.currentTime + 0.1, nextBell = ctx.currentTime + 2, ci = 0;
    const live = new Set();                                                          // 鳴っている音（音程を合わせて動かす）

    function voice(m, t, dur, opt) {
      const g = ctx.createGain(); g.gain.value = 0;
      g.connect(opt.to);
      const oscs = opt.types.map((type, i) => {
        const o = ctx.createOscillator(); o.type = type; o.frequency.value = hz(m) * (opt.mul ? opt.mul[i] : 1);
        const base = opt.det ? opt.det[i] : 0;
        o.detune.value = cents + base;
        const og = ctx.createGain(); og.gain.value = opt.mix ? opt.mix[i] : 1;
        o.connect(og); og.connect(g);
        o.start(t); o.stop(t + dur + 0.1);
        const v = { o, base };
        live.add(v); o.onended = () => live.delete(v);
        return o;
      });
      opt.env(g.gain, t, dur);
      return oscs;
    }
    function pad(m, t, level) {                                                      // 和音の1音：ふくらんで、ゆっくり消える
      const dur = CHORD_SEC + 6;
      voice(m, t, dur, {
        to: tone, types: ['triangle', 'sawtooth', 'sine'], det: [-5, 6, 0], mix: [0.6, 0.12, 0.5],
        env: (p, t0) => { p.setValueAtTime(0, t0); p.linearRampToValueAtTime(level, t0 + 3.5); p.setValueAtTime(level, t0 + CHORD_SEC - 1); p.linearRampToValueAtTime(0, t0 + dur); },
      });
    }
    function bell(m, t) {
      const g = 0.05 * (1 - 0.4 * depth);
      const to = ctx.createGain(); to.connect(bus); to.connect(echo);
      voice(m, t, 4.5, {
        to, types: ['sine', 'sine'], mul: [1, 2.01], mix: [1, 0.18],
        env: (p, t0) => { p.setValueAtTime(0, t0); p.linearRampToValueAtTime(g, t0 + 0.01); p.exponentialRampToValueAtTime(0.0001, t0 + 4.4); },
      });
    }
    // この時刻までの音を予約する（setInterval からも、録音の確認からも呼べる）
    function schedule(until) {
      while (nextChord < until) {
        const ch = CHORDS[ci++ % CHORDS.length];
        ch.forEach((m, i) => pad(m, nextChord, i === 0 ? 0.085 : 0.045));
        nextChord += CHORD_SEC;
      }
      while (nextBell < until) {
        if (Math.random() < 0.8 - 0.55 * depth) bell(BELL[Math.floor(Math.random() * BELL.length)], nextBell);
        nextBell += 1.6 + Math.random() * 3.2 + depth * 3;
      }
    }
    function setDepth(d) {
      depth = Math.min(1, Math.max(0, d));
      cents = DOWN * depth;
      const now = ctx.currentTime;
      for (const v of live) v.o.detune.setTargetAtTime(cents + v.base, now, 0.5);
      tone.frequency.setTargetAtTime(1400 - 900 * depth, now, 0.8);
    }
    function fade(on) { out.gain.setTargetAtTime(on ? 1.4 : 0, ctx.currentTime, on ? 1.2 : 0.5); }
    return { out, schedule, setDepth, fade };
  }

  E.ambient = { create };
})();
