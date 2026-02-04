
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ebblkvpsqdjlhnzjbyir.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImViYmxrdnBzcWRqbGhuempieWlyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAwNjUwMzUsImV4cCI6MjA4NTY0MTAzNX0.qUFJIQ-USKzl4Qq2GlK-0WHYw9pD3_g9iR9M0vZ79nw';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function diagnose() {
    console.log('--- DIAGNOSTICO DE SUPABASE ---');

    // 1. Check direct access to profiles
    const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('*');

    if (profileError) {
        console.error('ERROR AL LEER PERFILES:', profileError.message);
        console.error('Codigo:', profileError.code);
        if (profileError.code === '42P01') {
            console.log('>>> CAUSA: La tabla "profiles" NO EXISTE. No has ejecutado el SQL.');
        } else {
            console.log('>>> CAUSA: Error de permisos o desconocido.');
        }
    } else {
        console.log('TABLA PERFILES OK. Filas encontradas:', profiles.length);
        if (profiles.length === 0) {
            console.log('>>> AVISO: La tabla existe pero esta VACIA. Nadie se ha registrado correctamente aun.');
        } else {
            console.log('PRIMER PERFIL:', profiles[0]);
        }
    }
}

diagnose();
