#!/usr/bin/env python3
"""Lista de precios mensual de Stellantis (Fiat, Jeep, RAM, Peugeot, Citroën, DS) y Leapmotor, sin navegar a mano (2026-11-04).

Stellantis publica cada mes una nota de prensa en media.stellantis.com con las listas en PDF adjuntas. Esta herramienta:
  1. busca las notas de prensa de los últimos 45 días y los PDF «listadeprecios_*» adjuntos (con curl: la página y los PDF bajan sin problema;
     lo que se bloquea es WebFetch);
  2. baja los de la lista más reciente a insumos/stellantis-AAAA-MM/ (carpeta fuera de git);
  3. lee el texto (herramientas-pdftxt.swift, PDFKit) y compara cada auto mapeado contra la celda de precio de index.html;
  4. con --aplicar actualiza las celdas que cambiaron, el historial de dólares (si la lista es en USD) y el historial de precios.
  python3 herramientas-stellantis.py              # muestra qué cambió (no escribe)
  python3 herramientas-stellantis.py --aplicar    # escribe index.html y corre herramientas-precios.py
DS no se lee por texto (el PDF no liga cada precio con su modelo): la herramienta avisa con los números y el DS 7 se carga a mano mirando la imagen.
"""
import re, sys, os, json, subprocess, datetime, urllib.parse

AQUI = os.path.dirname(os.path.abspath(__file__))
BASE = 'https://www.media.stellantis.com'
MESES = {'ene': 1, 'feb': 2, 'mar': 3, 'abr': 4, 'may': 5, 'jun': 6, 'jul': 7, 'ago': 8, 'sep': 9, 'oct': 10, 'nov': 11, 'dic': 12}
# slug -> (archivo de la marca en el nombre del PDF, patrón de la línea en la lista)
MAPA = {
    'fiat-cronos-precision': ('fiat', r'CRONOS PRECISION 1\.3 CVT'), 'fiat-argo-drive-cvt': ('fiat', r'ARGO DRIVE 1\.3L CVT'),
    'fiat-mobi-trekking': ('fiat', r'MOBI TREKKING 1\.0 MT'), 'fiat-pulse-impetus': ('fiat', r'PULSE IMPETUS 1\.0T CVT'),
    'fiat-fastback-turbo-270': ('fiat', r'FASTBACK TURBO 270 AT$'), 'fiat-600-hybrid': ('fiat', r'600 HYBRID 1\.2 eDCT'),
    'fiat-strada-ultra': ('fiat', r'STRADA ULTRA T200 CD CVT'), 'fiat-toro-volcano-td': ('fiat', r'TORO VOLCANO 2\.2TD AT9 4X4'),
    'fiat-titano-ranch': ('fiat', r'TITANO RANCH AT 4X4'),
    'jeep-compass-blackhawk': ('jeepyram', r'COMPASS BLACKHAWK'), 'jeep-renegade-willys': ('jeepyram', r'RENEGADE WILLYS'),
    'jeep-commander-blackhawk': ('jeepyram', r'COMMANDER BLACKHAWK'), 'ram-dakota-laramie-night-edition': ('jeepyram', r'DAKOTA LARAMIE NIGHT EDITION'),
    'ram-rampage-rt': ('jeepyram', r'RAMPAGE R/T'), 'ram-1500-laramie-night-edition': ('jeepyram', r'1500 LARAMIE NIGHT EDITION'),
    'peugeot-208-gt': ('peugeot', r'208 GT T200'), 'peugeot-2008': ('peugeot', r'2008 GT T200'), 'peugeot-408-gt': ('peugeot', r'408 GT'),
    'peugeot-3008-gt': ('peugeot', r'3008 GT'), 'peugeot-5008-gt': ('peugeot', r'5008 GT'),
    'citroen-c3-you': ('citroen', r'C3 T200 FEEL PK YOU'), 'citroen-basalt-dark-edition': ('citroen', r'BASALT T200 DARK EDITION'),
    'citroen-aircross-shine-7': ('citroen', r'AIRCROSS T200 SHINE 7'), 'citroen-c4-hybrid-max': ('citroen', r'C4 HYBRID MAX'),
    'citroen-c5-aircross-max': ('citroen', r'C5 AIRCROSS MAX'),
    'leapmotor-b10': ('leapmotor', r'B10 REEV DESIGN'), 'leapmotor-c10': ('leapmotor', r'C10 REEV DESIGN'),
}
LINEA = re.compile(r'^(.+?)\s+(ARS|USD)\s+([\d.]+)\s*$', re.M)


def curl(url, out=None):
    cmd = ['curl', '-s', '-L', '--max-time', '60'] + (['-o', out] if out else []) + [url]
    r = subprocess.run(cmd, capture_output=True)
    if r.returncode: raise RuntimeError('curl falló: ' + url)
    return None if out else r.stdout.decode('utf-8', 'replace')


