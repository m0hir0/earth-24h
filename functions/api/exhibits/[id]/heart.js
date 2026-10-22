// POST /api/exhibits/<id>/heart  「心に留める」。同じ人（日ごとのハッシュ）からは1展示につき1回 → { hearts }
import { json, ipHash, allow } from '../../../_lib/museum.js';

export async function onRequestPost({ params, request, env }) {
  const id = String(params.id);
  const ex = await env.DB.prepare('SELECT hearts FROM exhibits WHERE id = ?1').bind(id).first();
  if (!ex) return json({ error: 'not_found' }, 404);
  const iph = await ipHash(request, env);
  if (!(await allow(env, iph, 'heart', 300))) return json({ error: 'limit', hearts: ex.hearts }, 429);
  const r = await env.DB.prepare('INSERT OR IGNORE INTO hearts (id, iph, created) VALUES (?1, ?2, ?3)').bind(id, iph, Date.now()).run();
  if (r.meta.changes) await env.DB.prepare('UPDATE exhibits SET hearts = hearts + 1 WHERE id = ?1').bind(id).run();
  const after = await env.DB.prepare('SELECT hearts FROM exhibits WHERE id = ?1').bind(id).first();
  return json({ hearts: after.hearts });
}
