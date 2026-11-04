// Prueba de ida y vuelta: carga el repo en una base vacía y comprueba que lo exportado es IDÉNTICO a lo que hoy sirve el sitio.
import assert from 'node:assert/strict';
import { leer, constantes, conectar } from './lib.mjs';
import { cargar } from './cargar.mjs';
import * as X from './exportar.mjs';

const db = await conectar();
if (db.nombre === 'neon') { console.error('ida-y-vuelta corre solo con PGlite (no toca Neon)'); process.exit(2); }
await cargar(db);
const C = constantes(['DATA', 'LLAMADOS', 'VIDEOS', 'HISTORIAL_PRECIOS']);
const canon = o => JSON.stringify(o, (k, v) => v && typeof v === 'object' && !Array.isArray(v) ? Object.fromEntries(Object.entries(v).sort(([a], [b]) => a < b ? -1 : 1)) : v);
const chk = (n, a, b) => { assert.equal(canon(a), canon(b), n + ' no coincide'); console.log('ok', n); };

chk('DATA (todas las celdas)', await X.exportarDATA(db), C.DATA);
chk('LLAMADOS', await X.exportarLlamados(db), C.LLAMADOS);
chk('VIDEOS', await X.exportarVideos(db), C.VIDEOS);
chk('HISTORIAL_PRECIOS', await X.exportarHistorialUSD(db), C.HISTORIAL_PRECIOS);
chk('precios-historial.json', await X.exportarPrecios(db), JSON.parse(leer('precios-historial.json')).autos);

const conc = JSON.parse(leer('concesionarios.json'));
const hoy = await X.exportarPromosVigentes(db);
const orden = L => (L || []).map(p => canon({ ...p, autos: [...p.autos].sort() })).sort();   // el orden de los autos de una promo no importa
for (const [m, v] of Object.entries(conc.marcas)) assert.deepEqual(orden(hoy.marcas[m]), orden(v.promos), 'promos de ' + m);
conc.concesionarios.forEach((x, o) => assert.deepEqual(orden(hoy.locales[o]), orden(x.promos), 'promos del local ' + x.nombre));
console.log('ok promos vigentes (marcas y locales)');
const n = async t => (await db.query(`SELECT count(*)::int n FROM autolofy.${t}`))[0].n;
console.log({ celdas: await n('celda'), fuentes: await n('fuente_celda'), promos: await n('promo'), versiones: await n('promo_version'), concesionarios: await n('concesionario') });
await db.close();
