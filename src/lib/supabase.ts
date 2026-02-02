// This file is a placeholder to show where the backend integration would happen.
// Currently we are using Zustand Persist (LocalStorage) for the "Database".

import { createClient } from '@supabase/supabase-js';

// TODO: Replace with your real Supabase keys
const SUPABASE_URL = 'https://YOUR_PROJECT.supabase.co';
const SUPABASE_KEY = 'YOUR_ANON_KEY';

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
