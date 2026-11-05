#!/usr/bin/env python3
"""Historial persistente de precios de lista en cualquier moneda (2026-11-04, pedido de Mati).

HISTORIAL_PRECIOS (en index.html) solo guarda cambios en dólares de la misma versión y alimenta Novedades y los RSS. Este archivo
(precios-historial.json; Vercel lo sirve y la ficha lo lee para el historial de las listas en pesos) guarda además los precios en pesos: por auto, cada precio publicado con su moneda, monto,
versión, desde cuándo rige y la fuente. Lo escribe esta herramienta leyendo la fila «Precio de lista» de DATA:

  python3 herramientas-precios.py --desde AAAA-MM-DD   # registra los cambios; --desde es la fecha de la lista nueva (por defecto, hoy)
  python3 herramientas-precios.py --check              # sale con 1 si hay un precio en DATA sin registrar
Se corre SIEMPRE después de tocar la fila de precio (tarea D de la rutina). La primera entrada de cada auto es la línea base
(`desde: null`): el valor que tenía la tabla cuando empezó el historial.
"""
import json, re, sys, os, datetime

AQUI = os.path.dirname(os.path.abspath(__file__))
HIST = os.path.join(AQUI, 'precios-historial.json')


def leer_index():
    s = open(os.path.join(AQUI, 'index.html'), encoding='utf-8').read()
    i = s.index('const DATA = ['); j = s.index('];', i)
    data = json.loads(s[i + 13:j + 1])
    fila = data[0][1][0]
    slugs = re.findall(r'<img class="car-photo"[^>]*data-slug="([^"]+)"', s)
    return slugs, fila[1:]


def parsear(celda):
    """(moneda, monto, version) o None si la celda no trae un precio."""
    v = re.sub(r'^(DET|NOTE|EXT|NR):', '', celda)
    vis, _, det = v.partition('|')
    m = re.search(r'USD\s*([\d.]+)', vis)
    mon = 'USD'
    if not m:
        m = re.search(r'(?:ARS\s*|\$\s*)([\d.]+)', vis); mon = 'ARS'
    if not m or not re.search(r'\d', m.group(1)):
        return None
    try:
        monto = int(m.group(1).replace('.', ''))
    except ValueError:
        return None
    return mon, monto, det.strip()[:160]


def main():
    a = sys.argv[1:]
    desde = a[a.index('--desde') + 1] if '--desde' in a else datetime.date.today().isoformat()
    slugs, celdas = leer_index()
    hist = json.load(open(HIST, encoding='utf-8')) if os.path.exists(HIST) else {'nota': 'Lo escribe herramientas-precios.py; no se edita a mano.', 'autos': {}}
    cambios = []
    for slug, c in zip(slugs, celdas):
        p = parsear(c)
        if not p:
            continue
        L = hist['autos'].setdefault(slug, [])
        if L and (L[-1]['moneda'], L[-1]['monto']) == (p[0], p[1]):
            continue
        L.append({'desde': None if not L else desde, 'moneda': p[0], 'monto': p[1], 'version': p[2]})
        cambios.append((slug, L[-2]['monto'] if len(L) > 1 else None, p[1], p[0]))
    if '--check' in a:
        for x in cambios: print('sin registrar', x)
        sys.exit(1 if cambios else 0)
    json.dump(hist, open(HIST, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    for x in cambios:
        if x[1] is not None: print(f'cambió {x[0]}: {x[1]:,} -> {x[2]:,} {x[3]}'.replace(',', '.'))
    print(f'{len(hist["autos"])} autos con precio, {sum(len(v) for v in hist["autos"].values())} entradas, {len(cambios)} nuevas')


if __name__ == '__main__':
    main()
