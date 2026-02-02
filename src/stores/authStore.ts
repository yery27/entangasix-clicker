import { create } from 'zustand';
import { supabase } from '../lib/supabase';

export interface User {
    id: string;
    email?: string;
    username: string;
    avatar_url?: string;
    full_name?: string;
}

interface AuthState {
    user: User | null;
    isAuthenticated: boolean;
    loading: boolean;

    login: (email: string, password: string) => Promise<void>;
    register: (email: string, password: string, username: string) => Promise<void>;
    logout: () => Promise<void>;
    checkSession: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
    user: null,
    isAuthenticated: false,
    loading: true,

    login: async (email, password) => {
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password
        });

        if (error) throw error;

        if (data.user) {
            // Fetch profile
            const { data: profile } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', data.user.id)
                .single();

            set({
                user: {
                    id: data.user.id,
                    email: data.user.email,
                    username: profile?.username || data.user.email?.split('@')[0] || 'User',
                    avatar_url: profile?.avatar_url,
                },
                isAuthenticated: true
            });
        }
    },

    register: async (email, password, username) => {
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    username,
                    avatar_url: `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`
                }
            }
        });

        if (error) throw error;

        if (data.user) {
            set({
                user: {
                    id: data.user.id,
                    email: data.user.email,
                    username,
                    avatar_url: `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`
                },
                isAuthenticated: true
            });
        }
    },

    logout: async () => {
        await supabase.auth.signOut();
        set({ user: null, isAuthenticated: false });
    },

    checkSession: async () => {
        set({ loading: true });
        const { data: { session } } = await supabase.auth.getSession();

        if (session?.user) {
            const { data: profile } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', session.user.id)
                .single();

            set({
                user: {
                    id: session.user.id,
                    email: session.user.email,
                    username: profile?.username || session.user.user_metadata.username || 'User',
                    avatar_url: profile?.avatar_url || session.user.user_metadata.avatar_url,
                },
                isAuthenticated: true
            });
        } else {
            set({ user: null, isAuthenticated: false });
        }
        set({ loading: false });
    }
}));
