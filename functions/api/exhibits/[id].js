// GET /api/exhibits/<id>  ひとつの展示（博物館のリンク ?id= から開くとき）
import { json } from '../../_lib/museum.js';

export async function onRequestGet({ params, env }) {
  const r = await env.DB.prepare('SELECT * FROM exhibits WHERE id = ?1').bind(String(params.id)).first();
  if (!r) return json({ error: 'not_found' }, 404);
  return json({ id: r.id, created: r.created, hearts: r.hearts, data: JSON.parse(r.data) });
}
