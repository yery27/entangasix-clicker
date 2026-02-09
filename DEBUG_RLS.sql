-- 1. DESACTIVAR LA SEGURIDAD (RLS) TEMPORALMENTE
-- Esto hará que cualquiera pueda leer la tabla, para comprobar si es un problema de permisos.
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;

-- 2. ASEGURAR QUE TU ROL ES ADMIN
UPDATE profiles 
SET role = 'admin' 
WHERE id = (SELECT id FROM auth.users WHERE email = 'TU_EMAIL_AQUI');
