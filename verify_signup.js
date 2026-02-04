
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ebblkvpsqdjlhnzjbyir.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImViYmxrdnBzcWRqbGhuempieWlyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAwNjUwMzUsImV4cCI6MjA4NTY0MTAzNX0.qUFJIQ-USKzl4Qq2GlK-0WHYw9pD3_g9iR9M0vZ79nw';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function testSignup() {
    const email = `test_bot_${Date.now()}@test.com`;
    const password = 'password123';
    const username = `Bot_${Date.now()}`;

    console.log(`Intentando registrar: ${email} ...`);

    // 1. Sign Up
    const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
            data: {
                username,
                avatar_url: 'https://example.com/avatar.png'
            }
        }
    });

    if (authError) {
        console.error('❌ ERROR AL REGISTRAR (Auth):', authError.message);
        return;
    }

    if (!authData.user) {
        console.error('❌ No se ha creado el usuario (Auth data nulo). ¿Quizás confirmación de email requerida?');
        return;
    }

    const userId = authData.user.id;
    console.log(`✅ Usuario creado en Auth. ID: ${userId}`);

    // Delta time for trigger to run
    await new Promise(r => setTimeout(r, 2000));

    // 2. Check Profile
    const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

    if (profileError) {
        console.error('❌ ERROR AL BUSCAR PERFIL:', profileError.message);
        console.log('>>> DIAGNOSTICO: El usuario se creó en Auth, pero el Trigger falló o no se ejecutó.');
    } else if (profile) {
        console.log('✅ PERFIL CREADO CORRECTAMENTE:', profile);
        console.log('>>> CONCLUSION: El sistema funciona. El problema del usuario es probablemente cuentas antiguas.');
    } else {
        console.error('❌ PERFIL NO ENCONTRADO (Sin error, pero null).');
    }
}

testSignup();
