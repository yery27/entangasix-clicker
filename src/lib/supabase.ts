// This file is a placeholder to show where the backend integration would happen.
// Currently we are using Zustand Persist (LocalStorage) for the "Database".

import { createClient } from '@supabase/supabase-js';

// TODO: Replace with your real Supabase keys
const SUPABASE_URL = 'https://ebblkvpsqdjlhnzjbyir.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImViYmxrdnBzcWRqbGhuempieWlyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAwNjUwMzUsImV4cCI6MjA4NTY0MTAzNX0.qUFJIQ-USKzl4Qq2GlK-0WHYw9pD3_g9iR9M0vZ79nw';

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Example Service API
export const api = {
    async getClassmates() {
        // const { data } = await supabase.from('users').select('*');
        // return data;
        return [];
    },

    async updateScore(userId: string, score: number) {
        // Placeholder for future implementation
        console.log("Mock updateScore:", userId, score);
        // await supabase.from('scores').upsert({ user_id: userId, score });
    }
}
