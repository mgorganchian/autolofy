// Versiones de cada modelo (issue #224, docs/versiones-por-modelo.md). VERSIONES_PRECIO (en index.html), versiones.json
// y versiones-fuentes.tsv los escribe herramientas-versiones.py; este test falla si alguien los toca a mano y quedan
// desparejos, o si una versión hereda en silencio una fila de versión de su modelo.
const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');
const { leerIndex } = require('./helpers');

const RAIZ = path.join(__dirname, '..', '..');
const { html, SLUGS, filas } = leerIndex();
const FILAS = new Map(filas.map(r => [r[0], r.slice(1)]));
const PRECIO_DATA = FILAS.get('Precio de lista (versión tope de gama de la tabla)');
const m = /\/\*versiones:inicio\*\/const VERSIONES_PRECIO = (.*?);\/\*versiones:fin\*\//s.exec(html);
const PRECIOS = m ? JSON.parse(m[1]) : {};
const rutaJson = path.join(RAIZ, 'versiones.json');
const JS = fs.existsSync(rutaJson) ? JSON.parse(fs.readFileSync(rutaJson, 'utf8')) : { filas: [], versiones: {} };
const rutaTsv = path.join(RAIZ, 'versiones-fuentes.tsv');
const FUENTES = fs.existsSync(rutaTsv)
  ? fs.readFileSync(rutaTsv, 'utf8').split('\n').filter(l => l && !l.startsWith('#')).map(l => l.split('\t'))
  : [];
const visible = c => c.replace(/^(DET|NOTE|EXT|NR):/, '').split('|')[0];

test('los tres archivos de versiones existen juntos o no existe ninguno', () => {
  const hay = [!!m, fs.existsSync(rutaJson), fs.existsSync(rutaTsv)];
  expect(hay.every(Boolean) || hay.every(x => !x), JSON.stringify(hay)).toBe(true);
});

test('cada modelo tiene una sola versión de referencia, la de la tabla, con el precio de DATA', () => {
  for (const [modelo, lista] of Object.entries(PRECIOS)) {
    const k = SLUGS.indexOf(modelo);
    expect(k, modelo).toBeGreaterThanOrEqual(0);
    const refs = lista.filter(x => x.ref);
    expect(refs.length, modelo).toBe(1);
    expect(refs[0].v, modelo).toBe(modelo);
    expect(refs[0].p, modelo).toBe(PRECIO_DATA[k]);
    expect(lista.length, `${modelo}: un modelo con versiones tiene más de una`).toBeGreaterThan(1);
  }
});

test('los slugs de versión son únicos, arrancan con la marca y no chocan con otro auto', () => {
  const vistos = new Set();
  for (const [modelo, lista] of Object.entries(PRECIOS)) {
    for (const x of lista) {
      expect(vistos.has(x.v), `repetida ${x.v}`).toBe(false);
      vistos.add(x.v);
      expect(x.n, x.v).not.toBe('');
      if (x.ref) continue;
      expect(x.v).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
      expect(x.v.startsWith(modelo.split('-')[0] + '-'), x.v).toBe(true);
      expect(SLUGS.includes(x.v), `${x.v} es otro auto de la tabla`).toBe(false);
      expect(JS.versiones[x.v], `${x.v} no está en versiones.json`).toBeTruthy();
      expect(JS.versiones[x.v].modelo).toBe(modelo);
      expect(JS.versiones[x.v].nombre).toBe(x.n);
    }
  }
  expect(Object.keys(JS.versiones).every(v => vistos.has(v)), 'versión de versiones.json sin precio').toBe(true);
});

test('ninguna versión hereda una fila de versión: las trae todas, con las reglas de las celdas de DATA', () => {
  for (const f of JS.filas) expect(FILAS.has(f), f).toBe(true);
  for (const [v, { celdas }] of Object.entries(JS.versiones)) {
    expect(Object.keys(celdas).sort(), v).toEqual([...JS.filas].sort());
    for (const [f, c] of Object.entries(celdas)) {
      if (c === '=ref' || ['YES', 'NO', 'OPT', 'ND'].includes(c)) continue;
      if (c.includes('|')) expect(c, `${v} · ${f}`).toMatch(/^(NR|NOTE|EXT|DET):/);
      expect(visible(c), `${v} · ${f}`).not.toMatch(/^(YES|NO|OPT|ND)\b\s*\S/);
    }
  }
});

test('cada precio y cada celda de versión tiene su fuente https registrada', () => {
  const reg = new Map(FUENTES.map(f => [f[0] + '\t' + f[1], f]));
  const esperar = (v, fila, celda) => {
    const f = reg.get(v + '\t' + fila);
    expect(f, `sin fuente: ${v} · ${fila}`).toBeTruthy();
    expect(f[2], `${v} · ${fila}`).toBe(celda === '=ref' ? '=ref' : visible(celda));
    expect(f[5]).toMatch(/^https:\/\/\S+$/);
    expect(f[6]).toMatch(/^[0-9a-f]{64}$|^leída en línea, sin hash$/);
    expect(f[7]).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  };
  for (const lista of Object.values(PRECIOS)) for (const x of lista) esperar(x.v, 'Precio de lista', x.p);
  for (const [v, { celdas }] of Object.entries(JS.versiones)) for (const [f, c] of Object.entries(celdas)) esperar(v, f, c);
});
