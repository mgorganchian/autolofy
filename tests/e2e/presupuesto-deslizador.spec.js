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
  await page.evaluate(() => { elegirResp.presu = '25000-35000'; pintarElegir(true); });
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

test('las flechas corren los dos extremos lo mismo, de a USD 1.000', async ({ page }) => {
  await page.evaluate(() => { elegirResp.presu = '25000-35000'; pintarElegir(true); });
  for (const [id, dir] of [['#presuDer', 1], ['#presuDer', 1], ['#presuIzq', -1], ['#presuIzq', -1], ['#presuIzq', -1]]) {
    const antes = (await estado(page)).p;
    await page.locator(id).click();
    const d = (await estado(page)).p;
    expect(d.min - antes.min).toBe(dir * 1000);
    expect(d.max - antes.max).toBe(dir * 1000);
  }
});

test('las flechas frenan contra el borde sin achicar el rango', async ({ page }) => {
  await page.evaluate(() => { elegirResp.presu = (PRESU_PISO + 1000) + '-' + (PRESU_PISO + 11000); pintarElegir(true); });
  await page.locator('#presuIzq').click(); await page.locator('#presuIzq').click();
  const e = (await estado(page)).p, piso = await page.evaluate(() => PRESU_PISO);
  expect(e.min).toBe(piso); expect(e.max).toBe(piso + 10000);
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
  expect(d.p.max - d.p.min).toBe(antes.p.max - antes.p.min);
});

// Escala por tramos (2026-11-08, pedido de Mati): casi todos los autos están entre unos USD 21.000 y 43.000, así que ese tramo se lleva la mayor parte del riel.
test('el tramo donde se concentran los autos tiene al menos el doble de píxeles por USD 1.000 que el resto del riel', async ({ page }) => {
  const r = await page.evaluate(() => { const W = document.getElementById('presuPista').getBoundingClientRect().width, px = (a, b) => (presuPos(b) - presuPos(a)) * W / ((b - a) / 1000);
    const [, c1, c2, c3] = PRESU_CORTE; return { W, c: PRESU_CORTE, denso: px(c1, c2), antes: px(PRESU_PISO, c1), medio: px(c2, c3), alto: px(c3, PRESU_TOPE), lineal: W / ((PRESU_TOPE - PRESU_PISO) / 1000),
      autosDenso: PRESU_PRECIOS.filter(p => p >= c1 && p < c2).length, n: PRESU_PRECIOS.length }; });
  expect(r.c[1]).toBeGreaterThanOrEqual(20000); expect(r.c[1]).toBeLessThanOrEqual(22000);
  expect(r.c[2]).toBeGreaterThanOrEqual(40000); expect(r.c[2]).toBeLessThanOrEqual(46000);
  expect(r.autosDenso / r.n).toBeGreaterThan(.55);
  expect(r.denso).toBeGreaterThanOrEqual(r.lineal * 2.5);
  expect(r.denso).toBeGreaterThanOrEqual(r.antes * 2); expect(r.denso).toBeGreaterThanOrEqual(r.medio * 2);
  // idas y vueltas entre dólares y posición, y el borde derecho
  const ida = await page.evaluate(() => [17000, 21000, 33000, 43000, 60000, 110000].map(u => Math.round(presuUsdDe(presuPos(u)))));
  expect(ida).toEqual([17000, 21000, 33000, 43000, 60000, 110000]);
});

test('desde el último corte los mangos saltan de a USD 5.000 y hasta ahí de a 1.000', async ({ page }) => {
  const corte = await page.evaluate(() => PRESU_CORTE[3]);
  await page.evaluate(c => { elegirResp.presu = (c - 5000) + '-' + (c + 10000); pintarElegir(true); }, corte);
  await page.locator('#presuMax').focus();
  await page.keyboard.press('ArrowRight');
  expect((await estado(page)).p.max).toBe(corte + 15000);
  await page.locator('#presuMin').focus();
  await page.keyboard.press('ArrowRight');
  expect((await estado(page)).p.min).toBe(corte - 4000);
  await page.evaluate(c => { elegirResp.presu = c + '-' + (c + 20000); pintarElegir(true); }, corte);
  await page.locator('#presuMin').focus();
  await page.keyboard.press('ArrowLeft');
  expect((await estado(page)).p.min).toBe(corte - 1000);
});

test('arrastrar el mango del mínimo con el dedo lo deja donde está el dedo en el riel por tramos', async ({ page }) => {
  await page.evaluate(() => { elegirResp.presu = '17000-60000'; pintarElegir(true); });
  const m = await page.locator('#presuMin').boundingBox(), pista = await page.locator('#presuPista').boundingBox();
  const x = pista.x + pista.width * .36;   // a mitad del tramo denso
  await page.mouse.move(m.x + m.width / 2, m.y + m.height / 2);
  await page.mouse.down(); await page.mouse.move(x, m.y + m.height / 2, { steps: 8 }); await page.mouse.up();
  const e = await estado(page), esperado = await page.evaluate(() => Math.round(presuUsdDe(.36) / 1000) * 1000);
  expect(e.p.min).toBe(esperado);
  expect(e.p.min).toBeGreaterThan(30000); expect(e.p.min).toBeLessThan(36000);
});
