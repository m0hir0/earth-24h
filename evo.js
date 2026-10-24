/* 地球の24時間 v2 — 進化RPG（系統の誕生・分かれ道・淘汰） */
(function () {
  'use strict';
  const E = window.E24;
  const { S, ago } = E;
  const M = 1e6;
  const CAP = 60;                      // 種の数の上限（表示は「60種以上」）

  /* ---------------- 体のつくり ---------------- */
  // base: 特徴の目安（0〜100）。size 大きさ / armor 守り / speed 動き / brain 知恵 / adapt 適応力
  const PLANS = {
    microbe:   { name: '微生物', today: '細菌や古細菌。今も地球で最も数の多い生き物', base: [2, 10, 10, 0, 65] },
    cyano:     { name: '光合成する微生物', today: 'シアノバクテリア。今も海や湖で酸素をつくっている', base: [2, 10, 5, 0, 60] },
    cell:      { name: '核を持つ単細胞生物', today: 'アメーバやゾウリムシの仲間', base: [5, 10, 25, 3, 55] },
    colony:    { name: '多細胞のかたまり', today: '海藻や菌類の仲間', base: [12, 15, 10, 3, 50] },
    plant:     { name: '陸の植物（コケの仲間）', today: 'コケの仲間。今も森の地面や岩をおおっている', base: [5, 10, 0, 0, 60] },
    fern:      { name: 'シダ植物', today: 'シダやトクサの仲間', base: [30, 15, 0, 0, 50] },
    seed:      { name: '種で増える植物', today: 'マツやイチョウ、ソテツの仲間', base: [70, 30, 0, 0, 45] },
    flower:    { name: '花を咲かせる植物', today: '今の陸の植物の9割近くを占める、花を咲かせる植物', base: [30, 20, 0, 0, 70] },
    sponge:    { name: '海綿の仲間', today: '今も海底で水をこしている海綿', base: [15, 35, 0, 0, 55] },
    ediacaran: { name: 'エディアカラ生物', today: '子孫ははっきりしていない', base: [30, 5, 5, 2, 30] },
    soft:      { name: 'やわらかい体の動物', today: 'ゴカイやクラゲの仲間', base: [10, 5, 30, 8, 50] },
    arthropod: { name: '殻を持つ節足動物', today: 'エビ・カニ・クモ・カブトガニの仲間', base: [20, 60, 35, 10, 45] },
    anomalo:   { name: 'アノマロカリスの仲間', today: '子孫は残っていない', base: [55, 30, 60, 20, 30] },
    jawless:   { name: 'あごのない魚', today: 'ヤツメウナギやヌタウナギ', base: [15, 10, 55, 20, 45] },
    fish:      { name: '硬い骨の魚', today: '今の海や川の魚の大半', base: [30, 20, 60, 25, 60] },
    shark:     { name: 'サメの仲間', today: 'サメとエイ', base: [55, 30, 70, 30, 50] },
    armorfish: { name: '鎧をまとった魚（板皮類）', today: 'デボン紀の終わりにすべて絶滅した', base: [70, 80, 35, 20, 25] },
    insect:    { name: '昆虫', today: '今いちばん種の多い動物、昆虫', base: [5, 40, 70, 10, 75] },
    amphibian: { name: '両生類', today: 'カエルやイモリの仲間', base: [35, 15, 30, 25, 40] },
    reptile:   { name: 'は虫類', today: 'トカゲ・ヘビ・カメ・ワニの仲間', base: [35, 45, 40, 25, 55] },
    synapsid:  { name: '単弓類（哺乳類の遠い祖先の仲間）', today: '哺乳類だけが生き残った', base: [50, 30, 35, 30, 40] },
    marine_reptile: { name: '海のは虫類（魚竜・首長竜）', today: '白亜紀の終わりまでにすべて絶滅した', base: [70, 30, 60, 30, 35] },
    pterosaur: { name: '翼竜', today: '白亜紀の終わりにすべて絶滅した', base: [40, 15, 75, 35, 40] },
    dino_small:{ name: '小型の恐竜', today: '鳥だけが生き残った', base: [35, 25, 70, 35, 50] },
    sauropod:  { name: '首の長い巨大恐竜', today: '白亜紀の終わりにすべて絶滅した', base: [98, 50, 20, 15, 30] },
    theropod:  { name: '大型の肉食恐竜', today: '白亜紀の終わりにすべて絶滅した', base: [85, 40, 55, 35, 30] },
    bird:      { name: '鳥', today: '今も約1万種が空を飛んでいる', base: [12, 15, 85, 40, 70] },
    mammal:    { name: '小型の哺乳類', today: 'ネズミやリスの仲間', base: [15, 15, 55, 45, 65] },
    mammal_large: { name: '大型の哺乳類', today: 'ウマ・ゾウ・ウシの仲間', base: [75, 40, 50, 45, 40] },
    whale:     { name: 'クジラの仲間', today: 'クジラとイルカ', base: [90, 30, 60, 60, 40] },
    primate:   { name: '霊長類', today: 'サルや類人猿の仲間', base: [30, 10, 50, 60, 55] },
    hominin:   { name: '人類の祖先', today: 'ホモ・サピエンス以外の人類は、すべて絶滅した', base: [40, 10, 45, 70, 50] },
    human:     { name: 'ホモ・サピエンス', today: '私たち。そしてAIと生きる時代へ', base: [45, 10, 45, 95, 90] },
  };
  for (const k in PLANS) PLANS[k].ja = PLANS[k].name;              // 保存用の名前（訳しても変わらない）
  const TRAITS = ['size', 'armor', 'speed', 'brain', 'adapt'];
  const TRAIT_LABEL = { size: '大きさ', armor: '守り', speed: '動き', brain: '知恵', adapt: '適応力' };
  const TRAIT_SHORT = { ...TRAIT_LABEL };                          // 狭い表で使う短い名前
  const MICRO = new Set(['microbe', 'cyano', 'cell', 'colony']);
  const PLANTS = new Set(['plant', 'fern', 'seed', 'flower']);     // 藻類から陸へ上がった植物（動物の分かれ道は通らない）
  const HAB_LABEL = { shallow: '浅い海', sea: '海', deep: '深海の熱水のそば', land: '陸', air: '空', fresh: '川や沼' };

  /* ---------------- ガチャで生まれる生き物 ---------------- */
  // ya: 生まれた時（何年前）。その時代にいた代表的な生き物から選ぶ
  function birthOptions(ya) {
    const o = [];
    const add = (name, plan, habitat, extra = {}) => o.push({ name, plan, habitat, ...extra });
    if (ya > 3.8e9) return o;                                             // まだ生命はいない
    if (ya > 2.0e9) {
      add('熱水噴出孔の微生物', 'microbe', 'deep');
      add('浅い海の微生物', 'microbe', 'shallow');
      if (ya <= 2.7e9) add('シアノバクテリア', 'cyano', 'shallow', { flags: { o2: 1, photo: 1 } });
      if (ya <= 2.4e9) add('酸素を使いはじめた細菌', 'microbe', 'shallow', { flags: { o2: 1 } });
      return o;
    }
    if (ya > 6.35e8) {
      add('核を持つ単細胞生物', 'cell', 'shallow', { flags: { o2: 1 } });
      add('シアノバクテリア', 'cyano', 'shallow', { flags: { o2: 1, photo: 1 } });
      if (ya <= 1.05e9) add('紅藻の祖先（多細胞）', 'colony', 'shallow', { flags: { o2: 1, photo: 1 } });
      if (ya <= 6.6e8) add('海綿の祖先', 'sponge', 'sea', { flags: { o2: 1 } });
      return o;
    }
    if (ya > 5.388e8) {
      add('海綿の仲間', 'sponge', 'sea', { flags: { o2: 1 } });
      add('はうように動く小さな動物', 'soft', 'sea', { flags: { o2: 1 } });
      if (ya <= 5.75e8) add('ディッキンソニア（エディアカラ生物）', 'ediacaran', 'sea', { flags: { o2: 1 } });
      return o;
    }
    if (ya > 4.2e8) {
      add('三葉虫', 'arthropod', 'sea', { flags: { o2: 1, trilobite: 1 } });
      add('アノマロカリス', 'anomalo', 'sea', { flags: { o2: 1 } });
      add('ゴカイの仲間', 'soft', 'sea', { flags: { o2: 1, burrow: 1 } });
      if (ya <= 5.18e8) add('ハイコウイクチス（最古級の魚）', 'jawless', 'sea', { flags: { o2: 1 } });
      return o;
    }
    if (ya > 2.519e8) {
      add('三葉虫', 'arthropod', 'sea', { flags: { o2: 1, trilobite: 1 } });
      add('硬骨魚', 'fish', 'sea', { flags: { o2: 1 } });
      add('サメの祖先', 'shark', 'sea', { flags: { o2: 1 } });
      if (ya > 3.59e8) add('ダンクルオステウス（板皮類）', 'armorfish', 'sea', { flags: { o2: 1 } });
      if (ya <= 4.0e8) add('原始的な昆虫', 'insect', 'land', { flags: { o2: 1 } });
      if (ya <= 3.65e8) add('イクチオステガ（初期の両生類）', 'amphibian', 'land', { flags: { o2: 1 } });
      if (ya <= 3.12e8) add('ヒロノムス（は虫類の祖先）', 'reptile', 'land', { flags: { o2: 1, egg: 1 } });
      if (ya <= 2.95e8) add('ディメトロドン（単弓類）', 'synapsid', 'land', { flags: { o2: 1, egg: 1 } });
      return o;
    }
    if (ya > 6.6e7) {
      add('硬骨魚', 'fish', 'sea', { flags: { o2: 1 } });
      add('トカゲの仲間', 'reptile', 'land', { flags: { o2: 1, egg: 1, sauropsid: 1 } });
      add('昆虫', 'insect', 'land', { flags: { o2: 1 } });
      add('魚竜', 'marine_reptile', 'sea', { flags: { o2: 1 } });
      if (ya <= 2.31e8) add('小型の恐竜', 'dino_small', 'land', { flags: { o2: 1, egg: 1, sauropsid: 1 } });
      if (ya <= 2.28e8) add('翼竜', 'pterosaur', 'air', { flags: { o2: 1 } });
      if (ya <= 2.25e8) add('哺乳類の祖先（ネズミほどの大きさ）', 'mammal', 'land', { flags: { o2: 1, warm: 1 } });
      if (ya <= 2.0e8) { add('首の長い恐竜', 'sauropod', 'land', { flags: { o2: 1, egg: 1, sauropsid: 1 } }); add('肉食恐竜', 'theropod', 'land', { flags: { o2: 1, egg: 1, sauropsid: 1 } }); }
      if (ya <= 1.5e8) add('初期の鳥', 'bird', 'air', { flags: { o2: 1, egg: 1, sauropsid: 1, feather: 1 } });
      return o;
    }
    if (ya > 7e6) {
      add('小型の哺乳類', 'mammal', 'land', { flags: { o2: 1, warm: 1 } });
      add('鳥', 'bird', 'air', { flags: { o2: 1, egg: 1, feather: 1 } });
      add('硬骨魚', 'fish', 'sea', { flags: { o2: 1 } });
      add('昆虫', 'insect', 'land', { flags: { o2: 1 } });
      if (ya <= 5.5e7) add('ウマの祖先', 'mammal_large', 'land', { flags: { o2: 1, warm: 1 } });
      if (ya <= 6.0e7) add('初期の霊長類', 'primate', 'land', { flags: { o2: 1, warm: 1, tree: 1 } });
      if (ya <= 4.9e7) add('クジラの祖先', 'whale', 'sea', { flags: { o2: 1, warm: 1 } });
      return o;
    }
    if (ya > 3e5) {
      add('人類の祖先', 'hominin', 'land', { flags: { o2: 1, warm: 1 } });
      add('類人猿', 'primate', 'land', { flags: { o2: 1, warm: 1, tree: 1 } });
      add('大型の哺乳類', 'mammal_large', 'land', { flags: { o2: 1, warm: 1 } });
      add('小型の哺乳類', 'mammal', 'land', { flags: { o2: 1, warm: 1 } });
      return o;
    }
    if (ya > 1.2e4) {
      add('ホモ・サピエンス', 'human', 'land', { flags: { o2: 1, warm: 1, tools: 1 } });
      if (ya > 4e4) add('ネアンデルタール人', 'hominin', 'land', { flags: { o2: 1, warm: 1, tools: 1, cold: 1 } });
      add('マンモス', 'mammal_large', 'land', { flags: { o2: 1, warm: 1 } });
      return o;
    }
    add('ホモ・サピエンス', 'human', 'land', { flags: { o2: 1, warm: 1, tools: 1, farm: ya < 1.2e4 ? 1 : 0 } });
    return o;
  }

  // 生まれた生き物の説明（誕生の記録に出す）
  const ABOUT = {
    "熱水噴出孔の微生物": "深い海の底で、熱い水がわき出す煙突のそばに住む、目に見えないほど小さな生き物。日光の届かない暗闇で、水にとけた化学物質からエネルギーを取り出して生きる。",
    "浅い海の微生物": "核も持たない、たった1つの細胞の生き物。この頃の地球の生命は、ほとんどがこうした微生物だった。",
    "シアノバクテリア": "太陽の光で栄養をつくり、そのときに酸素を出す細菌。地球の空気に酸素を増やした立役者で、今も海や湖にいる。",
    "酸素を使いはじめた細菌": "多くの生き物にとって毒だった酸素を、逆にエネルギーづくりに使えるようになった細菌。のちに動物の細胞の中の「ミトコンドリア」になる仲間。",
    "核を持つ単細胞生物": "遺伝子をしまう「核」を持つ、大きめの1つの細胞の生き物。今のアメーバやゾウリムシの遠い親戚で、動物・植物・キノコはみんなこの仲間から生まれた。",
    "紅藻の祖先（多細胞）": "たくさんの細胞が集まってできた、赤っぽい海藻の祖先。わかっている中で最も古い多細胞生物の1つ。",
    "海綿の祖先": "岩にくっついたまま動かず、体の穴から海水を吸いこんで、小さなえさをこして食べる。最も古い動物の仲間だと考えられている。",
    "海綿の仲間": "岩にくっついたまま動かず、体の穴から海水を吸いこんで、小さなえさをこして食べる動物。脳も筋肉もないが、今も海にたくさんいる。",
    "はうように動く小さな動物": "海の底をゆっくりはい回る、数ミリほどのやわらかい体の動物。目もあしもないが、のちの多くの動物の祖先かもしれない。",
    "ディッキンソニア（エディアカラ生物）": "海の底にはりつく、楕円形で平たい生き物。大きいものは1メートル近くになる。動物なのかどうか、長く謎だった。",
    "三葉虫": "硬い殻と、たくさんのあしを持つ海の節足動物。体は縦に3つに分かれて見える。目は小さなレンズが集まった複眼で、海の底を歩き回っていた。約3億年も栄えた。",
    "アノマロカリス": "カンブリア紀の海で最強クラスの捕食者。体長は最大1メートルほどで、体の横のひれを波打たせて泳ぎ、頭の前の2本のトゲのある腕で獲物をつかまえた。大きな目が2つ飛び出している。エビやカニの遠い親戚。",
    "ゴカイの仲間": "海の底の泥や砂にもぐって暮らす、細長くやわらかい体の動物。体はたくさんの節に分かれていて、今の釣りえさのゴカイの親戚。",
    "ハイコウイクチス（最古級の魚）": "体長3センチほどの小さな魚。あごはないが、体に背骨のもとになる筋が通っている。わたしたち背骨のある動物の、最も古い親戚の1つ。",
    "硬骨魚": "骨でできた骨格と、あごを持つ魚。今いる魚のほとんどがこの仲間で、のちに陸に上がる動物もここから生まれた。",
    "サメの祖先": "骨ではなく、やわらかい軟骨の骨格を持つ魚。鋭い歯は何度でも生えかわる。この仲間は4億年以上、姿をあまり変えずに生き続けている。",
    "ダンクルオステウス（板皮類）": "頭と胸を硬い骨の板でおおった、よろいの魚。体長は最大で6メートル以上。歯のかわりに、刃物のような骨の板で獲物をかみ切った。",
    "原始的な昆虫": "陸に上がったばかりの、まだ羽のない小さな昆虫。コケやシダの間で、植物のかけらなどを食べていた。",
    "イクチオステガ（初期の両生類）": "魚から進化して、あしで陸を歩きはじめた最初のころの動物。体長1メートルほど。まだ水辺から離れられず、卵も水の中に産んだ。",
    "ヒロノムス（は虫類の祖先）": "体長20センチほどの、トカゲのような姿の小さな動物。殻のある卵を陸に産めるようになり、水辺を離れて暮らせた最初の仲間の1つ。",
    "ディメトロドン（単弓類）": "背中に大きな帆を持つ、体長3メートルほどの肉食動物。恐竜に似て見えるが、じつは恐竜よりも、わたしたち哺乳類に近い仲間。",
    "トカゲの仲間": "うろこにおおわれた体で、乾いた陸でも暮らせる小さなは虫類。虫などを食べる。恐竜の時代にも、そのすみでしぶとく生きていた。",
    "昆虫": "6本のあしと、羽を持つ小さな生き物。数も種類もとても多く、陸の生き物の主役の1つ。",
    "魚竜": "イルカのような体つきで海を泳いだは虫類。陸の動物の子孫だが、海に戻って暮らし、子どもを海の中で産んだ。",
    "小型の恐竜": "2本の後ろあしで素早く走る、体長1〜2メートルほどの恐竜。恐竜はこうした小さな姿から始まり、やがて巨大な仲間も現れた。",
    "翼竜": "腕と長い指の間に張った皮の膜で、空を飛んだは虫類。恐竜の親戚だが恐竜ではない。大きいものは翼の幅が10メートルにもなった。",
    "哺乳類の祖先（ネズミほどの大きさ）": "恐竜の時代に、夜の暗がりでひっそり暮らした小さな動物。体は毛でおおわれ、子どもを乳で育てる。わたしたちの遠い祖先。",
    "首の長い恐竜": "長い首と尾を持つ、陸上で最大級の植物食の恐竜。体長30メートルを超えるものもいた。高い木の葉を食べていた。",
    "肉食恐竜": "2本の後ろあしで歩き、鋭い歯とかぎづめで獲物をとらえた恐竜。ティラノサウルスもこの仲間で、鳥はここから進化した。",
    "初期の鳥": "羽毛と翼を持つが、口には歯があり、翼には指のつめが残っている。恐竜から鳥へと移り変わるころの姿。",
    "小型の哺乳類": "恐竜がいなくなった世界で、いろいろな姿に広がりはじめた小さな哺乳類。体は毛でおおわれ、子どもを乳で育てる。",
    "鳥": "羽毛と翼で空を飛ぶ、恐竜の生き残りの子孫。恐竜を絶滅させた隕石の後も生きのびた。",
    "ウマの祖先": "キツネくらいの大きさで、森でやわらかい葉を食べていた。前あしに4本、後ろあしに3本の指があった。",
    "初期の霊長類": "木の上で暮らす、リスくらいの小さな動物。ものをつかめる手と、前を向いた目を持つ。サルや人間の遠い祖先。",
    "クジラの祖先": "オオカミのような姿で、4本のあしで水辺を歩いていた哺乳類。ここから海へ戻り、やがてクジラやイルカになる。",
    "人類の祖先": "森を出て、2本足で立って歩きはじめたサルの仲間。脳はまだ小さいが、手が自由に使えるようになった。",
    "類人猿": "しっぽのない、大きめのサルの仲間。チンパンジーやゴリラ、オランウータンの親戚で、かしこく、群れで暮らす。",
    "大型の哺乳類": "草原や森で暮らす、大きな体の哺乳類。ゾウやサイ、シカなどの仲間。",
    "ホモ・サピエンス": "わたしたち人間。アフリカで生まれ、道具と火とことばを使い、やがて世界中に広がった。",
    "ネアンデルタール人": "寒いヨーロッパで暮らした、わたしたちに近い人類。がっしりした体で、火や石器を使った。",
    "マンモス": "長い毛と大きな牙を持つ、氷河時代のゾウの仲間。寒い草原で草を食べていた。",
  };

  /* ---------------- 系統 ---------------- */
  let seq = 0;
  function makeLineage(opt, ya, isPlayer) {
    const b = PLANS[opt.plan].base;
    const traits = {};
    TRAITS.forEach((k, i) => (traits[k] = b[i]));
    return {
      id: ++seq, isPlayer, name: opt.name, plan: opt.plan, habitat: opt.habitat,
      traits, flags: { ...(opt.flags || {}) },
      N: MICRO.has(opt.plan) ? 12 : opt.plan === 'human' ? 1 : 5,
      maxN: 5, alive: true, bornYa: ya, deathYa: null, deathCause: '',
      taken: new Set(), path: [], log: [], place: opt.flags && opt.flags.burrow ? 'burrow' : null,
    };
  }
  function setPlan(L, plan) {
    if (L.plan === plan) return;
    L.bloom = 1;
    const b = PLANS[plan].base;
    TRAITS.forEach((k, i) => (L.traits[k] = Math.round((L.traits[k] + b[i] * 2) / 3)));
    L.plan = plan;
  }
  function bump(L, d) {
    for (const k in d) L.traits[k] = Math.max(0, Math.min(100, L.traits[k] + d[k]));
  }

  // 選択肢を出す条件（optsFor）に使う
  const isMoss = (L) => L.plan === 'plant', notMoss = (L) => L.plan !== 'plant';
  const photoOf = (L) => L.plan === 'cyano' || PLANTS.has(L.plan) || !!L.flags.photo;
  const onLandOf = (L) => L.habitat === 'land' || L.habitat === 'air';
  const subIs = (L, v) => L.flags.sub === v && SUBS.some((s) => s.v === v && s.plan === L.plan);
  /* ---------------- 分かれ道（進化の選択） ----------------
     from〜to の時代に、条件に合う系統に一度だけ訪れる */
  const NODES = [
    {
      id: 'energy', from: 3.8e9, to: 2.5e9, when: (L) => L.plan === 'microbe' && !L.flags.o2,
      q: '生きるためのエネルギーを、どこから得る？',
      ctx: 'まだ酸素のない海。微生物たちは、それぞれのやり方で生きる力を手に入れた。',
      opts: [
        { label: '太陽の光で栄養をつくる', desc: '光合成を始める。数を増やしやすいが、光の届く浅い海から離れられない。', real: 'シアノバクテリアはこの道で、のちに地球の空気を変えた。',
          apply: (L) => { setPlan(L, 'cyano'); L.habitat = 'shallow'; L.flags.photo = 1; L.flags.o2 = 1; bump(L, { adapt: 5 }); } },
        { label: '深海の熱水のそばにとどまる', desc: '熱水に含まれる化学物質からエネルギーを得る。増えにくいが、地表の大変動に強い。', real: '熱水噴出孔のまわりには、今もこうした微生物がいる。',
          apply: (L) => { L.habitat = 'deep'; bump(L, { adapt: 10, speed: -5 }); } },
        { label: 'ほかの微生物を食べる', desc: '動き回って食べる。増えやすいが、食べるものがなくなると苦しい。', real: '食べる・食べられる関係は、この頃から始まっていた。',
          apply: (L) => { bump(L, { speed: 20, adapt: -5 }); L.flags.predator = 1; } },
      ],
    },
    {
      id: 'o2', from: 2.6e9, to: 1.5e9, when: (L) => MICRO.has(L.plan) && !L.flags.o2,
      q: '空気に酸素が増えはじめた。酸素は、多くの微生物にとって毒だ。',
      ctx: 'シアノバクテリアが出す酸素が、海と空気にたまり始めている。',
      opts: [
        { label: '酸素を使う仕組みを手に入れる', desc: '毒だった酸素で、大きなエネルギーを取り出せるようになる。', real: '酸素を使う呼吸は、のちの動物すべての土台になった。',
          apply: (L) => { L.flags.o2 = 1; bump(L, { adapt: 10, speed: 5 }); } },
        { label: '酸素の届かない深海や泥の中へ逃げる', desc: '住める場所は狭くなるが、酸素から身を守れる。', real: '酸素を嫌う微生物は、今も泥の中や深海で暮らしている。',
          apply: (L) => { L.habitat = 'deep'; L.flags.refuge = 1; bump(L, { adapt: 5 }); } },
        { label: 'このまま浅い海で耐える', desc: '何も変えない。運にまかせる。', real: '',
          apply: (L) => { bump(L, { adapt: -5 }); } },
      ],
    },
    {
      id: 'endo', from: 2.2e9, to: 1.1e9, when: (L) => L.plan === 'microbe' && L.flags.o2,
      q: 'ほかの細菌を体の中に取り込み、一緒に生きる？',
      ctx: '大きな細胞が小さな細菌を飲み込み、消化せずに共に暮らすことがある。',
      opts: [
        { label: '取り込んで、一緒に生きる', desc: '取り込んだ細菌がエネルギーをつくる。細胞が大きく複雑になる。', real: '取り込まれた細菌が、今のミトコンドリアになったと考えられている（細胞内共生説）。',
          apply: (L) => { setPlan(L, 'cell'); L.name = '核を持つ細胞'; bump(L, { brain: 3 }); } },
        { label: '小さく単純なままでいる', desc: '速く増え、どこにでも住める。', real: '細菌や古細菌は、今も地球のあらゆる場所にいる。',
          apply: (L) => { bump(L, { adapt: 10 }); L.N = Math.min(CAP, L.N * 2); } },
      ],
    },
    {
      id: 'chloro', from: 2.0e9, to: 1.0e9, when: (L) => L.plan === 'cyano',
      q: '大きな細胞に取り込まれそうだ。',
      ctx: '核を持つ細胞が、光合成をする細菌を体の中に取り込みはじめた。',
      opts: [
        { label: '取り込まれて、細胞の中で光合成を続ける', desc: '大きな細胞の一部として生きる。のちに海藻や植物へつながる。', real: 'こうして葉緑体が生まれ、藻類や植物の祖先になった。',
          apply: (L) => { setPlan(L, 'colony'); L.name = '藻類の祖先'; } },
        { label: '独立した細菌のままでいる', desc: '自由に増えるシアノバクテリアとして生きる。', real: 'シアノバクテリアは今も海で酸素をつくっている。',
          apply: (L) => { bump(L, { adapt: 10 }); } },
      ],
    },
    // シアノバクテリアのまま生きる道（「退屈な10億年」も、実際にしてきたことで埋める）
    {
      id: 'cyanoN', from: 1.7e9, to: 1.2e9, when: (L) => L.plan === 'cyano',
      q: '海の栄養が足りない。空気の窒素を、どうやって取り込む？',
      ctx: '体をつくるには窒素がいる。けれど窒素を取り込む仕組みは、自分の出す酸素に弱い。',
      opts: [
        { label: '窒素を取り込む専用の細胞をつくる', desc: '仲間の細胞の一部が、窒素を取り込む係になる。栄養の少ない海でも増えられる。', real: '一部のシアノバクテリアは「異質細胞」という窒素を取り込む専用の細胞をつくる。いつ生まれたかは諸説ある。',
          apply: (L) => { L.flags.nfix = 1; bump(L, { adapt: 8 }); L.N = Math.min(CAP, L.N * 1.2); } },
        { label: '糸のように連なって暮らす', desc: '細胞がつながり、長い糸になる。体の大きな生き物への一歩。', real: '糸のようにつながったシアノバクテリアの化石は、とても古い地層から見つかっている。',
          apply: (L) => { L.flags.filament = 1; bump(L, { size: 10, adapt: 3 }); } },
        { label: '昼と夜で仕事を分ける', desc: '昼は光合成、夜は窒素の取り込み。1つの細胞で両方こなす。', real: '今の海のシアノバクテリアには、昼と夜で仕事を分けるものがいる。',
          apply: (L) => { bump(L, { adapt: 5, speed: 5 }); } },
      ],
    },
    {
      id: 'cyanoWhere', from: 1.2e9, to: 8.0e8, when: (L) => L.plan === 'cyano',
      q: '大きな変化の少ない時代。どこへ広がる？',
      ctx: '18億〜8億年前は「退屈な10億年」とも呼ばれる。シアノバクテリアは静かにすみかを広げていた。',
      opts: [
        { label: '外洋へ漂う', desc: '岸を離れ、広い海の表面を漂う。どこまでも広がれるが、身を寄せる場所はない。', real: '今の外洋には、プロクロロコッカスという、地球でいちばん数の多い光合成の生き物がいる。',
          apply: (L) => { L.flags.ocean = 1; bump(L, { adapt: 5 }); L.N = Math.min(CAP, L.N * 1.2); } },
        { label: '浅い海で岩（ストロマトライト）を積み続ける', desc: '仲間と層を重ね、岩のような山をつくる。慣れた場所で確実に生きる。', real: 'ストロマトライトは、今もオーストラリアのシャーク湾などで育っている。',
          apply: (L) => { bump(L, { armor: 10 }); } },
        { label: '湿った陸の岩へ上がる', desc: '波打ち際から、雨にぬれる陸の岩へ。乾きに耐えれば、誰もいない場所を独り占めできる。', real: '10億年以上前の陸の地層にも、微生物がつくった薄い膜の跡が残っている。',
          apply: (L) => { L.flags.rock = 1; bump(L, { adapt: 10, speed: -5 }); } },
      ],
    },
    {
      id: 'multi', from: 1.2e9, to: 6.4e8, when: (L) => L.plan === 'cell',
      q: '仲間の細胞と集まって、ひとつの体をつくる？',
      ctx: '細胞どうしがくっつき、役割を分けはじめた。',
      opts: [
        { label: '多細胞の体になる', desc: '体が大きくなり、役割を分けられる。そのぶん、増えるのは遅くなる。', real: '動物・植物・菌類は、すべてこの道の先にいる。',
          apply: (L) => { setPlan(L, 'colony'); L.name = '多細胞生物'; } },
        { label: '単細胞のまま、有性生殖で多様になる', desc: '遺伝子を混ぜ合わせ、環境の変化に備える。', real: 'ゾウリムシやアメーバのような単細胞生物も、今なお栄えている。',
          apply: (L) => { L.flags.sex = 1; bump(L, { adapt: 15 }); } },
      ],
    },
    {
      id: 'snow', from: 7.4e8, to: 7.17e8, when: (L) => L.alive && L.habitat !== 'land',
      q: '地球が冷え込み、海が凍りはじめた。どこで耐える？',
      ctx: 'このままだと、地球全体が氷に覆われる「全球凍結」になる。',
      opts: [
        { label: '火山の熱がある海底へ', desc: '暗いが、凍らない場所。', real: '熱水のまわりは、凍った地球でも生き物の避難場所になったと考えられている。',
          apply: (L) => { L.flags.ventRefuge = 1; } },
        { label: '休眠して、氷が解けるのを待つ', desc: '胞子のように眠って耐える。', real: '休眠は、今も多くの微生物が使う生き残り方だ。',
          apply: (L) => { L.flags.dormant = 1; bump(L, { speed: -5 }); } },
        { label: '氷の割れ目の薄い水で暮らす', desc: 'わずかな光と水に頼る。', real: '',
          apply: (L) => { L.flags.icewater = 1; } },
      ],
    },
    // 動物・植物・人間があらわれてからの微生物（微生物のままの系統は、ここから先も分かれ道がある）
    {
      id: 'microAnimal', from: 5.3e8, to: 4.8e8, when: (L) => L.plan === 'microbe' || L.plan === 'cell',
      q: '海に、目や口を持つ動物があふれはじめた。動物とどう付き合う？',
      ctx: 'カンブリア爆発。微生物だけの海は終わり、大きな生き物の体が新しいすみかになった。',
      opts: [
        { label: '動物のおなかに住みつく', desc: '食べ物の通り道で、動物と一緒に生きる。栄養は多いが、住む場所は動物しだい。', real: '動物の腸には、今も何百種類もの細菌が住んでいる。',
          apply: (L) => { L.flags.gut = 1; bump(L, { speed: 10, adapt: -5 }); } },
        { label: 'サンゴや海綿と手を組む', desc: '動物の体にすみかを借りて、栄養を分けあう。', real: 'サンゴの体の中では、今も小さな藻が光合成をして栄養を渡している。',
          apply: (L) => { L.flags.partner = 1; bump(L, { armor: 10 }); } },
        { label: '自由に暮らす', desc: '誰にも頼らず、海のどこにでも広がる。', real: '',
          apply: (L) => { bump(L, { adapt: 5 }); } },
      ],
    },
    {
      id: 'microLand', from: 4.7e8, to: 4.0e8, when: (L) => MICRO.has(L.plan) && L.plan !== 'cyano' && L.habitat !== 'deep' && !(L.plan === 'colony' && L.flags.photo),
      q: '陸に、植物が根を下ろしはじめた。',
      ctx: 'それまで岩と砂だけだった陸に、小さな緑が広がっていく。',
      opts: [
        { label: '植物の根と手を組む', desc: '植物に水や栄養を渡し、かわりに糖をもらう。', real: '植物の根と菌類・細菌の協力は、4億年以上前から陸の森を支えている。',
          apply: (L) => { L.flags.root = 1; L.habitat = 'land'; bump(L, { adapt: 5 }); } },
        { label: '土の中へ広がる', desc: '陸の土で、枯れた植物や死骸を分解して暮らす。', real: 'ひとすくいの土には、何十億もの微生物がいる。',
          apply: (L) => { L.flags.soil = 1; L.habitat = 'land'; bump(L, { adapt: 10, speed: -5 }); } },
        { label: '海に残る', desc: 'なじんだ海で、これまでどおり暮らす。', real: '',
          apply: (L) => { bump(L, { adapt: 3 }); } },
      ],
    },
    {
      id: 'cyanoLand', from: 4.7e8, to: 4.0e8, when: (L) => L.plan === 'cyano',
      q: '陸に、植物が根を下ろしはじめた。',
      ctx: 'それまで岩と砂だけだった陸に、小さな緑が広がっていく。手を組める相手が増えた。',
      opts: [
        { label: '菌と手を組んで地衣類になる', desc: '菌の体の中で光合成をして、かわりに水と住まいをもらう。むき出しの岩にも住める。', real: '地衣類は、菌と藻やシアノバクテリアの共同体。約4億年前の地層（ライニーチャート）から見つかっている。',
          apply: (L) => { L.flags.lichen = 1; L.habitat = 'land'; bump(L, { adapt: 10, armor: 10 }); } },
        { label: '植物の根やすきまに住みつく', desc: '植物に窒素を渡し、かわりに糖をもらう。', real: 'ソテツの根やアカウキクサの葉のすきまには、今もシアノバクテリアが住んでいる。',
          apply: (L) => { L.flags.root = 1; L.habitat = 'land'; bump(L, { adapt: 5 }); } },
        { label: '水の中に残る', desc: 'なじんだ水の中で、これまでどおり暮らす。', real: '', only: (L) => !L.flags.rock,
          apply: (L) => { bump(L, { adapt: 3 }); } },
        { label: '岩の上で、このまま暮らす', desc: '雨にぬれる岩の上で、乾きに耐えて暮らし続ける。', real: '雨の少ない砂漠の地面も、シアノバクテリアの薄い膜におおわれていることがある。', only: (L) => !!L.flags.rock,
          apply: (L) => { bump(L, { adapt: 5 }); } },
      ],
    },
    {
      id: 'microKpg', from: 6.6e7, to: 5.5e7, when: (L) => MICRO.has(L.plan),
      q: '隕石のあと、倒れた森と死骸が地球をおおった。',
      ctx: '空はちりで暗く、植物は枯れた。けれど、分解する者には食べ物があふれている。',
      opts: [
        { label: '死骸や倒れた木を分解して増える', desc: '一気に数を増やす。', real: '隕石のあとの地層には、菌類の胞子が急に増えた跡が残っている。', only: (L) => !photoOf(L),
          apply: (L) => { L.N = Math.min(CAP, L.N * 1.6); bump(L, { adapt: 5 }); } },
        { label: '静かな場所でやり過ごす', desc: '数は増やさず、嵐が過ぎるのを待つ。', real: '',
          apply: (L) => { bump(L, { adapt: 8 }); } },
        { label: 'ちりが晴れて光が戻るのを待ち、一気に増える', desc: '暗いあいだはじっと耐え、光が戻ったら真っ先に増える。', real: '隕石のあとの海では、光が戻ると小さな藻やシアノバクテリアがいち早く増えたと考えられている。', only: photoOf,
          apply: (L) => { bump(L, { adapt: 5 }); L.N = Math.min(CAP, L.N * 1.4); } },
      ],
    },
    {
      id: 'microHuman', from: 1.1e4, to: 2e3, when: (L) => L.plan === 'microbe' || L.plan === 'cell',
      q: '人間が村をつくり、麦や乳をたくわえはじめた。',
      ctx: '農耕のはじまり。人の暮らしのすぐそばに、新しいすみかが生まれた。',
      opts: [
        { label: 'パンやチーズ、納豆をつくる仲間になる', desc: '人の食べ物の中で増え、人に大切に育てられる。', real: '酵母・乳酸菌・納豆菌。人は何千年も、微生物と一緒に食べ物をつくってきた。',
          apply: (L) => { L.flags.ferment = 1; L.N = Math.min(CAP, L.N * 1.3); } },
        { label: '人のおなかに住む', desc: '人の腸で、消化を手伝いながら暮らす。', real: '人の腸には約100兆個の細菌が住み、消化や体の守りを助けている。',
          apply: (L) => { L.flags.gut = 1; L.flags.humanGut = 1; } },
        { label: '人から離れて暮らす', desc: '人間とかかわらず、これまでのすみかで生きる。', real: '',
          apply: (L) => { bump(L, { adapt: 3 }); } },
      ],
    },
    // 藻類から植物へ：陸へ上がる → 水を運ぶ茎 → 種 → 花 → 草
    {
      id: 'landPlant', from: 4.7e8, to: 4.2e8, when: (L) => L.plan === 'colony' && L.flags.photo,
      q: '陸には、まだ緑がない。水辺から陸へ上がる？',
      ctx: 'オルドビス紀。海には藻類があふれているが、陸は岩と砂ばかり。',
      opts: [
        { label: '乾きに強い体で、陸へ上がる', desc: 'コケのように地面に張りつき、乾いても耐える体になる。', real: '陸に最初に広がった植物は、コケに近い小さな植物だった。',
          apply: (L) => { setPlan(L, 'plant'); L.habitat = 'land'; L.name = 'コケの仲間'; } },
        { label: '海に残り、海藻の森をつくる', desc: 'なじんだ海で、光を浴びて暮らし続ける。', real: '',
          apply: (L) => { bump(L, { adapt: 5 }); } },
      ],
    },
    {
      id: 'vascular', from: 4.3e8, to: 3.7e8, when: (L) => L.plan === 'plant',
      q: '茎の中に、水を運ぶ管をつくる？',
      ctx: 'シルル紀からデボン紀。陸の植物は、まだ地面すれすれの高さしかない。',
      opts: [
        { label: '茎に水の通り道をつくり、高く伸びる', desc: '根から葉まで水を運べるようになり、背が高くなる。', real: '水を運ぶ管（維管束）を持つ植物が現れ、のちの森につながった。',
          apply: (L) => { setPlan(L, 'fern'); L.name = 'シダの仲間'; } },
        { label: '低く地面をおおって広がる', desc: '背は低いまま、湿った地面いっぱいに広がる。', real: 'コケの仲間は、今も森の地面や岩をおおっている。',
          apply: (L) => { bump(L, { adapt: 10 }); L.N = Math.min(CAP, L.N * 1.3); } },
      ],
    },
    {
      id: 'seedPlant', from: 3.7e8, to: 3.0e8, when: (L) => L.plan === 'fern',
      q: '乾いた土地でも子を残せる「種」をつくる？',
      ctx: 'デボン紀の終わりから石炭紀。シダの森が広がっているが、胞子で増えるには水がいる。',
      opts: [
        { label: '乾いても芽を出せる種をつくる', desc: '種の中に栄養をたくわえ、乾いた土地にも広がる。', real: '種で増える植物（裸子植物）が現れ、乾いた大陸の内側にも森ができた。',
          apply: (L) => { setPlan(L, 'seed'); L.name = 'マツやイチョウの仲間'; } },
        { label: '胞子のまま、湿った森で栄える', desc: '石炭紀の湿った大森林の主役であり続ける。', real: '石炭紀の巨大なシダやリンボクの森が、のちの石炭になった。',
          apply: (L) => { L.N = Math.min(CAP, L.N * 1.4); } },
      ],
    },
    {
      id: 'plantA', from: 2.9e8, to: 2.6e8, when: (L) => PLANTS.has(L.plan),
      q: 'ペルム紀の乾いた大地を、どう生きる？',
      ctx: '大陸がひとつにまとまり、内陸は乾いている。',
      opts: [
        { label: '高く育ち、光を独り占めする', desc: '強くなるが、環境の急な変化に弱くなる。', real: 'ペルム紀には、イチョウやソテツの祖先が森をつくりはじめた。', only: notMoss,
          apply: (L) => bump(L, { size: 15, adapt: -5 }) },
        { label: '小さく、早く芽を出す', desc: 'どんな時代でも生き延びやすい。', real: '',
          apply: (L) => bump(L, { size: -15, adapt: 15 }) },
        { label: 'とげや毒で、食べられないようにする', desc: '食べられて減りにくくなる。', real: '葉を食べる動物が増え、植物も身を守る工夫を重ねていった。', only: notMoss,
          apply: (L) => bump(L, { armor: 15 }) },
        { label: '岩のすき間に、乾きに強いじゅうたんを広げる', desc: '乾いても死なず、雨が降ればすぐに緑に戻る体になる。', real: 'コケの仲間には、からからに乾いても、水を得ると数時間で生き返るものがいる。', only: isMoss,
          apply: (L) => { bump(L, { adapt: 10 }); L.N = Math.min(CAP, L.N * 1.2); } },
        { label: '苦い成分で、食べられないようにする', desc: '食べられて減りにくくなる。', real: 'コケの多くは苦い成分を持ち、虫や動物にあまり食べられない。', only: isMoss,
          apply: (L) => bump(L, { armor: 15 }) },
      ],
    },
    {
      id: 'flowerPlant', from: 1.4e8, to: 1.0e8, when: (L) => L.plan === 'seed',
      q: '花を咲かせ、虫に花粉を運んでもらう？',
      ctx: '白亜紀。恐竜が歩く森で、虫たちが植物のあいだを飛び回っている。',
      opts: [
        { label: '花を咲かせ、虫と手を組む', desc: '花のみつで虫を呼び、花粉を運んでもらう。', real: '花を咲かせる植物は白亜紀に現れ、たちまち世界中に広がった。',
          apply: (L) => { setPlan(L, 'flower'); L.name = '花を咲かせる植物'; } },
        { label: '風で花粉を飛ばし、針葉樹の森をつくる', desc: '背の高い木になり、寒い土地にも森を広げる。', real: 'マツやスギの仲間は、今も寒い土地で大きな森をつくっている。',
          apply: (L) => bump(L, { armor: 10, adapt: 5 }) },
      ],
    },
    {
      id: 'plantB', from: 6.0e7, to: 4.0e7, when: (L) => PLANTS.has(L.plan),
      q: '恐竜のいない世界を、どう生きる？',
      ctx: '新しく増えた哺乳類や鳥が、葉や実を食べはじめた。',
      opts: [
        { label: '高く育ち、光を独り占めする', desc: '強くなるが、環境の急な変化に弱くなる。', real: '古第三紀のはじめは暖かく、北極の近くまで森が広がった。', only: notMoss,
          apply: (L) => bump(L, { size: 15, adapt: -5 }) },
        { label: '甘い実をつけ、動物に種を運ばせる', desc: '食べられることで、遠くへ広がる。', real: '実を食べる鳥や哺乳類が、種を遠くまで運ぶようになった。', only: (L) => L.plan === 'flower',
          apply: (L) => { bump(L, { adapt: 10 }); L.N = Math.min(CAP, L.N * 1.3); } },
        { label: 'とげや毒で、食べられないようにする', desc: '食べられて減りにくくなる。', real: 'バラのとげやトウガラシの辛さも、食べられないための工夫だ。', only: notMoss,
          apply: (L) => bump(L, { armor: 15 }) },
        { label: '湿った森の地面や岩をおおって広がる', desc: '背は低いまま、日かげの地面や岩をじゅうたんのようにおおう。', real: 'コケの仲間は、森の地面や岩、木の幹をじゅうたんのようにおおっている。', only: isMoss,
          apply: (L) => { bump(L, { adapt: 10 }); L.N = Math.min(CAP, L.N * 1.2); } },
        { label: '苦い成分で、食べられないようにする', desc: '食べられて減りにくくなる。', real: 'コケの多くは苦い成分を持ち、虫や動物にあまり食べられない。', only: isMoss,
          apply: (L) => bump(L, { armor: 15 }) },
        { label: '日かげの湿った谷で葉を広げる', desc: '高い木の下の、湿った日かげで暮らす。', real: '今のシダの多くは、花を咲かせる植物の森の下で、新しく種類を増やしたと考えられている。', only: (L) => L.plan === 'fern',
          apply: (L) => bump(L, { adapt: 8 }) },
        { label: '寒い山や北の大地へ森を広げる', desc: '寒さに強い葉で、ほかの木が育ちにくい土地へ。', real: 'マツやトウヒの仲間は、今も北の寒い土地に広い森をつくっている。', only: (L) => L.plan === 'seed',
          apply: (L) => bump(L, { adapt: 8, armor: 5 }) },
      ],
    },
    {
      id: 'grassPlant', from: 3.0e7, to: 1.0e7, when: (L) => L.plan === 'flower',
      q: '地球が乾いていく。どんな姿で広がる？',
      ctx: '新第三紀。森が縮み、乾いた大地が広がっている。',
      opts: [
        { label: '草になって、乾いた大地を草原に変える', desc: '背の低い草になり、食べられてもすぐに伸びる。', real: '草原は新第三紀に広がり、ウマやゾウの仲間を育てた。',
          apply: (L) => { L.flags.sub = 'grass'; L.name = '草の仲間'; bump(L, { size: -10, adapt: 10 }); } },
        { label: '森の木であり続ける', desc: '大きな木になって、森を支える。', real: '',
          apply: (L) => bump(L, { size: 10 }) },
      ],
    },
    {
      id: 'body', from: 6.3e8, to: 5.45e8, when: (L) => (L.plan === 'colony' || L.plan === 'soft') && !L.flags.photo,
      q: '体のつくりをどうする？',
      ctx: '氷が解けた海で、目に見える大きさの生き物が現れはじめた。',
      opts: [
        { label: '平たい体で海底に広がる', desc: '葉っぱや円盤のような体。海底の微生物マットの上で暮らす。', real: 'エディアカラ生物の多くは、カンブリア紀を前に姿を消した。',
          apply: (L) => { setPlan(L, 'ediacaran'); L.name = 'エディアカラ生物'; L.habitat = 'sea'; } },
        { label: '前と後ろ、口と肛門のある体', desc: '左右対称の体で、自分の意思で前に進む。', real: '私たちを含む多くの動物が、この体のつくりの子孫だ。',
          apply: (L) => { setPlan(L, 'soft'); L.name = '左右相称動物'; L.habitat = 'sea'; bump(L, { brain: 5 }); } },
        { label: '水をこして食べる', desc: '動かずに、流れてくる栄養を集める。', real: '海綿は、今も生き残っている最古級の動物の仲間だ。',
          apply: (L) => { setPlan(L, 'sponge'); L.name = '海綿の仲間'; L.habitat = 'sea'; } },
      ],
    },
    {
      id: 'predator', from: 5.39e8, to: 4.9e8, when: (L) => L.plan === 'soft',
      q: '目を持つ捕食者が現れた。どうやって生き延びる？',
      ctx: 'カンブリア爆発。海は、食べるか食べられるかの世界になった。',
      opts: [
        { label: '硬い殻とあしを持つ', desc: '体を殻で守り、あしで歩く。', real: '三葉虫は約3億年も海に栄えた。',
          apply: (L) => { setPlan(L, 'arthropod'); L.name = '三葉虫の仲間'; L.flags.trilobite = 1; } },
        { label: '体に芯を通し、速く泳ぐ', desc: '背骨のもとになる「脊索」で、しなやかに泳ぐ。', real: 'この道の先に、魚と、私たち脊椎動物がいる。',
          apply: (L) => { setPlan(L, 'jawless'); L.name = '最初の魚の仲間'; } },
        { label: '自分が捕食者になる', desc: '大きな目とつかむ腕を持つハンターになる。', real: 'アノマロカリスはカンブリア紀の頂点の捕食者だった。',
          apply: (L) => { setPlan(L, 'anomalo'); L.name = 'アノマロカリスの仲間'; } },
        { label: '砂にもぐって隠れる', desc: 'やわらかい体のまま、海底の砂の中で暮らす。', real: 'ゴカイの仲間は今も海底の砂の中にいる。',
          apply: (L) => { L.flags.burrow = 1; bump(L, { armor: 10 }); } },
      ],
    },
    {
      id: 'jaw', from: 4.6e8, to: 4.1e8, when: (L) => L.plan === 'jawless',
      q: 'あごを手に入れる？',
      ctx: 'えらを支える骨が、かむための「あご」に変わりはじめた。',
      opts: [
        { label: 'あごと硬い骨を持つ', desc: '何でもかみ砕き、海じゅうに広がる。', real: '今の魚の大半は、あごと硬い骨を持つ硬骨魚だ。',
          apply: (L) => { setPlan(L, 'fish'); L.name = '硬骨魚'; } },
        { label: 'あごと、分厚い鎧を持つ', desc: '頭を骨の鎧で覆い、強いあごでかみつく。', real: '板皮類はデボン紀の海の王者だったが、その終わりにすべて絶滅した。',
          apply: (L) => { setPlan(L, 'armorfish'); L.name = '板皮類'; } },
        { label: 'あごのないまま生きる', desc: '吸いつく口で、ほかの魚や泥の栄養を取る。', real: 'ヤツメウナギやヌタウナギは、あごのない魚の生き残りだ。',
          apply: (L) => { bump(L, { adapt: 15 }); } },
      ],
    },
    {
      id: 'arthroLand', from: 4.7e8, to: 3.9e8, when: (L) => L.plan === 'arthropod' && L.habitat === 'sea',
      q: '陸に植物が広がりはじめた。陸へ向かう？',
      ctx: '水辺には、まだ誰もいない新しい世界が広がっている。',
      opts: [
        { label: '陸に上がる', desc: '乾燥に耐える殻で、植物の茂る陸へ。', real: 'ヤスデやクモ、昆虫の祖先は、こうして陸に上がった。',
          apply: (L) => { L.habitat = 'land'; L.flags.trilobite = 0; if (L.flags.sub === 'eurypterid') L.flags.sub = null; L.name = '陸の節足動物'; bump(L, { adapt: 10 }); } },
        { label: '海の三葉虫のまま', desc: '慣れた海で、殻を硬くして暮らす。', real: '',
          apply: (L) => { bump(L, { armor: 10 }); } },
        { label: '海底の泥にもぐって暮らす', desc: '目立たず、じっと生きる。', real: 'カブトガニは、4億年以上ほとんど姿を変えずに生きている。',
          apply: (L) => { L.flags.trilobite = 0; L.flags.burrow = 1; L.name = 'カブトガニの仲間'; bump(L, { adapt: 10, speed: -10 }); } },
      ],
    },
    {
      id: 'wings', from: 4.0e8, to: 3.2e8, when: (L) => L.plan === 'arthropod' && L.habitat === 'land' && !hasSub(L),   // クモやサソリは昆虫にならない
      q: '翅（はね）を持つ？',
      ctx: '背中の小さなひだが、空気をとらえはじめた。',
      opts: [
        { label: '空を飛ぶ', desc: '敵から逃げ、遠くの食べ物へ飛んでいける。', real: '昆虫は、空を飛んだ最初の動物だ。今いちばん種の多い動物でもある。',
          apply: (L) => { setPlan(L, 'insect'); L.name = '昆虫'; L.N = Math.min(CAP, L.N * 1.5); } },
        { label: '地面をはって暮らす', desc: '落ち葉や土の中で、静かに生きる。', real: 'ヤスデやクモの仲間は、今も地面で暮らしている。',
          apply: (L) => { bump(L, { armor: 10, adapt: 5 }); } },
      ],
    },
    {
      id: 'land', from: 3.9e8, to: 3.6e8, when: (L) => L.plan === 'fish',
      q: '浅い水辺は酸素が少ない。どうする？',
      ctx: '空気を吸える魚が、水辺に集まりはじめた。',
      opts: [
        { label: 'ひれを足に変えて、陸へ', desc: '体を支える骨のあるひれで、水辺をはい上がる。', real: 'ティクターリクのような魚から、すべての四足動物が生まれた。',
          apply: (L) => { setPlan(L, 'amphibian'); L.name = '最初の四足動物'; L.habitat = 'land'; } },
        { label: '軟骨の体で、海の狩人に', desc: '速く泳ぎ、鋭い歯で獲物をとらえる。', real: 'サメの仲間は4億年以上、海の狩人であり続けている。',
          apply: (L) => { setPlan(L, 'shark'); L.name = 'サメの仲間'; } },
        { label: '魚のまま、海と川に広がる', desc: 'さまざまな形に分かれ、あらゆる水辺に住む。', real: '硬骨魚は今、脊椎動物の種の半分以上を占める。',
          apply: (L) => { bump(L, { adapt: 15 }); L.N = Math.min(CAP, L.N * 1.5); } },
      ],
    },
    {
      id: 'egg', from: 3.4e8, to: 3.0e8, when: (L) => L.plan === 'amphibian',
      q: '乾いた陸地が広がる。卵をどうする？',
      ctx: '水辺でしか卵を産めないと、陸の奥へは行けない。',
      opts: [
        { label: '殻のある卵を産む', desc: '卵の中に水を閉じこめ、乾いた陸でも子を残せる。', real: 'この「羊膜卵」が、は虫類・鳥・哺乳類への扉になった。',
          apply: (L) => { setPlan(L, 'reptile'); L.name = 'は虫類の祖先'; L.flags.egg = 1; } },
        { label: '水辺で卵を産み続ける', desc: '湿った森と水辺で、両生類として生きる。', real: 'カエルやイモリは、今も水辺で卵を産む。',
          apply: (L) => { bump(L, { adapt: 5 }); } },
      ],
    },
    {
      id: 'amniote', from: 3.1e8, to: 2.75e8, when: (L) => L.plan === 'reptile' && !L.flags.sauropsid,
      q: '殻のある卵を産む動物は、ここで二つに分かれた。どちらへ？',
      ctx: '頭の骨の穴の数で分けられる、二つの大きな道。',
      opts: [
        { label: '単弓類の道', desc: 'あごの筋肉が強い。のちに哺乳類へつながる。', real: 'ディメトロドンも、哺乳類の遠い親戚だ。',
          apply: (L) => { setPlan(L, 'synapsid'); L.name = '単弓類'; } },
        { label: '竜弓類の道', desc: 'うろこと、乾燥に強い体。のちに恐竜や鳥へつながる。', real: 'トカゲ・ヘビ・カメ・ワニ・恐竜・鳥は、みなこの道の子孫だ。',
          apply: (L) => { L.flags.sauropsid = 1; bump(L, { armor: 5 }); } },
      ],
    },
    {
      id: 'ptPrep', from: 2.6e8, to: 2.52e8, when: (L) => !MICRO.has(L.plan) && !PLANTS.has(L.plan),
      q: 'シベリアで大噴火が始まった。空気と海が熱くなり、酸素が減っていく。',
      ctx: '何十万年も続く噴火。地球の歴史で最悪の時代が近づいている。',
      opts: [
        { label: '体を小さくし、何でも食べる', desc: '少ない食べ物でも生きられるようにする。', real: '大量絶滅のあとは、小さく何でも食べる生き物が生き残りやすい。',
          apply: (L) => { bump(L, { size: -20, adapt: 15 }); } },
        { label: '穴を掘って暮らす', desc: '地中は、暑さや乾燥から身を守ってくれる。', only: onLandOf, real: '穴を掘るリストロサウルスは、この絶滅を生き延びて大繁栄した。',
          apply: (L) => { L.flags.burrow = 1; } },
        { label: '今のまま勝負する', desc: '何も変えない。', real: '',
          apply: () => {} },
        { label: '海底の泥にもぐって暮らす', desc: '泥の中は、熱くなった海から少し身を守ってくれる。', real: '', only: (L) => !onLandOf(L) && L.plan !== 'sponge',
          apply: (L) => { L.flags.burrow = 1; } },
      ],
    },
    {
      id: 'warm', from: 2.5e8, to: 2.05e8, when: (L) => L.plan === 'synapsid',
      q: '体温を一定に保つ？',
      ctx: '寒い夜でも動ける体があれば、新しい暮らし方ができる。',
      opts: [
        { label: '毛を持ち、体温を保つ小さな体', desc: 'エネルギーはたくさん要るが、いつでも素早く動ける。', real: 'こうして哺乳類が生まれた。',
          apply: (L) => { setPlan(L, 'mammal'); L.name = '哺乳類の祖先'; L.flags.warm = 1; } },
        { label: '大きな体で、草を食べる', desc: '体の大きさで身を守る。', real: '大型の単弓類は、恐竜が栄えるころにほとんど姿を消した。',
          apply: (L) => { bump(L, { size: 20, armor: 5 }); } },
      ],
    },
    {
      id: 'archo', from: 2.45e8, to: 2.2e8, when: (L) => L.plan === 'reptile' && L.flags.sauropsid,
      q: 'どんな姿で生きる？',
      ctx: '大量絶滅のあとの空いた世界。は虫類が、さまざまな形に分かれていく。',
      opts: [
        { label: '二本足で立ち上がる', desc: '後ろ足で素早く走る。', real: 'こうして恐竜が生まれた。',
          apply: (L) => { setPlan(L, 'dino_small'); L.name = '小型の恐竜'; } },
        { label: '海へ戻る', desc: 'ひれのような足で泳ぐ。', real: '魚竜や首長竜は、海の頂点に立った。',
          apply: (L) => { setPlan(L, 'marine_reptile'); L.name = '海のは虫類'; L.habitat = 'sea'; } },
        { label: '空へ', desc: '長い指に膜を張って、空を飛ぶ。', real: '翼竜は、空を飛んだ最初の脊椎動物だ。',
          apply: (L) => { setPlan(L, 'pterosaur'); L.name = '翼竜'; L.habitat = 'air'; } },
        { label: '低く構えたは虫類のまま', desc: 'ワニ・トカゲ・カメのような体で、水辺や地面に暮らす。', real: 'ワニやカメは、恐竜の時代を越えて今も生きている。',
          apply: (L) => { bump(L, { armor: 10, adapt: 10 }); } },
      ],
    },
    {
      id: 'dino', from: 2.0e8, to: 1.6e8, when: (L) => L.plan === 'dino_small' && !L.flags.feather,
      q: '恐竜として、どう生きる？',
      ctx: 'ジュラ紀。恐竜が陸の主役になった。',
      opts: [
        { label: '首を長くし、巨大になる', desc: '高い木の葉を食べ、体の大きさで身を守る。', real: '竜脚類は全長30mを超えるものもいた。',
          apply: (L) => { setPlan(L, 'sauropod'); L.name = '竜脚類'; } },
        { label: '大型の肉食恐竜になる', desc: '強いあごで、ほかの恐竜を狩る。', real: 'アロサウルス、のちのティラノサウルスへつながる道。',
          apply: (L) => { setPlan(L, 'theropod'); L.name = '大型の肉食恐竜'; } },
        { label: '羽毛を持ち、小さく身軽に', desc: '体温を保つ羽毛と、軽い体。', real: '羽毛恐竜の一部が、鳥になった。',
          apply: (L) => { L.flags.feather = 1; bump(L, { size: -15, brain: 10 }); L.name = '羽毛恐竜'; } },
      ],
    },
    {
      id: 'theroFeather', from: 1.75e8, to: 1.3e8, when: (L) => L.plan === 'theropod' && !L.flags.feather,
      q: '体を小さくし、羽毛をまとう？',
      ctx: '肉食恐竜の仲間の中に、羽毛を持つ小さな種が現れはじめた。',
      opts: [
        { label: '小さく身軽な、羽毛恐竜になる', desc: '体温を保つ羽毛と、軽い体。', real: '鳥は、小型の肉食恐竜の仲間から生まれた。',
          apply: (L) => { setPlan(L, 'dino_small'); L.flags.feather = 1; L.name = '羽毛恐竜'; bump(L, { size: -10 }); } },
        { label: '大きな体の狩人であり続ける', desc: '強いあごで、陸の頂点に立つ。', real: '',
          apply: (L) => { bump(L, { size: 5, armor: 5 }); } },
      ],
    },
    {
      id: 'fly', from: 1.6e8, to: 1.15e8, when: (L) => L.plan === 'dino_small' && L.flags.feather,
      q: '羽毛を翼に変えて、空を飛ぶ？',
      ctx: '木から木へ、羽ばたいて移れるようになってきた。',
      opts: [
        { label: '空を飛ぶ', desc: '軽い骨と翼で、空へ。', real: '始祖鳥の時代から、鳥の歴史が始まった。',
          apply: (L) => { setPlan(L, 'bird'); L.name = '鳥'; L.habitat = 'air'; } },
        { label: '地上を走る羽毛恐竜のまま', desc: '速い足と賢い頭で、地上の狩人になる。', real: 'ヴェロキラプトルも羽毛を持つ恐竜だった。',
          apply: (L) => { bump(L, { speed: 10, brain: 5 }); } },
      ],
    },
    {
      id: 'night', from: 2.0e8, to: 7.0e7, when: (L) => L.plan === 'mammal',
      q: '地上は恐竜の天下。哺乳類として、どう生きる？',
      ctx: '大きな恐竜が昼の世界を支配している。',
      opts: [
        { label: '夜に動く', desc: '耳と鼻を研ぎすまし、暗闇で暮らす。', real: '多くの哺乳類が夜行性なのは、この時代のなごりとされる。',
          apply: (L) => { L.flags.night = 1; bump(L, { brain: 10 }); } },
        { label: '木の上で暮らす', desc: '枝をつかむ手と、遠くを見る目。', real: '',
          apply: (L) => { L.flags.tree = 1; bump(L, { brain: 5, speed: 5 }); } },
        { label: '地面に穴を掘る', desc: '巣穴に隠れて、敵と寒さをやり過ごす。', real: '',
          apply: (L) => { L.flags.burrow = 1; } },
        { label: '体を大きくして対抗する', desc: '恐竜の子どもを襲えるくらい大きくなる。', real: 'レペノマムスは恐竜の子を食べていた哺乳類だ。',
          apply: (L) => { bump(L, { size: 30 }); } },
      ],
    },
    {
      id: 'radiation', from: 6.5e7, to: 4.5e7, when: (L) => L.plan === 'mammal',
      q: '恐竜が消えた。空いた世界で、何になる？',
      ctx: '大きな動物のいない森と草原。哺乳類が一気に多様になっていく。',
      opts: [
        { label: '大きな草食獣になる', desc: '草原を群れで歩く。', real: 'ウマやゾウ、ウシの仲間がこの道に。',
          apply: (L) => { setPlan(L, 'mammal_large'); L.name = '大型の哺乳類'; } },
        { label: '海へ戻る', desc: '足をひれに変え、海で暮らす。', real: 'クジラの祖先は、陸を歩く動物だった。',
          apply: (L) => { setPlan(L, 'whale'); L.name = 'クジラの仲間'; L.habitat = 'sea'; } },
        { label: '木の上で、目と手を使う', desc: '前を向いた目と、ものをつかむ手。', real: 'こうして霊長類が生まれた。',
          apply: (L) => { setPlan(L, 'primate'); L.name = '霊長類'; L.flags.tree = 1; } },
        { label: '小さいまま、数を増やす', desc: 'すばやく子を産み、どこにでも住む。', real: 'ネズミの仲間は、今いちばん種の多い哺乳類だ。',
          apply: (L) => { bump(L, { adapt: 15 }); L.N = Math.min(CAP, L.N * 2); } },
      ],
    },
    {
      id: 'savanna', from: 1.0e7, to: 5.0e6, when: (L) => L.plan === 'primate',
      q: '森が減り、草原が広がっていく。',
      ctx: 'アフリカが乾燥し、森が切れ切れになってきた。',
      opts: [
        { label: '草原に出て、二本足で歩く', desc: '遠くを見わたし、手を自由に使える。', real: 'こうして人類の祖先が生まれた。',
          apply: (L) => { setPlan(L, 'hominin'); L.name = '人類の祖先'; } },
        { label: '森に残る', desc: '慣れた森で、木の実を食べて暮らす。', real: 'チンパンジーやゴリラの祖先は、森に残った。',
          apply: (L) => { bump(L, { adapt: 5 }); } },
      ],
    },
    {
      id: 'tools', from: 3.0e6, to: 1.5e6, when: (L) => L.plan === 'hominin' && !L.flags.tools,
      q: '生き残るための工夫は？',
      ctx: '乾燥と寒さがくり返し、食べ物が手に入りにくくなる。',
      opts: [
        { label: '石器を使い、肉を食べ、脳を育てる', desc: '道具で狩りや解体をする。', real: 'ホモ属は、この道で脳を大きくした。',
          apply: (L) => { L.flags.tools = 1; bump(L, { brain: 15 }); L.name = 'ホモ属（原人）'; } },
        { label: '大きなあごと歯で、硬い植物を食べる', desc: '体の力で生き抜く。', real: '頑丈型猿人（パラントロプス）は約120万年前までに姿を消した。',
          apply: (L) => { L.flags.robust = 1; bump(L, { armor: 10, size: 10 }); L.name = '頑丈型猿人'; } },
      ],
    },
    {
      id: 'sapiens', from: 4.0e5, to: 3.0e5, when: (L) => L.plan === 'hominin' && !L.flags.cold && !L.flags.robust,
      q: '寒さと乾燥がくり返す時代。どう生きる？',
      ctx: 'アフリカとユーラシアに、いくつもの人類が暮らしている。',
      opts: [
        { label: '言葉と協力で、遠くの仲間とつながる', desc: '大きな群れで知恵を分け合い、どこへでも広がる。', real: 'これがホモ・サピエンス、私たちだ。',
          apply: (L) => { setPlan(L, 'human'); L.name = 'ホモ・サピエンス'; L.N = 1; L.flags.tools = 1; } },
        { label: '寒さに強い頑丈な体になる', desc: '氷河時代のヨーロッパで、少人数で暮らす。', real: 'ネアンデルタール人は約4万年前に姿を消した。遺伝子の一部は今も私たちの中にある。',
          apply: (L) => { L.flags.cold = 1; bump(L, { size: 10, armor: 10 }); L.name = 'ネアンデルタール人の仲間'; } },
      ],
    },
    {
      id: 'meet', from: 2.0e5, to: 4.5e4, when: (L) => L.plan === 'hominin',
      q: 'アフリカから来た、別の人類に出会った。',
      ctx: 'ホモ・サピエンスが、あなたたちの暮らす土地に広がってきている。',
      opts: [
        { label: '交わって、ともに暮らす', desc: '子どもを残し、知恵を分け合う。', real: '現代人のDNAの約2%は、ネアンデルタール人から受け継いだものだ。',
          apply: (L) => { L.flags.admix = 1; } },
        { label: '距離を置き、自分たちの土地を守る', desc: '寒い土地で、少人数で暮らし続ける。', real: '',
          apply: (L) => { bump(L, { adapt: 5 }); } },
      ],
    },
    {
      id: 'farm', from: 1.3e4, to: 9e3, when: (L) => L.plan === 'human' && !L.flags.farm,
      q: '氷河時代が終わった。食べ物をどう手に入れる？',
      ctx: '暖かく安定した気候が、1万年以上続こうとしている。',
      opts: [
        { label: '麦を育て、村に住む', desc: '食べ物を蓄え、人口を増やす。', real: '農耕から、村・都市・国・文字が生まれた。',
          apply: (L) => { L.flags.farm = 1; bump(L, { adapt: 5 }); } },
        { label: '狩りと採集を続ける', desc: '季節とともに移り住む。', real: '狩猟採集の暮らしは、今も一部の地域に残っている。',
          apply: (L) => { bump(L, { speed: 5 }); } },
      ],
    },
    {
      id: 'machine', from: ago(1760), to: ago(1830), when: (L) => L.plan === 'human',
      q: '石炭で動く機械が生まれた。その力を使う？',
      ctx: '産業革命。人と家畜の力を、機械が超えはじめる。',
      opts: [
        { label: '機械と化石燃料の力を使う', desc: 'ものを大量につくり、遠くへ速く運ぶ。', real: '人口は約10億人から80億人を超えるまで増えた。地球の気候も変わり始めた。',
          apply: (L) => { L.flags.industry = 1; bump(L, { adapt: 5 }); } },
        { label: '使わずに暮らす', desc: '自然の力と手仕事で生きる。', real: '',
          apply: (L) => { bump(L, { adapt: -5 }); } },
      ],
    },
    {
      id: 'ai', from: ago(2016), to: ago(2024), when: (L) => L.plan === 'human',
      q: 'AIが、急速に賢くなっていく。人類はどう向き合う？',
      ctx: `地球の24時間で言えば、24:00のわずか${E.fmtSec(ago(2016) / S * E.DAY)}前。ほんの一瞬の出来事だ。`,
      opts: [
        { label: 'AIと一緒に、新しいことに挑む', desc: '調べる・書く・つくるを、AIと分担する。', real: '',
          apply: (L) => { L.flags.ai = 'together'; bump(L, { brain: 5 }); } },
        { label: 'AIに多くを任せる', desc: '仕事や判断の多くをAIに預ける。', real: '',
          apply: (L) => { L.flags.ai = 'delegate'; } },
        { label: '慎重に、ルールをつくりながら進む', desc: '安全や公平さを確かめながら使う。', real: '',
          apply: (L) => { L.flags.ai = 'careful'; bump(L, { adapt: 5 }); } },
      ],
    },
  ];
  const AGES = [
    [4.85e8, 4.46e8, 'オルドビス紀', '海の生き物の種類が爆発的に増えている。'],
    [4.4e8, 4.2e8, 'シルル紀', '植物が陸に広がり、海ではあごを持つ魚が増えている。'],
    [4.15e8, 3.75e8, 'デボン紀', '「魚の時代」。陸には最初の森ができはじめた。'],
    [3.55e8, 3.1e8, '石炭紀', '巨大なシダの森。空気中の酸素がとても濃い。'],
    [2.95e8, 2.62e8, 'ペルム紀', '大陸がひとつにまとまり、内陸は乾いている。'],
    [2.48e8, 2.05e8, '三畳紀', '大量絶滅のあとの、空いた世界。'],
    [1.98e8, 1.5e8, 'ジュラ紀', 'パンゲアが分かれ、温暖な海が広がる。'],
    [1.45e8, 1.0e8, '白亜紀の前半', '花を咲かせる植物が現れ、森の姿が変わりはじめた。'],
    [1.0e8, 6.7e7, '白亜紀の後半', '恐竜の時代の絶頂。海面は高く、地球は暖かい。'],
    [6.4e7, 3.5e7, '古第三紀', '恐竜のいない世界。哺乳類と鳥が広がっていく。'],
    [3.3e7, 1.0e7, '新第三紀', '地球が寒く乾いていき、草原が広がる。'],
    [2.5e6, 5e5, '氷河時代', '氷期と間氷期がくり返す。'],
  ];
  // 時代ごとの「どう生きる？」。効き目は4種類（大きく／小さく何でも食べる／広がる／守り）で、言葉と史実だけを時代と暮らす場所（海・陸・空）で変える
  //   並びは効き目の順。tools/sim/ages.js は並びの番号で選ぶ
  const AGE_DESC = ['強くなるが、たくさん食べ、環境の急な変化に弱くなる。', '目立たないが、どんな時代でも生き延びやすい。', '仲間を増やし、さまざまな環境に分かれていく。', '体を守る力が上がる。そのぶん動きは少し遅くなる。'];
  const AGE_BASE = [                                              // [特徴の増減, 種の数の倍率]
    [{ size: 15, armor: 5, adapt: -5 }, 1],
    [{ size: -15, adapt: 15 }, 1],
    [{ adapt: 8, speed: 5 }, 1.3],
    [{ armor: 15, speed: -5 }, 1],
  ];
  // 時代ごとの効き目の違い（史実にもとづく）：{ 効き目の番号: [増減を上書き, 種の数の倍率, その時代の説明] }
  const AGE_MOD = [
    { 2: [{ adapt: 14, speed: 5 }, 1.8, '生まれたばかりの礁が、新しいすみかを次々に生んでいる。広がると種がぐんと増え、大量絶滅にも強くなる。'] },
    { 3: [{ armor: 25, adapt: 8, speed: -5 }, 1, '捕食者のあごが強くなる時代。分厚い守りがよく効く。'] },
    { 0: [{ size: 15, armor: 5, adapt: -8 }, 1, 'デボン紀の終わりには、海の酸素が減って大きな魚ほど苦しんだ。大きくなると、大量絶滅で不利。'],
      2: [{ adapt: 20, speed: 5 }, 1.3, '海が苦しくなっても、川や湖へ逃げた仲間は生き延びた。広がると大量絶滅にとても強くなる。'] },
    { 0: [{ size: 15, armor: 5, adapt: 15 }, 1.2, '石炭紀の空気は酸素が濃く、大きな体でも息が続く。この時代は、大きくなるほうがむしろ有利。'] },
    { 0: [{ size: 15, armor: 5, adapt: -8 }, 1, 'このあと史上最大の絶滅が来る。大きな体ほど生き残れなかった。'],
      1: [{ size: -15, adapt: 25 }, 1, '史上最大の絶滅を生き延びたのは、小さく何でも食べ、穴にもぐる仲間だった。'] },
    { 2: [{ adapt: 15, speed: 5 }, 2.0, '大絶滅のあとの空いた世界。広がれば、種が一気に増える。'] },
    { 0: [{ size: 15, armor: 15, adapt: 12 }, 1, '巨大な体そのものが、肉食恐竜から身を守る鎧になった時代。大きくなるほうが有利。'] },
    { 3: [{ armor: 25, adapt: 10, speed: -5 }, 1, '大きな肉食恐竜が増え、鎧や角を持つ仲間が栄えた。守りがよく効く。'] },
    { 0: [{ size: 15, armor: 5, adapt: -8 }, 1, 'このあと隕石が落ちる。大きな体は不利になる。'],
      1: [{ size: -15, adapt: 25 }, 1, '隕石のあとを生き延びたのは、小さく何でも食べる仲間だった。'] },
    { 2: [{ adapt: 18, speed: 5 }, 2.0, '恐竜が消えた世界。広がれば、新しい仲間が次々に生まれる。'] },
    { 3: [{ armor: 15, adapt: 10, speed: 0 }, 1, '草原では、群れで暮らせば足を遅くせずに身を守れる。守りがよく効く。'] },
    { 0: [{ size: 15, armor: 5, adapt: 15 }, 1, '寒い時代は、大きな体ほど熱を逃がしにくい。大きくなっても不利がない。'] },
  ];
  // 次に来る大量絶滅への備え：{ 効き目の番号: [淘汰の名前, 減る確率の倍率] }。applyExtinction で一度だけ効く
  const AGE_PREP = [
    { 2: ['オルドビス紀末の大量絶滅', 0.4] },
    { 3: ['デボン紀後期の大量絶滅', 0.5] },
    { 2: ['デボン紀後期の大量絶滅', 0.35], 0: ['デボン紀後期の大量絶滅', 1.2] },
    { 3: ['石炭紀の熱帯雨林の崩壊', 0.5] },
    { 1: ['ペルム紀末の大量絶滅', 0.6], 0: ['ペルム紀末の大量絶滅', 1.2] },
    { 2: ['三畳紀末の大量絶滅', 0.45] },
    {},
    {},
    { 1: ['白亜紀末の大量絶滅', 0.5], 0: ['白亜紀末の大量絶滅', 1.2] },
    { 2: ['始新世末の寒冷化', 0.4] },
    { 3: ['氷河時代のはじまり', 0.4] },
    {},
  ];
  // 時代の分かれ道でなれる、その仲間の中での新しい姿（行き止まりだった体のつくりにも進化がある）
  //   { 変種, 体のつくり, 効き目の番号, 現れた〜消えた（何年前、0は今も）, need: その場所にいるときだけ, hab: なると暮らす場所が変わる }
  const SUBS = [
    { v: 'coela', plan: 'fish', k: 0, from: 4.1e8, to: 0 },
    { v: 'eelfish', plan: 'fish', k: 1, from: 1e8, to: 0 },
    { v: 'deepsea', plan: 'fish', k: 2, from: 1.2e8, to: 0 },
    { v: 'puffer', plan: 'fish', k: 3, from: 5e7, to: 0 },
    { v: 'megalodon', plan: 'shark', k: 0, from: 2.3e7, to: 3.6e6 },
    { v: 'ray', plan: 'shark', k: 2, from: 1.5e8, to: 0 },
    { v: 'ant', plan: 'insect', k: 1, from: 1.2e8, to: 0 },
    { v: 'butterfly', plan: 'insect', k: 2, from: 1.3e8, to: 0 },
    { v: 'beetle', plan: 'insect', k: 3, from: 2.9e8, to: 0 },
    { v: 'terror', plan: 'bird', k: 0, from: 6e7, to: 2.6e6, hab: 'land' },        // 氷河時代のはじまりまでに絶滅
    { v: 'songbird', plan: 'bird', k: 1, from: 5e7, to: 0 },
    { v: 'penguin', plan: 'bird', k: 2, from: 6e7, to: 0, hab: 'sea' },
    { v: 'mouse', plan: 'mammal', k: 1, from: 5.5e7, to: 0 },
    { v: 'bat', plan: 'mammal', k: 2, from: 5.5e7, to: 0, hab: 'air' },
    { v: 'hedgehog', plan: 'mammal', k: 3, from: 5e7, to: 0 },
    { v: 'elephant', plan: 'mammal_large', k: 0, from: 4.5e7, to: 0 },
    { v: 'rhino', plan: 'mammal_large', k: 3, from: 4e7, to: 0 },
    { v: 'croc', plan: 'reptile', k: 0, from: 2e8, to: 0 },
    { v: 'snake', plan: 'reptile', k: 2, from: 1e8, to: 0 },
    { v: 'turtle', plan: 'reptile', k: 3, from: 2.2e8, to: 0 },
    { v: 'mosasaur', plan: 'marine_reptile', k: 0, from: 9.8e7, to: 6.6e7 },
    { v: 'horned', plan: 'dino_small', k: 3, from: 1e8, to: 6.6e7 },
    { v: 'eurypterid', plan: 'arthropod', k: 0, from: 4.6e8, to: 2.52e8, need: 'sea' },
    { v: 'crab', plan: 'arthropod', k: 2, from: 2e8, to: 0, need: 'sea' },
    { v: 'spider', plan: 'arthropod', k: 1, from: 3.9e8, to: 0, need: 'land' },
    { v: 'scorpion', plan: 'arthropod', k: 3, from: 4.3e8, to: 0, need: 'land' },
    { v: 'frog', plan: 'amphibian', k: 1, from: 2e8, to: 0 },
    { v: 'grass', plan: 'flower', k: -1, from: 3e7, to: 0 },       // 時代の分かれ道ではなく grassPlant でなる
  ];
  // その仲間の中での姿の変化は、同じ体のつくりのあいだに1回だけ（ペンギンが飛べない大きな鳥に戻る、のような横すべりをしない）
  const hasSub = (L) => SUBS.some((s) => s.v === L.flags.sub && s.plan === L.plan);
  const subFor = (L, k, from, to) => !hasSub(L) && SUBS.find((s) => s.plan === L.plan && s.k === k && s.from > to && s.to < from && (!s.need || s.need === L.habitat));
  // 時代ごとの効き目のうち、海だけ・陸だけの話（石炭紀の濃い酸素は陸と空、デボン紀の海の酸素不足は海、など）
  const AGE_MOD_G = { '0:2': 'sea', '1:3': 'sea', '2:0': 'sea', '2:2': 'sea', '3:0': 'land air', '6:0': 'land', '7:3': 'land', '10:3': 'land' };
  const modFor = (i, k, g) => { const m = AGE_MOD[i] && AGE_MOD[i][k], only = AGE_MOD_G[`${i}:${k}`]; return m && (!only || only.split(' ').includes(g)) ? m : null; };
  const ageFx = (i, k, g) => {
    const [d, n] = modFor(i, k, g) || AGE_BASE[k];
    const prep = AGE_PREP[i][k], [from, to] = AGES[i];
    return (L) => {
      bump(L, d); if (n !== 1) L.N = Math.min(CAP, L.N * n); if (prep) L.flags.prep = { ev: prep[0], m: prep[1] };
      const sub = subFor(L, k, from, to);
      if (sub) { L.flags.sub = sub.v; if (sub.hab) L.habitat = sub.hab; }
    };
  };
  const AGE_GENERIC = ['体を大きくする', '小さく、何でも食べる', '新しい場所に広がる', '守りを固める'];      // 文がない組み合わせ（と古い記録）
  // [ラベル, 実際には…]。AGES と同じ並び
  const AGE_TEXT = [
    { sea: [['巨大なオウムガイのように大きくなる', 'オルドビス紀の海には、殻の長さが数メートルにもなるオウムガイの仲間がいた。'], ['海底で小さく、何でも食べる', 'オルドビス紀には、海の生き物の種類が一気に何倍にも増えた。'], ['生まれたばかりのサンゴ礁に広がる', 'この時代、サンゴやコケムシがつくる礁が広がりはじめた。'], ['三葉虫のように丸まって身を守る', '体を丸めて身を守った三葉虫の化石が、たくさん見つかっている。']],
      land: [['湿った岸辺で体を大きくする', 'オルドビス紀の陸には、コケのような小さな植物しかなかった。'], ['岩かげで小さく、何でも食べる', 'この頃の陸の動物の手がかりは、地層に残るわずかな足あとだけだ。'], ['水辺づたいに陸を広がる', 'オルドビス紀に、植物が陸に上がりはじめた。'], ['乾きに耐える硬い殻をまとう', '陸で生きるには、体から水が逃げないことが大事だった。']] },
    { sea: [['ウミサソリのように大きくなる', 'シルル紀の海には、体長1メートルを超えるウミサソリの仲間がいた。'], ['サンゴ礁のすき間で何でも食べる', 'シルル紀は海が暖かく、大きなサンゴ礁が広がった。'], ['暖かい浅い海に広がる', '氷河時代が終わり、海面が上がって浅い海が広がった。'], ['頭を骨の板で守る', 'あごのない魚の多くは、頭を骨の板で守っていた。']],
      land: [['湿地の植物のあいだで大きくなる', 'シルル紀に、茎で水を運ぶ植物（クックソニア）が現れた。'], ['落ち葉の下で小さく、何でも食べる', 'シルル紀の地層から、陸のヤスデの仲間の化石が見つかっている。'], ['植物の生える水辺へ移り住む', '陸の植物は、まだ水辺から離れられなかった。'], ['体の節を硬くして乾きに耐える', '節足動物の硬い外骨格は、陸の乾燥にも役立った。']] },
    { sea: [['巨大な捕食魚と張り合う大きな体', 'デボン紀の海には、体長数メートルのダンクルオステウスがいた。'], ['小魚にまぎれて何でも食べる', 'デボン紀は「魚の時代」と呼ばれ、あらゆる形の魚が現れた。'], ['川をさかのぼり、淡水に広がる', 'デボン紀には、海から川や湖へ進出した魚が増えた。'], ['頭と胸を骨の鎧で守る', '板皮類は、頭と胸を厚い骨の板で守っていた。']],
      land: [['最初の森で大きくなる', 'デボン紀の終わりに、高さ10メートルを超える木の森が現れた。'], ['森の地面で小さく、何でも食べる', 'デボン紀の土の中には、ダニやトビムシの仲間がいた。'], ['森の広がりとともに陸に広がる', 'デボン紀に、地球で最初の森が生まれた。'], ['硬い体と毒で身を守る', 'クモやサソリの仲間は、この頃にはもう陸にいた。']] },
    { sea: [['サメの仲間のように大きくなる', '石炭紀は、さまざまな形のサメが栄えた「サメの黄金時代」だった。'], ['ウミユリの林で何でも食べる', '石炭紀の浅い海には、ウミユリが林のように広がっていた。'], ['河口の湿地へ広がる', '石炭紀の海辺には、広い湿地と川の河口があった。'], ['とげで身を守る', 'とげのある殻を持つ腕足類（貝に似た生き物）が、海底にあふれていた。']],
      land: [['酸素の濃い空気で大きくなる', '石炭紀の空気は酸素が今より多く、体長2メートルを超えるヤスデの仲間（アースロプレウラ）がいた。'], ['石炭の森の落ち葉で何でも食べる', '石炭紀の森の木が積もって、今の石炭になった。'], ['湿った森のすみずみに広がる', '石炭紀の陸は、シダや巨大なトクサの湿った森におおわれていた。'], ['うろこをまとい、乾きから身を守る', 'うろこと殻のある卵で、は虫類の祖先は水辺から離れられるようになった。']],
      air: [['巨大トンボのように大きくなる', '石炭紀の終わりには、羽を広げると約70センチの巨大トンボ（メガネウラ）がいた。'], ['小さな羽虫として何でも食べる', '石炭紀に、空を飛ぶ最初の動物として昆虫が現れた。'], ['森の上の空に広がる', '空にはまだ、虫を食べる鳥もコウモリもいなかった。'], ['硬い体で身を守る', '昆虫の硬い外骨格は、飛ぶ体を守る鎧にもなった。']] },
    { sea: [['大きな体で海の頂点に立つ', 'ペルム紀の海には、渦巻きのような歯の列を持つ魚（ヘリコプリオン）がいた。'], ['礁のかげで何でも食べる', 'ペルム紀の海には、海綿や藻がつくる大きな礁があった。'], ['超大陸のまわりの海に広がる', 'ペルム紀には、陸がひとつの超大陸パンゲアにまとまっていた。'], ['アンモナイトのように硬く身を守る', 'アンモナイトの仲間も、殻で身を守りながら栄えた。']],
      land: [['帆のある背中で大きくなる', 'ペルム紀の陸の主役は、ディメトロドンなどの単弓類だった。'], ['乾いた大地で小さく、何でも食べる', '超大陸の内側は、海から遠く乾いた土地だった。'], ['超大陸のあちこちに広がる', '陸がつながっていたので、生き物は大陸じゅうを歩いて広がれた。'], ['厚い皮ふとうろこで身を守る', '乾いた土地では、体の水分を逃がさないことが大事になった。']],
      air: [['大きな羽で空を行く', 'ペルム紀にも、大きなトンボの仲間が飛んでいた。'], ['小さな甲虫として何でも食べる', 'ペルム紀に、最初の甲虫が現れた。'], ['乾いた空を遠くまで渡る', '超大陸の空は、内陸に行くほど乾いていた。'], ['硬い前羽で体を守る', '甲虫は、前の羽を硬い殻に変えて体を守った。']] },
    { sea: [['魚竜のように大きくなる', '三畳紀の海には、体長15メートルを超える魚竜がいた。'], ['大絶滅のあとの海で何でも食べる', '史上最大の絶滅のあと、海の生き物はゆっくりと回復していった。'], ['がらんとした海に広がる', 'ライバルが消えた海では、生き残った仲間が一気に広がった。'], ['カメのような甲らをまとう', '板歯類は、カメのような甲らを持つ海のは虫類だった。']],
      land: [['恐竜と張り合う大きな体', '三畳紀の終わりには、首の長い植物食の恐竜が大きくなりはじめた。'], ['岩かげで小さく、虫を食べる', '三畳紀に、最初の哺乳類の仲間が小さな姿で現れた。'], ['パンゲアの砂漠を越えて広がる', '三畳紀の超大陸の内側には、広い砂漠があった。'], ['背中に骨の板とトゲをまとう', 'アエトサウルスの仲間は、背中を骨の板とトゲで守っていた。']],
      air: [['翼竜のように翼を大きくする', '三畳紀の終わりに、翼竜が空を飛びはじめた。'], ['小さな体で虫を追う', '最初の翼竜は、虫を食べる小さな生き物だったと考えられている。'], ['海辺から内陸の空へ広がる', ''], ['丈夫な翼の膜で身を守る', '翼竜の翼は、細い繊維で補強された丈夫な膜だった。']] },
    { sea: [['首長竜のように大きくなる', 'ジュラ紀の海には、首の長いプレシオサウルスの仲間がいた。'], ['アンモナイトの海で何でも食べる', 'ジュラ紀の海は、アンモナイトであふれていた。'], ['大陸のあいだの浅い海に広がる', 'パンゲアが分かれて、大陸のあいだに暖かい浅い海が広がった。'], ['アンモナイトのように殻で守る', 'アンモナイトは、巻いた殻で身を守りながら泳いだ。']],
      land: [['首の長い恐竜のように巨大になる', 'ジュラ紀には、体長20メートルを超える首の長い恐竜がいた。'], ['恐竜の足もとで小さく、何でも食べる', '恐竜の時代の哺乳類の多くは、ネズミほどの大きさだった。'], ['分かれていく大陸に広がる', 'ジュラ紀に、超大陸パンゲアが南北に分かれはじめた。'], ['背中の板とトゲの尾で身を守る', 'ステゴサウルスは、背中の板とトゲのある尾で身を守った。']],
      air: [['大きな翼で海の上を飛ぶ', '翼竜の多くは、海の上を飛んで魚をとっていた。'], ['小さく軽い体で虫をとる', 'ジュラ紀の終わりに、始祖鳥が現れた。'], ['島から島へ飛んで広がる', '始祖鳥の化石は、島が点々と浮かぶ礁湖の地層から見つかった。'], ['木の上に身をひそめる', '']] },
    { sea: [['海のは虫類として大きくなる', '白亜紀の海には、大きな首長竜やワニの仲間がいた。'], ['増えた小魚を何でも食べる', '白亜紀には、今の魚につながる硬骨魚が大きく増えた。'], ['広がる大西洋へ進む', '白亜紀に、大西洋が広がっていった。'], ['厚い殻の二枚貝のように守る', '白亜紀の海底には、長さ1メートルを超える二枚貝がいた。']],
      land: [['イグアノドンのように大きくなる', 'イグアノドンは、白亜紀の前半に栄えた植物食の恐竜だった。'], ['花に集まる虫を食べる', '白亜紀に、花を咲かせる植物が現れた。'], ['羽毛恐竜の広がる大地へ進む', '中国・遼寧省から、羽毛を持つ恐竜の化石がたくさん見つかっている。'], ['骨の鎧で体じゅうを守る', 'アンキロサウルスの仲間は、骨の板で体じゅうを守っていた。']],
      air: [['大きな翼の翼竜になる', '白亜紀の翼竜には、翼を広げると6メートルを超えるものもいた。'], ['小さな鳥として虫を食べる', '白亜紀の前半に、鳥の仲間は多くの種類に分かれた。'], ['花の咲く森の空に広がる', ''], ['木の上の巣で卵を守る', '']] },
    { sea: [['モササウルスのように大きくなる', '白亜紀後半の海の王者は、体長10メートルを超えるモササウルスだった。'], ['内海の浅瀬で何でも食べる', '北アメリカの真ん中には、大きな内海が広がっていた。'], ['暖かい海の端まで広がる', '白亜紀後半は海面が高く、今の陸の多くが海の底だった。'], ['巻き貝のように硬く身を守る', 'アンモナイトは、白亜紀の最後まで海で栄えた。']],
      land: [['ティラノサウルスのように大きくなる', 'ティラノサウルスは、白亜紀の最後に現れた最大級の肉食恐竜だった。'], ['夜の森で小さく、何でも食べる', '恐竜の時代の哺乳類の多くは、夜に動いていたと考えられている。'], ['花の森とともに広がる', '白亜紀後半には、花を咲かせる植物が森の主役になっていった。'], ['角とえりかざりで身を守る', 'トリケラトプスは、3本の角と大きなえりかざりを持っていた。']],
      air: [['巨大な翼竜になる', 'ケツァルコアトルスは、翼を広げると約10メートルもあった。'], ['小さな鳥として何でも食べる', '隕石を生き延びたのは、地上で暮らす小さな鳥の仲間だったと考えられている。'], ['海を渡って広がる', ''], ['素早い身のこなしで身を守る', '']] },
    { sea: [['クジラのように大きくなる', '古第三紀に、陸の哺乳類が海へ戻ってクジラになった。'], ['空いた海で何でも食べる', '大きな海のは虫類が消えた海で、魚やサメが新しい場所を得た。'], ['南極をめぐる冷たい海に広がる', '古第三紀の終わりに、南極のまわりを回る冷たい海流ができた。'], ['カニの仲間のように硬く身を守る', '']],
      land: [['恐竜のいない大地で大きくなる', '恐竜が消えたあと、哺乳類はわずか数百万年で大型化した。'], ['小さいまま、何でも食べる', ''], ['世界中の暖かい森に広がる', '古第三紀のはじめは、北極の近くまで森が広がるほど暖かかった。'], ['硬いよろいで身を守る', 'アルマジロの仲間は、骨の甲らで身を守る。']],
      air: [['飛べない大きな鳥になる', '古第三紀には、背の高さ2メートル近い飛べない鳥（ガストルニス）がいた。'], ['小鳥として虫を食べる', ''], ['新しい森の空に広がる', '恐竜が消えたあと、鳥は今いる多くの仲間に分かれていった。'], ['群れで飛んで身を守る', '']] },
    { sea: [['メガロドンのように大きくなる', '新第三紀の海には、体長15メートルほどのサメ（メガロドン）がいた。'], ['冷たい海のプランクトンを食べる', ''], ['海藻の森に広がる', '冷えていく海に、大きな海藻の森が広がった。'], ['ウニのようにとげで身を守る', '']],
      land: [['草原で大きな体になる', '草原が広がると、ウマやゾウの仲間が大きくなった。'], ['草の種を食べる小さな体', ''], ['草原の向こうへ広がる', '新第三紀に、地球が乾いて草原が広がった。'], ['群れをつくって身を守る', 'ヌーやシマウマは、群れで暮らして身を守る。']],
      air: [['大きな翼で上昇気流に乗る', 'アルゼンタヴィスは、翼を広げると6メートルほどもある巨大な鳥だった。'], ['草原の種や虫を食べる小さな体', ''], ['季節ごとに遠くへ渡る', ''], ['とげのある茂みに巣をつくる', '']] },
    { sea: [['セイウチのように大きくなる', ''], ['氷の下で何でも食べる', ''], ['冷たい海に広がる', ''], ['冷たい海に耐える体で身を守る', 'アザラシやクジラは、厚い脂肪で冷たい海に耐える。']],
      land: [['マンモスのように大きくなる', 'マンモスは、長い毛と厚い脂肪で氷河時代を生きた。'], ['ツンドラで小さく、何でも食べる', ''], ['凍った海の上を、次の大陸へ渡る', '氷期には海面が下がり、アジアとアメリカが陸でつながった。'], ['寒さに負けない体で身を守る', 'ケブカサイも、長い毛で寒さに耐えた。']],
      air: [['大きなワシのようになる', ''], ['冬の木の実を食べる小さな体', ''], ['氷期と間氷期にあわせて渡る', ''], ['体をふくらませて寒さに耐える', '']] },
  ];
  const AGE_GROUPS = ['sea', 'land', 'air'];
  const ageGroup = (L) => (L.habitat === 'air' ? 'air' : L.habitat === 'land' ? 'land' : 'sea');
  // その時代の説明のうち、海・陸・空で違うもの（石炭紀の「巨大なシダの森」は海の生き物には関係ない、など）
  const AGE_CTX_G = {
    0: { land: 'オルドビス紀の陸。まだコケのような小さな植物しかない。' },
    3: { sea: '石炭紀の海。サメの仲間がいろいろな形に分かれ、浅い海にはウミユリの林が広がる。' },
    4: { sea: '超大陸パンゲアを囲む、ひとつの大きな海。' },
    7: { sea: '暖かい海に、今の魚につながる仲間が増えはじめた。' },
    9: { sea: '首長竜やモササウルスが消えた海。魚やサメ、クジラの祖先が広がっていく。' },
    10: { sea: '海が冷えていき、海藻の森や大きなサメが広がる。' },
  };
  // 「〜のように」がその生き物自身を指すもの（サメに「サメのように」）と、
  // 持てない体の特徴を言うもの（サメに「とげ」、魚に「殻」）は出さず、かわりにふつうの言葉の選択肢を出す
  const KIN = [
    [/サメ|メガロドン/, (L) => L.plan === 'shark'], [/魚竜|首長竜|モササウルス/, (L) => L.plan === 'marine_reptile'],
    [/クジラ/, (L) => L.plan === 'whale'], [/ティラノサウルス/, (L) => L.plan === 'theropod'], [/首の長い恐竜/, (L) => L.plan === 'sauropod'],
    [/恐竜と張り合う|恐竜の足もと|イグアノドン/, (L) => ['dino_small', 'sauropod', 'theropod'].includes(L.plan)], [/マンモス/, (L) => L.plan === 'mammal_large'],
    [/トンボ/, (L) => L.plan === 'insect'], [/翼竜のように/, (L) => L.plan === 'pterosaur'], [/ウミサソリ/, (L) => subIs(L, 'eurypterid')],
    [/三葉虫/, (L) => !!L.flags.trilobite], [/カニ/, (L) => subIs(L, 'crab')], [/カメ/, (L) => subIs(L, 'turtle')], [/セイウチ/, (L) => L.plan === 'whale'],
  ];
  const BODY = [
    [/とげで|トゲ/, ['shark', 'whale', 'marine_reptile', 'bird', 'pterosaur', 'jawless', 'sponge', 'soft', 'mammal_large', 'primate']],
    [/殻|甲ら/, ['sponge', 'ediacaran', 'fish', 'shark', 'whale', 'marine_reptile', 'jawless', 'anomalo', 'bird', 'pterosaur', 'mammal', 'mammal_large', 'primate', 'amphibian', 'dino_small', 'sauropod', 'theropod', 'synapsid', 'armorfish']],
    [/丸まって/, ['fish', 'shark', 'jawless', 'anomalo', 'whale', 'marine_reptile', 'sponge', 'armorfish']],
    [/骨の|よろい|鎧/, ['soft', 'sponge', 'arthropod', 'insect', 'shark', 'anomalo', 'ediacaran']],
    [/うろこ/, ['soft', 'sponge', 'arthropod', 'insect', 'mammal', 'mammal_large', 'primate', 'bird', 'whale', 'amphibian']],
    [/硬く身を守る/, ['whale', 'soft', 'sponge']], [/巣/, ['mammal']],
  ];
  // その仲間にしか言えない言葉（昆虫に「小さな鳥として」、鳥に「翼竜になる」、魚に「海のは虫類として」は出さない）
  const ONLY = [
    [/鳥として|鳥になる/, ['bird']], [/翼竜になる/, ['pterosaur']], [/海のは虫類として/, ['marine_reptile']], [/帆のある背中/, ['synapsid']],
    [/体の節/, ['arthropod', 'insect']], [/背中の板とトゲの尾|えりかざり/, ['dino_small']], [/骨の鎧で体じゅう/, ['dino_small', 'reptile']],
    [/羽虫として|甲虫として|硬い前羽/, ['insect']], [/翼の膜/, ['pterosaur', 'insect', 'mammal']],
  ];
  const fitsAge = (L, label) => !KIN.some(([w, me]) => w.test(label) && me(L)) && !BODY.some(([w, no]) => w.test(label) && no.includes(L.plan)) && !ONLY.some(([w, ok]) => w.test(label) && !ok.includes(L.plan));
  AGES.forEach(([from, to, age, ctx], i) => AGE_GROUPS.forEach((g) => {
    const tx = AGE_TEXT[i][g];
    const opts = AGE_BASE.map((_, k) => {
      const m = modFor(i, k, g), label = tx ? tx[k][0] : AGE_GENERIC[k];
      return { k, mod: !!m, label, desc: m ? m[2] : AGE_DESC[k], real: tx ? tx[k][1] : '', apply: ageFx(i, k, g), only: (L) => fitsAge(L, label) };
    });
    // 合わないときの、ふつうの言葉の選択肢（効き目は同じ。並びの最後に足すので、英語や ages.js の番号はそのまま）
    // alt の「実際には」は出さない（元の選択肢の話なので）
    opts.slice().forEach((o) => { if (tx) opts.push({ ...o, alt: true, label: AGE_GENERIC[o.k], real: '', only: (L) => !fitsAge(L, o.label) }); });
    NODES.push({
      id: `age${i}-${g}`, from, to,
      when: (L) => !MICRO.has(L.plan) && !PLANTS.has(L.plan) && L.plan !== 'human' && ageGroup(L) === g && !AGE_GROUPS.some((x) => L.taken.has(`age${i}-${x}`)),
      q: `${age}を、どう生きる？`, ctx: (AGE_CTX_G[i] && AGE_CTX_G[i][g]) || ctx,
      opts,
    });
  }));

  /* ---------------- 淘汰（大きな環境の変化） ----------------
     kill(L): 系統の中の各種が消える確率。1 は、その仲間が実際にすべて消えたことを表す */
  const sea = (L) => L.habitat === 'sea' || L.habitat === 'shallow';
  const EXTINCTIONS = [
    { ya: 2.4e9, fx: 'oxygen', name: '大酸化イベント', fact: '大気に酸素がたまりはじめた。酸素を使えない多くの微生物にとって、酸素は毒だった。',
      kill: (L) => (L.flags.o2 ? 0.05 : L.habitat === 'deep' ? 0.4 : 0.99) },
    { ya: 7.17e8, fx: 'ice', name: '全球凍結（スターティアン氷期）', fact: '地球全体が氷に覆われ、数千万年続いたとされる。',
      kill: (L) => (L.flags.ventRefuge || L.habitat === 'deep' ? 0.3 : L.flags.dormant ? 0.4 : L.flags.icewater ? 0.6 : 0.8) },
    { ya: 6.5e8, fx: 'ice', name: '2度目の全球凍結（マリノア氷期）', fact: 'ふたたび地球が凍りついた。',
      kill: (L) => (L.flags.ventRefuge || L.habitat === 'deep' ? 0.3 : L.flags.dormant ? 0.4 : 0.7) },
    { ya: 5.39e8, name: 'エディアカラ生物の消滅', fact: 'カンブリア紀が始まると、エディアカラ生物のほとんどが姿を消した。',
      kill: (L) => (L.plan === 'ediacaran' ? 1 : 0.15) },
    { ya: 4.45e8, fx: 'ice', name: 'オルドビス紀末の大量絶滅', fact: '氷河時代の到来で海が冷え、海の種の約85%が消えた。',
      kill: (L) => (sea(L) ? 0.8 : 0.3) },
    { ya: 3.72e8, name: 'デボン紀後期の大量絶滅', fact: '海の酸素不足などが続き、浅い海の生き物を中心に多くの種が消えた。',
      kill: (L) => (L.plan === 'armorfish' ? 0.9 : sea(L) ? 0.65 : 0.3) },
    { ya: 3.59e8, name: 'デボン紀末の絶滅（ハンゲンベルク事変）', fact: '鎧をまとった魚、板皮類はこのときすべて姿を消した。',
      kill: (L) => (L.plan === 'armorfish' ? 1 : sea(L) ? 0.4 : 0.2) },
    { ya: 3.05e8, name: '石炭紀の熱帯雨林の崩壊', fact: '気候が乾き、湿った森が縮んだ。水辺に頼る両生類が大きく減り、は虫類が広がった。',
      kill: (L) => (L.plan === 'amphibian' ? 0.7 : L.habitat === 'land' ? 0.2 : 0.05) },
    { ya: 2.519e8, fx: 'eruption', name: 'ペルム紀末の大量絶滅', fact: 'シベリアの大噴火で海は熱く酸素不足に。海の種の8割以上が消えた史上最大の絶滅。三葉虫とウミサソリもここで姿を消した。',
      kill: (L) => (L.flags.trilobite || subIs(L, 'eurypterid') ? 1 : L.flags.burrow ? 0.55 : sea(L) ? 0.88 : MICRO.has(L.plan) ? 0.3 : 0.75) },
    { ya: 2.014e8, fx: 'eruption', name: '三畳紀末の大量絶滅', fact: '大西洋ができはじめたころの大噴火。多くのは虫類や単弓類が消え、恐竜の天下が始まった。',
      kill: (L) => (L.plan === 'synapsid' ? 0.95 : ['dino_small', 'sauropod', 'theropod', 'pterosaur'].includes(L.plan) ? 0.35 : L.plan === 'reptile' ? 0.6 : L.plan === 'mammal' ? 0.4 : sea(L) ? 0.55 : 0.4) },
    { ya: 6.6e7, fx: 'impact', name: '白亜紀末の大量絶滅', fact: '直径約10kmの隕石がメキシコに衝突。鳥以外の恐竜、翼竜、首長竜、アンモナイトが消えた。',
      kill: (L) => (['sauropod', 'theropod', 'pterosaur', 'marine_reptile', 'dino_small'].includes(L.plan) ? 1
        : L.plan === 'bird' ? 0.75 : L.traits.size > 55 ? 0.95 : L.flags.burrow ? 0.4 : L.habitat === 'deep' ? 0.3 : sea(L) ? 0.6 : 0.65) },
    { ya: 3.4e7, fx: 'ice', name: '始新世末の寒冷化', fact: '南極に氷床ができ、地球が一気に寒くなった。',
      kill: (L) => (L.flags.warm ? 0.2 : 0.35) },
    { ya: 2.58e6, fx: 'ice', name: '氷河時代のはじまり', fact: '寒い氷期と暖かい間氷期のくり返しが始まった。巨大なサメ（メガロドン）や、南アメリカの飛べない大きな鳥も、この頃までに姿を消した。',
      kill: (L) => (subIs(L, 'megalodon') || subIs(L, 'terror') ? 1 : L.flags.warm ? 0.15 : 0.25) },
    { ya: 1.2e6, name: '頑丈型猿人の消滅', fact: '硬い植物を食べた頑丈型猿人（パラントロプス）は、この頃までに姿を消した。',
      kill: (L) => (L.flags.robust ? 1 : 0) },
    { ya: 4e4, name: 'ほかの人類の消滅', fact: 'ネアンデルタール人など、サピエンス以外の人類はこの頃までに姿を消した。交わった人類の遺伝子の一部は、今も私たちの中にある。',
      kill: (L) => (L.plan === 'hominin' ? 1 : 0) },
    { ya: 1.3e4, name: '大型動物の絶滅', fact: '約5万〜1万年前、マンモスなど大型の哺乳類の多くが消えた。気候の変化と人間の狩りが原因とされる。',
      kill: (L) => (L.plan === 'mammal_large' ? 0.75 : L.plan === 'human' ? 0 : 0.03) },
    { ya: ago(1950), name: '人間による環境の変化', fact: '森の伐採、乱獲、温暖化。今、種が消えるペースは、自然な状態の数十〜数百倍とされる。',
      kill: (L) => (L.plan === 'human' ? 0 : L.traits.size > 60 ? 0.3 : 0.1) },
  ];

  /* ---------------- 種の数の増減（背景の絶滅） ---------------- */
  /* ---------------- 見せるための種の数と状態 ----------------
     中の N（0〜CAP）はゲームの釣り合い用。画面では、その仲間の実際の種数の目安に合わせて見せる。
     REAL：その仲間がいちばん栄えたときの種数の目安（今わかっている数や推定。微生物などはおおまか） */
  const REAL = {
    microbe: 100000, cyano: 5000, cell: 50000, colony: 10000, sponge: 9000, ediacaran: 200, soft: 20000,
    arthropod: 20000, anomalo: 50, jawless: 500, fish: 30000, shark: 1200, armorfish: 1000, insect: 1000000,
    amphibian: 8000, reptile: 12000, synapsid: 1000, marine_reptile: 500, pterosaur: 200, dino_small: 600,
    plant: 20000, fern: 12000, seed: 3000, flower: 300000,
    sauropod: 300, theropod: 600, bird: 11000, mammal: 6500, mammal_large: 2000, whale: 90, primate: 500,
    hominin: 20, human: 1,
  };
  // 上から2けたに丸める（100未満はそのまま）
  const round2 = (x) => { if (x < 100) return Math.round(x); const p = 10 ** (Math.floor(Math.log10(x)) - 1); return Math.round(x / p) * p; };
  function realCount(L, n = L.N) {
    if (!(n > 0)) return 0;
    return Math.max(1, round2((REAL[L.plan] || 1000) * Math.min(n, CAP) / CAP * (L.bloom || 1)));
  }
  function rates(L, ya) {
    const T = L.traits;
    if (L.plan === 'human') return { lam: 0, mu: 0 };
    let lam = 0.26 * (0.5 + T.adapt / 150 + T.speed / 400 + T.brain / 500);
    // 守り：食べられて減るのを防ぐ。捕食者の多い時代（カンブリア紀〜デボン紀の海、恐竜の時代）にはさらに効く
    // 大きさ：ふだんは減る理由にならない（大量絶滅と隕石で不利になる。applyExtinction と EXTINCTIONS）
    const pred = (ya > 3.59e8 && ya < 5.39e8) || (ya > 6.6e7 && ya < 2.3e8) ? 1.6 : 1;
    let mu = 0.22 * (0.82 + T.size / 400 - T.armor * pred / 300 - T.adapt / 300);
    if (MICRO.has(L.plan)) { lam *= 0.15; mu *= 0.12; }
    if (PLANTS.has(L.plan)) mu *= 0.75;                             // 植物は動物より絶えにくい
    if (L.plan === 'anomalo' && ya < 4.4e8) mu *= 3;
    if (L.plan === 'amphibian' && ya < 3.0e8) mu *= 1.4;
    if (L.plan === 'synapsid' && ya < 2.3e8) mu *= 1.8;
    if (L.plan === 'reptile' && L.traits.size > 50 && ya < 2.0e8 && ya > 6.6e7) mu *= 1.3;
    if (L.plan === 'mammal' && L.traits.size > 45 && ya > 6.6e7) mu *= 1.6;
    if (['mammal', 'mammal_large', 'primate', 'whale', 'bird'].includes(L.plan) && ya < 6.6e7 && ya > 5e7) lam *= 1.8;
    if (L.plan === 'hominin') { lam = 0.6; mu = 0.45; }
    return { lam: Math.max(0.01, lam), mu: Math.max(0.005, mu) };
  }
  function poisson(m, rnd) {
    if (m <= 0) return 0;
    if (m > 30) return Math.max(0, Math.round(m + Math.sqrt(m) * gauss(rnd)));
    let L = Math.exp(-m), k = 0, p = 1;
    do { k++; p *= rnd(); } while (p > L);
    return k - 1;
  }
  function gauss(rnd) { return Math.sqrt(-2 * Math.log(rnd() || 1e-9)) * Math.cos(2 * Math.PI * rnd()); }

  // dtY 年ぶん進める（grace: 背景の絶滅を止める）
  // その仲間の栄え方の出来事（化石の記録にもとづく目安）：[何年前, 体のつくり（空白区切り）, 種の数の倍率, 理由]
  //   その時期を通ると、理由つきで種の数が増えたり減ったりする（ふだんのゆらぎとは別）。あなたの系統は L.envLog に残し、画面のタイムラインに出す
  const BOOMS = [
    [2.7e9, 'cyano', 1.3, 'ストロマトライトが浅い海いっぱいに広がった', 'shore'],
    [5.5e8, 'cyano', 0.8, '海底をかじる動物が現れ、ストロマトライトが減りはじめた', 'shore'],
    [8e8, 'colony', 1.2, '藻類が海に広がり、緑の海が増えた', 'photo water'],
    [5.6e8, 'ediacaran', 1.3, 'エディアカラ生物が、海の底いっぱいに広がった'],
    [5.25e8, 'sponge', 1.2, '海綿の仲間が礁をつくり、すみかを広げた'],
    [5.3e8, 'soft', 1.2, 'カンブリア爆発。動物の体の形が一気に増えた'],
    [5.2e8, 'arthropod', 1.4, '三葉虫の仲間が海じゅうに広がった。カンブリア紀は三葉虫の黄金時代', 'water'],
    [4.6e8, 'arthropod', 1.2, 'オルドビス紀の大放散。礁が広がり、すみかが増えた', 'water'],
    [4.2e8, 'arthropod', 0.8, 'あごを持つ魚が増え、海の底で食べられる仲間が増えた', 'water'],
    [3.8e8, 'arthropod', 0.8, '三葉虫の仲間は、少しずつ種類を減らしていった', 'water trilo'],
    [1.8e8, 'arthropod', 1.3, 'カニやエビの仲間が増えはじめた', 'water'],
    [5.1e8, 'anomalo', 0.8, '捕食者どうしの競争が激しくなった'],
    [4.3e8, 'jawless', 0.8, 'あごを持つ魚に押され、あごのない魚は減っていった'],
    [3.9e8, 'armorfish', 1.2, '板皮類が、海の王者として栄えた'],
    [4e8, 'fish', 1.2, 'デボン紀「魚の時代」。海にも川にも魚が広がった'],
    [1e8, 'fish', 1.3, '今の魚につながる仲間（真骨魚）が、一気に種類を増やした'],
    [5e7, 'fish', 1.2, 'サンゴ礁の魚が大きく増えた'],
    [3.4e8, 'shark', 1.3, '石炭紀はサメの黄金時代。いろいろな形のサメが現れた'],
    [1e8, 'shark', 1.15, '今のサメやエイにつながる仲間が増えた'],
    [3.1e8, 'insect', 1.3, '石炭紀の森で、昆虫が大きくなり種類を増やした'],
    [1.2e8, 'insect', 1.4, '花を咲かせる植物が広がり、花に集まる昆虫が一気に増えた'],
    [5e7, 'insect', 1.2, '暖かい森で、アリやチョウの仲間が増えた'],
    [3.3e8, 'amphibian', 1.3, '石炭紀の湿った森は、両生類の楽園だった'],
    [2.9e8, 'amphibian', 0.8, '気候が乾き、水辺に頼る両生類は減った'],
    [2.4e8, 'amphibian', 0.85, 'は虫類との競争で、両生類は脇役になった'],
    [2.9e8, 'reptile', 1.2, '乾いた大地に、殻のある卵を産むは虫類が広がった'],
    [1e8, 'reptile', 1.3, 'トカゲやヘビの仲間が大きく増えた'],
    [2.8e8, 'synapsid', 1.3, 'ペルム紀の陸の主役は、単弓類だった'],
    [2.4e8, 'synapsid', 0.75, '大絶滅のあと、恐竜の祖先たちに押されて減っていった'],
    [2.1e8, 'dino_small sauropod theropod', 1.2, '三畳紀の終わり、恐竜が数を増やしはじめた'],
    [1.6e8, 'dino_small sauropod theropod', 1.3, 'ジュラ紀、恐竜は大陸じゅうに広がった'],
    [8e7, 'dino_small sauropod theropod', 1.2, '白亜紀の終わり、恐竜の種類はいちばん多くなった'],
    [2e8, 'marine_reptile', 1.2, 'ジュラ紀の海で、魚竜や首長竜が栄えた'],
    [9e7, 'marine_reptile', 0.8, '魚竜が姿を消し、海のは虫類の仲間が減った'],
    [1.5e8, 'pterosaur', 1.2, '翼竜が空で栄えた'],
    [1e8, 'pterosaur', 0.8, '鳥が増え、小さな翼竜は姿を消していった'],
    [1.2e8, 'bird', 1.2, '白亜紀、鳥はさまざまな仲間に分かれた'],
    [6e7, 'bird', 1.4, '恐竜が消えた空で、鳥が一気に種類を増やした'],
    [2.5e7, 'bird', 1.2, '小鳥の仲間が世界中に広がった', 'fly'],
    [1.6e8, 'mammal', 1.1, '夜の森で、小さな哺乳類が少しずつ種類を増やした'],
    [6e7, 'mammal', 1.5, '恐竜が消え、哺乳類が一気に種類を増やした'],
    [3e7, 'mammal', 1.2, 'ネズミの仲間が世界中に広がった', '!fly'],
    [5e7, 'mammal_large', 1.3, '暖かい森で、大きな哺乳類が種類を増やした'],
    [1.5e7, 'mammal_large', 1.3, '草原が広がり、草を食べる大きな哺乳類が増えた'],
    [4.5e7, 'whale', 1.3, 'クジラの祖先が海になじみ、種類を増やした'],
    [3e7, 'whale', 1.3, 'ヒゲクジラとハクジラの仲間に分かれた'],
    [5e7, 'primate', 1.3, '暖かい森が広がり、霊長類が増えた'],
    [3.4e7, 'primate', 0.8, '寒冷化で森が減り、霊長類は減った'],
    [2e7, 'primate', 1.2, '類人猿の仲間が栄えた'],
    [8e6, 'primate', 0.8, '森が減り、類人猿は数を減らした'],
    [4.2e8, 'plant', 1.3, '陸の水辺に、緑が広がりはじめた'],
    [3.6e8, 'fern', 1.4, 'シダの大森林が、陸をおおった'],
    [3.05e8, 'fern', 0.8, '気候が乾き、湿ったシダの森が縮んだ'],
    [2.9e8, 'seed', 1.2, '乾いた大地に、種で増える植物が広がった'],
    [1.0e8, 'seed', 0.8, '花を咲かせる植物に押され、種類を減らした'],
    [1.0e8, 'flower', 1.5, '花を咲かせる植物が、世界中に広がった'],
    [2.0e7, 'flower', 1.2, '草原が広がり、草の仲間が増えた'],
  ].map(([ya, plans, m, text, cond]) => ({ ya, plans: plans.split(' '), m, text, cond }));     // cond：その暮らしに合うときだけ（lifeOk）
  function boomTick(L, hi, lo) {
    for (const b of BOOMS) {
      if (b.ya > hi || b.ya <= lo || !b.plans.includes(L.plan) || !lifeOk(L, b.ya, b.cond)) continue;
      const before = realCount(L), target = L.N * b.m;
      // 上限いっぱいで栄えたときは、画面の種の数だけを「栄え具合」で増やす（L.bloom、最大1.6倍。体のつくりが変わると1に戻る）
      if (target > CAP) { L.bloom = Math.min(1.6, (L.bloom || 1) * target / CAP); L.N = CAP; } else L.N = Math.max(1, target);
      const after = realCount(L);
      if (L.isPlayer && after !== before) (L.envLog = L.envLog || []).push({ ya: b.ya, text: b.text, before, after });
    }
  }
  function step(L, ya, dtY, rnd, grace) {
    if (!L.alive || L.plan === 'human') return;
    boomTick(L, ya + dtY / 2, ya - dtY / 2);
    const { lam, mu } = rates(L, ya);
    const dt = dtY / M;
    if (L.N >= 30) {
      const r = (lam - mu) * dt + gauss(rnd) * Math.sqrt(dt) * 0.12;
      L.N = Math.max(25, Math.min(CAP, L.N * Math.exp(r)));
    } else {
      const n = Math.round(L.N);
      const b = poisson(lam * n * dt, rnd), d = grace ? 0 : poisson(mu * n * dt, rnd);
      L.N = Math.min(CAP, Math.max(grace ? 1 : 0, n + b - d));
    }
    L.maxN = Math.max(L.maxN, L.N);
    if (L.N < 1) die(L, ya, '数が減り続け、最後の種が消えた（背景の絶滅）');
  }
  function die(L, ya, cause) {
    L.alive = false; L.N = 0; L.deathYa = ya; L.deathCause = cause;
  }
  // 大量絶滅を当てる。戻り値：{ before, after }
  function applyExtinction(L, ev, rnd) {
    if (!L.alive) return null;
    const before = Math.round(L.N);
    let p = ev.kill(L);
    const prep = L.flags.prep && L.flags.prep.ev === ev.name;
    if (p < 1 && p > 0) {
      p *= 1 + (L.traits.size - 50) / 250;
      p *= 1 - (L.traits.adapt - 50) / 250;
      if (L.flags.prep && L.flags.prep.ev === ev.name) p *= L.flags.prep.m;      // その時代の生き方の備え
      // 同じ系統の種は似た場所・似た暮らし。運命はまとめて振れる
      p += gauss(rnd) * 0.12;
      p = Math.max(0, Math.min(0.999, p));
    }
    let after;
    if (p >= 1) after = 0;
    else if (before > 40) after = Math.max(0, Math.round(before * (1 - p) + gauss(rnd) * Math.sqrt(before * p * (1 - p))));
    else { after = 0; for (let i = 0; i < before; i++) if (rnd() > p) after++; }
    if (L.plan === 'human') after = before;
    if (prep) delete L.flags.prep;
    L.N = after;
    if (after < 1) die(L, ev.ya, ev.name);
    return { before, after, p };
  }

  // ライバルは分かれ道でランダムに選ぶ
  // その系統に出す選択肢（only があれば、その体・暮らしに合うものだけ。コケに「高く育つ」は出さない）
  const optsFor = (node, L) => node.opts.filter((o) => !o.only || o.only(L)).sort((a, b) => (a.k == null || b.k == null ? 0 : a.k - b.k));   // 「どう生きる？」は効き目の順
  function autoChoose(L, node, rnd) {
    const os = optsFor(node, L), o = os[Math.floor(rnd() * os.length)];
    o.apply(L);
    L.taken.add(node.id);
    L.path.push(o.label);
  }
  const nodeFor = (L, ya) => NODES.find((n) => !L.taken.has(n.id) && ya <= n.from && ya > n.to && n.when(L));

  // 振り返りの「もしも」：系統の写しを作り、今日まで（か絶滅まで）一気に進める。分かれ道はランダムに選ぶ
  //   進め方はプレイ（app.js の advance）と同じ。graceAbove：その年前より前で、まだ分かれ道を選んでいなければ背景の絶滅を止める
  const cloneL = (L) => ({ ...L, isPlayer: false, traits: { ...L.traits }, flags: { ...L.flags }, taken: new Set(L.taken), path: [...L.path], log: [], forms: null, envLog: null });
  function runOut(L, ya, rnd, graceAbove = Infinity) {
    const check = () => { let n; while (L.alive && (n = nodeFor(L, ya))) autoChoose(L, n, rnd); };
    let guard = 0;
    check();
    while (ya > 0 && L.alive && guard++ < 20000) {
      const ev = EXTINCTIONS.find((e) => e.ya < ya);
      let b = Math.max(0, ya - Math.max(ya * 0.02, 0.5));
      if (ev) b = Math.max(b, ev.ya);
      for (const n of NODES) if (n.from < ya && n.from > b) b = n.from;
      const span = ya - b, k = Math.max(1, Math.ceil(span / 1e6)), dt = span / k;
      for (let i = 0; i < k && L.alive; i++) step(L, ya - dt * (i + 0.5), dt, rnd, L.path.length === 0 && ya > graceAbove);
      if (!L.alive) break;
      ya = b;
      if (ev && b === ev.ya) applyExtinction(L, ev, rnd);
      check();
    }
    return L;
  }

  // 乱数（種あり：シェアしたときの再現用）
  function rng(seed) {
    let s = seed >>> 0;
    return () => { s = (s + 0x6d2b79f5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }

  /* ---------------- 暮らしの出来事（タイムラインに出る、その生き物の日々） ----------------
     [文章, 特徴の小さな変化] */
  const LIFE = {
    microbe: [
      ['ひだまりの浅瀬で、ゆっくり分裂して数を増やした。', null, 'shore'],
      ['岩のすき間に、仲間とぬるぬるした膜（バイオフィルム）をつくって暮らした。', { armor: 2 }, 'free !ocean'],
      ['海底からわき出す熱い水のそばで、化学物質を食べて生きた。', null, 'deep eater'],
      ['嵐で浅瀬がかき混ぜられ、多くの仲間が流された。', { adapt: 2 }, 'shore'],
      ['近くの微生物と、遺伝子のかけらを交換した。', { adapt: 3 }],
      ['紫外線の強い日。泥の中にもぐって身を守った。', null, 'shore'],
      ['仲間と層になって積み重なり、小さな岩（ストロマトライト）を育てた。', null, 'shore'],
      ['となりの微生物が出したものを、栄養にして生きた。', null, 'eater'],
    ],
    cell: [
      ['体の中のミトコンドリアが、せっせとエネルギーをつくっている。', null],
      ['水の中をただよう細菌を、体で包みこんで食べた。', null, 'eater water'],
      ['分裂して、そっくりな仲間が増えた。', null],
      ['仲間の細胞とくっついて、役割を分けあった。', { size: 2 }],
      ['冷たい海で、動きをゆるめてじっと耐えた。', { adapt: 2 }, 'water'],
      ['太陽の光を浴びて、栄養をたくわえた。', null, 'photo'],
      ['別の細胞と遺伝子を混ぜ合わせ、新しい組み合わせの子が生まれた。', { adapt: 2 }],
      ['水の流れにのって、遠くの海へ運ばれた。', null, 'water free'],
    ],
    soft: [
      ['海底の微生物のマットを、少しずつかじって食べた。', null, 'mobile'],
      ['砂の中にもぐって、昼をやり過ごした。', { armor: 1 }, 'mobile'],
      ['流れてくる小さな粒を、体でこして食べた。', null],
      ['海底をゆっくりはって、新しい場所を見つけた。', { speed: 2 }, 'mobile'],
      ['たくさんの卵を海にまいた。', null],
      ['捕食者の影が近づき、砂にもぐって息をひそめた。', { armor: 2 }, 'mobile'],
      ['仲間と海底いっぱいに広がって暮らした。', null],
      ['潮の流れが変わり、すみかを移した。', { adapt: 2 }, 'mobile'],
    ],
    arthro: [
      ['海底の泥をかき分けて、えさを探した。', null],
      ['脱皮して、ひとまわり大きくなった。', { size: 2 }],
      ['捕食者から、体を丸めて身を守った。', { armor: 2 }],
      ['浅瀬で、たくさんの仲間といっしょに卵を産んだ。', null],
      ['複眼で、近づく影をいち早く見つけた。', { speed: 1 }],
      ['海の泥に、足あとの列を残した。いつか化石になる跡だ。', null],
      ['殻が割れてしまった仲間を見送った。', null],
      ['潮だまりに取り残され、次の満ち潮を待った。', { adapt: 2 }],
    ],
    bug: [
      ['落ち葉の下で、くさった葉っぱを食べて暮らした。', null, 'trees'],
      ['脱皮して、ひとまわり大きくなった。', { size: 2 }],
      ['植物の汁や胞子を食べて暮らした。', null, 'plants'],
      ['雨のあと、水たまりのそばに卵を産んだ。', null],
      ['クモの巣にかかりそうになり、間一髪で逃げた。', { speed: 2 }, 'spiders'],
      ['乾いた季節を、土の中でじっと耐えた。', { adapt: 2 }],
      ['仲間と群れになって、新しい森へ移った。', null, 'trees'],
      ['酸素の濃い空気の中で、体を大きく育てた。', { size: 1 }, 'carb'],
    ],
    fish: [
      ['海の小さな生き物を追いかけて食べた。', null],
      ['群れになって泳ぎ、大きな捕食者の目をくらませた。', { speed: 2 }],
      ['岩かげに身をひそめ、夜を待った。', null],
      ['浅い入り江で、たくさんの卵を産んだ。', null],
      ['酸素の多い流れを探して泳いだ。', { adapt: 1 }],
      ['大きな捕食者にかみつかれたが、なんとか逃げ切った。', { armor: 2 }],
      ['季節の流れにのって、遠くの海まで旅をした。', null],
      ['海底の泥にまぎれて、えさが通るのを待った。', null],
    ],
    amphibian: [
      ['水辺で虫をつかまえて食べた。', null],
      ['湿った森の中で、皮ふを乾かさないように暮らした。', null],
      ['池に、ゼリーのような卵を産んだ。', null],
      ['おたまじゃくしのような子どもたちが、水の中で育った。', null],
      ['日照りで水たまりが干上がり、急いで別の池へ移った。', { adapt: 2 }],
      ['シダの根もとで、昼の暑さをやり過ごした。', null],
      ['大きな魚に食べられそうになり、陸へ逃げた。', { speed: 1 }],
      ['雨の夜、仲間と鳴きかわした。', null],
    ],
    reptile: [
      ['岩の上で日光浴をして、体を温めた。', null],
      ['虫や小さな動物をつかまえて食べた。', null],
      ['砂の中に、殻のある卵を産んで埋めた。', null],
      ['乾いた季節も、うろこの体で水を逃さずに過ごした。', { adapt: 2 }],
      ['巣穴の中で、夜の寒さをしのいだ。', { armor: 1 }],
      ['大きな捕食者の足音を聞き、岩かげに隠れた。', null],
      ['水辺で、えものが近づくのをじっと待った。', null],
      ['脱皮して、新しいうろこになった。', null],
    ],
    dino: [
      ['群れで移動しながら、植物や小さな動物を食べた。', null],
      ['巣に卵を並べ、交代で温めた。', null],
      ['子どもたちが巣立ち、群れについて歩きはじめた。', null],
      ['水場に集まり、ほかの恐竜たちと水を飲んだ。', null],
      ['大型の肉食恐竜に追われ、群れで逃げた。', { speed: 2 }],
      ['乾季に食べ物が減り、遠くの森まで歩いた。', { adapt: 2 }],
      ['仲間とけんかをして、群れの順位が決まった。', { size: 1 }],
      ['火山の噴煙が空を覆い、暗い日が続いた。', null],
    ],
    flyer: [
      ['氷の海に飛びこみ、翼で水をかいて魚を追った。', null, 'flightless water'],
      ['長い脚で草原を走り、えものを追いつめた。', { speed: 1 }, 'flightless land'],
      ['飛ぶのをやめたかわりに、足と体が強くなった。', { size: 1 }, 'flightless'],
      ['風にのって、海の上を長く飛んだ。', null, 'fly'],
      ['水面すれすれを飛び、魚をつかまえた。', null, 'fly'],
      ['崖の上に巣をつくった。', null, 'fly'],
      ['卵からかえったひなに、えさを運んだ。', null],
      ['嵐で翼を痛め、しばらく飛べなかった。', { adapt: 1 }, 'fly'],
      ['季節が変わり、群れで遠くへ渡った。', { speed: 1 }, 'fly'],
      ['木の実や虫を探して、森を飛び回った。', null, 'fly trees'],
      ['高い木の上から、地上の危険を見張った。', { brain: 1 }, 'fly trees'],
    ],
    seabig: [
      ['魚の群れに飛びこんで、たらふく食べた。', null],
      ['海面に出て、大きく息を吸った。', null],
      ['子どもを産み、そばで泳ぎ方を教えた。', null],
      ['仲間と鳴き交わしながら、深い海を旅した。', { brain: 1 }],
      ['大きなサメに狙われたが、群れで追い払った。', { size: 1 }],
      ['あたたかい海と冷たい海を、季節ごとに行き来した。', { adapt: 1 }],
      ['浅い海で、日の光を浴びて休んだ。', null],
      ['貝やイカのような生き物を食べた。', null],
    ],
    mammal: [
      ['夜の空で、超音波を出して虫をつかまえた。', null, 'fly'],
      ['洞窟の天井に、仲間とぶら下がって眠った。', null, 'fly'],
      ['群れで草原を歩き、草をたっぷり食べた。', null, 'big'],
      ['夜、虫や木の実を探して歩き回った。', null, '!fly !big'],
      ['巣穴の中で、子どもたちに乳を飲ませた。', null, '!fly !big'],
      ['毛皮をふくらませて、寒い夜を越した。', { adapt: 1 }],
      ['においで、天敵が近いことに気づいた。', { brain: 1 }],
      ['木にのぼって、高いところの実を食べた。', { speed: 1 }, '!fly !big'],
      ['群れの仲間と毛づくろいをし合った。', null],
      ['乾季に、水場をめぐってほかの動物と争った。', { size: 1 }, '!fly'],
      ['子どもが独り立ちして、新しいなわばりを見つけた。', null],
    ],
    human: [
      ['仲間と協力して、獲物を追いつめた。', null],
      ['石を割って、よく切れる道具をつくった。', { brain: 2 }, 'tools'],
      ['たき火を囲んで、夜の寒さをしのいだ。', null, 'fire'],
      ['木の実や根を集めて、みんなで分けた。', null],
      ['子どもを、群れの大人みんなで育てた。', null],
      ['遠くの土地まで歩いて、新しいすみかを見つけた。', { adapt: 1 }],
      ['病気やけがで、仲間を失った。', null],
      ['洞窟の壁に、手の形を残した。', null, 'art'],
    ],
    farm: [['麦を刈り取り、冬に備えてたくわえた。', null], ['村の祭りで、収穫を祝った。', null]],
    industry: [['工場で働き、汽車に乗って町へ出かけた。', null], ['電気の明かりの下で、夜遅くまで本を読んだ。', { brain: 1 }]],
    ai: [['AIに相談しながら、新しい仕事にとりかかった。', { brain: 1 }], ['スマホで遠くの友だちと話した。', null]],
    // 微生物の時代ごと・道ごとの出来事（lifeEpisode が足す）
    microOld: [
      ['まだ酸素のない海で、鉄の溶けた水の中を漂った。', null, 'water'],
      ['隕石が海に落ち、熱い波が浅瀬をのみこんだ。生き残った仲間が、また数を増やした。', { adapt: 2 }, 'shore'],
      ['1日はまだ短く、太陽は今より暗かった。それでも、仲間は静かに増えた。', null],
    ],
    microIce: [
      ['海は厚い氷の下。わずかな光が届く割れ目で、じっと春を待った。', { adapt: 2 }, 'water'],
      ['氷の下の暗い水で、ほとんど動かずに眠り続けた。', null, 'water'],
    ],
    microLate: [
      ['大きな動物が、すぐそばを泳いでいった。こちらには気づきもしない。', null, 'water free'],
      ['死んだ魚の体を分解して、栄養を海に返した。', null, 'water free'],
      ['巨大なクジラの骨が海底に沈み、何十年も続くごちそうになった。', { adapt: 1 }, 'water free whales'],
    ],
    gut: [
      ['動物が食べた草を、かわりに消化して分けあった。', null],
      ['宿主の動物が子を産み、仲間もいっしょに次の世代へ移り住んだ。', { adapt: 2 }],
      ['おなかの中で、悪い菌が増えないように場所を守った。', { armor: 1 }],
    ],
    cyano: [
      ['朝の光を浴びて、海に小さな酸素の泡を出した。', null, 'water'],
      ['仲間と薄い膜をつくり、波に流されないように岩にはりついた。', { armor: 1 }, 'shore'],
      ['強すぎる日差しを、色素の日がさでやわらげた。', { adapt: 1 }],
    ],
    lichen: [
      ['岩の表面を少しずつ溶かし、何万年もかけて土のもとをつくった。', null],
      ['何か月も雨が降らず、からからに乾いて眠った。雨がくると、すぐに目を覚ました。', { adapt: 2 }],
      ['菌の糸に包まれて、強い日差しと寒さをしのいだ。', { armor: 1 }],
    ],
    ocean: [
      ['見わたすかぎり、何もない青い海を漂った。', null],
      ['海の表面で増えすぎ、海が緑に染まった。', { adapt: 1 }],
      ['小さなプランクトンに食べられたが、それ以上に増えた。', null],
    ],
    soil: [
      ['雨が降り、土の中に新しい水と栄養がしみこんできた。', null],
      ['落ち葉を分解して、森の土を少しずつ豊かにした。', null],
      ['植物の根から糖をもらい、かわりに窒素を渡した。', { adapt: 1 }],
    ],
    plant: [
      ['朝日を浴びて、葉いっぱいに光合成をした。', null],
      ['雨が降り、根から水をたっぷり吸い上げた。', null, '!moss'],
      ['風に乗って、胞子や種が遠くの土地へ飛んでいった。', { adapt: 2 }],
      ['虫に葉をかじられたが、また新しい芽を出した。', { armor: 1 }, 'insects'],
      ['日照りが続き、葉を落として耐えた。', { adapt: 2 }, '!moss'],
      ['落ち葉が積もって、足もとに新しい土ができた。', null, 'trees'],
      ['山火事のあとの焼け野原に、いち早く芽を出した。', { adapt: 2 }],
      ['日照りでからからに縮れたが、雨が降るとすぐに緑に戻った。', { adapt: 2 }, 'moss'],
      ['岩の表面に、少しずつ緑のじゅうたんを広げた。', null, 'moss'],
      ['動物に実を食べてもらい、種が遠くへ運ばれた。', null, 'fruit'],
    ],
    ferment: [
      ['麦のつぶの糖を食べて、パンの生地をふくらませた。', null],
      ['ゆでた大豆の上で増え、ねばねばの糸を引いた。', null],
      ['乳の中で増え、ヨーグルトやチーズに変えた。', null],
    ],
  };
  function lifeGroup(L) {
    const p = L.plan;
    if (p === 'microbe' || p === 'cyano') return 'microbe';
    if (p === 'cell' || p === 'colony') return 'cell';
    if (PLANTS.has(p)) return 'plant';
    if (['sponge', 'ediacaran', 'soft'].includes(p)) return 'soft';
    if (p === 'arthropod') return L.habitat === 'land' ? 'bug' : 'arthro';
    if (p === 'insect') return 'bug';
    if (['anomalo', 'jawless', 'fish', 'shark', 'armorfish'].includes(p)) return 'fish';
    if (p === 'amphibian') return 'amphibian';
    if (p === 'reptile' || p === 'synapsid') return 'reptile';
    if (['dino_small', 'sauropod', 'theropod'].includes(p)) return 'dino';
    if (p === 'pterosaur' || p === 'bird') return 'flyer';
    if (p === 'marine_reptile' || p === 'whale') return 'seabig';
    if (['mammal', 'mammal_large', 'primate'].includes(p)) return 'mammal';
    return 'human';
  }
  // 暮らしの出来事・種の数の出来事が、その系統の今の暮らし（場所・時代・体）に合うか。
  // cond は空白区切りで、すべて満たすとき。! は「でない」（例：'water free'・'!fly !big'）
  function lifeOk(L, ya, cond) {
    if (!cond) return true;
    const place = placeAt(L, ya), hab = L.habitat;
    const inside = place === 'gut' || place === 'jar', under = ['soil', 'litter', 'roots'].includes(place);
    const land = hab === 'land' || hab === 'air' || under || ['lichen', 'rock', 'tree'].includes(place) || !!L.flags.rock;
    const water = !land && !inside, ocean = place === 'ocean', deep = water && (hab === 'deep' || place === 'vent');
    const fly = ((['pterosaur', 'bird', 'insect'].includes(L.plan) && !['penguin', 'terror'].includes(L.flags.sub)) || (L.plan === 'mammal' && L.flags.sub === 'bat'));
    const photo = L.plan === 'cyano' || PLANTS.has(L.plan) || !!L.flags.photo;
    const T = {
      water, land, ocean, deep, free: !inside && !under, shore: water && !deep && !ocean && place !== 'ice',
      photo, eater: !photo, mobile: L.plan !== 'sponge', fly, flightless: ['penguin', 'terror'].includes(L.flags.sub), big: L.plan === 'mammal_large',
      plants: ya < 4.7e8, trees: ya < 3.85e8, insects: ya < 4.0e8, carb: ya <= 3.6e8 && ya > 2.9e8, spiders: ya < 3.9e8 && L.flags.sub !== 'spider',
      fruit: ya < 1.3e8 && L.plan === 'flower', whales: ya < 5e7, tools: ya < 3.3e6, fire: ya < 1e6, art: ya < 6.5e4,
      trilo: !!L.flags.trilobite, moss: L.plan === 'plant',
    };
    return cond.split(' ').every((k) => (k[0] === '!' ? !T[k.slice(1)] : T[k]));
  }
  // その系統の、いまの暮らしの一場面（最近出たものはさける。今の暮らしに合わないものは出さない）
  function lifeEpisode(L, rnd, recent = [], ya = 0) {
    let pool = LIFE[lifeGroup(L)].slice();
    if (MICRO.has(L.plan)) {
      if (ya > 2.5e9) pool = pool.concat(LIFE.microOld);
      if (ya <= 7.2e8 && ya > 6.35e8) pool = LIFE.microIce.concat(LIFE.microIce, pool.slice(0, 2));   // 全球凍結のころは氷の話を多めに
      if (ya <= 5.39e8) pool = pool.concat(LIFE.microLate);
      const pl = placeAt(L, ya);
      if (pl === 'gut') pool = pool.concat(LIFE.gut, LIFE.gut);
      if (['soil', 'roots', 'litter'].includes(pl)) pool = pool.concat(LIFE.soil, LIFE.soil);
      if (pl === 'jar') pool = pool.concat(LIFE.ferment, LIFE.ferment);
      if (L.plan === 'cyano') pool = pool.concat(LIFE.cyano, pl === 'lichen' ? LIFE.lichen.concat(LIFE.lichen) : [], pl === 'ocean' ? LIFE.ocean.concat(LIFE.ocean) : []);
    }
    if (L.plan === 'human') { if (L.flags.farm) pool = pool.concat(LIFE.farm); if (L.flags.industry) pool = pool.concat(LIFE.industry); if (L.flags.ai) pool = pool.concat(LIFE.ai); }
    const fits = pool.filter((x) => lifeOk(L, ya, x[2]));
    pool = fits.length ? fits : pool.filter((x) => !x[2]);
    const fresh = pool.filter((x) => !recent.includes(x[0]));
    const pick = (fresh.length ? fresh : pool)[Math.floor(rnd() * (fresh.length ? fresh.length : pool.length))];
    return { text: pick[0], fx: pick[1] };
  }

  /* ---------------- 結末（図鑑に集める） ----------------
     生き残った結末：最後の体のつくりごと。絶滅した結末：何で消えたかごと */
  const ALIVE_ENDINGS = [
    ['microbe', '46億年を生き抜いた者', 'hotspring', '温泉の湯だまりにも、深海にも、あなたのおなかの中にも。細菌や古細菌は今も地球で最も数の多い生き物です。'],
    ['cyano', '空気をつくり続ける者', 'stromatolite', 'オーストラリアの浅い海では、今もシアノバクテリアがストロマトライトを育てています。'],
    ['cell', '水たまりの小さな宇宙', 'pond', 'ひとしずくの池の水の中で、アメーバやゾウリムシが暮らしています。'],
    ['colony', '海の森', 'kelp', '海藻の森は、たくさんの魚や貝のすみかになっています。'],
    ['sponge', '6億年の水こし', 'reef', '海綿は今もサンゴ礁の片すみで、静かに水をこし続けています。'],
    ['soft', 'クラゲとゴカイの海', 'reef', 'やわらかい体の動物たちは、今もあらゆる海に暮らしています。'],
    ['arthropod-sea', '生きている化石', 'beach', 'カブトガニは4億年以上、ほとんど姿を変えずに浜へ卵を産みに来ます。'],
    ['arthropod-land', '森の足もと', 'forestfloor', '落ち葉の下では、クモやヤスデの仲間が今も暮らしています。'],
    ['insect', '地上でいちばん多い者', 'meadow', '名前のついた動物の種の半分以上は昆虫です。'],
    ['jawless', 'あごのない生き残り', 'river', 'ヤツメウナギは、あごを持たない魚の数少ない生き残りです。'],
    ['fish', '魚の大繁栄', 'reef', '硬骨魚は、今いる脊椎動物の種の半分以上を占めています。'],
    ['shark', '4億年の狩人', 'ocean', 'サメは恐竜より前から、そして恐竜が消えたあとも、海の狩人であり続けています。'],
    ['amphibian', '田んぼの歌い手', 'paddy', '夏の夜の田んぼに響くカエルの声は、3億年以上前に陸に上がった祖先から続いています。'],
    ['reptile', '恐竜を見送った者', 'river', 'ワニやカメ、ヘビやトカゲの仲間は、恐竜の時代を越えて今も暮らしています。'],
    ['synapsid', 'もしも：単弓類の生き残り', 'grassland', '実際には、単弓類で今も生きているのは哺乳類だけ。これは、もうひとつの地球の話です。'],
    ['anomalo', 'もしも：アノマロカリスの末裔', 'ocean', '実際には、アノマロカリスの仲間は4億年以上前に姿を消しました。これは、もうひとつの地球の話です。'],
    ['bird', '恐竜の子孫は空へ', 'sky', '鳥は、白亜紀末の隕石を生き延びた、ただひとつの恐竜の仲間です。'],
    ['mammal', '夜を生きた小さな者', 'forestnight', '恐竜の時代を夜に生きた哺乳類の子孫が、今も森で暮らしています。'],
    ['mammal_large', '草原の群れ', 'grassland', '草原を走るウマやゾウの祖先は、恐竜が消えた世界で大きくなりました。'],
    ['whale', '海に帰った哺乳類', 'whale', 'クジラの祖先は、陸を歩く動物でした。'],
    ['primate', '森のサル', 'jungle', '前を向いた目と、ものをつかむ手。私たちと同じ道を途中まで歩いた仲間です。'],
    ['human', 'AIと話す今日', 'room', 'あなたの系統は、今まさにこの画面の前にいます。'],
  ].map(([key, title, scene, desc]) => ({ id: `a-${key}`, key, alive: true, title, scene, desc, alt: title.startsWith('もしも') }));
  const DEAD_ENDINGS = [
    ['大酸化イベント', 'goe', '酸素に消えた微生物', 'oxygen', '酸素が増えた海で、酸素を使えない微生物の多くが姿を消しました。赤い縞の地層は、そのころの名残です。'],
    ['全球凍結', 'snow', '氷の下に消えた', 'ice', '地球全体が凍りついた時代。氷河が運んだ岩くずの地層が、世界中に残っています。'],
    ['エディアカラ生物の消滅', 'ediac', 'エディアカラの終わり', null, '葉っぱのような体の生き物たちは、カンブリア紀を前に姿を消しました。'],
    ['オルドビス紀末', 'ord', '冷えた海の化石', 'ice', '氷河時代の到来で海が冷え、海の種の約85%が消えました。'],
    ['デボン紀後期', 'dev', '酸素を失った海', 'anoxic', '海の酸素不足が続き、黒い泥の地層の中に多くの生き物が眠っています。'],
    ['ハンゲンベルク', 'hang', '最後の鎧の魚', 'anoxic', '鎧をまとった魚、板皮類はこのときすべて姿を消しました。'],
    ['石炭紀の熱帯雨林', 'crc', '乾いた森の化石', 'coal', '湿った森が縮み、石炭の層の中に当時の生き物が残っています。'],
    ['ペルム紀末', 'pt', '史上最大の絶滅', 'eruption', 'シベリアの大噴火で、海の種の8割以上が消えた、地球史で最悪の時代でした。'],
    ['三畳紀末', 'tr', '恐竜に道をゆずった', 'eruption', '大噴火のあと、生き残った恐竜たちが地上の主役になりました。'],
    ['白亜紀末', 'kpg', '隕石の日', 'impact', '直径約10kmの隕石。世界中の地層に、このときの薄い黒い層（K-Pg境界）が残っています。'],
    ['始新世末', 'eo', '寒さに消えた', 'ice', '南極に氷床ができ、地球が一気に寒くなりました。'],
    ['氷河時代のはじまり', 'iceage', '氷期の化石', 'ice', '氷期と間氷期のくり返しに、ついていけませんでした。'],
    ['頑丈型猿人', 'robust', '頑丈な人類の最後', null, '大きなあごと歯を持つ人類は、約120万年前までに姿を消しました。'],
    ['ほかの人類', 'homo', 'もうひとつの人類', null, 'サピエンス以外の人類は姿を消しました。けれど、その遺伝子の一部は今も私たちの中にあります。'],
    ['大型動物の絶滅', 'mega', 'マンモスとともに', 'ice', '気候の変化と人間の狩りで、大きな哺乳類の多くが消えました。'],
    ['人間による環境の変化', 'anthro', '人の時代に消えた', 'anthro', '地層には、プラスチックや放射性物質など、人間の時代の痕跡が刻まれ始めています。'],
    ['', 'bg', '静かに消えた系統', null, '大きな事件がなくても、数を減らした系統は静かに消えていきます。地球に現れた種の99%以上がそうでした。'],
  ].map(([match, key, title, layer, desc]) => ({ id: `d-${key}`, key, alive: false, title, layer, desc, match }));
  // 生命が生まれる前の時代を引いたとき
  const UNBORN = { id: 'u-unborn', key: 'unborn', alive: false, unborn: true, title: '生まれる前の地球', desc: '地球はまだ熱く、生命が生まれる前でした。46億年のうち約17%は、生き物のいない時代です。' };
  // あとから足した結末（番号は末尾に続く）：微生物の道で決まる生き残り
  const MICRO_ENDINGS = [
    ['gut', 'あなたのおなかの中に', 'room', '人の腸には約100兆個の細菌が住んでいます。人類が生まれるずっと前から動物と暮らしてきた仲間が、今日もあなたの消化を助けています。'],
    ['ferment', '食卓の発酵', 'table', 'パン、チーズ、ヨーグルト、みそ、納豆。微生物は何千年も、人の食卓を支えてきました。'],
    ['soil', '森を支える土', 'underground', '陸の植物の多くは、根で菌類や細菌と手を組んでいます。4億年以上前から、森は土の中の微生物に支えられてきました。'],
  ].map(([key, title, scene, desc]) => ({ id: `a-${key}`, key, alive: true, title, scene, desc, alt: false }));
  // 選んだ道（保存は日本語のラベル）から、微生物の結末を決める。あとで選んだ道ほど優先
  const MICRO_PATH = { 'パンやチーズ、納豆をつくる仲間になる': 'ferment', '人のおなかに住む': 'gut', '植物の根と手を組む': 'soil', '土の中へ広がる': 'soil', '動物のおなかに住みつく': 'gut', '人から離れて暮らす': 'away' };
  // 藻類から陸へ上がった植物の生き残り
  const PLANT_ENDINGS = [
    ['plant', '岩をおおう緑', 'mossrock', 'コケの仲間は、4億年以上前に最初に陸を緑に変えました。今も森の地面や岩をおおっています。'],
    ['fern', 'シダの谷', 'fernvalley', '石炭紀の大森林をつくったシダの仲間は、今も湿った谷で葉を広げています。わたしたちが燃やしてきた石炭の多くは、その森の名残です。'],
    ['seed', '針葉樹の森', 'forestnight', 'マツやスギの仲間は、恐竜の時代の森の主役でした。今も寒い土地で、大きな森をつくっています。'],
    ['flower', '花と虫の共生', 'meadow', '花を咲かせる植物は、虫や鳥に花粉を運んでもらうことで、今では陸の植物の9割近くを占めるまでになりました。'],
  ].map(([key, title, scene, desc]) => ({ id: `a-${key}`, key, alive: true, title, scene, desc, alt: false }));
  // シアノバクテリアのまま、地衣類や外洋の道を選んだ生き残り
  const CYANO_ENDINGS = [
    ['lichen', '岩をいろどる地衣類', 'lichen', '菌と手を組んだあなたの子孫は、地衣類として今日も岩や木の幹をいろどっています。南極の岩の上にも、砂漠にも。'],
    ['ocean', '外洋の光の粒', 'openocean', '外洋を漂う小さなシアノバクテリアは、地球でいちばん数の多い光合成の生き物です。その数は約10の27乗個。今も海で酸素をつくっています。'],
  ].map(([key, title, scene, desc]) => ({ id: `a-${key}`, key, alive: true, title, scene, desc, alt: false }));
  // 同じ体のつくりでも、姿（変種）や道で今日の暮らしがまったく違うもの
  const MORE_ENDINGS = [
    ['penguin', 'bird', '氷の海を飛ぶ鳥', 'icesea', 'ペンギンは空を飛ぶかわりに、翼で海の中を飛ぶように泳ぎます。南の冷たい海で、今も子育てをしています。'],
    ['crab', 'arthropod', '磯のカニ', 'tidepool', 'カニの仲間はジュラ紀に増えはじめ、今では海から川、浜辺まで、約7000種が暮らしています。'],
    ['coela', 'fish', '深海の生きている化石', 'deepsea', 'シーラカンスは6600万年前に絶滅したと思われていましたが、1938年に南アフリカの沖で生きた姿が見つかりました。今も深い海の岩かげで暮らしています。'],
    ['deepsea', 'fish', '深海の灯り', 'deepsea', 'チョウチンアンコウの仲間は、光の届かない深海で、自分の光でえものをおびき寄せています。'],
    ['crust', 'cyano', '砂漠をおおう黒い膜', 'crust', '雨の少ない砂漠の地面は、シアノバクテリアがつくる薄い黒い膜におおわれていることがあります。土が風で飛ばされないように守っています。'],
  ].map(([key, plan, title, scene, desc]) => ({ id: `a-${key}`, key, plan, alive: true, title, scene, desc, alt: false }));
  ALIVE_ENDINGS.find((e) => e.key === 'fish').sceneBy = { eelfish: 'river' };
  const ENDINGS = [...ALIVE_ENDINGS, ...DEAD_ENDINGS, UNBORN, ...MICRO_ENDINGS, ...PLANT_ENDINGS, ...CYANO_ENDINGS, ...MORE_ENDINGS];
  ENDINGS.forEach((e, i) => (e.no = i + 1));
  // 記録（a: 生存, p: 体のつくり, h: 暮らす場所, c: 絶滅の原因）から結末を決める
  function endingOf(d) {
    if (d.u) return UNBORN;
    if (d.a) {
      if (d.p === 'microbe' || d.p === 'cell') {       // 細菌（と酵母になる細胞）だけ。光合成や多細胞の仲間は、もとの結末のまま
        // 人から離れたなら、おなかの道は選ばれなかったことにする
        const ks = (d.k || []).map((x) => MICRO_PATH[x]).filter(Boolean), away = ks.includes('away');
        const key = ks.reverse().find((x) => x !== 'away' && !(away && x === 'gut'));
        if (key && (d.p === 'microbe' || key === 'ferment')) return MICRO_ENDINGS.find((e) => e.key === key);
      }
      if (PLANTS.has(d.p)) return PLANT_ENDINGS.find((e) => e.key === d.p);
      if (d.p === 'cyano') {                             // あとで選んだ道を優先：地衣類 → 植物の根 → 陸の岩 → 外洋
        const ks = d.k || [];
        if (ks.includes('菌と手を組んで地衣類になる')) return CYANO_ENDINGS[0];
        if (ks.includes('植物の根やすきまに住みつく')) return MICRO_ENDINGS.find((e) => e.key === 'soil');
        if (ks.includes('湿った陸の岩へ上がる')) return MORE_ENDINGS.find((e) => e.key === 'crust');
        if (ks.includes('外洋へ漂う')) return CYANO_ENDINGS[1];
      }
      // 姿（変種）で決まる結末（ペンギン・カニ・シーラカンス・深海魚）。lv（今の姿）か、記録の系譜の最後の姿を見る
      //   記録の v は形式の版（いつも1）なので、姿には使わない。前は d.v を見ていて、保存した記録ではこの結末にならなかった
      const v = d.lv != null ? d.lv : d.g && d.g.length ? d.g[d.g.length - 1][1] : '';
      const ve = v && MORE_ENDINGS.find((e) => e.key === v && e.plan === d.p);
      if (ve) return ve;
      const key = d.p === 'arthropod' ? (d.h === 'land' ? 'arthropod-land' : 'arthropod-sea') : d.p;
      return ALIVE_ENDINGS.find((e) => e.key === key) || ALIVE_ENDINGS[0];
    }
    const c = d.c || '';
    return DEAD_ENDINGS.find((e) => e.match && c.includes(e.match)) || DEAD_ENDINGS[DEAD_ENDINGS.length - 1];
  }

  /* ---------------- 選んだ道の居場所（場面の絵が変わる） ----------------
     L.place：'soil' などの文字か、[居場所, いつまで（年前）]。体のつくりが変わったら消える。
     「どう生きる？」は、言葉に場所があるものだけ（ないものを選んだら消える） */
  const OPT_PLACE = {
    'microAnimal:動物のおなかに住みつく': 'gut', 'microAnimal:サンゴや海綿と手を組む': 'reef', 'microAnimal:自由に暮らす': null,
    'microLand:植物の根と手を組む': 'roots', 'microLand:土の中へ広がる': 'soil',
    'microHuman:パンやチーズ、納豆をつくる仲間になる': 'jar', 'microHuman:人のおなかに住む': 'gut',
    'snow:火山の熱がある海底へ': ['vent', 6.35e8], 'snow:休眠して、氷が解けるのを待つ': ['ice', 6.35e8], 'snow:氷の割れ目の薄い水で暮らす': ['ice', 6.35e8],
    'cyanoWhere:外洋へ漂う': 'ocean', 'cyanoWhere:浅い海で岩（ストロマトライト）を積み続ける': 'stroma', 'cyanoWhere:湿った陸の岩へ上がる': 'rock',
    'cyanoLand:菌と手を組んで地衣類になる': 'lichen', 'cyanoLand:植物の根やすきまに住みつく': 'roots',
    'predator:砂にもぐって隠れる': 'burrow', 'arthroLand:海底の泥にもぐって暮らす': 'burrow', 'arthroLand:陸に上がる': null,
    'ptPrep:穴を掘って暮らす': ['burrow', 2.45e8], 'ptPrep:海底の泥にもぐって暮らす': ['burrow', 2.45e8],
    'night:夜に動く': 'night', 'night:木の上で暮らす': 'tree', 'night:地面に穴を掘る': 'burrow', 'night:体を大きくして対抗する': null,
    'radiation:木の上で、目と手を使う': 'tree',
  };
  const AGE_PLACE = [['サンゴ礁', 'reef'], ['礁のかげ', 'reef'], ['落ち葉', 'litter'], ['森の地面', 'litter'], ['木の上', 'tree'], ['夜の森', 'night'],
    ['海藻の森', 'kelp'], ['氷の下', 'ice'], ['海底で小さく', 'mud']];
  for (const n of NODES) {
    const age = n.id.startsWith('age');
    for (const o of n.opts) {
      const key = `${n.id}:${o.label}`, base = o.apply;
      let place;
      if (key in OPT_PLACE) place = OPT_PLACE[key];
      else if (age) { const m = AGE_PLACE.find(([w]) => o.label.includes(w)); place = m ? m[1] : null; }
      o.apply = (L) => {
        const p0 = L.plan;
        base(L);
        if (L.plan !== p0) L.place = null;
        if (place !== undefined) L.place = place;
      };
    }
  }
  // 今の居場所（期限が過ぎたら消える。巣穴は、陸なら土の中・海なら泥の中）
  function placeAt(L, ya) {
    let p = L.place || null;
    if (Array.isArray(p)) p = ya > p[1] ? p[0] : null;
    if (p === 'burrow') p = L.habitat === 'land' || L.habitat === 'air' ? 'soil' : 'mud';
    return p;
  }

  E.evo = {
    ENDINGS, endingOf, placeAt, optsFor,
    SUBS, CAP, REAL, realCount, PLANS, TRAITS, TRAIT_LABEL, TRAIT_SHORT, HAB_LABEL, MICRO, NODES, EXTINCTIONS,
    ABOUT, LIFE, lifeEpisode, bump, birthOptions, makeLineage, step, applyExtinction, autoChoose, nodeFor, rates, rng, die, cloneL, runOut,
  };
})();
