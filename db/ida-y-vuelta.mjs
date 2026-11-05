// Prueba de ida y vuelta: carga el repo en una base vacía y comprueba que lo exportado es IDÉNTICO a lo que hoy sirve el sitio.
import { conectar } from './lib.mjs';
import { cargar } from './cargar.mjs';
import { comprobar } from './verificar.mjs';

const db = await conectar();
if (db.nombre === 'neon') { console.error('ida-y-vuelta corre solo con PGlite (no toca Neon)'); process.exit(2); }
await cargar(db);
await comprobar(db);
await db.close();
