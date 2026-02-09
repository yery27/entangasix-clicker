-- ⚠️ PRECAUCIÓN: ESTE SCRIPT BORRARÁ EL PROGRESO DE TODOS LOS JUGADORES ⚠️
-- Ejecuta esto en el "SQL Editor" de tu panel de Supabase.

-- 1. Resetear monedas y estadísticas principales
UPDATE profiles 
SET 
  coins = 0,
  lifetime_coins = 0,
  click_power = 1,
  auto_click_power = 0,
  inventory = '{}',
  game_stats = '{}',
  last_seen = NOW();

-- 2. Opcional: Si quieres borrar también los cosméticos comprados, descomenta la siguiente línea:
-- UPDATE profiles SET cosmetics = '{"owned": [], "equipped": {}}';

-- 3. Borrar historial de transacciones o logs si tienes otra tabla (ej. game_logs)
-- TRUNCATE TABLE game_logs; 
