# 地球の24時間 — 開発メモ（Claude 向け）

46億年の地球史を「1日＝24時間」として体感するウェブページ。メイン機能は「進化ガチャ」（ランダムな時代に生まれ、分かれ道で進化を選び、大量絶滅を越えて今日まで系統をつなぐRPG）。「80億分の1」（1in8b.life）に着想を得ている。

- 公開：https://m0hir0.github.io/earth-24h/ （GitHub Pages、`main` の push で1〜2分後に反映）
- リポジトリ：https://github.com/m0hir0/earth-24h （public）
- ユーザーとのやりとりは日本語。説明は専門用語を避け、平易に。

## ファイルと読み込み順（index.html の末尾）

ビルドなしの素の JS。各ファイルは `window.E24` に機能を足していく。順番が大事。

1. `i18n.js` — 言語（ja/en）の選択、`E.T(日本語テンプレ, {vars})` / `E.tr(日本語)`、現地時間 `E.clockSec()`、HTMLの `data-i18n` 置換 `E.applyStatic()`
2. `data.js` — 定数（S=46億年, DAY）、書式（fmtYears/fmtAgo/fmtSec/fmtClock/fmtProb…、英語版あり）、ERAS・PERIODS（地質年代）・EVENTS（約170件、`key` は日本語名で不変）・status（酸素/1日の長さ/太陽）・AI_STORY
3. `scenes.js` — ドット絵（192×64 を拡大）。`drawScene(ctx, ya, t, opts)`、opts は `{fx, habitat, plan, look, ending}`。`sceneView(canvas, getState)` が 8コマ/秒で描き直す。生き物の姿は `drawForm(P, look, …)`（微生物は `drawMicro` で変種ごとに描き分け）、`drawCreatureCard`（64×48、白い影も描ける）。結末用 `TODAY`（今日の暮らし）と `sceneFossil`（化石の地層）もここ
4. `globe.js` — 「いまの地球」ダイヤル中央の回る地球（時代で姿が変わる）
5. `evo.js` — 進化ガチャの中身：PLANS（体のつくり、base 特徴値）、birthOptions（時代ごとの生まれる生き物）、NODES（分かれ道、最後に地質年代ごとの汎用 age0〜11）、EXTINCTIONS（淘汰）、種の数の増減 `step`、`applyExtinction`、ENDINGS（39種類）と `endingOf(d)`
6. `lang-en.js` — 英語の文章。英語のときだけ内容を置きかえ、UI 辞書を `E.addDict` する
7. `app.js` — 画面と動き（タブ、いまの地球、今を拡大、ガチャ、プレイ、結末、シェア、履歴、図鑑）

`v1/index.html` は前の版（1ファイル完結）。`reference/` と `.claude/` は git 管理外。

## 大事な約束ごと

