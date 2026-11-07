// Deslizador de «¿Cuánto querés gastar?» (2026-11-01, pedido de Mati): dos mangos de a USD 1.000 y la barra del medio, que al
// moverse hacia la derecha estira el fin para seguir capturando la misma cantidad de autos. Arranca en el rango más bajo.
const { test, expect } = require('@playwright/test');
const { vigilarErrores } = require('./helpers');

let errores;
test.beforeEach(async ({ page }) => { errores = vigilarErrores(page); await page.addInitScript(() => { try { localStorage.removeItem('elegir'); } catch (e) {} }); await page.goto('/index.html'); });
test.afterEach(() => expect(errores).toEqual([]));

const estado = page => page.evaluate(() => ({ s: elegirResp.presu, p: presuLeer(elegirResp.presu || presuInicial()), n: +document.getElementById('presuN').textContent.match(/\d+/)[0],
  usd: document.getElementById('presuUsd').textContent, pesos: document.getElementById('presuPesos').textContent }));

test('arranca en el rango más bajo, con dólares, pesos y la cantidad de autos', async ({ page }) => {
  const e = await estado(page);
  expect(e.p.min).toBe(await page.evaluate(() => PRESU_PISO));
  expect(e.p.max % 1000).toBe(0);
  // 2026-11-07: el rango de arranque llega hasta el 12.º auto más barato que cumple la propulsión sugerida (y lo demás armado), no hasta el 30.º de todos.
  const r = await page.evaluate(() => { const o = elegirCalcular(elegirResp); return { cumplen: o.total, n: o.top.length, casi: o.casi, N: elegirN(), prop: elegirResp.prop }; });
  expect(r.prop).toBe('phev');
  expect(r.cumplen).toBeGreaterThanOrEqual(r.N);
  expect(r.casi).toBe(0);
  expect(e.n).toBeGreaterThan(r.cumplen);
  expect(e.usd).toMatch(/^USD [\d.]+ a [\d.]+$/);
  expect(e.pesos).toMatch(/^\$ [\d,]+ M a \$ [\d,]+ M$/);
});

test('arrastrar la barra hacia la derecha mueve el inicio y estira el fin: la cantidad de autos casi no cambia', async ({ page }) => {
  const antes = await estado(page);
  const b = await page.locator('#presuBarra').boundingBox(), pista = await page.locator('#presuPista').boundingBox();
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
  await page.mouse.down();
  await page.mouse.move(b.x + b.width / 2 + pista.width * .6, b.y + b.height / 2, { steps: 8 });
  await page.mouse.up();
  const despues = await estado(page);
  expect(despues.p.min).toBeGreaterThan(antes.p.min + 10000);
  expect(despues.p.min % 1000).toBe(0);
  expect(Math.abs(despues.n - antes.n)).toBeLessThanOrEqual(3);
  // el fin se estiró más que el inicio: el rango tiene más dólares de ancho porque arriba los autos están más separados
  expect((despues.p.max ?? 1e9) - despues.p.min).toBeGreaterThan(antes.p.max - antes.p.min);
});

test('los mangos mueven cada extremo de a USD 1.000 y las flechas también', async ({ page }) => {
  const antes = await estado(page);
  await page.locator('#presuMax').focus();
  await page.keyboard.press('ArrowRight');
  const a = await estado(page);
  expect(a.p.max).toBe(antes.p.max + 1000);
  expect(a.n).toBeGreaterThanOrEqual(antes.n);
  await page.locator('#presuMin').focus();
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowRight');
  const b = await estado(page);
  expect(b.p.min).toBe(antes.p.min + 2000);
});

test('arrastrar el mango del máximo hasta el final deja el rango sin tope y «Me da igual» lo apaga', async ({ page }) => {
  const m = await page.locator('#presuMax').boundingBox(), pista = await page.locator('#presuPista').boundingBox();
  await page.mouse.move(m.x + m.width / 2, m.y + m.height / 2);
  await page.mouse.down();
  await page.mouse.move(pista.x + pista.width + 30, m.y + m.height / 2, { steps: 12 });
  await page.mouse.up();
  const e = await estado(page);
  expect(e.s).toMatch(/^\d+-$/);
  expect(e.usd).toMatch(/, sin tope$/);
  await page.locator('#presuIgual').check();
  expect(await page.evaluate(() => elegirResp.presu)).toBe('');
  await expect(page.locator('#presu')).toHaveClass(/apagado/);
});

test('el filtro usa el rango del deslizador', async ({ page }) => {
  const r = await page.evaluate(() => { const o = { presu: '30000-40000', plazas: '4', quien: '', carro: '', uso: 'mixto', enchufe: 'nose', movilidad: '' };
    return CARS.map((c, i) => [c.status === 'venta' && PRECIO_CMP[i] != null, PRECIO_CMP[i], elegirDesvio(i, o)]).filter(x => x[0]).map(x => x[1] >= 30000 && x[1] <= 40000 ? x[2] === 0 || (x[2] && x[2].d !== undefined) : x[2] !== 0); });
  expect(r.every(Boolean)).toBe(true);
});

test('con un rango angosto la barra del medio sigue libre: los mangos quedan por fuera de ella', async ({ page }) => {
  await page.evaluate(() => { elegirResp.presu = '42000-45000'; pintarElegir(true); });
  const r = await page.evaluate(() => {
    const b = document.getElementById('presuBarra').getBoundingClientRect(), mi = document.getElementById('presuMin').getBoundingClientRect(), ma = document.getElementById('presuMax').getBoundingClientRect();
    const centro = document.elementFromPoint(b.left + b.width / 2, b.top + b.height / 2);
    return { centro: centro && centro.id, libre: mi.right <= b.left + 1 && ma.left >= b.right - 1, ancho: b.width };
  });
  expect(r.centro).toBe('presuBarra');
  expect(r.libre).toBe(true);
  expect(r.ancho).toBeGreaterThanOrEqual(28);
});

test('las flechas mueven todo el rango de a USD 1.000 y mantienen la cantidad de autos', async ({ page }) => {
  const antes = await estado(page);
  await page.locator('#presuDer').click();
  const a = await estado(page);
  expect(a.p.min).toBe(antes.p.min + 1000);
  expect(Math.abs(a.n - antes.n)).toBeLessThanOrEqual(2);
  await page.locator('#presuIzq').click();
  const b = await estado(page);
  expect(b.p.min).toBe(antes.p.min);
});

test('mantener apretada la flecha repite el paso', async ({ page }) => {
  const antes = await estado(page);
  const c = await page.locator('#presuDer').boundingBox();
  await page.mouse.move(c.x + c.width / 2, c.y + c.height / 2);
  await page.mouse.down();
  await page.waitForTimeout(1000);
  await page.mouse.up();
  const d = await estado(page);
  expect(d.p.min).toBeGreaterThanOrEqual(antes.p.min + 4000);
  expect(Math.abs(d.n - antes.n)).toBeLessThanOrEqual(4);
});
