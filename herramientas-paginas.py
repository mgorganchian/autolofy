#!/usr/bin/env python3
"""Genera una página estática por auto (autos/<slug>.html) con su RSS (autos/<slug>.xml), las
comparaciones "X vs Y" (comparar/<a>-vs-<b>.html), las novedades, sitemap.xml y robots.txt.

    python3 herramientas-paginas.py           # escribe las páginas
    python3 herramientas-paginas.py --check   # sale con error si alguna está desactualizada

Por qué existe (2026-10-06): la página de cada auto del comparador se arma en el navegador
(?auto=slug), así que Google no la indexa y al compartirla se ve siempre la misma vista
previa. Estas páginas salen de los mismos datos de index.html (CARS, DATA, COLORES_AR,
CREDITOS de las portadas) y no agregan ninguno: si index.html cambia, se regeneran.
Nunca editarlas a mano. tests/e2e/paginas.spec.js falla si quedaron desactualizadas.
"""
import html as H
import json
from urllib.parse import quote
from datetime import date, datetime, timezone
import os
import re
import sys

RAIZ = os.path.dirname(os.path.abspath(__file__))
SITIO = 'https://autoschinos-ar.vercel.app'
# El formulario de sugerencias (el mismo que FORM_SUGERENCIAS del script; entry.1360569446 = Auto).
FORM_SUGERENCIAS = 'https://docs.google.com/forms/d/e/1FAIpQLSdytJoPO5w4I-AjJiVyj_wwnPmWQFWs9k3sfjOMgyMXEkgKyQ/viewform'
DIR = os.path.join(RAIZ, 'autos')
DIR_VS = os.path.join(RAIZ, 'comparar')

TIPO = {'ev': '100% eléctrico', 'phev': 'híbrido enchufable', 'hev': 'híbrido', 'mhev': 'mild-hybrid',
        'ice': 'naftero o diésel', 'tbd': 'propulsión a confirmar'}
ESTADO = {'venta': 'A la venta', 'preventa': 'En preventa', 'nolanzado': 'No lanzado todavía',
          'discontinuado': 'Discontinuado'}
SENTINELA = {'YES': 'Sí', 'NO': 'No', 'OPT': 'Opcional', 'ND': 'Sin dato'}


def leer():
    s = open(os.path.join(RAIZ, 'index.html'), encoding='utf-8').read()
    a = s.index('const DATA = ['); data = json.loads(s[a + 13:s.find('];', a) + 1])
    cs = s.index('const CARS = ['); bloque = s[cs:s.index('];', cs)]
    cars = [dict(re.findall(r'(\w+):"([^"]*)"', o)) for o in re.findall(r'\{name:"[^}]*\}', bloque)]
    tags = re.findall(r'<img class="car-photo" data-slug="[^"]+"[^>]*>', s)
    slugs = [re.search(r'data-slug="([^"]+)"', t).group(1) for t in tags]
    creditos = [H.unescape((re.search(r'data-credito="([^"]*)"', t) or [None, ''])[1]) for t in tags]
    colores = json.loads(re.search(r'const COLORES_AR = (\{.*?\});\n', s).group(1))
    videos = json.loads(re.search(r'const VIDEOS = (\{.*?\});\n', s).group(1))
    extra = {k: json.loads(re.search(r'const ' + k + r' = (\{.*?\});\n', s).group(1))
             for k in ('SERVICE_MARCAS', 'SERVICE_OFICIAL', 'LLAMADOS', 'LLAMADOS_FUENTE')}
    assert len(cars) == len(slugs) == len(data[0][1][0]) - 1
    return data, cars, slugs, creditos, colores, videos, extra


def celda(v):
    """(texto visible, aclaración o None) de una celda con la convención NR/NOTE/EXT/DET."""
    if v in SENTINELA: return SENTINELA[v], None
    m = re.match(r'^(NR|NOTE|EXT|DET):(.*?)(?:\|(.*))?$', v, re.S)
    if not m: return v, None
    pre, val, nota = m.groups()
    if pre == 'NR': return 'Sin dato', nota
    if pre == 'EXT': return val, ('No sale de la ficha oficial argentina. ' + (nota or '')).strip()
    return val, nota


def precio_usd(v):
    if not v.startswith('USD '): return None
    m = re.match(r'USD ([\d.]+)', v)
    return m.group(1).replace('.', '') if m else None


def fecha_corta(f):
    a, m, d = f.split('-'); return f'{int(d)}/{int(m)}/{a}'


