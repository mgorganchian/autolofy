// Control de la segmentación contra el mercado (issue #184, decisión 11): la regla de tamaño de CARS no puede poner un
// auto en un grupo incompatible con el que le da la prensa argentina. Fuente: Autoweb, «Ventas enero-agosto 2026: segmento por
// segmento» (https://www.autoweb.com.ar/2026/10/01/ventas-enero-agosto-2026-segmento-por-segmento-2/). Autoweb junta segmentos
// («SUV mediano/grande», «pick up compacta/intermedia»), así que el control pide el grupo, no la letra exacta. Su grupo
// «crossover/familiar compacto» queda afuera: mezcla crossovers chicos con el Fastback (4,44 m, Mediano por la regla: caso de
// borde aceptado). Revisar la lista cuando Autoweb publique el cierre anual.
const { test, expect } = require('@playwright/test');
const { leerIndex } = require('./helpers');

const { CARS } = leerIndex();

const AUTOWEB = [
  { grupo: 'SUV compacto', permitidos: ['compact'],
    modelos: ['Tracker', 'Yaris Cross', '2008', 'T-Cross', 'Atto 2', 'Yuan Pro', 'Renegade', 'Kicks', 'WR-V', 'HR-V', 'Duster', 'Kait', 'Tiggo 4', 'Creta', 'Fiat 600', 'Jimny'] },
  { grupo: 'SUV mediano/grande', permitidos: ['mid', 'big', 'xl'],
    modelos: ['Territory', 'Corolla Cross', 'Taos', 'Compass', 'BJ30', 'SW4', 'Song Pro', 'Captiva', 'Tiggo 7', 'Haval H6', 'Bronco Sport', 'Boreal', 'Jolion', 'MG ZS', 'Everest'] },
  { grupo: 'Pick up compacta/intermedia', permitidos: ['compact', 'mid'],
    modelos: ['Strada', 'Toro', 'Montana', 'Maverick', 'Rampage', 'Saveiro', 'Oroch'] },
  { grupo: 'Pick up mediana/grande', permitidos: ['big', 'xl'],
    modelos: ['Hilux', 'Ranger', 'Amarok', 'S10', 'Titano', 'Dakota', 'Frontier', 'F-150', 'Shark', 'Tunland', 'Silverado', 'Alaskan'] },
];

test.describe('segmentos contra el mercado', () => {
  test.beforeEach(({ }, info) => test.skip(info.project.name !== 'escritorio', 'no dependen del viewport'));

  for (const g of AUTOWEB) {
    test(`los «${g.grupo}» de Autoweb quedan en su grupo`, () => {
      const mal = [], faltan = [];
      for (const m of g.modelos) {
        const autos = CARS.filter(c => c.name.includes(m));
        if (!autos.length) faltan.push(m);
        // Sin largo cargado («nd») no se puede clasificar: lo cubre la tarea de datos, no este control.
        for (const c of autos) if (c.size !== 'nd' && !g.permitidos.includes(c.size)) mal.push(`${c.name}: ${c.size}`);
      }
      expect(faltan, 'modelos de la lista que no están en la tabla').toEqual([]);
      expect(mal).toEqual([]);
    });
  }
});
