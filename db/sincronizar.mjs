// Pone al día la base de Neon con lo que hoy hay en el repo y comprueba que quedó idéntica.
// Uso: node sincronizar.mjs      (lee la cadena del Keychain si no hay AUTOLOFY_DB_URL; nunca la imprime)
// Rehace el esquema `autolofy` entero (DROP + carga): la base es hoy un espejo del repo y nada la lee en vivo.
// Si falla a mitad, se vuelve a correr y queda bien.
import { execFileSync } from 'node:child_process';
import { conectar } from './lib.mjs';
import { cargar } from './cargar.mjs';
import { comprobar } from './verificar.mjs';

if (!process.env.AUTOLOFY_DB_URL) {
  try { process.env.AUTOLOFY_DB_URL = execFileSync('security', ['find-generic-password', '-s', 'neon-autolofy-db', '-a', 'cadena-conexion', '-w'], { encoding: 'utf8' }).trim(); }
  catch { console.error('no hay cadena de conexión: falta AUTOLOFY_DB_URL o la entrada neon-autolofy-db del Keychain'); process.exit(2); }
}
const db = await conectar();
if (db.nombre !== 'neon') { console.error('sincronizar solo corre contra Neon'); process.exit(2); }
await db.exec('DROP SCHEMA IF EXISTS autolofy CASCADE');
const r = await cargar(db);
await comprobar(db);
console.log('base de Neon al día:', JSON.stringify(r));
await db.close();
