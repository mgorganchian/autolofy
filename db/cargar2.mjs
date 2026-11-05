// Etapa 2: colores, fotos, service oficial, impuestos, tasas, logos y fotos descartadas (repo → base).
// Uso suelto sobre una base que ya tiene la etapa 1: node cargar.mjs --etapa2
import fs from 'node:fs';
import path from 'node:path';
import { leer, constantes, RAIZ } from './lib.mjs';

export const filasTsv = f => leer(f).split('\n').filter(l => l && !l.startsWith('#')).map(l => l.split('\t'));

export async function cargarEtapa2(db) {
  await db.exec(fs.readFileSync(path.join(RAIZ, 'db', 'schema-etapa2.sql'), 'utf8'));
  await db.exec('SET search_path = autolofy, public');
  const C = constantes(['COLORES_AR', 'FOTOS_POR_AUTO', 'VISTAS_POR_FOTO', 'CREDITOS_POR_FOTO', 'SERVICE_MARCAS', 'SERVICE_OFICIAL', 'IMPUESTOS_AR', 'TASAS_BCRA']);
  const ins = (sql, p) => db.query(sql, p);

  for (const [slug, x] of Object.entries(C.COLORES_AR)) {
    await ins('INSERT INTO color_auto(auto_slug,tiene_lista,fuente_url,tipo_fuente,nota,con_muestras) VALUES($1,$2,$3,$4,$5,$6)',
      [slug, x.c !== null, x.f ?? null, x.d ?? null, x.n ?? null, 'm' in x]);
    for (const [o, nombre] of (x.c || []).entries()) {
      const m = x.m ? x.m[o] : null;
      await ins('INSERT INTO color(auto_slug,orden,nombre,hex,hex_url) VALUES($1,$2,$3,$4,$5)', [slug, o, nombre, m?.[0] ?? null, m?.[1] ?? null]);
    }
  }
  for (const [slug, n] of Object.entries(C.FOTOS_POR_AUTO)) for (let o = 0; o < n; o++)
    await ins('INSERT INTO foto(auto_slug,orden,vista,credito) VALUES($1,$2,$3,$4)', [slug, o, C.VISTAS_POR_FOTO[slug][o], C.CREDITOS_POR_FOTO[slug]?.[o] ?? null]);
  for (const [archivo, slug, motivo, fecha] of filasTsv('fotos-descartadas.tsv'))
    await ins('INSERT INTO foto_descartada(archivo_commons,auto_slug,motivo,fecha) VALUES($1,$2,$3,$4)', [archivo, slug, motivo, fecha]);
  for (const l of leer('logos-fuentes.tsv').split('\n').slice(1).filter(Boolean)) {
    const [archivo, marca, commons, licencia, autor, pagina, desde, origen] = l.split('\t');
    await ins('INSERT INTO logo VALUES($1,$2,$3,$4,$5,$6,$7,$8)', [archivo, marca, commons || null, licencia || null, autor || null, pagina || null, desde || null, origen]);
  }

  for (const [m, s] of Object.entries(C.SERVICE_MARCAS))
    await ins('INSERT INTO service_marca VALUES($1,$2,$3,$4,$5,$6,$7,$8)', [m, s.f, s.c, s.mon, s.iva, s.v, s.alc, s.pub ?? null]);
  for (const [slug, s] of Object.entries(C.SERVICE_OFICIAL)) {
    await ins('INSERT INTO service_auto VALUES($1,$2,$3)', [slug, s.m, s.n ?? null]);
    for (const [o, [km, meses, monto]] of s.r.entries())
      await ins('INSERT INTO service_visita VALUES($1,$2,$3,$4,$5,$6)', [slug, o, km, meses, typeof monto === 'number' ? monto : null, typeof monto !== 'number']);
  }

  const I = C.IMPUESTOS_AR;
  await ins('INSERT INTO impuesto_nacional(consultado,patente_consultada,arancel_pct,arancel_ruv_pct,arancel_fuente,form01_monto,form01_fuente) VALUES($1,$2,$3,$4,$5,$6,$7)',
    [I.c, I.pc, I.dnrpa.p, I.dnrpa.ruv, I.dnrpa.f, I.form.imp, I.form.f]);
  for (const [p, v] of Object.entries(I.prov))
    await ins(`INSERT INTO impuesto_provincia(provincia,sellado_pct,sellado_fuente,sellado_base,patente_electricos,patente_hibridos,patente_fuente,patente_pct,patente_calidad,patente_calidad_fuente,patente_nota,factor_electricos,factor_hibridos,patente_beneficio_nota,sellado_nota,sellado_electricos,sellado_hibridos)
      VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)`,
      [p, v.s, v.sf, v.sb, v.pe, v.ph, v.pf, v.pa, v.pac, v.paf, v.pan, v.pme ?? null, v.pmh ?? null, v.pbn ?? null, v.sn ?? null, v.sev ?? null, v.shev ?? null]);

  const T = C.TASAS_BCRA;
  await ins('INSERT INTO tasa_consulta(fecha,fuente) VALUES($1,$2)', [T.fecha, T.fuente]);
  for (const [o, l] of T.lineas.entries())
    await ins('INSERT INTO tasa_linea VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)', [o, l.e, l.n, l.mon, l.tasa, l.tea, l.cft, l.plazo, l.terr, l.ben, l.f, l.tipo]);

  const fuentes = await cargarFuentes(db);

  return { fuentes, colores: Object.keys(C.COLORES_AR).length, fotos: Object.values(C.FOTOS_POR_AUTO).reduce((a, b) => a + b, 0), service: Object.keys(C.SERVICE_OFICIAL).length, provincias: Object.keys(I.prov).length, tasas: T.lineas.length };
}