def service_llamados_html(slug, extra):
    """Service oficial programado y llamados a revisión, lo mismo que la página del comparador."""
    e, out = H.escape, ''
    sv = extra['SERVICE_OFICIAL'].get(slug)
    if sv:
        m = extra['SERVICE_MARCAS'][sv['m']]
        pre = 'USD ' if m['mon'] == 'USD' else '$ '
        monto = lambda p: pre + f'{p:,}'.replace(',', '.') if isinstance(p, (int, float)) else e(str(p))
        total = sum(x[2] for x in sv['r'] if isinstance(x[2], (int, float)))
        filas = ''.join(f'<tr><th scope="row">{x[0]:,} km'.replace(',', '.') + (f' o {x[1]} meses' if x[1] else '') + f'</th><td>{monto(x[2])}</td></tr>' for x in sv['r'])
        nota = ' '.join(t for t in [f"Lo publica {m.get('pub') or sv['m']} en su sitio" + (f", {m['iva']}" if m.get('iva') else '') + '.', m.get('alc'), m.get('v'), sv.get('n'),
                                    f"Consultado el {fecha_corta(m['c'])}."] if t)
        out += (f'<section><h2>Service oficial programado</h2><table>{filas}<tr><th scope="row">Los {len(sv["r"])} suman</th><td>{monto(total)}</td></tr></table>'
                f'<p class="nota">{e(nota)} <a href="{e(m["f"][0])}" rel="nofollow">Fuente</a>.</p></section>')
    ll, f = extra['LLAMADOS'].get(slug, []), extra['LLAMADOS_FUENTE']
    fuente = f'<a href="{e(f["u"])}" rel="nofollow">registro oficial de alertas de productos</a>, consultado el {fecha_corta(f["c"])}'
    out += ('<section><h2>Llamados a revisión</h2>' + (
        '<ul class="vs">' + ''.join(f'<li><b>{fecha_corta(x["f"])}, {e(x["mod"])}:</b> {e(x["d"])}</li>' for x in ll) + f'</ul><p class="nota">Del {fuente}.</p>'
        if ll else f'<p class="nota">No figura ninguno en el {fuente}.</p>') + '</section>')
    return out


