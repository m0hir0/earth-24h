/* 地球の24時間 — 化石の博物館：みんなが展示した系統を見て回る
   データは /api/exhibits（functions/）。絵と物語は、ゲームと同じ scenes.js・story.js で作る */
(function () {
  'use strict';
  const E = window.E24;
  const { T } = E;
  const { drawScene, CW, CH } = E.scenes;
  const { sceneOfData, endingLabel, cleanData, storyOf } = E.story;
  const $ = (id) => document.getElementById(id);
  const HKEY = 'earth24.hearts';

  const M = { sort: 'new', kind: 'all', before: 0, offset: 0, busy: false };
  const FOCUS = new URLSearchParams(location.search).get('id');      // リンクで開いた展示（いちばん上に出し、一覧では重ねない）
  const LABELS = {
    new: T('新しい展示'), loved: T('心に留められた'), random: T('ランダムに出会う'),
    all: T('すべて'), dead: T('化石'), alive: T('今も生きている'),
  };
  document.querySelectorAll('#mu-sort button, #mu-kind button').forEach((b) => { b.textContent = LABELS[b.dataset.sort || b.dataset.kind]; });
  $('mu-more').textContent = T('もっと見る');
  $('mu-play').textContent = T('あなたも生まれてみる');

  const hearted = () => { try { return new Set(JSON.parse(localStorage.getItem(HKEY)) || []); } catch (e) { return new Set(); } };
  const markHeart = (id) => { const s = hearted(); s.add(id); try { localStorage.setItem(HKEY, JSON.stringify([...s].slice(-500))); } catch (e) { /* */ } };
  function since(t) {
    const m = Math.max(0, (Date.now() - t) / 60000);
    if (m < 1) return T('たった今');
    if (m < 60) return T('{n}分前', { n: Math.floor(m) });
    if (m < 1440) return T('{n}時間前', { n: Math.floor(m / 60) });
    return T('{n}日前', { n: Math.floor(m / 1440) });
  }

  // 展示の1枚：場面の絵（化石／今日の姿）、結末、物語、心に留める
  function card(item, focus) {
    const d = cleanData(item.data);
    if (!d) return null;
    const st = sceneOfData(d);
    const el = document.createElement('article');
    el.className = `mu-card${focus ? ' focus' : ''}`;
    const cv = document.createElement('canvas'); cv.width = CW; cv.height = CH; cv.className = 'mu-scene';
    drawScene(cv.getContext('2d'), st.ya, 3, st);
    const head = document.createElement('div'); head.className = 'mu-head';
    const tag = document.createElement('span'); tag.className = `mu-tag ${d.a ? 'alive' : 'dead'}`; tag.textContent = d.a ? T('今も生きている') : T('化石');
    const ttl = document.createElement('b'); ttl.textContent = endingLabel(st.ending);
    head.append(tag, ttl);
    if (d.y) { const dy = document.createElement('span'); dy.className = 'mu-tag day'; dy.textContent = T('今日の地球 No.{n}', { n: d.y }); head.appendChild(dy); }
    const story = document.createElement('p'); story.className = 'mu-story'; story.textContent = storyOf(d);
    const foot = document.createElement('div'); foot.className = 'mu-foot';
    const when = document.createElement('span'); when.textContent = T('{t}に展示', { t: since(item.created) });
    const hb = document.createElement('button'); hb.type = 'button'; hb.className = 'mu-heart';
    const done = hearted().has(item.id);
    const paint = (n, on) => { hb.textContent = `${on ? T('心に留めました') : T('心に留める')}  ${n}`; hb.classList.toggle('on', on); hb.disabled = on; };
    paint(item.hearts, done);
    hb.addEventListener('click', async () => {
      paint(item.hearts + 1, true);
      try {
        const r = await fetch(`/api/exhibits/${encodeURIComponent(item.id)}/heart`, { method: 'POST' });
        const j = await r.json();
        if (typeof j.hearts === 'number') paint(j.hearts, true);
        markHeart(item.id);
      } catch (e) { paint(item.hearts, false); }
    });
    foot.append(when, hb);
    el.append(cv, head, story, foot);
    return el;
  }

  async function load(reset) {
    if (M.busy) return;
    M.busy = true;
    $('mu-more').hidden = true;
    if (reset) { $('mu-list').textContent = ''; M.before = 0; M.offset = 0; }
    const q = new URLSearchParams({ sort: M.sort, kind: M.kind, limit: '12' });
    if (M.sort === 'new' && M.before) q.set('before', M.before);
    if (M.sort === 'loved') q.set('offset', M.offset);
    try {
      const r = await fetch(`/api/exhibits?${q}`);
      if (!r.ok) throw new Error(r.status);
      const j = await r.json();
      $('mu-stat').textContent = j.total
        ? T('いま{n}系統が展示されています（うち{a}系統は今も生きている）。', { n: j.total.toLocaleString(), a: j.alive.toLocaleString() })
        : '';
      j.items.forEach((it) => { if (it.id === FOCUS) return; const c = card(it); if (c) $('mu-list').appendChild(c); });
      if (j.items.length) { M.before = j.items[j.items.length - 1].created; M.offset += j.items.length; }
      $('mu-note').hidden = j.total > 0 || !reset;
      $('mu-note').textContent = T('まだ展示がありません。進化ガチャで結末を迎えたら、最初の展示をしてみませんか。');
      $('mu-more').hidden = j.items.length < 12 && M.sort !== 'random';
      $('mu-more').textContent = M.sort === 'random' ? T('ほかの系統に出会う') : T('もっと見る');
    } catch (e) {
      $('mu-note').hidden = false;
      $('mu-note').textContent = T('博物館を開けませんでした。少し時間をおいて、もう一度開いてください。');
    }
    M.busy = false;
  }

  function pick(groupId, key, value) {
    document.querySelectorAll(`#${groupId} button`).forEach((b) => b.setAttribute('aria-selected', String(b.dataset[key] === value)));
  }
  $('mu-sort').addEventListener('click', (ev) => { const b = ev.target.closest('button'); if (!b) return; M.sort = b.dataset.sort; pick('mu-sort', 'sort', M.sort); load(true); });
  $('mu-kind').addEventListener('click', (ev) => { const b = ev.target.closest('button'); if (!b) return; M.kind = b.dataset.kind; pick('mu-kind', 'kind', M.kind); load(true); });
  $('mu-more').addEventListener('click', () => (M.sort === 'random' ? load(true) : load(false)));

  // ?id= のリンクで開いたら、その展示をいちばん上に
  const id = FOCUS;
  if (id) {
    fetch(`/api/exhibits/${encodeURIComponent(id)}`).then((r) => (r.ok ? r.json() : null)).then((it) => {
      const c = it && card(it, true);
      if (c) $('mu-one').appendChild(c);
    }).catch(() => {});
  }
  load(true);
})();
