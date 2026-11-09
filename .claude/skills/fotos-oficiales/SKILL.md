---
name: fotos-oficiales
description: Criterio y pasos para sumar fotos de un auto desde la galería oficial argentina de la marca (y desde Commons), y cómo buscar el logo de una marca. Usar siempre que se busquen, elijan, instalen o descarten fotos de autos de Autolofy, cuando un auto tenga pocas vistas, o cuando falte el logo de una marca.
---

# Fotos de los autos: criterio definido

Decidido por Sebastián el 2026-11-05 (issue #143). Vale para toda tanda de fotos, la haga quien la haga
(también la rutina). Objetivo: **más cantidad y más calidad de fotos, para que cada auto tenga más vistas**.

## Las reglas

1. **La galería oficial argentina se abre con un navegador, nunca con `curl`.** Muchos sitios de marca
   cargan la galería con JavaScript: `curl` ve solo el HTML inicial. Con el DFSK E5 Plus, `curl` mostró
   16 imágenes y el navegador 48, y la tanda del 2026-10-06 dejó al auto con 2 fotos por eso. Usar
   `node herramientas-galeria.js`: abre la página, la recorre, toca las flechas de los carruseles y baja
   el original de cada imagen (sin los sufijos de tamaño de WordPress ni de los optimizadores).
2. **Una imagen hecha con IA o un render vale si la publica el sitio oficial argentino de la marca o del
   importador**, y se instala igual que una foto. Lo que no vale es una imagen con IA de cualquier otro lado.
   El crédito lo dice: columna `nota` de `instalar-oficial` = `imagen generada con IA, publicada por la marca`
   (se nota por el nombre del archivo, «ChatGPT-Image…», o por cómo se ve).
3. **Lo que sigue sin entrar**, aunque esté en el sitio oficial:
   - otro modelo u otra versión (la foto grande de la página que es de otro auto; una consola con la palanca
     en otro lugar que la de la versión argentina);
   - material de otro mercado que se delata (pantallas o carteles en chino, volante a la derecha);
   - lo que no es una de las 12 vistas (detalles de llantas o faros, motor y batería, vistas desde arriba,
     cortes sin puertas, banners con íconos de ADAS);
   - la misma vista que ya tiene el auto (las muestras de cada color repiten el tres cuartos delantero).
4. **Una foto por vista, la mejor.** Las 12 vistas están en `VISTAS` de `herramientas-fotos.py`. Si hay
   varias candidatas para la misma vista, se elige la más nítida y que más muestre; la vista se decide
   mirando la imagen (lado del perfil = lado del auto).
5. **Commons se puede relajar si hace falta para sumar vistas**: aceptar la misma generación y el mismo
   diseño aunque la foto sea de otro mercado, siempre que no haya diferencias visibles con la versión
   argentina en esa vista. No se relaja: volante a la derecha, otra generación, otro modelo, ploteo o taxis.
   La portada sigue teniendo que ser la versión argentina (se compara con la tapa de la ficha AR).
6. **Todo rechazo se anota con su motivo.** Commons: `herramientas-fotos.py descartar`. Galería oficial:
   `herramientas-fotos.py descartar-oficial SLUG N "motivo"` → `fotos-oficiales-descartadas.tsv`. Así se puede
   responder después por qué un auto tiene pocas fotos.

## Los pasos

```bash
cd tests/e2e && npm ci && cd ../..          # playwright (usa Chrome si está instalado)
node herramientas-galeria.js SLUG URL [URL...]   # página del modelo en el sitio AR (y la del configurador)
python3 herramientas-fotos.py galeria-hoja SLUG  # saca chicas, banners, repetidas y lo ya descartado
```

`galeria-hoja` deja `.fotos-candidatas/oficial/SLUG/hoja.jpg` (cada imagen con su número) y `hoja.tsv`.
**Mirar cada imagen** (la hoja y, ante la duda, el archivo entero): el tamaño o el nombre no alcanzan.
Después, una lista con encabezado:

```
slug	vista	archivo_local	url_imagen	pagina_donde_aparece	marca_credito	nota
```

y `python3 herramientas-fotos.py instalar-oficial LISTA.tsv`, que escribe juntos `fotos/`, `FOTOS_POR_AUTO`,
`CREDITOS_POR_FOTO`, `VISTAS_POR_FOTO` y `fotos-fuentes.tsv`. Las que no van: `descartar-oficial`, una por una.
Una portada nueva va con `herramientas-fotos.py portada` (ver `CLAUDE.md`).

Dónde está la página de cada modelo: `fotos-fuentes.tsv` (columna página de las fotos oficiales), la `f` de
`COLORES_AR` y `fichas-fuentes.tsv`.

**Sitios que no entregan nada al navegador automático** (pasada del 2026-11-05: 0 imágenes): Toyota y Lexus
(responden 403), Ford, Volkswagen, Fiat, Citroën, Chevrolet, Audi, Mercedes-Benz, Porsche, Volvo, Land Rover,
Leapmotor y Soueast. **No se fuerza**: nada de cambiar encabezados, user agent ni esquivar el bloqueo. Para esas
marcas, la vía es la de `CLAUDE.md` (el navegador de una persona, que manda la imagen a un receptor local) o
Commons con la regla 5. Cuando `herramientas-galeria.js` da 0 imágenes, anotarlo y seguir con el próximo.

Antes de commitear: `cd tests/e2e && npm test` (`fotos.spec.js` cruza fotos, créditos y manifiesto) y
`python3 herramientas-paginas.py` si cambió la portada. Todo va por PR.

## Fuera de la Mac

`herramientas-fotos.py` usa `sips` en macOS y Pillow en Windows y Linux (`pip install pillow`). El recorte
con Vision (`herramientas-recortar-fotos.swift`) es solo de la Mac: en otro sistema, las portadas van con
`sin-recorte`.

## Logos que faltan: buscar hasta encontrarlo, sin preguntar

Pedido de Mati del 2026-11-09 (caso JMEV): cuando falta el logo de una marca (o cualquier recurso parecido), **se busca con
el navegador integrado y no se le pregunta si seguir**. Si una vía no da resultado, se prueba otra, hasta agotarlas; recién
entonces se le cuenta qué se probó. Orden:
1. Commons (búsqueda por nombre de marca y de la empresa matriz).
2. **El sitio argentino oficial de la marca o del importador, abierto con el navegador integrado** (con `curl` o `WebFetch`
   se pierde lo que carga la página con JavaScript): listar los `<img>`, `<link rel=icon>` y `svg` de la página con
   `javascript_tool` y buscar nombres con `logo`; el original suele estar sin el sufijo `_next/image?...&w=`.
   Con la URL del archivo, bajarlo con `curl` (para JMEV, `jmevargentina.com.ar/JMEV-Logo.png` bajó sin problema).
3. Sitio de la casa matriz en otro país, kit de prensa o página de prensa del importador. Se puede buscar **fuera de Argentina**.
4. Wikipedia de la marca (infobox) y la Wikipedia en el idioma del país de origen.
Si un sitio no abre (certificado inválido, bloqueo), no se fuerza: se pasa al siguiente. Un logo oficial o de Commons se instala
sin recortarlo, recolorearlo ni redibujarlo (ver `CLAUDE.md`, sección Logos); cada uno se anota en `logos-fuentes.tsv`.
