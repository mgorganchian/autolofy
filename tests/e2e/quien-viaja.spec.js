// «¿Quiénes viajan seguido?» (2026-11-01, pedido de Mati): con niños se pide ISOFIX; con un adulto atrás, los autos
// chicos (segmento A o B del sitio) quedan como «casi»; «me da igual» no cambia nada.
const { test, expect } = require('@playwright/test');
const { vigilarErrores } = require('./helpers');

let errores;
test.beforeEach(async ({ page }) => { errores = vigilarErrores(page); await page.goto('/index.html?tabla'); });
test.afterEach(() => expect(errores).toEqual([]));

const base = { presu: '', plazas: '5', carro: '', uso: 'mixto', enchufe: 'nose' };

test('con niños, un auto sin ISOFIX no entra y uno que no informa queda como casi', async ({ page }) => {
  const r = await page.evaluate(b => {
    const q = { ...b, quien: 'ninos' }, o = { ...b, quien: '' };
    const con = [], sin = [], nd = [];
    CARS.forEach((c, i) => { if (c.status !== 'venta' || elegirDesvio(i, o) !== 0) return;
      const x = isofixDe(i), d = elegirDesvio(i, q);
      if (x === false) sin.push(d); else if (x === true) con.push(d); else nd.push(d && d.txt); });
    return { sin: sin.every(d => d === null), con: con.every(d => d === 0), nd: nd.every(t => t === 'No informa ISOFIX'), n: [sin.length, con.length, nd.length] };
  }, base);
  expect(r.n[1]).toBeGreaterThan(50);
  expect(r.sin && r.con && r.nd).toBe(true);
});

test('con un adulto atrás el tamaño sugerido es C y D: los A no entran, los B quedan como casi y lo dicen', async ({ page }) => {
  // 2026-11-07, pedido de Mati: «¿Quiénes viajan?» arma el filtro de tamaño (segmento A a D); antes era un «casi» fijo para A y B.
  const r = await page.evaluate(b => {
    const q = { ...b, quien: 'adultos', seg: elegirSugSeg({ plazas: '5', quien: 'adultos' }) }, o = { ...b, quien: '' };
    const ven = i => CARS[i].status === 'venta' && elegirDesvio(i, o) === 0;
    const por = t => CARS.map((c, i) => i).filter(i => CARS[i].size === t && ven(i));
    return { seg: q.seg, a: por('mini').map(i => elegirDesvio(i, q)), b: [...new Set(por('compact').map(i => (elegirDesvio(i, q) || {}).txt))],
      cd: [...por('mid'), ...por('big'), ...por('xl')].every(i => elegirDesvio(i, q) === 0) };
  }, base);
  expect(r.seg).toBe('C,D');
  expect(r.a.every(d => d === null)).toBe(true);
  expect(r.b).toEqual(['Otro tamaño (chico)']);
  expect(r.cd).toBe(true);
});

test('la pregunta está en la hoja con «me da igual» marcada y el resumen la nombra', async ({ page }) => {
  await page.goto('/index.html');
  await expect(page.locator('input[name="el-quien"]')).toHaveCount(3);
  // Desde el 2026-11-07 arranca «Con niños» (pedido de Mati); «Me da igual» se elige a mano.
  await expect(page.locator('input[name="el-quien"][value="ninos"]')).toBeChecked();
  await page.locator('label:has(input[name="el-quien"][value=""])').click();
  await expect(page.locator('input[name="el-quien"][value=""]')).toBeChecked();
  await page.locator('label:has(input[name="el-quien"][value="ninos"])').click();
  await expect(page.locator('#elegirHoja')).toContainText('Con niños');
});

test('en el celular, las preguntas de tres opciones van de a tres en una sola fila y sin partir el texto', async ({ page }) => {
  await page.goto('/index.html');
  const r = await page.evaluate(() => [...document.querySelectorAll('.elegir-ops[data-n="3"]')].map(g => {
    const bs = [...g.querySelectorAll('span')], tops = new Set(bs.map(b => Math.round(b.getBoundingClientRect().top)));
    return { filas: tops.size, n: bs.length };
  }));
  expect(r.length).toBeGreaterThanOrEqual(3);
  const ancho = await page.evaluate(() => innerWidth);
  if (ancho <= 640) for (const g of r) expect(g.filas).toBe(1);
});

test('cada opción de «quiénes viajan» lleva su dibujo del auto y la elegida explica el supuesto', async ({ page }) => {
  await page.goto('/index.html');
  const ops = page.locator('input[name="el-quien"] + span');
  await expect(ops).toHaveCount(3);
  for (let i = 0; i < 3; i++) await expect(ops.nth(i).locator('svg.quien-ico[aria-hidden="true"]')).toHaveCount(1);
  await page.locator('label:has(input[name="el-quien"][value=""])').click();   // arranca «Con niños» desde el 2026-11-07
  await expect(page.locator('.quien-nota')).toHaveCount(0);
  await page.locator('label:has(input[name="el-quien"][value="ninos"])').click();
  await expect(page.locator('.quien-nota')).toContainText('dos adultos');
  const chicos = await page.locator('input[name="el-quien"][value="ninos"] + span svg circle').count();
  expect(chicos).toBe(5);   // 2 adultos adelante y 3 chicos atrás
  await page.locator('label:has(input[name="el-plazas"][value="4"])').click();
  expect(await page.locator('input[name="el-quien"][value="ninos"] + span svg circle').count()).toBe(4);
  const filas = await page.evaluate(() => new Set([...document.querySelectorAll('input[name="el-quien"] + span')].map(s => Math.round(s.getBoundingClientRect().top))).size);
  if ((await page.evaluate(() => innerWidth)) <= 640) expect(filas).toBe(1);
});

test('con 6 o 7 plazas el dibujo tiene tres hileras de asientos', async ({ page }) => {
  await page.goto('/index.html');
  await page.locator('label:has(input[name="el-plazas"][value="6"])').click();
  await page.locator('label:has(input[name="el-quien"][value="ninos"])').click();
  expect(await page.locator('input[name="el-quien"][value="ninos"] + span svg circle').count()).toBe(7);   // 2 adultos y 5 chicos
  const filas = await page.evaluate(() => new Set([...document.querySelectorAll('input[name="el-quien"][value="adultos"] + span svg circle')].map(c => c.getAttribute('cy'))).size);
  expect(filas).toBe(3);
});
