import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../stores/authStore';
import { toast } from 'sonner';
import {
    Shield, Ban, Search, Coins, Trash2,
    UserX, UserCheck, RefreshCw, Save
} from 'lucide-react';
import { formatCurrency } from '../../lib/utils';


interface PlayerProfile {
    id: string;
    username: string;
    avatar_url: string;
    coins: number;
    role: 'user' | 'admin';
    is_banned: boolean;
    last_seen: string;
}

export default function AdminPanel() {
    const { user } = useAuthStore();
    const [players, setPlayers] = useState<PlayerProfile[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [editingCoins, setEditingCoins] = useState<string | null>(null);
    const [coinValue, setCoinValue] = useState<string>('');

    // Security Check
    if (user?.role !== 'admin') {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-[#0f1523] text-white gap-4">
                <Shield size={64} className="text-red-500" />
                <h1 className="text-3xl font-black">ACCESO DENEGADO</h1>
                <p className="text-gray-400">No tienes permisos de Administrador.</p>
                <div className="bg-black/50 p-4 rounded-xl border border-white/10 font-mono text-sm">
                    <p>Tu ID: <span className="text-blue-400">{user?.id}</span></p>
                    <p>Tu Rol actual: <span className="text-yellow-400">{user?.role || 'null'}</span></p>
                </div>
                <button
                    onClick={() => window.location.href = '/'}
                    className="mt-4 px-6 py-2 bg-gray-700 rounded-lg hover:bg-gray-600"
                >
                    Volver al Inicio
                </button>
            </div>
        );
    }

    const fetchPlayers = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .order('last_seen', { ascending: false })
            .limit(50);

        if (error) {
            toast.error('Error cargando jugadores: ' + error.message);
        } else {
            setPlayers(data || []);
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchPlayers();
    }, []);

    const toggleBan = async (playerId: string, currentStatus: boolean) => {
        const { error } = await supabase
            .from('profiles')
            .update({ is_banned: !currentStatus })
            .eq('id', playerId);

        if (error) {
            toast.error('Error actualizando ban: ' + error.message);
        } else {
            toast.success(currentStatus ? 'Usuario desbaneado' : 'Usuario baneado');
            setPlayers(prev => prev.map(p =>
                p.id === playerId ? { ...p, is_banned: !currentStatus } : p
            ));
        }
    };

    const wipeUser = async (playerId: string, username: string) => {
        if (!confirm(`¿⚠️ Estás SEGURO de reiniciar a CERO a ${username}? Esta acción no se puede deshacer.`)) return;

        const { error } = await supabase
            .from('profiles')
            .update({
                coins: 0,
                lifetime_coins: 0,
                click_power: 1,
                auto_click_power: 0,
                inventory: {},
                game_stats: { _migration_version: 999 } // Force reload/wipe on client
            })
            .eq('id', playerId);

        if (error) {
            toast.error('Error reseteando usuario: ' + error.message);
        } else {
            toast.success(`Progreso de ${username} eliminado.`);
            fetchPlayers(); // Refresh to see changes
        }
    };

    const saveCoins = async (playerId: string) => {
        const amount = parseInt(coinValue);
        if (isNaN(amount)) return;

        const { error } = await supabase
            .from('profiles')
            .update({ coins: amount })
            .eq('id', playerId);

        if (error) {
            toast.error('Error guardando monedas');
        } else {
            toast.success('Monedas actualizadas');
            setPlayers(prev => prev.map(p =>
                p.id === playerId ? { ...p, coins: amount } : p
            ));
            setEditingCoins(null);
        }
    };

    const filteredPlayers = players.filter(p =>
        p.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.id.includes(searchTerm)
    );

    return (
        <div className="min-h-screen bg-[#0f1523] p-8 text-white">
            <div className="max-w-7xl mx-auto">

                {/* HEADER */}
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-red-500/20 rounded-xl border border-red-500/50">
                            <Shield className="text-red-500 w-8 h-8" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-black">PANEL DE ADMINISTRACIÓN</h1>
                            <p className="text-gray-400">Control total sobre los jugadores</p>
                        </div>
                    </div>
                    <button
                        onClick={fetchPlayers}
                        className="p-2 bg-gray-800 rounded-lg hover:bg-gray-700 transition"
                    >
                        <RefreshCw size={20} />
                    </button>
                </div>

                {/* SEARCH */}
                <div className="relative mb-6">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
                    <input
                        type="text"
                        placeholder="Buscar por nombre o ID..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-[#161b2e] border border-gray-700 rounded-xl py-4 pl-12 pr-4 text-white focus:outline-none focus:border-red-500 transition"
                    />
                </div>

                {/* TABLE */}
                <div className="bg-[#161b2e] rounded-2xl border border-gray-800 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-black/40 text-gray-400 uppercase text-xs font-bold tracking-wider">
                                <tr>
                                    <th className="p-4">Jugador</th>
                                    <th className="p-4">Rol</th>
                                    <th className="p-4">Monedas</th>
                                    <th className="p-4">Estado</th>
                                    <th className="p-4 text-right">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-800">
                                {loading ? (
                                    <tr><td colSpan={5} className="p-8 text-center text-gray-500">Cargando datos...</td></tr>
                                ) : filteredPlayers.length === 0 ? (
                                    <tr><td colSpan={5} className="p-8 text-center text-gray-500">No se encontraron jugadores</td></tr>
                                ) : (
                                    filteredPlayers.map(player => (
                                        <tr key={player.id} className="hover:bg-white/5 transition">
                                            <td className="p-4">
                                                <div className="flex items-center gap-3">
                                                    <img src={player.avatar_url} alt="" className="w-10 h-10 rounded-full bg-gray-700" />
                                                    <div>
                                                        <div className="font-bold">{player.username}</div>
                                                        <div className="text-xs text-gray-500 font-mono">{player.id.slice(0, 8)}...</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="p-4">
                                                <span className={`px-2 py-1 rounded-full text-xs font-bold ${player.role === 'admin' ? 'bg-red-500/20 text-red-500' : 'bg-blue-500/20 text-blue-500'
                                                    }`}>
                                                    {player.role.toUpperCase()}
                                                </span>
                                            </td>
                                            <td className="p-4 font-mono text-yellow-400">
                                                {editingCoins === player.id ? (
                                                    <div className="flex items-center gap-2">
                                                        <input
                                                            type="number"
                                                            value={coinValue}
                                                            onChange={(e) => setCoinValue(e.target.value)}
                                                            className="w-32 bg-black/50 border border-gray-600 rounded px-2 py-1 text-sm focus:outline-none"
                                                        />
                                                        <button onClick={() => saveCoins(player.id)} className="text-green-500 hover:text-green-400">
                                                            <Save size={16} />
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center gap-2 group cursor-pointer" onClick={() => {
                                                        setEditingCoins(player.id);
                                                        setCoinValue(player.coins.toString());
                                                    }}>
                                                        <Coins size={14} />
                                                        {formatCurrency(player.coins)}
                                                        <span className="opacity-0 group-hover:opacity-100 text-gray-500 text-xs">✏️</span>
                                                    </div>
                                                )}
                                            </td>
                                            <td className="p-4">
                                                {player.is_banned ? (
                                                    <span className="flex items-center gap-1 text-red-500 font-bold text-xs">
                                                        <Ban size={14} /> BANEADO
                                                    </span>
                                                ) : (
                                                    <span className="flex items-center gap-1 text-green-500 font-bold text-xs">
                                                        <UserCheck size={14} /> ACTIVO
                                                    </span>
                                                )}
                                            </td>
                                            <td className="p-4 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    {/* BAN BUTTON */}
                                                    <button
                                                        onClick={() => toggleBan(player.id, player.is_banned)}
                                                        className={`p-2 rounded-lg transition ${player.is_banned
                                                            ? 'bg-green-500/10 text-green-500 hover:bg-green-500/20'
                                                            : 'bg-red-500/10 text-red-500 hover:bg-red-500/20'
                                                            }`}
                                                        title={player.is_banned ? "Desbanear" : "Banear"}
                                                    >
                                                        {player.is_banned ? <UserCheck size={18} /> : <UserX size={18} />}
                                                    </button>

                                                    {/* WIPE BUTTON */}
                                                    <button
                                                        onClick={() => wipeUser(player.id, player.username)}
                                                        className="p-2 bg-gray-700/50 text-gray-400 rounded-lg hover:bg-red-900/50 hover:text-red-400 transition"
                                                        title="Reiniciar Progreso (Wipe)"
                                                    >
                                                        <Trash2 size={18} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}
