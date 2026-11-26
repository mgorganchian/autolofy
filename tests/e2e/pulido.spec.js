// Pasada de pulido (2026-11-26, auditoría con Impeccable): defectos chicos que quedaron después de los cuatro frentes.
const { test, expect } = require('@playwright/test');
const { vigilarErrores } = require('./helpers');

let errores;
test.beforeEach(({ page }) => { errores = vigilarErrores(page); });
test.afterEach(() => expect(errores).toEqual([]));

const contraste = (a, b) => {
  const lum = c => { const [r, g, bl] = c.match(/[\d.]+/g).slice(0, 3).map(Number).map(v => { v /= 255; return v <= .03928 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; }); return .2126 * r + .7152 * g + .0722 * bl; };
  const x = lum(a), y = lum(b); return (Math.max(x, y) + .05) / (Math.min(x, y) + .05);
};

for (const tema of ['light', 'dark']) {
  test(`el botón «Elegir autos para comparar» se lee al pasar el mouse (tema ${tema})`, async ({ page }, info) => {
    test.skip(info.project.name !== 'escritorio', 'el hover es de la computadora');
    await page.emulateMedia({ colorScheme: tema });
    await page.goto('/index.html?tabla');
    const b = page.locator('#openModalBtn');
    await b.hover();
    // Antes: texto blanco sobre #E3EBE5 (1,22:1) en el tema claro.
    await expect.poll(async () => { const s = await b.evaluate(e => { const c = getComputedStyle(e); return [c.color, c.backgroundColor]; }); return contraste(...s); }).toBeGreaterThanOrEqual(4.5);
  });
}

test('en la Tabla de la computadora ningún texto del encabezado de los autos baja de 12 px', async ({ page }, info) => {
  test.skip(info.project.name !== 'escritorio', 'en el celular la letra chica ya sube un 20%');
  await page.goto('/index.html?autos=byd-song-pro,toyota-corolla-cross-seg-hev,gwm-haval-h6-hev');
  await expect(page.locator('#theadTable .sim-btn:visible').first()).toBeVisible();
  const chicos = await page.evaluate(() => [...document.querySelectorAll('#theadTable *')].filter(e => e.offsetParent &&
    [...e.childNodes].some(t => t.nodeType === 3 && t.textContent.trim()) && parseFloat(getComputedStyle(e).fontSize) < 12).map(e => e.className + ': ' + e.textContent.trim()));
  expect(chicos).toEqual([]);
});

test('el gráfico del Ranking no pisa sus rótulos y la letra no baja de 12 px', async ({ page }) => {
  await page.goto('/index.html?vista=ranking');
  await expect(page.locator('#rkLista .rk-item').first()).toBeVisible();
  for (const k of ['pat', 'otra']){
    await page.evaluate(k => { rkActual = k === 'pat' ? RK_PAT[0] : 'Potencia total del sistema (CV)'; renderRanking(); }, k);
    await expect(page.locator('.rk-grafico svg')).toBeVisible();
    const r = await page.evaluate(() => {
      const svg = document.querySelector('.rk-grafico svg'), esc = svg.getBoundingClientRect().width / svg.viewBox.baseVal.width;
      const rects = [...svg.querySelectorAll('.rk-g-eje')].map(t => ({ txt: t.textContent, r: t.getBoundingClientRect() }));
      const pisados = [];
      rects.forEach((a, i) => rects.slice(i + 1).forEach(b => {
        if (a.r.left < b.r.right && b.r.left < a.r.right && a.r.top < b.r.bottom && b.r.top < a.r.bottom) pisados.push(a.txt + ' / ' + b.txt);
      }));
      return { letra: parseFloat(getComputedStyle(svg.querySelector('.rk-g-eje')).fontSize) * esc, pisados, unidad: rects.some(x => /escala logarítmica/.test(x.txt)) };
    });
    expect(r.pisados).toEqual([]);
    expect(r.letra).toBeGreaterThanOrEqual(12);
    expect(r.unidad).toBe(true);   // el precio siempre va en escala logarítmica, y el gráfico lo dice
    // Cada auto de la lista con precio (en dólares o pasado del de pesos al BNA) está en el gráfico: el más vendido se publica en pesos.
    const faltan = await page.evaluate(() => [...document.querySelectorAll('#rkLista .rk-item[data-idx]')].map(li => +li.dataset.idx)
      .filter(i => PRECIO_CMP[i] != null && !document.querySelector('.rk-grafico circle[data-idx="' + i + '"]')).map(i => CARS[i].name));
    expect(faltan).toEqual([]);
  }
});

test('el visor de fotos tapa la ficha de atrás', async ({ page }) => {
  await page.goto('/index.html?auto=byd-song-pro');
  await page.click('#fichaImg');
  const visor = page.locator('#visorFotos');
  await expect(visor).toBeVisible();
  // Con transparencia se veían la ✕ de la ficha y sus botones debajo del pie de foto.
  expect(await visor.evaluate(v => getComputedStyle(v).backgroundColor)).toMatch(/^rgb\(/);
});

test('la ficha dice que la fábrica del Mercosur es de la marca, no del auto', async ({ page }) => {
  await page.goto('/index.html?auto=byd-song-pro');
  await expect(page.locator('#fichaAuto .ficha-respaldo')).toContainText('La marca fabrica en Brasil');
});
