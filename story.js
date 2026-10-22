/* 地球の24時間 — 記録から作るもの：系統の物語、結末の場面、記録の検証
   ゲーム（app.js）と化石の博物館（museum.js）の両方で使う。読み込みは evo.js と lang-en.js のあと */
(function () {
  'use strict';
  const E = window.E24;
  const { T, tr, S, fmtAgo, fmtSpan } = E;
  const evo = E.evo;
  // 記録（g: [[体のつくり, 変種, 名前], ...]）から姿へ
  const lookOfG = (g) => ({ plan: g[0], v: g[1] });
  const mid = (s) => (E.LANG === 'en' ? s.replace(/^The /, 'the ') : s);      // 文の途中に入れるとき
  // 種の数は、その仲間の実際の種数の目安に合わせて見せる（evo.realCount）
  function fmtCount(n) {
    if (E.LANG === 'en') return n.toLocaleString('en-US');
    if (n >= 10000) return `${E.trim((n / 10000).toFixed(n >= 100000 ? 0 : 1))}万`;
    return n.toLocaleString('ja-JP');
  }
  // 結末の場面：生き残れば今日の子孫の暮らし、絶滅すればその化石が眠る地層
  function endScene(alive, endYa, plan, habitat, cause, look) {
    const e = evo.endingOf({ a: alive, p: plan, h: habitat, c: cause });
    return { ya: alive ? 0.3 : Math.max(endYa, 1), ending: { ...e, plan, look: look || { plan } } };
  }
  const sceneOfData = (d) => (d.u ? { ya: d.b, ending: { ...evo.endingOf(d), ya: d.b } } : endScene(d.a, d.e, d.p, d.h, d.c, d.g && d.g.length ? lookOfG(d.g[d.g.length - 1]) : null));
  const endingLabel = (e) => T('結末 No.{no}「{t}」', { no: String(e.no).padStart(2, '0'), t: e.title });
  // 記録を確かめて、決まった形にそろえる（シェアのリンク・履歴・博物館で共通）
  function cleanData(d) {
    if (!d || d.v !== 1 || !evo.PLANS[d.p] || !(d.b > 0 && d.b <= S) || !(d.e >= 0 && d.e <= d.b)) return null;
    const str = (x, n) => String(x || '').slice(0, n);
    const num = (x) => (Number.isFinite(+x) && +x >= 0 ? Math.round(+x) : null);
    const g = (Array.isArray(d.g) ? d.g : []).filter((f) => Array.isArray(f) && evo.PLANS[f[0]]).slice(0, 12).map((f) => (num(f[3]) == null ? [f[0], str(f[1], 12), str(f[2], 40)] : [f[0], str(f[1], 12), str(f[2], 40), num(f[3])]));
    const x = (Array.isArray(d.x) ? d.x : []).filter((v) => Array.isArray(v) && num(v[1]) != null && num(v[2]) != null).slice(0, 6).map((v) => [str(v[0], 60), num(v[1]), num(v[2])]);
    return { v: 1, u: d.u ? 1 : 0, b: d.b, e: d.e, a: d.a ? 1 : 0, f: str(d.f, 40), n: str(d.n, 40), p: d.p, h: str(d.h, 10), c: str(d.c, 60), k: (Array.isArray(d.k) ? d.k : []).slice(0, 20).map((x) => str(x, 40)), g, x, y: num(d.y) || 0 };
  }
  /* ---------- 系統の一生を、ひとつの物語に ----------
     保存した記録（d）だけから作るので、結末・履歴・シェアされたリンクのどれでも同じ文章になる */
  const LIST = () => (E.LANG === 'en' ? ', ' : '、');
  const storyOf = (d) => storyParts(d).join(E.LANG === 'en' ? ' ' : '');
  function storyParts(d) {
    if (d.u) return [T('{a}、生まれようとしたその時代の地球は、まだマグマと隕石の星でした。生命が現れるのは、それから{y}もあとのことです。', { a: fmtAgo(d.b), y: fmtSpan(d.b - 3.8e9) })];
    const per = E.periodOf(d.b), where = per.name || per.era;
    const out = [T('{a}、{p}の地球に、「{f}」として生まれました。', { a: fmtAgo(d.b), p: where, f: tr(d.f) })];
    // 進化：姿が変わったところ（多ければまとめる）
    const evos = (d.g || []).slice(1);
    if (evos.length && evos.length <= 2) {
      let prev = (d.g[0] && d.g[0][2]) || d.f;
      for (const f of evos) {
        out.push(f[3] != null ? T('{a}、{x}は{y}に進化しました。', { a: fmtAgo(f[3]), x: tr(prev), y: tr(f[2]) }) : T('{x}は{y}に進化しました。', { x: tr(prev), y: tr(f[2]) }));
        prev = f[2];
      }
    } else if (evos.length > 2) {
      out.push(T('それから{l}へと、{n}回姿を変えていきました。', { l: evos.map((f) => tr(f[2])).join(LIST()), n: evos.length }));
    } else if (d.k.length) {
      out.push(T('{n}回の分かれ道で、{l}を選びました。', { n: d.k.length, l: d.k.slice(-2).map((x) => `「${tr(x)}」`).join(LIST()) }));
    }
    // 淘汰：いちばん大きく減ったものを2つまで（死因の出来事は結末で書く）
    const yaOf = (name) => (evo.EXTINCTIONS.find((x) => x.name === name) || {}).ya || 0;
    const hits = (d.x || []).filter((x) => x[2] > 0).sort((a, b) => b[1] / Math.max(b[2], 1) - a[1] / Math.max(a[2], 1)).slice(0, 2).sort((a, b) => yaOf(b[0]) - yaOf(a[0]));
    for (const [name, b, a] of hits) out.push(T('{e}では、{b}種のうち{a}種だけが生き延びました。', { e: mid(tr(name)), b: fmtCount(b), a: fmtCount(a) }));
    // 結末
    const span = fmtSpan(d.b - d.e);
    if (d.a) {
      out.push(T('そして{y}にわたって系統をつなぎ、今日まで生き残りました。今の子孫は、{t}。', { y: span, t: evo.PLANS[d.p].today }));
      out.push(T('地球に現れた種の99%以上が消えたなかで、あなたの系統は残りました。'));
    } else {
      const fatal = (d.x || []).find((x) => x[2] === 0 && x[0] === d.c);
      if (d.c.includes('背景')) out.push(T('{a}、数を減らし続けて、最後の種が消えました。{y}続いた系統でした。', { a: fmtAgo(d.e), y: span }));
      else if (fatal) out.push(T('{a}、{e}で、残っていた{b}種がすべて消えました。{y}続いた系統でした。', { a: fmtAgo(d.e), e: mid(tr(d.c)), b: fmtCount(fatal[1]), y: span }));
      else out.push(T('{a}、{e}で姿を消しました。{y}続いた系統でした。', { a: fmtAgo(d.e), e: mid(tr(d.c)), y: span }));
      out.push(T('地球に現れた種の99%以上と同じように、あなたの系統も、地層の中で眠っています。'));
    }
    return out;
  }

  E.story = { lookOfG, mid, fmtCount, endScene, sceneOfData, endingLabel, cleanData, storyParts, storyOf };
})();
