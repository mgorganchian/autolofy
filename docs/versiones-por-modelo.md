# Todas las versiones de cada modelo: diseño (etapa 0 del issue #224)

Estado: **propuesta**, para que Mati y Sebastián la revisen. Este documento no cambia datos ni código. Las decisiones
pendientes están al final. Cada una trae la opción que propongo, y la propuesta solo vale cuando ellos dos la confirman.

## Qué resuelve

Hoy cada columna de la tabla es una sola versión por modelo, en general la más cara (regla del 2026-10-29). Con este
diseño, la tabla sigue con una columna por modelo y cada modelo pasa a tener todas sus versiones a la venta. Cada
versión lleva su precio y las filas que cambian entre una versión y otra. Con eso se arman tres cosas:

- el precio «desde» del modelo, en los filtros, el Ranking y Ayudame a elegir;
- una tabla de versiones del mismo auto en su página, que muestra solo las diferencias;
- la versión que Ayudame a elegir sugiere, que es la que entra en el presupuesto.

## Glosario

- **Modelo**: lo que hoy es un «auto» de `CARS`, o sea una columna de la tabla. Conserva su slug `marca-modelo`
  (`ford-territory`). No hay que renombrar nada: los links, los seguidos y `SLUG_VIEJO` siguen andando.
- **Versión**: una configuración que la marca vende con nombre y precio propios (`Territory SEL`, `Territory Titanium`).
  Su slug es el del modelo más un sufijo: `ford-territory-sel`. Se valida con un test: el slug de una versión siempre
  arranca con el de su modelo.
- **Versión de referencia**: la versión que la columna del modelo muestra en la tabla. Cada modelo tiene exactamente
  una. Mientras Mati y Sebastián no decidan otra cosa, es la de hoy, la tope de gama. Así la tabla no cambia el día que
  se cargan las versiones.
- **Fila del modelo**: un dato que es igual en todas las versiones porque es del modelo. Son las medidas, la plataforma,
  las garantías, el origen, el importador, las ventas y el NCAP.
- **Fila de versión**: un dato que puede cambiar entre versiones. Son el precio, el motor y la potencia, la caja, la
  tracción, el consumo, las llantas, los ADAS, los airbags, la multimedia, el techo, los asientos, las luces y la
  climatización. La lista cerrada va en `FILAS_DE_VERSION` y se arma en el piloto con lo que muestren las fichas.

## La regla que protege a la regla de oro

**Una versión no hereda las filas de versión de su modelo.** Que la Titanium tenga ACC no prueba que la SEL lo tenga, y
que la ficha no lo marque tampoco prueba que no lo tenga. Por eso, en cada versión:

- cada fila de `FILAS_DE_VERSION` se carga de forma explícita con su fuente: un valor, un `NR` con el motivo, o
  `=ref` (ver abajo);
- `=ref` («igual que la versión de referencia») vale solo cuando la ficha muestra las dos columnas y marcan lo mismo.
  El test controla que toda celda `=ref` tenga su fila en `datos-fuentes.tsv`;
- una fila del modelo se hereda sola. Si la ficha de una versión dice otra cosa (por ejemplo otro alto por las llantas),
  esa versión la pisa con su propio valor y su fuente.

## Dónde viven los datos

`index.html` pesa hoy 4,2 MB y `DATA` ocupa unos 480 KB. Unas 700 versiones nuevas con 25 filas cada una suman
alrededor de 17.500 celdas, que agregarían 1 MB o más. Por eso propongo partir los datos en dos:

| Qué | Dónde | Por qué |
|---|---|---|
| Nombre, precio, moneda y fecha de cada versión (`VERSIONES_PRECIO`, por slug de modelo) | Embebido en `index.html`, con marcadores `/*versiones:inicio*/` y `/*versiones:fin*/` | El precio «desde», el Presupuesto y Ayudame a elegir lo necesitan apenas carga la página. Son unos 40 KB |
| Las filas de versión de cada versión | `versiones.json`, servido junto a la página. La ficha y la tabla de versiones lo bajan recién cuando hacen falta, como `concesionarios.json` | Es el bloque pesado, y casi ninguna visita lo usa |

