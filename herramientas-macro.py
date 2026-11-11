#!/usr/bin/env python3
# /// script
# requires-python = ">=3.10"
# dependencies = ["psycopg[binary]>=3.2"]
# ///
"""Lee de la base macroeconomia el IPC, el REM y el dólar de fin de mes, y los deja en index.html (MACRO).

    uv run herramientas-macro.py          # actualiza el bloque si algo cambió
    uv run herramientas-macro.py --check  # solo dice si cambió (sale con 1 si cambió)

Por qué existe (2026-11-05, pedido de Mati: comparar contra la inflación las tasas que cobran los bancos y la
suba del precio de los autos):
- La calculadora de cuota compara la TEA de cada línea con la inflación que espera el REM del BCRA para los
  próximos 12 meses (tasa real en pesos; en UVA, cuánto da en pesos) y con la de los últimos 12 meses.
- El historial de precio de cada auto compara su suba en pesos (al dólar BNA de fin de mes) con el IPC de los
  mismos meses.

De dónde sale: del esquema v1 de la base macroeconomia, con el mismo rol de solo lectura que herramientas-dolar.py
(variable MACRO_DATABASE_URL o, si no está, el Keychain: servicio neon-macroeconomia, cuenta lector_autolofy).
- ar.bcra.inflacion_mensual: la variación mensual del IPC del INDEC, como la publica el BCRA. Se usa esta y no
  ar.ipc.nivel_general porque datos.gob.ar trae el índice del INDEC con un mes más de atraso (el 2026-11-05,
  agosto contra septiembre); desde junio de 2017, en cada mes que tienen las dos, la variación es la misma.
- ar.bcra.inflacion_interanual: la del IPC en los últimos 12 meses.
- ar.bcra.inflacion_esperada_12m: la mediana del REM para los próximos 12 meses; el mes es el del relevamiento.
- ar.dolar.oficial.venta al último día con dato de cada mes (v1.fin_de_mes, de la base macroeconomia: antes se armaba acá con
  generate_series y v1.valor_al; da los mismos 23 valores). Si a un mes le falta el dólar, el script falla en vez de arrastrar el anterior.
Se guardan los meses desde hace dos años. El bloque va entre /*macro:inicio*/ y /*macro:fin*/. Si la base no responde o
algún valor no es razonable, el script falla sin tocar nada.
"""
import datetime
import json
import os
import re
import subprocess
import sys

RAIZ = os.path.dirname(os.path.abspath(__file__))
INDEX = os.path.join(RAIZ, 'index.html')
BLOQUE = re.compile(r'/\*macro:inicio\*/.*?/\*macro:fin\*/', re.S)
FUENTES = {'ipc': 'https://www.indec.gob.ar/indec/web/Nivel4-Tema-3-5-31',
           'rem': 'https://www.bcra.gob.ar/relevamiento-expectativas-mercado-rem/'}
MESES = 24

MENSUAL = """SELECT to_char(fecha, 'YYYY-MM'), valor FROM v1.observaciones
             WHERE codigo = %s AND fecha >= (date_trunc('month', now()) - make_interval(months => %s))::date
             ORDER BY fecha"""
ULTIMO = "SELECT to_char(fecha, 'YYYY-MM'), valor FROM v1.observaciones WHERE codigo = %s ORDER BY fecha DESC LIMIT 1"
DOLAR_FIN_DE_MES = """SELECT to_char(mes, 'YYYY-MM'), valor FROM v1.fin_de_mes('ar.dolar.oficial.venta')
  WHERE mes BETWEEN %s::date AND %s::date ORDER BY mes"""


def cadena():
    if os.environ.get('MACRO_DATABASE_URL'):
        return os.environ['MACRO_DATABASE_URL']
    r = subprocess.run(['security', 'find-generic-password', '-s', 'neon-macroeconomia', '-a', 'lector_autolofy', '-w'],
                       capture_output=True, text=True)
    if r.returncode != 0:
        sys.exit('falta MACRO_DATABASE_URL y no está en el Keychain (neon-macroeconomia / lector_autolofy)')
    return r.stdout.strip()


