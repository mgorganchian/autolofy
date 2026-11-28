// Arma los íconos del sitio para la pantalla de inicio desde marca/icono-oscuro.svg, el isologo del favicon,
// sin cambiar el dibujo. Uso (desde la raíz del repo, con tests/e2e instalado: cd tests/e2e && npm ci):
//   node herramientas-icono.js
// - apple-touch-icon.png (180): el que usa el iPhone (Safari y Chrome). Sin el redondeo del fondo, porque iOS
//   redondea las esquinas por su cuenta y un PNG con esquinas transparentes las pinta de negro.
// - icono-192.png e icono-512.png: los de manifest.webmanifest para Chrome en Android y en la computadora, tal cual el SVG.
// - icono-maskable-512.png: el de Android con forma adaptable (círculo, gota…), que recorta los bordes: fondo entero
//   y el dibujo achicado al 80% en el centro, para que la A y la curva queden dentro de la zona segura.
const fs = require('fs');
const path = require('path');
const { chromium } = require('./tests/e2e/node_modules/playwright');

const RAIZ = __dirname;
const svg = fs.readFileSync(path.join(RAIZ, 'marca', 'icono-oscuro.svg'), 'utf8');
if (!/<rect [^>]*fill="#0B110E"/.test(svg) || !/<g /.test(svg)) throw new Error('marca/icono-oscuro.svg cambió: revisá el fondo');
const sinRedondeo = svg.replace(/ rx="[^"]*"/, '');
const vb = svg.match(/viewBox="([^"]+)"/)[1].split(/\s+/).map(Number);
const cx = vb[0] + vb[2] / 2, cy = vb[1] + vb[3] / 2;
const maskable = sinRedondeo.replace('<g ', `<g transform="translate(${cx} ${cy}) scale(.8) translate(${-cx} ${-cy})" `);

const ICONOS = [
  ['apple-touch-icon.png', 180, sinRedondeo],
  ['icono-192.png', 192, svg],
  ['icono-512.png', 512, svg],
  ['icono-maskable-512.png', 512, maskable],
];

(async () => {
  const b = await chromium.launch();
  for (const [archivo, lado, dibujo] of ICONOS) {
    const p = await b.newPage({ viewport: { width: lado, height: lado }, deviceScaleFactor: 1 });
    await p.setContent(`<!doctype html><style>*{margin:0}html,body{background:transparent}svg{display:block;width:${lado}px;height:${lado}px}</style>${dibujo}`);
    await p.screenshot({ path: path.join(RAIZ, archivo), omitBackground: true });
    await p.close();
    console.log(archivo, 'listo');
  }
  await b.close();
})();
