// Prueba de ida y vuelta: carga el repo en una base vacía y comprueba que lo exportado es IDÉNTICO a lo que hoy sirve el sitio.
import assert from 'node:assert/strict';
import { leer, constantes, conectar } from './lib.mjs';
import { cargar } from './cargar.mjs';
import * as X from './exportar.mjs';
import * as X2 from './exportar2.mjs';
import { filasTsv } from './cargar2.mjs';

const db = await conectar();
if (db.nombre === 'neon') { console.error('ida-y-vuelta corre solo con PGlite (no toca Neon)'); process.exit(2); }
await cargar(db);
const C = constantes(['DATA', 'LLAMADOS', 'VIDEOS', 'HISTORIAL_PRECIOS', 'COLORES_AR', 'FOTOS_POR_AUTO', 'VISTAS_POR_FOTO', 'CREDITOS_POR_FOTO', 'SERVICE_MARCAS', 'SERVICE_OFICIAL', 'IMPUESTOS_AR', 'TASAS_BCRA']);
const canon = o => JSON.stringify(o, (k, v) => v && typeof v === 'object' && !Array.isArray(v) ? Object.fromEntries(Object.entries(v).sort(([a], [b]) => a < b ? -1 : 1)) : v);
const chk = (n, a, b) => { assert.equal(canon(a), canon(b), n + ' no coincide'); console.log('ok', n); };

chk('DATA (todas las celdas)', await X.exportarDATA(db), C.DATA);
chk('LLAMADOS', await X.exportarLlamados(db), C.LLAMADOS);
chk('VIDEOS', await X.exportarVideos(db), C.VIDEOS);
chk('HISTORIAL_PRECIOS', await X.exportarHistorialUSD(db), C.HISTORIAL_PRECIOS);
chk('precios-historial.json', await X.exportarPrecios(db), JSON.parse(leer('precios-historial.json')).autos);

chk('COLORES_AR', await X2.exportarColores(db), C.COLORES_AR);
const F = await X2.exportarFotos(db);
chk('FOTOS_POR_AUTO', F.FOTOS_POR_AUTO, C.FOTOS_POR_AUTO);
chk('VISTAS_POR_FOTO', F.VISTAS_POR_FOTO, C.VISTAS_POR_FOTO);
chk('CREDITOS_POR_FOTO', F.CREDITOS_POR_FOTO, C.CREDITOS_POR_FOTO);
const S = await X2.exportarService(db);
chk('SERVICE_MARCAS', S.SERVICE_MARCAS, C.SERVICE_MARCAS);
chk('SERVICE_OFICIAL', S.SERVICE_OFICIAL, C.SERVICE_OFICIAL);
chk('IMPUESTOS_AR', await X2.exportarImpuestos(db), C.IMPUESTOS_AR);
chk('TASAS_BCRA', await X2.exportarTasas(db), C.TASAS_BCRA);
const desc = await db.query('SELECT archivo_commons,auto_slug,motivo,fecha::text f FROM autolofy.foto_descartada ORDER BY id');
chk('fotos-descartadas.tsv', desc.map(d => [d.archivo_commons, d.auto_slug, d.motivo, d.f]), filasTsv('fotos-descartadas.tsv'));
chk('logos-fuentes.tsv', (await db.query('SELECT * FROM autolofy.logo ORDER BY archivo')).length, leer('logos-fuentes.tsv').split('\n').slice(1).filter(Boolean).length);

const conc = JSON.parse(leer('concesionarios.json'));
const hoy = await X.exportarPromosVigentes(db);
const orden = L => (L || []).map(p => canon({ ...p, autos: [...p.autos].sort() })).sort();   // el orden de los autos de una promo no importa
for (const [m, v] of Object.entries(conc.marcas)) assert.deepEqual(orden(hoy.marcas[m]), orden(v.promos), 'promos de ' + m);
conc.concesionarios.forEach((x, o) => assert.deepEqual(orden(hoy.locales[o]), orden(x.promos), 'promos del local ' + x.nombre));
console.log('ok promos vigentes (marcas y locales)');
const n = async t => (await db.query(`SELECT count(*)::int n FROM autolofy.${t}`))[0].n;
console.log({ celdas: await n('celda'), fuentes: await n('fuente_celda'), promos: await n('promo'), versiones: await n('promo_version'), concesionarios: await n('concesionario') });
await db.close();
