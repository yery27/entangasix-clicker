import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { SHOP_ITEMS } from '../lib/constants';

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
            soundEnabled: true, // Default ON

            toggleSound: () => {
                const { soundEnabled } = get();
                const newState = !soundEnabled;
                set({ soundEnabled: newState });
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
                    lifetimeCoins: state.lifetimeCoins + Math.max(0, amount) // Only add positive amounts to lifetime
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

                if (type === 'click') {
                    const item = SHOP_ITEMS.click.find(i => i.id === itemId);
                    if (!item) return false;

                    const currentQty = state.inventory[itemId] || 0;
                    const cost = Math.floor(item.cost * Math.pow(1.15, currentQty));

                    if (state.coins >= cost) {
                        set(s => ({
                            coins: s.coins - cost,
                            inventory: { ...s.inventory, [itemId]: currentQty + 1 },
                            clickPower: s.clickPower + item.increase,
                        }));
                        return true;
                    }
                } else {
                    const item = SHOP_ITEMS.idle.find(i => i.id === itemId);
                    if (!item) return false;

                    const currentQty = state.inventory[itemId] || 0;
                    const cost = Math.floor(item.cost * Math.pow(1.15, currentQty));

                    if (state.coins >= cost) {
                        set(s => ({
                            coins: s.coins - cost,
                            inventory: { ...s.inventory, [itemId]: currentQty + 1 },
                            autoClickPower: s.autoClickPower + item.cps,
                        }));
                        return true;
                    }
                }

                return false;
            },

            tick: () => {
                const { autoClickPower } = get();
                // Calculate offline progress could be done here based on lastSaveTime
                // For now just simple tick
                if (autoClickPower > 0) {
                    set(state => ({
                        coins: state.coins + autoClickPower,
                        lifetimeCoins: state.lifetimeCoins + autoClickPower,
                        lastSaveTime: Date.now()
                    }));
                } else {
                    set({ lastSaveTime: Date.now() });
                }
            },
        }),
        {
            name: 'game-storage',
        }
    )
);
