// «¿Viaja alguien en silla de ruedas?» (2026-11-01, issue #112): filtra con lo que la tabla publica, sin prometer que la silla entra.
// Entran los de baúl grande (el 40% de más litros) cuyos asientos traseros no se informan como fijos; sin dato de baúl no entran.
const { test, expect } = require('@playwright/test');
const { vigilarErrores } = require('./helpers');

let errores;
test.beforeEach(async ({ page }) => { errores = vigilarErrores(page); await page.goto('/index.html?tabla'); });
test.afterEach(() => expect(errores).toEqual([]));

const base = { presu: '', plazas: '5', quien: '', carro: '', uso: 'mixto', enchufe: 'nose' };

test('con silla de ruedas solo entran los de baúl grande, y los de asientos que no se pliegan quedan afuera', async ({ page }) => {
  const r = await page.evaluate(b => {
    const q = { ...b, movilidad: 'silla' }, o = { ...b, movilidad: '' }, umbral = baulGrande();
    let entran = 0, malos = [];
    CARS.forEach((c, i) => {
      if (c.status !== 'venta' || elegirDesvio(i, o) !== 0) return;
      const v = rkValor(i, 'Volumen de baúl/carga (L)'), d = elegirDesvio(i, q), pl = siNoDe('Asientos traseros plegables', i);
      const debe = v.tipo === 'ok' && v.n >= umbral && pl !== false;
      if (debe !== (d !== null)) malos.push(c.name);
      if (d !== null) entran++;
    });
    return { entran, malos, umbral };
  }, base);
  expect(r.malos).toEqual([]);
  expect(r.entran).toBeGreaterThan(15);
  expect(r.umbral).toBeGreaterThan(300);
});

test('la pregunta tiene su ícono, el cartel avisa que no hay datos de la silla y el resumen la nombra', async ({ page }) => {
  await page.goto('/index.html');
  const op = page.locator('input[name="el-movilidad"][value="silla"] + span');
  await expect(op.locator('svg.quien-ico[aria-hidden="true"]')).toHaveCount(1);
  expect(await op.getAttribute('data-tip')).toMatch(/probala en el auto/);
  await page.locator('label:has(input[name="el-movilidad"][value="silla"])').click();
  await expect(page.locator('#elegirHoja')).toContainText('con silla de ruedas');
  await expect(page.locator('input[name="el-movilidad"][value=""]')).not.toBeChecked();
});
