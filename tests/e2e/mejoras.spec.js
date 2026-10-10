// Mejoras del 2026-10-08: "Ayudame a elegir", pedir cotización, historial de precios y la
// vista de concesionarios ordenada por cercanía.
const fs = require('fs');
const path = require('path');
const { test, expect } = require('@playwright/test');
const { leerIndex, vigilarErrores, FILAS_DATOS, N_FILAS } = require('./helpers');

const RAIZ = process.env.AUTOSCHINOS_RAIZ || path.resolve(__dirname, '../..');
const { html } = leerIndex();
const HIST = JSON.parse(/const HISTORIAL_PRECIOS = (\{.*?\});\n/.exec(html)[1]);

let errores;
test.beforeEach(async ({ page }) => { errores = vigilarErrores(page); });
test.afterEach(() => expect(errores).toEqual([]));
async function abrir(page, query = ''){
  await page.goto('/index.html' + (query || '?tabla'));
  await expect(page.locator(FILAS_DATOS)).toHaveCount(N_FILAS);
}

test('ayudame a elegir: la franja de precio es piso y techo, y con enchufe en casa van los que se enchufan', async ({ page }) => {
  // Pedido del 2026-10-09: "35.001 a 45.000" no trae autos de 30.000, y con enchufe en casa
  // no sugiere híbridos comunes.
  await abrir(page);
  await page.locator('#vistaElegir').click();
  await page.locator('label:has(input[name="el-presu"][value="35501-38500"])').click();
  await page.locator('label:has(input[name="el-enchufe"][value="si"])').click();
  const res = page.locator('.elegir-res > li');
  // 5 en escritorio y 4 en el celular (pedido del 2026-10-09).
  const N = page.viewportSize().width >= 900 ? 5 : 4;
  await expect(res).toHaveCount(N);
  for (const t of await res.locator('ul').allTextContents()){
    const m = /USD ([\d.]+)/.exec(t);
    expect(m, t).toBeTruthy();
    const usd = Number(m[1].replace(/\./g, ''));
    expect(usd).toBeGreaterThanOrEqual(35501);
    expect(usd).toBeLessThanOrEqual(38500);
    expect(t).toMatch(/enchufable|eléctrico/i);
  }
  // La barra al pie cambia con cada respuesta (en el celular la lista queda fuera de la pantalla).
  const barra = page.locator('.elegir-barra');
  await page.locator('label:has(input[name="el-enchufe"][value="no"])').click();
  // La barra ya no nombra los sugeridos (2026-10-10: mucho texto): dice si cambiaron y se ilumina.
  await expect(barra).toContainText(/Nuevas sugerencias|Sin cambios/);
  await expect(barra).toHaveClass(/cambio/);
  for (const t of await res.locator("ul").allTextContents()) expect(t).not.toMatch(/necesita dónde cargar/i);
  await page.locator('label:has(input[name="el-presu"][value=""])').click();
  await expect(res).toHaveCount(N);
  await page.locator('[data-elegir-comparar="top"]').click();
  await expect(page).toHaveURL(/\?autos=/);
  expect(new URL(page.url()).searchParams.get('autos').split(',')).toHaveLength(N);
});

test('ayudame a elegir: comparar todos los que cumplen, y sumando los que no publican precio', async ({ page }) => {
  // Pedido del 2026-10-09: además de los 4 sugeridos, comparar los N que cumplen y los N + los
  // que cumplen todo menos el precio (no lo publican en dólares).
  await abrir(page);
  await page.locator('#vistaElegir').click();
  await page.locator('label:has(input[name="el-presu"][value="32001-35500"])').click();
  const todos = page.locator('[data-elegir-comparar="todos"]');
  const n = Number(/Los (\d+)/.exec(await todos.textContent())[1]);
  expect(n).toBeGreaterThan(4);
  const conSin = page.locator('[data-elegir-comparar="sinprecio"]');
  const m = /\+(\d+) sin precio/.exec(await conSin.textContent());
  expect(Number(m[1])).toBeGreaterThan(0);
  await conSin.click();
  await expect(page).toHaveURL(/\?autos=/);
  const autos = new URL(page.url()).searchParams.get('autos').split(',');
  expect(autos).toHaveLength(n + Number(m[1]));
});

