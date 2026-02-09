-- ACTIVA LA REPLICACIÓN EN TIEMPO REAL PARA PERFILES
-- Esto permite que el juego se entere INSTANTÁNEAMENTE si baneas a alguien.

-- 1. Añadir la tabla profiles a la publicación "supabase_realtime"
-- Si da error diciendo que "already exists", es que ya estaba activado (no pasa nada).
ALTER PUBLICATION supabase_realtime ADD TABLE profiles;

-- 2. Asegurar que los datos nuevos son visibles (Replica Identity)
ALTER TABLE profiles REPLICA IDENTITY FULL;

-- ¡Listo! Dale a RUN.
