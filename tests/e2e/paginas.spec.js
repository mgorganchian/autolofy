// Páginas estáticas por auto (2026-10-06): autos/<slug>.html, sitemap.xml, robots.txt y la
// lista de links del pie salen de index.html con herramientas-paginas.py. Si alguien cambia
// un dato y no las regenera, Google muestra el viejo: este test lo frena.
const path = require('path');
const { execFileSync } = require('child_process');
const { test, expect } = require('@playwright/test');

const RAIZ = process.env.AUTOSCHINOS_RAIZ || path.resolve(__dirname, '../..');

test('las páginas por auto están al día con index.html', ({ }, info) => {
  test.skip(info.project.name !== 'escritorio', 'no depende del viewport');
  const out = execFileSync('python3', [path.join(RAIZ, 'herramientas-paginas.py'), '--check'], { encoding: 'utf8' });
  expect(out).toContain('al día');
});

test('la página de un auto tiene título, descripción, foto, datos estructurados y su ficha', async ({ page }) => {
  await page.goto('/autos/chery-tiggo-7-pro-phev.html');
  await expect(page).toHaveTitle(/^Chery Tiggo 7 Pro PHEV: precio, ficha técnica/);
  await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', /híbrido enchufable/);
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', 'https://autoschinos-ar.vercel.app/autos/chery-tiggo-7-pro-phev');
  const ld = JSON.parse(await page.locator('script[type="application/ld+json"]').textContent());
  expect(ld['@type']).toBe('Car');
  expect(ld.brand.name).toBe('Chery');
  await expect(page.locator('main table tr')).toHaveCount(101);
  await expect(page.locator('main tr', { hasText: 'Longitud (mm)' })).toContainText('4553');
  await expect(page.locator('a.cta')).toHaveAttribute('href', '/?auto=chery-tiggo-7-pro-phev');
  expect(await page.locator('figure img').evaluate(i => i.complete && i.naturalWidth > 0)).toBe(true);
});

// Un cambio de precio de menos del 1% no se informa nunca (2026-10-18, pedido del usuario): ni como
// baja ni como suba de la lista, ni como oferta a menos del 1% de la lista.
test('el RSS y Novedades no informan cambios de precio de menos del 1%', async ({}, info) => {
  test.skip(info.project.name !== 'escritorio', 'no depende del viewport');
  const fs = require('fs');
  const archivos = fs.readdirSync(path.join(RAIZ, 'autos')).filter(f => f.endsWith('.xml')).map(f => path.join(RAIZ, 'autos', f))
    .concat([path.join(RAIZ, 'novedades.xml'), path.join(RAIZ, 'novedades.html')]);
  const num = t => +t.replace(/\./g, '');
  const chicos = [];
  for (const f of archivos) {
    const t = fs.readFileSync(f, 'utf8');
    for (const m of t.matchAll(/(?:Bajó|Subió) el [^:<]+: USD ([\d.]+) → USD ([\d.]+)/g)) {
      const a = num(m[1]), b = num(m[2]);
      if (Math.abs(b - a) < 0.01 * a) chicos.push(path.basename(f) + ': ' + m[0]);
    }
  }
  expect(chicos).toEqual([]);
  expect(fs.readFileSync(path.join(RAIZ, 'autos/changan-cs55-plus.xml'), 'utf8')).not.toContain('USD 32.000 → USD 31.990');
});

test('cada auto tiene su RSS válido, y su página lo anuncia', async ({ page }, info) => {
  test.skip(info.project.name !== 'escritorio', 'no depende del viewport');
  const fs = require('fs');
  const autos = fs.readdirSync(path.join(RAIZ, 'autos'));
  expect(autos.filter(f => f.endsWith('.xml')).length).toBe(autos.filter(f => f.endsWith('.html')).length);
  const rss = fs.readFileSync(path.join(RAIZ, 'autos/song-pro.xml'), 'utf8');
  expect(rss).toMatch(/^<\?xml version="1.0" encoding="UTF-8"\?>\n<rss version="2.0"><channel>/);
  await page.goto('/autos/song-pro.html');
  await expect(page.locator('link[rel="alternate"][type="application/rss+xml"]')).toHaveAttribute('href', '/autos/song-pro.xml');
  const ok = await page.evaluate(async () => {
    const t = await (await fetch('/autos/song-pro.xml')).text();
    const x = new DOMParser().parseFromString(t, 'application/xml');
    return !x.querySelector('parsererror') && x.querySelectorAll('channel > title').length === 1;
  });
  expect(ok).toBe(true);
});

test('comparaciones "X vs Y": están en el sitemap, muestran las diferencias y las enlazan las páginas de los dos autos', async ({ page }, info) => {
  test.skip(info.project.name !== 'escritorio', 'no depende del viewport');
  const fs = require('fs');
  const urls = [...fs.readFileSync(path.join(RAIZ, 'sitemap.xml'), 'utf8').matchAll(/\/comparar\/([a-z0-9-]+)-vs-([a-z0-9-]+)</g)];
  expect(urls.length).toBeGreaterThan(50);
  const [, a, b] = urls.find(u => u[1] === 'baic-bj40-pro' && u[2] === 'tank-300') || urls[0];
  await page.goto(`/comparar/${a}-vs-${b}.html`);
  await expect(page.locator('h1')).toContainText(' vs ');
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', `https://autoschinos-ar.vercel.app/comparar/${a}-vs-${b}`);
  await expect(page.locator('a.cta')).toHaveAttribute('href', `/?autos=${a},${b}`);
  expect(await page.locator('tbody tr:not(.cat)').count()).toBeGreaterThan(10);
  // Solo filas distintas: en ninguna los dos autos dicen lo mismo.
  const iguales = await page.locator('tbody tr:not(.cat)').evaluateAll(trs => trs.filter(tr => {
    const td = tr.querySelectorAll('td'); return td[0].firstChild.textContent === td[1].firstChild.textContent; }).length);
  expect(iguales).toBe(0);
  for (const s of [a, b]){
    await page.goto(`/autos/${s}.html`);
    await expect(page.locator(`ul.vs a[href="/comparar/${a}-vs-${b}"]`)).toHaveCount(1);
  }
});

test('"Quién hace esto": existe, está en el sitemap y el pie del comparativo la linkea', async ({ page }, info) => {
  test.skip(info.project.name !== 'escritorio', 'no depende del viewport');
  const fs = require('fs');
  expect(fs.readFileSync(path.join(RAIZ, 'sitemap.xml'), 'utf8')).toContain('/quien-hace-esto<');
  await page.goto('/quien-hace-esto.html');
  await expect(page.locator('h1')).toHaveText('Quién hace esto');
  await expect(page.locator('main')).toContainText('No tengo ninguna relación comercial');
  await page.goto('/index.html?tabla');
  await expect(page.locator('footer a[href="/quien-hace-esto"]')).toHaveCount(1);
});

test('la página dice que no hay publicidad ni seguimiento: que siga siendo cierto', ({ }, info) => {
  test.skip(info.project.name !== 'escritorio', 'no depende del viewport');
  // Si se suma algo de esto, hay que cambiar "Privacidad" en herramientas-paginas.py (quien()).
  const fs = require('fs');
  const html = fs.readFileSync(path.join(RAIZ, 'index.html'), 'utf8');
  for (const t of ['googletagmanager', 'google-analytics', 'gtag(', 'adsbygoogle', '_vercel/insights', 'speed-insights', 'plausible.io', 'clarity.ms', 'hotjar', 'fbq(', 'umami'])
    expect(html.includes(t), t).toBe(false);
});
