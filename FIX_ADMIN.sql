
-- 1. Asegurar que las columnas existen y son accesibles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- 2. Política para que CUALQUIER usuario pueda leer SU PROPIO perfil (incluyendo rol y banned)
CREATE POLICY "Users can view own profile" 
ON profiles FOR SELECT 
USING ( auth.uid() = id );

-- 3. Si ya existía una política restrictiva, quizás necesites borrarla primero:
-- DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
-- Y luego volver a crearla ^

-- 4. FORZAR ADMIN (Cambia TU_EMAIL por tu correo real)
UPDATE profiles 
SET role = 'admin', is_banned = false
WHERE id IN (SELECT id FROM auth.users WHERE email = 'TU_EMAIL_AQUI');

-- 5. Verificar (Opcional)
-- SELECT * FROM profiles WHERE role = 'admin';
