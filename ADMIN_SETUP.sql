-- 1. Añadir columnas para Administración
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user',
ADD COLUMN IF NOT EXISTS is_banned BOOLEAN DEFAULT false;

-- 2. (OPCIONAL) Convertirte en Admin
-- Sustituye 'TU_ID_DE_USUARIO' por tu ID de Supabase (lo puedes ver en la tabla users)
-- O simplemente ejecuta esto después de registrarte y busca tu usuario en la tabla profiles para cambiar 'user' por 'admin' manualmente.

-- Ejemplo para hacerte admin directamente si sabes tu email:
-- UPDATE profiles SET role = 'admin' WHERE id IN (SELECT id FROM auth.users WHERE email = 'tu_email@ejemplo.com');

-- 3. Políticas de Seguridad (Rápido)
-- Permitir que los admins vean y editen todo (Si usas RLS). Si no, el panel funcionará igual desde el cliente pero es menos seguro.
