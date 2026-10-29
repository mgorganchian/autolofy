#!/usr/bin/env python3
"""Baja del BCRA las líneas de préstamo para comprar un 0 km y las deja en index.html (TASAS_BCRA).

    python3 herramientas-tasas.py

Por qué existe (2026-10-11): la calculadora "¿Cuánto pagarías por mes?" de la página de cada auto
usa tasas reales, las que cada banco informa al BCRA por el Régimen de Transparencia
(api.bcra.gob.ar/transparencia, sin clave). Son la TEA y el CFT **máximos** de cada línea, con la
fecha en que el banco los informó: la tasa de cada persona puede ser menor, y la página lo dice.

Qué entra: préstamos prendarios con destino "Adquisición automotores 0 km" y la línea +Autos del
Banco Nación (que el BCRA lista como préstamo personal), en pesos o UVA, de bancos (no las
financieras de otras marcas), informados en los últimos 200 días. Una línea que el banco informa
una vez por tipo de cliente (relación de dependencia, monotributistas…) va una sola vez, con los
tipos juntos. Lo corre la rutina semanal (tarea K); el bloque va entre /*tasas:inicio*/ y /*tasas:fin*/.
"""
import json
import os
import re
import sys
import urllib.request
from datetime import date, timedelta

RAIZ = os.path.dirname(os.path.abspath(__file__))
API = 'https://api.bcra.gob.ar/transparencia/v1.0/Prestamos/'
NOMBRES = {'BANCO BBVA ARGENTINA S.A.': 'BBVA', 'BANCO SANTANDER ARGENTINA S.A.': 'Santander',
           'BANCO SUPERVIELLE S.A.': 'Supervielle', 'BANCO DE LA NACION ARGENTINA': 'Banco Nación',
           'INDUSTRIAL AND COMMERCIAL BANK OF CHINA (ARGENTINA) S.A.U.': 'ICBC',
           'BANCO CREDICOOP COOPERATIVO LIMITADO': 'Credicoop', 'BANCO DE GALICIA Y BUENOS AIRES S.A.': 'Galicia',
           'BANCO DE LA CIUDAD DE BUENOS AIRES': 'Banco Ciudad', 'BANCO DE LA PROVINCIA DE BUENOS AIRES': 'Banco Provincia'}


def bajar(tipo):
    req = urllib.request.Request(API + tipo, headers={'User-Agent': 'autolofy (comparativo; herramientas-tasas.py)'})
    with urllib.request.urlopen(req, timeout=60) as r:
        return json.load(r)['results']


def nombre(e):
    if e in NOMBRES: return NOMBRES[e]
    n = re.sub(r'\s+(S\.\s?A\.(U\.)?|SOCIEDAD ANONIMA|COOPERATIVO LIMITADO)\s*$', '', e.strip())
    return ' '.join(w if w in ('de', 'del', 'la') else w.capitalize() for w in n.lower().split())


def lineas(hoy):
    desde = (hoy - timedelta(days=200)).isoformat()
    filas = [(x, 'prendario') for x in bajar('Prendarios') if x.get('destinoFondos') == 'Adquisición automotores 0 km']
    filas += [(x, 'personal') for x in bajar('Personales')
              if 'AUTO' in ((x.get('nombreCompleto') or '') + (x.get('nombreCorto') or '')).upper()
              and x.get('descripcionEntidad') == 'BANCO DE LA NACION ARGENTINA']
    out = {}
    for x, tipo in filas:
        e = x.get('descripcionEntidad') or ''
        if x.get('denominacion') not in ('Pesos', 'UVA') or (x.get('fechaInformacion') or '') < desde: continue
        if not e.upper().startswith(('BANCO', 'NUEVO BANCO', 'INDUSTRIAL AND COMMERCIAL')): continue
        if not x.get('tasaEfectivaAnualMaxima') or not x.get('plazoMaximoOtorgable'): continue
        if re.search(r'taxi|remis', (x.get('nombreCorto') or '') + (x.get('nombreCompleto') or ''), re.I): continue
        clave = (e, x.get('nombreCorto'), x['denominacion'], x['tasaEfectivaAnualMaxima'], x.get('costoFinancieroEfectivoTotalMaximo'), x['plazoMaximoOtorgable'])
        l = out.setdefault(clave, {'e': nombre(e), 'n': (x.get('nombreCorto') or x.get('nombreCompleto') or '').strip().capitalize(),
                                    'mon': x['denominacion'], 'tasa': x.get('tipoTasa') or '', 'tea': x['tasaEfectivaAnualMaxima'],
                                    'cft': x.get('costoFinancieroEfectivoTotalMaximo'), 'plazo': x['plazoMaximoOtorgable'],
                                    'terr': '' if (x.get('territorioValidez') or 'Todo el territorio nacional') in ('Todo el territorio nacional', '0')
                                            else 'solo en ' + re.sub(r'^Provincia de ', '', x['territorioValidez']).replace(' Antártida e Islas del Atlántico Sur', ''),
                                    'ben': [], 'f': x['fechaInformacion'], 'tipo': tipo})
        b = x.get('beneficiario') or ''
        if b and b not in l['ben']: l['ben'].append(b)
        l['f'] = max(l['f'], x['fechaInformacion'])
    res = sorted(out.values(), key=lambda l: (l['mon'] != 'Pesos', l['tea'], l['e']))
    # Quién puede pedirla, corto: si la línea abarca a casi todos (o el banco dice "Todos"), nada.
    corto = {'Empleados públicos': 'empleados públicos', 'Clientes que acrediten sueldos en la entidad': 'con el sueldo en el banco',
             'Clientes con cuenta en la entidad': 'clientes del banco', 'Personas humanas en relación de dependencia': 'en relación de dependencia',
             'Personas humanas Monotributistas': 'monotributistas', 'Personas humanas Responsables Inscriptos': 'responsables inscriptos',
             'Beneficiarios de cuentas de la seguridad social': 'jubilados'}
    for l in res:
        b = l['ben']
        l['ben'] = '' if 'Todos los beneficiarios' in b or len(b) >= 4 else ', '.join(sorted(corto.get(x, x.lower()) for x in b))
    return res


if __name__ == '__main__':
    hoy = date.today()
    try:
        ls = lineas(hoy)
    except Exception as er:   # sin conexión o la API cambió: no se toca nada
        sys.exit(f'no se pudo bajar del BCRA: {er}')
    if len(ls) < 5:
        sys.exit(f'el BCRA devolvió solo {len(ls)} líneas: no se toca nada')
    bloque = json.dumps({'fecha': hoy.isoformat(), 'fuente': 'https://api.bcra.gob.ar/transparencia/v1.0/Prestamos/Prendarios',
                         'lineas': ls}, ensure_ascii=False, separators=(',', ':'))
    p = os.path.join(RAIZ, 'index.html')
    s = open(p, encoding='utf-8').read()
    n, k = re.subn(r'(/\*tasas:inicio\*/).*?(/\*tasas:fin\*/)', lambda m: m.group(1) + bloque + m.group(2), s, flags=re.S)
    if k != 1: sys.exit(f'el bloque de tasas aparece {k} veces en index.html')
    open(p, 'w', encoding='utf-8').write(n)
    print(f'{len(ls)} líneas de préstamo para 0 km, al {hoy.isoformat()}')
