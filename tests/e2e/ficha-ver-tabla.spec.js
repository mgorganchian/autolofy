// «Ver todos sus datos en la tabla» (issue #130, de Sebastián): desde la ventana de un auto abierta en Ayudame a elegir, Grupos, Ranking o la
// tabla, lleva a la Tabla con ese auto; no deja la pantalla anterior.
const { test, expect } = require('@playwright/test');
const { vigilarErrores, FILAS_DATOS, N_FILAS } = require('./helpers');

let errores;
test.beforeEach(async ({ page }) => { errores = vigilarErrores(page); await page.addInitScript(() => { try { localStorage.removeItem('elegir'); } catch (e) {} }); });
test.afterEach(() => expect(errores).toEqual([]));

const ORIGENES = [
  ['Ayudame a elegir', "mostrarVista('elegir')"],
  ['Grupos', "mostrarVista('grupos')"],
  ['Ranking', "mostrarVista('ranking')"],
  ['la Tabla', "mostrarVista('tabla')"],
];

for (const [nombre, abrir] of ORIGENES) {
  test(`desde ${nombre}, «Ver todos sus datos en la tabla» muestra la tabla con ese auto`, async ({ page }) => {
    await page.goto('/index.html?tabla');
    await expect(page.locator(FILAS_DATOS)).toHaveCount(N_FILAS);
    await page.evaluate(a => { new Function(a)(); }, abrir);
    const i = await page.evaluate(() => CARS.findIndex(c => c.name === 'BYD Shark'));
    await page.evaluate(i => abrirFicha(i), i);
    await expect(page.locator('#fichaAuto')).toBeVisible();
    await page.locator('#fichaVerTabla').click();
    await expect(page.locator('#fichaAuto')).toBeHidden();
    expect(await page.evaluate(() => vistaActual)).toBe('tabla');
    await expect(page.locator('#vistaTabla')).toHaveAttribute('aria-selected', 'true');
    await expect(page.locator('#tbodyWrap')).toBeVisible();
    // la tabla muestra solo ese auto
    expect(await page.evaluate(() => colVisible.filter(Boolean).length)).toBe(1);
    expect(await page.evaluate(i => colVisible[i], i)).toBe(true);
    await expect(page.locator('#theadTable th:not(.feat-col):not(.col-hidden)')).toHaveCount(1);
  });
}

test('el botón Atrás vuelve a la pantalla desde la que se abrió la ventana', async ({ page }) => {
  await page.goto('/index.html?tabla');
  await page.evaluate(() => irAVista('elegir'));
  await page.evaluate(() => abrirFicha(CARS.findIndex(c => c.name === 'BYD Shark')));
  await page.locator('#fichaVerTabla').click();
  expect(await page.evaluate(() => vistaActual)).toBe('tabla');
  await page.goBack();
  expect(await page.evaluate(() => vistaActual)).toBe('elegir');
});