def pagina(i, data, car, slug, credito, colores, videos, vs=(), extra=None):
    nombre = car['name']
    filas = {f[0]: f[i + 1] for cat in data for f in cat[1]}
    precio, _ = celda(filas['Precio de lista (versión tope de gama de la tabla)'])
    largo, _ = celda(filas['Longitud (mm)'])
    tipo = TIPO.get(car['type'], '')
    desc_partes = [f'{nombre}: {tipo}', car.get('body', ''), ESTADO.get(car['status'], '')]
    if precio != 'Sin dato': desc_partes.append(f'precio {precio}')
    desc = ', '.join(p for p in desc_partes if p) + '. Ficha técnica oficial, equipamiento, colores y comparación con otros autos chinos en Argentina.'
    titulo = f'{nombre}: precio, ficha técnica y equipamiento en Argentina'
    url = f'{SITIO}/autos/{slug}'
    foto = f'{SITIO}/fotos/{slug}-1.jpg'
    e = H.escape
    # Ficha completa, por categoría
    secciones = []
    for cat, fs in data:
        trs = []
        for f in fs:
            txt, nota = celda(f[i + 1])
            trs.append(f'<tr><th scope="row">{e(f[0])}</th><td>{e(txt)}' + (f'<small>{e(nota)}</small>' if nota else '') + '</td></tr>')
        secciones.append(f'<section><h2>{e(cat)}</h2><table>{"".join(trs)}</table></section>')
    col = colores.get(slug) or {}
    colores_html = ''
    if col.get('c'):
        colores_html = ('<section><h2>Colores en Argentina</h2><ul class="colores">' + ''.join(f'<li>{e(c)}</li>' for c in col['c']) +
                        f'</ul><p class="nota">{e(col.get("n", ""))} Fuente: <a href="{e(col["f"])}" rel="nofollow">{e(col.get("d", "oficial"))}</a>.</p></section>')
    videos_html = ''
    if videos.get(slug):
        fecha = lambda f: '/'.join(str(int(x)) for x in list(reversed(f.split('-')))[:2]) + '/' + f[:4]
        tipo_txt = {'prueba': 'Prueba', 'adelanto': 'Adelanto, sin prueba a fondo', 'presentación': 'Presentación, sin manejo',
                    'informe': 'Informe con varios autos', 'otra versión': 'Contacto con otra versión'}
        orden = sorted(videos[slug], key=lambda v: (v.get('tipo', 'prueba') != 'prueba', [-ord(c) for c in v['f']]))
        videos_html = ('<section><h2>Reseñas en video</h2><ul class="videos">' +
                       ''.join(f'<li><a href="https://www.youtube.com/watch?v={e(v["id"])}" rel="nofollow">{e(v["t"])}</a> '
                               f'<small>{e(tipo_txt[v.get("tipo", "prueba")])}. {e(v["canal"])}, {fecha(v["f"])}, {v["s"] // 60}:{v["s"] % 60:02d} min'
                               f'{". " + e(v["n"]) if v.get("n") else ""}</small></li>' for v in orden) +
                       '</ul><p class="nota">Videos de periodistas: las pruebas son del mismo modelo y versión; lo demás va marcado. Son opiniones de terceros, no datos de la ficha.</p></section>')
    ld = {'@context': 'https://schema.org', '@type': 'Car', 'name': nombre, 'url': url, 'image': foto,
          'brand': {'@type': 'Brand', 'name': car['brand']}, 'bodyType': car.get('body', ''),
          'vehicleConfiguration': tipo}
    usd = precio_usd(filas['Precio de lista (versión tope de gama de la tabla)'])
    if usd and car['status'] == 'venta':
        ld['offers'] = {'@type': 'Offer', 'price': usd, 'priceCurrency': 'USD', 'availability': 'https://schema.org/InStock'}
    return f'''<!doctype html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>{e(titulo)}</title>
<meta name="description" content="{e(desc)}">
<link rel="canonical" href="{url}">
<meta property="og:type" content="article"><meta property="og:title" content="{e(titulo)}">
<meta property="og:description" content="{e(desc)}"><meta property="og:url" content="{url}">
<meta property="og:image" content="{foto}"><meta property="og:image:width" content="900"><meta property="og:image:height" content="570">
<meta name="twitter:card" content="summary_large_image">
<link rel="alternate" type="application/rss+xml" title="{e(nombre)}: cambios de precio y promociones" href="/autos/{slug}.xml">
<script type="application/ld+json">{json.dumps(ld, ensure_ascii=False)}</script>
<style>
:root{{--paper:#EEF1EE;--ink:#17211D;--ink2:#4B5A53;--line:#C9D4CE;--accent:#00843D}}
@media (prefers-color-scheme:dark){{:root{{--paper:#141B18;--ink:#E4EAE6;--ink2:#9DB3A8;--line:#2E3A35;--accent:#3FB57A}}}}
html{{-webkit-text-size-adjust:100%;text-size-adjust:100%}} @media screen and (max-width:640px){{html{{font-size:115%}}}}
body{{margin:0;background:var(--paper);color:var(--ink);font:1rem/1.5 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}}
main{{max-width:880px;margin:0 auto;padding:16px}}
a{{color:var(--accent)}} h1{{font-size:2rem;line-height:1.1;margin:8px 0 4px;text-wrap:balance}}
.sub{{color:var(--ink2);margin:0 0 12px}} figure{{margin:0}} figure img{{width:100%;height:auto;background:#fff;border-radius:2px}}
figcaption{{font-size:.75rem;color:var(--ink2)}} .cta{{display:inline-block;margin:12px 0;padding:8px 14px;border-radius:4px;background:var(--accent);color:#fff;text-decoration:none;font-weight:600}}
h2{{font-size:1.15rem;margin:24px 0 6px;border-bottom:2px solid var(--ink)}} table{{width:100%;table-layout:fixed;border-collapse:collapse;font-variant-numeric:tabular-nums}}
th,td{{text-align:left;vertical-align:top;padding:5px 6px;border-bottom:1px solid var(--line);overflow-wrap:anywhere}} th{{font-weight:500;width:42%;color:var(--ink2)}}
td small{{display:block;font-size:.75rem;color:var(--ink2)}} .colores{{list-style:none;padding:0;display:flex;flex-wrap:wrap;gap:6px}}
.colores li{{border:1px solid var(--line);border-radius:3px;padding:2px 8px}}
.vs{{padding-left:18px}} .vs li{{margin:3px 0}} .videos{{padding-left:18px}} .videos li{{margin:4px 0}} .videos small{{display:block;color:var(--ink2)}} .nota,footer{{font-size:.8rem;color:var(--ink2)}}
</style></head>
<body><main>
<p class="sub"><a href="/">Autos chinos en Argentina</a> / {e(car['brand'])}</p>
<h1>{e(nombre)}</h1>
<p class="sub">{e(tipo.capitalize())}, {e(car.get('body', ''))}. {e(ESTADO.get(car['status'], ''))}. Precio de lista: {e(precio)}.</p>
<figure><img src="/fotos/{slug}-1.jpg" alt="{e(nombre)}" width="900" height="570">{f'<figcaption>{e(credito)}</figcaption>' if credito else ''}</figure>
<a class="cta" href="/?auto={slug}">Compararlo con otros autos</a>
<p class="nota">Para enterarte cuando cambie su precio o salga una promoción, sumá <a href="/autos/{slug}.xml">su RSS</a> a tu lector de noticias.</p>
{vs_html(vs)}
{service_llamados_html(slug, extra) if extra else ''}
{colores_html}
{videos_html}
{''.join(secciones)}
<footer><p>Datos de la ficha técnica oficial argentina; lo que sale de otra fuente está aclarado. "Sin dato" quiere decir que la fuente no lo informa, no que el auto no lo tenga.</p>
<p>¿Un dato mal o una idea? <a href="{FORM_SUGERENCIAS}?usp=pp_url&amp;entry.1360569446={quote(nombre)}" rel="nofollow">Sugerencias</a>.</p>
<p><a href="/">Volver al comparativo</a>. <a href="/quien-hace-esto">Quién hace esto</a>.</p></footer>
</main></body></html>
'''


MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']
fecha_larga = lambda f: f'{int(f[8:])} de {MESES[int(f[5:7]) - 1]} de {f[:4]}'
usd = lambda n: 'USD ' + f'{n:,}'.replace(',', '.')


