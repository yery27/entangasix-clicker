import { useEffect, useState } from 'react';
import { Trophy, RefreshCw } from 'lucide-react';
import { cn, formatCurrency } from '../lib/utils';
import { useAuthStore } from '../stores/authStore';
import { useGameStore } from '../stores/gameStore';

export default function Leaderboard() {
    const { user } = useAuthStore();
    const { lifetimeCoins } = useGameStore();
    const [leaders, setLeaders] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    const fetchLeaders = async () => {
        setLoading(true);
        // Mock API delay
        await new Promise(r => setTimeout(r, 800));

        // Get all registered users from authStore
        const registeredUsers = useAuthStore.getState().users;

        const leaderboardData = registeredUsers.map(u => {
            if (u.id === user?.id) {
                return { ...u, score: lifetimeCoins };
            }
            // Mock score for others
            return { ...u, score: Math.floor(Math.random() * 1000) };
        });

        // Ensure current user is in list if not saved yet
        if (user && !leaderboardData.find(u => u.id === user.id)) {
            leaderboardData.push({ ...user, score: lifetimeCoins } as any);
        }

        setLeaders(leaderboardData.sort((a, b) => b.score - a.score));
        setLoading(false);
    };

    useEffect(() => {
        fetchLeaders();
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
                    <div className="col-span-2 text-center">Rango</div>
                    <div className="col-span-6">Jugador</div>
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
                            <div className="col-span-2 flex justify-center">
                                {index === 0 && <span className="text-2xl">🥇</span>}
                                {index === 1 && <span className="text-2xl">🥈</span>}
                                {index === 2 && <span className="text-2xl">🥉</span>}
                                {index > 2 && <span className="text-gray-500 font-mono">#{index + 1}</span>}
                            </div>
                            <div className="col-span-6 font-medium flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-gray-700 border border-white/10 overflow-hidden flex-shrink-0">
                                    <img
                                        src={player.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${player.username}`}
                                        alt={player.username}
                                        className="w-full h-full object-cover"
                                    />
                                </div>
                                <div className="flex flex-col">
                                    <div className="flex items-center gap-2">
                                        <span className={cn(player.id === user?.id && "text-cyber-DEFAULT")}>{player.username}</span>
                                        {player.id === user?.id && <span className="text-[10px] bg-cyber-DEFAULT text-black px-1 rounded font-bold">YOU</span>}
                                    </div>
                                </div>
                            </div>
                            <div className="col-span-4 text-right font-mono text-gray-300">
                                {formatCurrency(player.score)}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
