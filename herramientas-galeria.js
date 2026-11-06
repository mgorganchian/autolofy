#!/usr/bin/env node
// Baja las imágenes de la galería oficial argentina de un auto, abriendo la página con un
// navegador de verdad (2026-11-05, issue #143). Muchos sitios de marca (DFSK, entre otros)
// cargan la galería con JavaScript: con curl solo se ve el HTML inicial y se pierde la mitad
// de las fotos. Acá la página se abre, se recorre hasta abajo, se tocan las flechas de los
// carruseles y se juntan todas las imágenes que pidió el navegador o que nombra el DOM.
//
//   node herramientas-galeria.js SLUG URL [URL...]
//
// Deja en .fotos-candidatas/oficial/SLUG/ cada imagen (NN.ext) y candidatas.tsv con
// n, url_imagen, pagina. Después: python3 herramientas-fotos.py galeria-hoja SLUG, que filtra
// las chicas y las repetidas y arma la hoja de contacto para MIRARLAS una por una.
// No cambia encabezados ni el user agent: es el navegador tal cual.
const fs = require('fs');
const path = require('path');

const RAIZ = __dirname;
function cargarPlaywright() {
  for (const p of ['playwright', path.join(RAIZ, 'tests/e2e/node_modules/playwright')]) {
    try { return require(p); } catch (e) { /* siguiente */ }
  }
  console.error('falta playwright: cd tests/e2e && npm ci');
  process.exit(1);
}

// Variantes de una URL que pueden ser el original: sin el sufijo de tamaño de WordPress
// (-1024x683), sin el de los optimizadores (-480, -1536) y sin el envoltorio .bv.webp.
function variantes(u) {
  let base = u.split('#')[0];
  const opt = base.match(/\/al_opt_content\/IMAGE\/([^/]+)\/(.+?\.(?:jpe?g|png|webp|avif))(?:\.bv|$)/i);
  if (opt) base = `https://${opt[1]}/${opt[2]}`;
  const out = [];
  const sinWp = base.replace(/-\d{2,4}x\d{2,4}(\.[a-z]+)(\?.*)?$/i, '$1');
  const sinOpt = sinWp.replace(/-(?:320|480|640|768|820|1024|1280|1536|1920|2048)(\.[a-z]+)(\?.*)?$/i, '$1');
  for (const v of [sinOpt, sinWp, base, u]) if (!out.includes(v)) out.push(v);
  return out;
}

async function lanzar(chromium) {
  try { return await chromium.launch({ channel: 'chrome' }); } catch (e) { return chromium.launch(); }
}

(async () => {
  const [slug, ...paginas] = process.argv.slice(2);
  if (!slug || !paginas.length) { console.error('uso: node herramientas-galeria.js SLUG URL [URL...]'); process.exit(2); }
  const { chromium } = cargarPlaywright();
  const dir = path.join(RAIZ, '.fotos-candidatas', 'oficial', slug);
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
  const navegador = await lanzar(chromium);
  const ctx = await navegador.newContext({ viewport: { width: 1440, height: 900 } });
  const vistas = new Map();   // url original -> página
  for (const pagina of paginas) {
    const p = await ctx.newPage();
    const urls = new Set();
    p.on('response', r => { if (r.request().resourceType() === 'image') urls.add(r.url()); });
    try {
      await p.goto(pagina, { waitUntil: 'networkidle', timeout: 60000 });
    } catch (e) {
      console.error(`${pagina}: ${e.message.split('\n')[0]}`);
    }
    for (let i = 0; i < 40; i++) { await p.mouse.wheel(0, 700); await p.waitForTimeout(250); }
    const flechas = ['.swiper-button-next', '.slick-next', '.elementor-swiper-button-next', '.owl-next',
      '.carousel-control-next', '.splide__arrow--next', '.glide__arrow--right', '[aria-label*="Next" i]',
      '[aria-label*="Siguiente" i]', '[aria-label*="próxim" i]'];
    for (const sel of flechas) {
      for (const e of (await p.$$(sel)).slice(0, 6)) {
        if (!(await e.isVisible().catch(() => false))) continue;
        for (let i = 0; i < 15; i++) {
          try { await e.click({ timeout: 700 }); await p.waitForTimeout(250); } catch (err) { break; }
        }
      }
    }
    await p.waitForTimeout(1500);
    const delDom = await p.evaluate(() => {
      const s = new Set();
      const abs = u => { try { return new URL(u, location.href).href; } catch (e) { return null; } };
      const deSrcset = v => (v || '').split(',').map(x => x.trim().split(/\s+/)[0]).filter(Boolean);
      document.querySelectorAll('img, source').forEach(i => {
        if (i.currentSrc) s.add(i.currentSrc);
        for (const a of i.getAttributeNames()) {
          const v = i.getAttribute(a);
          if (/src|lazy|original|full|large|zoom/i.test(a)) deSrcset(v).forEach(x => s.add(abs(x)));
        }
      });
      document.querySelectorAll('a[href]').forEach(a => { if (/\.(jpe?g|png|webp|avif)(\?|$)/i.test(a.href)) s.add(a.href); });
      document.querySelectorAll('*').forEach(e => {
        const bg = getComputedStyle(e).backgroundImage;
        (bg.match(/url\("?([^")]+)"?\)/g) || []).forEach(m => s.add(abs(m.replace(/^url\("?|"?\)$/g, ''))));
      });
      const html = document.documentElement.outerHTML.replace(/\\\//g, '/');
      (html.match(/https?:\/\/[^"'\s()<>,]+?\.(?:jpe?g|png|webp|avif)/gi) || []).forEach(x => s.add(x));
      return [...s].filter(Boolean);
    });
    delDom.forEach(u => urls.add(u));
    for (const u of urls) {
      if (!/^https:/.test(u) || /\.svg(\?|$)|favicon|logo|icon|sprite|gstatic|google|facebook|doubleclick/i.test(u)) continue;
      const clave = variantes(u)[0];
      if (!vistas.has(clave)) vistas.set(clave, { url: u, pagina });
    }
    await p.close();
  }
  // Bajar cada una por el mismo navegador: primero la variante original, si existe.
  const filas = ['n\turl_imagen\tpagina'];
  let n = 0;
  for (const [clave, { url, pagina }] of vistas) {
    for (const v of variantes(url)) {
      try {
        const r = await ctx.request.get(v, { timeout: 30000 });
        const tipo = (r.headers()['content-type'] || '');
        if (!r.ok() || !/^image\//.test(tipo) || /svg/.test(tipo)) continue;
        const cuerpo = await r.body();
        if (cuerpo.length < 15000) break;      // íconos y miniaturas: ni vale probar otra variante
        n++;
        const ext = tipo.includes('png') ? 'png' : tipo.includes('webp') ? 'webp' : tipo.includes('avif') ? 'avif' : 'jpg';
        fs.writeFileSync(path.join(dir, `${String(n).padStart(3, '0')}.${ext}`), cuerpo);
        filas.push(`${String(n).padStart(3, '0')}\t${v}\t${pagina}`);
        break;
      } catch (e) { /* siguiente variante */ }
    }
  }
  fs.writeFileSync(path.join(dir, 'candidatas.tsv'), filas.join('\n') + '\n');
  await navegador.close();
  console.log(`${slug}: ${n} imágenes de ${paginas.length} página(s) en ${path.relative(RAIZ, dir)}`);
})();