def novedades(cars, slugs):
    """Novedades (2026-10-08): salen de datos que ya existen, nunca escritas a mano salvo
    novedades.json (hitos del sitio). Cambios de precio de HISTORIAL_PRECIOS (misma versión),
    promos vigentes de cada marca (concesionarios.json) y novedades.json."""
    s = open(os.path.join(RAIZ, 'index.html'), encoding='utf-8').read()
    hist = json.loads(re.search(r'const HISTORIAL_PRECIOS = (\{.*?\});\n', s).group(1))
    nombre = dict(zip(slugs, (c['name'] for c in cars)))
    items = []
    for sl, h in hist.items():
        for a, b in zip(h, h[1:]):
            if a[2] != b[2] or a[1] == b[1]: continue
            d = b[1] - a[1]
            items.append({'fecha': b[0], 'titulo': f"{'Bajó' if d < 0 else 'Subió'} el {nombre.get(sl, sl)}: {usd(a[1])} → {usd(b[1])}",
                          'texto': f"Precio de lista oficial de la versión {b[2]}, {'menos' if d < 0 else 'más'} {usd(abs(d))} que en la lista anterior.",
                          'link': f'/autos/{sl}'})
    hoy = date.today().isoformat()
    red = json.load(open(os.path.join(RAIZ, 'concesionarios.json'), encoding='utf-8'))
    por_slug = {sl: i for i, sl in enumerate(slugs)}
    for marca, m in sorted(red['marcas'].items()):
        ps = [p for p in m.get('promos', []) if p['tipo'] != 'precio' and (not p.get('vigencia') or p['vigencia'] >= hoy)]
        if not ps: continue
        autos = sorted({nombre[a] for p in ps for a in p['autos'] if a in por_slug}) or ['toda la gama']
        items.append({'fecha': m.get('promos_consultado', hoy), 'titulo': f'Promociones de {marca}: {len(ps)} vigente' + ('s' if len(ps) > 1 else ''),
                      'texto': 'Para ' + ', '.join(autos[:6]) + (' y más' if len(autos) > 6 else '') + '. ' + ' '.join(p['texto'] for p in ps[:2])[:300],
                      'link': next((f'/autos/{a}' for p in ps for a in p['autos'] if a in por_slug), '/')})
    items += json.load(open(os.path.join(RAIZ, 'novedades.json'), encoding='utf-8'))
    items.sort(key=lambda x: x['fecha'], reverse=True)
    e = H.escape
    pagina_html = f'''<!doctype html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Novedades: precios, promociones y autos chinos nuevos en Argentina</title>
<meta name="description" content="Bajas y subas de precio de lista, promociones vigentes de cada marca y autos nuevos en el comparativo de autos chinos en Argentina.">
<link rel="canonical" href="{SITIO}/novedades">
<link rel="alternate" type="application/rss+xml" title="Novedades" href="/novedades.xml">
<style>
:root{{--paper:#EEF1EE;--ink:#17211D;--ink2:#4B5A53;--line:#C9D4CE;--accent:#00843D}}
@media (prefers-color-scheme:dark){{:root{{--paper:#141B18;--ink:#E4EAE6;--ink2:#9DB3A8;--line:#2E3A35;--accent:#3FB57A}}}}
html{{-webkit-text-size-adjust:100%;text-size-adjust:100%}} @media screen and (max-width:640px){{html{{font-size:115%}}}}
body{{margin:0;background:var(--paper);color:var(--ink);font:1rem/1.5 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}}
main{{max-width:760px;margin:0 auto;padding:16px}} a{{color:var(--accent)}} h1{{font-size:2rem;line-height:1.1;margin:8px 0;text-wrap:balance}}
.sub{{color:var(--ink2);margin:0 0 16px}} ol{{list-style:none;margin:0;padding:0}}
li{{border-bottom:1px solid var(--line);padding:10px 0}} time{{font-size:.8rem;color:var(--ink2)}}
h2{{font-size:1.05rem;margin:2px 0}} p{{margin:2px 0}}
</style></head><body><main>
<p class="sub"><a href="/">Autos chinos en Argentina</a> / Novedades</p>
<h1>Novedades</h1>
<p class="sub">Cambios de precio de lista, promociones vigentes y lo nuevo del comparativo. También por <a href="/novedades.xml">RSS</a>.</p>
<ol>{''.join(f'<li><time datetime="{x["fecha"]}">{fecha_larga(x["fecha"])}</time><h2><a href="{e(x["link"])}">{e(x["titulo"])}</a></h2><p>{e(x["texto"])}</p></li>' for x in items)}</ol>
</main></body></html>
'''
    rfc = lambda f: datetime(int(f[:4]), int(f[5:7]), int(f[8:]), 12, tzinfo=timezone.utc).strftime('%a, %d %b %Y %H:%M:%S +0000')
    rss = ('<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0"><channel>\n'
           f'<title>Autos chinos en Argentina: novedades</title><link>{SITIO}/novedades</link>'
           '<description>Cambios de precio de lista, promociones vigentes y autos nuevos.</description><language>es-ar</language>\n' +
           ''.join(f'<item><title>{e(x["titulo"])}</title><link>{SITIO}{e(x["link"])}</link>'
                   f'<guid isPermaLink="false">{e(x["fecha"] + " " + x["titulo"])}</guid><pubDate>{rfc(x["fecha"])}</pubDate>'
                   f'<description>{e(x["texto"])}</description></item>\n' for x in items[:60]) +
           '</channel></rss>\n')
    return pagina_html, rss


