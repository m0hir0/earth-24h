// シミュレーション用：data.js と evo.js をブラウザなしで読み込んで E24 を返す
//   dir を渡すと、そのフォルダのファイルを読む（前の版と比べたいとき）。省略するとこのリポジトリ
const fs = require('fs'), path = require('path'), vm = require('vm');
module.exports = function load(dir = path.resolve(__dirname, '..', '..'), files = ['data.js', 'evo.js']) {
  const ctx = { console, Math, Date, matchMedia: () => ({ matches: false }) };
  ctx.window = ctx;
  vm.createContext(ctx);
  for (const f of files) vm.runInContext(fs.readFileSync(path.join(dir, f), 'utf8'), ctx, { filename: f });
  return ctx.E24;
};
