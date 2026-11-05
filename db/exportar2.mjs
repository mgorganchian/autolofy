// Etapa 2: recompone desde la base las constantes de index.html (colores, fotos, service, impuestos, tasas).
const num = v => (v === null || v === undefined ? null : Number(v));
const arr = a => (a === null ? null : a.map(Number));

export async function exportarColores(db) {
  const A = await db.query('SELECT auto_slug,tiene_lista,fuente_url,tipo_fuente,nota,con_muestras FROM autolofy.color_auto');
  const C = await db.query('SELECT auto_slug,nombre,hex,hex_url FROM autolofy.color ORDER BY auto_slug,orden');
  const por = {};
  for (const c of C) (por[c.auto_slug] ||= []).push(c);
  const o = {};
  for (const a of A) {
    const x = {};
    if (a.tiene_lista) { x.c = (por[a.auto_slug] || []).map(c => c.nombre); x.f = a.fuente_url; x.d = a.tipo_fuente; } else x.c = null;
    if (a.nota !== null) x.n = a.nota;
    if (a.con_muestras) x.m = (por[a.auto_slug] || []).map(c => (c.hex ? [c.hex, c.hex_url] : null));
    o[a.auto_slug] = x;
  }
  return o;
}

export async function exportarFotos(db) {
  const autos = await db.query('SELECT slug FROM autolofy.auto ORDER BY orden');
  const F = await db.query('SELECT auto_slug,vista,credito FROM autolofy.foto ORDER BY auto_slug,orden');
  const por = {};
  for (const f of F) (por[f.auto_slug] ||= []).push(f);
  const n = {}, vistas = {}, creditos = {};
  for (const { slug } of autos) {
    const L = por[slug] || [];
    n[slug] = L.length; vistas[slug] = L.map(f => f.vista);
    if (L.some(f => f.credito !== null)) creditos[slug] = L.map(f => f.credito);
  }
  return { FOTOS_POR_AUTO: n, VISTAS_POR_FOTO: vistas, CREDITOS_POR_FOTO: creditos };
}

export async function exportarService(db) {
  const M = await db.query('SELECT marca,fuentes,consultado::text c,moneda,iva,vigencia,alcance,publica FROM autolofy.service_marca');
  const marcas = {};
  for (const m of M) marcas[m.marca] = { f: m.fuentes, c: m.c, mon: m.moneda, iva: m.iva, v: m.vigencia, alc: m.alcance, ...(m.publica !== null ? { pub: m.publica } : {}) };
  const A = await db.query('SELECT auto_slug,marca,nota FROM autolofy.service_auto');
  const V = await db.query('SELECT auto_slug,km,meses,monto,sin_cargo FROM autolofy.service_visita ORDER BY auto_slug,orden');
  const autos = {};
  for (const a of A) autos[a.auto_slug] = { m: a.marca, r: [], ...(a.nota !== null ? { n: a.nota } : {}) };
  for (const v of V) autos[v.auto_slug].r.push([v.km, v.meses, v.sin_cargo ? 'Sin cargo' : Number(v.monto)]);
  return { SERVICE_MARCAS: marcas, SERVICE_OFICIAL: autos };
}

export async function exportarImpuestos(db) {
  const [n] = await db.query('SELECT consultado::text c,patente_consultada::text pc,arancel_pct,arancel_ruv_pct,arancel_fuente,form01_monto,form01_fuente FROM autolofy.impuesto_nacional');
  const P = await db.query('SELECT * FROM autolofy.impuesto_provincia');
  const prov = {};
  for (const p of P) {
    const v = { s: num(p.sellado_pct), sf: p.sellado_fuente, sb: p.sellado_base, pe: p.patente_electricos, ph: p.patente_hibridos, pf: p.patente_fuente, pa: num(p.patente_pct), pac: p.patente_calidad, paf: p.patente_calidad_fuente, pan: p.patente_nota };
    if (p.factor_electricos !== null) v.pme = arr(p.factor_electricos);
    if (p.factor_hibridos !== null) v.pmh = arr(p.factor_hibridos);
    if (p.patente_beneficio_nota !== null) v.pbn = p.patente_beneficio_nota;
    if (p.sellado_nota !== null) v.sn = p.sellado_nota;
    if (p.sellado_electricos !== null) v.sev = num(p.sellado_electricos);
    if (p.sellado_hibridos !== null) v.shev = num(p.sellado_hibridos);
    prov[p.provincia] = v;
  }
  return { c: n.c, dnrpa: { p: num(n.arancel_pct), ruv: num(n.arancel_ruv_pct), f: n.arancel_fuente }, form: { imp: num(n.form01_monto), f: n.form01_fuente }, prov, pc: n.pc };
}

export async function exportarTasas(db) {
  const [c] = await db.query('SELECT fecha::text f,fuente FROM autolofy.tasa_consulta');
  const L = await db.query('SELECT entidad,nombre,moneda,tasa,tea,cft,plazo,territorio,beneficio,informada::text f,tipo FROM autolofy.tasa_linea ORDER BY orden');
  return { fecha: c.f, fuente: c.fuente, lineas: L.map(l => ({ e: l.entidad, n: l.nombre, mon: l.moneda, tasa: l.tasa, tea: num(l.tea), cft: num(l.cft), plazo: l.plazo, terr: l.territorio, ben: l.beneficio, f: l.f, tipo: l.tipo })) };
}
