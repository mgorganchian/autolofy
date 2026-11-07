// 2026-11-07, pedido de Mati: «Ayudame a elegir» arma tres filtros con las respuestas (tamaño A a D, propulsión y tipo de auto) y se pueden cambiar a mano.
const { test, expect } = require('@playwright/test');

test.beforeEach(async ({ page }) => {
  await page.goto('/index.html');
  await page.evaluate(() => { localStorage.removeItem('elegir'); });
  await page.reload();
  await page.locator('#vistaElegir').click();
});

const marcados = (page, k) => page.locator('input[name="elm-' + k + '"]:checked').evaluateAll(l => l.map(x => x.value));

test('el tamaño sale de quiénes viajan y de las plazas, y se puede cambiar', async ({ page }) => {
  expect(await marcados(page, 'seg')).toEqual(['A', 'B', 'C', 'D']);
  await page.locator('label:has(input[name="el-quien"][value="ninos"])').click();
  expect(await marcados(page, 'seg')).toEqual(['B', 'C', 'D']);
  await page.locator('label:has(input[name="el-quien"][value="adultos"])').click();
  expect(await marcados(page, 'seg')).toEqual(['C', 'D']);
  await page.locator('label:has(input[name="el-plazas"][value="6"])').click();
  expect(await marcados(page, 'seg')).toEqual(['D']);
  // Lo toca a mano: ya no lo pisan las respuestas, y vuelve con «Volver a la sugerencia».
  await page.locator('label:has(input[name="elm-seg"][value="C"])').click();
  expect(await marcados(page, 'seg')).toEqual(['C', 'D']);
  await page.locator('label:has(input[name="el-quien"][value="ninos"])').click();
  expect(await marcados(page, 'seg')).toEqual(['C', 'D']);
  await page.locator('[data-sugerir="seg"]').click();
  expect(await marcados(page, 'seg')).toEqual(['D']);
  // Destildar todo equivale a no filtrar.
  await page.locator('label:has(input[name="el-plazas"][value="5"])').click();
  await page.locator('label:has(input[name="el-quien"][value=""])').click();
  for (const l of await marcados(page, 'seg')) await page.locator('label:has(input[name="elm-seg"][value="' + l + '"])').click();
  expect(await marcados(page, 'seg')).toEqual(['A', 'B', 'C', 'D']);
});

test('la propulsión sale del uso y del enchufe: EV, PHEV o HEV, y nunca mild ni nafta', async ({ page }) => {
  const caso = async (uso, enchufe) => {
    await page.locator('label:has(input[name="el-uso"][value="' + uso + '"])').click();
    await page.locator('label:has(input[name="el-enchufe"][value="' + enchufe + '"])').click();
    return marcados(page, 'prop');
  };
  expect(await caso('ciudad', 'si')).toEqual(['ev']);
  expect(await caso('mixto', 'si')).toEqual(['phev']);
  expect(await caso('ruta', 'si')).toEqual(['phev']);
  // «No sé» (el valor de entrada) sugiere PHEV: sirve con o sin enchufe. Sin dónde cargar, HEV.
  for (const u of ['ciudad', 'mixto', 'ruta']) expect(await caso(u, 'nose'), u + '/nose').toEqual(['phev']);
  for (const u of ['ciudad', 'mixto', 'ruta']) expect(await caso(u, 'no'), u + '/no').toEqual(['hev']);
  // Tierra y trabajo: me da igual (casi no hay híbridos 4x4 ni pickups híbridas).
  expect(await caso('tierra', 'si')).toEqual(['__igual']);
  expect(await page.locator('input[name="elm-prop"][value="__igual"]').isChecked()).toBe(true);
  expect(await caso('carga', 'no')).toEqual(['__igual']);
  // La propulsión elegida excluye: con HEV solo hay híbridos.
  await caso('mixto', 'no');
  const tipos = await page.evaluate(() => elegirCalcular(elegirResp).todos.map(i => CARS[i].type));
  expect(tipos.length).toBeGreaterThan(0);
  expect(new Set(tipos)).toEqual(new Set(['hev']));
  // A mano: tilda el mild-hybrid y entra.
  await page.locator('label:has(input[name="elm-prop"][value="mhev"])').click();
  expect(await marcados(page, 'prop')).toEqual(['hev', 'mhev']);
  await page.locator('label:has(input[name="el-enchufe"][value="si"])').click();
  expect(await marcados(page, 'prop')).toEqual(['hev', 'mhev']);   // lo tocó a mano: no se pisa
});

test('el tipo de auto son casillas: «Me da igual» las apaga y cada tipo filtra', async ({ page }) => {
  expect(await marcados(page, 'carro')).toEqual(['__igual']);
  await page.locator('label:has(input[name="elm-carro"][value="sedan"])').click();
  await page.locator('label:has(input[name="elm-carro"][value="pickup"])').click();
  expect(await marcados(page, 'carro')).toEqual(['sedan', 'pickup']);
  const cuerpos = await page.evaluate(() => { const r = Object.assign({}, elegirResp, { presu: '', seg: 'A,B,C,D', prop: '' }); return [...new Set(elegirCalcular(r).todos.map(i => CARS[i].body))].sort(); });
  expect(cuerpos).toEqual(['Pickup', 'Sedán']);
  await page.locator('label:has(input[name="elm-carro"][value="__igual"])').click();
  expect(await marcados(page, 'carro')).toEqual(['__igual']);
  // Están todas las categorías de la tabla.
  const tipos = await page.locator('input[name="elm-carro"]').evaluateAll(l => l.map(x => x.value));
  expect(tipos).toEqual(['__igual', 'suv', 'sedan', 'hatch', 'pickup', 'minivan', 'coupe']);
  const sinTipo = await page.evaluate(() => CARS.filter(c => !CARRO_GRUPO[c.body]).map(c => c.body));
  expect(sinTipo).toEqual([]);
});

test('el tamaño de al lado queda como «casi» y las respuestas viejas se migran', async ({ page }) => {
  const r = await page.evaluate(() => {
    const i = CARS.findIndex(c => c.size === 'compact' && c.status === 'venta'), l = SEG_ABCD[CARS[i].size];
    return { l, casi: elegirDesvio(i, { presu: '', plazas: '5', seg: 'C,D' }), no: elegirDesvio(i, { presu: '', plazas: '5', seg: 'D' }) };
  });
  expect(r.l).toBe('B');
  expect(r.casi.txt).toBe('Otro tamaño (B)');
  expect(r.no).toBeNull();
  await page.evaluate(() => localStorage.setItem('elegir', JSON.stringify({ carro: 'suv-c' })));
  await page.reload();
  expect(await page.evaluate(() => elegirResp.carro)).toBe('suv');
  await page.evaluate(() => localStorage.setItem('elegir', JSON.stringify({ carro: 'auto' })));
  await page.reload();
  expect(await page.evaluate(() => elegirResp.carro)).toBe('sedan,hatch,coupe');
});
