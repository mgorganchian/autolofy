// Arma og.jpg, la vista previa al compartir la portada (1200 × 630), con el logo de Autograma y 8 portadas.
// Uso (desde la raíz del repo, con tests/e2e instalado: cd tests/e2e && npm ci):
//   node herramientas-og.js
// Las portadas tienen que ser fotos oficiales de la marca: las de Commons piden nombrar al autor y la imagen
// no tiene lugar para el crédito. El script se niega a usar una portada con crédito de Commons.
// La letra es la Barlow que index.html trae embebida, así la imagen se ve como el sitio.
const fs = require('fs');
const os = require('os');
const path = require('path');
const { chromium } = require('./tests/e2e/node_modules/playwright');

const RAIZ = __dirname;
const AUTOS = ['ford-territory-hibrida', 'baic-bj30-4x4', 'peugeot-2008', 'honda-hr-v-exl',
  'byd-dolphin-mini', 'volkswagen-t-cross-highline', 'fiat-cronos-precision', 'chevrolet-captiva-phev'];

const index = fs.readFileSync(path.join(RAIZ, 'index.html'), 'utf8');
const fuentes = (index.slice(0, index.indexOf('</style>')).match(/@font-face\{[^}]*\}/g) || []).join('\n');
if (!fuentes) throw new Error('no encontré las @font-face de index.html');
for (const s of AUTOS) {
  const tag = (index.match(new RegExp(`<img class="car-photo" data-slug="${s}"[^>]*>`)) || [])[0];
  if (!tag) throw new Error(`no está el auto ${s}`);
  const cred = (tag.match(/data-credito="([^"]*)"/) || [])[1] || '';
  if (/Commons|CC /.test(cred)) throw new Error(`la portada de ${s} es de Commons (${cred}): elegí otra`);
  if (!fs.existsSync(path.join(RAIZ, 'fotos', `${s}-1.jpg`))) throw new Error(`falta fotos/${s}-1.jpg`);
}
const url = p => 'file://' + path.join(RAIZ, p);
const html = `<!doctype html><html lang="es"><head><meta charset="utf-8"><style>${fuentes}
*{box-sizing:border-box;margin:0}
body{width:1200px;height:630px;background:#141B18;color:#E4EAE6;font-family:'Barlow',sans-serif;padding:34px 40px 0;overflow:hidden}
.cab{display:flex;align-items:flex-end;justify-content:space-between;height:150px}
.logo{height:74px;display:block;margin:0 0 14px -6px}
.sub{font:600 30px/1.15 'Barlow',sans-serif}
.sub2{font:400 22px/1.3 'Barlow',sans-serif;color:#9DB3A8;margin-top:6px}
.der{text-align:right;font:700 20px/1.25 'Barlow Semi Condensed',sans-serif;letter-spacing:.06em;color:#9DB3A8;text-transform:uppercase;padding-bottom:4px}
.grid{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-top:26px}
.t{background:#fff;height:178px;border-radius:2px;display:flex;align-items:center;justify-content:center;overflow:hidden}
.t img{width:100%;height:100%;object-fit:contain;padding:6px}
</style></head><body>
<div class="cab"><div><img class="logo" src="${url('marca/autograma-oscuro.svg')}" alt="Autograma">
<div class="sub">Comparativo de autos 0 km en Argentina</div>
<div class="sub2">Precios, fichas técnicas oficiales, ranking y concesionarios</div></div>
<div class="der">Nafteros, híbridos y eléctricos<br>Cada dato con su fuente</div></div>
<div class="grid">${AUTOS.map(s => `<div class="t"><img src="${url(`fotos/${s}-1.jpg`)}" alt=""></div>`).join('')}</div>
</body></html>`;

(async () => {
  const tmp = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'og-')), 'og.html');
  fs.writeFileSync(tmp, html);
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
  await p.goto('file://' + tmp);
  await p.evaluate(() => document.fonts.ready);
  await p.waitForFunction(() => [...document.images].every(i => i.complete && i.naturalWidth > 0));
  await p.screenshot({ path: path.join(RAIZ, 'og.jpg'), type: 'jpeg', quality: 85 });
  await b.close();
  fs.rmSync(path.dirname(tmp), { recursive: true, force: true });
  console.log('og.jpg listo');
})();
