// Service oficial programado y llamados a revisión (2026-10-11): datos publicados por cada marca y
// por el registro oficial de alertas de productos. Que cada lista tenga fuente, sea de un auto de la
// tabla de esa misma marca y se vea en su página.
const { test, expect } = require('@playwright/test');
const { leerIndex, vigilarErrores, FILAS_DATOS, N_FILAS } = require('./helpers');

const { html } = leerIndex();
const leer = n => JSON.parse(new RegExp('const ' + n + ' = (\\{.*?\\});\\n').exec(html)[1]);
const MARCAS = leer('SERVICE_MARCAS'), OFICIAL = leer('SERVICE_OFICIAL'), LLAMADOS = leer('LLAMADOS'), FUENTE = leer('LLAMADOS_FUENTE');
const SLUGS = [...html.matchAll(/<img class="car-photo" data-slug="([^"]+)"/g)].map(m => m[1]);
const CARS = [...html.slice(html.indexOf('const CARS = ['), html.indexOf('];', html.indexOf('const CARS = ['))).matchAll(/\{name:"([^"]+)"[^}]*brand:"([^"]+)"/g)].map(m => ({ name: m[1], brand: m[2] }));

test('cada lista de service tiene fuente https, fecha y es de un auto de esa marca', () => {
  for (const [m, d] of Object.entries(MARCAS)){
    expect(d.f.length, m).toBeGreaterThan(0);
    d.f.forEach(u => expect(u, m).toMatch(/^https:\/\//));
    expect(d.c, m).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(['USD', 'ARS', '$'], m).toContain(d.mon);
  }
  for (const [slug, sv] of Object.entries(OFICIAL)){
    const i = SLUGS.indexOf(slug);
    expect(i, slug).toBeGreaterThanOrEqual(0);
    expect(MARCAS[sv.m], slug).toBeTruthy();
    expect(CARS[i].brand, slug).toBe(sv.m);
    expect(sv.r.length, slug).toBeGreaterThan(2);
    sv.r.forEach((x, k) => {
      if (k) expect(x[0], slug).toBeGreaterThan(sv.r[k - 1][0]);
      expect(typeof x[2] === 'number' ? x[2] > 0 : x[2] === 'Sin cargo', slug + ' ' + x[0]).toBe(true);
    });
  }
});

test('los llamados a revisión son de autos de la tabla y el registro tiene fuente', () => {
  expect(FUENTE.u).toMatch(/^https:\/\/www\.argentina\.gob\.ar\//);
  for (const [slug, l] of Object.entries(LLAMADOS)){
    expect(SLUGS, slug).toContain(slug);
    l.forEach(x => { expect(x.f).toMatch(/^\d{4}-\d{2}-\d{2}$/); expect(x.d.length).toBeGreaterThan(20); });
  }
});

test.describe('en la página del auto', () => {
  let errores;
  test.beforeEach(async ({ page }) => { errores = vigilarErrores(page); });
  test.afterEach(() => expect(errores).toEqual([]));

  test('service con su total y su fuente; llamados con el registro', async ({ page }) => {
    await page.goto('/index.html?auto=tank-300');
    const sv = page.locator('.ficha-service');
    await expect(sv.locator('tbody tr')).toHaveCount(OFICIAL['tank-300'].r.length);
    const suma = OFICIAL['tank-300'].r.reduce((t, x) => t + x[2], 0);
    await expect(sv.locator('tfoot td')).toHaveText('$ ' + suma.toLocaleString('es-AR'));
    await expect(sv.locator('a')).toHaveAttribute('href', MARCAS.GWM.f[0]);
    await expect(page.locator('.ficha-llamados')).toContainText('No figura ninguno en el registro oficial');
    await page.goto('/index.html?auto=chery-tiggo-4-pro');
    await expect(page.locator('.ficha-service')).toHaveCount(0);
    await expect(page.locator('.ficha-llamados li')).toHaveCount(LLAMADOS['chery-tiggo-4-pro'].length);
  });
});