def vs_html(vs):
    if not vs: return ''
    return ('<section><h2>Comparaciones</h2><ul class="vs">' +
            ''.join(f'<li><a href="/comparar/{u}">{H.escape(t)}</a></li>' for u, t in vs) + '</ul></section>')


def promos_de(slug, marca, red, hoy):
    """Promos vigentes que nombran a este auto (o a toda la gama): las de la marca y las de cada local."""
    vale = lambda p: (slug in p['autos'] or '*' in p['autos']) and (not p.get('vigencia') or p['vigencia'] >= hoy)
    m = red['marcas'].get(marca, {})
    out = [(f'Promoción de {marca}', p, p.get('consultado') or m.get('promos_consultado')) for p in m.get('promos', []) if vale(p)]
    out += [(f'Oferta de {c["nombre"]}', p, p.get('consultado')) for c in red.get('concesionarios', [])
            if marca in c.get('marcas', []) for p in c.get('promos', []) if vale(p)]
    return [(t, p, f) for t, p, f in out if f]


def rss_auto(car, slug, hist, red, hoy):
    """RSS de un auto (2026-10-11, "Seguir un auto"): sus cambios de precio de lista (misma versión) y
    las promociones vigentes que lo nombran. Sin cuentas ni mails: el que quiere enterarse sin entrar
    al sitio lo suma a su lector. Sale solo de datos que ya están; un auto sin novedades da un RSS vacío."""
    nombre, e, items = car['name'], H.escape, []
    h = hist.get(slug, [])
    for a, b in zip(h, h[1:]):
        if a[2] != b[2] or a[1] == b[1]: continue
        d = b[1] - a[1]
        items.append({'fecha': b[0], 'titulo': f"{'Bajó' if d < 0 else 'Subió'} el {nombre}: {usd(a[1])} → {usd(b[1])}",
                      'texto': f"Precio de lista oficial de la versión {b[2]}."})
    for t, p, f in promos_de(slug, car['brand'], red, hoy):
        items.append({'fecha': f, 'titulo': f'{t} para el {nombre}', 'texto': p['texto'][:400]})
    items.sort(key=lambda x: (x['fecha'], x['titulo']), reverse=True)
    rfc = lambda f: datetime(int(f[:4]), int(f[5:7]), int(f[8:]), 12, tzinfo=timezone.utc).strftime('%a, %d %b %Y %H:%M:%S +0000')
    return ('<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0"><channel>\n'
            f'<title>{e(nombre)}: precio y promociones</title><link>{SITIO}/autos/{slug}</link>'
            f'<description>Cambios del precio de lista del {e(nombre)} y promociones vigentes de la marca y sus concesionarios.</description><language>es-ar</language>\n' +
            ''.join(f'<item><title>{e(x["titulo"])}</title><link>{SITIO}/autos/{slug}</link>'
                    f'<guid isPermaLink="false">{e(slug + " " + x["fecha"] + " " + x["titulo"])}</guid><pubDate>{rfc(x["fecha"])}</pubDate>'
                    f'<description>{e(x["texto"])}</description></item>\n' for x in items) +
            '</channel></rss>\n')


# Comparaciones "X vs Y" (2026-10-11): Google recibe muchas búsquedas "A vs B" y el comparador
# interactivo no se indexa. Cada auto a la venta (o en preventa) con precio en dólares se compara con
# sus 2 rivales más cercanos: misma carrocería (SUV y crossover juntos; los 4x4 con reductora, entre
# ellos), y la menor suma de diferencia
# de largo (cada 250 mm cuenta 1), de precio (cada 15% cuenta 1) y de propulsión (0,75 si no es la
# misma familia). Un rival a más de 45 cm de largo o 35% de precio no cuenta: mejor sin par que un par
# forzado. Las páginas no agregan datos: ordenan los de la ficha de cada uno.
FAMILIA = {'ev': 'ev', 'phev': 'phev', 'hev': 'hev', 'mhev': 'hev', 'ice': 'ice', 'tbd': 'tbd'}
GRUPO = {'SUV': 'suv', 'Crossover': 'suv'}


def numero(txt):
    m = re.match(r'(?:USD )?([\d.]+)', txt or '')
    return float(m.group(1).replace('.', '')) if m else None


def rivales(data, cars, slugs):
    filas = {f[0]: f for cat in data for f in cat[1]}
    # Todoterreno = SUV o crossover 4x4 con reductora, según la fila Tracción (como TODOTERRENO del script).
    todoterreno = {slugs[i] for i, c in enumerate(cars) if c.get('body') in ('SUV', 'Crossover')
                   and celda(filas['Tracción'][i + 1])[0] == '4x4 con reductora'}
    datos = []
    for i, c in enumerate(cars):
        if c['status'] not in ('venta', 'preventa'): continue
        pr = celda(filas['Precio de lista (versión tope de gama de la tabla)'][i + 1])[0]
        largo = numero(celda(filas['Longitud (mm)'][i + 1])[0])
        if not pr.startswith('USD ') or not largo: continue
        grupo = 'todoterreno' if slugs[i] in todoterreno else GRUPO.get(c.get('body'), c.get('body'))
        datos.append((i, numero(pr), largo, grupo, FAMILIA.get(c['type'])))
    pares = set()
    for i, p, l, g, f in datos:
        cerca = sorted(((abs(l - l2) / 250 + abs(p - p2) / (0.15 * (p + p2) / 2) + (0 if f == f2 else .75), slugs[j], j)
                        for j, p2, l2, g2, f2 in datos if j != i and g2 == g and abs(l - l2) <= 450 and max(p, p2) <= 1.35 * min(p, p2)))
        for _, _, j in cerca[:2]:
            pares.add(tuple(sorted((i, j), key=lambda k: slugs[k])))
    return sorted(pares, key=lambda ab: (slugs[ab[0]], slugs[ab[1]]))


