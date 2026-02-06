import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { RefreshCw, Gamepad2 } from 'lucide-react';
import { cn, formatCurrency, formatNumber } from '../lib/utils';
import { useAuthStore } from '../stores/authStore';
import { supabase } from '../lib/supabase';

const GAMES = [
    { id: 'scratch75', name: 'Rasca y Gana' },
    { id: 'roulette', name: 'Ruleta en Vivo' },
    { id: 'slots', name: 'Cyber Slots' },
    { id: 'blackjack', name: 'Blackjack' },
    { id: 'mines', name: 'Minas' },
    { id: 'crash', name: 'Crash' },
    { id: 'plinko', name: 'Plinko' },
];

export default function GameLeaderboard() {
    const { user } = useAuthStore();
    const [stats, setStats] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [selectedGame, setSelectedGame] = useState('scratch75');

    const fetchStats = async () => {
        setLoading(true);
        try {
            // Fetch profiles with game_stats
            const { data, error } = await supabase
                .from('profiles')
                .select('id, username, avatar_url, game_stats')
                .limit(100);

            if (error) throw error;

            if (data) {
                const processed = data
                    .map(profile => {
                        const gStats = typeof profile.game_stats === 'string'
                            ? JSON.parse(profile.game_stats)
                            : profile.game_stats || {};

                        const gameData = gStats[selectedGame] || { wins: 0, losses: 0, played: 0, wonAmount: 0, lostAmount: 0 };
                        const netProfit = (gameData.wonAmount || 0) - (gameData.lostAmount || 0);

                        return {
                            id: profile.id,
                            username: profile.username || 'Anon',
                            avatar: profile.avatar_url,
                            ...gameData,
                            netProfit
                        };
                    })
                    // Filter out those who haven't played
                    .filter(p => p.played > 0)
                    // Sort by Net Profit (Winners first)
                    .sort((a, b) => b.netProfit - a.netProfit);

                setStats(processed);
            }
        } catch (error) {
            console.error('Error fetching game stats:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStats();
    }, [selectedGame]);

    return (
        <div className="p-6 max-w-6xl mx-auto pb-24">
            <div className="flex flex-col md:flex-row items-center justify-between mb-8 gap-4">
                <h1 className="text-3xl md:text-5xl font-black neon-text flex items-center gap-3 tracking-tighter italic">
                    <Gamepad2 className="text-purple-500 w-10 h-10 md:w-12 md:h-12 drop-shadow-lg" />
                    RANKING POR JUEGO
                </h1>

                <div className="flex items-center gap-2">
                    <Link to="/leaderboard" className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 transition text-sm font-bold border border-white/10">
                        Volver al Global
                    </Link>
                    <button
                        onClick={fetchStats}
                        className="p-3 rounded-full hover:bg-white/10 transition-colors border border-white/5 active:scale-95"
                        disabled={loading}
                    >
                        <RefreshCw size={24} className={cn("text-cyan-400", loading && "animate-spin")} />
                    </button>
                </div>
            </div>

            {/* Game Selector */}
            <div className="flex gap-2 overflow-x-auto pb-4 mb-4 scrollbar-hide justify-center md:justify-start">
                {GAMES.map(game => (
                    <button
                        key={game.id}
                        onClick={() => setSelectedGame(game.id)}
                        className={cn(
                            "px-6 py-3 rounded-xl font-black uppercase text-sm tracking-wider transition-all whitespace-nowrap border-2",
                            selectedGame === game.id
                                ? "bg-purple-600 border-purple-400 text-white shadow-[0_0_15px_rgba(147,51,234,0.5)] scale-105"
                                : "bg-black/50 border-white/10 text-gray-500 hover:bg-white/5 hover:border-white/30"
                        )}
                    >
                        {game.name}
                    </button>
                ))}
            </div>

            <div className="space-y-3">
                {/* Header Row */}
                <div className="grid grid-cols-12 px-6 py-2 text-xs font-bold text-gray-500 uppercase tracking-widest pl-14 text-center md:text-left">
                    <div className="col-span-1 hidden md:block">#</div>
                    <div className="col-span-4 md:col-span-3 text-left">Jugador</div>
                    <div className="col-span-2 text-center text-blue-400">Jugadas</div>
                    <div className="col-span-2 text-center text-green-400">Wins</div>
                    <div className="col-span-3 md:col-span-3 text-right text-yellow-500">Beneficio Neto</div>
                </div>

                {stats.length === 0 ? (
                    <div className="text-center py-20 text-gray-500 italic">
                        Nadie ha jugado a esto todavía... ¡Sé el primero!
                    </div>
                ) : (
                    stats.map((player: any, index: number) => {
                        const isTop1 = index === 0;
                        const isMe = player.id === user?.id;

                        return (
                            <div
                                key={player.id}
                                className={cn(
                                    "relative grid grid-cols-12 p-4 items-center rounded-2xl border transition-all group overflow-hidden",
                                    isTop1 ? "bg-gradient-to-r from-purple-900/40 to-black border-purple-500/50 shadow-[0_0_20px_rgba(168,85,247,0.2)]" :
                                        isMe ? "bg-cyan-950/30 border-cyan-500/50" :
                                            "bg-[#111] border-white/5 hover:bg-[#161616]"
                                )}
                            >
                                {/* Rank */}
                                <div className={cn(
                                    "absolute left-4 w-8 h-8 md:w-10 md:h-10 flex items-center justify-center font-black text-lg md:text-xl rounded-full z-10 shadow-lg",
                                    isTop1 ? "bg-purple-400 text-purple-900" :
                                        "bg-gray-800 text-gray-500"
                                )}>
                                    {index + 1}
                                </div>

                                <div className="col-span-1 hidden md:block"></div>

                                {/* User */}
                                <div className="col-span-4 md:col-span-3 flex items-center gap-3 pl-12 md:pl-4 overflow-hidden">
                                    <img
                                        src={player.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${player.username}`}
                                        alt={player.username}
                                        className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-black border border-white/10"
                                    />
                                    <div className="truncate font-bold text-sm md:text-base text-gray-200">
                                        {player.username}
                                        {isMe && <span className="ml-2 text-[10px] bg-cyan-500/20 text-cyan-300 px-1 rounded">TÚ</span>}
                                    </div>
                                </div>

                                {/* Stats */}
                                <div className="col-span-2 text-center font-mono font-bold text-gray-400">
                                    {formatNumber(player.played)}
                                </div>
                                <div className="col-span-2 text-center font-mono font-bold text-green-500">
                                    {formatNumber(player.wins)}
                                </div>
                                <div className={cn(
                                    "col-span-3 md:col-span-3 text-right font-black font-mono text-sm md:text-xl tracking-tight",
                                    player.netProfit > 0 ? "text-green-400" : "text-red-400"
                                )}>
                                    {formatCurrency(player.netProfit)}
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
}
