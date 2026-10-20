/* 地球の24時間 — 言語と現地時間
   日本語の文章をそのままキーにして、英語のときだけ辞書（DICT）から引く */
(function () {
  'use strict';
  const E = (window.E24 = window.E24 || {});
  const KEY = 'earth24.lang';
  const LANGS = ['ja', 'en'];

  let saved = null;
  try { saved = localStorage.getItem(KEY); } catch (e) { /* 保存できない環境 */ }
  const nav = ((navigator.languages && navigator.languages[0]) || navigator.language || 'ja').toLowerCase();
  // ?lang=en で開いたときはその言語を優先して覚える
  const q = new URLSearchParams(location.search).get('lang');
  if (LANGS.includes(q)) { try { localStorage.setItem(KEY, q); } catch (e) { /* */ } }
  const LANG = LANGS.includes(q) ? q : LANGS.includes(saved) ? saved : nav.startsWith('ja') ? 'ja' : 'en';
  document.documentElement.lang = LANG;

  const DICT = {};                                   // 日本語 → 英語
  const addDict = (obj) => Object.assign(DICT, obj);
  const tr = (s) => (LANG === 'en' && s && DICT[s] !== undefined ? DICT[s] : s);
  // T('こんにちは、{name}', { name }) のように差し込む
  function T(ja, vars) {
    let s = tr(ja);
    if (vars) s = s.replace(/\{(\w+)\}/g, (m, k) => (vars[k] !== undefined ? vars[k] : m));
    return s;
  }
  function setLang(l) {
    if (!LANGS.includes(l)) return;
    try { localStorage.setItem(KEY, l); } catch (e) { /* 保存できなくても切り替えはする */ }
    const u = new URL(location.href);
    u.searchParams.set('lang', l);
    location.replace(u.toString());
  }
  // 現地時間：開いた端末のタイムゾーンで、今日の何秒目か
  let TZ = '';
  try { TZ = Intl.DateTimeFormat().resolvedOptions().timeZone || ''; } catch (e) { /* */ }
  const tzLabel = LANG === 'ja' ? (TZ === 'Asia/Tokyo' ? '日本時間' : '現地時間') : 'Local time';
  function clockSec(ms = Date.now()) {
    const d = new Date(ms);
    return d.getHours() * 3600 + d.getMinutes() * 60 + d.getSeconds() + d.getMilliseconds() / 1000;
  }

  // HTML に書いた文章を訳す。data-i18n="キー"（空ならその要素の文章がキー）
  function applyStatic(root = document) {
    if (LANG !== 'ja') {
      root.querySelectorAll('[data-i18n]').forEach((el) => {
        const key = el.getAttribute('data-i18n') || el.textContent.trim();
        if (DICT[key] !== undefined) el.innerHTML = DICT[key];
      });
      root.querySelectorAll('[data-i18n-label]').forEach((el) => {
        const key = el.getAttribute('data-i18n-label');
        if (DICT[key] !== undefined) el.setAttribute('aria-label', DICT[key]);
      });
    }
    root.querySelectorAll('[data-tz]').forEach((el) => (el.textContent = tzLabel));
  }

  Object.assign(E, { LANG, LANGS, DICT, addDict, tr, T, setLang, TZ, tzLabel, clockSec, applyStatic });
})();
