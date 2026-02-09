import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';

export interface User {
    id: string;
    email?: string;
    username: string;
    avatar_url?: string;
    full_name?: string;
    role?: 'user' | 'admin';
    is_banned?: boolean;
}

interface AuthState {
    user: User | null;
    isAuthenticated: boolean;
    loading: boolean;

    login: (email: string, password: string) => Promise<void>;
    register: (email: string, password: string, username: string) => Promise<void>;
    logout: () => Promise<void>;
    checkSession: () => Promise<void>;
    updateUser: (updates: Partial<User> & { password?: string }) => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
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

            if (!profile) {
                await supabase.auth.signOut();
                throw new Error('Cuenta deshabilitada o no encontrada.');
            }

            set({
                user: {
                    id: data.user.id,
                    email: data.user.email,
                    username: profile.username || 'User',
                    avatar_url: profile.avatar_url,
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
                    avatar_url: `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`,
                    role: 'user', // Default role for new users
                    is_banned: false, // Default ban status for new users
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
                .select('username, avatar_url, role, is_banned') // Fetch new fields
                .eq('id', session.user.id)
                .single();

            if (!profile) {
                console.warn("Profile missing for user, logging out.");
                await supabase.auth.signOut();
                set({ user: null, isAuthenticated: false });
            } else {
                if (profile.is_banned) {
                    await supabase.auth.signOut();
                    toast.error("🚫 TU CUENTA HA SIDO BANEADA PERMANENTEMENTE.");
                    set({ user: null, isAuthenticated: false });
                    set({ loading: false }); // Ensure loading is set to false even if banned
                    return;
                }

                set({
                    user: {
                        id: session.user.id,
                        email: session.user.email,
                        username: profile.username || session.user.user_metadata.username || 'User',
                        avatar_url: profile.avatar_url || session.user.user_metadata.avatar_url,
                        role: profile.role || 'user',
                        is_banned: profile.is_banned || false,
                    },
                    isAuthenticated: true
                });
            }
        } else {
            set({ user: null, isAuthenticated: false });
        }
        set({ loading: false });
    },

    updateUser: async (updates: Partial<User> & { password?: string }) => {
        const { user } = get();
        if (!user) return;

        // Update auth (password)
        if (updates.password) {
            const { error } = await supabase.auth.updateUser({ password: updates.password });
            if (error) throw error;
        }

        // Update profile (username, avatar)
        const profileUpdates: any = {};
        if (updates.username) profileUpdates.username = updates.username;
        if (updates.avatar_url) profileUpdates.avatar_url = updates.avatar_url;

        if (Object.keys(profileUpdates).length > 0) {
            const { error } = await supabase
                .from('profiles')
                .update(profileUpdates)
                .eq('id', user.id);

            if (error) throw error;
        }

        // Update local state
        set(state => ({
            user: state.user ? { ...state.user, ...updates } : null
        }));
    }
}));
