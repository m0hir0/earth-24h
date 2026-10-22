/* 地球の24時間 — 説明ページの共通部品（上の帯、下のリンク、言語の切り替え、問い合わせ先）
   本文は各ページに <div data-l="ja"> と <div data-l="en"> で両方書き、表示中の言語だけ見せる（site.css） */
(function () {
  'use strict';
  const E = window.E24;
  const ja = E.LANG !== 'en';

  // お問い合わせフォーム（Googleフォーム）のURL。決まったらここに入れる。空のあいだは「準備中」
  const CONTACT_FORM_URL = '';

  const NAV = [
    ['museum.html', '化石の博物館', 'Fossil Museum'],
    ['guide.html', '遊び方', 'How to play'],
    ['learn.html', '地球史と進化の解説・出典', 'Earth history & sources'],
    ['about.html', '運営者について', 'About'],
    ['contact.html', 'お問い合わせ', 'Contact'],
    ['privacy.html', 'プライバシーポリシー', 'Privacy policy'],
  ];

  const root = document.documentElement;
  const title = ja ? root.dataset.titleJa : root.dataset.titleEn;
  if (title) document.title = title;

  const page = document.querySelector('.page');
  const top = document.createElement('header');
  top.className = 'top';
  const brand = document.createElement('a'); brand.className = 'brand'; brand.href = './'; brand.textContent = ja ? '地球の24時間' : 'Earth in 24 Hours';
  const play = document.createElement('a'); play.className = 'play'; play.href = './'; play.textContent = ja ? '遊ぶ' : 'Play';
  const other = ja ? 'en' : 'ja';
  const lb = document.createElement('button'); lb.className = 'langbtn'; lb.type = 'button'; lb.lang = other; lb.textContent = ja ? 'English' : '日本語';
  lb.addEventListener('click', () => E.setLang(other));
  top.append(brand, play, lb);
  page.prepend(top);

  const foot = document.createElement('footer');
  foot.className = 'foot';
  const nav = document.createElement('nav');
  for (const [href, jt, et] of NAV) { const a = document.createElement('a'); a.href = href; a.textContent = ja ? jt : et; nav.appendChild(a); }
  const c = document.createElement('p'); c.textContent = ja ? '© 2026 地球の24時間 運営' : '© 2026 Earth in 24 Hours';
  foot.append(nav, c);
  page.appendChild(foot);

  document.querySelectorAll('[data-contact]').forEach((a) => {
    if (CONTACT_FORM_URL) { a.href = CONTACT_FORM_URL; a.target = '_blank'; a.rel = 'noopener'; }
    else { a.removeAttribute('href'); a.classList.add('off'); a.textContent = ja ? 'フォームは準備中です' : 'Form coming soon'; }
  });
})();
