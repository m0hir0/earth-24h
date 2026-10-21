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
      taken: new Set(), path: [], log: [],
    };
  }
  function setPlan(L, plan) {
    if (L.plan === plan) return;
    const b = PLANS[plan].base;
    TRAITS.forEach((k, i) => (L.traits[k] = Math.round((L.traits[k] + b[i] * 2) / 3)));
    L.plan = plan;
  }
  function bump(L, d) {
    for (const k in d) L.traits[k] = Math.max(0, Math.min(100, L.traits[k] + d[k]));
  }

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
          apply: (L) => { L.habitat = 'land'; L.flags.trilobite = 0; L.name = '陸の節足動物'; bump(L, { adapt: 10 }); } },
        { label: '海の三葉虫のまま', desc: '慣れた海で、殻を硬くして暮らす。', real: '',
          apply: (L) => { bump(L, { armor: 10 }); } },
        { label: '海底の泥にもぐって暮らす', desc: '目立たず、じっと生きる。', real: 'カブトガニは、4億年以上ほとんど姿を変えずに生きている。',
          apply: (L) => { L.flags.trilobite = 0; L.flags.burrow = 1; L.name = 'カブトガニの仲間'; bump(L, { adapt: 10, speed: -10 }); } },
      ],
    },
    {
      id: 'wings', from: 4.0e8, to: 3.2e8, when: (L) => L.plan === 'arthropod' && L.habitat === 'land',
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
      id: 'ptPrep', from: 2.6e8, to: 2.52e8, when: (L) => !MICRO.has(L.plan),
      q: 'シベリアで大噴火が始まった。空気と海が熱くなり、酸素が減っていく。',
      ctx: '何十万年も続く噴火。地球の歴史で最悪の時代が近づいている。',
      opts: [
        { label: '体を小さくし、何でも食べる', desc: '少ない食べ物でも生きられるようにする。', real: '大量絶滅のあとは、小さく何でも食べる生き物が生き残りやすい。',
          apply: (L) => { bump(L, { size: -20, adapt: 15 }); } },
        { label: '穴を掘って暮らす', desc: '地中は、暑さや乾燥から身を守ってくれる。', real: '穴を掘るリストロサウルスは、この絶滅を生き延びて大繁栄した。',
          apply: (L) => { L.flags.burrow = 1; } },
        { label: '今のまま勝負する', desc: '何も変えない。', real: '',
          apply: () => {} },
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
  AGES.forEach(([from, to, age, ctx], i) => NODES.push({
    id: `age${i}`, from, to, when: (L) => !MICRO.has(L.plan) && L.plan !== 'human',
    q: `${age}を、どう生きる？`, ctx,
    opts: [
      { label: '体を大きくする', desc: '強くなるが、たくさん食べ、環境の急な変化に弱くなる。', real: '',
        apply: (L) => bump(L, { size: 15, armor: 5, adapt: -5 }) },
      { label: '小さく、何でも食べる', desc: '目立たないが、どんな時代でも生き延びやすい。', real: '',
        apply: (L) => bump(L, { size: -15, adapt: 15 }) },
      { label: '新しい場所に広がる', desc: '仲間を増やし、さまざまな環境に分かれていく。', real: '',
        apply: (L) => { bump(L, { adapt: 8, speed: 5 }); L.N = Math.min(CAP, L.N * 1.3); } },
      { label: '守りを固める', desc: '殻や鎧、とげで身を守る。', real: '',
        apply: (L) => bump(L, { armor: 15, speed: -5 }) },
    ],
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
    { ya: 2.519e8, fx: 'eruption', name: 'ペルム紀末の大量絶滅', fact: 'シベリアの大噴火で海は熱く酸素不足に。海の種の8割以上が消えた史上最大の絶滅。三葉虫もここで姿を消した。',
      kill: (L) => (L.flags.trilobite ? 1 : L.flags.burrow ? 0.55 : sea(L) ? 0.88 : MICRO.has(L.plan) ? 0.3 : 0.75) },
    { ya: 2.014e8, fx: 'eruption', name: '三畳紀末の大量絶滅', fact: '大西洋ができはじめたころの大噴火。多くのは虫類や単弓類が消え、恐竜の天下が始まった。',
      kill: (L) => (L.plan === 'synapsid' ? 0.95 : ['dino_small', 'sauropod', 'theropod', 'pterosaur'].includes(L.plan) ? 0.35 : L.plan === 'reptile' ? 0.6 : L.plan === 'mammal' ? 0.4 : sea(L) ? 0.55 : 0.4) },
    { ya: 6.6e7, fx: 'impact', name: '白亜紀末の大量絶滅', fact: '直径約10kmの隕石がメキシコに衝突。鳥以外の恐竜、翼竜、首長竜、アンモナイトが消えた。',
      kill: (L) => (['sauropod', 'theropod', 'pterosaur', 'marine_reptile', 'dino_small'].includes(L.plan) ? 1
        : L.plan === 'bird' ? 0.75 : L.traits.size > 55 ? 0.95 : L.flags.burrow ? 0.4 : L.habitat === 'deep' ? 0.3 : sea(L) ? 0.6 : 0.65) },
    { ya: 3.4e7, fx: 'ice', name: '始新世末の寒冷化', fact: '南極に氷床ができ、地球が一気に寒くなった。',
      kill: (L) => (L.flags.warm ? 0.2 : 0.35) },
    { ya: 2.58e6, fx: 'ice', name: '氷河時代のはじまり', fact: '寒い氷期と暖かい間氷期のくり返しが始まった。',
      kill: (L) => (L.flags.warm ? 0.15 : 0.25) },
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
    sauropod: 300, theropod: 600, bird: 11000, mammal: 6500, mammal_large: 2000, whale: 90, primate: 500,
    hominin: 20, human: 1,
  };
  // 上から2けたに丸める（100未満はそのまま）
  const round2 = (x) => { if (x < 100) return Math.round(x); const p = 10 ** (Math.floor(Math.log10(x)) - 1); return Math.round(x / p) * p; };
  function realCount(L, n = L.N) {
    if (!(n > 0)) return 0;
    return Math.max(1, round2((REAL[L.plan] || 1000) * Math.min(n, CAP) / CAP));
  }
  function rates(L, ya) {
    const T = L.traits;
    if (L.plan === 'human') return { lam: 0, mu: 0 };
    let lam = 0.26 * (0.5 + T.adapt / 150 + T.speed / 400 + T.brain / 500);
    let mu = 0.22 * (0.75 + T.size / 200 - T.armor / 500 - T.adapt / 300);
    if (MICRO.has(L.plan)) { lam *= 0.15; mu *= 0.12; }
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
  function step(L, ya, dtY, rnd, grace) {
    if (!L.alive || L.plan === 'human') return;
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
    if (p < 1 && p > 0) {
      p *= 1 + (L.traits.size - 50) / 250;
      p *= 1 - (L.traits.adapt - 50) / 250;
      // 同じ系統の種は似た場所・似た暮らし。運命はまとめて振れる
      p += gauss(rnd) * 0.12;
      p = Math.max(0, Math.min(0.999, p));
    }
    let after;
    if (p >= 1) after = 0;
    else if (before > 40) after = Math.max(0, Math.round(before * (1 - p) + gauss(rnd) * Math.sqrt(before * p * (1 - p))));
    else { after = 0; for (let i = 0; i < before; i++) if (rnd() > p) after++; }
    if (L.plan === 'human') after = before;
    L.N = after;
    if (after < 1) die(L, ev.ya, ev.name);
    return { before, after, p };
  }

  // ライバルは分かれ道でランダムに選ぶ
  function autoChoose(L, node, rnd) {
    const o = node.opts[Math.floor(rnd() * node.opts.length)];
    o.apply(L);
    L.taken.add(node.id);
    L.path.push(o.label);
  }
  const nodeFor = (L, ya) => NODES.find((n) => !L.taken.has(n.id) && ya <= n.from && ya > n.to && n.when(L));

  // 乱数（種あり：シェアしたときの再現用）
  function rng(seed) {
    let s = seed >>> 0;
    return () => { s = (s + 0x6d2b79f5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }

  /* ---------------- 暮らしの出来事（タイムラインに出る、その生き物の日々） ----------------
     [文章, 特徴の小さな変化] */
  const LIFE = {
    microbe: [
      ['ひだまりの浅瀬で、ゆっくり分裂して数を増やした。', null],
      ['岩のすき間に、仲間とぬるぬるした膜（バイオフィルム）をつくって暮らした。', { armor: 2 }],
      ['海底からわき出す熱い水のそばで、化学物質を食べて生きた。', null],
      ['嵐で浅瀬がかき混ぜられ、多くの仲間が流された。', { adapt: 2 }],
      ['近くの微生物と、遺伝子のかけらを交換した。', { adapt: 3 }],
      ['紫外線の強い日。泥の中にもぐって身を守った。', null],
      ['仲間と層になって積み重なり、小さな岩（ストロマトライト）を育てた。', null],
      ['となりの微生物が出したものを、栄養にして生きた。', null],
    ],
    cell: [
      ['体の中のミトコンドリアが、せっせとエネルギーをつくっている。', null],
      ['水の中をただよう細菌を、体で包みこんで食べた。', null],
      ['分裂して、そっくりな仲間が増えた。', null],
      ['仲間の細胞とくっついて、役割を分けあった。', { size: 2 }],
      ['冷たい海で、動きをゆるめてじっと耐えた。', { adapt: 2 }],
      ['太陽の光を浴びて、栄養をたくわえた。', null],
      ['別の細胞と遺伝子を混ぜ合わせ、新しい組み合わせの子が生まれた。', { adapt: 2 }],
      ['水の流れにのって、遠くの海へ運ばれた。', null],
    ],
    soft: [
      ['海底の微生物のマットを、少しずつかじって食べた。', null],
      ['砂の中にもぐって、昼をやり過ごした。', { armor: 1 }],
      ['流れてくる小さな粒を、体でこして食べた。', null],
      ['海底をゆっくりはって、新しい場所を見つけた。', { speed: 2 }],
      ['たくさんの卵を海にまいた。', null],
      ['捕食者の影が近づき、砂にもぐって息をひそめた。', { armor: 2 }],
      ['仲間と海底いっぱいに広がって暮らした。', null],
      ['潮の流れが変わり、すみかを移した。', { adapt: 2 }],
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
      ['落ち葉の下で、くさった葉っぱを食べて暮らした。', null],
      ['脱皮して、ひとまわり大きくなった。', { size: 2 }],
      ['植物の汁や胞子を食べて暮らした。', null],
      ['雨のあと、水たまりのそばに卵を産んだ。', null],
      ['クモの巣にかかりそうになり、間一髪で逃げた。', { speed: 2 }],
      ['乾いた季節を、土の中でじっと耐えた。', { adapt: 2 }],
      ['仲間と群れになって、新しい森へ移った。', null],
      ['酸素の濃い空気の中で、体を大きく育てた。', { size: 1 }],
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
      ['風にのって、海の上を長く飛んだ。', null],
      ['水面すれすれを飛び、魚をつかまえた。', null],
      ['崖の上に巣をつくった。', null],
      ['卵からかえったひなに、えさを運んだ。', null],
      ['嵐で翼を痛め、しばらく飛べなかった。', { adapt: 1 }],
      ['季節が変わり、群れで遠くへ渡った。', { speed: 1 }],
      ['木の実や虫を探して、森を飛び回った。', null],
      ['高い木の上から、地上の危険を見張った。', { brain: 1 }],
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
      ['夜、虫や木の実を探して歩き回った。', null],
      ['巣穴の中で、子どもたちに乳を飲ませた。', null],
      ['毛皮をふくらませて、寒い夜を越した。', { adapt: 1 }],
      ['においで、天敵が近いことに気づいた。', { brain: 1 }],
      ['木にのぼって、高いところの実を食べた。', { speed: 1 }],
      ['群れの仲間と毛づくろいをし合った。', null],
      ['乾季に、水場をめぐってほかの動物と争った。', { size: 1 }],
      ['子どもが独り立ちして、新しいなわばりを見つけた。', null],
    ],
    human: [
      ['仲間と協力して、獲物を追いつめた。', null],
      ['石を割って、よく切れる道具をつくった。', { brain: 2 }],
      ['たき火を囲んで、夜の寒さをしのいだ。', null],
      ['木の実や根を集めて、みんなで分けた。', null],
      ['子どもを、群れの大人みんなで育てた。', null],
      ['遠くの土地まで歩いて、新しいすみかを見つけた。', { adapt: 1 }],
      ['病気やけがで、仲間を失った。', null],
      ['洞窟の壁に、手の形を残した。', null],
    ],
    farm: [['麦を刈り取り、冬に備えてたくわえた。', null], ['村の祭りで、収穫を祝った。', null]],
    industry: [['工場で働き、汽車に乗って町へ出かけた。', null], ['電気の明かりの下で、夜遅くまで本を読んだ。', { brain: 1 }]],
    ai: [['AIに相談しながら、新しい仕事にとりかかった。', { brain: 1 }], ['スマホで遠くの友だちと話した。', null]],
  };
  function lifeGroup(L) {
    const p = L.plan;
    if (p === 'microbe' || p === 'cyano') return 'microbe';
    if (p === 'cell' || p === 'colony') return 'cell';
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
  // その系統の、いまの暮らしの一場面（最近出たものはさける）
  function lifeEpisode(L, rnd, recent = []) {
    let pool = LIFE[lifeGroup(L)].slice();
    if (L.plan === 'human') { if (L.flags.farm) pool = pool.concat(LIFE.farm); if (L.flags.industry) pool = pool.concat(LIFE.industry); if (L.flags.ai) pool = pool.concat(LIFE.ai); }
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
    ['fish', 'サンゴ礁の群れ', 'reef', '硬骨魚は、今いる脊椎動物の種の半分以上を占めています。'],
    ['shark', '4億年の狩人', 'ocean', 'サメは恐竜より前から、そして恐竜が消えたあとも、海の狩人であり続けています。'],
    ['amphibian', '田んぼの歌い手', 'paddy', '夏の夜の田んぼに響くカエルの声は、3億年以上前に陸に上がった祖先から続いています。'],
    ['reptile', '恐竜を見送った者', 'river', 'ワニやカメは、恐竜の時代を越えて今も水辺で暮らしています。'],
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
  const ENDINGS = [...ALIVE_ENDINGS, ...DEAD_ENDINGS, UNBORN];
  ENDINGS.forEach((e, i) => (e.no = i + 1));
  // 記録（a: 生存, p: 体のつくり, h: 暮らす場所, c: 絶滅の原因）から結末を決める
  function endingOf(d) {
    if (d.u) return UNBORN;
    if (d.a) {
      const key = d.p === 'arthropod' ? (d.h === 'land' ? 'arthropod-land' : 'arthropod-sea') : d.p;
      return ALIVE_ENDINGS.find((e) => e.key === key) || ALIVE_ENDINGS[0];
    }
    const c = d.c || '';
    return DEAD_ENDINGS.find((e) => e.match && c.includes(e.match)) || DEAD_ENDINGS[DEAD_ENDINGS.length - 1];
  }

  E.evo = {
    ENDINGS, endingOf,
    CAP, REAL, realCount, PLANS, TRAITS, TRAIT_LABEL, TRAIT_SHORT, HAB_LABEL, MICRO, NODES, EXTINCTIONS,
    ABOUT, LIFE, lifeEpisode, bump, birthOptions, makeLineage, step, applyExtinction, autoChoose, nodeFor, rates, rng, die,
  };
})();
