// Ayudame a elegir en la computadora (2026-11-02, pedido de Mati): cada pregunta en un solo renglón, con el título a la izquierda.
const { test, expect } = require('@playwright/test');
const { vigilarErrores } = require('./helpers');

let errores;
test.beforeEach(async ({ page }) => { errores = vigilarErrores(page); await page.addInitScript(() => { try { localStorage.removeItem('elegir'); } catch (e) {} }); });
test.afterEach(() => expect(errores).toEqual([]));

for (const ancho of [1024, 1280, 1440]) {
  test(`a ${ancho} px cada pregunta ocupa un solo renglón y las sugerencias van debajo`, async ({ page }) => {
    await page.setViewportSize({ width: ancho, height: 900 });
    await page.goto('/index.html');
    await page.waitForSelector('.elegir-preg');
    const r = await page.evaluate(() => {
      const filas = [...document.querySelectorAll('.elegir-preg fieldset')].map(f => {
        const l = f.querySelector('.elegir-leyenda').getBoundingClientRect(), ops = [...f.querySelectorAll('.elegir-ops label')].map(x => x.getBoundingClientRect());
        return { t: f.querySelector('.elegir-leyenda').textContent.slice(0, 24), renglones: new Set(ops.map(o => Math.round(o.top))).size, aLaIzquierda: ops.length ? ops[0].left > l.right - 1 : true };
      });
      const p = document.querySelector('.elegir-preg').getBoundingClientRect(), res = document.querySelector('.elegir-resultados').getBoundingClientRect();
      return { filas, debajo: res.top >= p.bottom - 1, altoPreguntas: Math.round(p.height) };
    });
    for (const f of r.filas.filter(f => f.renglones > 0)) { expect(f.renglones, f.t).toBe(1); expect(f.aLaIzquierda, f.t).toBe(true); }
    expect(r.debajo).toBe(true);
    expect(r.altoPreguntas).toBeLessThan(700);
  });
}

test('en el celular las preguntas siguen apiladas, con el título arriba', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/index.html');
  await page.waitForSelector('.elegir-preg');
  const r = await page.evaluate(() => { const f = document.querySelector('.elegir-preg fieldset:nth-of-type(2)'); const l = f.querySelector('.elegir-leyenda').getBoundingClientRect(), o = f.querySelector('.elegir-ops').getBoundingClientRect(); return o.top >= l.bottom - 1; });
  expect(r).toBe(true);
});