def pagina_vs(a, b, data, cars, slugs, creditos):
    e = H.escape
    A, B = cars[a], cars[b]
    url = f'{SITIO}/comparar/{slugs[a]}-vs-{slugs[b]}'
    titulo = f"{A['name']} vs {B['name']}: precio, medidas y equipamiento"
    desc = (f"Comparación del {A['name']} y el {B['name']} en Argentina: precio de lista, propulsión, potencia, "
            'autonomía, baúl, seguridad y equipamiento, según sus fichas oficiales.')
    difs, iguales = [], 0
    for cat, fs in data:
        trs = []
        for f in fs:
            (ta, na), (tb, nb) = celda(f[a + 1]), celda(f[b + 1])
            if ta == tb: iguales += 1; continue
            td = lambda t, n: f'<td>{e(t)}' + (f'<small>{e(n)}</small>' if n else '') + '</td>'
            trs.append(f'<tr><th scope="row">{e(f[0])}</th>{td(ta, na)}{td(tb, nb)}</tr>')
        if trs: difs.append(f'<tr class="cat"><th colspan="3" scope="colgroup">{e(cat)}</th></tr>' + ''.join(trs))
    fig = lambda k: (f'<figure><img src="/fotos/{slugs[k]}-1.jpg" alt="{e(cars[k]["name"])}" width="900" height="570">'
                     f'<figcaption><b>{e(cars[k]["name"])}</b>' + (f'<br>{e(creditos[k])}' if creditos[k] else '') + '</figcaption></figure>')
    return f'''<!doctype html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>{e(titulo)}</title>
<meta name="description" content="{e(desc)}">
<link rel="canonical" href="{url}">
<meta property="og:type" content="article"><meta property="og:title" content="{e(titulo)}">
<meta property="og:description" content="{e(desc)}"><meta property="og:url" content="{url}">
<meta property="og:image" content="{SITIO}/fotos/{slugs[a]}-1.jpg">
<style>
:root{{--paper:#EEF1EE;--ink:#17211D;--ink2:#4B5A53;--line:#C9D4CE;--accent:#00843D}}
@media (prefers-color-scheme:dark){{:root{{--paper:#141B18;--ink:#E4EAE6;--ink2:#9DB3A8;--line:#2E3A35;--accent:#3FB57A}}}}
html{{-webkit-text-size-adjust:100%;text-size-adjust:100%}} @media screen and (max-width:640px){{html{{font-size:115%}}}}
body{{margin:0;background:var(--paper);color:var(--ink);font:1rem/1.5 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}}
main{{max-width:880px;margin:0 auto;padding:16px}}
a{{color:var(--accent)}} h1{{font-size:2rem;line-height:1.1;margin:8px 0 4px;text-wrap:balance}}
.sub{{color:var(--ink2);margin:0 0 12px}} .fotos{{display:grid;grid-template-columns:1fr 1fr;gap:10px}} figure{{margin:0}}
figure img{{width:100%;height:auto;background:#fff;border-radius:2px}} figcaption{{font-size:.75rem;color:var(--ink2)}} figcaption b{{color:var(--ink);font-size:.9rem}}
.cta{{display:inline-block;margin:12px 0;padding:8px 14px;border-radius:4px;background:var(--accent);color:#fff;text-decoration:none;font-weight:600}}
h2{{font-size:1.15rem;margin:24px 0 6px;border-bottom:2px solid var(--ink)}} table{{width:100%;table-layout:fixed;border-collapse:collapse;font-variant-numeric:tabular-nums}}
th,td{{text-align:left;vertical-align:top;padding:5px 6px;border-bottom:1px solid var(--line);overflow-wrap:anywhere}} th{{font-weight:500;width:34%;color:var(--ink2)}}
thead th{{color:var(--ink);font-weight:700}} tr.cat th{{color:var(--ink);font-weight:700;padding-top:14px}}
td small{{display:block;font-size:.75rem;color:var(--ink2)}} .nota,footer{{font-size:.8rem;color:var(--ink2)}}
</style></head>
<body><main>
<p class="sub"><a href="/">Autos chinos en Argentina</a> / Comparaciones</p>
<h1>{e(A['name'])} vs {e(B['name'])}</h1>
<p class="sub">Dos autos parecidos en carrocería, tamaño y precio, con los datos de sus fichas oficiales.</p>
<div class="fotos">{fig(a)}{fig(b)}</div>
<a class="cta" href="/?autos={slugs[a]},{slugs[b]}">Compararlos en la tabla interactiva</a>
<h2>En qué se diferencian</h2>
<table><thead><tr><th scope="col">Dato</th><th scope="col">{e(A['name'])}</th><th scope="col">{e(B['name'])}</th></tr></thead><tbody>{''.join(difs)}</tbody></table>
<p class="nota">En los otros {iguales} datos de la ficha dicen lo mismo. "Sin dato" quiere decir que la fuente no lo informa, no que el auto no lo tenga.</p>
<p>La página de cada uno: <a href="/autos/{slugs[a]}">{e(A['name'])}</a> y <a href="/autos/{slugs[b]}">{e(B['name'])}</a>.</p>
<footer><p>Datos de la ficha técnica oficial argentina; lo que sale de otra fuente está aclarado.</p>
<p><a href="/">Volver al comparativo</a>. <a href="/quien-hace-esto">Quién hace esto</a>.</p></footer>
</main></body></html>
'''


