// Navegación de Ayudame a elegir (issue #192, pedido de Sebastián): el encabezado alineado con la columna del contenido en la
// computadora, volver al mismo lugar desde otra vista (con Atrás o con la pestaña), «Empezar de nuevo» y cuántos autos cumplían
// antes de la última respuesta, en gris en la barra del pie.
const { test, expect } = require('@playwright/test');
const { vigilarErrores } = require('./helpers');

let errores;
test.beforeEach(({ page }) => { errores = vigilarErrores(page); });   // cada test arranca con un navegador nuevo: sin respuestas guardadas
test.afterEach(() => expect(errores).toEqual([]));

const caja = (page, sel) => page.locator(sel).evaluate(e => { const b = e.getBoundingClientRect(); return { l: b.left, r: b.right, c: (b.left + b.right) / 2 }; });
const sugeridos = page => page.locator('#elegirHoja').getAttribute('data-top');

test('en la computadora, el encabezado sigue los bordes de la columna de Ayudame a elegir', async ({ page }, info) => {
  test.skip(info.project.name !== 'escritorio', 'en el celular el encabezado sigue apilado');
  test.setTimeout(60_000);   // carga la página en tres anchos
  for (const ancho of [1024, 1440, 1920]) {
    await page.setViewportSize({ width: ancho, height: 900 });
    await page.goto('/index.html');
    const titulo = await caja(page, '#elegirTitulo'), logo = await caja(page, '.barra-marca'), herr = await caja(page, '.herr-gral');
    expect(Math.abs(logo.l - titulo.l), `logo a ${ancho} px`).toBeLessThanOrEqual(1);
    expect(Math.abs(herr.r - titulo.r), `botones a ${ancho} px`).toBeLessThanOrEqual(1);
    const medio = (titulo.l + titulo.r) / 2;
    for (const sel of ['#headerSubtitle', '.cota'])
      expect(Math.abs((await caja(page, sel)).c - medio), `${sel} centrado a ${ancho} px`).toBeLessThanOrEqual(2);
    // Pestañas y botones, en la misma fila.
    const [yt, yh] = await Promise.all(['.vista-toggle', '.herr-gral'].map(s => page.locator(s).evaluate(e => e.getBoundingClientRect().bottom)));
    expect(Math.abs(yt - yh)).toBeLessThanOrEqual(2);
  }
});

test('en la Tabla, la barra del sitio sigue la misma columna y va antes de buscar y filtrar', async ({ page }, info) => {
  await page.goto('/index.html?tabla');
  // Pestañas y botones generales antes del buscador, de las categorías y de las herramientas de la tabla (también al tabular).
  const orden = await page.evaluate(() => ['.vista-toggle', '.herr-gral', '#summaryBar', '#search', '#catScroll', '#herrTabla', '.diff-toggle']
    .map(s => document.querySelector(s)).every((e, i, a) => !i || (a[i - 1].compareDocumentPosition(e) & Node.DOCUMENT_POSITION_FOLLOWING)));
  expect(orden).toBe(true);
  const [nav, buscar] = await Promise.all(['.vista-toggle', '#search'].map(s => page.locator(s).evaluate(e => e.getBoundingClientRect().top)));
  expect(nav).toBeLessThan(buscar);
  if (info.project.name !== 'escritorio') return;
  // La barra sigue la columna de 1100 px de Ayudame a elegir (issue #200): logo a la izquierda, pestañas a su lado y botones
  // a la derecha, en la misma fila. El título grande va solo en Ayudame a elegir.
  const ancho = await page.evaluate(() => document.documentElement.clientWidth);
  const borde = Math.max(16, (ancho - 1100) / 2 + 16);
  const [l, t, h] = await Promise.all(['.barra-marca', '.vista-toggle', '.herr-gral'].map(s => caja(page, s)));
  expect(Math.abs(l.l - borde)).toBeLessThanOrEqual(1);
  expect(t.l).toBeGreaterThan(l.r);
  expect(Math.abs(h.r - (ancho - borde))).toBeLessThanOrEqual(1);
  await expect(page.locator('#headerSubtitle')).toBeHidden();
});

// Los clics van con element.click(): el de Playwright sube la página hasta el botón antes de tocarlo, y lo que se prueba es
// volver al lugar donde estaba la persona (con el teclado, o desde la ficha, que se abre sin mover la página).
const clic = (p, id) => p.evaluate(i => document.getElementById(i).click(), id);
for (const [nombre, salir, volver] of [
  ['Atrás desde la Tabla', p => clic(p, 'vistaTabla'), p => p.evaluate(() => history.back())],
  ['la pestaña desde la Tabla', p => clic(p, 'vistaTabla'), p => clic(p, 'vistaElegir')],
  ['Atrás desde el Ranking', p => clic(p, 'vistaRanking'), p => p.evaluate(() => history.back())],
  ['Atrás desde la ficha y «Ver todos sus datos en la tabla»', async p => {
    await p.evaluate(() => document.querySelector('#elegirHoja .elegir-nombre').click());
    await p.locator('#fichaVerTabla').click();
  }, async p => {
    await p.evaluate(() => history.back());
    await expect(p.locator('#fichaVerTabla')).toBeVisible();
    await p.evaluate(() => history.back());
  }],
]) {
  test(`${nombre}: Ayudame a elegir vuelve al mismo lugar y con los mismos sugeridos`, async ({ page }) => {
    await page.goto('/index.html');
    await expect(page.locator('.elegir-res > li').first()).toBeVisible();
    await page.evaluate(() => window.scrollTo(0, 700));
    const y0 = await page.evaluate(() => window.scrollY), top0 = await sugeridos(page);
    expect(y0).toBeGreaterThan(600);
    await salir(page);
    await expect(page.locator('#elegirHoja')).toBeHidden();
    await page.evaluate(() => window.scrollTo(0, 1500));
    await volver(page);
    await expect(page.locator('#elegirHoja')).toBeVisible();
    await expect.poll(() => page.evaluate(() => Math.round(window.scrollY))).toBe(Math.round(y0));
    await page.waitForTimeout(300);   // el navegador repone su scroll un rato después del popstate
    expect(Math.round(await page.evaluate(() => window.scrollY))).toBe(Math.round(y0));
    expect(await sugeridos(page)).toBe(top0);
  });
}

