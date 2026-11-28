#!/usr/bin/env python3
"""Carga las versiones de cada modelo (issue #224, diseño en docs/versiones-por-modelo.md).

Uso:
  python herramientas-versiones.py TANDA.tsv [TANDA2.tsv …]   valida y escribe
  python herramientas-versiones.py --check TANDA.tsv          solo valida, no escribe nada

Cada TANDA.tsv tiene una fila por celda, sin encabezado (las líneas con # se saltean):
  modelo  versión  nombre  fila  celda  tipo  fuente  url  sha256  fecha

- modelo: el slug de la columna de la tabla (está en CARS).
- versión: el slug de la versión. La de referencia es la que ya muestra la columna, y su slug es el del modelo.
  Las demás arrancan con la marca del modelo (`toyota-corolla-cross-xei-hev`).
- fila «Precio de lista»: el precio de la versión, con el formato de una celda de DATA. Para la de referencia
  tiene que ser idéntico a la celda de precio de DATA; es la única fila que la de referencia lleva en la tanda.
- las demás filas son las de FILAS_DE_VERSION: una versión que no es la de referencia tiene que traerlas todas.
  `=ref` dice «igual que la versión de referencia» y solo vale si la ficha muestra las dos columnas iguales.
- tipo: `dato` o `motivo de s/d`; sha256: el hash del archivo o «leída en línea, sin hash»; fecha: AAAA-MM-DD.

Escribe tres lugares juntos, recién cuando todo validó:
  index.html            VERSIONES_PRECIO, entre /*versiones:inicio*/ y /*versiones:fin*/ (nombre y precio)
  versiones.json        las filas de versión de cada versión que no es la de referencia
  versiones-fuentes.tsv la fuente de cada celda (mismo formato que datos-fuentes.tsv, con el slug de la versión)
Una versión que ya estaba se reemplaza entera por lo que trae la tanda.
"""
import json
import re
import sys
from pathlib import Path

RAIZ = Path(__file__).resolve().parent
INDEX = RAIZ / 'index.html'
JSON_V = RAIZ / 'versiones.json'
FUENTES = RAIZ / 'versiones-fuentes.tsv'
FILA_PRECIO = 'Precio de lista'
FILA_PRECIO_DATA = 'Precio de lista (versión tope de gama de la tabla)'

# Las filas que pueden cambiar entre versiones de un mismo modelo (decisión de la etapa 0). Las demás son del modelo y
# se heredan; una versión las puede pisar recién cuando se sume esa opción, con su fuente.
FILAS_DE_VERSION = [
    'Medida de neumáticos',
    'Tracción', 'Potencia total del sistema (kW)', 'Motor a combustión — potencia (kW)', 'Motor a combustión — par (N·m)',
    'Motor eléctrico — potencia máx. (kW)', 'Motor eléctrico — par máx. (N·m)', 'Aceleración 0-100 km/h (s)',
    'Velocidad máxima (km/h)', 'Consumo de combustible (L/100km)', 'Autonomía eléctrica (km)', 'Capacidad de batería (kWh)',
    'Techo solar/corredizo panorámico', 'Apertura eléctrica del baúl/portón', 'Barras de techo integradas',
    'Material del volante', 'Panel de instrumentos digital', 'Pantalla central multimedia',
    'Cargador de celular inalámbrico',
    'Frenos', 'Tipo de llave', 'Entrada y arranque sin llave', 'Estacionamiento electrónico (EPB)', 'Auto Hold (AVH)',
    'Modos de conducción seleccionables',
    'Airbags frontales (conductor + pasajero)', 'Airbags laterales delanteros', 'Airbags de cortina',
    'Cámara 360°/panorámica',
    'Control crucero adaptativo (ACC)', 'Frenado automático de emergencia (AEB)', 'Alerta de colisión frontal (FCW)',
    'Detección de punto ciego (BSD)', 'Asistente de mantenimiento de carril (LKA)',
    'Reconocimiento de señales de tránsito (TSR)', 'Alerta de tráfico cruzado (RCTA/FCTA)', 'Head-Up Display (HUD)',
    'Sensores de estacionamiento',
    'Ajuste asiento conductor', 'Ajuste asiento pasajero delantero', 'Ventilación de asientos',
    'CarPlay / Android Auto', 'Navegación GPS', 'Cantidad de parlantes',
    'Faros LED', 'Luces diurnas LED (DRL)', 'Encendido automático de faros',
    'Sensor de lluvia', 'Espejos exteriores plegables eléctricos', 'Espejo retrovisor antideslumbrante',
    'Aire acondicionado automático', 'Climatización de doble zona',
]
# La potencia en CV no se carga: se calcula desde la de kW, como en DATA (issue #210). Queda para la interfaz.

