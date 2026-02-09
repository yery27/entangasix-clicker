-- ============================================================================
-- GATES OF CLICKER V3.1 - GOD MODE FIX
-- ============================================================================
-- INSTRUCCIONES:
-- Borra lo que tengas en el SQL Editor y PEGA ESTO COMPLETO.

-- 1. ASEGURAR TABLA (Si ya existe no pasa nada)
CREATE TABLE IF NOT EXISTS server_settings (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL
);

-- 2. ASEGURAR VALOR INICIAL
INSERT INTO server_settings (key, value) VALUES ('maintenance_mode', 'false'::jsonb) 
ON CONFLICT (key) DO NOTHING;

-- 3. ASEGURAR COLUMNAS EN PROFILES (Si ya existen no pasa nada)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS ban_reason TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS lifetime_coins BIGINT DEFAULT 0;

-- 4. ACTUALIZAR lifetime_coins SI ES 0 (Opcional, para arreglar datos viejos)
UPDATE profiles SET lifetime_coins = coins WHERE lifetime_coins = 0 OR lifetime_coins IS NULL;

-- 5. RE-HACER POLÍTICAS DE SEGURIDAD (Esto arregla el error que te dio)
-- Habilitar RLS
ALTER TABLE server_settings ENABLE ROW LEVEL SECURITY;

-- Borrar políticas viejas si existen para evitar duplicados
DROP POLICY IF EXISTS "Public Read Settings" ON server_settings;
DROP POLICY IF EXISTS "Admin Update Settings" ON server_settings;
DROP POLICY IF EXISTS "Public Server Settings Read" ON server_settings;
DROP POLICY IF EXISTS "Admin Server Settings Update" ON server_settings;

-- Crear políticas limpias
CREATE POLICY "Public Read Settings" ON server_settings FOR SELECT USING (true);

-- Política para que SOLO el admin pueda editar
CREATE POLICY "Admin Update Settings" ON server_settings FOR ALL USING (
  auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin')
) WITH CHECK (
  auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin')
);

-- Asegurar Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE server_settings;
