// Ayudame a elegir arranca vacío (2026-11-21, auditoría de UX con Impeccable, decisión de Mati): antes arrancaba con 5 plazas,
// «Con niños», «Ciudad y ruta», «No sé» y el presupuesto más barato, y eso dejaba sugeridos enchufables sin que nadie los pidiera.
// Ahora nada viene marcado y, hasta que la persona contesta dos preguntas, se muestran los autos de la tabla con más patentamientos
// en 2026 entre los que cumplen lo marcado.
const { test, expect } = require('@playwright/test');
const { vigilarErrores } = require('./helpers');

let errores;
test.beforeEach(async ({ page }) => { errores = vigilarErrores(page); await page.addInitScript(() => { try { localStorage.removeItem('elegir'); } catch (e) {} }); await page.goto('/index.html'); });
test.afterEach(() => expect(errores).toEqual([]));

const marcar = (page, k, v) => page.locator('label:has(input[name="el-' + k + '"][value="' + v + '"])').click();

test('al entrar no hay ninguna respuesta marcada ni un filtro de propulsión sugerido', async ({ page }) => {
  await expect(page.locator('input[name="el-plazas"]:checked, input[name="el-uso"]:checked, input[name="el-enchufe"]:checked')).toHaveCount(0);
  await expect(page.locator('input[name="el-quien"][value=""]')).toBeChecked();
  await expect(page.locator('#presuIgual')).toBeChecked();
  await expect(page.locator('input[name="elm-prop"][value="__igual"]')).toBeChecked();
  await expect(page.locator('input[name="elm-carro"][value="__igual"]')).toBeChecked();
  expect(await page.evaluate(() => [elegirResp.prop, elegirResp.seg, elegirRespondidas(elegirResp)])).toEqual(['', 'A,B,C,D', 0]);
  await expect(page.locator('.elegir-tus')).toContainText('Todavía no respondiste ninguna pregunta');
});

test('sin respuestas muestra los más patentados en 2026, sin repetir una cifra compartida, y lo dice', async ({ page }) => {
  await expect(page.locator('#elegirResTit')).toHaveText('Los más vendidos');
  await expect(page.locator('.elegir-neutral')).toContainText('Respondé dos preguntas');
  const r = await page.evaluate(() => {
    const ventas = i => { const v = rkValor(i, 'Patentamientos 2026 (unidades)'); return v.tipo === 'ok' ? v.n : -1; };
    const top = document.getElementById('elegirHoja').dataset.top.split(',').map(Number);
    const enVenta = CARS.map((c, i) => i).filter(i => CARS[i].status === 'venta');
    return { v: top.map(ventas), pares: top.map(i => CARS[i].brand + ventas(i)), max: Math.max(...enVenta.map(ventas)) };
  });
  // Ordenados de más a menos patentados, el primero es el más patentado de los que están a la venta.
  expect(r.v).toEqual([...r.v].sort((a, b) => b - a));
  expect(r.v[0]).toBe(r.max);
  expect(new Set(r.pares).size).toBe(r.pares.length);
  await expect(page.locator('.elegir-res > li').first()).toContainText('patentados en 2026');
});

test('con una respuesta sigue en los más vendidos; con dos, sugiere a medida', async ({ page }) => {
  await marcar(page, 'uso', 'ciudad');
  await expect(page.locator('#elegirResTit')).toHaveText('Los más vendidos');
  await expect(page.locator('.elegir-neutral')).toContainText('Respondé una pregunta más');
  await expect(page.locator('.elegir-neutral')).toContainText('entre los que cumplen lo que marcaste');
  await marcar(page, 'plazas', '5');
  await expect(page.locator('#elegirResTit')).toHaveText('Te sugerimos');
  await expect(page.locator('.elegir-neutral')).toHaveCount(0);
  await expect(page.locator('.elegir-tus')).toContainText('5 plazas');
});

test('el enchufe sin responder no arma ninguna propulsión; respondido, sí', async ({ page }) => {
  await marcar(page, 'uso', 'mixto');
  expect(await page.evaluate(() => elegirResp.prop)).toBe('');
  await marcar(page, 'enchufe', 'no');
  expect(await page.evaluate(() => elegirResp.prop)).toBe('hev');
});