SENTINELAS = {'YES', 'NO', 'OPT', 'ND'}


def leer_index():
    html = INDEX.read_text(encoding='utf-8')
    s = html.index('const DATA = [')
    e = html.index('];', s)
    data = json.loads(html[s + len('const DATA = '):e + 1])
    filas = {r[0]: r[1:] for _, rs in data for r in rs}
    slugs = re.findall(r'<img class="car-photo" data-slug="([^"]+)"', html)
    assert len(slugs) == len(filas[FILA_PRECIO_DATA]), 'slugs y columnas de DATA no coinciden'
    return html, filas, slugs


def error_de_celda(c):
    """Las mismas reglas que DATA: el | solo después de un prefijo, centinelas exactos, castellano con texto."""
    if c == '=ref' or c in SENTINELAS:
        return None
    if not c:
        return 'celda vacía'
    m = re.match(r'^(NR|NOTE|EXT|DET):', c)
    if '|' in c and not m:
        return 'tiene | sin prefijo NR:/NOTE:/EXT:/DET:'
    if m and m.group(1) != 'NR' and '|' not in c:
        return f'{m.group(1)}: sin explicación después del |'
    visible = re.sub(r'^(NR|NOTE|EXT|DET):', '', c).split('|')[0]
    if re.match(r'^(YES|NO|OPT|ND)\b\s*\S', visible):
        return 'centinela con texto: va en castellano (Sí (…), No (…), Opcional (…), s/d (…))'
    if not visible.strip():
        return 'valor visible vacío'
    return None


def es_tilde(c):
    """Cuenta como ✓ lo mismo que simbVal: YES y los Sí con aclaración."""
    visible = re.sub(r'^(DET|NOTE|EXT):', '', c).split('|')[0]
    return c == 'YES' or (not c.startswith('NR:') and re.match(r'^Sí\b', visible) is not None)


def visible_de(c):
    return re.sub(r'^(NR|NOTE|EXT|DET):', '', c).split('|')[0]


def leer_tandas(rutas):
    filas = []
    for ruta in rutas:
        for n, linea in enumerate(Path(ruta).read_text(encoding='utf-8').splitlines(), 1):
            if not linea.strip() or linea.startswith('#'):
                continue
            campos = linea.split('\t')
            if len(campos) != 10:
                raise SystemExit(f'{ruta}:{n}: tiene {len(campos)} campos, van 10')
            filas.append((f'{ruta}:{n}', *[x.strip() for x in campos]))
    return filas


