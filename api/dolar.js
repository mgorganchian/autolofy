// El dólar billete vendedor del Banco Nación, para que la página lo use al cargar (2026-10-30, pedido
// de Mati: que la cotización esté al día sin PRs diarios). Devuelve un JavaScript que define
// window.DOLAR_VIVO = {venta, fecha, fuente}; index.html lo carga con <script src="/api/dolar"> justo
// antes de su script principal, y si no llega o no es razonable usa la cotización embebida
// (DOLAR_BNA_EMBEBIDO).
//
// De dónde sale (2026-11-05, pedido de Mati: que cada repo lea la base compartida en lugar de bajar lo
// mismo por su cuenta): de la base macroeconomia, esquema v1, serie ar.dolar.oficial.venta. Es el dólar
// oficial minorista vendedor que ArgentinaDatos toma de la tabla «Billetes» del BNA (los mismos valores
// que leía esta función de bna.com.ar), y la base lo carga dos veces por día, a las 09:00 y a las 19:00
// de Argentina. ArgentinaDatos fecha cada valor el día en que lo toma: un sábado trae el cierre del
// viernes con fecha del sábado.
//
// La cadena de conexión es la variable MACRO_DATABASE_URL de Vercel (rol de solo lectura
// lector_autolofy, host con pooler); nunca va en el repo. Si la base no responde, la respuesta no dice
// por qué (podría nombrar el host): la página usa la embebida. Vercel guarda la respuesta una hora: la
// base recibe a lo sumo un pedido por hora. herramientas-dolar.py lee lo mismo para la embebida.
const { Client } = require('pg');

const SERIE = 'ar.dolar.oficial.venta';
const FUENTE = 'https://www.bna.com.ar/Personas';
const CONSULTA = `SELECT to_char(fecha, 'YYYY-MM-DD') AS fecha, valor::float8 AS venta
  FROM v1.valor_al($1, (now() AT TIME ZONE 'America/Argentina/Buenos_Aires')::date)`;

async function cotizacion() {
  if (!process.env.MACRO_DATABASE_URL) throw new Error('falta MACRO_DATABASE_URL');
  const db = new Client({
    connectionString: process.env.MACRO_DATABASE_URL,
    connectionTimeoutMillis: 8000,
    query_timeout: 8000,
    application_name: 'autolofy-api-dolar',
  });
  await db.connect();
  try {
    const { rows } = await db.query(CONSULTA, [SERIE]);
    const d = rows[0];
    if (!d || d.venta == null) throw new Error('la serie no tiene valores');
    if (!(d.venta >= 100 && d.venta <= 100000)) throw new Error('cotización fuera de rango');
    return { venta: d.venta, fecha: d.fecha, fuente: FUENTE };
  } finally {
    await db.end().catch(() => {});
  }
}

module.exports = async (req, res) => {
  res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
  try {
    const d = await cotizacion();
    res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=3600, stale-while-revalidate=86400');
    res.status(200).send('window.DOLAR_VIVO=' + JSON.stringify(d) + ';');
  } catch (e) {
    // Sin cotización: la página usa la embebida. Se cachea poco para reintentar pronto. El log lleva
    // solo el código del error, nunca el mensaje, que puede nombrar el host o el rol.
    console.error('api/dolar sin cotización:', (e && e.code) || 'sin código');
    res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=60');
    res.status(200).send('/* sin cotización en vivo */');
  }
};
