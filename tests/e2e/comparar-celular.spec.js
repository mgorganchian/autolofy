// Comparación en el celular (2026-11-27, segunda auditoría con Impeccable): con 2 autos el resumen «Gana en más filas» y
// «Mayores diferencias» medía 558 px y el primer auto quedaba a 954 px, debajo de la pantalla. Ahora, en el celular, el
// resumen es un renglón que se abre al tocarlo; en la computadora sigue a la vista.
const { test, expect } = require('@playwright/test');
const { vigilarErrores } = require('./helpers');

let errores;
test.beforeEach(({ page }) => { errores = vigilarErrores(page); });
test.afterEach(() => expect(errores).toEqual([]));

const AUTOS = ['byd-song-pro', 'toyota-corolla-cross-seg-hev', 'gwm-haval-h6-hev', 'chery-tiggo-7-pro-phev'];
const arribaDe = (page, sel) => page.evaluate(s => {
  const e = [...document.querySelectorAll(s)].find(x => x.offsetParent);
  return e ? e.getBoundingClientRect().top + scrollY : null;
}, sel);

for (const n of [2, 4]) {
  test(`celular: con ${n} autos, el primer auto se ve en la primera pantalla`, async ({ page }, info) => {
    test.skip(info.project.name !== 'celular', 'el renglón plegado es del celular');
    await page.goto('/index.html?autos=' + AUTOS.slice(0, n).join(','));
    const box = page.locator('#difBox');
    await expect(box.locator('.dif-resumen')).toBeVisible();
    await expect(box.locator('.dif-lista')).toBeHidden();
    // El renglón dice quién gana: los mismos autos y las mismas cifras que el cuerpo.
    const resumen = await box.locator('.dif-resumen .dif-chip').allTextContents();
    expect(resumen).toHaveLength(n);
    expect(resumen).toEqual(await box.locator('.dif-gana .dif-chip').allTextContents());
    expect((await box.boundingBox()).height).toBeLessThan(130);
    const auto = await arribaDe(page, '#theadTable th[data-idx] img');
    expect(auto).toBeLessThan(page.viewportSize().height - 200);   // se ve la foto, no solo su borde
  });
}

test('celular: tocar el renglón abre las diferencias, y cambiar la selección no lo cierra', async ({ page }, info) => {
  test.skip(info.project.name !== 'celular', 'el renglón plegado es del celular');
  await page.goto('/index.html?autos=' + AUTOS.slice(0, 3).join(','));
  const b = page.locator('#difBox .dif-resumen');
  await expect(b).toHaveAttribute('aria-expanded', 'false');
  await expect(b).toContainText('Ver las diferencias');
  await b.click();
  await expect(b).toHaveAttribute('aria-expanded', 'true');
  await expect(b).toContainText('Ocultar las diferencias');
  await expect(page.locator('#difBox .dif-lista')).toBeVisible();
  await expect(page.locator('#difBox details[data-dif="escala"]')).toBeVisible();
  // El cuadro se rehace con cada cambio de la selección: tiene que seguir abierto.
  await page.evaluate(() => renderDiferencias());
  await expect(page.locator('#difBox .dif-resumen')).toHaveAttribute('aria-expanded', 'true');
  await expect(page.locator('#difBox .dif-lista')).toBeVisible();
  await page.locator('#difBox .dif-resumen').click();
  await expect(page.locator('#difBox .dif-lista')).toBeHidden();
});

test('celular apaisado: las categorías van en una fila y el primer auto empieza en la pantalla', async ({ page }, info) => {
  test.skip(info.project.name !== 'celular', 'es el celular girado');
  await page.setViewportSize({ width: 844, height: 390 });
  await page.goto('/index.html?autos=' + AUTOS.slice(0, 2).join(','));
  await expect(page.locator('#difBox .dif-resumen')).toBeVisible();
  // Con tres renglones de categorías (como en la computadora) el auto quedaba a 392 px de una pantalla de 390.
  const alto = await page.locator('#catScroll').evaluate(e => e.getBoundingClientRect().height);
  expect(alto).toBeLessThan(70);
  expect(await arribaDe(page, '#theadTable th[data-idx] img')).toBeLessThan(390);
});

test('computadora: el resumen sigue a la vista, sin renglón plegado', async ({ page }, info) => {
  test.skip(info.project.name !== 'escritorio', 'en la computadora entra');
  await page.goto('/index.html?autos=' + AUTOS.slice(0, 3).join(','));
  await expect(page.locator('#difBox .dif-lista')).toBeVisible();
  await expect(page.locator('#difBox .dif-gana .dif-chip').first()).toBeVisible();
  await expect(page.locator('#difBox .dif-resumen')).toBeHidden();
});
