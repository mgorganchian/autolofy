// Barra del sitio (issue #200, pedido de Sebastián): la misma en todas las vistas, en el mismo lugar y sin esconderse nunca.
// Antes, el primer «Comparar» (o un link con ?autos=) se llevaba el logo y no quedaba cómo volver al inicio.
const fs = require('fs');
const path = require('path');
const { test, expect } = require('@playwright/test');
const { vigilarErrores, abrirGeneral } = require('./helpers');

let errores;
test.beforeEach(({ page }) => { errores = vigilarErrores(page); });
test.afterEach(() => expect(errores).toEqual([]));

const lugarDelLogo = page => page.locator('.barra-marca').evaluate(e => { const b = e.getBoundingClientRect(); return [Math.round(b.left), Math.round(b.top + scrollY)]; });

test('el logo está siempre en el mismo lugar: en cada vista, al comparar y con un link a una comparación', async ({ page }) => {
  await page.goto('/index.html');
  await expect(page.locator('.barra-marca')).toBeVisible();
  await expect(page.locator('.barra-marca')).toHaveAttribute('href', '/');
  const lugar = await lugarDelLogo(page);
  for (const id of ['vistaTabla', 'vistaRanking', 'vistaElegir']) {
    await page.locator('#' + id).click();
    await expect(page.locator('#' + id)).toHaveAttribute('aria-selected', 'true');
    expect(await lugarDelLogo(page), id).toEqual(lugar);
  }
  await page.goto('/index.html?autos=byd-song-pro,byd-dolphin-mini');
  await expect(page.locator('#summaryText')).toHaveText('Comparando 2 autos');
  await expect(page.locator('.barra-marca')).toBeVisible();
  expect(await lugarDelLogo(page)).toEqual(lugar);
  // El título grande va solo en Ayudame a elegir; en las demás vistas queda para los lectores de pantalla.
  await expect(page.locator('#headerSubtitle')).toBeHidden();
  await expect(page.locator('h1')).toHaveCount(1);
});

test('Imprimir va con Compartir en la computadora y en «Más» en el celular', async ({ page }, info) => {
  await page.goto('/index.html?tabla');
  if (info.project.name === 'escritorio'){
    await expect(page.locator('#summaryBar #imprimirBtn')).toBeVisible();
    await expect(page.locator('#imprimirMasBtn')).toBeHidden();
    return;
  }
  // En el celular, imprimir es raro y ocupaba un renglón entero arriba de la tabla (2026-11-26).
  await expect(page.locator('#summaryBar #imprimirBtn')).toBeHidden();
  await expect(page.locator('#summaryBar .summary-acciones')).toBeHidden();
  await abrirGeneral(page);
  await expect(page.locator('#imprimirMasBtn')).toBeVisible();
});

test('un link con ?vista=ranking abre el Ranking', async ({ page }) => {
  await page.goto('/index.html?vista=ranking');
  await expect(page.locator('#vistaRanking')).toHaveAttribute('aria-selected', 'true');
  await expect(page.locator('#rankingView')).toBeVisible();
});

test('en el celular, lo general del sitio va en «Más»', async ({ page }, info) => {
  test.skip(info.project.name !== 'celular', 'en la computadora va a la vista en la barra');
  await page.goto('/index.html?tabla');
  const mas = page.locator('#masBtn'), menu = page.locator('#herrGral');
  await expect(menu).toBeHidden();
  // El logo y «Más» en la misma fila; las tres vistas debajo.
  const [logo, boton, tabs] = await Promise.all(['.barra-marca', '#masBtn', '.vista-toggle'].map(s => page.locator(s).boundingBox()));
  expect(Math.abs((logo.y + logo.height / 2) - (boton.y + boton.height / 2))).toBeLessThanOrEqual(6);
  expect(tabs.y).toBeGreaterThan(logo.y + logo.height - 1);
  await mas.click();
  await expect(mas).toHaveAttribute('aria-expanded', 'true');
  for (const t of ['Concesionarios', 'Grupos', 'Novedades', 'Quién hace esto']) await expect(menu.getByText(t, { exact: true })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(menu).toBeHidden();
  await mas.click();
  await menu.locator('#gruposBtn').click();
  await expect(page.locator('#gruposVista')).toBeVisible();
  await expect(menu).toBeHidden();
});

test('las páginas generadas llevan la misma barra', async () => {
  const raiz = path.resolve(__dirname, '../..');
  for (const f of ['autos/byd-song-pro.html', 'novedades.html', 'quien-hace-esto.html']) {
    const html = fs.readFileSync(path.join(raiz, f), 'utf8');
    expect(html, f).toContain('<header class="barra">');
    for (const href of ['href="/"', 'href="/?tabla"', 'href="/?vista=ranking"', 'href="/?vista=concesionarios"', 'href="/?vista=grupos"', 'href="/novedades"'])
      expect(html, `${f}: ${href}`).toContain(href);
  }
});
