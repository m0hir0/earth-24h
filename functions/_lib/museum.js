// 化石の博物館（Cloudflare Pages Functions）の共通部品
//   展示は、ゲームの記録だけ。自由な文章は受け付けず、言葉は names.json（tools/build-names.js が作る）にあるものだけ通す
//   遊んだ人の IP アドレスは保存しない。回数の制限のために、日ごとに変わるハッシュ（ipHash）だけを使う
import W from './names.json';

const NAMES = new Set(W.names), LABELS = new Set(W.labels), CAUSES = new Set(W.causes);
const PLANS = new Set(W.plans), HABS = new Set(W.habitats), VARIANTS = new Set(W.variants);

export const json = (body, status = 200) => new Response(JSON.stringify(body), {
  status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
});

const int = (x, max) => (Number.isFinite(+x) && +x >= 0 && +x <= max ? Math.round(+x) : null);

// 展示できる記録か確かめて、決まった形にそろえる。だめなら null
export function clean(d) {
  if (!d || typeof d !== 'object' || d.v !== 1 || d.u) return null;
  const b = int(d.b, W.S), e = int(d.e, W.S);
  if (!b || e == null || e > b || !PLANS.has(d.p) || !HABS.has(d.h)) return null;
  if (!NAMES.has(d.f) || !NAMES.has(d.n)) return null;
  const a = d.a ? 1 : 0;
  const c = a ? '' : String(d.c || '');
  if (!a && !CAUSES.has(c)) return null;
  const k = Array.isArray(d.k) ? d.k.slice(0, 20) : [];
  if (!k.every((x) => LABELS.has(x))) return null;
  const g = [];
  for (const f of (Array.isArray(d.g) ? d.g : []).slice(0, 12)) {
    if (!Array.isArray(f) || !PLANS.has(f[0]) || !VARIANTS.has(f[1] || '') || !NAMES.has(f[2])) return null;
    const ya = f[3] == null ? null : int(f[3], W.S);
    g.push(ya == null ? [f[0], f[1] || '', f[2]] : [f[0], f[1] || '', f[2], ya]);
  }
  const x = [];
  for (const v of (Array.isArray(d.x) ? d.x : []).slice(0, 6)) {
    const before = Array.isArray(v) ? int(v[1], 2e6) : null, after = Array.isArray(v) ? int(v[2], 2e6) : null;
    if (before == null || after == null || !CAUSES.has(v[0])) return null;
    x.push([v[0], before, after]);
  }
  return { v: 1, u: 0, b, e, a, f: d.f, n: d.n, p: d.p, h: d.h, c, k, g, x, y: int(d.y, 1e6) || 0 };
}

export const today = () => new Date().toISOString().slice(0, 10);

async function sha(text) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((x) => x.toString(16).padStart(2, '0')).join('').slice(0, 32);
}
export const hash = sha;
// 日ごとに変わる、IP アドレスのハッシュ（元の IP は保存しない）
export const ipHash = (request, env) => sha(`${request.headers.get('CF-Connecting-IP') || 'unknown'}|${today()}|${env.SALT || 'earth24h-museum'}`);

// 1日の回数を数えて、上限を超えたら false
export async function allow(env, iph, kind, max) {
  const day = today();
  const row = await env.DB.prepare(
    'INSERT INTO quota (iph, day, kind, n) VALUES (?1, ?2, ?3, 1) ON CONFLICT(iph, day, kind) DO UPDATE SET n = n + 1 RETURNING n',
  ).bind(iph, day, kind).first();
  if (Math.random() < 0.02) await env.DB.prepare('DELETE FROM quota WHERE day < ?1').bind(day).run();   // 古い数を時々消す
  return row.n <= max;
}

export const newId = () => [...crypto.getRandomValues(new Uint8Array(8))].map((x) => (x % 36).toString(36)).join('');
