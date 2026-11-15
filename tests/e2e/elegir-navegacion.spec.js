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
    const titulo = await caja(page, '#elegirTitulo'), tabs = await caja(page, '.vista-toggle'), herr = await caja(page, '.herr-gral');
    expect(Math.abs(tabs.l - titulo.l), `pestañas a ${ancho} px`).toBeLessThanOrEqual(1);
    expect(Math.abs(herr.r - titulo.r), `botones a ${ancho} px`).toBeLessThanOrEqual(1);
    const medio = (titulo.l + titulo.r) / 2;
    for (const sel of ['#headerSubtitle', '.cota'])
      expect(Math.abs((await caja(page, sel)).c - medio), `${sel} centrado a ${ancho} px`).toBeLessThanOrEqual(2);
    // Pestañas y botones, en la misma fila.
    const [yt, yh] = await Promise.all(['.vista-toggle', '.herr-gral'].map(s => page.locator(s).evaluate(e => e.getBoundingClientRect().bottom)));
    expect(Math.abs(yt - yh)).toBeLessThanOrEqual(2);
  }
  // La tabla usa todo el ancho: ahí el encabezado no cambia.
  await page.locator('#vistaTabla').click();
  expect(await page.locator('header').evaluate(e => getComputedStyle(e).display)).toBe('block');
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
  await expect(page.locator('input[name="el-plazas"][value="5"]')).toBeChecked();
  await expect(page.locator('input[name="el-uso"][value="mixto"]')).toBeChecked();
  expect(await sugeridos(page)).toBe(top0);
  const guardado = await page.evaluate(() => JSON.parse(localStorage.getItem('elegir')));
  expect(guardado).toMatchObject({ plazas: '5', uso: 'mixto', enchufe: 'nose', quien: 'ninos', segMan: false, propMan: false });
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
