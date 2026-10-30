// El dólar billete vendedor del Banco Nación, para que la página lo use al cargar (2026-10-30, pedido
// de Mati: que la cotización esté al día sin PRs diarios). Devuelve un JavaScript que define
// window.DOLAR_VIVO = {venta, fecha, fuente}; index.html lo carga con <script src="/api/dolar"> justo
// antes de su script principal, y si no llega o no es razonable usa la cotización embebida
// (DOLAR_BNA_EMBEBIDO). bna.com.ar no deja que otra página lea su contenido (sin CORS), por eso
// se lee acá, en el servidor. Vercel guarda la respuesta 30 minutos: el banco recibe a lo sumo un
// pedido cada media hora. La lectura es la misma que la de herramientas-dolar.py.
const FUENTE = 'https://www.bna.com.ar/Personas';

async function cotizacion() {
  const r = await fetch(FUENTE, { headers: { 'User-Agent': 'autolofy-dolar (https://autolofy.vercel.app)' }, signal: AbortSignal.timeout(8000) });
  if (!r.ok) throw new Error('BNA respondió ' + r.status);
  const html = await r.text();
  const i = html.indexOf('id="billetes"');
  if (i < 0) throw new Error('sin tabla de billetes');
  const tabla = html.slice(i, html.indexOf('</table>', i));
  const f = tabla.match(/class="fechaCot">\s*(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  const v = tabla.match(/Dolar U\.S\.A<\/td>\s*<td>\s*([\d.,]+)\s*<\/td>\s*<td>\s*([\d.,]+)\s*<\/td>/);
  if (!f || !v) throw new Error('sin fecha o sin fila Dolar U.S.A');
  const venta = Number(v[2].replace(/\./g, '').replace(',', '.'));
  if (!(venta >= 100 && venta <= 100000)) throw new Error('cotización fuera de rango: ' + venta);
  return { venta, fecha: `${f[3]}-${f[2].padStart(2, '0')}-${f[1].padStart(2, '0')}`, fuente: FUENTE };
}

module.exports = async (req, res) => {
  res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
  try {
    const d = await cotizacion();
    res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=1800, stale-while-revalidate=86400');
    res.status(200).send('window.DOLAR_VIVO=' + JSON.stringify(d) + ';');
  } catch (e) {
    // Sin cotización: la página usa la embebida. Se cachea poco para reintentar pronto.
    res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=60');
    res.status(200).send('/* sin cotización en vivo: ' + String(e.message).replace(/\*\//g, '') + ' */');
  }
};