// fotos-fuentes.tsv y fichas-fuentes.tsv. Una fila de fichas-fuentes es de commons si trae 5 campos y el quinto es una página de Commons;
// de ficha si trae 5 y no; oficial si trae 2 o 3.
export async function cargarFuentes(db) {
  await db.exec(fs.readFileSync(path.join(RAIZ, 'db', 'schema-etapa2b.sql'), 'utf8'));
  await db.exec('SET search_path = autolofy, public');
  const slugDe = new Map((await db.query('SELECT nombre, slug FROM autolofy.auto')).map(a => [a.nombre, a.slug]));
  for (const f of filasTsv('fotos-fuentes.tsv'))
    await db.query('INSERT INTO foto_fuente VALUES($1,$2,$3,$4,$5,$6)', f);
  const n = { ficha: 0, commons: 0, oficial: 0 };
  for (const [linea, c] of filasTsv('fichas-fuentes.tsv').entries()) {
    const slug = slugDe.get(c[0]) ?? null;
    if (c.length === 5 && c[4].startsWith('https://commons.wikimedia.org/')) {
      await db.query('INSERT INTO portada_commons VALUES($1,$2,$3,$4,$5,$6,$7)', [linea, c[0], slug, c[1], c[2], c[3], c[4]]); n.commons++;
    } else if (c.length === 5) {
      await db.query('INSERT INTO ficha_fuente VALUES($1,$2,$3,$4,$5,$6,$7,$8)', [linea, c[0], slug, c[1], c[2], c[3], /^[0-9a-f]{64}$/.test(c[3]) ? c[3] : null, c[4]]); n.ficha++;
    } else if (c.length === 2 || c.length === 3) {
      await db.query('INSERT INTO portada_oficial VALUES($1,$2,$3,$4,$5)', [linea, c[0], slug, c[1], c[2] ?? null]); n.oficial++;
    } else throw new Error('fichas-fuentes.tsv: fila con ' + c.length + ' campos: ' + c[0]);
  }
  return { fotoFuentes: filasTsv('fotos-fuentes.tsv').length, ...n };
}
