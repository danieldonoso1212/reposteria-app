-- =====================================================================
-- ESQUEMA LIMPIO - PARA EMPEZAR DESDE CERO
-- =====================================================================
-- ADVERTENCIA: Este script BORRA todas las tablas existentes y las recrea.
-- Solo úsalo si quieres empezar limpio o si la estructura está corrupta.
-- Los datos que tengas SE PERDERAN.
-- =====================================================================

-- Eliminar todo lo existente (en orden inverso por las dependencias)
DROP TABLE IF EXISTS pedidos CASCADE;
DROP TABLE IF EXISTS extras CASCADE;
DROP TABLE IF EXISTS ingredientes_receta CASCADE;
DROP TABLE IF EXISTS recetas CASCADE;
DROP TABLE IF EXISTS clientes CASCADE;
DROP TABLE IF EXISTS materiales CASCADE;
DROP FUNCTION IF EXISTS actualizar_updated_at() CASCADE;

-- ----------------------------------------------------------------------
-- TABLAS
-- ----------------------------------------------------------------------

CREATE TABLE materiales (
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

CREATE TABLE recetas (
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

CREATE TABLE ingredientes_receta (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  receta_id UUID NOT NULL REFERENCES recetas(id) ON DELETE CASCADE,
  material_id UUID NOT NULL REFERENCES materiales(id) ON DELETE RESTRICT,
  cantidad NUMERIC(12, 2) NOT NULL CHECK (cantidad > 0),
  UNIQUE(receta_id, material_id)
);

CREATE TABLE extras (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL,
  material_id UUID NOT NULL REFERENCES materiales(id) ON DELETE RESTRICT,
  cantidad_usada NUMERIC(12, 2) NOT NULL DEFAULT 0,
  precio_extra NUMERIC(12, 2) NOT NULL DEFAULT 0,
  activo BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE clientes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL,
  telefono TEXT,
  email TEXT,
  direccion TEXT,
  notas TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE pedidos (
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
  nombre_cliente_publico TEXT,
  whatsapp_publico TEXT,
  dependencia TEXT,
  extras_ids UUID[],
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_ingredientes_receta ON ingredientes_receta(receta_id);
CREATE INDEX idx_pedidos_fecha ON pedidos(fecha_entrega);
CREATE INDEX idx_pedidos_estado ON pedidos(estado);

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

CREATE TRIGGER trg_materiales_updated
  BEFORE UPDATE ON materiales
  FOR EACH ROW EXECUTE FUNCTION actualizar_updated_at();

CREATE TRIGGER trg_recetas_updated
  BEFORE UPDATE ON recetas
  FOR EACH ROW EXECUTE FUNCTION actualizar_updated_at();

-- ----------------------------------------------------------------------
-- SEGURIDAD (RLS)
-- ----------------------------------------------------------------------

ALTER TABLE materiales ENABLE ROW LEVEL SECURITY;
ALTER TABLE recetas ENABLE ROW LEVEL SECURITY;
ALTER TABLE ingredientes_receta ENABLE ROW LEVEL SECURITY;
ALTER TABLE extras ENABLE ROW LEVEL SECURITY;
ALTER TABLE clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE pedidos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin gestiona materiales" ON materiales
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Lectura publica recetas visibles" ON recetas
  FOR SELECT TO anon USING (visible_publico = true);
CREATE POLICY "Admin gestiona recetas" ON recetas
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Admin gestiona ingredientes" ON ingredientes_receta
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Lectura publica ingredientes" ON ingredientes_receta
  FOR SELECT TO anon USING (true);

CREATE POLICY "Lectura publica extras activos" ON extras
  FOR SELECT TO anon USING (activo = true);
CREATE POLICY "Admin gestiona extras" ON extras
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Publico busca cliente por telefono" ON clientes
  FOR SELECT TO anon USING (true);
CREATE POLICY "Publico crea cliente" ON clientes
  FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Admin gestiona clientes" ON clientes
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Publico crea pedido" ON pedidos
  FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Admin gestiona pedidos" ON pedidos
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Forzar recarga del caché
NOTIFY pgrst, 'reload schema';
