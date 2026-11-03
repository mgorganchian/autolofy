// Ayudame a elegir no cambia la cantidad de sugerencias al redimensionar la ventana (issue #129, de Sebastián): 5 si la página cargó en una
// pantalla ancha y 4 si cargó en una chica, y se queda así.
const { test, expect } = require('@playwright/test');
const { vigilarErrores } = require('./helpers');

let errores;
test.beforeEach(async ({ page }) => { errores = vigilarErrores(page); await page.addInitScript(() => { try { localStorage.removeItem('elegir'); } catch (e) {} }); });
test.afterEach(() => expect(errores).toEqual([]));

const tarjetas = page => page.locator('.elegir-res > li');

test('cargada en pantalla ancha, al achicar la ventana siguen las 5 sugerencias', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/index.html');
  await expect(tarjetas(page)).toHaveCount(5);
  for (const w of [1000, 800, 500, 390]) {
    await page.setViewportSize({ width: w, height: 900 });
    await page.waitForTimeout(250);
    await expect(tarjetas(page), `a ${w} px`).toHaveCount(5);
  }
  await page.setViewportSize({ width: 1280, height: 900 });
  await expect(tarjetas(page)).toHaveCount(5);
});

test('cargada en pantalla chica, al agrandar la ventana siguen las 4 sugerencias', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/index.html');
  await expect(tarjetas(page)).toHaveCount(4);
  for (const w of [700, 1000, 1280]) {
    await page.setViewportSize({ width: w, height: 900 });
    await page.waitForTimeout(250);
    await expect(tarjetas(page), `a ${w} px`).toHaveCount(4);
  }
});
