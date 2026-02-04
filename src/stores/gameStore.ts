import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { SHOP_ITEMS } from '../lib/constants';
import { supabase } from '../lib/supabase';

interface GameState {
    coins: number;
    lifetimeCoins: number;
    clickPower: number;
    autoClickPower: number; // CPS
    inventory: Record<string, number>; // itemId -> quantity
    lastSaveTime: number;
    soundEnabled: boolean;

    // Actions
    click: () => void;
    addCoins: (amount: number) => void;
    removeCoins: (amount: number) => boolean;
    buyItem: (type: 'click' | 'idle', itemId: string) => boolean;
    tick: () => void; // Called every second
    toggleSound: () => void;

    // Cloud Sync
    loadGame: () => Promise<void>;
    saveGame: () => Promise<void>;
    initializeSync: () => Promise<(() => void) | undefined>;
    isLoaded: boolean;
    saveTimeout: any; // Using any to avoid NodeJS/Window timeout conflicts

    debouncedSave: () => void;
}

export const useGameStore = create<GameState>()(
    persist(
        (set, get) => ({
            coins: 0,
            lifetimeCoins: 0,
            clickPower: 1,
            autoClickPower: 0,
            inventory: {},
            lastSaveTime: Date.now(),
            soundEnabled: true,
            isLoaded: false,
            saveTimeout: null,

            toggleSound: () => {
                const { soundEnabled } = get();
                set({ soundEnabled: !soundEnabled });
            },

            // Helper for smart saving
            debouncedSave: () => {
                const { saveTimeout, saveGame } = get();
                if (saveTimeout) clearTimeout(saveTimeout);

                const newTimeout = setTimeout(() => {
                    saveGame();
                }, 2000); // Save 2 seconds after last action

                set({ saveTimeout: newTimeout });
            },

            click: () => {
                const { clickPower, debouncedSave } = get();
                set(state => ({
                    coins: state.coins + clickPower,
                    lifetimeCoins: state.lifetimeCoins + clickPower
                }));
                debouncedSave();
            },

            addCoins: (amount) => {
                const { debouncedSave } = get();
                set(state => ({
                    coins: state.coins + amount,
                    lifetimeCoins: state.lifetimeCoins + Math.max(0, amount)
                }));
                debouncedSave();
            },

            removeCoins: (amount) => {
                const { coins, debouncedSave } = get();
                if (coins >= amount) {
                    set(state => ({ coins: state.coins - amount }));
                    debouncedSave();
                    return true;
                }
                return false;
            },

            buyItem: (type, itemId) => {
                const state = get();
                let item;
                if (type === 'click') {
                    item = SHOP_ITEMS.click.find(i => i.id === itemId);
                } else {
                    item = SHOP_ITEMS.idle.find(i => i.id === itemId);
                }

                if (!item) return false;

                const currentQty = state.inventory[itemId] || 0;
                const cost = Math.floor(item.cost * Math.pow(1.15, currentQty));

                if (state.coins >= cost) {
                    let newClickPower = state.clickPower;
                    let newAutoClickPower = state.autoClickPower;

                    if (type === 'click' && 'increase' in item) {
                        newClickPower += item.increase;
                    } else if (type === 'idle' && 'cps' in item) {
                        newAutoClickPower += item.cps;
                    }

                    set(s => ({
                        coins: s.coins - cost,
                        inventory: { ...s.inventory, [itemId]: currentQty + 1 },
                        clickPower: newClickPower,
                        autoClickPower: newAutoClickPower,
                    }));
                    // Trigger a save after purchase
                    get().saveGame();
                    return true;
                }
                return false;
            },

            tick: () => {
                const { autoClickPower, lastSaveTime, saveGame } = get();
                const now = Date.now();

                if (autoClickPower > 0) {
                    set(state => ({
                        coins: state.coins + autoClickPower,
                        lifetimeCoins: state.lifetimeCoins + autoClickPower,
                        lastSaveTime: now
                    }));
                } else {
                    set({ lastSaveTime: now });
                }

                // Auto-save every 3 seconds (Real-time feel)
                if (now - lastSaveTime > 3000) {
                    saveGame();
                    set({ lastSaveTime: now });
                }
            },

            loadGame: async () => {
                try {
                    const { data: { user } } = await supabase.auth.getUser();
                    if (!user) {
                        // Even if no user, we consider 'load' complete for anonymous usage (or just abort)
                        // But for safety, let's say isLoaded = true only if we attempted a fetch or sure we are offline?
                        // Actually, if !user, we probably shouldn't set isLoaded=true for cloud purposes, 
                        // BUT if the user proceeds to play, we might want to allow saving locally? 
                        // The persist middleware handles local storage. This is cloud load.
                        return;
                    }

                    const { data: profile, error } = await supabase
                        .from('profiles')
                        .select('coins, lifetime_coins, click_power, auto_click_power, inventory')
                        .eq('id', user.id)
                        .single();

                    if (error && error.code !== 'PGRST116') {
                        console.error('Error loading game:', error);
                        return;
                    }

                    const localState = get();

                    if (profile) {
                        const cloudLifetime = Number(profile.lifetime_coins);
                        const localLifetime = localState.lifetimeCoins;

                        // SMART LOAD: Conflict Resolution
                        if (localLifetime > cloudLifetime) {
                            console.log('Conflict detected: Local progress is ahead of Cloud. Trusting Local & Saving...');
                            set({ isLoaded: true });
                            await get().saveGame();
                        } else {
                            // Cloud is same or ahead, trust Cloud
                            console.log('Loading game from cloud (Cloud is ahead or synced)...');
                            set({
                                coins: Number(profile.coins),
                                lifetimeCoins: Number(profile.lifetime_coins),
                                clickPower: Number(profile.click_power),
                                autoClickPower: Number(profile.auto_click_power),
                                inventory: typeof profile.inventory === 'string'
                                    ? JSON.parse(profile.inventory)
                                    : profile.inventory || {}
                            });
                        }
                    }

                    // Critical: Allow saving only after we've attempted to load
                    set({ isLoaded: true });

                } catch (e) {
                    console.error('Failed to load game:', e);
                }
            },

            saveGame: async () => {
                // Safety Guard: Do not save if we haven't loaded yet
                if (!get().isLoaded) {
                    console.warn('Prevented save before load to avoid overwriting cloud data.');
                    return;
                }

                try {
                    const { data: { user } } = await supabase.auth.getUser();
                    if (!user) return;

                    const state = get();

                    const updates = {
                        id: user.id,
                        coins: state.coins,
                        lifetime_coins: state.lifetimeCoins,
                        click_power: state.clickPower,
                        auto_click_power: state.autoClickPower,
                        inventory: state.inventory,
                        last_seen: new Date().toISOString(),
                    };

                    const { error } = await supabase
                        .from('profiles')
                        .upsert(updates);

                    if (error) throw error;
                } catch (e) {
                    console.error('Failed to save game:', e);
                }
            },

            initializeSync: async () => {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) return;

                console.log('Initializing Real-time Sync for user:', user.id);

                const channel = supabase
                    .channel(`profile:${user.id}`)
                    .on(
                        'postgres_changes',
                        {
                            event: 'UPDATE',
                            schema: 'public',
                            table: 'profiles',
                            filter: `id=eq.${user.id}`
                        },
                        (payload) => {
                            const cloudProfile = payload.new;
                            const localState = get();

                            // SYNC LOGIC: Highest Lifetime Coins Wins
                            // If cloud has more progress than local, overwrite local.
                            if (cloudProfile.lifetime_coins > localState.lifetimeCoins) {
                                console.log('Syncing from cloud (remote progress detected)...');
                                set({
                                    coins: Number(cloudProfile.coins),
                                    lifetimeCoins: Number(cloudProfile.lifetime_coins),
                                    clickPower: Number(cloudProfile.click_power),
                                    autoClickPower: Number(cloudProfile.auto_click_power),
                                    inventory: typeof cloudProfile.inventory === 'string'
                                        ? JSON.parse(cloudProfile.inventory)
                                        : cloudProfile.inventory || {}
                                });
                            }
                        }
                    )
                    .subscribe();

                return () => {
                    supabase.removeChannel(channel);
                };
            }
        }),
        {
            name: 'game-storage',
        }
    )
);
