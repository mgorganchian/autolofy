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

test('patente anual: las 24 con su calidad y su fuente; lo que no se encontró queda sin valor y sin verificar', () => {
  for (const [p, d] of Object.entries(IMP.prov)){
    expect(['ley', 'estimada', 'sin verificar'], p).toContain(d.pac);
    expect(d.paf, p).toMatch(/^https:\/\//);
    expect(d.pan.length, p).toBeGreaterThan(5);
    expect(d.pa === null || (d.pa > 0 && d.pa < 10), p).toBe(true);
    if (d.pa === null) expect(d.pac, p).toBe('sin verificar');
    for (const m of [d.pme, d.pmh]) if (m) { expect(m, p).toHaveLength(5); for (const x of m) expect(x >= 0 && x <= 1, p).toBe(true); }
  }
  // Pedido de Mati (2026-10-31): lo no verificado no se inventa.
  for (const p of ['Chaco', 'Santiago del Estero', 'Santa Cruz']) expect(IMP.prov[p].pa, p).toBeNull();
  expect(IMP.prov['Buenos Aires'].pac).toBe('sin verificar');
  expect(IMP.pc).toMatch(/^\d{4}-\d{2}-\d{2}$/);
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
    await page.locator('#fichaPatentar > summary').click();
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

  test('dónde cuesta menos: las 24 ordenadas por alta + 5 años, con la regla del domicilio y lo sin dato al final', async ({ page }) => {
    await page.goto('/index.html?auto=byd-song-pro');
    const lp = await page.evaluate(() => SIM_PRECIO[SLUG_AUTO.indexOf('byd-song-pro')]);
    await page.locator('#fichaPatentar > summary').click();
    await page.locator('#fichaMenos > summary').click();
    const filas = page.locator('#patMenos tbody tr');
    await expect(filas).toHaveCount(24);
    await expect(page.locator('#patMenos')).toContainText('Se patenta donde vivís');
    // Híbrido enchufable: Santa Fe exime 5 años de patente y cobra 1,2% de sellado más el 1% del Registro.
    const usd = n => 'USD ' + Math.round(n).toLocaleString('es-AR');
    await expect(filas.first()).toContainText('1. Santa Fe');
    await expect(filas.first().locator('td.num')).toHaveText(usd(lp * .022));
    const ult = await filas.evaluateAll(trs => trs.slice(-3).map(tr => tr.querySelector('td.num').textContent));
    expect(ult).toEqual(['s/d', 's/d', 's/d']);
    const nums = await filas.evaluateAll(trs => trs.slice(0, -3).map(tr => +tr.querySelector('td.num').textContent.replace(/\D/g, '')));
    expect(nums).toEqual([...nums].sort((a, b) => a - b));
    await page.locator('#patProv').selectOption('Córdoba');
    await expect(page.locator('#patMenos tr.pat-tuya')).toContainText('Córdoba (la que elegiste)');
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
