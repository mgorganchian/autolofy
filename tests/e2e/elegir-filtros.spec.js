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
  // Arranca «Con niños» (2026-11-07): el tamaño no se achica, los límites los ponen las plazas y el ISOFIX. Solo «Adulto atrás» saca la A y la B.
  expect(await marcados(page, 'seg')).toEqual(['A', 'B', 'C', 'D']);
  await page.locator('label:has(input[name="el-quien"][value=""])').click();
  expect(await marcados(page, 'seg')).toEqual(['A', 'B', 'C', 'D']);
  await page.locator('label:has(input[name="el-quien"][value="ninos"])').click();
  expect(await marcados(page, 'seg')).toEqual(['A', 'B', 'C', 'D']);
  await page.locator('label:has(input[name="el-quien"][value="adultos"])').click();
  expect(await marcados(page, 'seg')).toEqual(['C', 'D']);
  // Con 6 o 7 plazas no se fija el tamaño (issue #184): el filtro de plazas ya garantiza los asientos.
  await page.locator('label:has(input[name="el-plazas"][value="6"])').click();
  expect(await marcados(page, 'seg')).toEqual(['A', 'B', 'C', 'D']);
  await page.locator('label:has(input[name="el-plazas"][value="5"])').click();
  expect(await marcados(page, 'seg')).toEqual(['C', 'D']);
  // Lo toca a mano: ya no lo pisan las respuestas, y vuelve con «Volver a la sugerencia».
  await page.locator('label:has(input[name="elm-seg"][value="C"])').click();
  expect(await marcados(page, 'seg')).toEqual(['D']);
  await page.locator('label:has(input[name="el-quien"][value="ninos"])').click();
  expect(await marcados(page, 'seg')).toEqual(['D']);
  await page.locator('label:has(input[name="el-quien"][value="adultos"])').click();
  await page.locator('[data-sugerir="seg"]').click();
  expect(await marcados(page, 'seg')).toEqual(['C', 'D']);
  // Destildar todo equivale a no filtrar.
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
  // Los vecinos (PHEV o EV) entran solo como «casi» y lo dicen; el mild y la nafta no entran nunca.
  const v = await page.evaluate(() => { const r = Object.assign({}, elegirResp, { presu: '', seg: 'A,B,C,D', carro: '', quien: '' }), t = tipo => { const i = CARS.findIndex(c => c.type === tipo && c.status === 'venta'); return elegirDesvio(i, r); };
    return { phev: t('phev'), ev: t('ev'), mhev: t('mhev'), ice: t('ice') }; });
  expect(v.phev.txt).toBe('Es enchufable (PHEV)');
  expect(v.ev).toBeNull(); expect(v.mhev).toBeNull(); expect(v.ice).toBeNull();
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
  expect(r.casi.txt).toBe('Otro tamaño (chico)');
  expect(r.no).toBeNull();
  await page.evaluate(() => localStorage.setItem('elegir', JSON.stringify({ carro: 'suv-c' })));
  await page.reload();
  expect(await page.evaluate(() => elegirResp.carro)).toBe('suv');
  await page.evaluate(() => localStorage.setItem('elegir', JSON.stringify({ carro: 'auto' })));
  await page.reload();
  expect(await page.evaluate(() => elegirResp.carro)).toBe('sedan,hatch,coupe');
});

test('los cuatro tamaños (A a D) van en una sola fila, también en el celular, sin partir las palabras', async ({ page }) => {
  const r = await page.locator('.elegir-ops[data-q="seg"] label').evaluateAll(ls => ({ tops: [...new Set(ls.map(l => Math.round(l.getBoundingClientRect().top)))], n: ls.length,
    textos: ls.map(l => l.textContent.trim()) }));
  expect(r.n).toBe(4);
  expect(r.tops.length).toBe(1);
  expect(r.textos).toEqual(['UrbanoA · Kwid, Mobi', 'ChicoB · 208, Yaris Cross', 'MedianoC · Corolla, Territory', 'GrandeD · Song Pro, Hilux']);
  const anchos = await page.locator('.elegir-ops[data-q="seg"] span').evaluateAll(ss => ss.map(s => [Math.round(s.scrollWidth), Math.round(s.clientWidth)]));
  for (const [sw, cw] of anchos) expect(sw).toBeLessThanOrEqual(cw + 1);
});