def descubrir():
    hoy = datetime.date.today(); desde = hoy - datetime.timedelta(days=45)
    q = lambda d: urllib.parse.quote(d.strftime('%d/%m/%Y'), safe='')
    notas = set()
    for pag in (1, 2, 3):
        h = curl(f'{BASE}/ar-es/corporate/press/page/{pag}?dateFrom={q(desde)}&dateTo={q(hoy)}&brand=corporate')
        notas |= set(re.findall(r'href="(/ar-es/corporate/press/[a-z0-9-]{12,})"', h))
    pdfs = {}
    for n in sorted(notas):
        h = curl(BASE + n)
        for u in re.findall(r'(?:https://www\.media\.stellantis\.com)?(/uploads/ar/attachment/\d+/listadeprecios_[a-z0-9_-]+\.pdf)', h):
            m = re.search(r'listadeprecios_([a-z]+?)(ene|feb|mar|abr|may|jun|jul|ago|sep|oct|nov|dic)(\d{4})', u)
            if m: pdfs[(m.group(1), int(m.group(3)), MESES[m.group(2)])] = BASE + u
    return pdfs


def texto_pdf(rutas):
    exe = '/tmp/herramientas-pdftxt'
    if not os.path.exists(exe):
        subprocess.run(['swiftc', '-O', os.path.join(AQUI, 'herramientas-pdftxt.swift'), '-o', exe], check=True)
    return subprocess.run([exe] + rutas, capture_output=True, text=True).stdout


def main():
    aplicar = '--aplicar' in sys.argv
    pdfs = descubrir()
    if not pdfs: sys.exit('No encontré listas de precios de Stellantis en la prensa de los últimos 45 días.')
    anio, mes = max((a, m) for _, a, m in pdfs)
    elegidos = {b: u for (b, a, m), u in pdfs.items() if (a, m) == (anio, mes)}
    carpeta = os.path.join(AQUI, 'insumos', f'stellantis-{anio}-{mes:02d}'); os.makedirs(carpeta, exist_ok=True)
    print(f'Lista de {mes:02d}/{anio}: {", ".join(sorted(elegidos))}')
    lineas, urls = {}, {}
    for b, u in elegidos.items():
        ruta = os.path.join(carpeta, os.path.basename(u))
        if not os.path.exists(ruta): curl(u, ruta)
        txt = texto_pdf([ruta]); urls[b] = u
        lineas[b] = [(m.group(1).strip(), m.group(2), int(m.group(3).replace('.', ''))) for m in LINEA.finditer(txt)]
        if b == 'ds': print('DS: leer la imagen del PDF (no se asigna por texto):', re.findall(r'USD\s+([\d.]+)', txt))
    s = open(os.path.join(AQUI, 'index.html'), encoding='utf-8').read()
    i = s.index('const DATA = ['); j = s.index('];', i); data = json.loads(s[i + 13:j + 1])
    slugs = re.findall(r'<img class="car-photo"[^>]*data-slug="([^"]+)"', s)
    sys.path.insert(0, AQUI)
    from importlib import import_module
    P = import_module('herramientas-precios'.replace('-', '_')) if False else None
    cambios = []
    fecha = f'{anio}-{mes:02d}-01'
    for slug, (b, pat) in MAPA.items():
        if b not in lineas: continue
        hit = [l for l in lineas[b] if re.search(pat, l[0], re.I)]
        if len(hit) != 1:
            print('aviso: línea no única/ausente para', slug, hit); continue
        nom, mon, monto = hit[0]
        nom = re.sub(r'^\S*\d\S*\s+', '', nom)   # saca el código de la lista (p. ej. «611.4TU»)
        k = slugs.index(slug); celda = data[0][1][0][k + 1]
        vis = re.sub(r'^(DET|NOTE|EXT|NR):', '', celda).split('|')[0]
        m = re.search(r'USD\s*([\d.]+)', vis) or re.search(r'\$\s*([\d.]+)', vis)
        actual = int(m.group(1).replace('.', '')) if m else None
        if actual == monto: continue
        fmt = f'USD {monto:,}'.replace(',', '.') if mon == 'USD' else '$' + f'{monto:,}'.replace(',', '.')
        nuevo = f'DET:{fmt}|{nom.title() if nom.isupper() else nom}, versión de la tabla; «Lista de precios sugerida al público» de Stellantis Argentina de {mes:02d}/{anio} (vigencia a partir del 01/{mes:02d}/{anio}): {urls[b]}'
        cambios.append((slug, actual, monto, mon, k, nuevo))
        print(f'cambió {slug}: {actual} -> {monto} {mon}')
    if not cambios: print('Sin cambios contra la tabla.')
    if aplicar and cambios:
        for slug, ant, monto, mon, k, nuevo in cambios: data[0][1][0][k + 1] = nuevo
        s = s[:i] + 'const DATA = ' + json.dumps(data, ensure_ascii=False, separators=(',', ':')) + s[j + 1:]
        # historial en dólares (misma versión): se suma al final de la lista del auto
        hj = s.index('const HISTORIAL_PRECIOS = '); he = s.index(';\n', hj)
        hist = json.loads(s[hj + len('const HISTORIAL_PRECIOS = '):he])
        for slug, ant, monto, mon, k, nuevo in cambios:
            if mon == 'USD' and hist.get(slug):
                hist[slug].append([fecha, monto, hist[slug][-1][2], urls[MAPA[slug][0]]])
        s = s[:hj] + 'const HISTORIAL_PRECIOS = ' + json.dumps(hist, ensure_ascii=False, separators=(',', ':')) + s[he:]
        open(os.path.join(AQUI, 'index.html'), 'w', encoding='utf-8').write(s)
        subprocess.run(['python3', os.path.join(AQUI, 'herramientas-precios.py'), '--desde', fecha], check=True)
        print(f'{len(cambios)} celdas actualizadas. Falta: python3 herramientas-paginas.py y la suite.')


if __name__ == '__main__':
    main()
