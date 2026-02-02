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

            toggleSound: () => {
                const { soundEnabled } = get();
                set({ soundEnabled: !soundEnabled });
            },

            click: () => {
                const { clickPower } = get();
                set(state => ({
                    coins: state.coins + clickPower,
                    lifetimeCoins: state.lifetimeCoins + clickPower
                }));
            },

            addCoins: (amount) => {
                set(state => ({
                    coins: state.coins + amount,
                    lifetimeCoins: state.lifetimeCoins + Math.max(0, amount)
                }));
            },

            removeCoins: (amount) => {
                const { coins } = get();
                if (coins >= amount) {
                    set(state => ({ coins: state.coins - amount }));
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

                // Auto-save every 10 seconds
                if (now - lastSaveTime > 10000) {
                    saveGame();
                    set({ lastSaveTime: now });
                }
            },

            loadGame: async () => {
                try {
                    const { data: { user } } = await supabase.auth.getUser();
                    if (!user) return;

                    const { data: profile, error } = await supabase
                        .from('profiles')
                        .select('coins, lifetime_coins, click_power, auto_click_power, inventory')
                        .eq('id', user.id)
                        .single();

                    if (error && error.code !== 'PGRST116') {
                        console.error('Error loading game:', error);
                        return;
                    }

                    if (profile) {
                        set({
                            coins: Number(profile.coins),
                            lifetimeCoins: Number(profile.lifetime_coins),
                            clickPower: Number(profile.click_power),
                            autoClickPower: Number(profile.auto_click_power),
                            inventory: typeof profile.inventory === 'string'
                                ? JSON.parse(profile.inventory)
                                : profile.inventory || {}
                        });
                        console.log('Game loaded from cloud');
                    }
                } catch (e) {
                    console.error('Failed to load game:', e);
                }
            },

            saveGame: async () => {
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
                    // console.log('Game saved to cloud');
                } catch (e) {
                    console.error('Failed to save game:', e);
                }
            }
        }),
        {
            name: 'game-storage',
        }
    )
);