test('«Me da igual» es una casilla al costado del título (tipo de auto y propulsión), no un botón más', async ({ page }) => {
  for (const k of ['carro', 'prop']){
    const r = await page.evaluate(k => { const f = document.querySelector('.elegir-ops[data-q="' + k + '"]').closest('fieldset'), l = f.querySelector('.elegir-leyenda'), c = l.querySelector('label.leyenda-igual input[type="checkbox"]');
      return { dentro: !!c, enOpciones: !!f.querySelector('.elegir-ops input[value="__igual"]'), mismaFila: c && Math.abs(c.getBoundingClientRect().top - l.querySelector('span').getBoundingClientRect().top) < 30 }; }, k);
    expect(r.dentro, k).toBe(true);
    expect(r.enOpciones, k).toBe(false);
  }
  const n = await page.locator('.elegir-ops[data-q="carro"] label').count();
  expect(n).toBe(6);
});

test('con solo deportivos, el tamaño queda grisado y no filtra (issue #184)', async ({ page }) => {
  await page.locator('label:has(input[name="el-quien"][value="adultos"])').click();
  expect(await marcados(page, 'seg')).toEqual(['C', 'D']);
  await page.locator('label:has(input[name="elm-carro"][value="coupe"])').click();
  const f = page.locator('.elegir-ops[data-q="seg"]').locator('xpath=..');
  await expect(f).toHaveClass(/gris/);
  await expect(f).toContainText('Los deportivos no se eligen por tamaño.');
  expect(await page.locator('input[name="elm-seg"]:disabled').count()).toBe(4);
  // Entran los deportivos de cualquier largo, sin «casi» por el tamaño.
  const r = await page.evaluate(() => { const o = elegirCalcular(Object.assign({}, elegirNorm(elegirResp), { presu: '', prop: '', plazas: '4', quien: '' }));
    return { cuerpos: [...new Set(o.todos.map(i => CARS[i].body))].sort(), seg: [...new Set(o.todos.map(i => CARS[i].size))],
      dep: CARS.filter(c => c.size === 'dep' && c.status === 'venta').length, n: o.todos.length }; });
  expect(r.cuerpos).toEqual(['Convertible', 'Coupé']);
  expect(r.seg).toEqual(['dep']);
  // El tamaño elegido no los saca ni los marca como «casi»: el MINI Cabrio (3,88 m) y el Mustang (4,79 m) entran igual con «Mediano».
  const d = await page.evaluate(() => ['MINI Cooper S Cabrio', 'Ford Mustang Dark Horse 5.0L V8'].map(n =>
    elegirDesvio(CARS.findIndex(c => c.name === n), { presu: '', plazas: '4', carro: 'coupe', seg: 'C' })));
  expect(d).toEqual([0, 0]);
  // Con deportivos y otro tipo, el tamaño vuelve a filtrar a los otros.
  await page.locator('label:has(input[name="elm-carro"][value="sedan"])').click();
  await expect(f).not.toHaveClass(/gris/);
  expect(await page.locator('input[name="elm-seg"]:disabled').count()).toBe(0);
});

test('con 6 o 7 plazas entran los de 7 asientos de cualquier tamaño, como la Spin (issue #184)', async ({ page }) => {
  await page.locator('label:has(input[name="el-plazas"][value="6"])').click();
  const r = await page.evaluate(() => { const r = Object.assign({}, elegirNorm(elegirResp), { presu: '', prop: '', quien: '' }), d = n => elegirDesvio(CARS.findIndex(c => c.name === n), r);
    return { spin: d('Chevrolet Spin 1.8 Premier AT 7A'), glb: d('Mercedes-Benz GLB 250 4MATIC Progressive') }; });
  expect(r.spin).toBe(0);
  expect(r.glb).toBe(0);
});

test('el BJ30 es grande (D) y con «Mediano» aparece como «casi»', async ({ page }) => {
  const r = await page.evaluate(() => { const i = CARS.findIndex(c => c.name === 'BAIC BJ30 4x4'); return { size: CARS[i].size, d: elegirDesvio(i, { presu: '', plazas: '5', seg: 'C' }) }; });
  expect(r.size).toBe('big');
  expect(r.d.txt).toBe('Otro tamaño (grande)');
});
