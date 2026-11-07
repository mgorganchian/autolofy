# Cupo con arancel 0%: cruce con los autos de la tabla

Hecho el 2026-11-07 a partir de `docs/cupo-arancel-cero.md` y de los anexos oficiales, contra los 265 autos de `CARS` en `index.html`.
**No se cargó nada en `DATA`**: es material para decidir si va como fila (por ejemplo, `EXT`).

> **Advertencia que va con cualquier uso de este cruce.** El cupo se asigna a una **empresa** para un **modelo** (sin versión, en
> la mayoría de los renglones), con un tope de unidades y de valor FOB por unidad. Que un modelo figure **no prueba** que la unidad
> que se vende salga sin arancel, ni que el precio de lista de la tabla lo refleje, ni que la versión de la tabla sea la que se
> importó con el cupo. Tampoco dice cuántas de esas unidades se usaron.

## Fuentes leídas

| Norma | Qué es | Cómo se leyó |
|---|---|---|
| Resolución SIyC 295/2025 ([BO 28/07/2025, aviso 328938](https://www.boletinoficial.gob.ar/detalleAviso/primera/328938/20250728)) | Cupo 2025, segunda ronda: Anexo I terminales (6.458) y Anexo II importadores (16.540) | **Anexos oficiales leídos** el 2026-11-07: `POST /pdf/download_anexo` con `seccion=primera`, `nroAnexo=1` y `2`, `idAnexo=7424791`, `fechaPublicacion=20250728`; texto con `herramientas-pdftxt.swift`. Las cantidades suman exactamente 6.458 y 16.540. |
| Resolución SIyC 513/2025 ([BO 03/12/2025, aviso 335472](https://www.boletinoficial.gob.ar/detalleAviso/primera/335472/20251203)) | Cupo 2026 (Anexo I terminales 19.280, Anexo II importadores 30.720) y remanente 2025 (Anexo III, 9.856) | Anexos I a III releídos el 2026-11-07 (`idAnexo=7525280`). |
| Disposición 375/2026 (31/08/2026, anexos en [cira.org.ar](https://www.cira.org.ar/es/servicios/normativas-servicios/disposicion/disposicion-375-2026/)) | Reasignación de 865 unidades de 2026: asignadas (Anexos I y II) y rechazadas (Anexo III) | Según `docs/cupo-arancel-cero.md` (no se releyó). |

**Pendiente:** la primera ronda de 2025 (27.002 unidades según la prensa) es otra resolución, que no se buscó. Tampoco se cruzaron los
pedidos en lista de espera (Anexos IV y V de la 513/2025): son pedidos, no cupo.

### Cómo se atribuye la empresa
Los PDF se leen como texto, sin la grilla, y a veces la razón social queda separada de su renglón. En la 513/2025 la empresa se
atribuyó **por el orden de los CUIT** solo donde el orden coincide uno a uno con los renglones (Anexo III, ocho CUIT y ocho renglones;
y la misma secuencia en la página 2 del Anexo II). Donde no se puede, la tabla dice «no legible».

CUIT conocidos (de la 295/2025, donde cada renglón trae su razón social): Great Cars S.A. 30715162519 (GWM/Haval), Chan-One S.A.
30715040421 (Changan), ZTY Motors S.A. 30715954725 (Chery), Astrak S.A. 30715514911 (JAC), MGM Company S.A. 33717578169 (MG),
BYD Auto Industry S.A. 30715341952. En la 513/2025: BYD Auto Argentina S.A.U. 30719098092, Adachi Motors S.A. 30715719270 (BAIC y
Arcfox), Oriente Motors S.R.L. 30719017009 (Forthing), Minarelli S.A. 30708610514 (DFSK), Blackrock Motors S.A. 30712222863
(Bestune y Skywell).

### Tipos de coincidencia
- **Exacta**: la norma nombra el mismo modelo que la tabla. Si la tabla tiene otra versión del mismo modelo que es **naftera**, se
  descarta esa (el régimen del Decreto 49/2025 es solo para eléctricos, híbridos, enchufables y mild-hybrid) y se aclara «por descarte».
  La versión exacta casi nunca la dice la norma.
- **Dudosa**: el nombre de la norma no es el de la tabla (CS55 contra CS55 Plus, Tiggo 7 contra Tiggo 7 Pro), o hay dos autos
  electrificados en la tabla que podrían ser ese modelo. Se dice el motivo.
- **Solo marca o empresa**: la empresa tiene cupo, pero para modelos que no están en la tabla.
- **Rechazada**: pedido rechazado en la Disposición 375/2026; no es cupo.

## Resumen

- **41 autos** con coincidencia **exacta** en un cupo asignado (295/2025, 513/2025 o la reasignación de la 375/2026).
- **13 autos** solo con coincidencia **dudosa** en un cupo asignado (más la Chevrolet, que se explica aparte).
- **5 autos** que solo aparecen en pedidos **rechazados** de la 375/2026 (BYD Atto 2 DM-i, Omoda E5, Leapmotor B03X, Kaiyi X7
  Hybrid y, dudoso, Omoda 5).
- 15 autos de la tabla tienen el mismo nombre que un modelo del cupo pero son **nafteros**: no coinciden (lista al final).

## Coincidencia exacta

Las unidades de la 513/2025 son por **renglón**: un renglón suele agrupar varios modelos, y la norma no las reparte entre ellos.

| Auto (slug) | Modelo como lo escribe la norma | Norma | Empresa | Unidades | Coincidencia |
|---|---|---|---|---|---|
| ford-territory-hibrida | FORD TERRITORY | 295/2025 Anexo I | Ford Argentina S.C.A. | 2.000 | Exacta (la única Territory de la tabla es la híbrida) |
| ford-territory-hibrida | FORD TERRITORY | 513/2025 Anexo I (2026) | Ford Argentina S.C.A. | 10.000 | Exacta |
| ford-territory-hibrida | Ford Territory | 375/2026 asignada | Ford Argentina | 432 | Exacta |
| renault-arkana-esprit-alpine | RENAULT ARKANA | 295/2025 Anexo I | Renault Argentina S.A. | 3.231 | Exacta |
| renault-arkana-esprit-alpine | RENAULT ARKANA | 513/2025 Anexo I | Renault Argentina S.A. | 1.600 | Exacta (en la 375/2026 le rechazaron 500 más) |
| chevrolet-spark-euv | CHEVROLET SPARK | 295/2025 Anexo I | General Motors de Argentina S.R.L. | 500 | Exacta |
| chevrolet-captiva-phev | CHEVROLET CAPTIVA | 295/2025 Anexo I | General Motors de Argentina S.R.L. | 655 | Exacta (la única Captiva de la tabla es la PHEV) |
| geely-ex5 | GEELY EX5 | 295/2025 Anexo II | Autos Sustentables del Sur S.A. | 500 | Exacta |
| suzuki-swift-hybrid-glx-cvt | Suzuki Swift | 295/2025 Anexo II | Distribuidora Automotriz Argentina S.A. | 480 | Exacta (en la 375/2026 le rechazaron más) |
| suzuki-swift-hybrid-glx-cvt | Suzuki Across / Swift | 513/2025 Anexo II | Distribuidora Automotriz Argentina S.A. | 1.093 (renglón) | Exacta |
| lynk-co-06 | lynk&co 06 | 295/2025 Anexo II | Emotions S.A. | 1.987 | Exacta |
| lynk-co-01 | lynk&co 01 / 02 / 03 | 513/2025 Anexo II | no legible | 1.597 (renglón) | Exacta |
| jetour-t1-i-dm | Jetour T1 | 295/2025 Anexo II | Lifcar S.A. | 200 | Exacta por descarte (la `jetour-t1` es naftera); en la 375/2026 le rechazaron 100 |
| mg-3-hev | MG MG3 | 295/2025 Anexo II | MGM Company S.A. | 250 | Exacta por descarte (la `mg-3` es naftera) |
| mg-3-hev | MG MG3 / ZS | 513/2025 Anexo II | no legible | 1.258 (renglón) | Exacta por descarte |
| mg-zs-hev | MG ZS | 295/2025 Anexo II | MGM Company S.A. | 250 | Exacta por descarte (la `mg-zs` es naftera) |
| mg-zs-hev | MG MG3 / ZS | 513/2025 Anexo II | no legible | 1.258 (renglón) | Exacta por descarte |
| mg-hs-hev | HS | 375/2026 asignada | MGM Company (MG) | 257 | Exacta de modelo (el auto figura como no lanzado) |
| jac-js6-phev | JAC JS6 Phev Euro VI X241Y | 295/2025 Anexo II | Astrak S.A. | 20 | Exacta |
| jac-js6-phev | JAC E30X / JS6 | 513/2025 Anexo II | Astrak S.A. (por orden de CUIT) | 785 (renglón) | Exacta |
| changan-cs55-plus | CHANGAN CS55 PLUS | 295/2025 Anexo II | Chan-One S.A. | 600 | Exacta (en la 513/2025 dice «CS55» a secas: ver dudosas) |
| gwm-ora-03 | GREAT WALL ORA 03 | 295/2025 Anexo II | Great Cars S.A. | 100 | Exacta (en la 513/2025 dice «ORA» a secas: ver dudosas) |
| gwm-haval-jolion-hev | Jolion HEV Supreme | 375/2026 asignada | Great Cars (Haval) | 176 | Exacta (la tabla dice «Jolion HEV Supreme, única versión») |
| gwm-haval-h7-hev | GREAT WALL / HAVAL H7 / ORA / V7 / H6 / JOLION | 513/2025 Anexo II | no legible (en el Anexo III, Haval es Great Cars S.A.) | 2.656 (renglón) | Exacta por descarte (la `gwm-haval-h7-4wd` es naftera) |
| chery-arrizo-8 | CHERY ARRIZO 8 PHEV | 295/2025 Anexo II | ZTY Motors S.A. | 300 | Exacta |
| chery-arrizo-8 | CHERY ARRIZO 8 / TIGGO 2 / 4 / 5 / 7 / 8 | 513/2025 Anexo II | ZTY Motors S.A. (por orden de CUIT) | 3.230 (renglón) | Exacta |
| chery-arrizo-8 | CHERY ARRIZO 8 / TIGGO 4 / TIGGO 7 | 513/2025 Anexo III (remanente 2025) | ZTY Motors S.A. (por orden de CUIT) | 1.187 (renglón) | Exacta |
| chery-tiggo-4-hybrid | CHERY TIGGO 4 HEV | 295/2025 Anexo II | ZTY Motors S.A. | 800 | Exacta (en la 375/2026 le rechazaron 800 de «Tiggo 4 Premium HEV») |
| chery-tiggo-4-hybrid | TIGGO 4 (renglón Chery) | 513/2025 Anexos II y III | ZTY Motors S.A. (por orden de CUIT) | 3.230 y 1.187 (renglones) | Exacta por descarte (la `chery-tiggo-4-pro` es naftera) |
| deepal-s05 | CHANGAN / DEEPAL / JMEV: CS55 / EADO / DEEPAL S05 / EVEASY | 513/2025 Anexo II | Chan-One S.A. (por orden de CUIT) | 2.469 (renglón) | Exacta |
| soueast-s06 | SOUEAST / XPENG: S06 / S07 / D03 | 513/2025 Anexo II | CUIT 30715866931, razón social no legible | 1.539 (renglón) | Exacta (en la 375/2026 le rechazaron 327) |
| gac-aion-ut | GAC AION UT / V | 513/2025 Anexo II | no legible | 501 (renglón) | Exacta |
| gac-aion-v | GAC AION UT / V | 513/2025 Anexo II | no legible | 501 (renglón) | Exacta |
| gac-emkoo-hev | GAC EMKOO / ES / GS4 | 513/2025 Anexo II | no legible | 1.000 (renglón) | Exacta |
| byd-dolphin-mini | BYD Dolphin Mini GL 220 y GS 500 | 295/2025 Anexo II | BYD Auto Industry S.A. | 720 | Exacta (la tabla es la GS) |
| byd-dolphin-mini | BYD DOLPHIN / DOLPHIN G / DOLPHIN MIN / SEAL 5 / SONG PRO / YUAN PRO | 513/2025 Anexo II | BYD Auto Argentina S.A.U. | 3.700 (renglón) | Exacta |
| byd-dolphin-mini | BYD DOLPHIN MINI / SONG PRO / YUAN PRO | 513/2025 Anexo III | BYD Auto Argentina S.A.U. | 1.569 (renglón) | Exacta (en la 375/2026 le rechazaron 2.444 Dolphin Mini GS) |
| byd-seal-5-dm-i | renglón BYD (SEAL 5) | 513/2025 Anexo II | BYD Auto Argentina S.A.U. | 3.700 (renglón) | Exacta |
| byd-song-pro | BYD SONG PRO DM-I GL 520 + 200 y GS 1.298 + 600 | 295/2025 Anexo II | BYD Auto Industry S.A. (dos expedientes) | 2.618 (GS: 1.898) | Exacta (la tabla es la GS) |
| byd-song-pro | renglón BYD (SONG PRO) | 513/2025 Anexos II y III | BYD Auto Argentina S.A.U. | 3.700 y 1.569 (renglones) | Exacta |
| byd-yuan-pro | BYD YUAN PRO GL 50 y GS 150 | 295/2025 Anexo II | BYD Auto Industry S.A. | 200 | Exacta (la tabla es la GS, eléctrica). Los renglones «YUAN PRO DM-I» van en dudosas |
| byd-yuan-pro | renglón BYD (YUAN PRO) | 513/2025 Anexos II y III | BYD Auto Argentina S.A.U. | 3.700 y 1.569 (renglones) | Exacta |
| arcfox-s5 | ARCFOX S5 / T1 / T5 / KAOLA S | 513/2025 Anexo II | no legible | 2.064 (renglón) | Exacta |
| arcfox-t1 | ídem | 513/2025 Anexo II | no legible | 2.064 (renglón) | Exacta |
| arcfox-t5 | ídem | 513/2025 Anexo II | no legible | 2.064 (renglón) | Exacta |
| arcfox-koala-s | «KAOLA S» (así lo escribe la norma) | 513/2025 Anexo II | no legible | 2.064 (renglón) | Exacta (solo cambia la grafía) |
| arcfox-s5, arcfox-t1, arcfox-t5, arcfox-koala-s, baic-eu5 | Arcfox / BAIC: Kaola S / S5 / T1 / T5 / BJ30 / EU5 / X55 HYBRID / X7 HYBRID | 513/2025 Anexo III | Adachi Motors S.A. (por orden de CUIT) | 3.622 (renglón) | Exacta |
| baic-eu5 | BAIC BJ30 / EU5 / X55 HYBRID / X7 HYBRID | 513/2025 Anexo II | Adachi Motors S.A. | 2.093 (renglón) | Exacta |
| skywell-be11 (Skywell ET5 en `CARS`) | SKYWELL ET5 / HT-i | 513/2025 Anexo II | Blackrock Motors S.A. | 896 (renglón) | Exacta |
| skywell-be11 | Bestune / Skywell: T77 / T99 / ET5 / HT-i | 513/2025 Anexo III | Blackrock Motors S.A. | 1.788 (renglón) | Exacta |
| leapmotor-c10 | LEAPMOTOR / FIAT: C10 REEV / B10 REEV / 600 | 513/2025 Anexo I | FCA Automobiles Argentina S.A. | 1.900 (renglón) | Exacta |
| leapmotor-b10 | ídem | 513/2025 Anexo I | FCA Automobiles Argentina S.A. | 1.900 (renglón) | Exacta (en la 375/2026 a Stellantis le rechazaron 530) |
| fiat-600-hybrid | ídem (600) | 513/2025 Anexo I | FCA Automobiles Argentina S.A. | 1.900 (renglón) | Exacta |
| citroen-c4-hybrid-max | CITROËN C4 / C3 | 513/2025 Anexo I | Peugeot Citroën Argentina S.A. | 1.700 (renglón) | Exacta (el único C4 de la tabla es el Hybrid MAX) |
| dongfeng-box | BOX / Huge / Mage | 513/2025 Anexo II | no legible | 1.236 (renglón) | Exacta |
| dongfeng-huge | ídem | 513/2025 Anexo II | no legible | 1.236 (renglón) | Exacta |
| dongfeng-mage | ídem | 513/2025 Anexo II | no legible | 1.236 (renglón) | Exacta |

## Coincidencia dudosa

| Auto (slug) | Modelo como lo escribe la norma | Norma | Empresa | Unidades | Por qué es dudosa |
|---|---|---|---|---|---|
| gwm-haval-h6-pro-hev | HAVAL H6 | 295/2025 Anexo II | Great Cars S.A. | 650 | La norma dice «H6»; la tabla, «H6 Pro HEV». Las otras H6 de la tabla son nafteras, pero no consta que «H6» sea la Pro |
| gwm-haval-h6-pro-hev | H6 (renglón Great Wall/Haval) | 513/2025 Anexos II y III | no legible / Great Cars S.A. | 2.656 y 800 (renglones) | Ídem. En la 375/2026 le rechazaron 269 «Haval H6 HEV Supreme» |
| gwm-haval-jolion-hev | HAVAL JOLION | 295/2025 Anexo II; 513/2025 Anexos II y III | Great Cars S.A. | 350; 2.656 y 800 (renglones) | Hay dos Jolion híbridos en la tabla (Jolion HEV y Jolion Pro HEV). Este auto ya tiene coincidencia exacta por la 375/2026 |
| gwm-haval-jolion-pro-hev | ídem | ídem | ídem | ídem | Ídem: no se sabe si «Jolion» incluye la Pro |
| gwm-ora-03 / gwm-ora-5-hev | ORA (renglón Great Wall/Haval) | 513/2025 Anexo II | no legible | 2.656 (renglón) | «ORA» a secas: puede ser el 03 o el 5 HEV. El Ora 5 HEV además tuvo 100 rechazadas en la 375/2026 |
| chery-tiggo-7-pro-mhev | TIGGO 7 MHEV | 295/2025 Anexo II | ZTY Motors S.A. (el renglón quedó en la página 2, después de los de ZTY) | 2.400 | La norma dice «Tiggo 7»; la tabla, «Tiggo 7 Pro». La empresa se atribuye por el orden de lectura |
| chery-tiggo-7-pro-mhev, chery-tiggo-7-pro-phev | TIGGO 7 (renglón Chery) | 513/2025 Anexos II y III | ZTY Motors S.A. (por orden de CUIT) | 3.230 y 1.187 (renglones) | «Tiggo 7» contra «Tiggo 7 Pro», y hay dos Tiggo 7 Pro electrificados (MHEV y PHEV) |
| changan-cs55-plus | CHANGAN CS55 (renglón y remanente) | 513/2025 Anexos II y III | Chan-One S.A. (por orden de CUIT) | 2.469 y 400 | «CS55» contra «CS55 Plus». En la 295/2025 sí dice «CS55 PLUS» (exacta) |
| changan-eado-plus-phev | EADO (renglón Changan) | 513/2025 Anexo II | Chan-One S.A. (por orden de CUIT) | 2.469 (renglón) | «Eado» contra «Eado Plus PHEV». En la 375/2026 se rechazaron 50 «Eado Plus PHEV» (nombre exacto) |
| jmev-easy-3 | EVEASY (renglón Changan/Deepal/JMEV) | 513/2025 Anexo II | Chan-One S.A. (por orden de CUIT) | 2.469 (renglón) | «Eveasy» contra «Easy 3»: no se encontró fuente que los iguale |
| jac-ev-30x | JAC E30X(EV3) Luxury | 295/2025 Anexo II | Astrak S.A. (por orden de lectura) | 30 | «E30X» contra «EV 30X»: parecen el mismo, pero ninguna fuente lo confirma |
| jac-ev-30x | JAC E30X / JS6 | 513/2025 Anexo II | Astrak S.A. (por orden de CUIT) | 785 (renglón) | Ídem |
| dfsk-e5-plus | DFSK E5 / GLORY 500; DFSK E5 | 513/2025 Anexos II y III | Minarelli S.A. (por orden de CUIT) | 1.140 y 461 | «E5» contra «E5 Plus» (CLAUDE.md ya anota que la lista de service de DFSK no distingue E5 de E5P) |
| gac-aion-es | GAC EMKOO / ES / GS4 | 513/2025 Anexo II | no legible | 1.000 (renglón) | «ES» en un renglón de la marca GAC, no «Aion ES»; la Aion UT y V van en otro renglón |
| baic-bj30-4x2, baic-bj30-4x4 | BJ30 | 513/2025 Anexos II y III | Adachi Motors S.A. | 2.093 y 3.622 (renglones) | Los dos BJ30 de la tabla son híbridos: no se sabe cuál o si los dos |
| baic-x55-ii-hybrid | X55 HYBRID | 513/2025 Anexos II y III | Adachi Motors S.A. | 2.093 y 3.622 (renglones) | «X55 Hybrid» contra «X55 II Hybrid» (la segunda generación) |
| byd-yuan-pro | BYD YUAN PRO DM-I GL 600 + 300 y GS 1.250 + 700 | 295/2025 Anexo II | BYD Auto Industry S.A. | 2.850 | La norma escribe «DM-i» (híbrido enchufable), pero el Yuan Pro de la tabla es 100% eléctrico. Puede ser un error de la planilla o otra variante |

**Chevrolet (513/2025 Anexo I, 4.080 unidades, «CHEVROLET E260S / F510S»; 375/2026 rechazada «F510S» 865):** son códigos que
no se pudieron vincular con ningún nombre comercial. No se asignan a `chevrolet-spark-euv` ni a `chevrolet-captiva-phev` sin
una fuente.

## Solo pedidos rechazados (Disposición 375/2026, Anexo III)

| Auto (slug) | Modelo como lo escribe la norma | Empresa | Unidades pedidas | Coincidencia |
|---|---|---|---|---|
| byd-atto-2-dm-i | Atto 2 DM-i GS | BYD Auto Argentina | 1.301 | Exacta, rechazada |
| omoda-e5 | E5 BEV Luxury | Omoda&Jaecoo | 132 | Exacta, rechazada |
| omoda-c5 | Omoda O5 HEV Comfort | Omoda&Jaecoo | 300 | Dudosa («O5» contra «Omoda 5»), rechazada |
| leapmotor-b03x | Leapmotor B03X | Stellantis | 25 | Exacta, rechazada |
| kaiyi-x7-hybrid | Kaiyi X7 | Colgas | 75 | Exacta por descarte (la `kaiyi-x7` es naftera), rechazada |

También rechazadas, sobre autos que ya figuran arriba: Jetour T1 (100), Suzuki Swift, Chevrolet F510S, Soueast S06, Changan CS55
Plus PHEV (450) y Eado Plus PHEV (50), Haval H6 HEV Supreme (269), Ora 5 HEV (100), Dolphin Mini GS (2.444), Leapmotor B10 REEV
(530), Tiggo 4 Premium HEV (800) y Renault Arkana (500). El Audi A3 Sportback y Sedán Mild Hybrid (200) no coincide: el
`audi-a3-sportback-s-line` de la tabla es naftero.

## Mismo nombre, pero el auto de la tabla es naftero (no coinciden)

El cupo es solo para electrificados, así que estos autos **no** son el modelo del cupo aunque compartan el nombre:
`renault-kwid-iconic-outsider` (el cupo es Kwid E-Tech, 72 en la 295/2025), `bmw-x1-sdrive18i-efficient` (BMW X1, 105 en la
295/2025, BMW de Argentina S.A.), `mini-countryman-s-all4-favoured` (MINI Countryman, 150 en la 295/2025), `chery-tiggo-2-pro-max`,
`chery-tiggo-4-pro` y `chery-tiggo-8-pro` (Tiggo 2, 4 y 8 en la 513/2025), `citroen-c3-you` (C3 en la 513/2025),
`dfsk-glory-500` (Glory 500 en la 513/2025; el que entra al cupo tiene que ser una versión electrificada, que la tabla no tiene),
`gwm-haval-h6-4wd`, `gwm-haval-h6-gt`, `gwm-haval-h7-4wd`, `jetour-t1`, `mg-3`, `mg-zs` y `kaiyi-x7`.

## Solo marca o empresa (modelos que no están en la tabla)

- **Forthing** (Oriente Motors S.R.L.): M4, S50 EVK y SX5 G (513/2025, 626 y 26). Ninguno de los 6 Forthing de la tabla se llama así.
- **Lynk & Co**: 02 (500 en la 295/2025) y 03 (513/2025). Los 08 y 900 de la tabla no figuran.
- **Volkswagen**: ID.3 (6 y 3 en la 513/2025). Los Volkswagen de la tabla son nafteros.
- **GWM**: V7 (513/2025). **Chery**: Tiggo 5. **GAC**: GS4. **Soueast/XPeng**: S07 y D03. **BYD**: Dolphin y Dolphin G (Dolphin 120 en
  la 295/2025). **BAIC**: X7 Hybrid (no confundir con el Kaiyi X7 Hybrid). **Skywell**: HT-i. **Suzuki**: Across. **Chevrolet**:
  E260S y F510S.
- **JAC HFC7000WEV10** (100 en la 295/2025): código sin nombre comercial; por el orden de lectura podría ser de Cora Dir S.A. o de
  Astrak S.A.
- Marcas con cupo y sin ningún auto en la tabla: Zhidou, Dayun (Yuehu en la 295/2025: 20 y 200, a Autos Sustentables del Sur y a
  Cora Dir S.A. por el orden de lectura), Venucia (V DD-i y VX6 EV, 20 cada uno, Air S.R.L. por el orden de lectura), XPeng, Bestune, Wuling y Hudson.