- **翻訳**：日本語の文章そのものがキー。新しい文言は `T('日本語 {x}', {x})` で書き、`lang-en.js` の `UI` に英語を足す。HTML の文は `data-i18n`（空ならテキストがキー）か `data-i18n="キー"`。
- **保存される値は日本語のまま**：生き物の名前（`L.name` / `firstName`）、選んだ道のラベル（`path[].label`）、絶滅の原因（`deathCause` ＝ EXTINCTIONS の日本語名）。表示時に `tr()`。英語版でも保存値は日本語なので、言語を切り替えても履歴・シェアが読める。
- **シェア／履歴の形式**：`{v:1, u:誕生前1/0, b:生まれた年前, e:終わった年前, a:生存1/0, f:最初の名前, n:最後の名前, p:plan, h:habitat, k:[選んだ道], c:原因, g:[[plan, 変種, 名前], …]（進化の系譜）}`。`cleanData()` で検証。リンクは `#r=base64url(JSON)`。履歴は localStorage `earth24.history`（最大100件）、言語は `earth24.lang`。
- **時刻**：時計は端末の現地時間（ja かつ Asia/Tokyo なら「日本時間」表示）。
- **姿（look）**：`{plan, v:変種, size, armor, feather}`。変種は app.js の `variantOf()` が flags と habitat から決める（例：microbe→rod/archaea/oxy/hunter、cell→euk/para、colony→alga/volvox、arthropod→trilo/horseshoe/millipede、reptile→turtle（守り70以上）、羽毛→feather）。大きさで絵の拡大率、守り65以上で背中にとげ。
- **進化の演出**：分かれ道で `plan:変種` が変わると `playEvolution()`（白い影が入れ替わる→新しい姿）。名前が変わらない選択肢なら `VARIANT_NAMES` か PLANS の `ja` 名を付ける。`L.forms` が系譜。
- **結末は40種類**：生存22・絶滅17・誕生前1（No.40「生まれる前の地球」、生命誕生前の時代を引いたとき履歴に `u:1` で記録）。番号は ENDINGS の並び順なので、追加は末尾に。
- **RPGの時間**：プレイは `ya = ya0 * (1 - p)^2`（今に近いほどゆっくり）、×1で約10分（`PLAY_SEC`）。分かれ道と大きな淘汰では止まる。
- **淘汰の釣り合い**：種の数の上限 CAP=60。動物で生まれると約45〜50%が絶滅、微生物のままだとほぼ生存（史実どおり）。実際に全滅した仲間（三葉虫・板皮類・鳥以外の恐竜など）は kill=1。
- **見た目**：トークンは `:root` に定義し、ダーク用を `prefers-color-scheme` と `[data-theme]` で上書き。スマホ幅（375px）で横にはみ出さないこと。

## 確認のしかた

- `.claude/launch.json` の `earth24`（`python3 -m http.server 8124`）を preview_start で起動し、内蔵ブラウザで `http://localhost:8124/`（英語は `?lang=en`）。
- 内蔵ブラウザのペインが裏にあると `requestAnimationFrame` が止まる。自動テストではページ内で `window.requestAnimationFrame = (cb) => setTimeout(() => cb(performance.now()), 16)` に差し替えてから操作する。
- localhost のときだけ `window.__e24.born(年前, '名前の一部')` で生まれる時代と生き物を指定、`window.__e24.spin(年前)` でその時代にガチャを回せる（誕生前の確認など）。
- 構文チェック：`node -e "new Function(require('fs').readFileSync('app.js','utf8'))"`。
- 翻訳漏れチェックや淘汰の釣り合い（2000回の自動プレイ）は node で data.js/evo.js/lang-en.js を読み込んで確かめてきた。
- コミットは日本語、末尾に `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`。push 後に `gh api repos/m0hir0/earth-24h/pages/builds/latest` で反映を確認。

## これまでの経緯（決めたこと）

- v1：46億年を1〜10分で流し、最後はスローモーション。ガチャとシェアカード付き。
- v2（現在）：日本時間（→現地時間）と同期する24時間時計、「今を拡大」（23:57からの3分をゆるめて再生、ゲージをドラッグ可）、進化ガチャをトップに。結末39種類の図鑑、履歴、SNSシェア（X・リンク・画像・共有メニュー）、ドット絵の地球の時計、日英対応。
- 体験の長さの選択は廃止（×4/×16と同じ効果だったため）。
- 現実にないもの（二足歩行ロボットなど）は今の街の場面に描かない。
- 分かれ道の選択肢に、特徴の増減（大きさ▲15 など）、体のつくりの変化（→〇〇）、暮らす場所の変化を表示（`previewOption()` が写しで試算）。
- プレイ画面：時計の左に小さな24時間の円時計、「系統のタイムライン」（横長の地図＋縦のタイムライン、印は誕生・分かれ道・進化・淘汰・絶滅）。結末画面にも「進化の系譜」とタイムライン。
- 広告（AdSense）は保留中。やるなら独自ドメイン必須、Cloudflare Pages への移行、プライバシーポリシー等が必要（ユーザーに説明済み）。
