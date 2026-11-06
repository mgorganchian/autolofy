// Estimado WLTP en la tabla (2026-11-06, pedido de Mati): debajo de la cifra de la ficha, solo si su ciclo no es WLTP/WLTC
// y hay factor publicado; nunca en lugar de la cifra y nunca sin decir que es un estimado.
const { test, expect } = require('@playwright/test');

test('la tabla muestra el estimado WLTP debajo de la cifra, marcado como estimado y con su cuenta', async ({ page }) => {
  await page.goto('/index.html?tabla');
  const est = page.locator('#mainTable .wltp-est');
  expect(await est.count()).toBeGreaterThan(20);
  const datos = await est.evaluateAll(els => els.map(e => ({
    fila: e.closest('tr').dataset.nombre, texto: e.textContent, tip: e.dataset.tip,
    celda: e.closest('td').innerText,
  })));
  for (const d of datos) {
    expect(d.fila).toMatch(/^(Autonomía eléctrica \(km\)|Consumo de combustible \(L\/100km\))$/);
    expect(d.texto).toMatch(/^≈ [\d.,]+ (km|L\/100 km) WLTP estimado$/);
    expect(d.tip).toMatch(/^Estimado a WLTP: .* × .*No es una cifra de ficha/);
    // la cifra de la ficha sigue ahí, antes del estimado, con su ciclo
    expect(d.celda).toMatch(/\((NEDC|CLTC|EPA|etiqueta AR)\)/);
  }
});

test('un auto con la cifra en WLTP o WLTC, o sin ciclo informado, no lleva estimado', async ({ page }) => {
  await page.goto('/index.html?tabla');
  const mal = await page.evaluate(() => {
    const malos = [];
    document.querySelectorAll('#mainTable tr[data-nombre="Autonomía eléctrica (km)"] td[data-col]').forEach(td => {
      const t = td.innerText;
      if (/\((WLTP|WLTC|ciclo no informado)\)/.test(t) && td.querySelector('.wltp-est')) malos.push(t);
    });
    return malos;
  });
  expect(mal).toEqual([]);
});
