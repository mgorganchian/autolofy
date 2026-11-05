-- Autolofy: esquema de la etapa 2 (colores, fotos, service oficial, impuestos, tasas, logos y fotos descartadas). Ver MODELO.md.
BEGIN;
SET LOCAL search_path = autolofy;

-- Colores en Argentina (COLORES_AR). Un auto sin colores publicados lleva fila con tiene_lista = false y su nota.
CREATE TABLE color_auto (
  auto_slug      text PRIMARY KEY REFERENCES auto(slug) ON UPDATE CASCADE,
  tiene_lista    boolean NOT NULL,
  fuente_url     text CHECK (fuente_url ~ '^https://'),
  tipo_fuente    text,
  nota           text,
  con_muestras   boolean NOT NULL DEFAULT false,   -- el sitio trae «m» para este auto (aunque algunas muestras sean null)
  CHECK (tiene_lista OR fuente_url IS NULL),
  CHECK (NOT tiene_lista OR (fuente_url IS NOT NULL AND tipo_fuente IS NOT NULL))
);
CREATE TABLE color (
  auto_slug  text NOT NULL REFERENCES color_auto(auto_slug) ON UPDATE CASCADE ON DELETE CASCADE,
  orden      int  NOT NULL CHECK (orden >= 0),
  nombre     text NOT NULL CHECK (length(nombre) > 0),   -- tal como lo escribe la marca
  hex        text CHECK (hex ~ '^#[0-9a-f]{6}$'),
  hex_url    text CHECK (hex_url ~ '^https://'),
  PRIMARY KEY (auto_slug, orden),
  CHECK ((hex IS NULL) = (hex_url IS NULL))              -- una muestra sin fuente no existe
);

-- Fotos: una fila por foto del carrusel; la portada es orden 0. credito NULL = el sitio no lo trae para ese auto.
CREATE TABLE foto (
  auto_slug  text NOT NULL REFERENCES auto(slug) ON UPDATE CASCADE,
  orden      int  NOT NULL CHECK (orden >= 0),
  vista      text NOT NULL,
  credito    text,
  PRIMARY KEY (auto_slug, orden)
);
CREATE TABLE foto_descartada (
  id             serial PRIMARY KEY,
  archivo_commons text NOT NULL,
  auto_slug      text NOT NULL,                -- sin FK: es el auto al que se quiso asignar la foto, y a veces ese slug no existe (el motivo lo dice)
  motivo         text NOT NULL,
  fecha          date NOT NULL
);
CREATE TABLE logo (
  archivo        text PRIMARY KEY,
  marca          text NOT NULL,
  archivo_commons text,
  licencia       text,
  autor          text,
  pagina         text,
  vigente_desde  text,
  origen         text NOT NULL CHECK (origen IN ('commons','oficial'))
);

-- Service oficial programado.
CREATE TABLE service_marca (
  marca       text PRIMARY KEY REFERENCES marca(nombre) ON UPDATE CASCADE,
  fuentes     text[] NOT NULL CHECK (cardinality(fuentes) > 0),
  consultado  date   NOT NULL,
  moneda      text   NOT NULL CHECK (moneda IN ('USD','ARS','$')),
  iva         text,           -- NULL = la marca no dice si incluye IVA
  vigencia    text,           -- NULL = la marca no publica vigencia
  alcance     text   NOT NULL,
  publica     text            -- quién publica la lista cuando no es la marca (Jetour: Famly)
);
CREATE TABLE service_auto (
  auto_slug  text PRIMARY KEY REFERENCES auto(slug) ON UPDATE CASCADE,
  marca      text NOT NULL REFERENCES service_marca(marca) ON UPDATE CASCADE,
  nota       text
);
CREATE TABLE service_visita (
  auto_slug  text NOT NULL REFERENCES service_auto(auto_slug) ON UPDATE CASCADE ON DELETE CASCADE,
  orden      int  NOT NULL CHECK (orden >= 0),
  km         int  NOT NULL CHECK (km > 0),
  meses      int  CHECK (meses > 0),         -- NULL = la lista fija solo los kilómetros
  monto      numeric CHECK (monto > 0),
  sin_cargo  boolean NOT NULL DEFAULT false,
  PRIMARY KEY (auto_slug, orden),
  CHECK ((monto IS NULL) = sin_cargo)           -- o tiene monto o dice «Sin cargo», nunca los dos ni ninguno
);

-- Gastos para patentarlo: lo nacional (una sola fila) y lo de cada jurisdicción.
CREATE TABLE impuesto_nacional (
  una_fila         boolean PRIMARY KEY DEFAULT true CHECK (una_fila),
  consultado       date NOT NULL,
  patente_consultada date NOT NULL,
  arancel_pct      numeric NOT NULL,
  arancel_ruv_pct  numeric NOT NULL,
  arancel_fuente   text NOT NULL CHECK (arancel_fuente ~ '^https://'),
  form01_monto     numeric NOT NULL CHECK (form01_monto > 0),
  form01_fuente    text NOT NULL CHECK (form01_fuente ~ '^https://')
);
CREATE TABLE impuesto_provincia (
  provincia            text PRIMARY KEY,
  sellado_pct          numeric,                  -- NULL = s/d (Santiago del Estero)
  sellado_fuente       text,
  sellado_base         text,
  patente_electricos   text,
  patente_hibridos     text,
  patente_fuente       text,
  patente_pct          numeric,                  -- NULL = s/d (Chaco, Santiago del Estero, Santa Cruz)
  patente_calidad      text CHECK (patente_calidad IN ('ley','estimada','sin verificar')),
  patente_calidad_fuente text,
  patente_nota         text,
  factor_electricos    numeric[],                -- factor de cada año, solo beneficios claros
  factor_hibridos      numeric[],
  patente_beneficio_nota text,
  sellado_nota         text,
  sellado_electricos   numeric,
  sellado_hibridos     numeric
);

-- Tasas de préstamos prendarios (BCRA).
CREATE TABLE tasa_consulta (
  una_fila  boolean PRIMARY KEY DEFAULT true CHECK (una_fila),
  fecha     date NOT NULL,
  fuente    text NOT NULL CHECK (fuente ~ '^https://')
);
CREATE TABLE tasa_linea (
  orden   int  PRIMARY KEY CHECK (orden >= 0),
  entidad text NOT NULL,
  nombre  text NOT NULL,
  moneda  text NOT NULL,
  tasa    text NOT NULL,
  tea     numeric NOT NULL CHECK (tea > 0),
  cft     numeric NOT NULL CHECK (cft > 0),
  plazo   int NOT NULL CHECK (plazo > 0),
  territorio text NOT NULL,
  beneficio text NOT NULL,
  informada date NOT NULL,
  tipo    text NOT NULL
);
COMMIT;
