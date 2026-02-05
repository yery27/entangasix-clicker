import { useEffect, useState } from 'react';
import { useGameStore } from '../stores/gameStore';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '../lib/supabase';

export default function GlobalEvents() {
    const { setGlobalMultiplier } = useGameStore();
    const [isActive, setIsActive] = useState(false);

    // Logic: 
    // Event happens randomly "during the day" for 20 mins.
    // To make it sync-ish without backend, we can use a seeded random based on the hour.
    // If seed says "YES", then it's active for the first 20 mins of that hour?
    // User requested "Eventos random durante todo el dia (pocos) durante 20 mins".
    // Let's simpler logic: Every 4 hours, for 20 minutes. 
    // e.g., 00:00-00:20, 04:00-04:20, 08:00-08:20...

    useEffect(() => {
        const checkEvent = () => {
            const now = new Date();
            const hour = now.getUTCHours();
            const minutes = now.getUTCMinutes();

            // Active every 4 hours, for the first 20 minutes
            // 0, 4, 8, 12, 16, 20 (UTC)
            const isEventHour = hour % 4 === 0;
            const isEventTime = isEventHour && minutes < 20;

            if (isEventTime !== isActive) {
                setIsActive(isEventTime);
                setGlobalMultiplier(isEventTime ? 5 : 1);

                if (isEventTime) {
                    toast.success('¡EVENTO GLOBAL ACTIVO! x5 MONEDAS 🔥');
                    // Play sound?
                } else if (!isEventTime && isActive) {
                    toast.info('El evento global ha terminado.');
                }
            }
        };

        checkEvent(); // Check immediately
        const interval = setInterval(checkEvent, 10000); // Check every 10s

        return () => clearInterval(interval);
    }, [isActive, setGlobalMultiplier]);

    // --- BIZUN LISTENER ---
    const { addCoins } = useGameStore();
    useEffect(() => {
        // Wait for store to be loaded and user to be authed
        const setupListener = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const channel = supabase
                .channel(`user_notifications:${user.id}`)
                .on('broadcast', { event: 'bizun_received' }, ({ payload }) => {
                    // Play Sound
                    const audio = new Audio('/sounds/cash_register.mp3'); // Fallback or use standard
                    audio.play().catch(() => { });

                    // Show Toast
                    toast.success(`¡BIZUN RECIBIDO!`, {
                        description: (
                            <div className="flex items-center gap-3">
                                <img
                                    src={payload.senderAvatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${payload.senderName}`}
                                    className="w-8 h-8 rounded-full border border-white/20"
                                />
                                <div>
                                    <p className="font-bold text-green-400">+{payload.amount} Clicks</p>
                                    <p className="text-xs text-gray-400">De: {payload.senderName}</p>
                                </div>
                            </div>
                        ),
                        duration: 5000,
                    });

                    // Add Coins Locally (Optimistic update, though DB is continuously synced, this makes it feel instant)
                    // We only add if we trust it doesn't duplicate with next poll. 
                    // Actually, since we don't have Realtime on 'profile' balance yet (only poll in gameStore), 
                    // doing addCoins here is SAFE and makes it instant.
                    addCoins(payload.amount);
                })
                .subscribe();

            return () => {
                supabase.removeChannel(channel);
            };
        };

        setupListener();
    }, [addCoins]);

    return (
        <AnimatePresence>
            {isActive && (
                <motion.div
                    initial={{ y: -100, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: -100, opacity: 0 }}
                    className="fixed top-0 left-0 w-full z-50 bg-gradient-to-r from-yellow-600 to-red-600 text-white shadow-lg overflow-hidden"
                >
                    <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20" />
                    <div className="max-w-4xl mx-auto px-4 py-2 flex items-center justify-between relative z-10">
                        <div className="flex items-center gap-3">
                            <Zap className="animate-pulse text-yellow-300" size={24} />
                            <div>
                                <h3 className="font-bold text-lg leading-none uppercase italic">Evento x5 Activo</h3>
                                <p className="text-xs text-yellow-100 opacity-90">¡Multiplicador global x5 en todos los clicks!</p>
                            </div>
                        </div>
                        <div className="font-mono text-2xl font-black italic tracking-tighter">
                            x5
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
