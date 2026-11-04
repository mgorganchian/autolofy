-- Autolofy: esquema de la etapa 1 (ver MODELO.md). Compatible con Postgres 15+ y Neon.
BEGIN;
CREATE SCHEMA IF NOT EXISTS autolofy;
SET LOCAL search_path = autolofy;

CREATE TABLE marca (
  nombre      text PRIMARY KEY,
  grupo       text,
  relacion    text,
  info        jsonb NOT NULL DEFAULT '{}'::jsonb   -- MARCAS_INFO completo: importador, fuentes, fábrica en el Mercosur…
);

CREATE TABLE auto (
  slug           text PRIMARY KEY CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  orden          int  NOT NULL UNIQUE,                    -- posición en CARS (el sitio reordena en el navegador)
  nombre         text NOT NULL UNIQUE,
  nombre_corto   text NOT NULL,
  marca          text NOT NULL REFERENCES marca(nombre),
  tipo           text NOT NULL CHECK (tipo IN ('ice','hev','mhev','phev','ev','tbd')),
  segmento       text NOT NULL CHECK (segmento IN ('xl','big','mid','compact','mini','nd')),
  carroceria     text NOT NULL CHECK (carroceria IN ('SUV','Crossover','Sedán','Hatchback','Minivan','Pickup','Convertible','Coupé')),
  estado         text NOT NULL CHECK (estado IN ('venta','preventa','nolanzado','discontinuado'))
);

CREATE TABLE categoria (
  id      smallserial PRIMARY KEY,
  orden   int  NOT NULL UNIQUE,
  nombre  text NOT NULL UNIQUE
);

CREATE TABLE fila (
  id            smallserial PRIMARY KEY,
  categoria_id  smallint NOT NULL REFERENCES categoria(id),
  orden         int  NOT NULL,
  nombre        text NOT NULL UNIQUE,                     -- clave de todo el sitio (tr.dataset.nombre)
  UNIQUE (categoria_id, orden)
);

CREATE TABLE celda (
  auto_slug  text     NOT NULL REFERENCES auto(slug) ON UPDATE CASCADE,
  fila_id    smallint NOT NULL REFERENCES fila(id),
  origen     text     NOT NULL CHECK (origen IN ('dato','nota','ext','det','nr','centinela')),
  valor      text     NOT NULL,
  detalle    text,
  PRIMARY KEY (auto_slug, fila_id),
  CONSTRAINT detalle_segun_origen CHECK (NOT (origen IN ('dato','centinela') AND detalle IS NOT NULL)),
  CONSTRAINT centinela_exacto CHECK (origen <> 'centinela' OR valor IN ('YES','NO','OPT','ND')),
  CONSTRAINT sin_barra_en_valor CHECK (position('|' IN valor) = 0),
  CONSTRAINT sin_centinela_con_texto CHECK (valor !~ '^(YES|NO|OPT|ND) \(')
);

CREATE TABLE fuente_celda (
  auto_slug  text     NOT NULL,
  fila_id    smallint NOT NULL,
  tipo       text     NOT NULL CHECK (tipo IN ('dato','motivo de s/d')),
  fuente     text     NOT NULL,
  url        text     NOT NULL CHECK (url ~ '^https://\S+$'),
  sha256     text     NOT NULL,                           -- hash o «leída en línea, sin hash»
  fecha      date     NOT NULL,
  PRIMARY KEY (auto_slug, fila_id),
  FOREIGN KEY (auto_slug, fila_id) REFERENCES celda(auto_slug, fila_id) ON UPDATE CASCADE
);

-- Historial de precios de lista, todas las monedas (precios-historial.json). desde NULL = línea base.
CREATE TABLE precio_historial (
  id        bigserial PRIMARY KEY,
  auto_slug text NOT NULL REFERENCES auto(slug) ON UPDATE CASCADE,
  desde     date,
  moneda    text NOT NULL CHECK (moneda IN ('USD','ARS')),
  monto     bigint NOT NULL CHECK (monto > 0),
  version   text NOT NULL DEFAULT '',
  UNIQUE NULLS NOT DISTINCT (auto_slug, moneda, desde)
);

-- HISTORIAL_PRECIOS del sitio: solo dólares de la misma versión, con la URL de la lista (alimenta Novedades y los RSS).
CREATE TABLE precio_lista_usd (
  auto_slug text NOT NULL REFERENCES auto(slug) ON UPDATE CASCADE,
  fecha     date NOT NULL,
  usd       integer NOT NULL CHECK (usd > 0),
  version   text NOT NULL,
  url       text NOT NULL,
  PRIMARY KEY (auto_slug, fecha, version)
);

