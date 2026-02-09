import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { toast } from 'sonner';
import { SHOP_ITEMS } from '../lib/constants';
import { supabase } from '../lib/supabase';
import { getISOWeek, getYear, format } from 'date-fns';

interface TimeBucket {
    id: string; // e.g., "2024-W05" or "2024-02"
    score: number;
    claimed?: boolean;
}

interface GameState {
    coins: number;
    lifetimeCoins: number;
    clickPower: number;
    autoClickPower: number; // CPS
    inventory: Record<string, number>; // itemId -> quantity
    lastSaveTime: number;
    soundEnabled: boolean;
    globalMultiplier: number; // For events

    // Actions
    click: () => void;
    addCoins: (amount: number) => void;
    removeCoins: (amount: number) => boolean;
    buyItem: (type: 'click' | 'idle', itemId: string) => boolean;
    tick: () => void; // Called every second
    toggleSound: () => void;
    setGlobalMultiplier: (multiplier: number) => void;

    // Cloud Sync
    loadGame: () => Promise<void>;
    saveGame: () => Promise<boolean>;
    initializeSync: () => Promise<(() => void) | undefined>;
    isLoaded: boolean;
    saveTimeout: any;

    debouncedSave: () => void;

    // Cosmetics
    cosmetics: {
        owned: string[];
        equipped: {
            frame?: string;
            click_effect?: string;
        };
    };
    buyCosmetic: (id: string, cost: number) => boolean;
    equipCosmetic: (type: 'frame' | 'click_effect', id: string) => void;

    // Social / Bizun
    sendClicks: (receiverId: string, amount: number) => Promise<{ success: boolean; message: string }>;

    // Game Stats
    gameStats: Record<string, any>;
    recordGameResult: (gameId: string, result: { win: number; bet: number; custom?: Record<string, number> }) => void;

    // Time-Based Leaderboards
    timeStats: {
        weekly: TimeBucket;
        monthly: TimeBucket;
        annual: TimeBucket;
        last_weekly?: TimeBucket;
        last_monthly?: TimeBucket;
        last_annual?: TimeBucket;
    };
    updateTimeStats: (amount: number) => void;
    claimPrize: (period: 'weekly' | 'monthly' | 'annual', amount: number) => void;
}

