-- =====================================================================
-- ESQUEMA ACTUALIZADO PARA DULZURAS JM
-- =====================================================================
-- Si ya tenías el esquema anterior, este script lo MODIFICA sin perder
-- los datos. Si es una BD nueva, también funciona perfectamente.
-- Ejecuta TODO en Supabase SQL Editor → New query → Run
-- =====================================================================

-- ----------------------------------------------------------------------
-- TABLA: materiales (sin cambios respecto al anterior)
-- ----------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS materiales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL,
  unidad_medida TEXT NOT NULL CHECK (
    unidad_medida IN ('gramo', 'kilo', 'mililitro', 'litro', 'unidad', 'libra')
  ),
  precio_por_unidad NUMERIC(12, 2) NOT NULL DEFAULT 0,
  cantidad_stock NUMERIC(12, 2) NOT NULL DEFAULT 0,
  proveedor TEXT,
  notas TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ----------------------------------------------------------------------
-- TABLA: recetas (con campos NUEVOS)
-- ----------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS recetas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL,
  descripcion TEXT,
  porciones INTEGER NOT NULL DEFAULT 1 CHECK (porciones > 0),
  margen_ganancia NUMERIC(7, 2) NOT NULL DEFAULT 50,
  porcentaje_mano_obra NUMERIC(7, 2) NOT NULL DEFAULT 30,
  precio_venta NUMERIC(12, 2),
  precio_por_libra NUMERIC(12, 2),
  imagen_url TEXT,
  visible_publico BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Si ya tenías la tabla con la estructura anterior, agregar columnas nuevas:
ALTER TABLE recetas ADD COLUMN IF NOT EXISTS porcentaje_mano_obra NUMERIC(7, 2) NOT NULL DEFAULT 30;
ALTER TABLE recetas ADD COLUMN IF NOT EXISTS visible_publico BOOLEAN NOT NULL DEFAULT TRUE;

-- Cambiar margen_ganancia de fracción (0-1) a porcentaje (0-100) si es necesario
-- Si tu margen_ganancia tenía valores como 0.5, este script los convierte a 50
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM recetas WHERE margen_ganancia > 0 AND margen_ganancia <= 1
  ) THEN
    -- Solo escala si los valores parecen estar en formato fracción
    UPDATE recetas SET margen_ganancia = margen_ganancia * 100 
    WHERE margen_ganancia > 0 AND margen_ganancia <= 1;
  END IF;
END $$;

-- Eliminar la columna costo_mano_obra antigua si existe (la reemplazamos por porcentaje)
ALTER TABLE recetas DROP COLUMN IF EXISTS costo_mano_obra;

-- ----------------------------------------------------------------------
-- TABLA: ingredientes_receta (sin cambios)
-- ----------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ingredientes_receta (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  receta_id UUID NOT NULL REFERENCES recetas(id) ON DELETE CASCADE,
  material_id UUID NOT NULL REFERENCES materiales(id) ON DELETE RESTRICT,
  cantidad NUMERIC(12, 2) NOT NULL CHECK (cantidad > 0),
  UNIQUE(receta_id, material_id)
);

CREATE INDEX IF NOT EXISTS idx_ingredientes_receta ON ingredientes_receta(receta_id);
CREATE INDEX IF NOT EXISTS idx_ingredientes_material ON ingredientes_receta(material_id);

