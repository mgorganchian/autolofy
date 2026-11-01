// Asientos estimados (2026-11-01, pedido de Mati): el filtro «¿Cuántos viajan seguido?» no deja pasar en silencio
// a un auto sin el dato. La estimación (carrocería y distancia entre ejes) se mide contra los autos que sí lo
// tienen. Lo que importa es que no prometa de más (un SUV de 7 estimado en 5 sigue sirviendo para 5 plazas):
// si deja de acertar, la regla hay que revisarla antes que seguir mostrándola.
const { test, expect } = require('@playwright/test');
const { vigilarErrores } = require('./helpers');

let errores;
test.beforeEach(async ({ page }) => { errores = vigilarErrores(page); await page.goto('/index.html?tabla'); });
test.afterEach(() => expect(errores).toEqual([]));

test('la estimación no promete más asientos de los que el auto tiene en al menos el 95% de los autos con dato', async ({ page }) => {
  const r = await page.evaluate(() => {
    let ok = 0, n = 0, mal = [];
    CARS.forEach((c, i) => {
      const e = estimarAsientos(i), d = SIM_ASIENTOS[i];
      if (d == null || e == null) return;
      n++; if (e <= d) ok++; else mal.push(c.name + ' ' + d + '<' + e);
    });
    return { ok, n, mal };
  });
  expect(r.n, 'autos medidos').toBeGreaterThan(150);
  expect(r.ok / r.n, r.mal.join(' · ')).toBeGreaterThanOrEqual(0.95);
});

test('un SUV de 2,80 m o más entre ejes no se estima, y para 6 o 7 plazas el que no tiene el dato no entra', async ({ page }) => {
  const r = await page.evaluate(() => {
    const sinDato = CARS.map((c, i) => i).filter(i => SIM_ASIENTOS[i] == null);
    const grandes = sinDato.filter(i => CARS[i].body === 'SUV' && SIM_EJES[i] >= 2800);
    const entran67 = sinDato.filter(i => elegirDesvio(i, { presu: '', plazas: '6', carro: '', uso: 'mixto', enchufe: 'nose' }) !== null);
    return { grandes: grandes.map(i => estimarAsientos(i)), entran67: entran67.length };
  });
  expect(r.grandes.every(x => x === null)).toBe(true);
  expect(r.entran67).toBe(0);
});

test('un coupé sin el dato aparece como casi para 5 plazas y dice que es estimado', async ({ page }) => {
  const t = await page.evaluate(() => {
    const i = CARS.findIndex(c => c.name === 'BMW 220i Coupé');
    const d = elegirDesvio(i, { presu: '', plazas: '5', carro: '', uso: 'mixto', enchufe: 'nose' });
    return { dato: SIM_ASIENTOS[i], d: d && d.txt };
  });
  expect(t.dato).toBeNull();
  expect(t.d).toBe('Tiene 4 asientos (estimado por su tamaño)');
});