def quien():
    """Quién hace esto (2026-10-11): quién está detrás, su relación con las marcas (ninguna) y cómo se
    arman los datos. En primera persona, como lo contó el dueño del sitio. Solo afirma lo que es cierto
    del sitio: si se suma publicidad o algo que mida visitas, hay que cambiar "Privacidad"."""
    return f'''<!doctype html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Quién hace el comparativo de autos chinos en Argentina</title>
<meta name="description" content="Un comparativo hecho por un particular, sin relación comercial con marcas ni concesionarios: por qué existe y cómo se arman los datos.">
<link rel="canonical" href="{SITIO}/quien-hace-esto">
<style>
:root{{--paper:#EEF1EE;--ink:#17211D;--ink2:#4B5A53;--line:#C9D4CE;--accent:#00843D}}
@media (prefers-color-scheme:dark){{:root{{--paper:#141B18;--ink:#E4EAE6;--ink2:#9DB3A8;--line:#2E3A35;--accent:#3FB57A}}}}
html{{-webkit-text-size-adjust:100%;text-size-adjust:100%}} @media screen and (max-width:640px){{html{{font-size:115%}}}}
body{{margin:0;background:var(--paper);color:var(--ink);font:1rem/1.6 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}}
main{{max-width:680px;margin:0 auto;padding:16px}} a{{color:var(--accent)}} h1{{font-size:2rem;line-height:1.1;margin:8px 0 12px;text-wrap:balance}}
h2{{font-size:1.15rem;margin:24px 0 6px;border-bottom:2px solid var(--ink)}} .sub{{color:var(--ink2);margin:0 0 12px}} ul{{padding-left:20px}} li{{margin:4px 0}}
</style></head><body><main>
<p class="sub"><a href="/">Autos chinos en Argentina</a> / Quién hace esto</p>
<h1>Quién hace esto</h1>
<p>Hago este comparativo por mi cuenta. <b>No tengo ninguna relación comercial</b> con marcas, importadores ni concesionarios: nadie paga por aparecer ni por cómo aparece, y el sitio no tiene publicidad.</p>
<h2>Por qué</h2>
<p>Tengo un BYD Song Pro GS. Después de usarlo descubrí cuánto auto dan los chinos por lo que cuestan, y sentí la necesidad de ayudar a difundirlo para que otros los evalúen con datos antes de comprar.</p>
<p>Lo cuento también para que lo tengas en cuenta: el Song Pro está en la tabla con las mismas reglas que todos.</p>
<h2>Cómo se arman los datos</h2>
<ul>
<li>Salen de la ficha técnica oficial argentina de cada auto. Lo que viene de otro mercado o de la prensa está marcado, con su fuente.</li>
<li>Si la ficha no informa algo, dice «s/d»: nunca se completa a ojo ni por parecido con otro auto.</li>
<li>Los precios son los de la lista oficial de cada marca, con su fecha; si una marca no la publica, se aclara de dónde sale. Las promociones, solo del sitio de la marca o del concesionario.</li>
<li>Cada semana se revisan las fichas, los precios y las promociones.</li>
</ul>
<h2>Privacidad</h2>
<p>El sitio no tiene publicidad ni programas que sigan lo que hacés, y no pide registrarte. Lo que guardás (los autos que seguís, tu provincia, tu cochera) queda en tu navegador.</p>
<h2>Sugerencias</h2>
<p>Un dato que está mal, un auto que falta o una idea para el sitio: contame en <a href="{FORM_SUGERENCIAS}" rel="nofollow">este formulario</a> (es de Google; lo que escribís lo veo solo yo). Si es un dato, pasá el link de la ficha o la página oficial que lo dice: cada dato del sitio tiene que tener su fuente.</p>
<p><a href="/">Volver al comparativo</a></p>
</main></body></html>
'''


def red_oficial():
    d = json.load(open(os.path.join(RAIZ, 'concesionarios.json'), encoding='utf-8'))
    red = {}
    for c in d.get('concesionarios', []):
        serv = set(c.get('servicios') or [])
        for m in c.get('marcas', []):
            r = red.setdefault(m, {'puntos': 0, 'talleres': 0, 'distingue': False, 'prov': {}})
            pr = r['prov'].setdefault(c.get('provincia') or 's/d', {'puntos': 0, 'talleres': 0})
            r['puntos'] += 1; pr['puntos'] += 1
            if 'posventa' in serv:
                r['talleres'] += 1; pr['talleres'] += 1; r['distingue'] = True
    for m, r in red.items():
        if not r['distingue']:
            r['talleres'] = None
            for pr in r['prov'].values(): pr['talleres'] = None
        del r['distingue']
    return {'fecha': d.get('fecha'), 'marcas': red}


