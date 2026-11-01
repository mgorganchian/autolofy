// Rangos de «¿Cuánto querés gastar?» (2026-11-01, pedido de Mati): cada opción dice los dólares en una sola fila
// (los pesos van debajo, también en una fila), en el celular y en la computadora.
const { test, expect } = require('@playwright/test');
const { vigilarErrores } = require('./helpers');

let errores;
test.beforeEach(async ({ page }) => { errores = vigilarErrores(page); await page.goto('/index.html'); });
test.afterEach(() => expect(errores).toEqual([]));

test('cada franja de presupuesto muestra los dólares y los pesos en una fila', async ({ page }) => {
  const r = await page.evaluate(() => [...document.querySelectorAll('input[name="el-presu"]:not([value=""]) + span')].map(sp => {
    const filas = nodo => { const rg = document.createRange(); rg.selectNodeContents(nodo);
      return new Set([...rg.getClientRects()].filter(x => x.width > 0).map(x => Math.round(x.top))).size; };
    const usd = [...sp.childNodes].find(n => n.nodeType === 3), peso = sp.querySelector('.precio-pesos');
    const rg = document.createRange(); rg.selectNodeContents(usd);
    return { t: usd.textContent, usd: new Set([...rg.getClientRects()].map(x => Math.round(x.top))).size, pesos: peso ? filas(peso) : 1 };
  }));
  expect(r.length).toBe(7);
  for (const x of r){ expect(x.usd, x.t).toBe(1); expect(x.pesos, x.t).toBe(1); }
});

test('el cartel de cada franja dice el corte exacto', async ({ page }) => {
  const tips = await page.evaluate(() => [...document.querySelectorAll('input[name="el-presu"]:not([value=""]) + span')].map(s => s.dataset.tip));
  expect(tips[1]).toMatch(/^De USD 28\.001 a 32\.000\./);
  expect(tips[0]).toMatch(/^Hasta USD 28\.000\./);
  expect(tips[6]).toMatch(/^Más de USD 66\.000\./);
});
