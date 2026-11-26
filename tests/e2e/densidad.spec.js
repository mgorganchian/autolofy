// Menos controles antes del dato (2026-11-26, auditoría con Impeccable). En el celular la primera pantalla de la Tabla mostraba
// solo controles: el orden, las barras, plegar y «Cómo leer la tabla» pasaron detrás de «Herramientas», e «Imprimir» al menú «Más».
// El Ranking tenía 29 criterios del mismo peso: ahora van en 6 grupos con nombre y los cuatro años de patentamientos son un solo
// criterio. «Mayores diferencias» ya no lista las ventas ni lo que cambia por la propulsión.
const { test, expect } = require('@playwright/test');
const { vigilarErrores, FILAS_DATOS, N_FILAS } = require('./helpers');

let errores;
test.beforeEach(({ page }) => { errores = vigilarErrores(page); });
test.afterEach(() => expect(errores).toEqual([]));

test('en el celular la Tabla muestra datos en la primera pantalla y las herramientas se abren aparte', async ({ page }, info) => {
  await page.goto('/index.html?tabla');
  await expect(page.locator(FILAS_DATOS)).toHaveCount(N_FILAS);
  const herr = page.locator('#herrBtn');
  if (info.project.name === 'escritorio'){
    // En la computadora todo queda a la vista, sin el botón.
    await expect(herr).toBeHidden();
    for (const s of ['#ordenSel', '#barrasSel', '#plegarTodoBtn', '#legendToggleBtn', '.diff-toggle']) await expect(page.locator(s)).toBeVisible();
    return;
  }
  const primera = await page.evaluate(() => {
    const f = [...document.querySelectorAll('#mainTable tbody tr:not(.cat-row)')].find(t => t.offsetParent && !t.dataset.oculta);
    return { top: f.getBoundingClientRect().top, alto: innerHeight };
  });
  expect(primera.top + 30).toBeLessThan(primera.alto);
  await expect(page.locator('.diff-toggle')).toBeVisible();
  await expect(herr).toHaveAttribute('aria-expanded', 'false');
  for (const s of ['#ordenSel', '#barrasSel', '#plegarTodoBtn', '#legendToggleBtn']) await expect(page.locator(s)).toBeHidden();
  await herr.click();
  await expect(herr).toHaveAttribute('aria-expanded', 'true');
  for (const s of ['#ordenSel', '#barrasSel', '#plegarTodoBtn', '#legendToggleBtn']) await expect(page.locator(s)).toBeVisible();
  await herr.click();
  await expect(page.locator('#ordenSel')).toBeHidden();
  // En el Ranking no hay herramientas de la tabla: la ayuda va a la vista y el botón no está.
  await page.click('#vistaRanking');
  await expect(herr).toBeHidden();
  await expect(page.locator('#legendToggleBtn')).toBeVisible();
});

test('el Ranking agrupa los criterios y cada uno aparece una sola vez', async ({ page }, info) => {
  await page.goto('/index.html?vista=ranking');
  await expect(page.locator('#rkLista .rk-item').first()).toBeVisible();
  const r = await page.evaluate(() => ({
    grupos: [...document.querySelectorAll('#rkScroll .rk-grupo')].map(g => ({ tit: g.querySelector('.rk-grupo-tit').textContent, n: g.querySelectorAll('.rk-chip').length })),
    optgroups: [...document.querySelectorAll('#rkElegirSel optgroup')].map(o => o.label),
    chips: [...document.querySelectorAll('#rkScroll .rk-chip')].map(c => c.dataset.fila),
    opciones: [...document.querySelectorAll('#rkElegirSel option')].map(o => o.value),
    filas: RK_FILAS.map(f => f[0]), pat: RK_PAT, extra: [...Object.keys(RK_HERRAMIENTAS), ...Object.keys(RK_DERIVADAS), ...Object.keys(RK_MERCADO)],
  }));
  expect(r.grupos.map(g => g.tit)).toEqual(['Según lo que buscás', 'Precio y garantía', 'Potencia', 'Consumo y autonomía', 'Espacio y equipo', 'Ventas']);
  expect(r.optgroups).toEqual(r.grupos.map(g => g.tit));
  expect(r.grupos.every(g => g.n > 0)).toBe(true);
  // Cada fila del ranking y cada herramienta, una vez; los años de patentamientos, una sola vez entre todos.
  expect(r.pat.length).toBeGreaterThan(1);
  const esperados = [...r.filas.filter(n => !r.pat.includes(n)), ...r.extra].sort();
  for (const lista of [r.chips, r.opciones]){
    expect(new Set(lista).size).toBe(lista.length);
    expect(lista.filter(k => r.pat.includes(k))).toHaveLength(1);
    expect(lista.filter(k => !r.pat.includes(k)).sort()).toEqual(esperados);
  }
  if (info.project.name !== 'escritorio') return;
  // «Por modelo», «Por marca» y «Por grupo» comparten el año.
  await page.locator('#rkScroll .rk-chip', { hasText: 'Por modelo' }).click();
  await page.locator('#rkSub [data-anio="2024"]').click();
  await expect(page.locator('#rkTitulo')).toHaveText('Patentamientos 2024 (unidades)');
  await page.locator('#rkScroll .rk-chip[data-fila="__marcas"]').click();
  await expect(page.locator('#rkTitulo')).toHaveText('Ventas por marca 2024');
  await page.locator('#rkSub [data-anio="2025"]').click();
  await page.locator('#rkScroll .rk-chip', { hasText: 'Por modelo' }).click();
  await expect(page.locator('#rkTitulo')).toHaveText('Patentamientos 2025 (unidades)');
  await expect(page.locator('#rkScroll .rk-chip.active')).toHaveAttribute('data-fila', 'Patentamientos 2025 (unidades)');
});

test('«Mayores diferencias» no lista ventas ni lo que cambia por la propulsión', async ({ page }) => {
  const lista = () => page.locator('#difBox .dif-lista li .dif-fila').allTextContents();
  // Dos híbridos y un enchufable: sin patentamientos y sin batería ni motor eléctrico, y lo dice.
  await page.goto('/index.html?autos=toyota-corolla-cross-seg-hev,gwm-haval-h6-hev,byd-song-pro');
  await expect(page.locator('#difBox')).toBeVisible();
  const mixta = await lista();
  expect(mixta.length).toBeGreaterThan(0);
  expect(mixta.filter(f => /Patentamientos|batería|Motor eléctrico|Autonomía eléctrica/.test(f))).toEqual([]);
  await expect(page.locator('#difBox .dif-lista')).toContainText('cambian con el tipo de propulsión');
  // Dos híbridos: la misma propulsión, así que el motor eléctrico sí cuenta y no hay aclaración.
  await page.goto('/index.html?autos=toyota-corolla-cross-seg-hev,gwm-haval-h6-hev');
  await expect(page.locator('#difBox')).toBeVisible();
  expect((await lista()).filter(f => /Patentamientos/.test(f))).toEqual([]);
  await expect(page.locator('#difBox')).not.toContainText('cambian con el tipo de propulsión');
});