def generar():
    data, cars, slugs, creditos, colores, videos, extra = leer()
    salida = {}
    pares = rivales(data, cars, slugs)
    vs_de = {}
    for a, b in pares:
        u = f'{slugs[a]}-vs-{slugs[b]}'
        salida[os.path.join(DIR_VS, u + '.html')] = pagina_vs(a, b, data, cars, slugs, creditos)
        for k, o in ((a, b), (b, a)): vs_de.setdefault(k, []).append((u, f"{cars[k]['name']} vs {cars[o]['name']}"))
    s0 = open(os.path.join(RAIZ, 'index.html'), encoding='utf-8').read()
    hist = json.loads(re.search(r'const HISTORIAL_PRECIOS = (\{.*?\});\n', s0).group(1))
    red_json = json.load(open(os.path.join(RAIZ, 'concesionarios.json'), encoding='utf-8'))
    hoy = date.today().isoformat()
    for i, (car, slug, cred) in enumerate(zip(cars, slugs, creditos)):
        salida[os.path.join(DIR, slug + '.html')] = pagina(i, data, car, slug, cred, colores, videos, vs_de.get(i, ()), extra)
        salida[os.path.join(DIR, slug + '.xml')] = rss_auto(car, slug, hist, red_json, hoy)
    pag_nov, rss = novedades(cars, slugs)
    salida[os.path.join(RAIZ, 'novedades.html')] = pag_nov
    salida[os.path.join(RAIZ, 'novedades.xml')] = rss
    salida[os.path.join(RAIZ, 'quien-hace-esto.html')] = quien()
    urls = [SITIO + '/', SITIO + '/novedades', SITIO + '/quien-hace-esto'] + [f'{SITIO}/autos/{s}' for s in slugs] + [f'{SITIO}/comparar/{slugs[a]}-vs-{slugs[b]}' for a, b in pares]
    salida[os.path.join(RAIZ, 'sitemap.xml')] = ('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
                                                 ''.join(f'  <url><loc>{u}</loc></url>\n' for u in urls) + '</urlset>\n')
    salida[os.path.join(RAIZ, 'robots.txt')] = f'User-agent: *\nAllow: /\nSitemap: {SITIO}/sitemap.xml\n'
    # En el pie del comparativo, un link a cada página: así Google las encuentra.
    idx = os.path.join(RAIZ, 'index.html'); s = open(idx, encoding='utf-8').read()
    lista = sorted(zip(cars, slugs), key=lambda cs: cs[0]['name'].lower())
    nav = ('<nav class="todos-autos" aria-label="Página de cada auto"><h2>La página de cada auto</h2><ul>' +
           ''.join(f'<li><a href="/autos/{sl}">{H.escape(c["name"])}</a></li>' for c, sl in lista) + '</ul></nav>')
    s = re.sub(r'(<!-- autos:inicio[^>]*-->\n).*?(<!-- autos:fin -->)', lambda m: m.group(1) + nav + '\n' + m.group(2), s, flags=re.S)
    # Resumen de la red oficial por marca (2026-10-10), para mostrar talleres sin bajar los 440 KB de
    # concesionarios.json en la portada. Una marca cuya red no distingue el taller lleva talleres: null.
    red = red_oficial()
    s = re.sub(r'(/\*red:inicio\*/).*?(/\*red:fin\*/)', lambda m: m.group(1) + json.dumps(red, ensure_ascii=False, separators=(',', ':'), sort_keys=True) + m.group(2), s, flags=re.S)
    salida[idx] = s
    return salida, slugs


if __name__ == '__main__':
    salida, slugs = generar()
    # Lo que quedó de una corrida anterior y ya no se genera (un auto que salió, un par que cambió).
    sobran = sorted(os.path.relpath(os.path.join(d, f), RAIZ) for d in (DIR, DIR_VS) if os.path.isdir(d)
                    for f in os.listdir(d) if f.endswith(('.html', '.xml')) and os.path.join(d, f) not in salida)
    if '--check' in sys.argv:
        viejas = [os.path.relpath(r, RAIZ) for r, t in salida.items() if not os.path.exists(r) or open(r, encoding='utf-8').read() != t]
        if viejas or sobran:
            sys.exit('desactualizadas: ' + ', '.join(viejas + sobran) + '\ncorrer: python3 herramientas-paginas.py')
        print('páginas al día'); sys.exit(0)
    os.makedirs(DIR, exist_ok=True); os.makedirs(DIR_VS, exist_ok=True)
    for r, t in salida.items(): open(r, 'w', encoding='utf-8').write(t)
    for f in sobran: os.remove(os.path.join(RAIZ, f))
    n_vs = sum(1 for r in salida if r.startswith(DIR_VS))
    print(f'{len(slugs)} páginas con su RSS, {n_vs} comparaciones, sitemap.xml y robots.txt')
