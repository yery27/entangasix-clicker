-- ============================================================================
-- GATES OF CLICKER V3.1 - GOD MODE SCHEMA UPDATE
-- ============================================================================
-- INSTRUCCIONES:
-- 1. Ve a tu proyecto en Supabase (app.supabase.com)
-- 2. Entra en SQL Editor (icono de terminal en la izquierda)
-- 3. Pega este código y dale a "Run"

-- 1. CREAR TABLA DE CONFIGURACIÓN DEL SERVIDOR (Para el Mantenimiento)
CREATE TABLE IF NOT EXISTS server_settings (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insertar valor por defecto (Mantenimiento APAGADO)
INSERT INTO server_settings (key, value)
VALUES ('maintenance_mode', 'false'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- Habilitar Realtime para esta tabla (para que cambie al instante)
ALTER PUBLICATION supabase_realtime ADD TABLE server_settings;


-- 2. ACTUALIZAR TABLA DE PERFILES (Para Baneo y Monedas Totales)
-- Añadir columna 'ban_reason' si no existe
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'ban_reason') THEN
        ALTER TABLE profiles ADD COLUMN ban_reason TEXT;
    END IF;
END $$;

-- Añadir columna 'lifetime_coins' si no existe (y copiar valor actual de coins como inicial)
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'lifetime_coins') THEN
        ALTER TABLE profiles ADD COLUMN lifetime_coins BIGINT DEFAULT 0;
        -- Rellenar con las monedas actuales para empezar
        UPDATE profiles SET lifetime_coins = coins;
    END IF;
END $$;


-- 3. PERMISOS (Para asegurarnos que el Admin puede tocar todo)
-- Permitir acceso público de lectura a server_settings (para que todos sepan si hay mantenimiento)
create policy "Public Server Settings Read"
on server_settings for select
using ( true );

-- Permitir a los admin (o a ti mismo) modificar settings
create policy "Admin Server Settings Update"
on server_settings for all
using ( auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin') )
with check ( auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin') );

-- Habilitar RLS en server_settings
alter table server_settings enable row level security;

-- ============================================================================
-- CONFIRMACIÓN
-- ============================================================================
SELECT 'ACTUALIZACIÓN COMPLETADA CON ÉXITO 🚀' as status;
