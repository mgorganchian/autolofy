#!/usr/bin/env python3
"""Historial persistente de promociones y ofertas (2026-11-04, pedido de Mati).

Compara las promos que hoy están en concesionarios.json (las de cada marca y las de cada local) contra
promos-historial.json y registra: la primera vez que se vio cada una, cada cambio de texto, precio, descuento o
vigencia, la última vez que se vio y cuándo dejó de publicarse. No decide qué es una promo: eso lo hace la rutina
(tarea G); esta herramienta solo deja la historia. Se corre SIEMPRE después de tocar las promos de concesionarios.json.

  python3 herramientas-promos.py            # actualiza promos-historial.json con la fecha de hoy
  python3 herramientas-promos.py --check    # no escribe; sale con 1 si el historial no está al día
  python3 herramientas-promos.py --fecha AAAA-MM-DD
"""
import json, sys, datetime, os

AQUI = os.path.dirname(os.path.abspath(__file__))
CONC = os.path.join(AQUI, 'concesionarios.json')
HIST = os.path.join(AQUI, 'promos-historial.json')
CAMPOS = ('texto', 'precio', 'descuento', 'vigencia')


def promos_actuales(c):
    """[(donde, promo)] de las marcas y de cada local."""
    out = []
    for m, v in c['marcas'].items():
        for p in v.get('promos', []):
            out.append((f'marca:{m}', p))
    for x in c['concesionarios']:
        for p in x.get('promos', []):
            out.append((f'local:{x["nombre"]}|{x.get("ciudad", "")}', p))
    return out


def clave(donde, p):
    return '|'.join([donde, p.get('tipo', ''), ','.join(sorted(p.get('autos', []))), p.get('version') or '', (p.get('fuente') or [''])[0]])


def version(p, desde):
    return {'desde': desde, **{k: p.get(k) for k in CAMPOS}}


def actualizar(hist, c, hoy):
    por_id = {e['id']: e for e in hist['promos']}
    vistos, cont, cambios = set(), {}, []
    for donde, p in promos_actuales(c):
        k = clave(donde, p)
        cont[k] = cont.get(k, 0) + 1
        if cont[k] > 1:
            k += f'#{cont[k]}'
        vistos.add(k)
        e = por_id.get(k)
        if e is None:
            e = {'id': k, 'donde': donde, 'autos': p.get('autos', []), 'tipo': p.get('tipo'), 'version': p.get('version'),
                 'fuente': p.get('fuente', []), 'visto_desde': p.get('consultado') or hoy, 'ultima_vez': hoy,
                 'estado': 'vigente', 'retirada_el': None, 'versiones': [version(p, p.get('consultado') or hoy)]}
            hist['promos'].append(e); por_id[k] = e
            cambios.append(('nueva', k))
            continue
        e['ultima_vez'] = hoy
        if e['estado'] != 'vigente':
            e['estado'], e['retirada_el'] = 'vigente', None
            cambios.append(('vuelve', k))
        ult = e['versiones'][-1]
        if any(ult.get(f) != p.get(f) for f in CAMPOS):
            e['versiones'].append(version(p, hoy)); e['fuente'] = p.get('fuente', e['fuente'])
            cambios.append(('cambió', k))
    for e in hist['promos']:
        if e['estado'] == 'vigente' and e['id'] not in vistos:
            e['estado'], e['retirada_el'] = 'retirada', hoy
            cambios.append(('retirada', e['id']))
    hist['actualizado'] = hoy
    return cambios


def main():
    a = sys.argv[1:]
    hoy = a[a.index('--fecha') + 1] if '--fecha' in a else datetime.date.today().isoformat()
    c = json.load(open(CONC, encoding='utf-8'))
    hist = json.load(open(HIST, encoding='utf-8')) if os.path.exists(HIST) else {'nota': 'Historial de promos: lo escribe herramientas-promos.py; no se edita a mano.', 'actualizado': None, 'promos': []}
    antes = json.dumps(hist, ensure_ascii=False, sort_keys=True)
    cambios = actualizar(hist, c, hoy)
    for t, k in cambios:
        print(f'{t:9} {k[:150]}')
    if '--check' in a:
        # solo importa que no falte registrar nada: ignora la fecha de actualización
        hist['actualizado'] = json.loads(antes).get('actualizado')
        for e in hist['promos']:
            pass
        sys.exit(1 if cambios else 0)
    json.dump(hist, open(HIST, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    print(f'{len(hist["promos"])} promos en el historial, {sum(e["estado"] == "vigente" for e in hist["promos"])} vigentes; {len(cambios)} cambios')


if __name__ == '__main__':
    main()