def validar(tanda, filas_data, slugs):
    errores = []
    versiones = {}  # slug de versión → {modelo, nombre, precio, celdas, fuentes}
    for donde, modelo, version, nombre, fila, celda, tipo, fuente, url, sha, fecha in tanda:
        if modelo not in slugs:
            errores.append(f'{donde}: el modelo {modelo} no está en la tabla')
            continue
        marca = modelo.split('-')[0] + '-'
        if version != modelo and (not version.startswith(marca) or not re.fullmatch(r'[a-z0-9]+(-[a-z0-9]+)*', version)):
            errores.append(f'{donde}: el slug {version} tiene que arrancar con «{marca}» y ser marca-modelo-versión')
        if version != modelo and version in slugs:
            errores.append(f'{donde}: el slug {version} ya es otro auto de la tabla')
        if not nombre:
            errores.append(f'{donde}: falta el nombre de la versión')
        if tipo not in ('dato', 'motivo de s/d'):
            errores.append(f'{donde}: tipo «{tipo}», va dato o motivo de s/d')
        if (tipo == 'motivo de s/d') != celda.startswith('NR:'):
            errores.append(f'{donde}: un NR va con tipo «motivo de s/d» y un dato con «dato»')
        if not fuente:
            errores.append(f'{donde}: falta la fuente')
        if not re.fullmatch(r'https://\S+', url):
            errores.append(f'{donde}: la URL tiene que ser https')
        if not re.fullmatch(r'[0-9a-f]{64}|leída en línea, sin hash', sha):
            errores.append(f'{donde}: sha256 o «leída en línea, sin hash»')
        if not re.fullmatch(r'\d{4}-\d{2}-\d{2}', fecha):
            errores.append(f'{donde}: fecha AAAA-MM-DD')
        e = error_de_celda(celda)
        if e:
            errores.append(f'{donde}: {fila}: {e}')
        v = versiones.setdefault(version, {'modelo': modelo, 'nombre': nombre, 'precio': None, 'celdas': {}, 'fuentes': []})
        if v['modelo'] != modelo or v['nombre'] != nombre:
            errores.append(f'{donde}: {version} aparece con otro modelo o con otro nombre')
        if fila == FILA_PRECIO:
            if celda == '=ref':
                errores.append(f'{donde}: el precio no puede ser =ref')
            v['precio'] = celda
        elif version == modelo:
            errores.append(f'{donde}: la versión de referencia solo lleva el precio (sus datos son la columna de DATA)')
            continue
        elif fila not in FILAS_DE_VERSION:
            errores.append(f'{donde}: «{fila}» no es una fila de versión')
            continue
        else:
            if fila in v['celdas']:
                errores.append(f'{donde}: {version} · {fila} repetida')
            v['celdas'][fila] = celda
        v['fuentes'].append([version, fila, celda if celda == '=ref' else visible_de(celda), tipo, fuente, url, sha, fecha])

    for slug, v in versiones.items():
        k = slugs.index(v['modelo']) if v['modelo'] in slugs else None
        if v['precio'] is None:
            errores.append(f'{slug}: falta el precio')
        if slug == v['modelo']:
            if k is not None and v['precio'] != filas_data[FILA_PRECIO_DATA][k]:
                errores.append(f'{slug}: el precio de la referencia tiene que ser idéntico a la celda de DATA')
            continue
        faltan = [f for f in FILAS_DE_VERSION if f not in v['celdas']]
        if faltan:
            errores.append(f'{slug}: faltan {len(faltan)} filas de versión (nunca se heredan): {", ".join(faltan[:5])}…')
    return versiones, errores


def tildes(v, modelo_k, filas_data):
    total = 0
    for f in FILAS_DE_VERSION:
        c = v['celdas'].get(f) if v else None
        if c is None or c == '=ref':
            c = filas_data[f][modelo_k]
        total += es_tilde(c)
    return total


def bloque_index(html, precios):
    texto = '/*versiones:inicio*/const VERSIONES_PRECIO = ' + json.dumps(precios, ensure_ascii=False, separators=(',', ':')) + ';/*versiones:fin*/'
    if '/*versiones:inicio*/' in html:
        return re.sub(r'/\*versiones:inicio\*/.*?/\*versiones:fin\*/', lambda _: texto, html, count=1, flags=re.S)
    ancla = 'const HISTORIAL_PRECIOS = '
    i = html.index(ancla)
    return html[:i] + texto + '\n' + html[i:]


def leer_existente(html):
    m = re.search(r'/\*versiones:inicio\*/const VERSIONES_PRECIO = (.*?);/\*versiones:fin\*/', html, re.S)
    precios = json.loads(m.group(1)) if m else {}
    js = json.loads(JSON_V.read_text(encoding='utf-8')) if JSON_V.exists() else {'versiones': {}}
    fuentes = []
    if FUENTES.exists():
        fuentes = [l.split('\t') for l in FUENTES.read_text(encoding='utf-8').splitlines() if l and not l.startswith('#')]
    return precios, js['versiones'], fuentes


