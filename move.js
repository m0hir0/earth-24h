/* 地球の24時間 — 引っ越し（各ページの <head> のいちばん最初に読む）
   ・古い住所（m0hir0.github.io/earth-24h、earth-24h.pages.dev）を開いた人を、earth24h.com の同じページへ送る
   ・そのとき、この端末の記録（図鑑・履歴・今日の地球・言語など localStorage の earth24.*）をリンクの # に乗せて運ぶ
   ・earth24h.com 側では、届いた記録をこの端末に合わせて入れる（すでにある記録は消さない）
   # の部分はサーバーに送られないので、記録がどこかに残ることはない */
(function () {
  'use strict';
  var HOME = 'https://earth24h.com';
  var OLD = { 'm0hir0.github.io': '/earth-24h', 'earth-24h.pages.dev': '' };   // プレビュー用の xxx.earth-24h.pages.dev は送らない
  var host = location.hostname;
  var b64 = function (s) { return btoa(unescape(encodeURIComponent(s))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); };
  var unb64 = function (s) { return decodeURIComponent(escape(atob(s.replace(/-/g, '+').replace(/_/g, '/')))); };

  // 古い住所 → 新しい住所へ
  if (Object.prototype.hasOwnProperty.call(OLD, host)) {
    var base = OLD[host];
    var path = location.pathname.indexOf(base) === 0 ? location.pathname.slice(base.length) : location.pathname;
    var data = {};
    try {
      for (var i = 0; i < localStorage.length; i++) {
        var k = localStorage.key(i);
        if (k && k.indexOf('earth24.') === 0) data[k] = localStorage.getItem(k);
      }
    } catch (e) { /* 読めなければ記録なしで移る */ }
    var tail = location.hash;                                   // シェアのリンク（#r=…）や #clock はそのまま
    if (Object.keys(data).length) {
      var packed = b64(JSON.stringify(data));
      // 長すぎるときは履歴の古いものから減らす（図鑑は残る）
      while (packed.length > 60000 && data['earth24.history']) {
        try {
          var h = JSON.parse(data['earth24.history']);
          if (!h.length) break;
          data['earth24.history'] = JSON.stringify(h.slice(0, Math.floor(h.length * 0.7)));
        } catch (e) { delete data['earth24.history']; }
        packed = b64(JSON.stringify(data));
      }
      tail = '#move=' + packed + (location.hash ? '&h=' + encodeURIComponent(location.hash.slice(1)) : '');
    }
    location.replace(HOME + (path || '/') + location.search + tail);
    return;
  }

  // 新しい住所：届いた記録を入れる
  var m = location.hash.match(/^#move=([A-Za-z0-9_-]+)(?:&h=(.*))?$/);
  if (!m) return;
  try {
    var incoming = JSON.parse(unb64(m[1]));
    var get = function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } };
    var set = function (k, v) { try { localStorage.setItem(k, v); } catch (e) { /* */ } };
    Object.keys(incoming).forEach(function (k) {
      if (k.indexOf('earth24.') !== 0 || typeof incoming[k] !== 'string') return;
      var mine = get(k);
      if (mine == null) { set(k, incoming[k]); return; }
      try {
        if (k === 'earth24.history') {                       // 両方の履歴をあわせて、新しい順に100件
          var seen = {}, all = JSON.parse(mine).concat(JSON.parse(incoming[k])).filter(function (x) {
            var id = x && (x.id || JSON.stringify(x));
            if (!x || seen[id]) return false;
            seen[id] = 1; return true;
          });
          all.sort(function (a, b) { return (b.t || 0) - (a.t || 0); });
          set(k, JSON.stringify(all.slice(0, 100)));
        } else if (k === 'earth24.found') {                  // 図鑑は、こちらにない結末・姿を足す
          var A = JSON.parse(mine), B = JSON.parse(incoming[k]);
          ['e', 'f'].forEach(function (p) { A[p] = A[p] || {}; for (var id in (B[p] || {})) if (!A[p][id]) A[p][id] = B[p][id]; });
          set(k, JSON.stringify(A));
        }
        // それ以外（言語・今日の地球など）は、こちらにある値を優先する
      } catch (e) { /* 壊れた記録は入れない */ }
    });
  } catch (e) { /* 読めなければ何もしない */ }
  history.replaceState(null, '', location.pathname + location.search + (m[2] ? '#' + decodeURIComponent(m[2]) : ''));
})();
