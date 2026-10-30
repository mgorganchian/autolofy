// Colores en Argentina (2026-10-06): COLORES_AR, por slug, solo de fuentes oficiales
// argentinas. Lo que más importa: que cada lista tenga su fuente https, y que un auto sin
// fuente muestre el porqué en vez de colores de otro mercado.
const { test, expect } = require('@playwright/test');
const { leerIndex, vigilarErrores, FILAS_DATOS, N_FILAS } = require('./helpers');

const { html } = leerIndex();
const COLORES = JSON.parse(/const COLORES_AR = (\{.*?\});\n/.exec(html)[1]);
const SLUGS = [...html.matchAll(/<img class="car-photo" data-slug="([^"]+)"/g)].map(m => m[1]);

test('cada auto tiene su entrada y cada lista de colores, su fuente oficial', () => {
  expect(Object.keys(COLORES).sort()).toEqual([...SLUGS].sort());
  for (const [slug, e] of Object.entries(COLORES)) {
    if (!e.c) continue;
    expect(e.c.length, slug).toBeGreaterThan(0);
    expect(e.f, slug).toMatch(/^https:\/\/\S+$/);
    for (const c of e.c) expect(c, slug).toMatch(/^\S.*\S$|^\S$/);
  }
});

let errores;
test.beforeEach(async ({ page }) => { errores = vigilarErrores(page); });
test.afterEach(() => expect(errores).toEqual([]));

test('la página del auto muestra sus colores con la fuente, o el motivo si no hay', async ({ page }) => {
  const con = Object.keys(COLORES).find(k => COLORES[k].c);
  const sin = Object.keys(COLORES).find(k => !COLORES[k].c && COLORES[k].n);
  await page.goto('/index.html?auto=' + con);
  await expect(page.locator(FILAS_DATOS)).toHaveCount(N_FILAS);
  await expect(page.locator('.ficha-colores li')).toHaveCount(COLORES[con].c.length);
  await expect(page.locator('.ficha-colores a')).toHaveAttribute('href', COLORES[con].f);
  await page.goto('/index.html?auto=' + sin);
  await expect(page.locator('.ficha-colores')).toContainText(COLORES[sin].n);
});

test('cada muestra de color tiene un código válido y su fuente https, una por nombre', () => {
  // Issue #72 (2026-10-30): la muestra sale del código o del chip que publica la marca, nunca del nombre.
  for (const [slug, e] of Object.entries(COLORES)) {
    if (!e.m) continue;
    expect(e.m.length, slug).toBe(e.c.length);
    for (const m of e.m) {
      if (m === null) continue;
      expect(m[0], slug).toMatch(/^#[0-9a-f]{6}$/);
      expect(m[1], slug).toMatch(/^https:\/\/\S+$/);
    }
  }
});

test('la página del auto dibuja la muestra al lado de cada color que la tiene', async ({ page }) => {
  const slug = 'byd-song-pro', e = COLORES[slug];
  await page.goto('/index.html?auto=' + slug);
  await expect(page.locator(FILAS_DATOS)).toHaveCount(N_FILAS);
  await expect(page.locator('.ficha-colores .muestra-color')).toHaveCount(e.m.filter(Boolean).length);
  const fondo = await page.locator('.ficha-colores .muestra-color').first().evaluate(el => el.style.background);
  expect(fondo).toBeTruthy();
});
