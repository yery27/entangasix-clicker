import { useEffect, useState } from 'react';
import { Trophy, RefreshCw } from 'lucide-react';
import { cn, formatCurrency } from '../lib/utils';
import { useAuthStore } from '../stores/authStore';
import { supabase } from '../lib/supabase';



export default function Leaderboard() {
    const { user } = useAuthStore();
    // Removed saveGame as we don't force save here anymore
    const [leaders, setLeaders] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    const fetchLeaders = async () => {
        // Removed await saveGame() to make fetching instant. 
        // Background sync (3s) handles saving now.
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('id, username, avatar_url, lifetime_coins, last_seen')
                .order('lifetime_coins', { ascending: false })
                .limit(50);

            if (error) throw error;

            if (data) {
                const formattedLeaders = data.map(profile => ({
                    id: profile.id,
                    username: profile.username || 'Anon',
                    avatar: profile.avatar_url,
                    score: profile.lifetime_coins,
                    lastSeen: profile.last_seen
                }));
                setLeaders(formattedLeaders);
            }
        } catch (error) {
            console.error('Error fetching leaderboard:', error);
        } finally {
            setLoading(false);
        }
    };

    // Helper for "Time Ago"
    const timeAgo = (dateString: string) => {
        if (!dateString) return 'Offline';
        const seconds = Math.floor((new Date().getTime() - new Date(dateString).getTime()) / 1000);
        if (seconds < 5) return 'Ahora';
        if (seconds < 60) return `Hace ${seconds}s`;
        if (seconds < 3600) return `Hace ${Math.floor(seconds / 60)}m`;
        return 'Hace mucho';
    };

    useEffect(() => {
        fetchLeaders();

        // 1. Real-time subscription (Fastest)
        const channel = supabase
            .channel('leaderboard')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => {
                fetchLeaders();
            })
            .subscribe();

        // 2. Polling Fallback (Guaranteed reliability)
        const interval = setInterval(() => {
            fetchLeaders();
        }, 5000);

        return () => {
            supabase.removeChannel(channel);
            clearInterval(interval);
        };
    }, []);

    return (
        <div className="p-6 max-w-3xl mx-auto">
            <div className="flex items-center justify-between mb-8">
                <h1 className="text-3xl font-bold neon-text flex items-center gap-3">
                    <Trophy className="text-yellow-500" />
                    Ranking Global
                </h1>
                <button
                    onClick={fetchLeaders}
                    className="p-2 rounded-full hover:bg-white/10 transition-colors"
                    disabled={loading}
                >
                    <RefreshCw size={20} className={cn(loading && "animate-spin")} />
                </button>
            </div>

            <div className="bg-cyber-gray/40 border border-white/5 rounded-xl overflow-hidden backdrop-blur-sm">
                <div className="grid grid-cols-12 p-4 bg-black/20 text-xs font-bold text-gray-400 uppercase tracking-wider">
                    <div className="col-span-1 text-center">#</div>
                    <div className="col-span-7">Jugador</div>
                    <div className="col-span-4 text-right">Puntuación</div>
                </div>

                <div className="divide-y divide-white/5">
                    {leaders.map((player, index) => (
                        <div
                            key={player.id}
                            className={cn(
                                "grid grid-cols-12 p-4 items-center transition-colors",
                                player.id === user?.id ? "bg-cyber-DEFAULT/10 shadow-[inset_0_0_10px_rgba(0,243,255,0.1)] border-l-2 border-cyber-DEFAULT" : "hover:bg-white/5"
                            )}
                        >
                            <div className="col-span-1 flex justify-center font-mono font-bold text-gray-500">
                                {index === 0 && <span className="text-2xl">🥇</span>}
                                {index === 1 && <span className="text-2xl">🥈</span>}
                                {index === 2 && <span className="text-2xl">🥉</span>}
                                {index > 2 && <span>{index + 1}</span>}
                            </div>
                            <div className="col-span-7 font-medium flex items-center gap-3 overflow-hidden">
                                <div className="w-8 h-8 rounded-full bg-gray-700 border border-white/10 overflow-hidden flex-shrink-0">
                                    <img
                                        src={player.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${player.username}`}
                                        alt={player.username}
                                        className="w-full h-full object-cover"
                                    />
                                </div>
                                <div className="flex flex-col min-w-0">
                                    <div className="flex items-center gap-2">
                                        <span className={cn("truncate", player.id === user?.id && "text-cyber-DEFAULT")}>{player.username}</span>
                                        {player.id === user?.id && <span className="text-[10px] bg-cyber-DEFAULT text-black px-1 rounded font-bold flex-shrink-0">YOU</span>}
                                    </div>
                                    <span className="text-[10px] text-gray-500 font-mono">
                                        {timeAgo(player.lastSeen)}
                                    </span>
                                </div>
                            </div>
                            <div className="col-span-4 text-right font-mono text-gray-300 font-bold">
                                {formatCurrency(player.score)}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
