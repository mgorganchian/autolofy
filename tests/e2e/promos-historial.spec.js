// Historial persistente de promos (2026-11-04): toda promo de concesionarios.json tiene su registro en
// promos-historial.json y toda promo vigente del historial sigue publicada. Si falla: correr
// python3 herramientas-promos.py y commitear promos-historial.json.
const { test, expect } = require('@playwright/test');
const { spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const RAIZ = process.env.AUTOLOFY_RAIZ || path.resolve(__dirname, '../..');

test('el historial de promos está al día con concesionarios.json', ({ }, info) => {
  test.skip(info.project.name !== 'escritorio', 'no depende del viewport');
  const r = spawnSync('python3', [path.join(RAIZ, 'herramientas-promos.py'), '--check'], { encoding: 'utf8' });
  expect(r.stdout + r.stderr, 'corré herramientas-promos.py').toBe('');
  expect(r.status).toBe(0);
});

test('cada registro del historial tiene fuente https y al menos una versión', ({ }, info) => {
  test.skip(info.project.name !== 'escritorio', 'no depende del viewport');
  const h = JSON.parse(fs.readFileSync(path.join(RAIZ, 'promos-historial.json'), 'utf8'));
  expect(h.promos.length).toBeGreaterThan(0);
  for (const e of h.promos) {
    expect(e.fuente.length, e.id).toBeGreaterThan(0);
    e.fuente.forEach(u => expect(u).toMatch(/^https:\/\//));
    expect(e.versiones.length, e.id).toBeGreaterThan(0);
    expect(['vigente', 'retirada']).toContain(e.estado);
  }
});
