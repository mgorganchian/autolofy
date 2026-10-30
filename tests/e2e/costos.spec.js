// Gastos para patentarlo y cuota (2026-10-11). Los datos: IMPUESTOS_AR (normas de las 24
// jurisdicciones) y TASAS_BCRA (lo escribe herramientas-tasas.py desde el BCRA).
const { test, expect } = require('@playwright/test');
const { leerIndex, vigilarErrores } = require('./helpers');

const { html } = leerIndex();
const IMP = JSON.parse(/const IMPUESTOS_AR = (\{.*?\});\n/.exec(html)[1]);
const TASAS = JSON.parse(/\/\*tasas:inicio\*\/(.*?)\/\*tasas:fin\*\//.exec(html)[1]);

test('impuestos: las 24 jurisdicciones con su sellado (o s/d), la patente para eléctricos e híbridos y sus normas', () => {
  expect(Object.keys(IMP.prov)).toHaveLength(24);
  expect(IMP.prov['Ciudad Autónoma de Buenos Aires']).toBeTruthy();
  for (const [p, d] of Object.entries(IMP.prov)){
    expect(d.s === null || (d.s >= 0 && d.s <= 5), p).toBe(true);
    if (d.s !== null) expect(d.sf, p).toMatch(/^https:\/\//);
    expect(d.pe.length, p).toBeGreaterThan(5); expect(d.ph.length, p).toBeGreaterThan(5);
    expect(d.pf, p).toMatch(/^https?:\/\//);
  }
  expect(IMP.dnrpa.f).toMatch(/^https:\/\/www\.boletinoficial\.gob\.ar\//);
});

test('tasas del BCRA: líneas en pesos y UVA, con fecha, TEA y plazo', () => {
  expect(TASAS.fuente).toMatch(/^https:\/\/api\.bcra\.gob\.ar\//);
  expect(TASAS.lineas.length).toBeGreaterThanOrEqual(5);
  for (const l of TASAS.lineas){
    expect(['Pesos', 'UVA']).toContain(l.mon);
    expect(l.tea).toBeGreaterThan(0); expect(l.plazo).toBeGreaterThan(0);
    expect(l.f).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  }
});

test.describe('en la página del auto', () => {
  let errores;
  test.beforeEach(async ({ page }) => { errores = vigilarErrores(page); });
  test.afterEach(() => expect(errores).toEqual([]));

  test('gastos para patentarlo: Registro 1% y el sellado de la provincia elegida, que se recuerda', async ({ page }) => {
    await page.goto('/index.html?auto=byd-song-pro');
    const lp = await page.evaluate(() => SIM_PRECIO[SLUG_AUTO.indexOf('byd-song-pro')]);
    await page.locator('#fichaPatentar summary').click();
    await expect(page.locator('#patCuerpo')).toContainText('Elegí tu provincia');
    await page.locator('#patProv').selectOption('Ciudad Autónoma de Buenos Aires');
    const usd = n => 'USD ' + Math.round(n).toLocaleString('es-AR');
    await expect(page.locator('#patCuerpo tfoot td')).toHaveText(usd(lp * .04));
    await expect(page.locator('#patCuerpo')).toContainText('Patente en Ciudad Autónoma de Buenos Aires');
    // Jujuy cobra menos sellado a los híbridos (1,5% en vez de 2%).
    await page.locator('#patProv').selectOption('Jujuy');
    await expect(page.locator('#patCuerpo tfoot td')).toHaveText(usd(lp * .025));
    await page.goto('/index.html?auto=byd-song-pro');
    await expect(page.locator('#patProv')).toHaveValue('Jujuy');
  });

  test('cuota: sistema francés con la TEA de la línea elegida', async ({ page }) => {
    await page.goto('/index.html?auto=byd-song-pro');
    await page.locator('#fichaCuota summary').click();
    await expect(page.locator('#cuRes')).toContainText('Escribí cuánto');
    await page.locator('#cuMonto').fill('20000000');
    await page.locator('#cuPlazo').selectOption('48');
    await page.locator('#cuLinea').selectOption('0');
    const l = TASAS.lineas[0], n = Math.min(48, l.plazo), r = Math.pow(1 + l.tea / 100, 1 / 12) - 1;
    const c = Math.round(20000000 * r / (1 - Math.pow(1 + r, -n)));
    await expect(page.locator('#cuRes .cuota-res b')).toHaveText('$ ' + c.toLocaleString('es-AR'));
  });
});
