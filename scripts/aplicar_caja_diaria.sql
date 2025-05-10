-- Script para aplicar directamente a la base de datos Supabase

-- 1. Asegurar que existan las tablas necesarias

-- Tabla para almacenar los content tiers (si no existe)
CREATE TABLE IF NOT EXISTS content_tiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre VARCHAR(255) NOT NULL,
  descripcion TEXT,
  color VARCHAR(50) NOT NULL,
  uuid VARCHAR(255) UNIQUE NOT NULL -- UUID de la API de Valorant
);

-- Insertar los content tiers si no existen
INSERT INTO content_tiers (nombre, descripcion, color, uuid)
VALUES 
  ('Select Edition', 'Skins básicas con diseños simples', '#5a9fe2', '12683d76-48d7-84a3-4e09-6985794f0445'),
  ('Deluxe Edition', 'Skins con efectos visuales mejorados', '#009587', '0cebb8be-46d7-c12a-d306-e9907bfc5a25'),
  ('Premium Edition', 'Skins con efectos visuales y sonoros premium', '#d1548d', '60bca009-4182-7998-dee7-b8a2558dc369'),
  ('Ultra Edition', 'Skins con animaciones y efectos avanzados', '#fad663', '411e4a55-4e59-7757-41f0-86a53f101bb5'),
  ('Exclusive Edition', 'Skins exclusivas con efectos únicos', '#f5955b', 'e046854e-406c-37f4-6607-19a9ba8426fc')
ON CONFLICT (uuid) DO NOTHING;

-- Asegurar que la tabla cajas tenga los campos necesarios
ALTER TABLE cajas
ADD COLUMN IF NOT EXISTS es_diaria BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS fecha_actualizacion TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN IF NOT EXISTS imagen_url VARCHAR(255) DEFAULT '/free_cage.png',
ADD COLUMN IF NOT EXISTS descripcion TEXT DEFAULT 'Caja gratuita que se actualiza diariamente a las 9:00 AM',
ADD COLUMN IF NOT EXISTS ruta VARCHAR(255) DEFAULT '/main/diaria',
ADD COLUMN IF NOT EXISTS esta_disponible BOOLEAN DEFAULT TRUE;

-- Tabla para almacenar las probabilidades de los tiers en cada caja
CREATE TABLE IF NOT EXISTS tier_probabilidades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  caja_id UUID NOT NULL REFERENCES cajas(id) ON DELETE CASCADE,
  content_tier_id UUID NOT NULL REFERENCES content_tiers(id) ON DELETE CASCADE,
  probabilidad DECIMAL(5,2) NOT NULL, -- Porcentaje de probabilidad (ej: 65.00)
  cantidad_skins INTEGER NOT NULL DEFAULT 1, -- Cantidad de skins de este tier en la caja
  UNIQUE(caja_id, content_tier_id)
);

-- Tabla para configuración de la caja diaria
CREATE TABLE IF NOT EXISTS caja_diaria_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  caja_id UUID NOT NULL REFERENCES cajas(id) ON DELETE CASCADE,
  proxima_actualizacion TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (CURRENT_TIMESTAMP + INTERVAL '1 day' + INTERVAL '9 hour'),
  UNIQUE(caja_id)
);

-- 2. Función para crear la caja diaria si no existe

CREATE OR REPLACE FUNCTION crear_caja_diaria()
RETURNS UUID AS $$
DECLARE
  caja_diaria_id UUID;
BEGIN
  -- Verificar si ya existe una caja diaria
  SELECT id INTO caja_diaria_id FROM cajas WHERE es_diaria = TRUE LIMIT 1;
  
  IF caja_diaria_id IS NULL THEN
    -- Crear la caja diaria si no existe
    INSERT INTO cajas (nombre, precio, imagen_url, descripcion, ruta, esta_disponible, es_diaria)
    VALUES ('Caja Diaria', 0, '/free_cage.png', 'Caja gratuita que se actualiza diariamente a las 9:00 AM', '/main/diaria', TRUE, TRUE)
    RETURNING id INTO caja_diaria_id;
    
    -- Configurar la próxima actualización
    INSERT INTO caja_diaria_config (caja_id, proxima_actualizacion)
    VALUES (caja_diaria_id, (CURRENT_DATE + INTERVAL '1 day')::date + INTERVAL '9 hour');
  END IF;
  
  RETURN caja_diaria_id;
END;
$$ LANGUAGE plpgsql;

