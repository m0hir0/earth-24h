// GET  /api/exhibits?sort=new|loved|random&kind=all|dead|alive&limit=12&before=<作られた時刻>&offset=<数>
//      展示の一覧と、展示の総数
// POST /api/exhibits  本文：ゲームの記録（JSON） → { id }
import { json, clean, hash, ipHash, allow, newId } from '../_lib/museum.js';

const row = (r) => ({ id: r.id, created: r.created, hearts: r.hearts, data: JSON.parse(r.data) });

export async function onRequestGet({ request, env }) {
  const q = new URL(request.url).searchParams;
  const limit = Math.min(24, Math.max(1, Number(q.get('limit')) || 12));
  const kind = q.get('kind');
  const where = kind === 'dead' ? 'alive = 0' : kind === 'alive' ? 'alive = 1' : '1 = 1';
  const sort = q.get('sort');
  let rs;
  if (sort === 'random') {
    rs = await env.DB.prepare(`SELECT * FROM exhibits WHERE ${where} ORDER BY RANDOM() LIMIT ?1`).bind(limit).all();
  } else if (sort === 'loved') {
    const offset = Math.min(2000, Math.max(0, Number(q.get('offset')) || 0));
    rs = await env.DB.prepare(`SELECT * FROM exhibits WHERE ${where} ORDER BY hearts DESC, created DESC LIMIT ?1 OFFSET ?2`).bind(limit, offset).all();
  } else {
    const before = Number(q.get('before')) || 0;
    rs = await env.DB.prepare(`SELECT * FROM exhibits WHERE ${where} AND (?1 = 0 OR created < ?1) ORDER BY created DESC LIMIT ?2`).bind(before, limit).all();
  }
  const total = await env.DB.prepare('SELECT COUNT(*) AS n, SUM(alive) AS alive FROM exhibits').first();
  return json({ total: total.n || 0, alive: total.alive || 0, items: (rs.results || []).map(row) });
}

export async function onRequestPost({ request, env }) {
  const text = await request.text();
  if (text.length > 8000) return json({ error: 'too_large' }, 413);
  let d;
  try { d = clean(JSON.parse(text)); } catch (e) { d = null; }
  if (!d) return json({ error: 'invalid' }, 400);
  const body = JSON.stringify(d);
  const dh = await hash(body);
  const same = await env.DB.prepare('SELECT id FROM exhibits WHERE dh = ?1').bind(dh).first();
  if (same) return json({ id: same.id, existed: true });
  const iph = await ipHash(request, env);
  if (!(await allow(env, iph, 'exhibit', 20)) || !(await allow(env, 'all', 'exhibit', 5000))) return json({ error: 'limit' }, 429);
  const id = newId();
  await env.DB.prepare('INSERT INTO exhibits (id, created, alive, plan, hearts, dh, data) VALUES (?1, ?2, ?3, ?4, 0, ?5, ?6)')
    .bind(id, Date.now(), d.a, d.p, dh, body).run();
  return json({ id }, 201);
}
