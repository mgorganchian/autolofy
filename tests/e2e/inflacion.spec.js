// Contra la inflación (2026-11-05): MACRO (lo escribe herramientas-macro.py desde la base macroeconomia) trae el
// IPC mensual, el interanual, el REM a 12 meses y el dólar BNA de fin de mes. La calculadora de cuota compara la
// TEA con el REM, y el historial de precio compara la suba en pesos con el IPC de los mismos meses.
const { test, expect } = require('@playwright/test');
const { leerIndex } = require('./helpers');

const { html } = leerIndex();
const MACRO = JSON.parse(/\/\*macro:inicio\*\/const MACRO = (.*?);\/\*macro:fin\*\//.exec(html)[1]);
const TASAS = JSON.parse(/\/\*tasas:inicio\*\/(.*?)\/\*tasas:fin\*\//.exec(html)[1]);
const HIST = JSON.parse(/const HISTORIAL_PRECIOS = (\{.*?\});\n/.exec(html)[1]);
const pct1 = n => n.toLocaleString('es-AR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + '%';
const pesosCorto = n => '$ ' + new Intl.NumberFormat('es-AR', { maximumFractionDigits: 1 }).format(n / 1e6) + ' M';

test('MACRO: IPC mensual sin huecos y con su dólar de fin de mes; REM e interanual con su mes; fuentes https', () => {
  expect(MACRO.ipc.length).toBeGreaterThanOrEqual(12);
  MACRO.ipc.forEach(([m, v], k) => {
    expect(m).toMatch(/^\d{4}-(0[1-9]|1[0-2])$/);
    expect(v, m).toBeGreaterThan(-5); expect(v, m).toBeLessThan(30);
    if (k){
      const [a, mm] = MACRO.ipc[k - 1][0].split('-').map(Number);
      expect(m, 'falta un mes').toBe(mm === 12 ? (a + 1) + '-01' : a + '-' + String(mm + 1).padStart(2, '0'));
    }
  });
  expect(MACRO.dolarFinMes.map(x => x[0])).toEqual(MACRO.ipc.map(x => x[0]));
  for (const [m, v] of MACRO.dolarFinMes){ expect(v, m).toBeGreaterThanOrEqual(100); expect(v, m).toBeLessThanOrEqual(100000); }
  for (const x of [MACRO.ipc12, MACRO.rem12]){ expect(x[0]).toMatch(/^\d{4}-\d{2}$/); expect(x[1]).toBeGreaterThan(-10); expect(x[1]).toBeLessThan(1000); }
  expect(MACRO.fuentes.ipc).toMatch(/^https:\/\/www\.indec\.gob\.ar\//);
  expect(MACRO.fuentes.rem).toMatch(/^https:\/\/www\.bcra\.gob\.ar\//);
});

async function cuota(page, k){
  await page.goto('/index.html?auto=byd-song-pro');
  await page.locator('#fichaCuota summary').click();
  await page.locator('#cuMonto').fill('20000000');
  await page.locator('#cuPlazo').selectOption('48');
  await page.locator('#cuLinea').selectOption(String(k));
  return page.locator('#cuRes .cuota-inflacion');
}

test('cuota en pesos: la TEA contra la inflación que espera el REM, y la de los últimos 12 meses', async ({ page }) => {
  const k = TASAS.lineas.findIndex(l => l.mon !== 'UVA');
  test.skip(k < 0, 'no hay líneas en pesos');
  const l = TASAS.lineas[k], real = ((1 + l.tea / 100) / (1 + MACRO.rem12[1] / 100) - 1) * 100;
  const p = await cuota(page, k);
  await expect(p).toContainText('espera ' + pct1(MACRO.rem12[1]) + ' de inflación para los próximos 12 meses');
  await expect(p).toContainText('tasa real de ' + (real >= 0 ? 'unos ' : '') + pct1(real) + ' por año');
  await expect(p).toContainText('La de los últimos 12 meses fue ' + pct1(MACRO.ipc12[1]));
  await expect(p.locator('a')).toHaveCount(2);
});

test('cuota en UVA: cuánto da la TEA en pesos con el REM y cuánto sería la cuota 13', async ({ page }) => {
  const k = TASAS.lineas.findIndex(l => l.mon === 'UVA' && l.plazo > 12);
  test.skip(k < 0, 'no hay líneas en UVA de más de 12 cuotas');
  const l = TASAS.lineas[k], e = MACRO.rem12[1] / 100, n = Math.min(48, l.plazo), r = Math.pow(1 + l.tea / 100, 1 / 12) - 1;
  const c = 20000000 * r / (1 - Math.pow(1 + r, -n));
  const p = await cuota(page, k);
  await expect(p).toContainText('equivale a unos ' + pct1(((1 + l.tea / 100) * (1 + e) - 1) * 100) + ' en pesos');
  await expect(p).toContainText('la cuota 13 sería de unos $ ' + Math.round(c * (1 + e)).toLocaleString('es-AR'));
});

test('historial: la suba en pesos al dólar de fin de mes contra el IPC de los mismos meses', async ({ page }) => {
  const m1 = MACRO.ipc[MACRO.ipc.length - 1][0], dolar = Object.fromEntries(MACRO.dolarFinMes);
  const serieDe = h => h.filter(x => x[2] === h[h.length - 1][2]);
  const con = Object.entries(HIST).find(([, h]) => serieDe(h)[0][0].slice(0, 7) < m1 && serieDe(h).length > 1) ||
    Object.entries(HIST).find(([, h]) => serieDe(h)[0][0].slice(0, 7) < m1);
  test.skip(!con, 'ningún auto tiene un precio registrado antes del último IPC publicado');
  const s = serieDe(con[1]), m0 = s[0][0].slice(0, 7);
  const finDe = m => { const [a, mm] = m.split('-').map(Number); return new Date(Date.UTC(a, mm, 0)).toISOString().slice(0, 10); };
  const precioAl = f => s.filter(x => x[0] <= f).pop()[1];
  const p0 = precioAl(finDe(m0)) * dolar[m0], p1 = precioAl(finDe(m1)) * dolar[m1];
  const inf = (MACRO.ipc.filter(x => x[0] > m0 && x[0] <= m1).reduce((a, x) => a * (1 + x[1] / 100), 1) - 1) * 100;
  await page.goto('/index.html?auto=' + con[0]);
  const p = page.locator('.ficha-hist-inflacion');
  await expect(p).toContainText('pasó de ' + pesosCorto(p0));
  await expect(p).toContainText('a ' + pesosCorto(p1));
  await expect(p).toContainText(' fue ' + pct1(inf));
  await expect(p).toContainText(/(subió (más|menos|lo mismo) que la inflación|en pesos bajó|en pesos no cambió)\.$/);

  // Un auto cuyo primer precio es del último mes publicado o posterior todavía no tiene con qué comparar.
  const sin = Object.entries(HIST).find(([, h]) => serieDe(h)[0][0].slice(0, 7) >= m1);
  if (sin){
    await page.goto('/index.html?auto=' + sin[0]);
    await expect(page.locator('.ficha-hist')).toBeVisible();
    await expect(page.locator('.ficha-hist-inflacion')).toHaveCount(0);
  }
});
