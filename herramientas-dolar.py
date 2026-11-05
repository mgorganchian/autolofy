#!/usr/bin/env python3
# /// script
# requires-python = ">=3.10"
# dependencies = ["psycopg[binary]>=3.2"]
# ///
"""Lee de la base macroeconomia el dólar billete vendedor del BNA y lo deja en index.html (DOLAR_BNA_EMBEBIDO).

    uv run herramientas-dolar.py          # actualiza el bloque si la cotización cambió
    uv run herramientas-dolar.py --check  # solo dice si cambió (sale con 1 si cambió)

`uv run` instala psycopg en un entorno aparte la primera vez (lo pide el encabezado de arriba).

Por qué existe (2026-10-29, PR #62): los precios en dólares se muestran también en pesos, y los
filtros de precio hablan en las dos monedas, al dólar BNA vendedor. Desde el 2026-10-30 la cotización
del día la trae la página al cargar, de /api/dolar (api/dolar.js lee lo mismo que este script); la
embebida es el respaldo si esa función no responde, y este script la pone al día.

De dónde sale (2026-11-05, pedido de Mati: que cada repo lea la base compartida en lugar de bajar lo
mismo por su cuenta): la serie ar.dolar.oficial.venta del esquema v1 de la base macroeconomia, el dólar
oficial minorista vendedor que ArgentinaDatos toma de la tabla «Billetes» del BNA. Se toma el último
valor con fecha en o antes de hoy (v1.valor_al), con su fecha. La cadena de conexión sale de la
variable MACRO_DATABASE_URL o, si no está, del Keychain (servicio neon-macroeconomia, cuenta
lector_autolofy, un rol de solo lectura); nunca se escribe en un archivo ni se muestra. El bloque va
entre /*dolar:inicio*/ y /*dolar:fin*/. Si la base no responde o la cifra no es razonable, el script
falla sin tocar nada: nunca se escribe una cotización inventada ni la de otra fuente.
"""
import os
import re
import subprocess
import sys

RAIZ = os.path.dirname(os.path.abspath(__file__))
INDEX = os.path.join(RAIZ, 'index.html')
FUENTE = 'https://www.bna.com.ar/Personas'
SERIE = 'ar.dolar.oficial.venta'
BLOQUE = re.compile(r'/\*dolar:inicio\*/.*?/\*dolar:fin\*/', re.S)
CONSULTA = ("SELECT fecha, valor FROM v1.valor_al(%s, "
            "(now() AT TIME ZONE 'America/Argentina/Buenos_Aires')::date)")


def cadena():
    if os.environ.get('MACRO_DATABASE_URL'):
        return os.environ['MACRO_DATABASE_URL']
    r = subprocess.run(['security', 'find-generic-password', '-s', 'neon-macroeconomia', '-a', 'lector_autolofy', '-w'],
                       capture_output=True, text=True)
    if r.returncode != 0:
        sys.exit('falta MACRO_DATABASE_URL y no está en el Keychain (neon-macroeconomia / lector_autolofy)')
    return r.stdout.strip()


def cotizacion():
    try:
        import psycopg
    except ImportError:
        sys.exit('falta psycopg: corré el script con «uv run herramientas-dolar.py»')
    try:
        with psycopg.connect(cadena(), connect_timeout=15, application_name='autolofy-herramientas-dolar') as c:
            fila = c.execute(CONSULTA, (SERIE,)).fetchone()
    except psycopg.Error as er:
        # El mensaje del error puede nombrar el host o el rol: solo se muestra el tipo y el código.
        sys.exit(f'no se pudo leer la base macroeconomia: {type(er).__name__} {getattr(er, "sqlstate", "") or ""}'.strip())
    if not fila or fila[1] is None: sys.exit(f'la serie {SERIE} no tiene valores')
    fecha, valor = fila
    if not 100 <= valor <= 100000: sys.exit(f'cotización fuera de rango: {valor}')
    return (int(valor) if valor == int(valor) else float(valor)), fecha.isoformat()


def main():
    venta, fecha = cotizacion()
    html = open(INDEX, encoding='utf-8').read()
    if len(BLOQUE.findall(html)) != 1: sys.exit('index.html tiene que tener un solo bloque /*dolar:inicio*/…/*dolar:fin*/')
    nuevo = "/*dolar:inicio*/const DOLAR_BNA_EMBEBIDO = { venta: %s, fecha: '%s', fuente: '%s' };/*dolar:fin*/" % (venta, fecha, FUENTE)
    if BLOQUE.search(html).group(0) == nuevo:
        print(f'sin cambios: $ {venta} al {fecha}')
        return
    if '--check' in sys.argv:
        print(f'cambió: $ {venta} al {fecha}')
        sys.exit(1)
    open(INDEX, 'w', encoding='utf-8').write(BLOQUE.sub(lambda m: nuevo, html))
    print(f'actualizado: $ {venta} al {fecha}')


if __name__ == '__main__':
    main()
