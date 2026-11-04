// Recompone desde la base las estructuras que hoy viven en index.html y concesionarios.json.
import { juntarCelda } from './lib.mjs';

const f = d => (d === null || d === undefined ? null : (d instanceof Date ? d.toISOString().slice(0, 10) : String(d).slice(0, 10)));

export async function exportarDATA(db) {
  const autos = await db.query('SELECT slug FROM autolofy.auto ORDER BY orden');
  const cats = await db.query('SELECT id,nombre FROM autolofy.categoria ORDER BY orden');
  const out = [];
  for (const c of cats) {
    const filas = await db.query('SELECT id,nombre FROM autolofy.fila WHERE categoria_id=$1 ORDER BY orden', [c.id]);
    const rows = [];
    for (const fl of filas) {
      const cel = await db.query('SELECT auto_slug,origen,valor,detalle FROM autolofy.celda WHERE fila_id=$1', [fl.id]);
      const m = new Map(cel.map(x => [x.auto_slug, x]));
      rows.push([fl.nombre, ...autos.map(a => juntarCelda(m.get(a.slug)))]);
    }
    out.push([c.nombre, rows]);
  }
  return out;
}

export async function exportarLlamados(db) {
  const r = await db.query('SELECT auto_slug,fecha,fecha_dudosa,modelo,descripcion FROM autolofy.llamado ORDER BY auto_slug,fecha,id');
  const o = {};
  for (const x of r) (o[x.auto_slug] ||= []).push({ f: f(x.fecha), mod: x.modelo, d: x.descripcion, ...(x.fecha_dudosa ? { dud: 1 } : {}) });
  return o;
}

export async function exportarVideos(db) {
  const r = await db.query('SELECT * FROM autolofy.video ORDER BY auto_slug,orden');
  const o = {};
  for (const x of r) (o[x.auto_slug] ||= []).push({ canal: x.canal, id: x.youtube_id, t: x.titulo, f: f(x.fecha), s: x.duracion_s, ...(x.tipo ? { tipo: x.tipo } : {}), ...x.extra });
  return o;
}

export async function exportarHistorialUSD(db) {
  const r = await db.query('SELECT auto_slug,fecha,usd,version,url FROM autolofy.precio_lista_usd ORDER BY auto_slug,fecha,version');
  const o = {};
  for (const x of r) (o[x.auto_slug] ||= []).push([f(x.fecha), x.usd, x.version, x.url]);
  return o;
}

export async function exportarPrecios(db) {
  const r = await db.query('SELECT auto_slug,desde,moneda,monto,version FROM autolofy.precio_historial ORDER BY auto_slug,id');
  const o = {};
  for (const x of r) (o[x.auto_slug] ||= []).push({ desde: f(x.desde), moneda: x.moneda, monto: Number(x.monto), version: x.version });
  return o;
}

// Promos vigentes de cada marca y de cada local (lo que hoy está en concesionarios.json), con el esquema de ese archivo.
export async function exportarPromosVigentes(db) {
  const r = await db.query(`SELECT p.*, c.orden AS orden_local,
      (SELECT array_agg(auto_slug ORDER BY auto_slug) FROM autolofy.promo_auto pa WHERE pa.promo_id=p.id) AS autos
    FROM autolofy.promo p LEFT JOIN autolofy.concesionario c ON c.id=p.concesionario_id WHERE p.estado='vigente'`);
  const out = { marcas: {}, locales: {} };
  for (const p of r) {
    const v = (await db.query('SELECT * FROM autolofy.promo_version WHERE promo_id=$1 ORDER BY desde DESC LIMIT 1', [p.id]))[0];
    const o = { autos: [...(p.todos_los_autos ? ['*'] : []), ...(p.autos || [])], tipo: p.tipo, texto: v.texto, vigencia: f(v.vigencia), fuente: p.fuente, consultado: f(p.consultado) };
    if (p.version_auto) o.version = p.version_auto;
    if (v.precio_moneda) o.precio = { moneda: v.precio_moneda, monto: Number(v.precio_monto) };
    if (v.descuento_moneda) o.descuento = { moneda: v.descuento_moneda, monto: Number(v.descuento_monto) };
    (p.marca ? (out.marcas[p.marca] ||= []) : (out.locales[p.orden_local] ||= [])).push(o);
  }
  return out;
}
