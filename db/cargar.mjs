// Carga TODO lo de la etapa 1 desde el repo a la base (vacía). Uso: node cargar.mjs   (usa AUTOLOFY_DB_URL si existe; si no, PGlite)
import fs from 'node:fs';
import { leer, constantes, slugsDelHtml, partirCelda, conectar, RAIZ } from './lib.mjs';
import path from 'node:path';
import { cargarEtapa2 } from './cargar2.mjs';

export async function cargar(db) {
  await db.exec(fs.readFileSync(path.join(RAIZ, 'db', 'schema.sql'), 'utf8'));
  await db.exec('SET search_path = autolofy, public');
  const C = constantes(['DATA', 'CARS', 'MARCAS_INFO', 'LLAMADOS', 'VIDEOS', 'HISTORIAL_PRECIOS', 'VENTAS_MARCAS']);
  const slugs = slugsDelHtml();
  const conc = JSON.parse(leer('concesionarios.json'));
  const ins = async (sql, p) => db.query(sql, p);

  // marcas
  const marcas = new Set([...C.CARS.map(c => c.brand), ...Object.keys(C.MARCAS_INFO), ...Object.keys(conc.marcas), ...conc.concesionarios.flatMap(x => x.marcas)]);
  for (const m of [...marcas].sort()) {
    const i = C.MARCAS_INFO[m] || {};
    await ins('INSERT INTO marca(nombre,grupo,relacion,info) VALUES($1,$2,$3,$4)', [m, i.grupo ?? null, i.relacion ?? null, JSON.stringify(i)]);
  }
  // autos
  for (const [k, c] of C.CARS.entries())
    await ins('INSERT INTO auto(slug,orden,nombre,nombre_corto,marca,tipo,segmento,carroceria,estado) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)',
      [slugs[k], k, c.name, c.short, c.brand, c.type, c.size, c.body, c.status]);
  // categorías, filas, celdas
  const filaId = {};
  for (const [ci, [cat, filas]] of C.DATA.entries()) {
    const [{ id }] = await ins('INSERT INTO categoria(orden,nombre) VALUES($1,$2) RETURNING id', [ci, cat]);
    for (const [fi, f] of filas.entries()) {
      const [{ id: fid }] = await ins('INSERT INTO fila(categoria_id,orden,nombre) VALUES($1,$2,$3) RETURNING id', [id, fi, f[0]]);
      filaId[f[0]] = fid;
      const vals = [], ps = [];
      for (let k = 1; k < f.length; k++) {
        const p = partirCelda(f[k]);
        ps.push(`($${vals.length + 1},$${vals.length + 2},$${vals.length + 3},$${vals.length + 4},$${vals.length + 5})`);
        vals.push(slugs[k - 1], fid, p.origen, p.valor, p.detalle);
      }
      await ins(`INSERT INTO celda(auto_slug,fila_id,origen,valor,detalle) VALUES ${ps.join(',')}`, vals);
    }
  }
  // fuente de cada celda (datos-fuentes.tsv): slug, fila, valor visible, tipo, fuente, url, sha, fecha
  for (const l of leer('datos-fuentes.tsv').split('\n')) {
    if (!l || l.startsWith('#') || l.startsWith('slug\t')) continue;
    const [slug, fila, , tipo, fuente, url, sha, fecha] = l.split('\t');
    if (!filaId[fila]) throw new Error('fila desconocida en datos-fuentes.tsv: ' + fila);
    await ins('INSERT INTO fuente_celda(auto_slug,fila_id,tipo,fuente,url,sha256,fecha) VALUES($1,$2,$3,$4,$5,$6,$7)', [slug, filaId[fila], tipo, fuente, url, sha, fecha]);
  }
  // precios
  const ph = JSON.parse(leer('precios-historial.json')).autos;
  for (const [slug, L] of Object.entries(ph)) for (const e of L)
    await ins('INSERT INTO precio_historial(auto_slug,desde,moneda,monto,version) VALUES($1,$2,$3,$4,$5)', [slug, e.desde, e.moneda, e.monto, e.version]);
  for (const [slug, L] of Object.entries(C.HISTORIAL_PRECIOS)) for (const [fecha, usd, version, url] of L)
    await ins('INSERT INTO precio_lista_usd(auto_slug,fecha,usd,version,url) VALUES($1,$2,$3,$4,$5)', [slug, fecha, usd, version, url]);
  // llamados y videos
  for (const [slug, L] of Object.entries(C.LLAMADOS)) for (const x of L)
    await ins('INSERT INTO llamado(auto_slug,fecha,fecha_dudosa,modelo,descripcion) VALUES($1,$2,$3,$4,$5)', [slug, x.f, !!x.dud, x.mod, x.d]);
  for (const [slug, L] of Object.entries(C.VIDEOS)) for (const [o, v] of L.entries()) {
    const { canal, id, t, f, s, tipo, ...extra } = v;
    await ins('INSERT INTO video(auto_slug,youtube_id,orden,canal,titulo,fecha,duracion_s,tipo,extra) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)', [slug, id, o, canal, t, f, s, tipo ?? null, JSON.stringify(extra)]);
  }
  for (const [anio, L] of Object.entries(C.VENTAS_MARCAS)) for (const [m, u] of L)
    await ins('INSERT INTO venta_marca(anio,marca,unidades) VALUES($1,$2,$3)', [+anio, m, u]);
  // concesionarios y redes
  for (const [m, v] of Object.entries(conc.marcas))
    await ins('INSERT INTO red_marca(marca,fuente_red,total,nota,aviso,promos_consultado) VALUES($1,$2,$3,$4,$5,$6)', [m, v.fuente_red || [], v.total ?? null, v.nota ?? null, v.aviso ?? null, v.promos_consultado ?? null]);
  const idLocal = [];
  for (const [o, x] of conc.concesionarios.entries()) {
    const [{ id }] = await ins(`INSERT INTO concesionario(orden,nombre,provincia,ciudad,direccion,telefono,whatsapp,email,web,horarios,servicios,fuente,consultado,lat,lon,geo,partido,localidad,nota)
      VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19) RETURNING id`,
      [o, x.nombre, x.provincia, x.ciudad || '', x.direccion || '', x.telefono || '', x.whatsapp || '', x.email || '', x.web || '', x.horarios || '', x.servicios || [], x.fuente, x.consultado, x.lat ?? null, x.lon ?? null, x.geo ?? null, x.partido ?? null, x.localidad ?? null, x.nota ?? null]);
    idLocal.push(id);
    for (const m of x.marcas) await ins('INSERT INTO concesionario_marca VALUES($1,$2)', [id, m]);
  }
  // promos (historial + estado actual)
  const H = JSON.parse(leer('promos-historial.json')).promos;
  // «consultado» de cada promo vigente sale de concesionarios.json (no de ultima_vez): misma identidad que herramientas-promos.py
  const consultadoDe = {}, cont = {};
  const regis = (donde, p) => { let k = [donde, p.tipo || '', [...(p.autos || [])].sort().join(','), p.version || '', (p.fuente || [''])[0]].join('|'); cont[k] = (cont[k] || 0) + 1; if (cont[k] > 1) k += '#' + cont[k]; consultadoDe[k] = p.consultado; };
  for (const [m, v] of Object.entries(conc.marcas)) for (const p of v.promos || []) regis('marca:' + m, p);
  for (const x of conc.concesionarios) for (const p of x.promos || []) regis('local:' + x.nombre + '|' + (x.ciudad || ''), p);
  const porNombre = {};
  conc.concesionarios.forEach((x, o) => (porNombre[x.nombre + '|' + (x.ciudad || '')] ||= []).push(o));
  let nPromos = 0;
  for (const e of H) {
    let marca = null, local = null;
    if (e.donde.startsWith('marca:')) marca = e.donde.slice(6);
    else {
      let L = porNombre[e.donde.slice(6)];
      if (!L) throw new Error('local inexistente: ' + e.donde);
      if (L.length > 1) {   // mismo nombre y ciudad en dos direcciones: el que hoy publica esa promo
        const hoy = L.filter(o => (conc.concesionarios[o].promos || []).some(p => p.tipo === e.tipo && p.fuente[0] === e.fuente[0]));
        if (hoy.length !== 1) console.warn('aviso: local ambiguo, se usa el primero:', e.donde);
        L = hoy.length === 1 ? hoy : [L[0]];
      }
      local = idLocal[L[0]];
    }
    const ult = e.versiones[e.versiones.length - 1];
    const [{ id }] = await ins(`INSERT INTO promo(clave,marca,concesionario_id,tipo,todos_los_autos,version_auto,fuente,visto_desde,consultado,ultima_vez,estado,retirada_el)
      VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING id`,
      [e.id, marca, local, e.tipo, e.autos.includes('*'), e.version || null, e.fuente, e.visto_desde, consultadoDe[e.id] ?? e.ultima_vez, e.ultima_vez, e.estado, e.retirada_el]);
    for (const a of e.autos.filter(a => a !== '*')) await ins('INSERT INTO promo_auto VALUES($1,$2)', [id, a]);
    for (const v of e.versiones) await ins('INSERT INTO promo_version(promo_id,desde,texto,precio_moneda,precio_monto,descuento_moneda,descuento_monto,vigencia) VALUES($1,$2,$3,$4,$5,$6,$7,$8)',
      [id, v.desde, v.texto, v.precio?.moneda ?? null, v.precio?.monto ?? null, v.descuento?.moneda ?? null, v.descuento?.monto ?? null, v.vigencia ?? null]);
    nPromos++;
  }
  return { autos: C.CARS.length, promos: nPromos, etapa2: await cargarEtapa2(db) };
}

if (process.argv[1].endsWith('cargar.mjs')) {
  const db = await conectar();
  console.log('base:', db.nombre, process.argv.includes('--etapa2') ? { etapa2: await cargarEtapa2(db) } : await cargar(db));   // --etapa2: solo lo nuevo, sobre una base que ya tiene la etapa 1
  await db.close();
}