El CLAUDE.md lista una por una las excepciones al archivo único. Para sumar `versiones.json` a esa lista hace falta que
Mati y Sebastián lo aprueben (decisión 5).

Forma propuesta:

```js
// index.html: lo que se usa al cargar (ejemplo de forma, sin precios reales)
const VERSIONES_PRECIO = {
  "ford-territory": [
    {v: "ford-territory-sel", n: "SEL", p: "<lista de la SEL>", ref: false},
    {v: "ford-territory-titanium", n: "Titanium", p: "<lista de la Titanium>", ref: true}
  ]
};
```

```json
// versiones.json: filas de versión, con el mismo formato de celda que DATA (NR:, NOTE:, EXT:, DET:)
{"ford-territory-sel": {"Control crucero adaptativo (ACC)": "NO", "Techo solar/corredizo panorámico": "=ref"}}
```

La versión de referencia no se repite en `versiones.json`: sus celdas son las de la columna de `DATA`. Un test controla
que el precio de la versión `ref: true` sea el de la fila de precio de `DATA`.

## Qué cambia en cada parte del sitio

- **Tabla.** Las 5 estructuras de CLAUDE.md (`CARS`, `<th>`, `<col>`, `DATA`, `colspan`) y las 6 invariantes no
  cambian, porque la tabla sigue teniendo una columna por modelo. En la etapa 4, cada encabezado suma un selector de
  versión que reescribe las celdas de su columna desde `versiones.json`. Las celdas se buscan por `td[data-col]`, que es
  lo que ya hace el orden de columnas. La URL lo guarda: `?autos=ford-territory~sel,toyota-corolla-cross`. El `~` separa
  el modelo de la versión, y un modelo sin `~` muestra la versión de referencia.
- **Página del auto.** Suma «Versiones» con una tabla de las versiones lado a lado, solo las filas que difieren y la
  frase «Por $ X más, la Titanium suma: …». La tabla de versiones usa el mismo `simbVal` y la misma limpieza de
  `CLEAN_SENT` que «Solo diferencias».
- **Precio «desde».** `PRECIO_CMP` sigue siendo el precio de la versión de referencia, para que el ranking por precio
  y las barras no cambien sin aviso. Una constante nueva, `PRECIO_DESDE`, guarda el mínimo de cada modelo. Las
  tarjetas, el Presupuesto y Ayudame a elegir usan `PRECIO_DESDE`. Qué precio usa el ranking por precio lo deciden
  Mati y Sebastián (decisión 1).
- **Ayudame a elegir.** Un modelo entra si alguna versión cae en la franja. La tarjeta dice qué versión cumple
  («Territory SEL, $ N M»), y los motivos salen de esa versión. Los datos de versión que todavía no estén cargados
  van como «sin dato» y no se toman de la versión tope.
- **Promos.** `promoComparable` deja de exigir que la promo nombre la versión de la tabla y busca, entre las versiones
  del modelo, la que la promo nombra. Así más promos se pueden comparar contra su lista.
- **Historial de precios.** `HISTORIAL_PRECIOS` y `precios-historial.json` pasan a tener una clave por slug de versión.
  La versión de referencia conserva la historia que ya tiene su modelo. Novedades y el RSS anuncian los cambios de
  todas las versiones, con el mismo `CAMBIO_MIN` del 1%.
- **Páginas estáticas.** `autos/<modelo>.html` suma la tabla de versiones. No propongo una página por versión, porque
  serían 1.000 páginas casi iguales para Google (decisión 6).