test('ayudame a elegir: en el celular los botones de comparar van en una fila, siempre a la vista', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await abrir(page);
  await page.locator('#vistaElegir').click();
  await page.locator('label:has(input[name="el-presu"][value="32001-35500"])').click();
  const btns = page.locator('.elegir-barra-btns .ficha-btn');
  await expect(btns).toHaveCount(3);
  // El principal es más alto (2026-10-10): la misma fila es el mismo centro, no el mismo borde.
  const centros = await btns.evaluateAll(bs => bs.map(b => { const r = b.getBoundingClientRect(); return r.top + r.height / 2; }));
  expect(Math.max(...centros) - Math.min(...centros)).toBeLessThan(4);
  for (const c of centros) expect(c).toBeLessThan(844);
});

test('pedir cotización: WhatsApp solo con número internacional y el auto en el mensaje', async ({ page }) => {
  const RED = JSON.parse(fs.readFileSync(path.join(RAIZ, 'concesionarios.json'), 'utf8'));
  const { CARS, SLUGS } = leerIndex();
  const local = RED.concesionarios.find(c => c.servicios.includes('venta') && /\+?54\s*9?[\d\s-]{10,}/.test(c.whatsapp || ''));
  const i = CARS.findIndex(c => local.marcas.includes(c.brand));
  await abrir(page, '?auto=' + SLUGS[i]);
  await page.locator('#dondeProv').selectOption(local.provincia);
  const links = page.locator('#fichaDonde .cc-cotizar a');
  await expect(links.first()).toBeVisible();
  for (const h of await links.evaluateAll(as => as.map(a => a.href))){
    expect(h).toMatch(/^(https:\/\/wa\.me\/54\d{10,}\?text=|mailto:)/);
    expect(decodeURIComponent(h)).toContain(CARS[i].name);
  }
  expect((await links.evaluateAll(as => as.map(a => a.href))).some(h => h.startsWith('https://wa.me/'))).toBe(true);
});