def main():
    args = sys.argv[1:]
    check = '--check' in args
    rutas = [a for a in args if a != '--check']
    if not rutas:
        raise SystemExit(__doc__)
    html, filas_data, slugs = leer_index()
    faltan_filas = [f for f in FILAS_DE_VERSION if f not in filas_data]
    if faltan_filas:
        raise SystemExit(f'FILAS_DE_VERSION nombra filas que no están en DATA: {faltan_filas}')
    versiones, errores = validar(leer_tandas(rutas), filas_data, slugs)
    if errores:
        print('\n'.join(errores))
        raise SystemExit(f'{len(errores)} errores: no se escribió nada.')

    precios, celdas_json, fuentes = leer_existente(html)
    nuevas = set(versiones)
    fuentes = [f for f in fuentes if f[0] not in nuevas]
    modelos_tocados = {v['modelo'] for v in versiones.values()}
    for modelo in modelos_tocados:
        lista = [x for x in precios.get(modelo, []) if x['v'] not in nuevas]
        for slug, v in versiones.items():
            if v['modelo'] == modelo:
                lista.append({'v': slug, 'n': v['nombre'], 'p': v['precio'], **({'ref': True} if slug == modelo else {})})
                if slug != modelo:
                    celdas_json[slug] = {'modelo': modelo, 'nombre': v['nombre'], 'celdas': v['celdas']}
                fuentes.extend(v['fuentes'])
        if sum(1 for x in lista if x.get('ref')) != 1:
            raise SystemExit(f'{modelo}: tiene que tener exactamente una versión de referencia (la de la tabla) en la tanda')
        lista.sort(key=lambda x: (not x.get('ref'), x['n']))
        precios[modelo] = lista

    # La versión de referencia es la más completa: más ✓ en FILAS_DE_VERSION y, si empatan, la más cara.
    # Si otra versión suma más ✓, se avisa: cambiar la columna de la tabla va en un PR propio (decisión 1).
    for modelo in sorted(modelos_tocados):
        k = slugs.index(modelo)
        ref = tildes(None, k, filas_data)
        for x in precios[modelo]:
            if x.get('ref'):
                continue
            t = tildes(celdas_json[x['v']], k, filas_data)
            nr_ref = sum(filas_data[f][k].startswith('NR:') or filas_data[f][k] == 'ND' for f in FILAS_DE_VERSION)
            nr_v = sum(c.startswith('NR:') or c == 'ND' for c in celdas_json[x['v']]['celdas'].values())
            if t > ref:
                print(f'AVISO {modelo}: {x["n"]} suma {t} ✓ y la de la tabla {ref}: la más completa sería {x["n"]}.')
            if nr_ref > nr_v:
                print(f'AVISO {modelo}: la de la tabla tiene {nr_ref} s/d en filas de versión y {x["n"]} {nr_v}: el conteo de ✓ puede engañar.')

    print(f'{len(nuevas)} versiones de {len(modelos_tocados)} modelos validadas.')
    if check:
        return
    nuevo_html = bloque_index(html, dict(sorted(precios.items())))
    JSON_V.write_text(json.dumps({'filas': FILAS_DE_VERSION, 'versiones': dict(sorted(celdas_json.items()))},
                                 ensure_ascii=False, indent=1) + '\n', encoding='utf-8')
    cab = ('# Fuente de cada celda de versiones.json y de cada precio de VERSIONES_PRECIO (issue #224).\n'
           '# Lo escribe herramientas-versiones.py: no editar a mano.\n'
           '# Formato: versión <TAB> fila <TAB> valor visible <TAB> tipo (dato|motivo de s/d) <TAB> fuente <TAB> url <TAB> sha256 <TAB> fecha\n')
    fuentes.sort(key=lambda f: (f[0], f[1]))
    FUENTES.write_text(cab + ''.join('\t'.join(f) + '\n' for f in fuentes), encoding='utf-8', newline='\n')
    INDEX.write_text(nuevo_html, encoding='utf-8', newline='\n')
    print('Escritos index.html, versiones.json y versiones-fuentes.tsv.')


if __name__ == '__main__':
    main()
