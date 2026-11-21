// Contraste y desborde medidos en el navegador (auditoría de accesibilidad del 2026-11-21).
// El contraste se calcula como lo ve la persona: el color del texto con la opacidad de él y de sus
// ancestros, sobre los fondos de toda la cadena compuestos. Medir el color «crudo» no alcanza: la
// fecha de la lista era #56625C (4,9:1) pero con `opacity:.7` encima quedaba en 2,8:1.
const { test, expect } = require('@playwright/test');
const { FILAS_DATOS, N_FILAS, abrirGeneral } = require('./helpers');

// WCAG 1.4.3: 4,5:1 para el texto común y 3:1 para el grande (24 px, o 18,66 px en negrita).
function medirContraste(selector) {
  const raices = [...document.querySelectorAll(selector)].filter(e => e.getBoundingClientRect().width > 0);
  const rgba = s => { const m = s.match(/[\d.]+/g).map(Number); return [m[0], m[1], m[2], m.length > 3 ? m[3] : 1]; };
  const lum = ([r, g, b]) => {
    const f = v => (v /= 255) <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
  };
  const mezcla = (arriba, a, abajo) => arriba.map((c, i) => c * a + abajo[i] * (1 - a));
  const cadena = el => { const c = []; for (let e = el; e; e = e.parentElement) c.push(e); return c; };
  const fondo = el => cadena(el).reverse().reduce((bg, e) => {
    const [r, g, b, a] = rgba(getComputedStyle(e).backgroundColor);
    return a > 0 ? mezcla([r, g, b], a, bg) : bg;
  }, [255, 255, 255]);
  const opacidad = el => cadena(el).reduce((o, e) => o * +getComputedStyle(e).opacity, 1);
  const visible = el => {
    const r = el.getBoundingClientRect(), cs = getComputedStyle(el);
    return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none';
  };
  const fallas = [];
  for (const raiz of raices) {
    for (const el of [raiz, ...raiz.querySelectorAll('*')]) {
      // Lo que va sobre las fotos (flechitas del carrusel) y el texto para lectores de pantalla no se mide acá.
      if (el.closest('.minicar') || el.closest('.sr') || !visible(el)) continue;
      const texto = [...el.childNodes].filter(n => n.nodeType === 3).map(n => n.textContent.trim()).join(' ').trim();
      if (!texto) continue;
      const cs = getComputedStyle(el), bg = fondo(el);
      const [r, g, b, a] = rgba(cs.color);
      const tinta = mezcla([r, g, b], a * opacidad(el), bg);
      const [l1, l2] = [lum(tinta), lum(bg)].sort((x, y) => y - x);
      const ratio = (l1 + 0.05) / (l2 + 0.05);
      const px = parseFloat(cs.fontSize), grande = px >= 24 || (px >= 18.66 && +cs.fontWeight >= 700);
      if (ratio < (grande ? 3 : 4.5)) fallas.push(`${el.className || el.tagName} «${texto.slice(0, 30)}» ${ratio.toFixed(2)}:1`);
    }
  }
  return fallas;
}

for (const tema of ['light', 'dark']) {
  test(`tema ${tema}: todo el texto del encabezado de una comparación con referencia se lee (4,5:1)`, async ({ page }) => {
    // El encabezado del auto de referencia era azul fijo (#1d4fa8) con la tinta oscura del tema claro:
    // nombre y precio en 2,15:1, pesos y fecha en 1,21:1.
    await page.emulateMedia({ colorScheme: tema });
    await page.goto('/index.html?autos=byd-song-pro,toyota-corolla-cross-seg-hev,gwm-haval-h6-hev&ref=byd-song-pro');
    await expect(page.locator(FILAS_DATOS)).toHaveCount(N_FILAS);
    await expect(page.locator('#theadTable thead th.col-ref')).toHaveCount(1);
    await expect(page.locator('#theadTable .th-precio .precio-fecha').first()).toBeAttached();
    const fallas = await page.evaluate(medirContraste, '#theadTable thead th');
    expect(fallas).toEqual([]);
  });

  test(`tema ${tema}: el botón principal de las páginas estáticas se lee (4,5:1)`, async ({ page }) => {
    // `.cta` era blanco fijo sobre --accent: en el tema oscuro (#3FB57A) daba 2,59:1.
    await page.emulateMedia({ colorScheme: tema });
    for (const url of ['/autos/byd-song-pro.html', '/comparar/byd-song-pro-vs-leapmotor-c10.html']) {
      const r = await page.goto(url);
      if (url.startsWith('/comparar/') && r.status() === 404) continue;   // el par puede cambiar si cambian los precios
      await expect(page.locator('.cta').first()).toBeVisible();
      const fallas = await page.evaluate(medirContraste, '.cta');
      expect(fallas, url).toEqual([]);
    }
  });
}

test('Concesionarios en un celular de 390 px no se desborda de costado (WCAG 1.4.10)', async ({ page }) => {
  // 8 links con URL o mails largos (p. ej. «https://www.toyotamilanesio.ar/toyotamilanesio.com.ar/») estiraban la página a 482 px.
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/index.html?tabla');
  await abrirGeneral(page);
  await page.click('#concesBtn');
  await expect.poll(() => page.locator('#concesVista .cc-linea a').count()).toBeGreaterThan(100);
  const anchos = await page.evaluate(() => ({ pagina: document.scrollingElement.scrollWidth, pantalla: window.innerWidth }));
  expect(anchos.pagina).toBeLessThanOrEqual(anchos.pantalla);
});
