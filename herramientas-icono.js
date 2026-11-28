// Arma apple-touch-icon.png (180 × 180), el ícono que usa el iPhone al agregar el sitio a la pantalla de inicio.
// Uso (desde la raíz del repo, con tests/e2e instalado: cd tests/e2e && npm ci):
//   node herramientas-icono.js
// Sale de marca/icono-oscuro.svg, el mismo isologo del favicon, sin modificarlo: solo se le saca el redondeo
// del fondo, porque iOS redondea las esquinas por su cuenta y un PNG con esquinas transparentes las pinta de negro.
const fs = require('fs');
const path = require('path');
const { chromium } = require('./tests/e2e/node_modules/playwright');

const RAIZ = __dirname;
const svg = fs.readFileSync(path.join(RAIZ, 'marca', 'icono-oscuro.svg'), 'utf8').replace(/ rx="[^"]*"/, '');
if (!/<rect [^>]*fill="#0B110E"/.test(svg)) throw new Error('marca/icono-oscuro.svg cambió: revisá el fondo');
const LADO = 180;

(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: LADO, height: LADO }, deviceScaleFactor: 1 });
  await p.setContent(`<!doctype html><style>*{margin:0}svg{display:block;width:${LADO}px;height:${LADO}px}</style>${svg}`);
  await p.screenshot({ path: path.join(RAIZ, 'apple-touch-icon.png'), omitBackground: false });
  await b.close();
  console.log('apple-touch-icon.png listo');
})();
