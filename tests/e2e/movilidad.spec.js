// «¿Viaja alguien en silla de ruedas?» (2026-11-01, issue #112): filtra con lo que la tabla publica, sin prometer que la silla entra.
// Entran los de baúl grande (el 40% de más litros) cuyos asientos traseros no se informan como fijos; sin dato de baúl no entran.
const { test, expect } = require('@playwright/test');
const { vigilarErrores } = require('./helpers');

let errores;
test.beforeEach(async ({ page }) => { errores = vigilarErrores(page); await page.goto('/index.html?tabla'); });
test.afterEach(() => expect(errores).toEqual([]));

const base = { presu: '', plazas: '5', quien: '', carro: '', uso: 'mixto', enchufe: 'nose' };

test('con silla de ruedas solo entran los de baúl al menos como el del BYD Song Pro, la referencia de Mati', async ({ page }) => {
  const r = await page.evaluate(b => {
    const q = { ...b, movilidad: 'silla' }, o = { ...b, movilidad: '' }, ref = baulGrande();
    let entran = 0, malos = [];
    CARS.forEach((c, i) => {
      if (c.status !== 'venta' || elegirDesvio(i, o) !== 0) return;
      const v = rkValor(i, 'Volumen de baúl/carga (L)'), d = elegirDesvio(i, q);
      const debe = v.tipo === 'ok' && v.n >= ref;
      if (debe !== (d === 0)) malos.push(c.name + ' ' + (v.tipo === 'ok' ? v.n : 'sin dato'));
      if (d !== null) entran++;
    });
    const songPro = CARS.findIndex(c => c.name === 'Song Pro');
    return { entran, malos, ref, songProEntra: elegirDesvio(songPro, { ...q, plazas: '4' }) === 0, bauSongPro: rkValor(songPro, 'Volumen de baúl/carga (L)').n };
  }, base);
  expect(r.ref).toBe(r.bauSongPro);              // la referencia es el baúl del Song Pro de la tabla
  expect(r.songProEntra).toBe(true);             // y el Song Pro, que es la referencia, entra
  expect(r.malos).toEqual([]);
  expect(r.entran).toBeGreaterThan(10);
});

test('la silla de ruedas es un círculo chico con su ícono en el título de «quiénes viajan»: se toca para sumar o sacar', async ({ page }) => {
  await page.goto('/index.html');
  const btn = page.locator('legend.quien-leyenda #movilidadBtn');
  await expect(btn).toHaveAttribute('aria-pressed', 'false');
  await expect(btn).toHaveAttribute('aria-label', 'Viaja alguien en silla de ruedas');
  await expect(btn.locator('svg.quien-ico[aria-hidden="true"]')).toBeVisible();
  expect(await btn.getAttribute('data-tip')).toMatch(/probala en el auto/);
  const caja = await btn.boundingBox();
  expect(caja.width).toBeLessThanOrEqual(44);
  expect(caja.height).toBeLessThanOrEqual(44);
  await expect(page.locator('input[name="el-movilidad"]')).toHaveCount(0);   // ya no es una pregunta aparte
  await btn.click();
  await expect(page.locator('#movilidadBtn')).toHaveAttribute('aria-pressed', 'true');
  expect(await page.evaluate(() => elegirResp.movilidad)).toBe('silla');
  await expect(page.locator('#elegirHoja')).toContainText('con silla de ruedas');
  await expect(page.locator('.quien-nota-silla')).toContainText('BYD Song Pro');
  await page.locator('#movilidadBtn').click();
  expect(await page.evaluate(() => elegirResp.movilidad)).toBe('');
  await expect(page.locator('.quien-nota-silla')).toHaveCount(0);
});
