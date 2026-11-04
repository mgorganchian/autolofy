// Historial persistente de precios en cualquier moneda (2026-11-04): todo precio de la fila «Precio de lista» de DATA
// está registrado en precios-historial.json. Si falla: python3 herramientas-precios.py --desde AAAA-MM-DD y commitear.
const { test, expect } = require('@playwright/test');
const { spawnSync } = require('child_process');
const path = require('path');
const RAIZ = process.env.AUTOLOFY_RAIZ || path.resolve(__dirname, '../..');

test('el historial de precios está al día con la tabla', ({ }, info) => {
  test.skip(info.project.name !== 'escritorio', 'no depende del viewport');
  const r = spawnSync('python3', [path.join(RAIZ, 'herramientas-precios.py'), '--check'], { encoding: 'utf8' });
  expect(r.stdout + r.stderr, 'corré herramientas-precios.py').toBe('');
  expect(r.status).toBe(0);
});
