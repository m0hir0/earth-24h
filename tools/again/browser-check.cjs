// 要 Playwright + Chromium。node tools/again/browser-check.cjs [スクリーンショットの保存先]
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '../..');
(async () => {
  const server = http.createServer((req, res) => {
    const name = path.resolve(root, '.' + new URL(req.url, 'http://localhost').pathname);
    if (!name.startsWith(root + path.sep)) { res.writeHead(403).end(); return; }
    const file = fs.existsSync(name) && fs.statSync(name).isDirectory() ? path.join(name, 'index.html') : name;
    if (!fs.existsSync(file)) { res.writeHead(404).end(); return; }
    const types = { '.js': 'text/javascript', '.html': 'text/html', '.css': 'text/css', '.png': 'image/png' };
    res.setHeader('Content-Type', types[path.extname(file)] || 'text/plain');
    res.end(fs.readFileSync(file));
  });
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  let browser;
  try {
    browser = await chromium.launch({ headless: true });
    for (const lang of ['ja', 'en']) for (const width of [375, 1280]) for (const humans of [0, 1, 999]) {
      const context = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: 'reduce' });
      const page = await context.newPage();
      const errors = []; page.on('pageerror', e => errors.push(e.message));
      await page.addInitScript(({ humans }) => {
        const native = window.setTimeout;
        window.setTimeout = (fn, ms, ...args) => native(fn, Math.min(ms, 1), ...args);
        let calls = 0;
        Math.random = humans === 0 ? () => 1 - Number.EPSILON : humans === 999 ? () => 0 :
          () => { const i = calls++; return i === 0 || i >= 1997 ? 0 : 1 - Number.EPSILON; };
      }, { humans });
      await page.goto(`http://127.0.0.1:${server.address().port}/again.html?lang=${lang}`);
      const content = page.locator('#a-text');
      assert.match(await content.innerText(), /1000.*999|1,000.*999/s);
      await page.locator('#a-actions button').click();
      const thread = page.getByRole('button', { name: lang === 'ja' ? 'この地球の糸をたどる' : "Follow this Earth's thread", exact: true });
      await thread.waitFor();
      const result = await content.innerText();
      assert.match(result, /999/); assert.doesNotMatch(result, /1000|1,000/);
      assert.match(result, lang === 'ja' ? /仮の確率/ : /made-up odds/);
      const sum = (await page.locator('.legend .n').allTextContents()).map(Number).reduce((a, b) => a + b, 0);
      assert.equal(sum, 999);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      if (process.argv[2] && width === 375 && humans === 0) {
        fs.mkdirSync(process.argv[2], { recursive: true });
        await page.screenshot({ path: path.join(process.argv[2], `again-result-${lang}.png`), fullPage: true });
      }
      await thread.click();
      for (let i = 0; i < 11; i++) await page.getByRole('button', { name: lang === 'ja' ? 'つぎへ' : 'Next', exact: true }).click();
      const share = new URL(await page.locator('#a-actions > a').getAttribute('href')).searchParams.get('text');
      assert.match(share, /999/); assert.match(share, lang === 'ja' ? /本当の確率はわからない/ : /real odds are unknown/);
      await page.getByRole('button', { name: lang === 'ja' ? 'もう一度やり直す' : 'Replay again', exact: true }).click();
      assert.match(await content.innerText(), /1000.*999|1,000.*999/s);
      assert.equal(errors.length, 0, errors.join('\n'));
      await context.close();
      console.log(`passed: ${lang}, ${width}px, ${humans} humans, replay + share`);
    }
  } finally {
    if (browser) await browser.close();
    server.close();
  }
})().catch(e => { console.error(e); process.exitCode = 1; });