test('historial de precios: cada entrada con fecha, monto y fuente https; se ve en la página del auto', async ({ page }) => {
  for (const [slug, h] of Object.entries(HIST)) for (const x of h){
    expect(x[0], slug).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(typeof x[1], slug).toBe('number');
    expect(x[3], slug).toMatch(/^https:\/\//);
  }
  const conCambio = Object.entries(HIST).find(([, h]) => h.length > 1 && h[h.length - 1][2] === h[h.length - 2][2]);
  expect(conCambio).toBeTruthy();
  await abrir(page, '?auto=' + conCambio[0]);
  await expect(page.locator('.ficha-hist-res')).toContainText(/(Bajó|Subió) USD/);
});

test('la vista Concesionarios ordena por cercanía con la ubicación del GPS', async ({ page, context }) => {
  await context.grantPermissions(['geolocation']);
  await context.setGeolocation({ latitude: -31.4135, longitude: -64.1811 });   // Córdoba capital
  await abrir(page);
  await page.locator('#concesBtn').click();
  await page.locator('#dondeGps').click();
  await expect(page.locator('#concesVista')).toContainText('Ordenado por cercanía a tu ubicación');
  const km = await page.locator('#concesVista .cc-dist').allTextContents();
  const n = km.map(t => parseFloat(t.replace(/[^\d,]/g, '').replace(',', '.')));
  expect(n.length).toBeGreaterThan(100);
  for (let k = 1; k < n.length; k++) expect(n[k]).toBeGreaterThanOrEqual(n[k - 1]);
  expect(n[0]).toBeLessThan(20);
});

test('novedades: la página y el RSS existen y el RSS es XML válido', () => {
  const rss = fs.readFileSync(path.join(RAIZ, 'novedades.xml'), 'utf8');
  expect(rss).toMatch(/^<\?xml/);
  expect((rss.match(/<item>/g) || []).length).toBeGreaterThan(5);
  expect(fs.readFileSync(path.join(RAIZ, 'novedades.html'), 'utf8')).toContain('<h1>Novedades</h1>');
});

test('la portada empieza en "Ayudame a elegir"; un link con parámetros o ?tabla va directo', async ({ page }) => {
  // Pedido del 2026-10-09.
  // Desde el 2026-10-09 es una vista de la página (pestaña junto a Tabla y Ranking), no un panel:
  // nada oscurecido detrás, y las pestañas siguen a mano.
  await page.goto('/index.html');
  await expect(page.locator('#elegirHoja')).toBeVisible();
  await expect(page.locator('#vistaElegir')).toHaveAttribute('aria-selected', 'true');
  await expect(page.locator('.ficha-overlay:visible')).toHaveCount(0);
  await expect(page.locator('#tbodyWrap')).toBeHidden();
  await page.locator('#vistaTabla').click();
  await expect(page.locator('#elegirHoja')).toBeHidden();
  await expect(page.locator(FILAS_DATOS)).toHaveCount(N_FILAS);
  await page.locator('#vistaElegir').click();
  await page.locator('#elegirTabla').click();
  await expect(page.locator('#tbodyWrap')).toBeVisible();
  await page.goto('/index.html?autos=byd-shark,maxus-t60');
  await expect(page.locator(FILAS_DATOS)).toHaveCount(N_FILAS);
  await expect(page.locator('#elegirHoja')).toBeHidden();
});

test('el visor agranda la foto y recorre las demás, desde Ayudame a elegir y desde la página del auto', async ({ page }) => {
  // Pedido del 2026-10-09: en escritorio y en el celular.
  await page.goto('/index.html');
  await page.locator('.elegir-foto').first().click();
  const visor = page.locator('#visorFotos');
  await expect(visor).toBeVisible();
  await expect(visor.locator('.visor-nombre')).not.toBeEmpty();
  await page.keyboard.press('Escape');
  await expect(visor).toBeHidden();
  await page.goto('/index.html?auto=tank-300');
  await page.locator('#fichaImg').click();
  await expect(visor).toBeVisible();
  await expect(visor.locator('.visor-nombre')).toContainText('Tank 300');
  const pie = visor.locator('.visor-pie');
  const antes = await pie.textContent();
  await visor.locator('.visor-nav.sig').click();
  await expect(pie).not.toHaveText(antes);
  await expect(visor.locator('.visor-puntos i.on')).toHaveCount(1);
  await visor.locator('.visor-cerrar').click();
  await expect(visor).toBeHidden();
  await expect(page.locator('#fichaAuto')).toBeVisible();   // cerrar el visor no cierra la página del auto
});

test('las flechitas de las miniaturas cambian la foto en el lugar, y al agrandarla arranca en esa', async ({ page }) => {
  // Pedido del 2026-10-09: en todos los lugares con fotos, sin abrir nada al tocar la flecha.
  const segunda = /tank-300-2\.jpg$/;
  await page.goto('/index.html?autos=tank-300,byd-shark');
  await expect(page.locator(FILAS_DATOS)).toHaveCount(N_FILAS);
  const caja = page.locator('#theadTable .minicar[data-mini-slug="tank-300"]');
  await caja.locator('.mini-nav.sig').click();
  await expect(caja.locator('img')).toHaveAttribute('src', segunda);
  await expect(page.locator('#fotoZoom')).toBeHidden();
  await expect(page.locator('#fichaAuto')).toBeHidden();
  await caja.locator('img').click();
  await expect(page.locator('#fotoZoom .puntos i').nth(1)).toHaveClass(/on/);
  await caja.locator('.mini-nav.ant').click();
  await expect(caja.locator('img')).not.toHaveAttribute('src', segunda);

  // En el selector, la flecha no tilda ni destilda el auto.
  await page.click('#openModalBtn');
  await page.click('#modelDropdownBtn');
  await page.fill('#modelBuscar', 'tank 300');
  const tarjeta = page.locator('#modelList .mcard').filter({ has: page.locator('[data-mini-slug="tank-300"]') });
  const tildado = await tarjeta.locator('input').isChecked();
  await tarjeta.locator('.mini-nav.sig').click();
  await expect(tarjeta.locator('img')).toHaveAttribute('src', segunda);
  expect(await tarjeta.locator('input').isChecked()).toBe(tildado);

  // En la página del auto, la flecha de un parecido no abre su página.
  if (page.viewportSize().width >= 768){
    await page.goto('/index.html?auto=tank-300');
    const parecido = page.locator('.ficha-sim .minicar:has(.mini-nav)').first();
    await parecido.hover();
    await parecido.locator('.mini-nav.sig').click();
    await expect(parecido.locator('img')).toHaveAttribute('src', /-2\.jpg$/);
    expect(page.url()).toContain('auto=tank-300');
  }

  // En Ayudame a elegir, el visor arranca en la foto que muestra la miniatura.
  await page.goto('/index.html');
  const sugerido = page.locator('.elegir-res .minicar:has(.mini-nav)').first();
  await sugerido.locator('.mini-nav.sig').click();
  await expect(page.locator('#visorFotos')).toBeHidden();
  await sugerido.locator('.elegir-foto').click();
  await expect(page.locator('#visorFotos .visor-puntos i').nth(1)).toHaveClass(/on/);
});

test('cada lugar con fotos de autos trae sus flechitas', async ({ page }) => {
  await page.goto('/index.html?tabla');
  await expect(page.locator(FILAS_DATOS)).toHaveCount(N_FILAS);
  await expect(page.locator('#theadTable .minicar[data-mini-slug="tank-300"] .mini-nav')).toHaveCount(2);
  await page.click('#vistaRanking');
  const rk = page.locator('#rkLista .rk-item .minicar:has(.mini-nav)').first();
  if (!page.viewportSize() || page.viewportSize().width < 768){
    // En el celular las fotos chicas no llevan flechas: tapaban la foto.
    await expect(rk.locator('.mini-nav').first()).toBeHidden();
    return;
  }
  // En escritorio, las de las fotos chicas aparecen solo al pasar el mouse.
  await expect(rk.locator('.mini-nav.sig')).toHaveCSS('opacity', '0');
  await rk.hover();
  await expect(rk.locator('.mini-nav.sig')).toHaveCSS('opacity', '1');
  // Una flecha del ranking no abre la página del auto.
  await rk.locator('.mini-nav.sig').click();
  await expect(page.locator('#fichaAuto')).toBeHidden();
});

test('en el celular los nombres de fila no se parten en cualquier sílaba ni hay textos cortados con "…"', async ({ page }) => {
  // Pedido del 2026-10-10: con la letra al 130%, lo que no entra se resume (ETIQUETA_CEL), no se corta.
  await page.goto('/index.html?tabla');
  await expect(page.locator(FILAS_DATOS)).toHaveCount(N_FILAS);
  const huerfanas = await page.evaluate(() => { const n = new Set(DATA.flatMap(([, f]) => f.map(r => r[0]))); return Object.keys(ETIQUETA_CEL).filter(k => !n.has(k)); });
  expect(huerfanas).toEqual([]);
  if (page.viewportSize().width > 600) return;
  await expect(page.locator('#theadTable th.feat-col')).toHaveText('Dato');
  const partidas = await page.evaluate(() => {
    const malas = [];
    document.querySelectorAll('#mainTable span.feat-label').forEach(sp => {
      const t = sp.firstChild; const re = /\S+/g; let m;
      while ((m = re.exec(t.textContent))) {
        if (m[0].includes('­')) continue;   // corte elegido a mano
        const r = document.createRange(); r.setStart(t, m.index); r.setEnd(t, m.index + m[0].length);
        if (new Set([...r.getClientRects()].filter(x => x.width).map(x => Math.round(x.top))).size > 1) malas.push(m[0]);
      }
    });
    return malas;
  });
  expect(partidas).toEqual([]);
  await page.click('#vistaRanking');
  const cortados = await page.locator('#rkLista .rk-nombre span, #rkLista .rk-orig').evaluateAll(els => els.filter(e => e.scrollWidth > e.clientWidth + 1).map(e => e.textContent));
  expect(cortados).toEqual([]);
});

test('ayudame a elegir: "Ver ficha" va en el renglón del nombre y el botón de comparar destella', async ({ page }) => {
  // Pedido del 2026-10-10: tarjetas más bajas y que se note cuál es el botón a apretar.
  await page.goto('/index.html');
  const li = page.locator('.elegir-res > li').first();
  const [nombre, ver] = await Promise.all([li.locator('> b').boundingBox(), li.locator('[data-elegir-ficha]').boundingBox()]);
  expect(Math.abs((nombre.y + nombre.height / 2) - (ver.y + ver.height / 2))).toBeLessThan(nombre.height);
  expect(ver.x).toBeGreaterThan(nombre.x + nombre.width);
  const anim = await page.locator('.elegir-barra-btns .ficha-btn.primario').evaluate(b => getComputedStyle(b).animationName);
  expect(anim).toBe('destelloComparar');
});

test('respaldo de fábrica: la fábrica en el Mercosur tiene fuente, se ve en la tabla y pesa en A tu medida', async ({ page }) => {
  // Pedido del 2026-10-10: después del precio, de lo que más pesa (repuestos).
  await page.goto('/index.html?tabla');
  await expect(page.locator(FILAS_DATOS)).toHaveCount(N_FILAS);
  const fabs = await page.evaluate(() => Object.entries(MARCAS_INFO).filter(([, m]) => m.fabrica_mercosur).map(([k, m]) => [k, m.fabrica_mercosur]));
  expect(fabs.map(([k]) => k).sort()).toEqual(['BYD', 'Changan', 'Chery', 'Haval', 'Ora', 'Poer', 'Tank']);
  for (const [k, f] of fabs){
    expect(f.fuentes.length, k).toBeGreaterThan(0);
    for (const u of f.fuentes) expect(u, k).toMatch(/^https:\/\//);
    expect(f.pais && f.planta && f.desde, k).toBeTruthy();
  }
  const byd = await page.evaluate(() => CARS.findIndex(c => c.brand === 'BYD' && c.status === 'venta'));
  await expect(page.locator(`#mainTable tr[data-nombre="Importador en Argentina"] td[data-col="${byd}"] .fabrica-merc`)).toHaveText('Fábrica en Brasil');
  await page.click('#vistaRanking');
  const sel = page.locator('#rkElegirSel');
  if (await sel.isVisible()) await sel.selectOption('__medida'); else await page.locator('#rkScroll .rk-chip[data-fila="__medida"]').click();
  await expect(page.locator('select[data-peso="__respaldo"]')).toHaveValue('3');
});

test('ayudame a elegir: cada sugerido tiene a lo sumo 4 renglones y en el celular cada uno entra en una línea', async ({ page }) => {
  // Pedido del 2026-10-10: precio y propulsión, cómo es el auto y los dos motivos que más pesan.
  await page.goto('/index.html');
  const items = page.locator('.elegir-res > li');
  for (const n of await items.locator('ul').evaluateAll(us => us.map(u => u.children.length))) expect(n).toBeLessThanOrEqual(4);
  await expect(items.first().locator('ul > li').nth(1)).toHaveText(/\d,\d m/);   // el renglón de cómo es el auto
  if (page.viewportSize().width > 640) return;
  const dobles = await page.locator('.elegir-res ul > li').evaluateAll(ls => ls.filter(li => li.getBoundingClientRect().height > 1.5 * parseFloat(getComputedStyle(li).lineHeight)).map(li => li.textContent));
  expect(dobles).toEqual([]);
});

test('tema claro: el encabezado, el de la tabla y las categorías son claros, y "Elegir autos" destella en verde', async ({ page }) => {
  // Pedido del 2026-10-10: nada oscuro arriba en el tema claro, con contraste fácil de leer.
  await page.emulateMedia({ colorScheme: 'light' });
  await page.goto('/index.html?autos=tank-300,byd-shark');
  await expect(page.locator(FILAS_DATOS)).toHaveCount(N_FILAS);
  const claros = await page.evaluate(() => ['header', '#theadWrap', '#theadTable thead th', '#mainTable tr.cat-row td'].map(sel => {
    const [r, g, b] = getComputedStyle(document.querySelector(sel)).backgroundColor.match(/[\d.]+/g).map(Number);
    return [sel, (r + g + b) / 3 > 180];
  }));
  for (const [sel, ok] of claros) expect(ok, sel).toBe(true);
  const btn = page.locator('#openModalBtn');
  expect(await btn.evaluate(b => getComputedStyle(b).animationName)).toBe('destelloElegir');
  await page.emulateMedia({ colorScheme: 'dark' });
  const [r, g, b] = (await page.locator('header').evaluate(h => getComputedStyle(h).backgroundColor)).match(/[\d.]+/g).map(Number);
  expect((r + g + b) / 3).toBeLessThan(60);   // en el oscuro sigue oscuro
});

test('accesibilidad y carga: el panel "Elegir autos" se maneja con teclado y sus fotos no se bajan de entrada', async ({ page }) => {
  // Arreglos medidos el 2026-10-10: Tab se escapaba al fondo, Esc no cerraba y las 124 fotos
  // del panel cerrado se bajaban en cada visita (1,15 MB).
  await page.goto('/index.html?tabla');
  await expect(page.locator(FILAS_DATOS)).toHaveCount(N_FILAS);
  const sinLazy = await page.locator('#modelList img').evaluateAll(is => is.filter(i => i.loading !== 'lazy').length);
  expect(sinLazy).toBe(0);
  await page.focus('#openModalBtn');
  await page.keyboard.press('Enter');
  await expect(page.locator('#modalOverlay')).toBeVisible();
  for (let k = 0; k < 25; k++){
    await page.keyboard.press('Tab');
    expect(await page.evaluate(() => !!document.activeElement.closest('.modal-sheet'))).toBe(true);
  }
  await page.keyboard.press('Escape');
  await expect(page.locator('#modalOverlay')).toBeHidden();
  expect(await page.evaluate(() => document.activeElement.id)).toBe('openModalBtn');
  await expect(page.locator('a.saltar')).toHaveAttribute('href', '#contenido');
  await expect(page.locator('main#contenido')).toHaveCount(1);
});

test('botón Atrás: deshace el último paso (ficha, Grupos, vista, comparar) sin salir del sitio', async ({ page }) => {
  // Pedido del 2026-10-10 (Baymard: el 59% de los sitios lo rompe).
  await page.goto('/index.html?tabla');
  await expect(page.locator(FILAS_DATOS)).toHaveCount(N_FILAS);
  const inicio = page.url();
  // Ficha: abrir y volver
  await page.locator('#theadTable .th-nombre').first().click();
  await expect(page.locator('#fichaAuto')).toBeVisible();
  await expect(page).toHaveURL(/[?&]auto=/);
  await page.goBack();
  await expect(page.locator('#fichaAuto')).toBeHidden();
  await expect(page).toHaveURL(inicio);
  // Cerrar con ✕ también vuelve el paso (no deja uno de más)
  await page.locator('#theadTable .th-nombre').first().click();
  await expect(page.locator('#fichaAuto')).toBeVisible();
  await page.locator('#fichaCerrar').click();
  await expect(page.locator('#fichaAuto')).toBeHidden();
  await expect(page).toHaveURL(inicio);
  // Vista: Ranking y volver a la tabla
  await page.click('#vistaRanking');
  await expect(page.locator('#rankingView')).toBeVisible();
  await page.goBack();
  await expect(page.locator('#rankingView')).toBeHidden();
  await expect(page.locator('#tbodyWrap')).toBeVisible();
  // Grupos → un auto → Atrás vuelve a Grupos → Atrás cierra Grupos
  await page.click('#gruposBtn');
  await expect(page.locator('#gruposVista')).toBeVisible();
  await page.locator('#gruposHoja .grupo-auto').first().click();
  await expect(page.locator('#fichaAuto')).toBeVisible();
  await page.goBack();
  await expect(page.locator('#fichaAuto')).toBeHidden();
  await expect(page.locator('#gruposVista')).toBeVisible();
  await page.goBack();
  await expect(page.locator('#gruposVista')).toBeHidden();
  // Comparar desde una ficha y volver: la ficha reaparece y la comparación se deshace
  await page.locator('#theadTable .th-nombre').first().click();
  await expect(page.locator('#fichaAuto')).toBeVisible();
  await page.locator('#fichaHoja [data-comparar]').first().click();
  await expect(page).toHaveURL(/[?&]autos=/);
  await expect(page.locator('#fichaAuto')).toBeHidden();
  await page.goBack();
  await expect(page.locator('#fichaAuto')).toBeVisible();
  await expect(page).not.toHaveURL(/[?&]autos=/);
  expect(await page.evaluate(() => colVisible.filter(Boolean).length)).toBe(await page.evaluate(() => CARS.length));
});

test('botón Atrás: cierra el visor de fotos y el panel "Elegir autos"', async ({ page }) => {
  await page.goto('/index.html');
  await page.locator('.elegir-foto').first().click();
  await expect(page.locator('#visorFotos')).toBeVisible();
  await page.goBack();
  await expect(page.locator('#visorFotos')).toBeHidden();
  await expect(page.locator('#elegirHoja')).toBeVisible();     // sigue en la portada
  await page.goto('/index.html?tabla');
  await page.click('#openModalBtn');
  await expect(page.locator('#modalOverlay')).toBeVisible();
  await page.goBack();
  await expect(page.locator('#modalOverlay')).toBeHidden();
  await expect(page).toHaveURL(/\?tabla$/);
});
