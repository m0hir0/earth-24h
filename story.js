/* 地球の24時間 — 記録から作るもの：系統の物語、結末の場面、記録の検証
   ゲーム（app.js）と化石の博物館（museum.js）の両方で使う。読み込みは evo.js と lang-en.js のあと */
(function () {
  'use strict';
  const E = window.E24;
  const { T, tr, S, DAY, fmtAgo, fmtSpan } = E;
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
  function endScene(alive, endYa, plan, habitat, cause, look, k = []) {
    const e = evo.endingOf({ a: alive, p: plan, h: habitat, c: cause, k });
    return { ya: alive ? 0.3 : Math.max(endYa, 1), ending: { ...e, plan, look: look || { plan } } };
  }
  const sceneOfData = (d) => (d.u ? { ya: d.b, ending: { ...evo.endingOf(d), ya: d.b } } : endScene(d.a, d.e, d.p, d.h, d.c, d.g && d.g.length ? lookOfG(d.g[d.g.length - 1]) : null, d.k));
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
  /* ---------- 生まれた場所：その時代の仲間の化石が見つかっている場所 ----------
     [古いほう, 新しいほう（何年前）, 仲間, 日本語の場所, 英語の場所, 日本語の場所のようす, 英語の場所のようす]
     仲間：micro 微生物・細胞・藻 / deep 熱水の微生物 / sea 海の動物 / land 陸 / air 空 / hom 人類の祖先 / sap ホモ・サピエンス */
  const PLACES = [
    [3.8e9, 3.55e9, 'micro deep', 'グリーンランド・イスア', 'Isua, Greenland', '海', 'sea'],
    [3.9e9, 3.6e9, 'deep', 'カナダ・ケベック州（ヌブアギツック）', 'Nuvvuagittuq, Quebec, Canada', '深い海の熱水のそば', 'hydrothermal vents of the deep sea'],
    [3.55e9, 2.7e9, 'micro', 'オーストラリア・ピルバラ', 'the Pilbara, Australia', '浅い海', 'shallow sea'],
    [3.5e9, 3.3e9, 'deep', 'オーストラリア・ピルバラ（ドレッサー層）', 'the Dresser Formation, Pilbara, Australia', '熱水のわく海', 'sea with hot springs'],
    [3.05e9, 2.8e9, 'micro', '南アフリカ・ポンゴラ', 'Pongola, South Africa', '浅い海', 'shallow sea'],
    [2.95e9, 2.75e9, 'micro', 'カナダ・オンタリオ州（スティープロック）', 'Steep Rock, Ontario, Canada', '浅い海', 'shallow sea'],
    [2.8e9, 2.6e9, 'micro', 'ジンバブエ・ベリングウェ', 'Belingwe, Zimbabwe', '浅い海', 'shallow sea'],
    [2.75e9, 2.6e9, 'deep', 'カナダ・アビティビ', 'the Abitibi belt, Canada', '熱水のわく海', 'sea with hot springs'],
    [3.55e9, 3.2e9, 'micro deep', '南アフリカ・バーバートン', 'Barberton, South Africa', '海', 'sea'],
    [2.75e9, 2.45e9, 'micro', '南アフリカ・トランスバール', 'the Transvaal, South Africa', '浅い海', 'shallow sea'],
    [2.6e9, 2.1e9, 'micro deep', 'オーストラリア・ハマーズリー（縞状鉄鉱層）', 'the Hamersley iron formations, Australia', '海', 'sea'],
    [2.15e9, 2.0e9, 'micro', 'ガボン・フランスビル', 'Franceville, Gabon', '浅い海', 'shallow sea'],
    [2.45e9, 2.2e9, 'micro', 'カナダ・オンタリオ州（ヒューロニアン層群）', 'the Huronian, Ontario, Canada', '氷河の流れこむ海', 'glacier-fed sea'],
    [2.05e9, 1.75e9, 'micro deep', 'カナダ・オンタリオ州（ガンフリント）', 'the Gunflint chert, Ontario, Canada', '浅い海', 'shallow sea'],
    [1.8e9, 1.3e9, 'micro', '中国・燕山', 'the Yanshan, China', '浅い海', 'shallow sea'],
    [1.65e9, 1.55e9, 'micro', 'インド・チトラクート', 'Chitrakoot, India', '浅い海', 'shallow sea'],
    [1.8e9, 1.3e9, 'micro', 'オーストラリア・マッカーサー盆地', 'the McArthur Basin, Australia', '浅い海', 'shallow sea'],
    [1.3e9, 1.0e9, 'micro', 'アメリカ・ミシガン州（ノンサッチ頁岩）', 'the Nonesuch Shale, Michigan, USA', '湖', 'lake'],
    [1.1e9, 0.95e9, 'micro', 'スコットランド（トリドン）', 'Torridon, Scotland', '湖', 'lake'],
    [1.3e9, 0.95e9, 'micro', 'カナダ・サマーセット島', 'Somerset Island, Canada', '浅い海', 'shallow sea'],
    [9.5e8, 7.2e8, 'micro', 'ノルウェー・スヴァールバル諸島', 'Svalbard, Norway', '浅い海', 'shallow sea'],
    [8.5e8, 7.2e8, 'micro', 'アメリカ・グランドキャニオン', 'the Grand Canyon, USA', '浅い海', 'shallow sea'],
    [7.2e8, 6.35e8, 'micro sea', 'ナミビア', 'Namibia', '凍った海のふち', 'edge of a frozen sea'],
    [6.35e8, 5.5e8, 'micro sea', '中国・貴州省（ドウシャンツオ）', 'the Doushantuo, Guizhou, China', '浅い海', 'shallow sea'],
    [5.8e8, 5.6e8, 'sea', 'カナダ・ニューファンドランド島（ミステイクン・ポイント）', 'Mistaken Point, Newfoundland, Canada', '深い海の底', 'deep seafloor'],
    [5.6e8, 5.39e8, 'sea', 'オーストラリア・エディアカラ丘陵', 'the Ediacara Hills, Australia', '浅い海', 'shallow sea'],
    [5.6e8, 5.5e8, 'sea', 'ロシア・白海の海岸', 'the White Sea coast, Russia', '浅い海', 'shallow sea'],
    [5.25e8, 5.12e8, 'sea', '中国・雲南省（澄江）', 'Chengjiang, Yunnan, China', '浅い海', 'shallow sea'],
    [5.25e8, 5.12e8, 'sea', 'グリーンランド（シリウス・パセット）', 'Sirius Passet, Greenland', '海', 'sea'],
    [5.39e8, 5.25e8, 'sea', '中国・雲南省（梅樹村）', 'Meishucun, Yunnan, China', '浅い海', 'shallow sea'],
    [5.12e8, 4.9e8, 'sea', 'カナダ・ブリティッシュコロンビア州（バージェス頁岩）', 'the Burgess Shale, British Columbia, Canada', '海', 'sea'],
    [4.9e8, 4.4e8, 'sea', 'モロッコ（フェゾウアタ）', 'the Fezouata, Morocco', '海', 'sea'],
    [4.45e8, 3.85e8, 'sea', 'アメリカ・ニューヨーク州', 'New York State, USA', '浅い海', 'shallow sea'],
    [4.0e8, 3.7e8, 'land', 'アメリカ・ニューヨーク州（ギルボア）', 'Gilboa, New York, USA', '最初の森', 'first forest'],
    [4.12e8, 4.0e8, 'land', 'スコットランド（ライニー・チャート）', 'the Rhynie chert, Scotland', '温泉のそばの湿地', 'hot-spring wetland'],
    [3.85e8, 3.75e8, 'sea', 'オーストラリア・ゴーゴー', 'Gogo, Australia', 'サンゴ礁', 'reef'],
    [3.75e8, 3.59e8, 'sea', 'アメリカ・オハイオ州（クリーブランド頁岩）', 'the Cleveland Shale, Ohio, USA', '海', 'sea'],
    [3.68e8, 3.6e8, 'land', 'グリーンランド東部', 'East Greenland', '川べり', 'riverbank'],
    [3.15e8, 3.05e8, 'land', 'カナダ・ノバスコシア州（ジョギンズ）', 'Joggins, Nova Scotia, Canada', '石炭の森', 'coal forest'],
    [3.1e8, 3.0e8, 'sea land', 'アメリカ・イリノイ州（メゾンクリーク）', 'Mazon Creek, Illinois, USA', '河口', 'river mouth'],
    [2.95e8, 2.72e8, 'land', 'アメリカ・テキサス州', 'Texas, USA', '乾いた平原', 'dry plain'],
    [2.65e8, 2.4e8, 'land', '南アフリカ・カルー', 'the Karoo, South Africa', '平原', 'plain'],
    [2.45e8, 2.35e8, 'sea', 'スイス・イタリア（モンテ・サン・ジョルジョ）', 'Monte San Giorgio, Switzerland/Italy', '浅い海', 'shallow sea'],
    [2.32e8, 2.2e8, 'land', 'アルゼンチン（イスチグアラスト）', 'Ischigualasto, Argentina', '川の流れる谷', 'river valley'],
    [2.0e8, 1.8e8, 'sea', 'イギリス・ライム・リージス', 'Lyme Regis, England', '海', 'sea'],
    [1.56e8, 1.47e8, 'land', 'アメリカ西部（モリソン層）', 'the Morrison Formation, western USA', '川の流れる平原', 'river plain'],
    [1.52e8, 1.48e8, 'air sea land', 'ドイツ・ゾルンホーフェン', 'Solnhofen, Germany', '島の浮かぶ礁湖', 'island lagoon'],
    [1.3e8, 1.2e8, 'land air', '中国・遼寧省', 'Liaoning, China', '湖のほとりの森', 'lakeside forest'],
    [1.25e8, 1.15e8, 'land', '福井県・勝山', 'Katsuyama, Fukui, Japan', '川べり', 'riverbank'],
    [1.15e8, 1.0e8, 'sea air', 'ブラジル（サンタナ層）', 'the Santana Formation, Brazil', '礁湖', 'lagoon'],
    [8.5e7, 6.6e7, 'land', 'モンゴル・ゴビ砂漠', 'the Gobi Desert, Mongolia', '砂丘と川', 'dunes and rivers'],
    [7.4e7, 7.0e7, 'land sea', '北海道・むかわ町', 'Mukawa, Hokkaido, Japan', '海辺', 'seashore'],
    [6.8e7, 6.6e7, 'land', 'アメリカ・モンタナ州（ヘルクリーク）', 'Hell Creek, Montana, USA', '森の広がる平原', 'forested plain'],
    [5.3e7, 4.6e7, 'land fresh', 'アメリカ・ワイオミング州（グリーンリバー）', 'the Green River, Wyoming, USA', '湖のほとり', 'lakeshore'],
    [5.0e7, 4.6e7, 'land air', 'ドイツ・メッセル', 'Messel, Germany', '熱帯の森の湖', 'tropical forest lake'],
    [5.3e7, 4.5e7, 'sea', 'パキスタン', 'Pakistan', '海辺', 'seashore'],
    [4.1e7, 3.4e7, 'sea', 'エジプト（ワディ・アル・ヒタン）', 'Wadi Al-Hitan, Egypt', '浅い海', 'shallow sea'],
    [2.0e7, 1.5e7, 'land', 'ケニア・ルシンガ島', 'Rusinga Island, Kenya', '森', 'forest'],
    [1.8e7, 1.5e7, 'sea', '岐阜県・瑞浪', 'Mizunami, Gifu, Japan', '海', 'sea'],
    [3.3e9, 3.1e9, 'deep', 'オーストラリア・ピルバラ（サルファー・スプリングス）', 'Sulphur Springs, Pilbara, Australia', '深い海の熱水のそば', 'deep-sea hydrothermal vents'],
    [3.59e8, 3.45e8, 'sea', 'アメリカ・アイオワ州（バーリントン石灰岩）', 'the Burlington Limestone, Iowa, USA', '浅い海', 'shallow sea'],
    [3.45e8, 3.25e8, 'sea', 'スコットランド（ベアーズデン）', 'Bearsden, Scotland', '浅い海', 'shallow sea'],
    [3.45e8, 3.25e8, 'land', 'スコットランド（イースト・カークトン）', 'East Kirkton, Scotland', '温泉のそばの湖', 'hot-spring lake'],
    [3.3e8, 3.1e8, 'sea', 'アメリカ・モンタナ州（ベアガルチ）', 'Bear Gulch, Montana, USA', '入り江', 'bay'],
    [3.25e8, 3.1e8, 'land air', 'ドイツ（ハーゲン＝フォアハレ）', 'Hagen-Vorhalle, Germany', '河口の湿地', 'delta wetland'],
    [3.05e8, 2.95e8, 'land air', 'フランス（コマントリー）', 'Commentry, France', '石炭の森', 'coal forest'],
    [2.95e8, 2.75e8, 'sea', 'アメリカ・テキサス州', 'Texas, USA', '浅い海', 'shallow sea'],
    [2.85e8, 2.7e8, 'land air', 'アメリカ・カンザス州（エルモ）', 'Elmo, Kansas, USA', '湖のほとり', 'lakeshore'],
    [2.75e8, 2.52e8, 'sea', 'アメリカ・テキサス州（グアダループ山地の礁）', 'the Guadalupe reef, Texas, USA', 'サンゴ礁', 'reef'],
    [2.62e8, 2.52e8, 'sea', 'ドイツ（ツェヒシュタイン海）', 'the Zechstein Sea, Germany', '浅い海', 'shallow sea'],
    [2.52e8, 2.45e8, 'sea', '中国・貴州省', 'Guizhou, China', '浅い海', 'shallow sea'],
    [2.35e8, 2.0e8, 'sea', 'オーストリア・イタリアのアルプス', 'the Alps of Austria and Italy', 'サンゴ礁', 'reef'],
    [2.25e8, 2.05e8, 'land air', 'アメリカ・アリゾナ州（化石の森）', 'the Petrified Forest, Arizona, USA', '川の流れる森', 'river forest'],
    [2.0e8, 1.8e8, 'land', '中国・雲南省（禄豊）', 'Lufeng, Yunnan, China', '川の流れる平原', 'river plain'],
    [1.85e8, 1.75e8, 'sea air', 'ドイツ・ホルツマーデン', 'Holzmaden, Germany', '海', 'sea'],
    [1.75e8, 1.56e8, 'land air', '中国・四川省（自貢）', 'Zigong, Sichuan, China', '湖のほとり', 'lakeshore'],
    [1.75e8, 1.5e8, 'sea', 'イギリス・オックスフォード粘土層', 'the Oxford Clay, England', '海', 'sea'],
    [1.65e8, 1.55e8, 'land air', '中国・内モンゴル（道虎溝）', 'Daohugou, Inner Mongolia, China', '火山のそばの湖', 'volcanic lakeshore'],
    [1.47e8, 1.3e8, 'land air', 'イギリス・ワイト島', 'the Isle of Wight, England', '川べり', 'riverbank'],
    [1.47e8, 1.15e8, 'sea', 'ドイツ北部の海', 'the sea of northern Germany', '海', 'sea'],
    [1.3e8, 1.25e8, 'land air', 'スペイン（ラス・オヤス）', 'Las Hoyas, Spain', '湿地', 'wetland'],
    [1.15e8, 1.0e8, 'land', 'アメリカ・モンタナ州（クローバリー層）', 'the Cloverly Formation, Montana, USA', '川の流れる平原', 'river plain'],
    [1.0e8, 8.8e7, 'land air', 'アルゼンチン・パタゴニア', 'Patagonia, Argentina', '平原', 'plain'],
    [1.0e8, 8.8e7, 'sea', 'モロッコ（ケムケム層）', 'the Kem Kem beds, Morocco', '大きな川', 'great river'],
    [9.0e7, 8.5e7, 'land air', '岩手県・久慈（こはく）', 'Kuji, Iwate, Japan (amber)', '森', 'forest'],
    [8.8e7, 8.0e7, 'sea air', 'アメリカ・カンザス州（ニオブララ層）', 'the Niobrara, Kansas, USA', '内海', 'inland sea'],
    [8.0e7, 6.6e7, 'sea', 'オランダ・マーストリヒト', 'Maastricht, Netherlands', '海', 'sea'],
    [7.7e7, 7.4e7, 'land air', 'カナダ・アルバータ州（恐竜州立公園）', 'Dinosaur Provincial Park, Alberta, Canada', '川の流れる平原', 'river plain'],
    [6.6e7, 5.6e7, 'land air', 'アメリカ・ニューメキシコ州', 'New Mexico, USA', '森', 'forest'],
    [6.6e7, 5.0e7, 'sea', 'デンマーク', 'Denmark', '海', 'sea'],
    [5.6e7, 5.3e7, 'land air', 'デンマーク（ファー島）', 'the Fur Formation, Denmark', '海辺', 'seashore'],
    [5.3e7, 4.5e7, 'land air', 'イギリス・ロンドン粘土層', 'the London Clay, England', '熱帯の海辺の森', 'tropical coastal forest'],
    [4.5e7, 3.4e7, 'land air', 'アメリカ・ワイオミング州', 'Wyoming, USA', '森', 'forest'],
    [3.7e7, 3.0e7, 'land', 'エジプト（ファイユーム）', 'the Fayum, Egypt', '川べりの森', 'riverside forest'],
    [3.4e7, 2.3e7, 'land air', 'アメリカ・サウスダコタ州（バッドランズ）', 'the Badlands, South Dakota, USA', '平原', 'plain'],
    [3.4e7, 1.6e7, 'sea', 'ニュージーランド', 'New Zealand', '海', 'sea'],
    [2.3e7, 1.5e7, 'land air', 'アメリカ・ネブラスカ州（アゲート化石層）', 'Agate Fossil Beds, Nebraska, USA', '草原', 'grassland'],
    [1.6e7, 7e6, 'sea', 'ペルー（ピスコ層）', 'the Pisco Formation, Peru', '海', 'sea'],
    [1.5e7, 7e6, 'land air', 'スペイン（バレス・ペネデス）', 'the Vallès-Penedès, Spain', '森', 'forest'],
    [1.2e7, 1.1e7, 'land', 'アメリカ・ネブラスカ州（アッシュフォール）', 'Ashfall Fossil Beds, Nebraska, USA', '草原', 'grassland'],
    [4.2e6, 1.0e6, 'hom land', 'ケニア・トゥルカナ湖', 'Lake Turkana, Kenya', '湖のほとり', 'lakeshore'],
    [3.0e5, 1.1e4, 'land', 'シベリア（永久凍土）', 'Siberia (permafrost)', '寒い草原', 'mammoth steppe'],
    [5.0e4, 1.1e4, 'land', 'アメリカ・ロサンゼルス（ラ・ブレア）', 'La Brea, Los Angeles, USA', '平原', 'plain'],
    [7.2e6, 6.0e6, 'hom', 'チャド（ジュラブ砂漠）', 'the Djurab Desert, Chad', '湖のほとりの森', 'lakeside woodland'],
    [4.5e6, 2.9e6, 'hom', 'エチオピア・アファール', 'Afar, Ethiopia', '森と草原', 'woodland and grassland'],
    [3.8e6, 3.5e6, 'hom', 'タンザニア・ラエトリ', 'Laetoli, Tanzania', '火山灰の草原', 'volcanic grassland'],
    [3.0e6, 1.5e6, 'hom', '南アフリカ（人類のゆりかご）', 'the Cradle of Humankind, South Africa', '草原', 'grassland'],
    [2.0e6, 1.0e6, 'hom land', 'タンザニア・オルドバイ渓谷', 'Olduvai Gorge, Tanzania', '湖のほとりの草原', 'lakeside grassland'],
    [8.0e5, 3.5e5, 'hom land', '中国・周口店', 'Zhoukoudian, China', '洞窟のある丘', 'hills with caves'],
    [3.3e5, 2.5e5, 'sap', 'モロッコ（ジュベル・イルード）', 'Jebel Irhoud, Morocco', '草原', 'grassland'],
    [2.0e5, 1.5e5, 'sap', 'エチオピア・オモ川', 'the Omo River, Ethiopia', '川べり', 'riverbank'],
    [1.0e5, 7.0e4, 'sap', '南アフリカ（ブロンボス洞窟）', 'Blombos Cave, South Africa', '海辺の洞窟', 'seaside cave'],
    [3.0e4, 1.5e4, 'sap', '沖縄・石垣島', 'Ishigaki Island, Okinawa, Japan', '島', 'island'],
    [2.0e4, 1.5e4, 'sap', 'フランス・ラスコー', 'Lascaux, France', '洞窟のある谷', 'valley with caves'],
  ];
  const MICRO = ['microbe', 'cyano', 'cell', 'colony'];
  const SEA = ['sponge', 'ediacaran', 'soft', 'arthropod', 'anomalo', 'jawless', 'fish', 'shark', 'armorfish', 'marine_reptile', 'whale'];
  function groupOf(plan, v) {
    if (MICRO.includes(plan)) return v === 'archaea' ? 'deep' : 'micro';
    if (plan === 'arthropod') return v === 'millipede' ? 'land' : 'sea';
    if (SEA.includes(plan)) return 'sea';
    if (plan === 'pterosaur' || plan === 'bird') return 'air';
    if (plan === 'hominin') return 'hom';
    if (plan === 'human') return 'sap';
    return 'land';
  }
  const GENERIC = {      // [日本語, 英語の場所, 英語の文の中の形]
    micro: ['どこかの浅い海', 'a nameless shallow sea', 'in a nameless shallow sea'], deep: ['深い海の底の熱水のそば', 'deep-sea hydrothermal vents', 'by hydrothermal vents on the deep seafloor'],
    sea: ['どこかの海', 'a nameless sea', 'in a nameless sea'], land: ['どこかの陸', 'somewhere on land', 'somewhere on land'], air: ['どこかの空の下', 'somewhere under the open sky', 'somewhere under the open sky'],
    hom: ['アフリカのどこか', 'somewhere in Africa', 'somewhere in Africa'], sap: ['どこかの草原', 'a nameless grassland', 'on a nameless grassland'],
  };
  // 生まれた場所。同じ記録なら、いつも同じ場所になる（生まれた年で選ぶ）
  //   { name: 場所, hab: ようす, where: 文の中で使う形, found: 化石が見つかっている場所か }
  function placeOf(ya, plan, v) {
    const grp = groupOf(plan, v), en = E.LANG === 'en';
    const cands = PLACES.filter((p) => ya <= p[0] && ya >= p[1] && p[2].split(' ').includes(grp));
    if (!cands.length) { const g = GENERIC[grp]; return { name: en ? g[1] : g[0], hab: '', where: en ? g[2] : g[0], found: false }; }
    const p = cands[Math.abs(Math.round(ya / 7919)) % cands.length];
    const name = en ? p[4] : p[3], hab = en ? p[6] : p[5];
    return { name, hab, where: en ? `in what is now ${name} (${hab})` : `のちの${name}にあたる${hab}`, found: true };
  }
  const placeOfData = (d) => (d.g && d.g[0] ? placeOf(d.b, d.g[0][0], d.g[0][1]) : placeOf(d.b, d.p, ''));

  // 物語で「見届けた」と書く出来事（古い順）
  const MILESTONES = [
    [2.4e9, '空に酸素が増えた大酸化イベント'], [7.2e8, '地球が凍りついた全球凍結'], [5.388e8, '動物がいっせいに現れたカンブリア爆発'], [4.7e8, '植物の上陸'],
    [2.31e8, '恐竜の登場'], [1.3e8, '最初の花'], [6.6e7, '隕石による恐竜の絶滅'], [3e5, 'ホモ・サピエンスの誕生（24:00の約{s}秒前）'],
  ];
  /* ---------- 系統の一生を、ひとつの物語に ----------
     保存した記録（d）だけから作るので、結末・履歴・シェアされたリンクのどれでも同じ文章になる */
  const LIST = () => (E.LANG === 'en' ? ', ' : '、');
  const storyOf = (d) => storyParts(d).join(E.LANG === 'en' ? ' ' : '');
  function storyParts(d) {
    if (d.u) return [T('{a}、生まれようとしたその時代の地球は、まだマグマと隕石の星でした。生命が現れるのは、それから{y}もあとのことです。', { a: fmtAgo(d.b), y: fmtSpan(d.b - 3.8e9) })];
    const per = E.periodOf(d.b), where = per.name || per.era, pl = placeOfData(d);
    const out = [T('{a}、{p}の、{w}で、「{f}」として生まれました。', { a: fmtAgo(d.b), p: where, w: pl.where, f: tr(d.f) })];
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
    // 見届けたこと：生きていた間の大きな出来事（はじめと終わりの2つまで）。今日まで残れば、人類の誕生はいつも入れる
    const seen = MILESTONES.filter(([ya]) => ya < d.b && ya > d.e);
    const pick = seen.length > 2 ? [seen[0], seen[seen.length - 1]] : seen;
    if (d.a && seen.length > 2 && pick[1] !== MILESTONES[MILESTONES.length - 1]) pick[1] = MILESTONES[MILESTONES.length - 1];
    if (pick.length) out.push(T('その間に、{l}を見届けました。', { l: pick.map((m) => T(m[1], { s: Math.round(m[0] / S * DAY) })).join(E.LANG === 'en' ? ' and ' : 'と、') }));
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

  E.story = { lookOfG, mid, fmtCount, endScene, sceneOfData, endingLabel, cleanData, storyParts, storyOf, placeOf, placeOfData };
})();
