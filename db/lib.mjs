// Lectura de los datos actuales del repo (index.html + archivos) y adaptador de base (PGlite local o Postgres/Neon).
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

export const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const leer = f => fs.readFileSync(path.join(RAIZ, f), 'utf8');

export function constantes(nombres) {
  const html = leer('index.html');
  const out = {};
  for (const n of nombres) {
    const i = html.indexOf(`const ${n} = `);
    if (i < 0) throw new Error('falta ' + n);
    const ini = i + `const ${n} = `.length;
    const fin = html.indexOf(';\n', ini);
    out[n] = vm.runInNewContext('(' + html.slice(ini, fin).replace(/\/\*[a-z]+:(inicio|fin)\*\//g, '') + ')', {});
  }
  return out;
}
export const slugsDelHtml = () => [...leer('index.html').matchAll(/<img class="car-photo"[^>]*data-slug="([^"]+)"/g)].map(m => m[1]);

export function partirCelda(c) {
  if (['YES', 'NO', 'OPT', 'ND'].includes(c)) return { origen: 'centinela', valor: c, detalle: null };
  const m = /^(DET|NOTE|EXT|NR):/.exec(c);
  if (!m) return { origen: 'dato', valor: c, detalle: null };
  const resto = c.slice(m[0].length), k = resto.indexOf('|');
  const origen = { DET: 'det', NOTE: 'nota', EXT: 'ext', NR: 'nr' }[m[1]];
  return k < 0 ? { origen, valor: resto, detalle: null } : { origen, valor: resto.slice(0, k), detalle: resto.slice(k + 1) };
}
export function juntarCelda({ origen, valor, detalle }) {
  if (origen === 'dato' || origen === 'centinela') return valor;
  const pref = { det: 'DET:', nota: 'NOTE:', ext: 'EXT:', nr: 'NR:' }[origen];
  return pref + valor + (detalle === null ? '' : '|' + detalle);
}

// Adaptador: { query(sql, params), exec(sql), close() }
export async function conectar() {
  const url = process.env.AUTOLOFY_DB_URL;
  if (url) {
    const pg = (await import('pg')).default;
    const c = new pg.Client({ connectionString: url, ssl: { rejectUnauthorized: true } });
    await c.connect();
    return { query: async (s, p) => (await c.query(s, p)).rows, exec: s => c.query(s), close: () => c.end(), nombre: 'neon' };
  }
  const { PGlite } = await import('@electric-sql/pglite');
  const db = new PGlite();
  return { query: async (s, p) => (await db.query(s, p)).rows, exec: s => db.exec(s), close: () => db.close(), nombre: 'pglite local' };
}
