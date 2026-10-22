-- 化石の博物館（D1）
-- 展示：ゲームの記録（JSON）だけ。hearts は「心に留める」の数、dh は同じ記録を二重に展示しないためのハッシュ
CREATE TABLE IF NOT EXISTS exhibits (
  id TEXT PRIMARY KEY,
  created INTEGER NOT NULL,
  alive INTEGER NOT NULL,
  plan TEXT NOT NULL,
  hearts INTEGER NOT NULL DEFAULT 0,
  dh TEXT UNIQUE,
  data TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS exhibits_created ON exhibits (created DESC);
CREATE INDEX IF NOT EXISTS exhibits_hearts ON exhibits (hearts DESC, created DESC);

-- 「心に留める」は、同じ人（日ごとのハッシュ）から1展示につき1回
CREATE TABLE IF NOT EXISTS hearts (
  id TEXT NOT NULL,
  iph TEXT NOT NULL,
  created INTEGER NOT NULL,
  PRIMARY KEY (id, iph)
);

-- 1日の回数の上限（展示・心に留める）
CREATE TABLE IF NOT EXISTS quota (
  iph TEXT NOT NULL,
  day TEXT NOT NULL,
  kind TEXT NOT NULL,
  n INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (iph, day, kind)
);
