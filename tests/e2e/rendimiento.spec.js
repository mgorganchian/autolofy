// Rendimiento al cargar (2026-11-26, auditoría con Impeccable). La vista Tabla saltaba 0,73 de CLS en la computadora: los botones de
// categorías los creaba el script después del primer pintado y empujaban la tabla (y el pie, que se veía porque el cuerpo estaba
// vacío), y la letra Barlow reacomodaba esos botones al llegar. Ahora los botones vienen en el HTML (los escribe herramientas-paginas.py),
// se muestran cuando la letra está lista y el cuerpo ocupa la pantalla mientras el script arma las filas.
const { test, expect } = require('@playwright/test');
const { vigilarErrores } = require('./helpers');

let errores;
test.beforeEach(({ page }) => { errores = vigilarErrores(page); });
test.afterEach(() => expect(errores).toEqual([]));

const medirCLS = () => { window.__cls = 0; new PerformanceObserver(l => l.getEntries().forEach(e => { if (!e.hadRecentInput) window.__cls += e.value; })).observe({ type: 'layout-shift', buffered: true }); };

test('la vista Tabla carga sin saltos (CLS menor a 0,1)', async ({ page }, info) => {
  test.skip(info.project.name !== 'escritorio', 'el salto era de la computadora: en el celular las categorías van en una fila');
  await page.addInitScript(medirCLS);
  await page.goto('/index.html?tabla');
  await expect(page.locator('#mainTable tbody tr').first()).toBeAttached();
  await page.waitForTimeout(1500);
  expect(await page.evaluate(() => window.__cls)).toBeLessThan(0.1);
});

test('los botones de categorías vienen en el HTML, uno por categoría visible y «Todas»', async ({ page, request }) => {
  const html = await (await request.get('/index.html')).text();
  const bloque = html.slice(html.indexOf('<!-- cats:inicio'), html.indexOf('<!-- cats:fin -->'));
  const enHtml = (bloque.match(/class="cat-btn/g) || []).length;
  await page.goto('/index.html?tabla');
  const r = await page.evaluate(() => ({ cats: DATA.length - 1, botones: document.querySelectorAll('#catScroll .cat-btn').length }));
  expect(enHtml).toBe(r.cats + 1);
  expect(r.botones).toBe(r.cats + 1);   // el script no suma otros
  await expect.poll(() => page.evaluate(() => document.documentElement.classList.contains('esperando-letra'))).toBe(false);
  await expect(page.locator('#catScroll .cat-btn').nth(1)).toBeVisible();
});
