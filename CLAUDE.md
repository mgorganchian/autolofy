# Autolofy — reglas del proyecto

Autolofy (https://autolofy.vercel.app) compara **266 autos** 0 km vendidos (o por llegar) en Argentina.
Empezó con los chinos y electrificados; el nombre cambió el 2026-10-28 (repo `mgorganchian/autolofy`,
proyectos de Vercel `autolofy` y `autolofy-plan`).
Desde el 2026-10-28 también entran autos de marcas no chinas (decisión de Mati y Sebastián del
27/10: los 0 km principales, los eléctricos y los híbridos); los primeros fueron los 9 rivales
híbridos del BAIC X55 II Hybrid (Ford, Chevrolet, Toyota, Lexus, Nissan, Renault, Subaru y
Hyundai). Sus marcas entran sin red de concesionarios cargada (`aviso` en `concesionarios.json`),
y casi todas publican el precio en pesos: la celda lo dice en pesos, como lo publica la marca (ver
"Precios en pesos y dólar BNA" para cómo entran en los filtros).
El 2026-10-29 (pedido de Mati) se sumaron **73 de los 100 modelos más patentados de 2026** que faltaban
(inscripciones iniciales de la DNRPA de enero a septiembre, sin furgones ni camiones; 23 ya estaban). Criterios:
- Una versión por modelo: la más cara que publica la marca en su lista de octubre, salvo una versión que la marca vende
  como modelo o marca aparte (Ranger Raptor, Pulse y Fastback Abarth) o que no tiene ficha argentina (X1 xDrive25e,
  AMG GLC 63): entonces, la más cara con ficha argentina, y la celda de precio lo aclara.
- La fila Patentamientos 2026 cuenta las inscripciones de esa versión y dice el total del modelo y su puesto.
- La caja de una pickup en litros se escribe «Caja de carga de N L» y no se rankea contra los baúles (`PCTL_VETO`).
- Portadas: la foto oficial de la marca y, cuando el sitio bloquea las descargas (Ford, Peugeot, Toyota) o no hay
  foto de esa versión, Wikimedia Commons.
- **Autos sin foto** (2026-10-31, pedido de Mati: mejor cargarlos que dejarlos afuera): `FOTOS_POR_AUTO[slug] = 0`,
  `VISTAS_POR_FOTO[slug] = []` y la miniatura `fotos/mini/<slug>.jpg` es la silueta de su carrocería con «Sin foto
  todavía» (900×570, la arma `siluetas.js` de la tanda). `sinFoto()` hace que el zoom, el visor y la página del auto
  muestren esa silueta con su aclaración, y `herramientas-paginas.py` usa la miniatura en `autos/` y `comparar/` y
  `og.jpg` como vista previa. Cuando aparezca una foto válida de la versión argentina, se instala con
  `herramientas-fotos.py portada` (deja el 1 solo). El 2026-10-31 entraron 9 así y 6 consiguieron portada oficial el mismo día; el 2026-11-01 otros 3
  (BMW 220i Coupé, Range Rover Evoque S y T-Cross Extreme). **Queda con la silueta solo el BMW 118 Sportline**: el
  colorizador de bmw.com.ar renderiza un 118 con llantas M y freno azul, que según la ficha AR son del M135 (la Sportline
  lleva llantas bicolor de 18" estilo 974 y sin freno M), y la tapa de la ficha del Serie 1 es un M135.
  De dónde salió cada una: el 220i, de la tapa de la ficha AR G42 (es la regla: se compara con la tapa de la ficha, y sus llantas
  de 18" bicolor de radios dobles coinciden con la ficha); el T-Cross Extreme, de la tapa del folleto oficial `Flyer_TCross_MY26.pdf`
  (se ve la insignia EXTREME); el Evoque S, de la imagen de su tarjeta en landroverargentina.com (640×360, la única medida que publica).
  **El sitio argentino de Land Rover es `landroverargentina.com`**; `landrover.com.ar` no existe. Los PDF de BMW y Volkswagen bajan
  con curl, y se renderizan con PDFKit (Swift) porque no hay `pdftoppm`.
- **Haval H6 HEV (2025)** (2026-11-08, pedido de Mati): es el H6 anterior al Pro HEV de junio de 2026 (misma mecánica de 243 HP y mismas medidas;
  el Pro lleva trompa nueva, «GWM» en el portón, pantalla de 14,6", W-HUD y cargador inalámbrico, que la ficha del HEV marca con x). Entra como `venta`
  en su versión Supreme, con precio `EXT` de la prensa del lanzamiento (USD 35.500, 16/5/2025) porque gwm.com.ar ya no lo publica; el registro oficial
  lo sigue inscribiendo hasta septiembre de 2026. Portada: la tapa de su ficha (`FT-H6-HEV.pdf`). Ojo: `fichas-fuentes.tsv` y `fichas-hashes.tsv`
  siguen teniendo la fila vieja que asigna esa ficha al «Haval H6 Pro HEV» (de antes de que existiera esta columna).
- **Bajar fotos de sitios que bloquean a curl** (Ford, Toyota, Audi, BMW; 2026-10-31): con el navegador integrado,
  como una persona. La página pide la imagen con `fetch` y la manda a un receptor local (`127.0.0.1`) con un
  formulario: el `connect-src` de esos sitios no deja hacer `fetch` a localhost, pero el formulario no pasa por ahí.
  Ford entrega AVIF aunque el nombre diga .jpg: convertir con `sips` antes de `portada`. No se cambian encabezados
  ni el user agent.
Todo vive en un único `index.html` autocontenido: sin CSS, JS ni imágenes externas.
Ese principio es deliberado — **no agregar dependencias externas ni partir el
archivo.** Las únicas excepciones, servidas junto a la página y bajadas cuando hacen
falta: `fotos/` (con `fotos/mini/`, las miniaturas del encabezado), `logos/`, `og.jpg`,
`fichas-fuentes.tsv`, `logos-fuentes.tsv`, `concesionarios.json` y `/api/dolar` (la cotización del
día, del mismo sitio; ver "Precios en pesos y dólar BNA").
**Excepción de JS externo: Microsoft Clarity** (2026-11-04, decisión de Mati): el script de
`clarity.ms` mide visitas, clics y scroll. Está en el `<head>` de `index.html` y en las plantillas de
`herramientas-paginas.py` (`CLARITY_ID`, `CLARITY`); el ID tiene que ser el mismo en los dos. La
sección «Privacidad» de `quien-hace-esto` lo cuenta. No se suma otra medición sin cambiar esa sección. Aparte, `autos/*.html`,
`sitemap.xml` y `robots.txt` son páginas generadas para Google (ver "Páginas por auto").

**Marca de visitante en Clarity** (2026-11-09, pedido de Mati): abrir el sitio con `?soy=<nombre>` (por ejemplo `?soy=mati` o `?soy=sebas`) guarda el nombre en `localStorage` (`autolofy_soy`) y lo manda a Clarity como etiqueta `visitante` en cada visita de ese navegador; `?soy=` vacío lo borra. El script va pegado al de Clarity en `index.html`, `novedades.html`, `quien-hace-esto.html` y la constante `CLARITY` de `herramientas-paginas.py`; el parámetro se saca de la URL para que no viaje al compartir.

El contexto largo (el *porqué* de cada decisión, orden de columnas, estado del research,
metodología de búsqueda de fichas) está en **`CONTEXTO_PROYECTO_AUTOLOFY.md`**.
Este archivo es solo lo que hay que tener presente **siempre**.

> Este repo es **público**. Nada de tokens, cuentas ni rutas personales en archivos
> commiteados. Eso va en `CONTEXTO_LOCAL_PRIVADO.md`, que está en `.gitignore`.

---

## Regla de oro, no negociable

**Nunca inventar un valor.** Si hay duda real, va `NR` o `NOTE` con la explicación —
nunca completar "a ojo", nunca por analogía con otro auto, nunca porque "es lo normal
en este segmento".

Corolario que costó caro varias veces: **la ausencia de un dato en una ficha no es
prueba de que el auto no lo tenga.** Si la ficha no lo dice, es `NR`, no `No`.

---

## Estructura: 5 lugares a tocar al agregar o quitar un auto

Con `N = CARS.length`:

1. **`CARS`** — el objeto tiene **7 campos**:
   `{name, short, type, size, brand, body, status}`.
   Omitir `status` deja al auto fuera del filtro de Disponibilidad **sin tirar error**.
2. **`<th>`** en el `<thead>`, en el mismo índice — con su silueta de carrocería y su
   ícono de propulsión.
3. **`<col class="col-data">`** en los **DOS** `<colgroup>` (`#theadTable` y `#mainTable`).
4. **Cada una de las 105 filas de `DATA`**, en la posición correcta.
5. **`colspan="N+1"`** de las filas de categoría — está hardcodeado.

Además hay 3 conteos en texto: `#headerSubtitle`, `#summaryText` y el comentario arriba
de `CARS`.

### Valores de los campos

| campo | valores |
|---|---|
| `type` | `ice` `hev` `mhev` `phev` `ev` `tbd` |
| `size` | `xl` `big` `mid` `compact` `mini` `nd` |
| `body` | `SUV` `Crossover` `Sedán` `Hatchback` `Minivan` `Pickup` `Convertible` `Coupé` (desde el 2026-10-29; se dibuja con la silueta del sedán, como el convertible) |
| `status` | `venta` `preventa` `nolanzado` `discontinuado` |

**`size` (segmento) se asigna por el largo**, con los umbrales anotados arriba de `CARS`
(chico < 4150 mm ≤ compacto < 4515 ≤ mediano < 4714 ≤ grande; **muy grande** = 4825 mm o
más **y además 6+ asientos o pickup**, pedido del usuario del 2026-10-04: un sedán largo
de 5 plazas es "grande"). Al
agregar un auto con largo cargado, su segmento sale de ahí, no "a ojo". `nd` solo si
no hay largo. Sumar ancho y distancia entre ejes se probó y clasificaba peor (13 de 27
contra 24 de 27). Dos autos clasificados antes no siguen la regla (los dos BJ30) y están
listados como excepción en `tests/e2e/invariantes.spec.js`.
**Letras del mercado** (2026-10-30, pedido de Mati, como las usan la prensa y la industria): `mini` = urbano
(A), `compact` = chico (B), `mid` = compacto (C), `big` = mediano o grande (D), `xl` = muy grande; las etiquetas
llevan la letra. **SUV y crossover, por largo:** B < 4400 mm ≤ C < 4700 ≤ D (los BJ30 van como C).
**Hatchback y sedán, por distancia entre ejes**, que sigue a la cabina (el largo engaña: un sedán B como el
Virtus mide 4,56 m porque suma el baúl): hatchback A < 2450 ≤ B < 2600 ≤ C, y B si mide menos de 4200 de
largo (los eléctricos chicos tienen ejes largos); sedán B < 2660 ≤ C < 2800 ≤ D (el K4 y el M340i miden lo
mismo de largo, pero 2720 y 2851 entre ejes). Pickups, minivans, coupés y descapotables siguen con los
umbrales de largo de arriba. Ayudame a elegir ofrece «SUV chico (B)», «SUV compacto (C)» y «SUV mediano o
grande (D)».

---

## Las 6 invariantes — validar SIEMPRE antes de commitear

Un desajuste de a uno rompe la tabla **en silencio**: columnas desalineadas, sin error
visible.

1. `CARS.length` = celdas de datos por fila de `DATA` (cada fila tiene N+1 elementos).
2. `<th>` de auto = N (1 `<th class="feat-col">` + N `<th>`).
3. Un solo `<th class="feat-col">`.
4. Los **dos** `<colgroup>` con N `col-data` cada uno.
5. `colspan` de las filas de categoría = N+1.
6. **Ninguna celda con `|` que no arranque con `NR:`, `NOTE:`, `EXT:` o `DET:`.**

Más: `DATA` tiene que parsear con `JSON.parse` y el `<script>` no tener errores.

**Por qué la 6:** el renderer solo interpreta el `|` como separador valor/explicación
*después* de esos prefijos. En un valor plano se ve el texto crudo en la celda. Este bug
se coló dos veces.

**Trampas al medir:** `grep '<th'` también matchea `<thead>`; `grep 'col-data'` también
cuenta las 2 definiciones del `<style>`.

**Verificación cruzada:** renderizar de verdad y contar 105 filas en 17 categorías (la tabla dibuja 16 y 104), con
cero errores de consola. Con el script roto la tabla queda en **0 filas** y el archivo
igual "parece" bien.

Las dos cosas las corre la suite de Playwright en `tests/e2e` (invariantes, render y
las interacciones de la página). Correrla antes de commitear:

```bash
cd tests/e2e && npm ci && npm test
```

Después borrar `tests/e2e/node_modules` y `tests/e2e/test-results` si vas a cambiar a
una rama que no los ignore: la rutina no arranca si ve archivos sin trackear.

---

## Convención de celdas

**Lo igual se escribe igual** (pedido del usuario, 2026-10-07): el filtro "Solo diferencias"
compara el texto visible (lo que va antes del `|`). Dos celdas que dicen lo mismo tienen que
decirlo con el mismo texto ("Independiente McPherson", no "MacPherson" en una y "McPherson
independiente" en otra), y el detalle que no hace falta ver de entrada va a `DET:` (o a la
explicación, si ya era `NOTE:`/`EXT:`). En las filas con ranking, lo que el lector necesita
queda visible: el ciclo, "suma de los motores", "rebatidos", unidades distintas y "No aplica".
Un `Sí`/`No` con aclaración (`DET:Sí|…`, `NOTE:Sí|…`) se dibuja con el mismo ✓/– que
`YES`/`NO` (`simbVal`), y "Solo diferencias" toma `YES` = `Sí` (`CLEAN_SENT`). La primera
pasada (2026-10-07) unificó 2.917 celdas: los valores visibles distintos bajaron de 3.324 a
1.843, sin cambiar el ranking.

| forma | significa |
|---|---|
| texto plano | dato confirmado |
| `NR:s/d\|explicación` | sin dato, con motivo |
| `NOTE:valor\|explicación` | dato con matiz (ciclo de homologación, discrepancia, estimación) |
| `EXT:valor\|explicación` | no sale de la ficha oficial argentina (otro mercado, prensa) |
| `DET:valor\|detalle` | dato confirmado con un detalle que no hace falta ver de entrada (la versión del precio, "con barra estabilizadora"): se ve como un dato común, sin franja, y el detalle sale al pasar el mouse |

**Centinelas exactos** (el valor es *exactamente* eso): `"YES"` → ✓ · `"NO"` → – ·
`"OPT"` → ○ Opcional · `"ND"` → s/d.

**Los valores con texto van en castellano: `Sí (…)`, `No (…)`, `Opcional (…)` y
`s/d (…)`, nunca `YES (…)`, `NO (…)`, `OPT (…)` ni `ND (…)`.** Un centinela con texto al
lado hace que la celda muestre la palabra cruda ("YES", "OPT"). Los centinelas exactos
sí quedan en inglés, porque no muestran la palabra. Se coló con `YES` dos veces y con
`OPT`/`ND` una (Sealion 7 y Dolphin Mini, corregidos el 2026-09-24).

---

## No revertir sin querer

- **La tabla está partida en dos `<table>`** (`#theadTable` y `#mainTable`) sincronizadas
  por JS. **No es cosmético**: es la solución a un bug de Safari/iOS donde
  `position:sticky` en `<th>` no funciona si la misma `<table>` tiene scroll horizontal.
  Usan `border-collapse:separate` porque `collapse` rompía el sticky. **No volver a
  fusionarlas.**
- **En portrait se muestran 3 columnas** (característica + 2 autos): `col-feat 20vw`,
  `col-data 38vw`. Fue un pedido explícito. **No "arreglarlo" a 4 columnas.** La de
  características es angosta para que la foto se vea grande (2026-10-05). En tablet y
  escritorio (≥768 px) entran **como máximo 6 autos por pantalla** (pedido del usuario):
  cada columna mide un sexto del ancho, y nunca menos de 144 px. La miniatura embebida
  mide 300 px; cuando la foto se dibuja con más píxeles, el script la cambia por la
  portada de `fotos/` (900 px) al entrar en pantalla.
  En el **celular apaisado** (alto ≤ 500 px), con 4 autos o menos las columnas se estiran hasta
  llenar la pantalla (`pocos-autos` y `--k-vis`, que pone `applyColumnVisibility`; pedido del
  2026-10-28: con 2 autos quedaba media pantalla en blanco). Con 5 o más, el ancho de siempre.
  Al girar, `reacomodarAlGirar` vuelve a medir el ancho de las tablas y el encabezado compacto
  cuando Safari terminó de acomodar la página (a los 60, 300 y 700 ms): avisa el giro antes.
- **Nombres cortos de características** (`ETIQUETA_CORTA`): la columna muestra el corto y
  el tooltip, el nombre completo más la explicación de `GLOSSARY`. **El nombre de `DATA`
  sigue siendo la clave de todo**: el código busca filas por `tr.dataset.nombre`, nunca
  por el texto visible ni por `data-search` (que suma el corto para la búsqueda). El
  filtro de asientos dejó de andar en silencio cuando se buscaba por `data-search`.
- **El mejor se marca con una copa y la palabra «Mejor»**, no con una estrella (2026-11-05, pedido de Mati: la estrella se lee como puntaje o favorito). Sale de `MEJOR_HTML` en `index.html`; la clase sigue siendo `.mejor-sel` (la usan los tests) y la explicación de cada caso va en el `title`. Donde estos textos dicen «★» se lee la copa.
- **La barra resumen NO es sticky** — decisión explícita del usuario.
- **El header grande se oculta** tras el primer "Comparar" (`hasComparedOnce`).
- **Dropdown de Marca/Modelo en `position:static`**, no `absolute` (quedaba recortado).
- El **indicador de percentiles** (una barra rojo → amarillo → verde al pie de la celda, cuyo
  largo es el percentil; reemplazó a los 4 cuadraditos el 2026-10-07, pedido del usuario). Con 2
  o más autos elegidos, **la misma barra se recalibra** (`recalibrarBarras`, 2026-10-09): arranca
  en su valor general y se desliza a su lugar entre los elegidos (el mejor la llena; el resto,
  valor/mejor). Al volver a todos, regresa a `data-g`. La barra se marca en un tramo de un
  cuarto de la escala que termina en el puntaje, con la opacidad subiendo del 45% al 100% hasta la
  mitad del tramo y plena en la otra mitad (2026-10-10), y lo de atrás queda al 15% (`barraZona`, máscara
  `--z`): los tramos miden igual y cambian de lugar y color. Pedido del 2026-10-09. Va **solo en las 21 filas
  donde "mejor" tiene una dirección objetiva** (`PCTL_DIR` en el script). Las
  dimensiones (Longitud, Ancho, Altura, Distancia entre ejes) **no lo llevan a
  propósito**: poner el indicador ahí afirmaría que un auto más largo es mejor, y
  eso no es un dato. Las filas de equipamiento Sí/No tampoco. Al agregar una fila
  nueva, el indicador **no** aparece salvo que se la sume a `PCTL_DIR`.
  **Barras contra los de su tamaño** (2026-10-11, desplegable `#barrasSel`, guardado en el
  navegador): el mismo percentil pero entre los autos del mismo `size` (`pctlFilaSeg`); con menos de
  5 autos del segmento con el dato no hay barra, y sin segmento tampoco. Solo en la vista con todos los autos:
  con cualquier subconjunto las barras ya se recalibran y el desplegable se esconde.
  Tres vetos que se ganaron a golpes, en `pctlValor()`: `No aplica (100% eléctrico)`
  traía un **100** que rankeaba a nueve eléctricos como los de peor consumo; el baúl
  de las pickups viene en **kg y mm**, no en litros; y hay celdas en **HP** dentro de
  filas en kW y una en **km/l** dentro de la fila en L/100km. Los empates se reparten
  con **rango medio**, sin eso los 37 autos de 5 asientos caían a 0 por un solo auto
  de 4.
- La **vista Ranking** (botón Tabla/Ranking; bajo el nombre va el texto de la celda solo si dice
  algo más que la cifra grande, y el precio en chico si se rankea por otra cosa, 2026-10-10) ordena del mejor al peor **solo las 17
  filas de `PCTL_DIR`**, y lee los números con el **mismo `pctlValor()`** que los
  barras de percentil: no tiene parser propio, así que hereda los vetos. Lo que no se puede
  rankear va al final en **tres grupos distintos que no hay que fusionar**: "Sin dato"
  (no se sabe), "No aplica" (consumo de nafta en un eléctrico) y "No comparable" (hay
  cifra pero en otra unidad o medida distinto). Las cifras NOTE/EXT entran marcadas con
  su explicación. Respeta los autos elegidos en el comparador. `tests/e2e/ranking.spec.js`
  falla si un eléctrico se rankea en consumo o una pickup en baúl.
  En **Consumo, los enchufables (`type:"phev"`) van aparte y sin puesto** (`RK_APARTE`):
  rankeados salían primeros con 0,9–1,2 L/100km, y tampoco se ordenan entre ellos
  porque cada ficha mide distinto (el Lynk & Co 01 da 0,9 con batería llena y 6,4 con
  batería vacía; los BYD DM-i no aclaran). Las barras de percentil de la tabla todavía los
  incluyen.
- **Autos similares** (bloque "Autos similares a X por:" en el selector con un solo
  auto elegido, y botón "Similares" en cada auto de la tabla): sugiere los 3 más
  parecidos según los criterios tildados, que se combinan (precio, tipo de auto,
  tamaño, propulsión, asientos, y autonomía solo si el auto elegido es eléctrico:
  `SIM_SOLO_SI`). Las autonomías mezclan ciclos NEDC/WLTP/CLTC, y el criterio lo
  aclara en su tooltip. Con **Propulsión** tildada sugiere **primero los del mismo
  tipo** (`SIM_FAMILIA`: el mild-hybrid va con los híbridos, porque ninguno se
  enchufa y el BJ60 es el único mild), y si hay menos de 3 completa con otros. Es
  **preferencia, no filtro**: el usuario pidió explícitamente que no fuera estricta.
  El **tamaño se mide por el largo** (está en 120 de 124 autos; el segmento falta en 4)
  y **pesa el doble** (`SIM_PESO`), también pedido explícito. Con el triple el largo
  pisaba al tipo de auto: no subirlo sin mirar qué sugiere. La distancia de cada criterio está explicada arriba
  de `SIM_CRITERIOS`. Si el auto elegido no tiene un dato, ese criterio se apaga; si
  no lo tiene el candidato, cuenta como lo más distinto. **Para sumar un auto se usa
  `simHabilitar()`**, nunca tildarlo a mano: un auto se ve si pasa los filtros Y está
  tildado, y habilitar su marca tildaba de rebote a sus hermanos de marca (8 autos en
  vez de 2). `tests/e2e/similares.spec.js` lo cubre.
- **Las columnas se pueden mover** (2026-10-03): el auto de referencia (📌) va primero
  y el desplegable de orden ("Por tamaño", "Por precio de lista"…; sin título visible desde el
  2026-10-10) reordena el resto. **El orden por defecto es "Dimensiones"**: largo,
  a igual largo ancho, a igual ancho alto, más grande primero (`compararDims`); así el
  orden de `CARS` ya no importa y los autos nuevos se pueden agregar al final. Se mueven los `<th>` y `<td>` en el DOM, sin
  tocar `DATA` ni `CARS`. Por eso **nunca buscar el `<th>` de un auto por posición**:
  se usa `TH_AUTO[i]` (tomado al cargar) o `th[data-idx]`, y las celdas por
  `td[data-col]`. `tests/e2e/ux.spec.js` falla si una celda queda debajo de otro auto.
  La referencia marca ▲/▼ **solo en las filas de `PCTL_DIR`** y con `pctlValor()`,
  igual que las barras de percentil; los enchufables no se comparan en consumo (`RK_APARTE`).
- **La comparación vive en la URL**: `?autos=slug,slug&ref=slug&orden=clave` (los slugs
  son los de las fotos). **Todo slug es marca-modelo** (`byd-song-pro`, `gwm-haval-h6-4wd`; issue #73,
  2026-10-30): un auto nuevo arranca con su marca. Si se renombra un slug, va a `SLUG_VIEJO` (los links y los
  seguidos viejos siguen andando) y a los `redirects` de `vercel.json`; no renombrar slugs sin necesidad.
- **Presupuesto** en el selector: rango en USD sobre `PRECIO_CMP`, con su equivalente en pesos a la
  vista. Los autos sin ningún precio publicado entran por defecto (tilde aparte): no esconder un auto
  porque falte el dato.
- **Precios en pesos y dólar BNA** (2026-10-29, decisión de Mati en el issue #60): cada precio en
  dólares también se muestra en pesos al **dólar BNA vendedor** (billetes del Banco Nación), y cada
  filtro y botón de precio se dice en las dos monedas: Presupuesto, tope del Ranking, franjas de
  Ayudame a elegir y el criterio Precio de Similares. Para comparar, la lista en pesos pasa a dólares a
  la misma cotización (`PRECIO_CMP`; `SIM_PESOS` es la lista en pesos, solo si el valor visible es esa
  cifra: un s/d que nombra pesos en la explicación no cuenta). Es **la única conversión de moneda del
  sitio**: la celda sigue diciendo el precio como lo publica la marca (el de dólares lleva debajo
  «≈ $ N M»), las promos siguen sin convertir. **Desde el 2026-11-01 (pedido de Mati) los 77 precios en pesos también entran al ranking por precio, las barras y «Mayores diferencias», pasados a dólares al BNA** (`pctlValor` convierte `precioPesosPub`; el ranking los marca «de $ N al BNA»; `SIM_PRECIO` sigue siendo solo lo publicado en dólares y `PRECIO_CMP` ya los incluía): ninguno queda aislado por publicarse en pesos.
  La cotización va en `DOLAR_BNA`, entre `/*dolar:inicio*/` y `/*dolar:fin*/`, con su fecha y fuente:
  la del día la trae la página al cargar (2026-10-30, pedido de Mati: sin PRs diarios): `api/dolar.js`, una función
  de Vercel, devuelve `window.DOLAR_VIVO`; `index.html` la carga con `<script src="/api/dolar">` justo antes del script
  principal, porque todo lo que depende del dólar se calcula al cargar. Vercel la guarda una hora. Si no llega
  o la cifra no es razonable, se usa `DOLAR_BNA_EMBEBIDO` (el bloque entre `/*dolar:inicio*/` y `/*dolar:fin*/`),
  que `uv run herramientas-dolar.py` pone al día. El servidor de la suite responde `/api/dolar` sin cotización, así los
  tests usan la embebida; `mejoras.spec.js` cubre los dos casos.
  **De dónde sale** (2026-11-05, pedido de Mati: que cada repo lea la base compartida en lugar de bajar lo mismo): la
  función y la herramienta leen la serie `ar.dolar.oficial.venta` del esquema `v1` de la base **macroeconomia**
  (repo `mgorganchian/macroeconomia`), el dólar oficial minorista vendedor que ArgentinaDatos toma de la tabla
  «Billetes» del BNA: los mismos valores que antes se leían de bna.com.ar. La base lo carga dos veces por día (09:00 y
  19:00 de Argentina), así que entre la apertura del banco y las 19:00 la página muestra el cierre del día anterior.
  ArgentinaDatos fecha cada valor el día en que lo toma: un sábado dice «del sábado» con el cierre del viernes.
  Se lee con un rol de solo lectura, `lector_autolofy`: en Vercel es la variable `MACRO_DATABASE_URL` (sensible,
  Production y Preview, host con `-pooler`); en la Mac, el Keychain (servicio `neon-macroeconomia`, cuenta
  `lector_autolofy`). `api/package.json` trae `pg` solo para la función. Ni la respuesta pública ni el log dicen
  el motivo de un error (podría nombrar el host): solo el código.
- **Contra la inflación** (2026-11-05, pedido de Mati: comparar con la inflación las tasas que cobran los bancos y la
  suba del precio de los autos). `MACRO`, entre `/*macro:inicio*/` y `/*macro:fin*/`, lo escribe
  `uv run herramientas-macro.py` desde `v1` de la base macroeconomia, con el mismo rol que el dólar: el IPC mensual
  (`ar.bcra.inflacion_mensual`, la variación del IPC del INDEC como la publica el BCRA; `ar.ipc.nivel_general` llega
  de datos.gob.ar con un mes más de atraso), el interanual (`ar.bcra.inflacion_interanual`), el REM a 12 meses
  (`ar.bcra.inflacion_esperada_12m`, el mes es el del relevamiento) y el dólar BNA del último día de cada mes. Va
  embebido, no por `/api`: cambia una vez por mes. Dos lugares lo usan:
  - **Calculadora de cuota** (`cuotaContraInflacion`): en pesos, la tasa real esperada `(1 + TEA) / (1 + REM) − 1`;
    en UVA, cuánto da en pesos `(1 + TEA) × (1 + REM) − 1` y la cuota 13 si la UVA sube lo que espera el REM. Se
    compara con la inflación esperada porque es la del préstamo que se toma hoy; la de los últimos 12 meses va al lado.
  - **Historial del precio** (`historialContraInflacion`): el precio en dólares pasado a pesos al dólar de fin de mes,
    del fin del mes del primer precio registrado al fin del último mes que publicó el INDEC, contra el IPC de esos
    mismos meses. Si entre los dos no hay un mes entero, no se muestra (no se estima ninguna inflación).
  - **Historial en pesos** (`historialPesosHTML` y `historialPesosContraInflacion`): los autos con lista en pesos no están en
    `HISTORIAL_PRECIOS`, así que la ficha baja `precios-historial.json` (Vercel lo sirve) la primera vez que lo necesita y muestra
    cada lista. Las listas rigen por mes: la suba de la primera lista a la actual se compara con la inflación de los meses en que
    empezaron las listas nuevas. Si el INDEC todavía no publicó un mes, ese mes va con el REM repartido por mes
    `(1 + REM)^(1/12) − 1`, y el texto dice que es la inflación esperada. Con una sola lista registrada no se muestra nada.
  Si a `MACRO` le falta un dato, esa comparación no aparece. `tests/e2e/inflacion.spec.js` lo cubre.
- **Letra en el celular** (2026-10-10, pedido del usuario: con presbicia no se leía): hasta
  640 px de ancho la base es `html{font-size:130%}` (con 115% los datos quedaban en 15 px y no
  alcanzó; con 130% van en 17 px y casi nada baja de 15). El título grande del encabezado no sube.
  **Lo que no entra se resume, no se corta** (pedido del 2026-10-10): en el celular vertical la
  columna de características deja 66 px, así que los nombres de fila que se partían usan
  `ETIQUETA_CEL` (mismas cosas en palabras cortas, `etiquetasCel()`; el encabezado dice "Dato") con
  la letra de la tabla y sin guiones automáticos; el corte (`\u00ad`) solo en palabras compuestas.
  "Importador" entra porque esa columna tiene menos margen en el celular. Los títulos no siguen el
  130% (ya eran grandes: bloque "Títulos en el celular" al final del `<style>`). En Grupos, una línea
  por marca: la historia, el detalle del importador y las fuentes van en el tooltip. Los motivos
  de Ayudame a elegir son cortos (`MOTIVO_CORTO`).
  Nada de "…" en nombres de autos ni resúmenes: si no entra, va en dos renglones. Lo que estaba por
  debajo de .8rem sube otro 20% en el celular (bloque "Letra chica en el celular", generado a partir
  de las reglas: una letra chica nueva hay que sumarla ahí). Los textos de ayuda se acortaron para que haya menos para leer. `mejoras.spec.js` falla si un nombre de fila
  se parte en cualquier sílaba en el celular.
  Las páginas de `autos/` y `novedades` (las arma `herramientas-paginas.py`) usan 115% con el
  cuerpo en `1rem` (18 px; su texto es más grande de base). Solo en pantalla: al imprimir no cambia. Todos los tamaños de letra van en `rem`
  para que suban juntos: **no escribir tamaños de letra en px**. El ancho de las columnas va
  en `vw` y no cambia.
- **Cifras alineadas en columna** (2026-10-10, también en el canon de kamiPay): todo el sitio usa
  dígitos de ancho fijo (`tabular-nums` en `body`). En el Ranking la franja de aclaración tiene su
  lugar reservado en todas las filas (`.rk-marca.vacia`), el ciclo va en el renglón de abajo y
  la lista lleva la misma cantidad de decimales (`rkDecimales`). Nada de ancho variable a la
  derecha de una cifra que esté en columna. `ranking.spec.js` lo cubre.
- **Tema claro arriba** (2026-10-10, pedido del usuario): el encabezado, la barra de selección, el
  panel "Elegir autos", el encabezado de la tabla y las categorías usan `--h-bg`, `--h-ink`,
  `--h-rgb` (tintas y bordes translúcidos: `rgb(var(--h-rgb) / .3)`) y `--h-inv-*` (chip activo):
  claros en el tema claro, oscuros en el oscuro. **No volver a escribir `rgba(255,255,255,…)` ni
  `#fff` en esa zona.** Texto sobre el verde de acción: `--sobre-verde` (blanco en claro, oscuro en
  oscuro: blanco sobre el verde del tema oscuro daba 3:1). Contraste medido en todas las vistas y
  los dos temas: nada por debajo de 4,5:1. "Elegir autos" es verde y destella (`destelloElegir`).
- **Arreglos medidos** (2026-10-10, auditoría con Playwright): la portada decide la vista antes de
  pintar (`arranca-elegir` en el `<head>`: el salto medía 0,56 de CLS); las miniaturas llevan
  `loading="lazy"` (el panel cerrado bajaba 124 fotos, 1,15 MB); en el celular la tabla usa
  `fotos/med/<slug>.jpg` (480 px) en vez de la de 900 px (9,3 MB) — `herramientas-fotos.py portada`
  la regenera; `vercel.json` guarda fotos y logos un día. Las cinco ventanas pasan por
  `dialogoAbierto`/`dialogoCerrado` (foco adentro, Tab no se escapa, vuelve al botón); el panel se
  cierra con Esc. Los carteles de ayuda se abren con Tab, se cierran con Esc y se puede pasar el
  puntero por encima. Zonas táctiles de 24 px como mínimo (flechitas 44). Los destellos son 3 y no
  sin fin (WCAG 2.2.2). `scroll-padding` para que lo fijo no tape el foco. `<main>` y "Saltar al
  contenido". En la computadora la base es 112,5% (el 90% del texto quedaba debajo de 14 px).
- **Mejoras de UX** (2026-10-10, revisión con NN/g, Baymard y GOV.UK): Ayudame a elegir sin presupuesto
  preelegido (lo marcado se lee como recomendación), resumen "Para … Cambiar" arriba de los sugeridos
  en el celular, "Flojo en …" en la computadora y, sin resultados, botones con qué aflojar y cuántos
  autos daría. Filtros del panel con la cantidad por opción y la propulsión explicada a la vista
  (`PROP_AYUDA`), precio con campos para escribir y filtros activos con ✕ (`pintarFiltrosActivos`).
  El buscador no distingue tildes y entiende sinónimos (`SINONIMOS_FILA`). El visor dice "3 de 9".
- **Red de service y ofertas** (2026-10-10): `RED_OFICIAL` (lo escribe `herramientas-paginas.py` desde
  `concesionarios.json`, entre `/*red:inicio*/` y `/*red:fin*/`) da puntos de la red y talleres por marca
  y provincia; una marca cuya red no distingue el taller lleva `talleres: null` y se dice "red de N
  puntos", nunca "0 talleres". Se ve en la fila del importador, en la ficha (chips de respaldo) y en
  Ayudame a elegir (motivo y hasta .4 de puntaje). Ofertas: un precio publicado se compara con la lista
  **solo si es de la misma versión** (`promoComparable`: la promo nombra una versión cuyas palabras están
  en la de la tabla, o el modelo tiene una única versión) y en dólares; así salen la línea "para la
  versión de la tabla…" en Dónde comprarlo y el ranking "Rebajas publicadas".
- **El precio de lista va debajo del nombre, no en una fila** (2026-11-01, issue #89, decisión de Mati): la categoría «Precio»
  ya no se dibuja en la tabla (sin botón ni título); su única fila (`Precio de lista…`) sigue en `DATA` y en el cuerpo, **oculta**
  (`tr[data-oculta]`), para que todo lo que compara filas (★ del mejor, ▲▼ contra la referencia, mayores diferencias, «Gana en más
  filas», orden por precio) siga contando el precio. El encabezado de cada auto lleva `.th-precio` con el mismo texto, los pesos al BNA y
  la fecha de la lista (`fechasDePrecio`); `espejarPrecio()` copia a ese lugar la ★ y las ▲▼ de la fila oculta. **El precio ya no tiene
  barra de percentil visible.** Las 9 filas que estaban en «Precio» pasaron a tres categorías al final, con el vocabulario del sitio:
  **Respaldo** (garantía general, garantía de la batería, importador), **Origen** (fabricado en, grupo automotriz) y **Ventas en
  Argentina** (patentamientos 2026 a 2023). `DATA` tiene 17 categorías y 105 filas; la tabla dibuja 16 y 104 (`N_FILAS` en los tests).
  `herramientas-paginas.py` sigue leyendo el precio como la primera fila de la primera categoría.
- **Encabezado compacto** (2026-10-10): `#theadWrap` se pega con `top` negativo igual al alto de las
  fotos (`compactarThead`), así al bajar las fotos salen de la pantalla y quedan nombre, descripción
  y botones (celular: 208 → 104 px). No cambia ningún alto, así que no salta. "Ocultar filas sin
  dato" no hace falta aparte: "Solo diferencias" ya oculta las filas que son s/d en todos.
- **Botón Atrás** (2026-10-10, Baymard: el 59% de los sitios lo rompe): cada vista o ventana que se
  abre con un toque deja un paso en el historial (`pasoHist`), y cerrar con ✕/Esc vuelve ese paso
  (`cerrarPorHistoria`) en vez de dejar uno de más. La URL manda en qué se compara y qué auto se mira;
  el estado guarda vista, capa (`ficha`, `grupos`, `conces`, `panel`) y visor. Lo que abre la carga no
  deja pasos (Atrás desde un link directo sale del sitio). Encadenados: ficha → Grupos y Grupos → ficha
  con `sinHistoria` (Atrás vuelve a la ventana anterior); "Comparar" desde una ventana con
  `compararConPaso`; el Comparar del panel reemplaza el paso del panel (`enTransicion`). Durante el
  popstate la URL no se reescribe. Sin otros parámetros, la URL lleva `?tabla` si no se está en
  Ayudame a elegir. `mejoras.spec.js` recorre los casos.
- **Modo oscuro**: todo color sale de las variables de `:root`; el oscuro solo cambia sus
  valores (por `prefers-color-scheme` y por `data-theme`, que el botón guarda en
  `localStorage`). **No volver a escribir colores fijos en el CSS** (`#fff`, `#666`…):
  quedan mal en oscuro. Las fotos mantienen fondo blanco a propósito.
- **Impresión**: imprime lo que se ve, siempre en claro. Como el encabezado vive en otra
  `<table>`, `beforeprint` lo copia como `<thead>` de la tabla principal para que se
  repita en cada hoja.
- **Tracción y todoterreno** (2026-10-11, pedido del usuario): la fila **Tracción** (después de Tipo
  de propulsión) dice `Delantera`, `Trasera`, `4x4` (las cuatro ruedas sin reductora informada),
  `4x4 con reductora` (marcha baja explícita en la fuente: "4L", "reductora", "Low") o `4x2` (la
  fuente no dice qué eje). **Que diga "4x4" o "4WD" no alcanza para poner reductora.** Un
  **todoterreno es un 4x4 con reductora**, no un auto con forma de todoterreno: de esa fila salen
  `TODOTERRENO` (los SUV y crossover con reductora, que se dibujan con la silueta `b-offroad`; su
  `body` sigue siendo "SUV"), el puntaje de "tierra" en Ayudame a elegir (`esTodoterreno`, pickups
  incluidas) y el grupo de las comparaciones "X vs Y". Hasta el 2026-10-10 eran 7 elegidos por la
  forma, y entre ellos estaba el BJ30 4x2. Con la fila (cargada el 2026-10-11 de fichas y sitios
  oficiales; 33 EXT de otro mercado o prensa, 2 s/d), los SUV todoterreno son BJ60, BJ40 Pro, Tank 300 y
  Jetour G700, más 9 pickups con reductora; el BJ40 Plus, los BJ30 y el Jetour T2 quedaron en `4x4`
  porque ninguna fuente oficial nombra la reductora, y el T2 i-DM es de tracción delantera. Hay filtro
  por tracción en el panel (`selectedTracs`).
- **Compartir la ficha** (2026-11-01, issue #90, decisión de Mati): la ficha de cada auto tiene «Compartir esta ficha» con Mail (`mailto:`),
  WhatsApp (`wa.me`) y Copiar link, y en el celular también «Compartir» (menú del sistema). Se comparte la página estática
  `/autos/<slug>` (título y vista previa propios), con el texto «Mirá este auto en Autolofy: <nombre>». **No toma ni guarda datos de nadie**:
  abre el mail o el WhatsApp de la propia persona. Pedir mail o teléfono a quien no está registrado sigue pospuesto (cambiaría Privacidad y
  obligaría a cumplir la ley de datos personales). `compartir-ficha.spec.js`.
- **Seguir un auto** (2026-10-11): sin cuentas ni mails. `seguidos` (en el navegador) guarda, por
  slug, el precio de lista en dólares y la disponibilidad de la última vez que se vio el auto; al
  volver, `#avisoSeguidos` dice qué cambió, con "Comparar los que sigo" y "Listo". Abrir la página
  del auto cuenta como visto. El botón "Los que sigo (N)" de la barra los compara (hasta 6). Para
  enterarse sin entrar, el RSS de cada auto.
- **Carga, cochera, escala y fotos lado a lado** (2026-10-10, ideas de EV Database, vehiclesizes.com
  y Autohome):
  - "Cuánto tarda en cargar" en la página de cada eléctrico o enchufable (`cargaHTML`): en casa es
    la batería sobre la potencia (enchufe de 10 A = 2,2 kW; pared = 7 kW o lo que admita el auto), y
    se presenta como **el mínimo**, sin inventar un factor de pérdidas. Si la celda trae el tiempo de
    la ficha ("30 a 80% en 20 min"), va ese y no se calcula (`tiempoFicha`, el rango más amplio). La
    carga rápida nunca se calcula.
  - "¿Entra en mi cochera?" es una herramienta del Ranking (`__cochera`): largo, ancho y alto
    opcional en metros (acepta cm o mm), guardados en el navegador (`rkCochera`). Entran, no entran
    (cuánto falta) y sin dato. La nota avisa que las fichas miden el ancho sin espejos: no se suma
    ningún margen inventado. La página del auto lo repite si ya se cargó.
  - Al comparar, "Tamaño a escala" (las siluetas estiradas a su largo y alto, misma escala, regla de
    1 m; `SIL_CAJA` es la caja de cada silueta dentro de su `<symbol>`) y "Fotos lado a lado" (la
    misma vista de cada auto, con el crédito de cada foto). Van plegados y siguen abiertos al
    cambiar la selección (`difAbiertos`).

---

## Ciclos, potencia total y garantía (2026-10-04)

- **Cada cifra de autonomía y consumo dice su ciclo** en el valor visible, entre
  paréntesis y justo después del número, tal como lo dice su fuente: `(NEDC)` `(WLTP)`
  `(WLTC)` `(CLTC)` `(EPA)` `(etiqueta AR)` o `(ciclo no informado)`. El código los lee
  así (`CICLO_RE`). **Nunca deducir el ciclo** por el país, la marca o el título de la
  fila. La etiqueta argentina (IRAM/AITA 10274-2) es NEDC (Res. 85/2018).
- El ranking ordena autonomía eléctrica y consumo por un **estimado WLTP** (`WLTP_AUT`,
  `WLTP_CONS`, fuentes en `WLTP_TEXTO`), pero muestra grande la cifra de la ficha. La
  tabla muestra el estimado **solo debajo de la cifra de la ficha**, marcado «WLTP estimado» y con su cuenta en el tooltip (`wltpCeldaHTML`, 2026-11-06, pedido de Mati; antes no lo mostraba): nunca en lugar de ella, y nada si el ciclo es WLTP/WLTC, no se informa o no hay factor. La **autonomía combinada no se estima**: no hay factor
  defendible; se rankea por ciclo. Decisión del usuario: no cambiar sin preguntarle.
- **Potencia total del sistema (kW)**: naftero = motor; eléctrico = motor(es); híbrido =
  la combinada que declara la fuente. **Nunca sumar motores a mano**. Si la "combinada"
  declarada es la suma exacta de los motores, se carga con `, suma de los motores` en el
  valor visible: `PCTL_VETO` la deja fuera del ranking (BJ30, GAC S7, Jetour G700).
- **Garantía general / de la batería / Fabricado en** (fila de Precio). "Marca china" no
  alcanza para poner "China": hay modelos armados en Brasil o Uruguay.
- **Cupo de importación con arancel 0%** (2026-11-07, fila de Origen; delegado por Mati): `EXT:Figura en el cupo` solo si el modelo tiene
  coincidencia **exacta** en un cupo **asignado** (Res. 295/2025, Res. 513/2025 o reasignación de la Disp. 375/2026); `NOTE:No concluyente` si la
  coincidencia es dudosa; `NR:s/d` si no figura. **Nunca `No`**: el cupo es de la empresa para un modelo y no prueba que el precio salga sin
  arancel ni que la versión de la tabla sea la importada. Pedidos rechazados (375/2026), listas de espera (anexos IV y V de la 513/2025) y la
  primera ronda de 2025 (Disp. 32/2025: sus anexos nombran solo marcas) **no cuentan como cupo**. No está en `PCTL_DIR`: nunca se rankea. El cruce,
  las fuentes y cómo regenerar la columna están en `docs/cupo-cruce-autos.md`; cada celda en `datos-fuentes.tsv`.

## Grupos, página de cada auto y vista previa (2026-10-04)

- **Grupo automotriz**: `MARCAS_INFO` (en el script) dice, por marca, el grupo, la
  relación (marca propia, submarca, adquirida, joint venture, participación,
  independiente), el detalle, el **importador en Argentina** y las fuentes. De ahí salen
  el filtro "Grupo" del selector, la vista 🏭 Grupos y las filas "Grupo automotriz" e
  "Importador en Argentina". **Una marca nueva necesita su entrada** (con fuente): sin
  ella el test de `ux.spec.js` falla.
- **GWM**: en Argentina Haval, Ora, Tank y Poer se venden como GWM ("One GWM"), así que su
  `brand` es `"GWM"`; la submarca sale del nombre del auto (`submarcaDe`). Kaiyi NO es
  del grupo Chery (la controla Yibin; Chery tiene una parte minoritaria).
- **Página de cada auto** (`?auto=slug`): lee `fichas-fuentes.tsv` del propio sitio para
  los links a fuentes oficiales. **No renombrar ni mover ese archivo** (lo sirve Vercel).
- `og.jpg` (vista previa al compartir) se genera con fotos oficiales sin créditos de Commons.

## Patentamientos, choques, historial y novedades (2026-10-08)

- **Patentamientos 2026, 2025, 2024 y 2023 (unidades)** (filas de Precio): inscripciones iniciales del
  registro oficial (DNRPA, datos.jus.gob.ar). Si el registro junta dos autos de la tabla, los dos llevan
  la misma cifra en NOTE; nunca se reparte. Desde el 2026-10-29 (pedido del usuario) **son ranking de
  ventas**: están en `PCTL_DIR` (más es más vendido) y la vista Ranking dice arriba cuántos 0 km se
  patentaron ese año en Argentina (`VENTAS_AR`: autos, SUV, rurales y pickups, sin furgones ni
  camiones). Los años anteriores cuentan las **mismas denominaciones del registro** que la fila de
  2026; si en un año no hay ninguna, va NR («pudo no venderse o inscribirse con otro nombre»), nunca 0.
  Al sumar un auto, sus cuatro años se cargan con el script de la tarea (o se dejan NR con el motivo).
- **Ventas por marca y por grupo** (vista Ranking, grupo «Del mercado», 2026-10-29, pedido del usuario): todo el
  mercado, estén o no los autos en la tabla (`VENTAS_MARCAS`, DNRPA, mismo recorte que `VENTAS_AR`), con botones
  por año y la participación. El grupo de cada marca es el de `MARCAS_INFO` (más `GRUPO_ALIAS` para los nombres
  de empresa con que el registro inscribe algunos autos: «Great Wall», «Dfac Dongfeng»); una marca sin entrada
  **no se asigna a ningún grupo**: va aparte, con su cifra. Al sumar una marca con su `MARCAS_INFO`, entra sola.
- **Seguridad en choques (NCAP)** (primera de Seguridad pasiva): Latin NCAP va en texto plano;
  Euro NCAP, ANCAP, C-NCAP o ASEAN como EXT con año. Solo si el ensayo es del mismo modelo,
  generación y versión vendida acá (o se aclara la variante): ensayos de una versión anterior o
  de otro modelo (Pro Max, protocolo viejo) van NR con lo que existe en la explicación. No es
  ranking: las estrellas de programas distintos no se comparan.
- **Historial del precio** (`HISTORIAL_PRECIOS`, por slug): solo cambios de una lista oficial de
  la misma versión; una corrección reemplaza la última entrada. Lo escribe la rutina (tarea D).
- **Novedades** (`/novedades` y `/novedades.xml`): las arma `herramientas-paginas.py` con el
  historial, las promos vigentes y `novedades.json` (solo hitos del sitio). No editar a mano.
- **Un cambio de precio de menos del 1% no se informa nunca** (pedido del usuario, 2026-10-18: «Bajó el
  CS55 Plus: USD 32.000 → USD 31.990» no es una novedad): ni como baja ni como suba. `CAMBIO_MIN` en
  `herramientas-paginas.py` (Novedades y RSS: cambios de lista y promos con precio a menos del 1% de la
  lista, incluidas las publicadas al precio de lista exacto) y `cambioChico` en `index.html` (Seguir un
  auto, titular del historial, Rebajas publicadas y Dónde comprarlo). El historial guarda igual cada
  lista oficial: lo que no se hace es anunciarla. `paginas.spec.js` y `mejoras.spec.js` lo cubren.
- **Las notas del pie van plegadas** en «Notas sobre los datos» (`details.pie-notas`, 2026-10-18, pedido
  del usuario: la página queda más limpia). La Fecha de consulta queda afuera, a la vista.
- **Grupos y Concesionarios también son vistas de la página** (2026-10-11, pedido del usuario), no
  ventanas encima: en el iPhone, como ventanas, la página de atrás se arrastraba y el final quedaba
  bajo la barra del navegador (`max-height: 94vh`). `mostrarVista('grupos'|'conces')`, sus botones
  quedan marcados (`aria-pressed`), se sale con las pestañas o con Atrás (Esc ya no las cierra) y la URL
  lleva `?vista=grupos` o `?vista=concesionarios`. En la lista del ranking el estado va corto ("No
  lanzado", `ESTADO_CORTO`) y baja de renglón si no entra: el largo tapaba el precio.
- **La portada abre "Ayudame a elegir"** (2026-10-09), que es una **vista de la página** como Tabla
  y Ranking (pestaña `#vistaElegir`, sección `#elegirHoja`, `mostrarVista('elegir')`), no un panel
  encima de la tabla: el panel modal confundía (título repetido, tabla oscurecida e inaccesible).
  Sin parámetros en la URL abre esa vista; con `?autos=`, `?auto=` o `?tabla` va directo. **Los tests cargan `/index.html?tabla`**:
  si un test nuevo carga la página sin parámetros, el panel tapa la tabla.
- **Visor de fotos** (2026-10-09): tocar la foto de un auto en Ayudame a elegir
  (`data-visor-slug`) o en su página (`#fichaImg`) la abre a pantalla completa (`abrirVisor`),
  con las demás fotos (flechas, teclado o deslizar), su vista y su crédito por foto. Ayudame a
  elegir sugiere 5 autos en escritorio y 4 en el celular (`elegirN()`).
- **Ayudame a elegir** (franjas de precio y tipos de auto elegidos para que cada opción tenga
  una cantidad pareja de autos: SUV partidos por segmento B, C y D; desde el 2026-10-30, 7 franjas de precio de 30 a 33 autos
  cada una, pedido de Mati: hasta 28.000, 32.000, 35.500, 39.800, 52.500, 66.000 y más; sugiere 5 o 4, `elegirN()`; la barra al pie muestra las sugerencias y se ilumina
  con cada respuesta, porque en el celular la lista queda fuera de la pantalla): filtros duros (franja de precio, plazas, tipo) y puntos por propulsión,
  percentiles y respaldo. El presupuesto es una **franja** ("35.001 a 45.000"), no un tope:
  elegir una más alta dice que querés gastar más, y dentro de la franja el precio no suma. Con
  enchufe en casa, los enchufables van primero (`ELEGIR_ENCHUFE`). Un enchufable nunca se
  presenta como de bajo consumo (`RK_APARTE`).
- **Motor de Ayudame a elegir** (2026-10-30, pedido de Mati, issue del PR «motor de sugerencias»): siempre sugiere
  `elegirN()` autos. Primero los que cumplen todo; si no alcanzan, los «casi» (`elegirDesvio`: fallan en una sola
  cosa y por poco: precio hasta un 15% fuera de la franja, el SUV del segmento de al lado o un asiento menos), con esa
  diferencia escrita arriba de sus motivos. Como mucho 2 autos por marca (se afloja solo si no se llega a N). Pesos:
  propulsión 3, percentiles del uso 1,5, respaldo **como mucho 1** (el bruto se divide por 2,5), extra pickup/4x4 .5,
  y dentro de una franja el equipamiento por dólar hasta .4 (`elegirEquipo`: ✓ sobre filas con dato). Cada tarjeta
  tiene un «?» con el puntaje desglosado (`elegirPorqueHTML`). «Sedán o hatchback» incluye coupés y descapotables.
  Las opciones de cada pregunta son una grilla de botones del mismo ancho.
- **Asientos estimados** (2026-11-01, pedido de Mati): el que no tiene la fila Número de asientos (32 autos) ya no pasa en
  silencio por «¿Cuántos viajan seguido?». Hasta 5 plazas entra con `estimarAsientos()` (carrocería y distancia entre
  ejes: coupés y descapotables 4, sedanes, crossovers y pickups 5, hatchbacks 5 o 4 por debajo de 2,45 m, SUV de menos de
  2,80 m 5; un SUV más largo no se estima) y la tarjeta dice «(estimado por su tamaño)». Para 6 o 7 plazas no entra. La
  tabla sigue en s/d: nunca se escribe la estimación como dato. `asientos-estimados.spec.js` mide que no prometa de más.
- **Franjas de presupuesto en una fila** (2026-11-01, pedido de Mati): los botones de «¿Cuánto querés gastar?» abrevian los
  miles («USD 28 a 32 mil», «USD 35,5 a 39,8 mil») para que los dólares entren en una fila, con los pesos debajo; el corte
  exacto («De USD 28.001 a 32.000.») va en el cartel (`usdExacto`). El valor de la franja no cambia. `rangos-precio.spec.js`.
- **¿Quiénes viajan seguido?** (2026-11-01, pedido de Mati; issue #101): pregunta de Ayudame a elegir después de las plazas,
  con «Me da igual» marcada. «Adultos con niños» pide ISOFIX (`isofixDe`): sin él el auto no entra y si no informa queda
  como «casi» («No informa ISOFIX»). el «casi» fijo para A y B del 2026-11-01 se reemplazó el 2026-11-07 por el filtro de tamaño (ver «Tres filtros que se arman solos»). Un solo «casi» por auto. Las opciones se llaman «Con niños» y «Adulto atrás» (si va algún adulto en una plaza trasera; con 6 o 7 plazas el dibujo tiene tres hileras). En el celular, toda pregunta
  de tres opciones va de a tres en una fila (`data-n="3"`: plazas, quiénes viajan, enchufe). `quien-viaja.spec.js` lo cubre.
  Cada opción de «¿Quiénes viajan seguido?» lleva el dibujo del auto visto desde arriba con quién va en cada asiento (`quienSVG`: con
  niños, 2 adultos adelante y 2 o 3 chicos atrás según las plazas) y la elegida explica el supuesto debajo (`.quien-nota`). Es un dibujo, no un dato.
- **Tres filtros que se arman solos** (2026-11-07, pedido de Mati): en Ayudame a elegir, debajo del uso y el enchufe, hay tres filtros de casillas que las
  respuestas dejan armados y que se pueden cambiar a mano (`elegirResp.seg`, `.prop`, `.carro`; lista separada por comas, `''` = me da igual; `elegirNorm` aplica lo
  sugerido a los que no se tocaron, `segMan` y `propMan` marcan los tocados y «Volver a la sugerencia» los suelta).
  **Tamaño (A a D)**: «Me da igual» deja los cuatro; «Con niños» los cuatro (decisión de Mati del 2026-11-07: los límites los ponen las plazas y el ISOFIX, como en la regla del 1/11); «Adulto atrás» C y D; 6 o 7 plazas solo D (la D incluye los muy grandes, `SEG_ABCD`). El
  segmento de al lado queda como «casi» («Otro tamaño (B)»); sin segmento en la tabla, «No informa su tamaño». **Propulsión**: con dónde cargar, ciudad = EV y
  ciudad y ruta o mucha ruta = PHEV; «No sé» (el valor de entrada) PHEV, que sirve con o sin enchufe; sin carga, HEV (no depende de cargadores); tierra y trabajo, me da igual (casi no hay híbridos 4x4 ni pickups híbridas).
  **Nunca se sugiere mild-hybrid ni nafta**, pero se pueden tildar a mano. La propulsión elegida **excluye**, no solo prioriza (el puntaje por propulsión sigue
  contando entre los que quedan). **Tipo de auto**: SUV o crossover (juntos), sedán, hatchback, pickup, minivan, coupé o descapotable; «Me da igual» apaga las demás.
  Las opciones viejas «SUV chico/compacto/mediano» desaparecieron (las cubre el tamaño) y las respuestas guardadas se migran. `tests/e2e/elegir-filtros.spec.js`.
- **¿Viaja alguien en silla de ruedas?** (2026-11-01, issue #112; opción 1): **círculo chico con el símbolo de accesibilidad** (dibujado a mano,
  `SVG_ACCESO`) en el título de «¿Quiénes viajan seguido?», que se toca para sumar o sacar (opción C elegida por Mati, `movilidadBtnHTML`); no es una pregunta aparte. Con «Sí» solo entran los de **baúl al menos tan grande como el del BYD Song Pro** (`baulGrande()`): referencia de Mati del 2026-11-01, en el Song Pro
  con los asientos traseros en su posición recta (sin plegarlos) la silla de ruedas entra de costado; se toma el litraje que la tabla trae
  para el Song Pro (~520 L, EXT aproximado) y se lee de la fila. Sin dato de baúl no entra; la caja de una pickup no cuenta. Ya no se exige que los
  asientos se plieguen (si lo hacen, es un motivo más). Suma como motivo el baúl en litros y la apertura eléctrica. **No dice qué tan alto es el piso**:
  ninguna fila lo tiene; el cartel dice que hay que probar la silla en el auto. Falta (opción 2 del issue) cargar la altura de carga y la boca del baúl.
  Lenguaje: «silla de ruedas», nunca «discapacitado». `movilidad.spec.js`.
- **Presupuesto con deslizador** (2026-11-01, pedido de Mati): «¿Cuánto querés gastar?» ya no son franjas sino un deslizador de dos mangos
  (de a USD 1.000, con los pesos al BNA al lado y la cantidad de autos con precio). Arranca en el rango más bajo (`presuInicial()`, unos 30
  autos). **Arrastrar la barra del medio traslada todo el rango con el ancho en dólares fijo** (`presuTrasladar`; hasta el 2026-11-08 estiraba
  el fin para mantener la cantidad de autos y el máximo avanzaba a tirones de 1.000, 2.000 o nada: decisión de Mati, opción A; la cantidad de autos sí cambia al arrastrar);
  los extremos se ajustan aparte, y las flechas corren los dos extremos lo mismo (se frenan contra los bordes sin achicar el rango).
  **Escala por tramos** (2026-11-08): el riel no es lineal; el tramo donde se concentran los autos (hoy USD 21.000 a 43.000, 60% de los autos) se lleva el 64% del riel
  (`PRESU_CORTE`, `presuPos`, `presuUsdDe`; los cortes salen de percentiles al cargar), y desde el último corte (USD 60.000) el salto es de USD 5.000.
  La pista llega a `PRESU_TOPE` (el 5% más caro, «o más», sin tope). El valor guardado es `mín-máx` en USD, `mín-` sin tope y `''` es
  «Me da igual el precio». Cuenta `PRECIO_CMP`, así que los de lista en pesos entran. `presupuesto-deslizador.spec.js`.
  **Mangos y flechas** (2026-11-01, opción C de Mati): los mangos van por **fuera** de la barra (cada uno junto a su extremo) para que la barra del medio, con
  sus puntitos de agarre, siempre se pueda tocar aunque el rango sea angosto; dos flechas ‹ › de 44 px mueven todo el rango de a USD 1.000 (mantenidas, repiten).
  El fin se redondea para arriba o para abajo, el que deje la cantidad de autos más cerca de la original (hay precios repetidos).
- **Ayudame a elegir en la computadora: una pregunta por renglón** (2026-11-02, pedido de Mati): desde 900 px el título de cada pregunta va a la
  izquierda (200 px) y sus opciones en una sola fila (`--n` = cantidad de opciones), con las sugerencias debajo y a lo ancho. El título es un
  `div.elegir-leyenda` dentro de un `fieldset role="group"`, no un `<legend>` (un legend no participa de la grilla). En el celular sigue todo apilado.
  `elegir-escritorio.spec.js` mide un renglón por pregunta a 1024, 1280 y 1440 px.
- **Dos arreglos de los issues de Sebastián** (2026-11-03): **(#129)** la cantidad de sugerencias de Ayudame a elegir (5 en pantalla ancha, 4 en chica) se decide **una sola vez
  al cargar** (`ELEGIR_N`); achicar o agrandar la ventana no la cambia (`elegir-resize.spec.js`). **(#130)** los botones de la ventana de un auto que arman una comparación
  («Ver todos sus datos en la tabla», «Sumar a mi comparación» y «Comparar con…») llevan a la **vista Tabla** (`mostrarVista('tabla')`) también cuando se abrió
  desde Ayudame a elegir, Grupos o Ranking; antes cerraban la ventana y dejaban la pantalla anterior (`ficha-ver-tabla.spec.js`).
- **Respaldo de fábrica** (2026-10-10, pedido del usuario: en Argentina da miedo conseguir repuestos;
  después del precio es de lo que más pesa): `MARCAS_INFO[marca].fabrica_mercosur` = planta que
  **ya produce** autos en el Mercosur, con fuente (BYD, GWM en Haval/Ora/Tank/Poer, Chery por CAOA,
  Changan por CAOA; las anunciadas no cuentan: Geely, Leapmotor, GAC, MG, Omoda/Jaecoo). Es de la
  marca, no del auto. En Ayudame a elegir suma 1 que lo traiga la casa matriz y .6 la fábrica en el
  Mercosur; en A tu medida es el criterio "Respaldo de fábrica" (`rkRespaldo`, en "Mucho" por
  defecto); en el comparador cuenta como otra fila; en la tabla, "Fábrica en Brasil" en la fila del
  importador. Revisar las anunciadas cuando empiecen a producir.
- **Respaldo** (2026-10-09, pedido del usuario): las dos garantías están en `PCTL_DIR` (años y,
  a igual plazo, kilómetros: vale años + km/250.000, sin pasar nunca un año; 2026-10-09): tienen barra, ★ y ranking. Quién lo importa
  (`IMPORTA_FABRICA`: BYD, Omoda, Jaecoo y Leapmotor los trae la casa matriz, según
  `MARCAS_INFO`) cuenta como una fila más en "Gana en más filas" cuando los elegidos difieren,
  y en Ayudame a elegir suma puntos y aparece como motivo.
- **Tarjetas de Ayudame a elegir** (2026-10-10): el nombre abre la ficha (issue #87, 2026-11-01; ya no hay
  botón «Ver ficha»: la tarjeta queda con menos texto) y se ve como el de la Tabla: color del texto, sin
  subrayado en reposo y subrayado entero al pasar el mouse. A lo sumo **4 renglones**, cada uno de una línea en el celular (~26 caracteres): precio y
  propulsión, cómo es el auto (tipo, tamaño, largo, kW) y los dos motivos que más pesan (respaldo de
  fábrica primero). En escritorio, preguntas a la izquierda y sugerencias a la derecha
  (`.elegir-cuerpo`), para que la primera pantalla muestre los autos con su información. El botón principal de la barra ("Estos 4") es más grande y destella (`destelloComparar`,
  quieto con `prefers-reduced-motion`): las respuestas elegidas también son verdes.
- **Pedir cotización**: WhatsApp solo con número internacional; elige el contacto de la marca.

## Service oficial y llamados a revisión (2026-10-11)

- **Service oficial programado** (`SERVICE_MARCAS` por marca y `SERVICE_OFICIAL` por slug): la lista
  que publica cada marca en su sitio, tal cual (moneda, IVA, qué incluye, vigencia), hasta 5 años o
  100.000 km, con la suma. Solo si la lista es del **mismo modelo y versión** de la tabla: quedaron
  afuera los Tiggo 7 Pro MHEV y PHEV (la lista dice "Tiggo 7 Pro Hybrid" para los dos), JAC S2 (manual
  o CVT), JS8 Pro y T9, DFSK E5 Plus (E5 o E5P), Jetour X70 FL y T1 i-DM, Poer Super Luxury y el EV 30X
  (sin precios). La de BYD está vencida (mayo y junio de 2026) y lo dice. **Las listas no se comparan
  entre marcas** (GWM y Changan cobran solo mano de obra, aceite y filtros): no hay ranking ni "costo
  total". MG publica solo el intervalo, sin precios.
- **Llamados a revisión** (`LLAMADOS`, `LLAMADOS_FUENTE`): el registro oficial de alertas de productos
  de Defensa del Consumidor. Un auto que no figura dice "No figura ninguno en el registro", nunca "sin
  problemas". Al 10/10/2026 el único de la tabla es el Tiggo 4 Pro (lote de ejes traseros, junio 2024).
  **Carga completa del 2026-11-04** (pedido de Mati: «cargá todos y marcá los dudosos»): el registro es un Google Sheet público que la
  propia página de argentina.gob.ar carga (con la clave de esa página; Mati autorizó leerlo); sus filas están en orden de carga y las
  fechas vienen mezcladas (AAAA/MM/DD y AAAA/DD/MM). Se cargaron los llamados de **2024 en adelante** que nombran un modelo de la tabla
  (60 autos, 164 llamados). Una fecha que admite las dos lecturas se resuelve por la cercanía con las filas vecinas y lleva `"dud":1`: la
  ficha dice «(fecha por confirmar)». No se asignó un llamado a un auto por analogía (Ranger Raptor no es el Ranger LTD+; el F-150 HEV
  no es el Raptor; «Lexus» a secas no es ningún modelo). Cada llamado alcanza solo a ciertos lotes o años y el registro no siempre
  aclara cuáles: la ficha lo dice. La rutina (tarea I) lee la hoja con el navegador integrado desde la página y suma lo nuevo.
- Los dos van en la página de cada auto y en `autos/<slug>.html`. La rutina los revisa (tareas I y J).
  `tests/e2e/service.spec.js` falla si una lista no tiene fuente https o es de otra marca.

## Listas mensuales de Stellantis (2026-11-04, pedido de Mati: «sin que yo navegue por Stellantis»)

- Stellantis publica cada mes una nota de prensa en `media.stellantis.com/ar-es/corporate/press` con las listas de precios en PDF adjuntas
  (`uploads/ar/attachment/<n>/listadeprecios_<marca><mes><año>-<hash>.pdf`). **El bloqueo era solo de WebFetch**: la página y los PDF bajan con `curl`.
- `herramientas-stellantis.py` descubre la lista más reciente (prensa de los últimos 45 días), baja los PDF a `insumos/stellantis-AAAA-MM/` (fuera de git), lee su texto
  (`herramientas-pdftxt.swift`, PDFKit) y compara 28 autos mapeados (Fiat, Jeep, RAM, Peugeot, Citroën, Leapmotor) contra la tabla; `--aplicar` actualiza celdas, `HISTORIAL_PRECIOS`
  (si es USD) y `precios-historial.json`. **DS no se lee por texto** (el PDF no liga cada precio con su modelo): el DS 7 se carga a mano mirando la imagen. La rutina semanal
  lo corre (tarea L). El 2026-11-04 cargó la lista de octubre: Titano Ranch (de $72.370.000 del configurador a $75.270.000 de la lista), C4 Hybrid MAX y C5 Aircross MAX (de s/d
  a precio) y el DS 7 Plug-in Hybrid AWD (USD 69.400 de la lista; antes USD 72.000 «valor especial» del sitio).

## Base de datos en Neon (2026-11-04, pedido de Mati)

- **La base es la fuente de verdad; el sitio no la lee al cargar.** Un viaje a Neon suma 100 a 400 ms con la base dormida: por eso un build
  **exporta** la base a `index.html` y a los JSON, y el visitante sigue bajando archivos estáticos desde el borde de Vercel (latencia igual que hoy).
- `db/MODELO.md` (modelo conceptual, invariantes y etapas), `db/schema.sql` (esquema `autolofy`), `db/cargar.mjs` (repo → base),
  `db/exportar.mjs` (base → las mismas estructuras) y `db/ida-y-vuelta.mjs`, que carga todo en PGlite (Postgres embebido, no toca Neon) y falla si lo
  exportado no es **idéntico** a `DATA`, `LLAMADOS`, `VIDEOS`, `HISTORIAL_PRECIOS`, `precios-historial.json` y las promos de `concesionarios.json`. Corre en el
  job `db` de GitHub Actions. Con `AUTOLOFY_DB_URL` (cadena de Neon, del Keychain, nunca a un archivo) los mismos scripts cargan Neon.
- **Etapa 1** (hecha): marcas, autos, categorías, filas, celdas (partidas en origen/valor/detalle) con su fuente, historiales de precios, concesionarios,
  promos con sus versiones, llamados, videos y ventas por marca. **Etapa 2** (hecha el 2026-11-05): colores, fotos (vista y crédito), fotos descartadas, logos, service oficial,
  gastos para patentarlo y tasas del BCRA; `fotos-fuentes.tsv` y `fichas-fuentes.tsv` se cargaron el 2026-11-05 (etapa 2b, `schema-etapa2b.sql`: `foto_fuente`, `ficha_fuente`, `portada_commons`, `portada_oficial`; `fichas-fuentes.tsv` mezcla tres clases de fila y la base las separa, con `linea` para reconstruir el orden); `RED_OFICIAL` es derivado y no se guarda.
  **Etapa 3** (2026-11-05): `db/sincronizar.mjs` rehace el esquema de Neon desde lo que quedó en `main` y comprueba (`db/verificar.mjs`, la misma comparación de la prueba de
  ida y vuelta) que la base exporta idéntico a `index.html` y a los JSON. La rutina semanal lo corre al final (paso 5; si falla, avisa y el sitio no se ve afectado).
  **La fuente de verdad sigue siendo el repo**: la base es hoy un espejo verificado. Invertirlo (que la rutina escriba en la base y un build regenere `index.html`) exige
  que el exportador reproduzca **byte a byte** el texto de cada constante de `index.html`, y hoy lo reproduce solo como estructura; queda para cuando haga falta.
- **Neon vive en Vercel** (se creó desde Storage, integración de Marketplace): la cadena directa está en el Keychain, servicio `neon-autolofy-db`, cuenta `cadena-conexion`
  (skill `crear-base-neon`). Se carga con `AUTOLOFY_DB_URL=… node db/cargar.mjs` (base vacía) o `node db/cargar.mjs --etapa2` (sobre una base que ya tiene la etapa 1).
- El proyecto de Neon es propio (`autolofy`), nunca `neondb` ni los de gimnasio o mensajeria.

## Gastos para patentarlo y cuota (2026-10-11)

- **Gastos para patentarlo** (plegado en la página de cada auto, `IMPUESTOS_AR`): el arancel del
  Registro (1%, 0,8% por el Registro Único Virtual), el sellado de la provincia elegida (se guarda
  como la de "Dónde comprarlo") y el formulario 01, **sobre el precio de lista**, como estimado. Para
  la provincia elegida, la patente anual no se calcula (depende de la valuación de cada provincia): va
  el beneficio para eléctricos e híbridos con su norma. Las lecturas dudosas de la investigación (Santa Fe, La Pampa,
  San Luis, Neuquén, Catamarca) van en la nota de esa provincia (`sn`), a la vista. Santiago del
  Estero no tiene sellado consolidado: "s/d". Jujuy, Chubut y Neuquén cobran distinto a eléctricos
  e híbridos (`sev`, `shev`); un mild-hybrid paga como naftero y su patente lo aclara.
- **¿Dónde cuesta menos patentar?** (2026-10-31, pedido de Mati; plegado dentro de Gastos para patentarlo,
  `#fichaMenos`, porque `#fichaDonde` es Dónde comprarlo): las 24 jurisdicciones ordenadas por alta
  (Registro 1% + sellado) más 5 años de patente, sobre el precio de lista. La patente es `pa` (% por año
  para un 0 km a combustión de unos $ 50 millones, 2026) con su calidad `pac` (`ley`, `estimada` por el
  informe de UADE o `sin verificar`) y su fuente `paf`; `pme`/`pmh` son el factor de cada año para
  eléctricos e híbridos (solo los beneficios claros; los que vencen en 2026 o son dudosos van en `pbn`).
  **Lo no verificado no se inventa:** Chaco, Santiago del Estero y Santa Cruz van `pa: null` ("s/d", al
  final) y la provincia de Buenos Aires queda `sin verificar` (la Ley 15.558 es una imagen; la escala sale
  de la prensa). Arriba va la regla del domicilio real: la patente la cobra la provincia donde vive el
  titular. La investigación está en `plan-negocio/investigacion-patentamiento.md`.
- **¿Cuánto pagarías por mes?** (plegado): sistema francés con la **TEA máxima** que cada banco informa
  al BCRA (`TASAS_BCRA`, entre `/*tasas:inicio*/` y `/*tasas:fin*/`, lo escribe
  `herramientas-tasas.py`; la rutina lo corre, tarea K). **Sigue bajando del BCRA** (Régimen de Transparencia): la base
  macroeconomia no tiene las líneas de cada banco, solo tasas promedio del sistema (BADLAR, TAMAR, préstamos
  personales), que no sirven para esta cuenta. Solo líneas para 0 km de bancos, en pesos o
  UVA, informadas en los últimos 200 días; la del Banco Nación es la +Autos (el BCRA la lista como
  personal). La página dice que es la tasa máxima y que el CFT suma seguros y gastos.
  `tests/e2e/costos.spec.js` cubre los dos.

## Concesionarios (2026-10-05)

- **`concesionarios.json`** va aparte, como las fotos: la página lo baja recién al abrir la
  vista "Concesionarios" o "Dónde verlo" en la página de un auto. **No renombrarlo ni
  moverlo** (lo sirve Vercel). Si falta, la página avisa y no rompe.
- **Historial de promos** (2026-11-04, pedido de Mati: «que los cambios de precios y promos queden persistidos»): `promos-historial.json`
  (Vercel lo sirve, pero la página no lo lee; lo escribe `herramientas-promos.py`, que se corre **siempre** después de tocar las promos de `concesionarios.json`). Compara lo
  publicado hoy (de cada marca y de cada local) con lo guardado y registra primera vez que se vio, cada cambio de texto, precio, descuento o
  vigencia (`versiones`), última vez y cuándo se retiró. Las promos vencidas siguen saliendo de `concesionarios.json`, pero quedan en el
  historial.
- **Historial de precios en cualquier moneda** (2026-11-04): `HISTORIAL_PRECIOS` (en `index.html`) sigue siendo solo dólares de la misma versión y
  alimenta Novedades y los RSS. `precios-historial.json` (Vercel lo sirve y la ficha lo lee para el historial en pesos; lo escribe `herramientas-precios.py --desde AAAA-MM-DD`, que lee la fila de
  precio de `DATA`) guarda además los precios en pesos: por auto, cada precio con moneda, monto, versión y desde cuándo rige; la primera entrada
  de cada auto es la línea base (`desde: null`). Se corre **siempre** después de tocar un precio (tarea D). `tests/e2e/precios-historial.spec.js` falla si falta registrar uno. `tests/e2e/promos-historial.spec.js` falla si el historial no está al día.
- **Solo la red oficial** que publica cada marca o su importador en su sitio (buscador,
  API o JSON que la página carga). Nada de directorios, Maps ni listados de terceros.
  Muchas redes cargan los datos por JS: la URL de esos datos va en `fuente` junto a la
  página.
- **Solo datos de empresa**: un mail con nombre de persona (`juan.perez@…`) no se carga.
  Una razón social con nombre propio ("Darío Gordo S.A.") sí.
- **Esquema**: `marcas[marca] = {fuente_red[], total, nota, aviso}` y cada local
  `{nombre, marcas[], provincia, ciudad, direccion, telefono, whatsapp, email, web,
  horarios, servicios[venta|posventa], fuente[], consultado, nota?}`. `provincia` es una
  de las 24 con nombre oficial (CABA como "Ciudad Autónoma de Buenos Aires"). `fuente`
  es **siempre una lista de URLs**. `nota` es trazabilidad (contradicciones de la fuente)
  y no se muestra. Una marca sin red lleva `aviso`, que sí se muestra.
- Un local que está en la red de varias marcas va **una sola vez** con todas. Si cada
  red publica otro teléfono o mail, el campo los lleva con la marca adelante
  ("GWM: …; Changan: …"); la tarjeta hace link de cada número por separado.
- **WhatsApp es link solo si viene en formato internacional (54…)**: pasar un número
  local a internacional sería adivinar.
- Deepal publica la red de Changan; Arcfox, la de BAIC; los talleres de Jetour son la red
  de servicio de Famly, su importador; smart, la de su buscador (concesionarios Mercedes-Benz
  que la venden). Omoda/Jaecoo, SWM, Skywell, Stelato y Rely no publican red.
- `tests/e2e/concesionarios.spec.js` falla si una marca de la tabla no figura, si un
  total no coincide, si un local no tiene fuente https o provincia normalizada, o si hay
  locales repetidos.
- **Dónde comprarlo** (2026-10-08, pedido del usuario): en la página de cada auto, los locales
  que VENDEN la marca, con su zona, la distancia y los precios y promos publicados; arriba la
  mejor oferta publicada y el local más cercano que la tiene.
  - Ubicación de cada local: `lat`, `lon`, `geo` (`red` = pin de la red oficial, `direccion` =
    Georef, `localidad` = centroide de Georef) y `partido`/`localidad` de Georef para la zona.
    Nunca una coordenada a mano. 13 locales sin coordenadas (solo provincia).
  - Ubicación de quien mira: el GPS **solo al tocar "Usar mi ubicación"**, no sale del navegador
    ni se guarda; o el partido/departamento que elige (`localidades`: los 529 centroides de
    Georef), que sí se guarda en su navegador. Distancia en línea recta.
  - Promos: `marcas[m].promos` (lo que publica la marca para toda la red) y
    `concesionarios[i].promos` (lo que publica el sitio del propio local). Cada una
    `{autos:[slug|"*"], tipo, texto, precio?|descuento? {moneda, monto}, version?, vigencia,
    fuente[], consultado}`. Solo el sitio de la marca o del propio concesionario: nada de
    clasificados, comparadores, prensa ni redes. **Un monto sin moneda clara no lleva
    `precio`** (queda en el texto); nunca convertir monedas. Una promo de la marca no se copia
    a cada local. Las vencidas no se muestran; la rutina (tarea G) las saca y busca nuevas.
  - "Mejor oferta" = el precio final más bajo publicado en la moneda del precio de lista (USD si
    hay), o si no hay precios, el mayor descuento. Sin datos, la página dice que nadie publica.

## Colores (2026-10-06)

- Sección "Colores en Argentina" en la página de cada auto, desde `COLORES_AR` (por slug):
  `{c: [nombres] | null, f: url, d: tipo de fuente, n: nota}`. Los nombres van **tal como
  los escribe la marca** (sin traducir ni inventar el tono), y solo de fuentes oficiales
  argentinas: ficha AR, sitio o configurador de la marca. Nada de otros mercados.
- Si la ficha y la web oficial no coinciden, va **la más reciente** (casi siempre la web) y
  `n` dice en qué difiere la otra. Si se contradicen sin forma de saber cuál vale (Kaiyi
  X3/X3 Pro/X7), `c` queda en null con el motivo.
- **Muestra de cada color** (issue #72, 2026-10-30, pedido de Mati): `m`, alineado con `c`, lleva por color
  `[hex, url]` o `null`. El hex sale del código que publica la marca (configurador, sitio) o del centro del chip
  que dibuja al lado del nombre; **nunca del nombre ni de una foto del auto**. Queda en `null` si el nombre del
  sitio no es el mismo de la lista (un «Rojo» genérico no es «Bloodstone Red»), si sale de otro modelo, o si el
  chip tiene brillo y el centro no es el color. El 2026-10-30 quedaron 548 de 749 con muestra; Audi, Citroën,
  Renault, Arcfox y Forthing no publican una usable.
- 81 de 124 autos tienen colores; los demás no los publican con nombre (BAIC dibuja muestras
  sin nombre, MG solo tiene códigos internos, los no lanzados no tienen página).
  `tests/e2e/colores.spec.js` falla si una lista no tiene fuente https.

## Reseñas en video (2026-10-09)

- Sección "Reseñas en video" en la página de cada auto, desde `VIDEOS` (por slug):
  `[{canal, id, t, f, s}]` = canal, id de YouTube, título tal como está publicado, fecha de
  publicación (AAAA-MM-DD) y duración en segundos. Fecha y duración salen de YouTube, no se
  estiman.
- Las **pruebas** son del mismo modelo y versión que está en la tabla (motor, tracción e
  hibridación iguales a la fila de `DATA`). Desde el 2026-10-09 (pedido del usuario) también van,
  con su `tipo` y su etiqueta: `adelanto`, `presentación` (sin manejo), `informe` (varios autos,
  salones) y `otra versión` (contacto con la de otro mercado, con `n` diciendo cuál). Sin `tipo`
  es prueba. Siguen sin ir: modelos viejos o de otra generación y contenido pago de la marca.
  La prueba va primero y el botón de la tabla apunta a ella; sin prueba, al video más reciente.
- Primer canal: Matías Antico (@MatiasAnticoTV, 12 autos; revisados sus 984 videos el 2026-10-09).
  Un contacto corto al volante (Short) vale si es la misma versión: B10 y X55 Plus. Quedaron
  afuera el C10 (manejado en China con 223 CV, la tabla tiene 215) y el Dolphin Mini (manejado
  en Roma con la versión europea), además de las presentaciones sin manejo (Kaiyi, GAC, Maxus
  en Expoagro, salones). Para sumar otro periodista, mismo criterio.
- **Segunda pasada (2026-11-02, pedido de Mati: «videos de Matías Antico a todos los que le faltan»)**: se revisó el catálogo completo del canal
  (937 videos y 53 shorts, bajado con `yt-dlp --flat-playlist`; fecha y duración de cada video elegido, con `yt-dlp --print`, nunca estimadas) contra los 236 autos sin video, y 67
  ganaron uno o más (96 de 265 autos tienen video). Mismo criterio: misma generación y mismo motor, tracción e hibridación que la tabla; un test de otra
  versión del mismo auto entra si coincide la mecánica (Montana Premier por RS, Amarok Extreme por Black Style); quedaron afuera los de generación vieja o
  anterior a una renovación (GLB 2019, Vento GLI 2019, Tiggo 2 de 2018, Kwid 2019) y los de otro motor (BJ30 4x2 contra 4x4, X55 II Hybrid contra el naftero). YouTube
  bloquea `yt-dlp` por exceso de consultas (HTTP 429): para volver a revisar el canal conviene espaciar los pedidos. Sin video del canal, por no haberlo hecho: Audi,
  Forthing, Arcfox, Dongfeng, Changan, Skywell, GAC Aion, Lynk & Co, Omoda, Porsche, smart, MINI, JAC, Stelato y otros.
- En la tabla, cada auto con video lleva un botón **"Video"** en su encabezado que abre su prueba
  **más reciente**, con canal, fecha de subida y título al pasar el mouse (2026-10-09). En la
  página del auto, los videos van del más nuevo al más viejo (`videosDe`).
- El reproductor (youtube-nocookie) se carga recién al tocar «Ver acá»: la página no baja
  nada de YouTube de entrada. Las páginas estáticas de `autos/` solo llevan el link.
  `tests/e2e/videos.spec.js` valida los datos y que no haya pedidos a YouTube antes del clic.

## Páginas por auto (2026-10-06)

- `herramientas-paginas.py` genera desde `index.html` una página estática por auto
  (`autos/<slug>.html`, servida como `/autos/<slug>` por `cleanUrls` de `vercel.json`), con
  título y descripción propios, datos estructurados schema.org `Car`, la ficha completa y
  los colores; además `sitemap.xml`, `robots.txt` y la lista de links del pie del
  comparativo (entre `<!-- autos:inicio -->` y `<!-- autos:fin -->`).
- **Todas las fotos** (2026-11-06, pedido de Mati): la página muestra la portada y debajo «Más fotos» con las demás (`galeria_html`), cada una con su vista y su
  crédito, tomados de `FOTOS_POR_AUTO`, `VISTAS_POR_FOTO` y `CREDITOS_POR_FOTO`.
- Existen porque la página de cada auto del comparador se arma en el navegador (`?auto=`):
  Google no la indexa y al compartirla se veía siempre la misma vista previa.
- **RSS de cada auto** (`autos/<slug>.xml`, 2026-10-11): sus cambios de precio de lista (misma
  versión) y las promociones vigentes que lo nombran, de la marca y de cada local. Es el "aviso" de
  "Seguir un auto" para quien no entra al sitio. Un auto sin novedades da un RSS vacío, no se omite.
- **Comparaciones "X vs Y"** (`comparar/<a>-vs-<b>.html`, servidas como `/comparar/a-vs-b`,
  2026-10-11): cada auto a la venta o en preventa con precio en dólares contra sus 2 rivales más
  cercanos (`rivales()`: misma carrocería, con SUV y crossover juntos y los 4x4 con reductora entre
  ellos; largo, precio y familia de propulsión; nunca a más de 45 cm de largo ni 35% de precio).
  Muestran solo las filas donde los dos dicen distinto y linkean a la comparación interactiva. La
  página de cada auto linkea sus comparaciones. Un par cambia si cambia un precio: el script borra
  las que ya no van.
- **Quién hace esto** (`/quien-hace-esto`, 2026-10-11, lo arma `quien()`): en primera persona, como lo
  contó el dueño: lo hace un particular sin relación comercial con marcas ni concesionarios, porque
  tiene un BYD Song Pro GS y quiere que otros evalúen los chinos con datos (y lo dice para que se
  tenga en cuenta). **Solo afirma lo que es cierto**: si se suma publicidad o algo que mida visitas,
  hay que cambiar "Privacidad"; `paginas.spec.js` falla si aparece un script de seguimiento conocido.
- **Sugerencias** (2026-10-11; empezó como "¿Dato mal?"): un Google Form del dueño (en su cuenta
  personal; el detalle, en `CONTEXTO_LOCAL_PRIVADO.md`) para un dato mal, un auto que falta o una idea:
  las respuestas van a una planilla que solo ve él y le llega un mail con cada una. Se abre precargado
  con el auto desde su página, su página estática, el pie y "Quién hace esto" (`FORM_SUGERENCIAS`,
  `sugerenciaURL`; los `entry.N` son los de cada pregunta: si se rehace el formulario, cambian). Si es
  un dato, pide la fuente.
- **No agregan datos ni se editan a mano.** Si cambia `index.html`, se regeneran:
  `tests/e2e/paginas.spec.js` falla si quedaron desactualizadas (corre el script con
  `--check`). La rutina semanal lo hace sola (tarea F).

## Logos (2026-10-05)

- En la vista Grupos (grupo y cada marca) y en el filtro de Marca. Archivos en `logos/`,
  el respaldo de cada uno (archivo de Commons, licencia, autor, página) en
  `logos-fuentes.tsv`, y en el script `LOGOS`, `LOGO_MARCA` y `LOGO_GRUPO`.
- **Logos oficiales de la marca, sin modificarlos, o de Wikimedia Commons con licencia libre** (decisión de Mati del 2026-11-02, issue #124: no le
  preocupan las licencias de marca). Se prefiere el de Commons cuando existe y es el vigente; si no, el que publica la marca (kit de prensa o su sitio). Cada
  uno se anota en `logos-fuentes.tsv` con su `origen` (`commons` u `oficial`), y el cartel dice «Logo: Wikimedia Commons, dominio público» o «Logo oficial de la marca».
  **Lo único que no se hace es recortar, recolorear ni redibujar un logo** (a un SVG sin `viewBox` solo se le agrega). Ese día entraron 33 de las 40 marcas que
  faltaban (24 de Commons y 9 oficiales: GAC, Changan, Skywell, Chevrolet, Nissan, Stelato, DFSK, Forthing y JMC, más Maxus). Los blancos o claros llevan `osc: true` (placa oscura).
  Dudas: Peugeot, Porsche y DS solo tienen el logotipo con letras (no el escudo); Honda, el logotipo y no la H; Fiat, el roundel de 2006; JMC trae un cartel de
  «15 años en Argentina»; Skywell, solo el símbolo. **Todas las marcas tienen logo** (JMEV entró el 2026-11-09, pedido de Mati: logo oficial de `jmevargentina.com.ar/JMEV-Logo.png`, 600×338 con fondo transparente; no está en Commons y `jmev.com.cn` no abre por un certificado inválido: se encontró abriendo el sitio argentino con el navegador integrado y leyendo los `<img>` de la página). El 2026-11-09 (pedido de Mati) entraron Arcfox (vertical del sitio oficial, arcfox.com.ar), Rely
  (relyargentina.com.ar; es blanco, `osc`), smart y Subaru (Commons, dominio público; el vigente de Subaru con 13 imágenes embebidas sigue descartado: va `Subaru logo.svg`) y SWM, con el
  **emblema de Shineray** de shineray.com.ar (SWM no publica un logo propio en su importador: dudoso, cambiarlo si aparece). **Las marcas salen en orden alfabético** (filtro Marca,
  Concesionarios, y en Grupos los grupos y las marcas de cada grupo). **Regla general** (`ordenarLista`, pedido de Mati del 2026-11-09): una lista de más de 6 elementos va alfabética; con 6 o menos, por popularidad (unidades patentadas en 2026, `popularidadMarca`). Con un grupo filtrado, la lista de Marca muestra solo las marcas de ese grupo. Las ventas siguen por unidades).
- Un grupo usa el logo de su marca solo si es el mismo logo. Los logos van sobre placa
  blanca en los dos temas (`--logo-fondo`); los blancos (Soueast), sobre `--logo-fondo-osc`.
- Un SVG sin `viewBox` no escala dentro de `<img>`: se le agrega con su ancho y alto.
  `tests/e2e/logos.spec.js` falla si un logo no está anotado, si un SVG trae scripts o
  recursos externos, o si alguno queda roto en pantalla.

## Diseño: ficha técnica oficial (2026-10-04)

Rediseño con la skill frontend-design, dirección elegida por el usuario. Para no deshacerlo:
- **Tipografía**: Barlow (texto), Barlow Semi Condensed (tabla y números, cifras
  tabulares), Barlow Condensed (títulos, nombres de autos, categorías). **Embebidas en
  base64** al principio del `<style>`: no cargar Google Fonts (el archivo es autocontenido).
- **Color**: papel frío `--paper`, tinta `--byd-blue-dark` (el nombre es histórico) y la
  escala A–E de la etiqueta de eficiencia (`--etq-a`…`--etq-e`) **solo para codificar
  información**: percentil (`.pct.n0`…`n4`) y origen del dato. Nada de colores fijos nuevos.
- **Lo memorable es la franja de origen** a la izquierda de cada celda: ámbar = otro
  mercado o prensa (EXT), gris azulado = aclaración (NOTE), rayado = sin dato (NR). Los
  emojis 🔶 ℹ️ ya no se usan; el texto para lectores de pantalla va en `.sr`, anclado a su
  celda (un `.sr` suelto estiró la página a 15.000 px en el celular: lo cubre un test).
- **Sin chrome de plantilla**: nada de emojis en botones ni títulos, etiquetas en
  mayúsculas, separadores "·" en textos de estado, ni flechas "➜". Radios por jerarquía
  (3px chips, 4px botones, 6px paneles, 2px fotos); ranking y ficha como planilla con
  reglas, no tarjetas con sombra.

## Editar `DATA`

Es una sola línea de ~480 KB, así que reemplazar por línea no sirve. Tratarlo como JSON:

```python
import json
content = open('index.html').read()
start = content.index('const DATA = [')
idx = content.find('];', start)
data = json.loads(content[start+len('const DATA = '):idx+1])
# ... modificar `data` ...
new = json.dumps(data, ensure_ascii=False, separators=(',', ':'))
content = content[:start] + "const DATA = " + new + content[idx+1:]   # idx+1: json.dumps ya cierra el ]
open('index.html', 'w').write(content)
```

`CARS` **no** es JSON válido (keys sin comillas): editarlo con regex sobre objetos
`{...}` completos.

**Escribir el archivo al final, después de que todos los reemplazos hayan pasado.** Si
un `assert` falla a mitad, el archivo queda intacto en vez de a medio editar.

---

## Fotos

- **Flechitas en las miniaturas** (2026-10-09, pedido del usuario): toda miniatura de un auto
  (encabezado de la tabla, selector, Similares, Ranking, Parecidos y Ayudame a elegir) va en
  un `.minicar` con `‹ ›` que cambian la foto en el lugar (`miniFoto`, `miniFlechas`). Si
  después se agranda, el zoom y el visor arrancan en esa foto (`miniK`). Las flechas nunca van
  dentro de otro botón y su clic se toma en la captura de `window`: no abre la página del auto,
  no tilda el selector ni abre el zoom. Para copiar la portada de un `<th>` se usa
  `portadaDe(img)`, no `img.src` (puede estar mostrando otra foto). En las fotos chicas
  (`.minicar.chica`: Similares, Ranking, Parecidos) las flechas aparecen solo al pasar el mouse
  y en pantallas táctiles no van, porque tapaban la foto (pedido del 2026-10-09).

Cada auto tiene una foto de portada (`fotos/<slug>-1.jpg`, más una miniatura de 300×190 en
`fotos/mini/<slug>.jpg` para el `<th>`; hasta el 2026-10-06 iba embebida en base64 y pesaba
1,3 MB de los 2,7 del archivo) y, si hay material, más fotos en un carrusel: **a lo sumo una por
vista** (12 vistas: tres cuartos delantero, frente, perfiles izquierdo y derecho, tres
cuartos trasero, atrás, baúl abierto, tablero, instrumentos, consola central, asientos
delanteros y plazas traseras; pedido del usuario del 2026-10-05: dos fotos casi iguales no
suman). `FOTOS_POR_AUTO` dice cuántas tiene cada uno, `VISTAS_POR_FOTO` la vista de cada
una (se muestra en el pie de foto); los archivos van numerados **sin huecos** desde 1, la
portada primero y el resto en el orden de las vistas.

- **La vista se decide mirando la foto**, no por el nombre del archivo. Lado del perfil =
  lado del AUTO: si la trompa apunta a la izquierda de la imagen, es el perfil izquierdo.
- `reorganizar PLAN.tsv` cambia vistas, quita repetidas y reordena lo instalado. El
  2026-10-05 se pasó de 259 a 154 fotos: 51 casi repetidas y el resto de otra versión o
  generación (Yuan Pro 2021, Song Pro pre-restyling, T2 i-DM…), con volante a la derecha,
  taxis o ploteo, o con otro auto pegado. Todas quedaron en `fotos-descartadas.tsv`.
  Ese mismo día una búsqueda completa (727 candidatas) sumó 60 vistas nuevas y llevó el
  total a 214. Commons casi no tiene interiores ni perfiles de la versión argentina: el
  hueco grande sigue siendo cabina, baúl y plazas traseras.
- **Volante a la derecha = otro mercado**: no va, aunque sea el mismo modelo.
- **Fotos oficiales de la marca** (autorizado por el usuario el 2026-10-06): las galerías de
  los sitios oficiales argentinos de la marca o del importador también valen, con la marca
  como crédito ("Foto: Chery Argentina · material oficial de la marca · sitio oficial").
  Se instalan con `instalar-oficial LISTA.tsv` (slug, vista, archivo, URL de la imagen,
  página donde aparece, marca), sin recorte, y en `fotos-fuentes.tsv` llevan la URL de la
  imagen y la página del sitio en vez de las de Commons. Así entraron 180 fotos de cabina y
  baúl el 2026-10-06. Solo de la versión de la tabla y con volante a la izquierda.
- **Criterio vigente para sumar fotos: la skill `fotos-oficiales`** (`.claude/skills/fotos-oficiales/SKILL.md`;
  decisión de Sebastián del 2026-11-05, issue #143: más cantidad y calidad, más vistas por auto). En corto:
  la galería oficial se abre **con el navegador** (`node herramientas-galeria.js`; con `curl` se perdían las
  imágenes que la página carga con JavaScript: el DFSK E5 Plus quedó con 2 fotos por eso); **una imagen con IA
  o un render publicado en el sitio oficial argentino vale** (el crédito lo dice); Commons se puede relajar a
  la misma generación de otro mercado si no hay diferencias visibles; y **todo rechazo se anota**, también
  los de las galerías oficiales (`descartar-oficial` → `fotos-oficiales-descartadas.tsv`).
- **Todas las portadas miran para adelante y al mismo lado** (2026-11-10, pedido de Mati, issue #175): tres cuartos
  delantero (o frente) con la **trompa hacia la izquierda** de la imagen. La que mira a la derecha se espeja con
  `herramientas-fotos.py espejar SLUG`, que da vuelta la foto 1, la miniatura y la mediana y suma «imagen espejada» al
  crédito (CC BY pide avisar los cambios). **No se espeja un auto con la marca escrita en grande en la trompa** (BYD
  Shark, Bronco, Maxus eTerron, Rely R8, Kia Tasman): la marca se leería al revés; hace falta otra foto. Si la portada no
  muestra la trompa y el carrusel tiene una que sí, se sube con `portada SLUG carrusel N VISTA conservar VISTA_VIEJA`
  (la vieja pasa al carrusel con su fuente). Al instalar una portada nueva, mirar hacia dónde apunta la trompa.
- **La portada tiene que ser la versión que vende el importador argentino** (frente,
  rótulos, generación): se compara con la tapa de la ficha AR o el sitio oficial AR. Se
  cambia con `herramientas-fotos.py portada SLUG …`, que reescribe juntos la foto 1, la
  miniatura de `fotos/mini/`, su `data-credito`, `VISTAS_POR_FOTO` y la fila de la
  portada en `fichas-fuentes.tsv`. El 2026-10-06 se cambiaron 7 (Jetour T2, Omoda 5,
  Lynk & Co 06 y 01, Tiggo 8 Pro, BAIC X35 y Jolion Pro HEV), y después Jaecoo 7 (una
  "SHS-P" de Commons: la anterior era el naftero) y SWM G03F (en Commons es "SWM Tiger";
  la "Tiger EDi" es la electrificada y no va).

**Las fotos se agregan con `herramientas-fotos.py`, nunca a mano**: `buscar` baja y
procesa candidatas de Commons a `.fotos-candidatas/`, `instalar ID…` agrega las
aprobadas y escribe juntos `FOTOS_POR_AUTO`, `CREDITOS_POR_FOTO` y `fotos-fuentes.tsv`,
y `descartar ID "motivo"` anota el rechazo en `fotos-descartadas.tsv` por nombre de
archivo de Commons, para que no se vuelva a proponer. `tests/e2e/fotos.spec.js` falla
si esos tres lugares no coinciden o si una foto queda sin autor.

- **El crédito es por foto, no por auto** (`CREDITOS_POR_FOTO`). El `data-credito`
  del `<th>` es solo el de la portada. Antes el crédito se fijaba al abrir el zoom
  y no cambiaba al pasar de foto: con CC BY eso atribuye la obra al autor
  equivocado. **No volver a colgarlo del `<th>`.**
- `fotos-fuentes.tsv` registra archivo, vista, archivo de Commons, licencia, autor
  y página de **cada** foto. Si se agrega una foto sin anotarla ahí, la atribución
  queda sin respaldo.
- ⚠️ **La herramienta de Vision (`herramientas-recortar-fotos.swift`) no va en
  interiores**: recorta por sujeto y deja el volante flotando en blanco, sin el
  tablero. Los interiores se escalan con `sips` y se dejan con su fondo.
- Al bajar de Commons hay que **mirar el resultado uno por uno**: de 117 procesadas
  hubo que descartar 8 (volantes sueltos, un techo de vidrio con reflejo, un
  prototipo camuflado). El tamaño del archivo no delata ninguno de esos casos.
- Muchas fotos de cabina **no dicen "interior" en el nombre**, pasan por Vision y
  quedan como un volante flotando. Por eso `buscar` guarda también `ID.int.jpg`, sin
  recortar: si es una cabina entera, se instala como `ID:interior`. El 2026-09-30 así
  aparecieron 5 interiores que de otro modo se habrían descartado.
- **El modelo tiene que llamarse exactamente igual que en la tabla.** Un calificador
  de versión en el nombre (facelift, II, GT, EV, SHS, Shanhai…) se verifica contra las
  filas Tipo de propulsión y Precio; si no se puede confirmar, se descarta con ese
  motivo. EM-P y EREV sí coinciden con los PHEV/REEV de la tabla.

## Fuentes de datos

- **Fuentes no oficiales con aclaración** (2026-11-09, pedido de Mati: «no quiero tener datos faltantes»): un dato que **no sale de una fuente oficial argentina** se carga igual si
  aparece en **3 o más fuentes independientes de sitios distintos que coinciden** (ficha oficial de otro país para la misma generación y mecánica, prensa especializada, pruebas,
  bases como auto-data.net, manuales). Va como `EXT:valor|No oficial: coincide en N fuentes (…)` y su fila de `datos-fuentes.tsv` dice «No oficial, coincide en N fuentes». La regla de oro
  no cambia: **nada de deducir por ausencia, por analogía ni con datos de otra generación, motor o versión**; una sola fuente no oficial o fuentes que se contradicen no se cargan.
  Dos fuentes que copian la misma ficha no son independientes. La búsqueda se hace con un agente por auto y un script que valida (≥3 sitios distintos, la celda estaba sin dato, formato de la fila) antes de escribir en `DATA`.

- **Fuente de cada dato** (2026-11-01, pedido de Mati): todo dato que se carga o se mejora desde esa fecha va en
  `datos-fuentes.tsv`, una fila por celda (slug, fila, valor visible, `dato` o `motivo de s/d`, fuente, URL,
  sha256 o «leída en línea, sin hash», fecha). `tests/e2e/fuentes-celdas.spec.js` lo cruza contra `DATA`: el valor
  registrado tiene que ser el de la tabla. Lo anterior a esa fecha solo tiene la fuente por auto
  (`fichas-fuentes.tsv`). Las tandas de búsqueda piden la fuente por celda, no por auto.

- **Ola 5 de huecos** (2026-11-04, pedido de Mati: seguir de los más vendidos a los menos): puestos 91 a 150 de prioridad (60 autos, 2.057 celdas sin dato)
  con 6 agentes; **43 celdas cargadas en 8 autos** (BJ40 Pro 19, Jetour T2 i-DM 15, BJ30 2, Audi A3 y S3 NCAP, Lynk & Co 06, Lexus UX, MG 3, Everest, GLE 450).
  Rinde poco porque las fichas oficiales ya estaban agotadas: lo que no listan son ausencias reales, no huecos de búsqueda. Lo que sí rindió: manuales de
  usuario AR (cargados como NOTE: describen la función pero no son la ficha de la versión) y la ficha de la filial chilena de la misma versión (EXT). Dejado afuera
  a propósito: el Euro NCAP del Audi A1 (cifras de resúmenes de búsqueda, sin la fuente). **Bloqueados para curl:** MINI (el PDF viene vacío también en el navegador),
  Toyota y Lexus AR, `audi.com.ar`; los PDF de `media.toyota.com.ar` sí bajan con el navegador, y `herramientas` locales (`recv.py`) reciben de a un archivo por formulario.

**Las fichas técnicas en PDF de importadores y concesionarias argentinas rinden mucho
más que la prensa**: 25-50 celdas contra 5-10. Traen ADAS ítem por ítem, airbags,
suspensión, multimedia, luces y climatización, que las notas nunca publican.

- ⚠️ **Los links a fichas suelen venir JSON-escapados** en el HTML (`https:\/\/...`), así
  que un `grep href` normal no los encuentra **y parece que no existieran**. Des-escapar
  `\/` antes de buscar.
- ⚠️ **En fichas con columnas por versión, leer las marcas ●/x/–, no la lista de la tapa.**
  Se cargaron 7 ADAS inexistentes en un auto por leer la tapa.
- ⚠️ **Verificar que la ficha sea de la variante que está en la tabla**, no de otra del
  mismo modelo.
- `read_pdf_content` **trunca el preview a 2000 caracteres por página** y hace perder
  medias páginas sin avisar. Ante la duda, `render_pdf_page` y leer la imagen.
- PDF Tools solo accede a `~/Documents`, `~/Downloads` y `~/Desktop`.
- Las **etiquetas de eficiencia energética AR** (IRAM/AITA 10274-2) son una fuente aparte
  y a veces **contradicen** la ficha de la misma marca.

---

## Deploy

El sitio vive en **Vercel**: `https://autolofy.vercel.app/`, y publica solo con
cada push a `main`, en segundos. Netlify quedó atrás — el `netlify.toml` sigue en el
repo pero no cumple ninguna función.

La **Fecha de consulta** del pie (`#fechaConsulta`) es la de la última verificación de
las fichas oficiales, **no la de los precios**. Cada precio de la tabla lleva su fecha ("Lista del
3/10/2026", de la última entrada de `HISTORIAL_PRECIOS`; al tocarla, la última verificación de la
ficha de ese auto según `fichas-fuentes.tsv`: `fechasDePrecio()`, 2026-10-10). Un auto sin
historial no lleva fecha. La de consulta la actualiza la rutina sola, y solo si pudo verificar todas las fichas: no
tocarla a mano.

**Circuito de PR (pedido del usuario, 2026-10-09): de ahora en más, todo cambio va por pull
request.** Rama nueva desde `main`, se pushea la rama y se abre el PR en GitHub
(`gh pr create`, en borrador mientras está en curso); los commits siguientes van a esa rama.
Cuando la suite pasa, se marca listo y se activa **auto-merge when ready** (pedido del
2026-10-09: el repo tiene "Allow auto-merge" en GitHub); si no hay nada que esperar, se
mergea directo con `gh pr merge`. Después se verifica el sitio y se borra la rama (local y en
GitHub).
Nunca push directo a `main`. Vercel arma una vista previa de cada PR. La rutina semanal
también va por PR (ver abajo).
`main` está protegida (2026-10-09): para mergear exige que salgan bien dos controles, sin pedir
aprobaciones: "Vercel" (la vista previa) y "e2e" (la suite de Playwright en GitHub Actions,
`.github/workflows/tests.yml`, unos 5 a 7 minutos). **Se aplica también a administradores**
(`enforce_admins`, desde el 2026-10-09): ni el dueño ni la rutina pueden pushear directo a
`main`; todo pasa por PR. Por eso el auto-merge se puede activar apenas el PR está listo:
espera a los dos y mergea solo. Un arreglo urgente sin PR exige desactivarla antes en GitHub
(Settings → Branches) y volver a activarla después.

Los commits de este repo van con la identidad personal, no con la de kamiPay. El detalle
(mail y config de git) está en `CONTEXTO_LOCAL_PRIVADO.md`.

**Nunca dar por publicado un cambio porque `git push` salió bien** — verificar contra la
URL con un `grep` de algún marcador del cambio, no por tamaño. Vercel sirve el archivo
tal cual (a diferencia de Netlify, que inyectaba 536 bytes), así que lo servido y el repo
difieren a lo sumo en el salto de línea final.

---

## La rutina semanal también va por PR

Desde el 2026-10-09 la rutina (`herramientas-chequeo-diario.sh`, los lunes a las 09:15 por
launchd) ya no commitea a `main`: crea la rama `rutina-AAAA-MM-DD`, Claude commitea ahí, y el
script pushea la rama, abre el PR con auto-merge y espera a que se mergee (hasta 20 minutos)
antes de verificar el sitio. Si los controles de GitHub fallan, el PR queda abierto y la
rutina avisa con una notificación de macOS. Si Claude no puede autenticarse o falla, también
avisa; el 2026-09-28 la sesión venció y la pasada no corrió sin que nadie se enterara.

Como nadie revisa el PR antes de que se mergee, la prudencia reemplaza a la supervisión:
ante la duda sobre un dato, no cargarlo. Una corrida sin cambios es un resultado válido.

**El texto de las tareas (`TAREA`, `PROMPT`) va entre comillas dobles de zsh**: adentro, nada de
comillas dobles, backticks ni `$` (usar «»). Unas comillas en la tarea de videos cortaban la cadena
desde el 2026-10-09 y a Claude no le llegaban las tareas B a H (arreglado el 2026-10-11 antes de que
corriera). Después de tocar el script, `zsh -n` no alcanza: evaluar el bloque y contar las tareas.

---

## Agent skills

Configuración para las skills de Matt Pocock (`mattpocock/skills`), armada con
`/setup-matt-pocock-skills` el 2026-10-23.

### Issue tracker

Los issues viven en GitHub Issues de `mgorganchian/autolofy` y se manejan con `gh`. See `docs/agents/issue-tracker.md`.

### Triage labels

Las cinco etiquetas por defecto (`needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`). See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: un `GLOSSARY.md` y `docs/adr/` en la raíz, que se crean recién cuando hacen falta. See `docs/agents/domain.md`.
