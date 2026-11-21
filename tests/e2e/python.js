// Cómo llamar a Python desde la suite, en cualquier sistema.
// En Windows, «python3» es un acceso directo que abre la Microsoft Store; el Python instalado responde como «python».
// En la Mac y en GitHub Actions (Linux), «python3». PYTHONIOENCODING=utf-8: en Windows Python escribe con la codificación
// de la consola y «al día» llegaba como «al d�a».
const PY = process.platform === 'win32' ? 'python' : 'python3';
const PY_ENV = { ...process.env, PYTHONIOENCODING: 'utf-8' };

module.exports = { PY, PY_ENV };