- **Base en Neon.** Suma la tabla `version (slug PK, auto_slug FK, nombre, orden, es_referencia)`, con un CHECK que
  exige que el slug arranque con el del auto y un índice único parcial para una sola referencia por auto. Suma también
  `celda_version (version_slug, fila_id, origen, valor, detalle)` con la misma PK y los mismos CHECK que `celda`, y
  `precio_lista` gana `version_slug`. `db/ida-y-vuelta.mjs` compara además `VERSIONES_PRECIO` y `versiones.json`.

## Herramientas y rutina

- `herramientas-stellantis.py` ya lee todas las versiones de las listas de Fiat, Jeep, RAM, Peugeot, Citroën y
  Leapmotor. Hoy descarta las que no son la de la tabla, y pasa a cargarlas en `VERSIONES_PRECIO`.
- Una herramienta nueva, `herramientas-versiones.py`, valida y escribe las dos estructuras a partir del TSV que entrega
  cada tanda. Hace lo mismo que el script que validó las tandas de huecos: controla el formato de cada fila, que la
  fuente sea https y que no se pise una celda con dato.
- La rutina semanal (tarea D) revisa los precios de todas las versiones. Una versión que deja de figurar en la lista
  oficial pasa a `discontinuada` y no se borra, para que su historial quede.

## Tests nuevos (`tests/e2e/versiones.spec.js`)

1. Cada modelo con versiones tiene exactamente una `ref: true`, y su precio coincide con la fila de precio de `DATA`.
2. Los slugs de versión son únicos, arrancan con el slug del modelo y no chocan con otro modelo ni con `SLUG_VIEJO`.
3. Cada versión que no es la de referencia tiene en `versiones.json` todas las filas de `FILAS_DE_VERSION`. Que falte
   una hace fallar el test, para que nunca se herede en silencio.
4. Toda celda nueva tiene su fila en `datos-fuentes.tsv` con el slug de la versión, y `=ref` también la tiene.
5. Las celdas de versión cumplen las mismas reglas que `DATA`: los prefijos con `|`, los centinelas exactos y el
   castellano en `Sí (…)`.
6. Cambiar de versión en una columna no deja ninguna celda debajo de otro auto (lo mismo que ya controla `ux.spec.js`).

## Plan de etapas (el del issue)

| Etapa | Entrega | Estimado |
|---|---|---|
| 0. Diseño | Este documento aprobado y `FILAS_DE_VERSION` decidida | 3 a 5 días |
| 1. Piloto | Las versiones de los 25 más vendidos con precio y filas de versión. Mide el ritmo real | 1 semana |
| 2. Versiones y precios | Las versiones de los 268 modelos con su precio, y el «desde» a la vista | 1 a 2 semanas |
| 3. Equipamiento por versión | Las filas de versión desde las fichas con columnas por versión | 3 a 5 semanas |
| 4. Interfaz | El selector en la tabla, Versiones en la ficha y Ayudame a elegir por versión | 1 a 2 semanas, en paralelo con la 3 |

## Decisiones pendientes (Mati y Sebastián)

1. **Versión de referencia de la tabla**: la tope (como hoy), la más vendida o la de entrada. Propongo la tope durante
   las etapas 1 a 3, para que la tabla no cambie mientras se carga, y decidir de nuevo con los datos a la vista.
   Cambiarla obliga a renombrar la fila «Precio de lista (versión tope de gama de la tabla)», y ese nombre es la clave
   de todo el código.
2. **Versiones que cambian solo el color o un paquete estético**: propongo que no entren como versión aparte cuando la
   marca no les pone otro precio de lista.
3. **Versiones para flotas o de plan de ahorro**: propongo que no entren, porque el público general no las puede
   comprar a precio de lista.
4. **Arrancar por el piloto de los 25 más vendidos**: propongo que sí.
5. **`versiones.json` como excepción al archivo único**: propongo aprobarla. La otra opción es embeber todo y sumar más
   de 1 MB a cada carga.
6. **Páginas estáticas por versión**: propongo que no haya, y que cada página de modelo tenga su tabla de versiones.