test('«Empezar de nuevo» vuelve las respuestas y los filtros a como estaban al entrar', async ({ page }) => {
  await page.goto('/index.html');
  const top0 = await sugeridos(page);
  await page.locator('input[name="el-plazas"][value="6"]').check({ force: true });
  await page.locator('input[name="el-uso"][value="tierra"]').check({ force: true });
  expect(await sugeridos(page)).not.toBe(top0);
  await page.locator('#elegirReiniciar').click();
  // Desde el 2026-11-21 «al entrar» es sin nada marcado.
  await expect(page.locator('input[name="el-plazas"]:checked, input[name="el-uso"]:checked, input[name="el-enchufe"]:checked')).toHaveCount(0);
  expect(await sugeridos(page)).toBe(top0);
  const guardado = await page.evaluate(() => JSON.parse(localStorage.getItem('elegir')));
  expect(guardado).toMatchObject({ presu: '', plazas: '', uso: '', enchufe: '', quien: '', carro: '', prop: '', segMan: false, propMan: false });
});

test('la barra del pie dice, en gris y en un renglón, cuántos cumplían antes de la última respuesta', async ({ page }) => {
  await page.goto('/index.html');
  const txt = page.locator('.elegir-barra-txt');
  const n0 = Number(await txt.locator('b').textContent());
  await expect(page.locator('.elegir-antes')).toHaveCount(0);   // al entrar no hay «antes»
  await page.locator('input[name="el-plazas"][value="6"]').check({ force: true });
  const n1 = Number(await txt.locator('b').textContent());
  expect(n1).not.toBe(n0);
  await expect(page.locator('.elegir-antes')).toHaveText(`Antes, ${n0}.`);
  // Discreto: del color de las notas, no del texto principal; y sin «…» (entra en el renglón).
  const [colAntes, colTxt] = await Promise.all([page.locator('.elegir-antes').evaluate(e => getComputedStyle(e).color), txt.evaluate(e => getComputedStyle(e).color)]);
  expect(colAntes).not.toBe(colTxt);
  expect(await txt.evaluate(e => e.scrollWidth <= e.clientWidth)).toBe(true);
});

test('las categorías de la Tabla y los criterios del Ranking se ven todos: en la computadora bajan de renglón', async ({ page }, info) => {
  await page.goto('/index.html?tabla');
  const medir = sel => page.locator(sel).evaluate(c => ({
    adentro: [...c.children].every(b => b.getBoundingClientRect().right <= innerWidth + 1),
    filas: new Set([...c.children].map(b => Math.round(b.getBoundingClientRect().top))).size,
  }));
  if (info.project.name === 'celular') {
    expect((await medir('#catScroll')).filas).toBe(1);   // en el celular siguen en una fila que se desliza con el dedo
    return;
  }
  const tabla = await medir('#catScroll');
  expect(tabla.adentro).toBe(true);
  expect(tabla.filas).toBeGreaterThan(1);
  await page.locator('#vistaRanking').click();
  await expect(page.locator('#rkScroll .rk-chip').first()).toBeVisible();
  expect((await medir('#rkScroll')).adentro).toBe(true);
});

test('«Elegir autos para comparar» va primero en la barra del resumen, antes de «Comparando…»', async ({ page }) => {
  await page.goto('/index.html?autos=byd-song-pro,gwm-haval-h6-4wd&ref=byd-song-pro');
  const btn = page.locator('#openModalBtn');
  await expect(btn).toHaveText('Elegir autos para comparar');
  const orden = await page.evaluate(() => {
    const bar = document.getElementById('summaryBar');
    const b = document.getElementById('openModalBtn').getBoundingClientRect();
    const t = document.getElementById('summaryText').getBoundingClientRect();
    const s = document.getElementById('shareBtn').getBoundingClientRect();
    return { primero: bar.firstElementChild.id, b, t, s, ancho: document.documentElement.scrollWidth, vw: innerWidth };
  });
  expect(orden.primero).toBe('openModalBtn');
  expect(orden.ancho).toBeLessThanOrEqual(orden.vw);
  // El botón queda arriba o a la izquierda del resumen, y no se pisa con «Compartir».
  expect(orden.b.bottom <= orden.t.top + 1 || orden.b.right <= orden.t.left + 1).toBe(true);
  expect(orden.b.bottom <= orden.s.top + 1 || orden.b.right <= orden.s.left + 1).toBe(true);
  expect(orden.s.bottom <= orden.t.top + 1 || orden.t.right <= orden.s.left + 1).toBe(true);
});
