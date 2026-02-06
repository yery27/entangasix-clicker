import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Trophy, RefreshCw, Gamepad2 } from 'lucide-react';
import { cn, formatCurrency } from '../lib/utils';
import { useAuthStore } from '../stores/authStore';
import { supabase } from '../lib/supabase';
import { COSMETIC_ITEMS } from '../lib/constants';
import { UserProfileModal } from '../components/social/UserProfileModal'; // Import Modal

export default function Leaderboard() {
    const { user } = useAuthStore();
    const [leaders, setLeaders] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    // Modal State
    const [selectedProfile, setSelectedProfile] = useState<any>(null);

    const fetchLeaders = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('id, username, avatar_url, coins, lifetime_coins, last_seen, cosmetics')
                .order('lifetime_coins', { ascending: false })
                .limit(50);

            if (error) throw error;

            if (data) {
                const formattedLeaders = data.map(profile => ({
                    id: profile.id,
                    username: profile.username || 'Anon',
                    avatar: profile.avatar_url,
                    currentCoins: profile.coins,
                    score: profile.lifetime_coins,
                    lastSeen: profile.last_seen,
                    cosmetics: typeof profile.cosmetics === 'string' ? JSON.parse(profile.cosmetics) : profile.cosmetics // Parse if needed
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

        const channel = supabase
            .channel('leaderboard')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => {
                fetchLeaders();
            })
            .subscribe();

        const interval = setInterval(() => {
            fetchLeaders();
        }, 5000);

        return () => {
            supabase.removeChannel(channel);
            clearInterval(interval);
        };
    }, []);

    return (
        <div className="p-6 max-w-4xl mx-auto pb-24">
            <div className="flex items-center justify-between mb-8">
                <h1 className="text-3xl md:text-5xl font-black neon-text flex items-center gap-3 tracking-tighter italic">
                    <Trophy className="text-yellow-500 w-10 h-10 md:w-12 md:h-12 drop-shadow-lg" />
                    RANKING GLOBAL
                </h1>
                <div className="flex items-center gap-2">
                    <Link to="/game-leaderboard" className="px-3 py-2 md:px-4 rounded-xl bg-purple-900/40 hover:bg-purple-900/60 transition text-xs md:text-sm font-bold border border-purple-500/50 text-purple-200 flex items-center gap-2">
                        <Gamepad2 size={16} />
                        <span className="hidden md:inline">Ranking por Juego</span>
                        <span className="md:hidden">Juegos</span>
                    </Link>
                    <button
                        onClick={fetchLeaders}
                        className="p-3 rounded-full hover:bg-white/10 transition-colors border border-white/5 active:scale-95"
                        disabled={loading}
                    >
                        <RefreshCw size={24} className={cn("text-cyan-400", loading && "animate-spin")} />
                    </button>
                </div>
            </div>

            <div className="space-y-3">
                {/* Header Row */}
                <div className="grid grid-cols-12 px-6 py-2 text-xs font-bold text-gray-500 uppercase tracking-widest pl-14">
                    <div className="col-span-1 text-center hidden md:block">#</div>
                    <div className="col-span-6 md:col-span-5">Jugador</div>
                    <div className="col-span-3 md:col-span-3 text-right text-green-500">Saldo</div>
                    <div className="col-span-3 md:col-span-3 text-right">Total</div>
                </div>

                {leaders.map((player, index) => {
                    const isTop1 = index === 0;
                    const isTop2 = index === 1;
                    const isTop3 = index === 2;
                    const isMe = player.id === user?.id;

                    return (
                        <div
                            key={player.id}
                            onClick={() => setSelectedProfile(player)}
                            className={cn(
                                "relative grid grid-cols-12 p-4 items-center rounded-2xl border cursor-pointer hover:scale-[1.01] transition-all group overflow-hidden",
                                isTop1 ? "bg-gradient-to-r from-yellow-900/40 to-black border-yellow-500/50 shadow-[0_0_20px_rgba(234,179,8,0.2)]" :
                                    isTop2 ? "bg-gradient-to-r from-slate-800/40 to-black border-slate-400/50" :
                                        isTop3 ? "bg-gradient-to-r from-orange-900/40 to-black border-orange-500/50" :
                                            isMe ? "bg-cyan-950/30 border-cyan-500/50" :
                                                "bg-[#111] border-white/5 hover:bg-[#161616]"
                            )}
                        >
                            {/* Rank Badge */}
                            <div className={cn(
                                "absolute left-4 w-8 h-8 md:w-10 md:h-10 flex items-center justify-center font-black text-lg md:text-xl rounded-full z-10 shadow-lg",
                                isTop1 ? "bg-yellow-400 text-yellow-900" :
                                    isTop2 ? "bg-slate-300 text-slate-900" :
                                        isTop3 ? "bg-orange-400 text-orange-900" :
                                            "bg-gray-800 text-gray-500"
                            )}>
                                {index + 1}
                            </div>

                            {/* Spacer for Badge */}
                            <div className="col-span-1 hidden md:block"></div>

                            {/* User Info */}
                            <div className="col-span-6 md:col-span-5 flex items-center gap-4 pl-12 md:pl-4">
                                <div className={cn(
                                    "w-10 h-10 md:w-12 md:h-12 rounded-full border-2 overflow-hidden flex-shrink-0 bg-black",
                                    // Apply Cosmetic Frame Buffer OR Default Rank Border
                                    player.cosmetics?.equipped?.frame
                                        ? COSMETIC_ITEMS.frames.find(f => f.id === player.cosmetics.equipped.frame)?.style
                                        : (isTop1 ? "border-yellow-400 shadow-[0_0_10px_rgba(250,204,21,0.5)]" : "border-white/10")
                                )}>
                                    <img
                                        src={player.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${player.username}`}
                                        alt={player.username}
                                        className="w-full h-full object-cover"
                                    />
                                </div>

                                <div className="flex flex-col min-w-0">
                                    <div className="flex items-center gap-2">
                                        <span className={cn(
                                            "truncate font-bold text-sm md:text-base",
                                            isTop1 ? "text-yellow-200" : "text-white",
                                            isMe && "text-cyan-400"
                                        )}>
                                            {player.username}
                                        </span>
                                        {isMe && <span className="text-[10px] bg-cyan-500/20 text-cyan-300 px-1.5 py-0.5 rounded font-bold border border-cyan-500/30">TÚ</span>}
                                    </div>
                                    <span className="text-[10px] text-gray-500 font-mono flex items-center gap-1">
                                        {timeAgo(player.lastSeen) === 'Ahora' ? (
                                            <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                                        ) : (
                                            <span className="w-1.5 h-1.5 bg-gray-600 rounded-full" />
                                        )}
                                        {timeAgo(player.lastSeen)}
                                    </span>
                                </div>
                            </div>

                            {/* Current Balance */}
                            <div className="col-span-3 md:col-span-3 text-right font-bold font-mono text-xs md:text-lg tracking-tight text-green-400">
                                {formatCurrency(player.currentCoins)}
                            </div>

                            {/* Total Score */}
                            <div className="col-span-3 md:col-span-3 text-right font-black font-mono text-sm md:text-xl tracking-tight text-gray-200">
                                {formatCurrency(player.score)}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Modal */}
            {selectedProfile && (
                <UserProfileModal
                    isOpen={!!selectedProfile}
                    onClose={() => setSelectedProfile(null)}
                    profile={selectedProfile}
                />
            )}
        </div>
    );
}
