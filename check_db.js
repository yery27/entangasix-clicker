
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ebblkvpsqdjlhnzjbyir.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImViYmxrdnBzcWRqbGhuempieWlyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAwNjUwMzUsImV4cCI6MjA4NTY0MTAzNX0.qUFJIQ-USKzl4Qq2GlK-0WHYw9pD3_g9iR9M0vZ79nw';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function testConnection() {
    console.log('Testing Supabase Connection...');
    try {
        const { data, error } = await supabase.from('profiles').select('count', { count: 'exact', head: true });

        if (error) {
            console.error('SERVER ERROR:', error.message);
            if (error.code === '42P01') {
                console.log('DIAGNOSIS: Table "profiles" DOES NOT EXIST.');
            }
        } else {
            console.log('SUCCESS: Table "profiles" exists.');
            console.log('Row count:', data); // data is null for head:true usually but count should be in count
        }
    } catch (e: any) {
        console.error('CLIENT ERROR:', e.message);
    }
}

testConnection();
