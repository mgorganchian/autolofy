-- Autolofy: etapa 2b, procedencia de las fotos y fuentes de fichas (fotos-fuentes.tsv y fichas-fuentes.tsv). Ver MODELO.md.
BEGIN;
SET LOCAL search_path = autolofy;

-- Procedencia de CADA foto del carrusel (una fila por archivo). `origen` es el archivo de Commons o la URL de la imagen oficial.
CREATE TABLE foto_fuente (
  archivo   text PRIMARY KEY CHECK (archivo ~ '\.(jpe?g|png|webp)$'),
  vista     text NOT NULL,
  origen    text NOT NULL,
  licencia  text NOT NULL,
  autor     text NOT NULL,
  pagina    text NOT NULL CHECK (pagina ~ '^https://')
);

-- fichas-fuentes.tsv mezcla tres clases de fila; `linea` es su posición entre las filas de datos (los comentarios no cuentan).
-- auto_nombre es el texto tal cual; auto_slug se resuelve si el nombre es el de un auto de la tabla (hay fuentes de marca: «Chery (precios)»).
CREATE TABLE ficha_fuente (          -- fuente de la ficha o del dato: auto, archivo o descripción, url, verificación, fecha
  linea        int PRIMARY KEY,
  auto_nombre  text NOT NULL,
  auto_slug    text REFERENCES auto(slug) ON UPDATE CASCADE,
  archivo      text NOT NULL,
  url          text NOT NULL,                -- casi siempre una URL; unas filas dicen «sin URL pública» y el motivo
  verificacion text NOT NULL,        -- sha256, «leída en línea, sin hash», «verificado-igual», la versión de la ficha…
  sha256       text CHECK (sha256 ~ '^[0-9a-f]{64}$'),
  fecha        date NOT NULL,
  CHECK (sha256 IS NULL OR sha256 = verificacion)
);
CREATE TABLE portada_commons (       -- portada tomada de Wikimedia Commons: auto, archivo, licencia, autor, página
  linea          int PRIMARY KEY,
  auto_nombre    text NOT NULL,
  auto_slug      text REFERENCES auto(slug) ON UPDATE CASCADE,
  archivo_commons text NOT NULL,
  licencia       text NOT NULL,
  autor          text NOT NULL,
  pagina         text NOT NULL CHECK (pagina ~ '^https://commons\.wikimedia\.org/')
);
CREATE TABLE portada_oficial (       -- portada oficial: auto, imagen (URL o «tapa de X.pdf») y, a veces, la página donde aparece
  linea        int PRIMARY KEY,
  auto_nombre  text NOT NULL,
  auto_slug    text REFERENCES auto(slug) ON UPDATE CASCADE,
  imagen       text NOT NULL,
  pagina       text
);
COMMIT;
