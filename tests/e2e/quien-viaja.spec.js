// «¿Quiénes viajan seguido?» (2026-11-01, pedido de Mati): con niños se pide ISOFIX; con todos adultos, los autos
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

test('con todos adultos, un auto de segmento A o B queda como casi y lo dice', async ({ page }) => {
  const r = await page.evaluate(b => {
    const q = { ...b, quien: 'adultos' }, o = { ...b, quien: '' };
    const chicos = CARS.map((c, i) => i).filter(i => ['mini', 'compact'].includes(CARS[i].size) && CARS[i].status === 'venta' && elegirDesvio(i, o) === 0);
    const otros = CARS.map((c, i) => i).filter(i => !['mini', 'compact'].includes(CARS[i].size) && CARS[i].status === 'venta' && elegirDesvio(i, o) === 0);
    return { chicos: chicos.length, textos: [...new Set(chicos.map(i => (elegirDesvio(i, q) || {}).txt))], otros: otros.every(i => elegirDesvio(i, q) === 0) };
  }, base);
  expect(r.chicos).toBeGreaterThan(20);
  expect(r.textos.every(t => /^Chico para adultos \(segmento [AB]\)$/.test(t))).toBe(true);
  expect(r.otros).toBe(true);
});

test('la pregunta está en la hoja con «me da igual» marcada y el resumen la nombra', async ({ page }) => {
  await page.goto('/index.html');
  await expect(page.locator('input[name="el-quien"]')).toHaveCount(3);
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
  await expect(page.locator('.quien-nota')).toHaveCount(0);
  await page.locator('label:has(input[name="el-quien"][value="ninos"])').click();
  await expect(page.locator('.quien-nota')).toContainText('dos adultos');
  const chicos = await page.locator('input[name="el-quien"][value="ninos"] + span svg circle').count();
  expect(chicos).toBe(5);
  await page.locator('label:has(input[name="el-plazas"][value="4"])').click();
  expect(await page.locator('input[name="el-quien"][value="ninos"] + span svg circle').count()).toBe(4);
  const filas = await page.evaluate(() => new Set([...document.querySelectorAll('input[name="el-quien"] + span')].map(s => Math.round(s.getBoundingClientRect().top))).size);
  if ((await page.evaluate(() => innerWidth)) <= 640) expect(filas).toBe(1);
});