-- 3. Función para actualizar la caja diaria

CREATE OR REPLACE FUNCTION actualizar_caja_diaria()
RETURNS VOID AS $$
DECLARE
  caja_diaria_id UUID;
  exclusive_tier_id UUID;
  ultra_tier_id UUID;
  premium_tier_id UUID;
  deluxe_tier_id UUID;
  select_tier_id UUID;
BEGIN
  -- Obtener IDs de los tiers
  SELECT id INTO exclusive_tier_id FROM content_tiers WHERE nombre = 'Exclusive Edition' LIMIT 1;
  SELECT id INTO ultra_tier_id FROM content_tiers WHERE nombre = 'Ultra Edition' LIMIT 1;
  SELECT id INTO premium_tier_id FROM content_tiers WHERE nombre = 'Premium Edition' LIMIT 1;
  SELECT id INTO deluxe_tier_id FROM content_tiers WHERE nombre = 'Deluxe Edition' LIMIT 1;
  SELECT id INTO select_tier_id FROM content_tiers WHERE nombre = 'Select Edition' LIMIT 1;
  
  -- Obtener o crear la caja diaria
  SELECT crear_caja_diaria() INTO caja_diaria_id;
  
  -- Actualizar la fecha de actualización
  UPDATE cajas 
  SET fecha_actualizacion = CURRENT_TIMESTAMP
  WHERE id = caja_diaria_id;
  
  -- Actualizar la próxima fecha de actualización
  UPDATE caja_diaria_config
  SET proxima_actualizacion = (CURRENT_DATE + INTERVAL '1 day')::date + INTERVAL '9 hour'
  WHERE caja_id = caja_diaria_id;
  
  -- Eliminar las skins actuales de la caja
  DELETE FROM cajas_skins WHERE caja_id = caja_diaria_id;
  
  -- Configurar las probabilidades si no existen
  -- Exclusive Edition: 0.5%
  INSERT INTO tier_probabilidades (caja_id, content_tier_id, probabilidad, cantidad_skins)
  VALUES (caja_diaria_id, exclusive_tier_id, 0.5, 1)
  ON CONFLICT (caja_id, content_tier_id) 
  DO UPDATE SET probabilidad = 0.5, cantidad_skins = 1;
  
  -- Ultra Edition: 1%
  INSERT INTO tier_probabilidades (caja_id, content_tier_id, probabilidad, cantidad_skins)
  VALUES (caja_diaria_id, ultra_tier_id, 1.0, 2)
  ON CONFLICT (caja_id, content_tier_id) 
  DO UPDATE SET probabilidad = 1.0, cantidad_skins = 2;
  
  -- Premium Edition: 8.5%
  INSERT INTO tier_probabilidades (caja_id, content_tier_id, probabilidad, cantidad_skins)
  VALUES (caja_diaria_id, premium_tier_id, 8.5, 4)
  ON CONFLICT (caja_id, content_tier_id) 
  DO UPDATE SET probabilidad = 8.5, cantidad_skins = 4;
  
  -- Deluxe Edition: 25%
  INSERT INTO tier_probabilidades (caja_id, content_tier_id, probabilidad, cantidad_skins)
  VALUES (caja_diaria_id, deluxe_tier_id, 25.0, 5)
  ON CONFLICT (caja_id, content_tier_id) 
  DO UPDATE SET probabilidad = 25.0, cantidad_skins = 5;
  
  -- Select Edition: 65%
  INSERT INTO tier_probabilidades (caja_id, content_tier_id, probabilidad, cantidad_skins)
  VALUES (caja_diaria_id, select_tier_id, 65.0, 8)
  ON CONFLICT (caja_id, content_tier_id) 
  DO UPDATE SET probabilidad = 65.0, cantidad_skins = 8;
  
  -- Aquí se implementaría la lógica para seleccionar nuevas skins para la caja diaria
  -- Esta parte se implementará en el código de la aplicación para mayor flexibilidad
  
  RAISE NOTICE 'Caja diaria actualizada con éxito';
END;
$$ LANGUAGE plpgsql;

-- 4. Función para forzar la actualización de la caja diaria (para pruebas)

CREATE OR REPLACE FUNCTION forzar_actualizacion_caja_diaria()
RETURNS VOID AS $$
BEGIN
  PERFORM actualizar_caja_diaria();
  RETURN;
END;
$$ LANGUAGE plpgsql;

-- 5. Ejecutar la actualización inicial

SELECT actualizar_caja_diaria();