def num(v):
    v = float(v)
    return int(v) if v == int(v) else round(v, 4)


def leer():
    try:
        import psycopg
    except ImportError:
        sys.exit('falta psycopg: corré el script con «uv run herramientas-macro.py»')
    try:
        with psycopg.connect(cadena(), connect_timeout=15, application_name='autolofy-herramientas-macro') as c:
            ipc = c.execute(MENSUAL, ('ar.bcra.inflacion_mensual', MESES)).fetchall()
            ipc12 = c.execute(ULTIMO, ('ar.bcra.inflacion_interanual',)).fetchone()
            rem12 = c.execute(ULTIMO, ('ar.bcra.inflacion_esperada_12m',)).fetchone()
            dolar = c.execute(DOLAR_FIN_DE_MES, (ipc[0][0] + '-01', ipc[-1][0] + '-01')).fetchall() if ipc else []
    except psycopg.Error as er:
        # El mensaje del error puede nombrar el host o el rol: solo se muestra el tipo y el código.
        sys.exit(f'no se pudo leer la base macroeconomia: {type(er).__name__} {getattr(er, "sqlstate", "") or ""}'.strip())
    return ipc, ipc12, rem12, dolar


def validar(ipc, ipc12, rem12, dolar):
    if len(ipc) < 12: sys.exit(f'el IPC mensual trae {len(ipc)} meses: se esperaban {MESES}')
    meses = [m for m, _ in ipc]
    for a, b in zip(meses, meses[1:]):
        y, mo = map(int, a.split('-'))
        if b != f'{y + mo // 12}-{mo % 12 + 1:02d}': sys.exit(f'al IPC mensual le falta un mes entre {a} y {b}')
    for m, v in ipc:
        if v is None or not -5 <= v <= 30: sys.exit(f'IPC de {m} fuera de rango: {v}')
    hoy = datetime.date.today()
    y, mo = map(int, meses[-1].split('-'))
    if (hoy.year - y) * 12 + hoy.month - mo > 4: sys.exit(f'el último IPC es de {meses[-1]}: la base está atrasada')
    for nombre, fila, tope in (('inflación interanual', ipc12, 1000), ('REM a 12 meses', rem12, 1000)):
        if not fila or fila[1] is None or not -10 <= fila[1] <= tope: sys.exit(f'{nombre} fuera de rango: {fila}')
    if [m for m, _ in dolar] != meses: sys.exit('el dólar de fin de mes no cubre los mismos meses que el IPC')
    for m, v in dolar:
        if v is None or not 100 <= v <= 100000: sys.exit(f'dólar de fin de {m} fuera de rango: {v}')


def main():
    ipc, ipc12, rem12, dolar = leer()
    validar(ipc, ipc12, rem12, dolar)
    datos = {'ipc': [[m, num(v)] for m, v in ipc], 'ipc12': [ipc12[0], num(ipc12[1])], 'rem12': [rem12[0], num(rem12[1])],
             'dolarFinMes': [[m, num(v)] for m, v in dolar], 'fuentes': FUENTES}
    nuevo = '/*macro:inicio*/const MACRO = ' + json.dumps(datos, ensure_ascii=False, separators=(',', ':')) + ';/*macro:fin*/'
    html = open(INDEX, encoding='utf-8').read()
    if len(BLOQUE.findall(html)) != 1: sys.exit('index.html tiene que tener un solo bloque /*macro:inicio*/…/*macro:fin*/')
    resumen = f'IPC hasta {ipc[-1][0]} ({num(ipc[-1][1])}%), interanual {num(ipc12[1])}%, REM {rem12[0]} {num(rem12[1])}%'
    if BLOQUE.search(html).group(0) == nuevo:
        print('sin cambios: ' + resumen)
        return
    if '--check' in sys.argv:
        print('cambió: ' + resumen)
        sys.exit(1)
    open(INDEX, 'w', encoding='utf-8').write(BLOQUE.sub(lambda m: nuevo, html))
    print('actualizado: ' + resumen)


if __name__ == '__main__':
    main()
