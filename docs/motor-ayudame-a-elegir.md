# Motor de «Ayudame a elegir»: tamaño, propulsión y tipo de auto

Autos a la venta: **248**. Todos los conteos son sin presupuesto (me da igual el precio), 5 plazas y sin silla de ruedas; «cumplen» = entran sin ningún «casi»; «casi» = se apartan en una sola cosa y lo dicen.

## 1. Qué sugiere cada respuesta

Tamaño (`elegirSugSeg`), en orden de prioridad: 6 o 7 plazas → **D**; si no, «Con niños» → **A–D** (los límites los ponen las plazas y el ISOFIX); «Adulto atrás» → **C·D**; «Me da igual» → **A–D**.

Propulsión (`elegirSugProp`), en orden: uso Tierra o Trabajo → **me da igual**; enchufe «No» → **HEV**; enchufe «Sí» y uso Ciudad → **EV**; todo lo demás (Sí con ciudad y ruta o mucha ruta, y «No sé») → **PHEV**.

| Uso \ Enchufe | Sí | No | No sé |
|---|---|---|---|
| Ciudad | EV | HEV | PHEV |
| Ciudad y ruta | PHEV | HEV | PHEV |
| Mucha ruta | PHEV | HEV | PHEV |
| Tierra o campo | Me da igual | Me da igual | Me da igual |
| Trabajo o carga | Me da igual | Me da igual | Me da igual |

## 2. Producto cardinal

- Respuestas que mueven los filtros: plazas (3) × quiénes viajan (3) × uso (5) × enchufe (3) = **135 combinaciones**. Silla de ruedas (2) y presupuesto no tocan estos filtros (la silla filtra por baúl; el presupuesto es aparte).
- Salidas posibles: tamaño **3 conjuntos** (A–D, C·D, D) × propulsión **4 valores** (EV, PHEV, HEV, me da igual) = **12 pares** sugeridos. Los 135 casos caen en los 12 (B·C·D sigue disponible a mano).
- Lo que la persona puede elegir a mano: tamaño 2⁴−1 = 15 subconjuntos (vacío = todos), propulsión 2⁵ = 32 (vacío = me da igual), tipo de auto 2⁶ = 64 (vacío = me da igual). Total teórico a mano: 15 × 32 × 64 = **30.720** combinaciones de filtros.
- Cuántas de las 135 combinaciones dan cada par:

| Tamaño \ Propulsión | EV | PHEV | HEV | Me da igual |
|---|---|---|---|---|
| A–D (todos) | 4 | 20 | 12 | 24 |
| C·D | 2 | 10 | 6 | 12 |
| D | 3 | 15 | 9 | 18 |

## 3. Cuántos autos deja cada filtro solo

| Filtro | Valor | Cumplen | Casi |
|---|---|---|---|
| Tamaño | A–D (todos) | 234 | 13 |
| Tamaño | B·C·D | 228 | 17 |
| Tamaño | C·D | 167 | 72 |
| Tamaño | D | 81 | 93 |
| Propulsión | Me da igual | 234 | 13 |
| Propulsión | EV | 17 | 32 |
| Propulsión | PHEV | 29 | 47 |
| Propulsión | HEV | 30 | 30 |
| Tipo | Me da igual | 234 | 13 |
| Tipo | suv | 148 | 3 |
| Tipo | sedan | 26 | 0 |
| Tipo | hatch | 23 | 3 |
| Tipo | pickup | 33 | 0 |
| Tipo | minivan | 4 | 0 |
| Tipo | coupe | 0 | 7 |

## 4. Cómo se impactan entre sí

Autos que **cumplen** con cada par tamaño × propulsión (entre paréntesis, los «casi»):

| Tamaño \ Propulsión | Me da igual | EV | PHEV | HEV |
|---|---|---|---|---|
| A–D (todos) | 234 (13) | 17 (32) | 29 (47) | 30 (30) |
| B·C·D | 228 (17) | 17 (31) | 29 (45) | 28 (32) |
| C·D | 167 (72) | 11 (33) | 27 (38) | 25 (33) |
| D | 81 (93) | 3 (21) | 13 (23) | 6 (34) |

Con el tipo de auto en el medio (cumplen, tamaño × propulsión por cada tipo; columnas Me da igual / EV / PHEV / HEV):

| Tipo | Tamaño | Me da igual | EV | PHEV | HEV |
|---|---|---|---|---|---|
| Me da igual | A–D (todos) | 234 | 17 | 29 | 30 |
|  | B·C·D | 228 | 17 | 29 | 28 |
|  | C·D | 167 | 11 | 27 | 25 |
|  | D | 81 | 3 | 13 | 6 |
| SUV o crossover | A–D (todos) | 148 | 8 | 23 | 26 |
|  | B·C·D | 146 | 8 | 23 | 25 |
|  | C·D | 108 | 5 | 21 | 23 |
|  | D | 45 | 1 | 10 | 6 |
| Sedán | A–D (todos) | 26 | 3 | 5 | 2 |
|  | B·C·D | 26 | 3 | 5 | 2 |
|  | C·D | 21 | 3 | 5 | 2 |
|  | D | 6 | 1 | 2 | 0 |
| Hatchback | A–D (todos) | 23 | 4 | 0 | 1 |
|  | B·C·D | 21 | 4 | 0 | 1 |
|  | C·D | 8 | 2 | 0 | 0 |
|  | D | 0 | 0 | 0 | 0 |
| Pickup | A–D (todos) | 33 | 1 | 1 | 0 |
|  | B·C·D | 32 | 1 | 1 | 0 |
|  | C·D | 30 | 1 | 1 | 0 |
|  | D | 30 | 1 | 1 | 0 |
| Minivan | A–D (todos) | 4 | 1 | 0 | 1 |
|  | B·C·D | 3 | 1 | 0 | 0 |
|  | C·D | 0 | 0 | 0 | 0 |
|  | D | 0 | 0 | 0 | 0 |
| Coupé o descapotable | A–D (todos) | 0 | 0 | 0 | 0 |
|  | B·C·D | 0 | 0 | 0 | 0 |
|  | C·D | 0 | 0 | 0 | 0 |
|  | D | 0 | 0 | 0 | 0 |

## 5. Las reglas que se cruzan

- **Excluyentes:** la propulsión (sale del conjunto salvo vecina) y el tipo de auto. El presupuesto y las plazas también.
- **«Casi» (una sola falla, y lo dice):** tamaño de al lado («Otro tamaño (B)»), propulsión vecina (EV, PHEV y HEV entre sí; mild y nafta nunca), precio hasta 15% afuera, un asiento menos, ISOFIX sin informar. Un auto con dos fallas no entra.
- **Efecto de uno sobre el otro:** un tamaño angosto (D) y una propulsión angosta (EV) se multiplican: ver la tabla del punto 4. Cuando el cruce deja menos de N autos, el motor completa con los «casi» y, si no alcanza, el botón «Probá con» ofrece qué aflojar con la cantidad que daría.
- **Lo manual no se pisa:** si la persona toca el tamaño o la propulsión, las respuestas ya no los cambian hasta «Volver a la sugerencia».
