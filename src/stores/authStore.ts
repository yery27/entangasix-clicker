import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface User {
    id: string;
    username: string;
    avatar?: string;
    password?: string;
    level: number;
    xp: number;
    friends: string[]; // List of friend IDs (mock)
}

interface AuthState {
    user: User | null;
    users: User[]; // Mock "Database" of all users
    isAuthenticated: boolean;
    login: (username: string, password?: string) => Promise<void>;
    register: (username: string, password?: string) => Promise<void>;
    updateUser: (updates: Partial<User>) => void;
    logout: () => void;
    addFriend: (username: string) => void;
    removeFriend: (username: string) => void;
}

export const useAuthStore = create<AuthState>()(
    persist(
        (set, get) => ({
            user: null,
            users: [],
            isAuthenticated: false,

            login: async (username, password) => {
                await new Promise(resolve => setTimeout(resolve, 500));
                const { users } = get();
                const foundUser = users.find(u => u.username.toLowerCase() === username.toLowerCase());

                if (foundUser) {
                    if (password && foundUser.password && foundUser.password !== password) {
                        throw new Error("Contraseña incorrecta");
                    }
                    // Migrate old users who might not have friends array
                    const userWithFriends = { ...foundUser, friends: foundUser.friends || ['Bot-Alice', 'Bot-Bob'] };
                    set({ user: userWithFriends, isAuthenticated: true });
                } else {
                    throw new Error("Usuario no encontrado");
                }
            },

            register: async (username, password) => {
                await new Promise(resolve => setTimeout(resolve, 500));
                const { users } = get();

                if (users.some(u => u.username.toLowerCase() === username.toLowerCase())) {
                    throw new Error("El usuario ya existe");
                }

                const newUser: User = {
                    id: 'user-' + Date.now(),
                    username,
                    password,
                    avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`,
                    level: 1,
                    xp: 0,
                    friends: ['Bot-Alice', 'Bot-Bob'] // Default mock friends
                };

                set(state => ({
                    users: [...state.users, newUser],
                    user: newUser,
                    isAuthenticated: true
                }));
            },

            updateUser: (updates: Partial<User>) => {
                set(state => {
                    const { user, users } = state;
                    if (!user) return state;

                    if (updates.username && updates.username.toLowerCase() !== user.username.toLowerCase()) {
                        if (users.some(u => u.username.toLowerCase() === updates.username!.toLowerCase() && u.id !== user.id)) {
                            throw new Error("El nombre de usuario ya está en uso");
                        }
                    }

                    const updatedUser = { ...user, ...updates };
                    const updatedUsers = users.map(u => u.id === user.id ? updatedUser : u);

                    return { user: updatedUser, users: updatedUsers };
                });
            },

            logout: () => set({ user: null, isAuthenticated: false }),

            addFriend: (username) => set((state) => {
                if (!state.user) return state;
                const currentFriends = state.user.friends || [];
                if (currentFriends.includes(username)) return state;

                const updatedUser = { ...state.user, friends: [...currentFriends, username] };
                const updatedUsers = state.users.map(u => u.id === state.user!.id ? updatedUser : u);
                return { user: updatedUser, users: updatedUsers };
            }),

            removeFriend: (username) => set((state) => {
                if (!state.user) return state;
                const currentFriends = state.user.friends || [];
                const updatedUser = { ...state.user, friends: currentFriends.filter(f => f !== username) };
                const updatedUsers = state.users.map(u => u.id === state.user!.id ? updatedUser : u);
                return { user: updatedUser, users: updatedUsers };
            }),
        }),
        {
            name: 'auth-storage-v2',
        }
    )
);
