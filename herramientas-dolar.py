#!/usr/bin/env python3
"""Baja del Banco Nación el dólar billete vendedor y lo deja en index.html (DOLAR_BNA_EMBEBIDO).

    python3 herramientas-dolar.py          # actualiza el bloque si la cotización cambió
    python3 herramientas-dolar.py --check  # solo dice si cambió (sale con 1 si cambió)

Por qué existe (2026-10-29, PR #62): los precios en dólares se muestran también en pesos, y los
filtros de precio hablan en las dos monedas, al dólar BNA vendedor. Desde el 2026-10-30 la cotización
del día la trae la página al cargar, de /api/dolar (api/dolar.js lee lo mismo que este script); la
embebida es el respaldo si esa función no responde, y este script la pone al día.

De dónde sale: la tabla «Billetes» de https://www.bna.com.ar/Personas, fila «Dolar U.S.A»,
columna Venta, con la fecha de la cotización que publica el banco (no la del día en que corre el
script). El bloque va entre /*dolar:inicio*/ y /*dolar:fin*/. Si la página no trae la tabla o
la cifra no es razonable, el script falla sin tocar nada: nunca se escribe una cotización
inventada ni la de otra fuente.
"""
import os
import re
import sys
import urllib.request
from datetime import date

RAIZ = os.path.dirname(os.path.abspath(__file__))
INDEX = os.path.join(RAIZ, 'index.html')
FUENTE = 'https://www.bna.com.ar/Personas'
BLOQUE = re.compile(r'/\*dolar:inicio\*/.*?/\*dolar:fin\*/', re.S)


def cotizacion():
    pedido = urllib.request.Request(FUENTE, headers={'User-Agent': 'autolofy-dolar (https://autolofy.vercel.app)'})
    html = urllib.request.urlopen(pedido, timeout=30).read().decode('utf-8', 'replace')
    i = html.find('id="billetes"')
    if i < 0: sys.exit('la página del BNA no trae la tabla de billetes')
    tabla = html[i:html.find('</table>', i)]
    f = re.search(r'class="fechaCot">\s*(\d{1,2})/(\d{1,2})/(\d{4})', tabla)
    v = re.search(r'Dolar U\.S\.A</td>\s*<td>\s*([\d.,]+)\s*</td>\s*<td>\s*([\d.,]+)\s*</td>', tabla)
    if not f or not v: sys.exit('no encontré la fecha o la fila «Dolar U.S.A» en la tabla de billetes')
    venta = float(v.group(2).replace('.', '').replace(',', '.'))
    if not 100 <= venta <= 100000: sys.exit(f'cotización fuera de rango: {venta}')
    return (int(venta) if venta == int(venta) else venta), date(int(f.group(3)), int(f.group(2)), int(f.group(1))).isoformat()


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