export const useGameStore = create<GameState>()(
    persist(
        (set, get) => ({
            coins: 0,
            lifetimeCoins: 0,
            clickPower: 1,
            autoClickPower: 0,
            inventory: {},
            gameStats: {},
            lastSaveTime: Date.now(),
            soundEnabled: true,
            isLoaded: false,
            saveTimeout: null,
            cosmetics: { owned: [], equipped: {} },
            globalMultiplier: 1,
            timeStats: {
                weekly: { id: '', score: 0 },
                monthly: { id: '', score: 0 },
                annual: { id: '', score: 0 }
            },

            setGlobalMultiplier: (multiplier) => set({ globalMultiplier: multiplier }),

            updateTimeStats: (amount) => {
                if (amount <= 0) return;

                const now = new Date();
                const currentWeek = `${getYear(now)}-W${getISOWeek(now)}`;
                const currentMonth = format(now, 'yyyy-MM');
                const currentYear = format(now, 'yyyy');

                set(state => {
                    const ts = { ...state.timeStats };

                    // Weekly Logic
                    if (ts.weekly.id !== currentWeek) {
                        // Archive previous week
                        if (ts.weekly.id) {
                            ts.last_weekly = { ...ts.weekly, claimed: false };
                        }
                        // Reset
                        ts.weekly = { id: currentWeek, score: 0 };
                    }
                    ts.weekly.score += amount;

                    // Monthly Logic
                    if (ts.monthly.id !== currentMonth) {
                        if (ts.monthly.id) {
                            ts.last_monthly = { ...ts.monthly, claimed: false };
                        }
                        ts.monthly = { id: currentMonth, score: 0 };
                    }
                    ts.monthly.score += amount;

                    // Annual Logic
                    if (ts.annual.id !== currentYear) {
                        if (ts.annual.id) {
                            ts.last_annual = { ...ts.annual, claimed: false };
                        }
                        ts.annual = { id: currentYear, score: 0 };
                    }
                    ts.annual.score += amount;

                    return { timeStats: ts };
                });
            },

            recordGameResult: (gameId, { win, bet, custom }) => {
                const { gameStats, saveGame } = get();
                // Ensure typed access
                const current = gameStats[gameId] || { wins: 0, losses: 0, played: 0, wonAmount: 0, lostAmount: 0 };

                const isWin = win > 0;

                // Track net profit for leaderboards? 
                // Or just winnings? Usually leaderboards track Score/Winnings to handle high volume.
                // The implementation plan implies tracking "score". 
                // Let's assume Score = Total Winnings (or Net Profit).
                // If it's Net Profit, we substract bet. If just Volume/Coins Gained, add win.
                // Given "clicker" nature, usually "Coins Earned" is the metric.
                // But for casino, Net Profit is fairer.
                // Let's stick to "Coins Added to Balance" to be safe and consistent with "AddCoins".
                // If win > 0, we called addCoins(win).
                // So updateTimeStats should already be called by addCoins if we hook it there.
                // BUT recordGameResult manually calls addCoins separately in components usually.
                // Wait, components call `addCoins` AND `recordGameResult`.
                // Checking Plinko update: `addCoins(win); ... recordGameResult(...)`.
                // So if we hook `addCoins`, we are good.

                const newStats: any = {
                    ...current,
                    played: (current.played || 0) + 1,
                    wins: (current.wins || 0) + (isWin ? 1 : 0),
                    losses: (current.losses || 0) + (isWin ? 0 : 1),
                    wonAmount: (current.wonAmount || 0) + win,
                    lostAmount: (current.lostAmount || 0) + bet,
                };

                // Merge custom numeric stats
                if (custom) {
                    Object.entries(custom).forEach(([key, val]) => {
                        if (typeof val === 'number') {
                            newStats[key] = ((current as any)[key] || 0) + val;
                        }
                    });
                }

                set({
                    gameStats: {
                        ...gameStats,
                        [gameId]: newStats
                    }
                });

                saveGame();
            },

            claimPrize: (period, amount) => {
                const { timeStats, addCoins, saveGame } = get();
                const key = `last_${period}` as keyof typeof timeStats;
                const bucket = timeStats[key];

                if (bucket && !bucket.claimed) {
                    set(state => ({
                        timeStats: {
                            ...state.timeStats,
                            [key]: { ...bucket, claimed: true }
                        }
                    }));
                    addCoins(amount);
                    toast.success(`🏆 ¡Premio de Top ${period} reclamado! +${amount.toLocaleString()}`);
                    saveGame();
                }
            },

            toggleSound: () => {
                const { soundEnabled } = get();
                set({ soundEnabled: !soundEnabled });
            },

            debouncedSave: () => {
                const { saveTimeout, saveGame } = get();
                if (saveTimeout) clearTimeout(saveTimeout);

                const newTimeout = setTimeout(() => {
                    saveGame();
                }, 2000);

                set({ saveTimeout: newTimeout });
            },

            click: () => {
                const { clickPower, debouncedSave, globalMultiplier, updateTimeStats } = get();
                const amount = clickPower * globalMultiplier;

                set(state => ({
                    coins: state.coins + amount,
                    lifetimeCoins: state.lifetimeCoins + amount
                }));
                updateTimeStats(amount);
                debouncedSave();
            },

            addCoins: (amount) => {
                const { debouncedSave, updateTimeStats } = get();
                set(state => ({
                    coins: state.coins + amount,
                    lifetimeCoins: state.lifetimeCoins + Math.max(0, amount)
                }));
                updateTimeStats(amount);
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



            buyCosmetic: (id, cost) => {
                const { coins, cosmetics, saveGame } = get();
                if (coins >= cost && !cosmetics.owned.includes(id)) {
                    set(state => ({
                        coins: state.coins - cost,
                        cosmetics: {
                            ...state.cosmetics,
                            owned: [...state.cosmetics.owned, id]
                        }
                    }));
                    toast.success('¡Artículo comprado!');
                    saveGame();
                    return true;
                }
                return false;
            },

            equipCosmetic: (type, id) => {
                const { cosmetics, saveGame } = get();
                if (cosmetics.owned.includes(id) || id === '') { // Allow uneqip with empty string
                    set(state => ({
                        cosmetics: {
                            ...state.cosmetics,
                            equipped: {
                                ...state.cosmetics.equipped,
                                [type]: id === '' ? undefined : id
                            }
                        }
                    }));
                    saveGame();
                }
            },



            tick: () => {
                const { autoClickPower, lastSaveTime, saveGame, globalMultiplier, updateTimeStats } = get();
                const now = Date.now();

                if (autoClickPower > 0) {
                    const amount = autoClickPower * globalMultiplier;
                    set(state => ({
                        coins: state.coins + amount,
                        lifetimeCoins: state.lifetimeCoins + amount,
                        lastSaveTime: now
                    }));
                    updateTimeStats(amount);
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
                    if (!user) return;

                    const { data: profile, error } = await supabase
                        .from('profiles')
                        .select('coins, lifetime_coins, click_power, auto_click_power, inventory, cosmetics, game_stats')
                        .eq('id', user.id)
                        .single();

                    if (error && error.code !== 'PGRST116') {
                        console.error('Error loading game:', error);
                        // toast.error('Error cargando partida: ' + error.message);
                        return;
                    }

                    const localState = get();

                    if (profile) {
                        // Load Game Stats to find _time_stats
                        const gStats = typeof profile.game_stats === 'string'
                            ? JSON.parse(profile.game_stats)
                            : profile.game_stats || {};

                        // Extract time stats or default
                        const tStats = gStats._time_stats || {
                            weekly: { id: '', score: 0 },
                            monthly: { id: '', score: 0 },
                            annual: { id: '', score: 0 }
                        };

                        const cloudLifetime = Number(profile.lifetime_coins);
                        const localLifetime = localState.lifetimeCoins;

                        // SMART LOAD: Conflict Resolution
                        if (localLifetime > cloudLifetime) {
                            console.log('Conflict detected: Trusting Local...');
                            toast.info('📅 Sincronizando progreso local con la nube...');
                            set({ isLoaded: true });
                            await get().saveGame();
                        } else {
                            console.log('Loading game from cloud...');
                            set({
                                coins: Number(profile.coins),
                                lifetimeCoins: Number(profile.lifetime_coins),
                                clickPower: Number(profile.click_power),
                                autoClickPower: Number(profile.auto_click_power),
                                inventory: typeof profile.inventory === 'string'
                                    ? JSON.parse(profile.inventory)
                                    : profile.inventory || {},
                                cosmetics: typeof profile.cosmetics === 'string'
                                    ? JSON.parse(profile.cosmetics)
                                    : profile.cosmetics || { owned: [], equipped: {} },
                                gameStats: gStats,
                                timeStats: tStats // Load time stats
                            });
                        }
                    } else {
                        // Reset if no profile found (clean slate)? 
                        // Or keep local defaults if we are initializing a new user logic elsewhere
                    }
                    set({ isLoaded: true });

                } catch (e) {
                    console.error('Failed to load game:', e);
                }
            },

            saveGame: async () => {
                // Safety Guard
                if (!get().isLoaded) {
                    // console.warn('Prevented save before load');
                    return false;
                }

                try {
                    const { data: { user } } = await supabase.auth.getUser();
                    if (!user) {
                        // toast.error('No estás logueado. No se guarda.');
                        return false;
                    }

                    const state = get();

                    const username = user.user_metadata?.username || user.email?.split('@')[0] || 'Unknown User';
                    const avatar_url = user.user_metadata?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`;

                    // Inject timeStats into gameStats for DB storage
                    const statsToSave = {
                        ...state.gameStats,
                        _time_stats: state.timeStats
                    };

                    const updates = {
                        id: user.id,
                        username: username,
                        avatar_url: avatar_url,
                        coins: state.coins,
                        lifetime_coins: state.lifetimeCoins,
                        click_power: state.clickPower,
                        auto_click_power: state.autoClickPower,
                        inventory: state.inventory,
                        cosmetics: state.cosmetics,
                        game_stats: statsToSave,
                        last_seen: new Date().toISOString(),
                    };

                    const { error } = await supabase
                        .from('profiles')
                        .upsert(updates);

                    if (error) {
                        toast.error('❌ Error al guardar: ' + error.message);
                        throw error;
                    } else {
                        // Uncomment if needed: toast.success('✅ Progreso guardado'); 
                        return true;
                    }
                } catch (e) {
                    console.error('Failed to save game:', e);
                    return false;
                }
            },

            sendClicks: async (receiverId: string, amount: number) => {
                const { coins, removeCoins, addCoins, saveGame } = get();
                const { data: { user } } = await supabase.auth.getUser();

                if (!user) return { success: false, message: 'Not logged in' };
                if (coins < amount) {
                    toast.error('No tienes suficientes clicks.');
                    return { success: false, message: 'Insuficiente saldo' };
                }
                if (receiverId === user.id) {
                    toast.error('No puedes enviarte clicks a ti mismo.');
                    return { success: false, message: 'Self transfer' };
                }

                // 1. Deduct locally & Save
                removeCoins(amount);
                const saved = await saveGame();

                if (!saved) {
                    addCoins(amount);
                    toast.error('Error de conexión. No se pudo procesar la transferencia.');
                    return { success: false, message: 'Save failed' };
                }

                try {
                    // 2. Fetch Receiver to get current balance
                    const { data: receiver, error: fetchError } = await supabase
                        .from('profiles')
                        .select('coins, username')
                        .eq('id', receiverId)
                        .single();

                    if (fetchError || !receiver) {
                        throw new Error('Usuario no encontrado');
                    }

                    // 3. Update Receiver (Client-side increment)
                    const newBalance = Number(receiver.coins) + amount;
                    const { error: updateError } = await supabase
                        .from('profiles')
                        .update({ coins: newBalance })
                        .eq('id', receiverId);

                    if (updateError) throw updateError;

                    // 4. Broadcast Event
                    const senderName = user.user_metadata?.username || 'Anónimo';
                    const senderAvatar = user.user_metadata?.avatar_url;

                    await supabase.channel(`user_notifications:${receiverId}`).send({
                        type: 'broadcast',
                        event: 'bizun_received',
                        payload: { amount, senderName, senderAvatar }
                    });

                    toast.success(`💸 Enviados ${amount.toLocaleString()} a ${receiver.username}`);
                    return { success: true, message: 'Sent' };

                } catch (error) {
                    console.error('Bizun failed:', error);
                    // Refund
                    addCoins(amount);
                    toast.error('Error en la transferencia. Se han devuelto los fondos.');
                    return { success: false, message: 'Failed' };
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

                                const gStats = typeof cloudProfile.game_stats === 'string'
                                    ? JSON.parse(cloudProfile.game_stats)
                                    : cloudProfile.game_stats || {};

                                const tStats = gStats._time_stats || {
                                    weekly: { id: '', score: 0 },
                                    monthly: { id: '', score: 0 },
                                    annual: { id: '', score: 0 }
                                };

                                set({
                                    coins: Number(cloudProfile.coins),
                                    lifetimeCoins: Number(cloudProfile.lifetime_coins),
                                    clickPower: Number(cloudProfile.click_power),
                                    autoClickPower: Number(cloudProfile.auto_click_power),
                                    inventory: typeof cloudProfile.inventory === 'string'
                                        ? JSON.parse(cloudProfile.inventory)
                                        : cloudProfile.inventory || {},
                                    cosmetics: typeof cloudProfile.cosmetics === 'string'
                                        ? JSON.parse(cloudProfile.cosmetics)
                                        : cloudProfile.cosmetics || { owned: [], equipped: {} },
                                    gameStats: gStats,
                                    timeStats: tStats
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
            name: 'game-storage-v2',
        }
    )
);