-- ----------------------------------------------------------------------
-- TABLA: extras (NUEVA - adiciones opcionales como fresas, decoración)
-- ----------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS extras (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL,
  material_id UUID NOT NULL REFERENCES materiales(id) ON DELETE RESTRICT,
  cantidad_usada NUMERIC(12, 2) NOT NULL DEFAULT 0,
  precio_extra NUMERIC(12, 2) NOT NULL DEFAULT 0,
  activo BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ----------------------------------------------------------------------
-- TABLA: clientes (sin cambios)
-- ----------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS clientes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL,
  telefono TEXT,
  email TEXT,
  direccion TEXT,
  notas TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ----------------------------------------------------------------------
-- TABLA: pedidos (con campos NUEVOS para formulario público)
-- ----------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS pedidos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id UUID REFERENCES clientes(id) ON DELETE SET NULL,
  receta_id UUID REFERENCES recetas(id) ON DELETE SET NULL,
  cantidad INTEGER NOT NULL DEFAULT 1 CHECK (cantidad > 0),
  precio_total NUMERIC(12, 2) NOT NULL DEFAULT 0,
  estado TEXT NOT NULL DEFAULT 'pendiente' CHECK (
    estado IN ('pendiente', 'en_proceso', 'listo', 'entregado', 'cancelado')
  ),
  fecha_entrega DATE NOT NULL,
  notas TEXT,
  pagado BOOLEAN NOT NULL DEFAULT FALSE,
  -- Campos para pedidos del formulario público
  nombre_cliente_publico TEXT,
  whatsapp_publico TEXT,
  dependencia TEXT,
  extras_ids UUID[],
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Si la tabla ya existía, agregar columnas nuevas
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS nombre_cliente_publico TEXT;
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS whatsapp_publico TEXT;
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS dependencia TEXT;
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS extras_ids UUID[];

CREATE INDEX IF NOT EXISTS idx_pedidos_fecha ON pedidos(fecha_entrega);
CREATE INDEX IF NOT EXISTS idx_pedidos_estado ON pedidos(estado);

-- ----------------------------------------------------------------------
-- TRIGGER updated_at
-- ----------------------------------------------------------------------
CREATE OR REPLACE FUNCTION actualizar_updated_at()
RETURNS TRIGGER 
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_materiales_updated ON materiales;
CREATE TRIGGER trg_materiales_updated
  BEFORE UPDATE ON materiales
  FOR EACH ROW EXECUTE FUNCTION actualizar_updated_at();

DROP TRIGGER IF EXISTS trg_recetas_updated ON recetas;
CREATE TRIGGER trg_recetas_updated
  BEFORE UPDATE ON recetas
  FOR EACH ROW EXECUTE FUNCTION actualizar_updated_at();

-- ======================================================================
-- SEGURIDAD: RLS con permiso público para formulario y autenticado para admin
-- ======================================================================

ALTER TABLE materiales ENABLE ROW LEVEL SECURITY;
ALTER TABLE recetas ENABLE ROW LEVEL SECURITY;
ALTER TABLE ingredientes_receta ENABLE ROW LEVEL SECURITY;
ALTER TABLE extras ENABLE ROW LEVEL SECURITY;
ALTER TABLE clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE pedidos ENABLE ROW LEVEL SECURITY;

-- ===== MATERIALES: solo admin =====
DROP POLICY IF EXISTS "Acceso autenticado a materiales" ON materiales;
DROP POLICY IF EXISTS "Admin gestiona materiales" ON materiales;
CREATE POLICY "Admin gestiona materiales" ON materiales
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ===== RECETAS: lectura pública para visibles, escritura admin =====
DROP POLICY IF EXISTS "Acceso autenticado a recetas" ON recetas;
DROP POLICY IF EXISTS "Lectura publica recetas visibles" ON recetas;
DROP POLICY IF EXISTS "Admin gestiona recetas" ON recetas;
CREATE POLICY "Lectura publica recetas visibles" ON recetas
  FOR SELECT TO anon USING (visible_publico = true);
CREATE POLICY "Admin gestiona recetas" ON recetas
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ===== INGREDIENTES: solo admin =====
DROP POLICY IF EXISTS "Acceso autenticado a ingredientes" ON ingredientes_receta;
DROP POLICY IF EXISTS "Admin gestiona ingredientes" ON ingredientes_receta;
CREATE POLICY "Admin gestiona ingredientes" ON ingredientes_receta
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ===== EXTRAS: lectura pública si están activos, escritura admin =====
DROP POLICY IF EXISTS "Lectura publica extras activos" ON extras;
DROP POLICY IF EXISTS "Admin gestiona extras" ON extras;
CREATE POLICY "Lectura publica extras activos" ON extras
  FOR SELECT TO anon USING (activo = true);
CREATE POLICY "Admin gestiona extras" ON extras
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ===== CLIENTES: el formulario público puede crear, admin lee/edita =====
DROP POLICY IF EXISTS "Acceso autenticado a clientes" ON clientes;
DROP POLICY IF EXISTS "Publico crea cliente" ON clientes;
DROP POLICY IF EXISTS "Publico busca cliente por telefono" ON clientes;
DROP POLICY IF EXISTS "Admin gestiona clientes" ON clientes;
CREATE POLICY "Publico busca cliente por telefono" ON clientes
  FOR SELECT TO anon USING (true);
CREATE POLICY "Publico crea cliente" ON clientes
  FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Admin gestiona clientes" ON clientes
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ===== PEDIDOS: el formulario público puede crear, admin gestiona =====
DROP POLICY IF EXISTS "Acceso autenticado a pedidos" ON pedidos;
DROP POLICY IF EXISTS "Publico crea pedido" ON pedidos;
DROP POLICY IF EXISTS "Admin gestiona pedidos" ON pedidos;
CREATE POLICY "Publico crea pedido" ON pedidos
  FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Admin gestiona pedidos" ON pedidos
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- =====================================================================
-- LISTO. Recarga la app y todo debería funcionar.
-- =====================================================================
