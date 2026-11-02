// Compartir la ficha de un auto (2026-11-01, issue #90): mail, WhatsApp y copiar el link, sin pedir ni guardar datos.
// Se comparte la página estática /autos/<slug>, que tiene su propio título y vista previa.
const { test, expect } = require('@playwright/test');
const { vigilarErrores } = require('./helpers');

let errores;
test.beforeEach(async ({ page }) => { errores = vigilarErrores(page); });
test.afterEach(() => expect(errores).toEqual([]));

test('la ficha ofrece mail, WhatsApp y copiar link con el link de la página del auto', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']).catch(() => {});
  await page.goto('/index.html?auto=byd-shark');
  const bloque = page.locator('.ficha-compartir');
  await expect(bloque).toBeVisible();
  const url = await page.evaluate(() => location.origin + '/autos/byd-shark');
  const mail = await page.locator('#fichaCompartirMail').getAttribute('href');
  expect(mail.startsWith('mailto:?subject=')).toBe(true);
  expect(decodeURIComponent(mail)).toContain('Mirá este auto en Autolofy: BYD Shark');
  expect(decodeURIComponent(mail)).toContain(url);
  const wa = await page.locator('#fichaCompartirWa').getAttribute('href');
  expect(wa.startsWith('https://wa.me/?text=')).toBe(true);
  expect(decodeURIComponent(wa)).toContain(url);
  await expect(page.locator('#fichaCompartirWa')).toHaveAttribute('rel', /noopener/);
  // Sin datos de nadie: no hay campos para escribir en el bloque.
  await expect(bloque.locator('input, textarea')).toHaveCount(0);
});

test('copiar link copia la URL de la página del auto y lo avisa', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']).catch(() => {});
  await page.goto('/index.html?auto=byd-shark');
  await page.locator('#fichaCompartirCopiar').click();
  await expect(page.locator('#fichaCompartirCopiar')).toHaveText('Link copiado');
  const copiado = await page.evaluate(() => navigator.clipboard.readText()).catch(() => null);
  if (copiado !== null) expect(copiado).toBe(await page.evaluate(() => location.origin + '/autos/byd-shark'));
});
