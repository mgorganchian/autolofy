// Registro de fuentes por celda (2026-11-01, pedido de Mati): datos-fuentes.tsv tiene una fila por dato
// cargado desde esa fecha, con su URL oficial y su fecha. El test lo cruza contra DATA para que no se
// desactualice: el auto y la fila existen, el valor de la tabla es el que se registró y la fuente es https.
const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');
const { leerIndex } = require('./helpers');

const { html } = leerIndex();
const DATA = JSON.parse(/const DATA = (\[.*?\]);\n/s.exec(html)[1]);
const SLUGS = [...html.matchAll(/<img class="car-photo" data-slug="([^"]+)"/g)].map(m => m[1]);
const FILAS = new Map(DATA.flatMap(([, rs]) => rs).map(r => [r[0], r]));
const REG = fs.readFileSync(path.join(__dirname, '..', '..', 'datos-fuentes.tsv'), 'utf8')
  .split('\n').filter(l => l && !l.startsWith('#')).map(l => l.split('\t'));

test('cada dato registrado existe en la tabla con el mismo valor y una fuente https', () => {
  expect(REG.length).toBeGreaterThan(0);
  const vistos = new Set();
  for (const [slug, fila, valor, tipo, fuente, url, sha, fecha] of REG) {
    const k = SLUGS.indexOf(slug);
    expect(k, slug).toBeGreaterThanOrEqual(0);
    expect(FILAS.has(fila), `${slug} · ${fila}`).toBe(true);
    const celda = FILAS.get(fila)[k + 1];
    const visible = celda.replace(/^(DET|NOTE|EXT|NR):/, '').split('|')[0];
    expect(visible, `${slug} · ${fila}`).toBe(valor);
    expect(['dato', 'motivo de s/d']).toContain(tipo);
    expect(fuente, slug).not.toBe('');
    expect(url, slug).toMatch(/^https:\/\/\S+$/);
    expect(sha, slug).toMatch(/^[0-9a-f]{64}$|^leída en línea, sin hash$/);
    expect(fecha, slug).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(vistos.has(slug + fila), `repetida ${slug} · ${fila}`).toBe(false);
    vistos.add(slug + fila);
  }
});