CREATE TABLE concesionario (
  id          serial PRIMARY KEY,
  orden       int  NOT NULL UNIQUE,
  nombre      text NOT NULL,
  provincia   text NOT NULL,
  ciudad      text NOT NULL DEFAULT '',
  direccion   text NOT NULL DEFAULT '',
  telefono    text NOT NULL DEFAULT '',
  whatsapp    text NOT NULL DEFAULT '',
  email       text NOT NULL DEFAULT '',
  web         text NOT NULL DEFAULT '',
  horarios    text NOT NULL DEFAULT '',
  servicios   text[] NOT NULL DEFAULT '{}',
  fuente      text[] NOT NULL,
  consultado  date NOT NULL,
  lat         double precision, lon double precision, geo text, partido text, localidad text,
  nota        text,
  CHECK ((lat IS NULL) = (lon IS NULL)),
  CHECK (lat IS NULL OR lat BETWEEN -56 AND -21),
  UNIQUE (nombre, direccion, ciudad)
);

CREATE TABLE concesionario_marca (
  concesionario_id int  NOT NULL REFERENCES concesionario(id) ON DELETE CASCADE,
  marca            text NOT NULL REFERENCES marca(nombre),
  PRIMARY KEY (concesionario_id, marca)
);

CREATE TABLE red_marca (                                  -- concesionarios.json: marcas[m] sin las promos
  marca             text PRIMARY KEY REFERENCES marca(nombre),
  fuente_red        text[] NOT NULL DEFAULT '{}',
  total             int,
  nota              text,
  aviso             text,
  promos_consultado date
);

CREATE TABLE promo (
  id               bigserial PRIMARY KEY,
  clave            text NOT NULL UNIQUE,                  -- identidad usada por herramientas-promos.py
  marca            text REFERENCES marca(nombre),
  concesionario_id int  REFERENCES concesionario(id),
  tipo             text NOT NULL CHECK (tipo IN ('precio','bonificacion','financiacion','entrega','otro')),
  todos_los_autos  boolean NOT NULL DEFAULT false,
  version_auto     text,
  fuente           text[] NOT NULL CHECK (cardinality(fuente) > 0),
  visto_desde      date NOT NULL,
  consultado       date NOT NULL,
  ultima_vez       date NOT NULL,
  estado           text NOT NULL CHECK (estado IN ('vigente','retirada')),
  retirada_el      date,
  CONSTRAINT emisor_exacto CHECK ((marca IS NOT NULL) <> (concesionario_id IS NOT NULL)),
  CONSTRAINT retiro_coherente CHECK ((estado = 'retirada') = (retirada_el IS NOT NULL))
);

CREATE TABLE promo_auto (
  promo_id  bigint NOT NULL REFERENCES promo(id) ON DELETE CASCADE,
  auto_slug text   NOT NULL REFERENCES auto(slug) ON UPDATE CASCADE,
  PRIMARY KEY (promo_id, auto_slug)
);

CREATE TABLE promo_version (
  promo_id   bigint NOT NULL REFERENCES promo(id) ON DELETE CASCADE,
  desde      date   NOT NULL,
  texto      text   NOT NULL,
  precio_moneda    text CHECK (precio_moneda IN ('USD','ARS')),
  precio_monto     numeric(14,2),
  descuento_moneda text CHECK (descuento_moneda IN ('USD','ARS')),
  descuento_monto  numeric(14,2),
  vigencia   date,
  PRIMARY KEY (promo_id, desde),
  CHECK ((precio_moneda IS NULL) = (precio_monto IS NULL)),
  CHECK ((descuento_moneda IS NULL) = (descuento_monto IS NULL)),
  CHECK (vigencia IS NULL OR vigencia >= desde)
);

CREATE TABLE llamado (
  id            serial PRIMARY KEY,
  auto_slug     text NOT NULL REFERENCES auto(slug) ON UPDATE CASCADE,
  fecha         date NOT NULL,
  fecha_dudosa  boolean NOT NULL DEFAULT false,
  modelo        text NOT NULL,
  descripcion   text NOT NULL CHECK (length(descripcion) > 20),
  UNIQUE (auto_slug, fecha, modelo, descripcion)
);

CREATE TABLE video (
  auto_slug  text NOT NULL REFERENCES auto(slug) ON UPDATE CASCADE,
  youtube_id text NOT NULL,
  orden      int  NOT NULL,
  canal      text NOT NULL,
  titulo     text NOT NULL,
  fecha      date NOT NULL,
  duracion_s int  NOT NULL CHECK (duracion_s > 0),
  tipo       text CHECK (tipo IN ('adelanto','presentación','informe','otra versión')),
  extra      jsonb NOT NULL DEFAULT '{}'::jsonb,
  PRIMARY KEY (auto_slug, youtube_id),
  UNIQUE (auto_slug, orden)
);

CREATE TABLE venta_marca (
  anio   int  NOT NULL CHECK (anio BETWEEN 2000 AND 2100),
  marca  text NOT NULL,                                   -- el registro nombra marcas que no están en la tabla
  unidades int NOT NULL CHECK (unidades >= 0),
  PRIMARY KEY (anio, marca)
);

COMMENT ON SCHEMA autolofy IS 'Fuente de verdad de Autolofy; ver db/MODELO.md. El sitio no la lee al cargar: un build exporta index.html.';
COMMENT ON TABLE celda IS 'Valor de una fila para un auto, partido en origen/valor/detalle; el exportador la recompone idéntica a DATA.';
COMMIT;
