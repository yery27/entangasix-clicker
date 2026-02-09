import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../stores/authStore';
import { toast } from 'sonner';
import {
    Shield, Ban, Search, Coins, Trash2,
    UserCheck, RefreshCw, Save, Activity, Users, DollarSign, Lock
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
    const isAdmin = user?.role === 'admin' || user?.email === 'garciamartinezyeray@gmail.com';

    if (!isAdmin) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-[#0f1523] text-white gap-4">
                <Shield size={64} className="text-red-500" />
                <h1 className="text-3xl font-black">ACCESO DENEGADO</h1>
                <p className="text-gray-400">No tienes permisos de Administrador.</p>
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
            .order('coins', { ascending: false });

        if (error) {
            toast.error("Error al cargar jugadores");
            console.error(error);
        } else {
            setPlayers(data || []);
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchPlayers();
    }, []);

    // Actions
    const toggleBan = async (playerId: string, currentStatus: boolean) => {
        // Optimistic update
        setPlayers(prev => prev.map(p => p.id === playerId ? { ...p, is_banned: !currentStatus } : p));
        const toastId = toast.loading('Actualizando estado...');

        try {
            const { error } = await supabase.from('profiles').update({ is_banned: !currentStatus }).eq('id', playerId);
            if (error) throw error;

            toast.success(currentStatus ? 'Usuario Desbaneado' : 'Usuario BANEADO (Instantáneo)', { id: toastId });
            fetchPlayers();
        } catch (error) {
            // Revert optimistic
            setPlayers(prev => prev.map(p => p.id === playerId ? { ...p, is_banned: currentStatus } : p));
            toast.error('Error al cambiar estado', { id: toastId });
        }
    };

    const updateCoins = async (playerId: string) => {
        const amount = parseFloat(coinValue);
        if (isNaN(amount)) return toast.error("Cantidad inválida");

        await supabase.from('profiles').update({ coins: amount }).eq('id', playerId);
        setPlayers(prev => prev.map(p => p.id === playerId ? { ...p, coins: amount } : p));
        setEditingCoins(null);
        toast.success(`Monedas actualizadas a ${formatCurrency(amount)}`);
    };

    const wipeUser = async (playerId: string) => {
        if (!window.confirm("¿Seguro que quieres reiniciar a ESTE usuario? Perderá TODO.")) return;

        await supabase.from('profiles').update({ coins: 0, click_power: 1, auto_clickers: 0 }).eq('id', playerId);
        fetchPlayers();
        toast.success("Usuario reiniciado");
    };

    // Stats Calculation
    const totalUsers = players.length;
    const totalCoins = players.reduce((sum, p) => sum + (p.coins || 0), 0);
    const bannedUsers = players.filter(p => p.is_banned).length;
    const activeUsers = totalUsers - bannedUsers;

    const filteredPlayers = players.filter(p =>
        p.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.id.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="min-h-screen bg-cyber-dark text-white p-4 md:p-8 pb-32">
            <div className="max-w-7xl mx-auto space-y-8">

                {/* Header & Stats */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1 className="text-4xl font-black neon-text flex items-center gap-3">
                            <Shield className="text-cyber-DEFAULT" size={32} />
                            ADMIN COMMAND CENTER
                        </h1>
                        <p className="text-gray-400 mt-1">Gestión de Servidor v2.0 // Realtime Active</p>
                    </div>
                    <button
                        onClick={fetchPlayers}
                        className="p-2 bg-cyber-DEFAULT/20 text-cyber-DEFAULT rounded-lg hover:bg-cyber-DEFAULT/40 transition-all border border-cyber-DEFAULT/50"
                        title="Reforzar Sincronización"
                    >
                        <RefreshCw size={20} className={loading ? "animate-spin" : ""} />
                    </button>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="bg-black/40 border border-white/10 p-5 rounded-xl backdrop-blur-md relative overflow-hidden group">
                        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                        <div className="flex justify-between items-center mb-2">
                            <h3 className="text-gray-400 text-sm font-mono">USUARIOS TOTALES</h3>
                            <Users size={18} className="text-blue-400" />
                        </div>
                        <p className="text-3xl font-bold">{totalUsers}</p>
                    </div>

                    <div className="bg-black/40 border border-white/10 p-5 rounded-xl backdrop-blur-md relative overflow-hidden group">
                        <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                        <div className="flex justify-between items-center mb-2">
                            <h3 className="text-gray-400 text-sm font-mono">ECONOMÍA GLOBAL</h3>
                            <DollarSign size={18} className="text-yellow-400" />
                        </div>
                        <p className="text-3xl font-bold text-cyber-yellow">{formatCurrency(totalCoins)}</p>
                    </div>

                    <div className="bg-black/40 border border-white/10 p-5 rounded-xl backdrop-blur-md relative overflow-hidden group">
                        <div className="absolute inset-0 bg-gradient-to-br from-green-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                        <div className="flex justify-between items-center mb-2">
                            <h3 className="text-gray-400 text-sm font-mono">ACTIVOS</h3>
                            <Activity size={18} className="text-green-400" />
                        </div>
                        <p className="text-3xl font-bold text-green-400">{activeUsers}</p>
                    </div>

                    <div className="bg-black/40 border border-white/10 p-5 rounded-xl backdrop-blur-md relative overflow-hidden group">
                        <div className="absolute inset-0 bg-gradient-to-br from-red-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                        <div className="flex justify-between items-center mb-2">
                            <h3 className="text-gray-400 text-sm font-mono">BANEADOS</h3>
                            <Lock size={18} className="text-red-400" />
                        </div>
                        <p className="text-3xl font-bold text-red-500">{bannedUsers}</p>
                    </div>
                </div>

                {/* Main Control Panel */}
                <div className="bg-black/60 border border-white/10 rounded-2xl overflow-hidden backdrop-blur-xl shadow-2xl">

                    {/* Toolbar */}
                    <div className="p-4 border-b border-white/10 flex flex-col md:flex-row gap-4 items-center justify-between bg-white/5">
                        <div className="relative w-full md:w-96">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                            <input
                                type="text"
                                placeholder="Buscar por ID o Nombre..."
                                className="w-full bg-black/50 border border-white/10 rounded-lg pl-10 pr-4 py-2 focus:ring-2 focus:ring-cyber-DEFAULT focus:border-transparent outline-none text-white placeholder-gray-600 transition-all"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <div className="text-xs text-gray-500 font-mono">
                            {filteredPlayers.length} RESULTADOS
                        </div>
                    </div>

                    {/* Table */}
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-white/5 text-xs uppercase text-gray-400 font-mono">
                                <tr>
                                    <th className="p-4">Usuario</th>
                                    <th className="p-4 text-right">Saldo</th>
                                    <th className="p-4 text-center">Estado</th>
                                    <th className="p-4 text-center">Rol</th>
                                    <th className="p-4 text-right">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/10">
                                {loading ? (
                                    <tr><td colSpan={5} className="p-8 text-center text-gray-500 animate-pulse">Cargando base de datos...</td></tr>
                                ) : filteredPlayers.length === 0 ? (
                                    <tr><td colSpan={5} className="p-8 text-center text-gray-500">No se encontraron usuarios.</td></tr>
                                ) : (
                                    filteredPlayers.map((player) => (
                                        <tr key={player.id} className={`hover:bg-white/5 transition-colors ${player.is_banned ? 'bg-red-900/10' : ''}`}>
                                            <td className="p-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-full bg-gray-800 overflow-hidden border border-white/20">
                                                        {player.avatar_url ? <img src={player.avatar_url} className="w-full h-full object-cover" /> : null}
                                                    </div>
                                                    <div>
                                                        <p className={`font-bold ${player.is_banned ? 'text-red-400 line-through' : 'text-white'}`}>{player.username}</p>
                                                        <p className="text-[10px] text-gray-500 font-mono">{player.id}</p>
                                                    </div>
                                                </div>
                                            </td>

                                            <td className="p-4 text-right font-mono text-cyber-yellow font-bold">
                                                {formatCurrency(player.coins)}
                                            </td>

                                            <td className="p-4 text-center">
                                                <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase border ${player.is_banned
                                                    ? 'bg-red-500/20 text-red-500 border-red-500/50'
                                                    : 'bg-green-500/20 text-green-500 border-green-500/50'}`}>
                                                    {player.is_banned ? 'BANNED' : 'ACTIVE'}
                                                </span>
                                            </td>

                                            <td className="p-4 text-center">
                                                <span className={`text-xs ${player.role === 'admin' ? 'text-purple-400 font-bold' : 'text-gray-500'}`}>
                                                    {player.role}
                                                </span>
                                            </td>

                                            <td className="p-4">
                                                <div className="flex items-center justify-end gap-2">
                                                    {/* Edit Coins */}
                                                    {editingCoins === player.id ? (
                                                        <div className="flex items-center gap-1 bg-black/80 rounded border border-cyber-DEFAULT/50 p-1">
                                                            <input
                                                                type="number"
                                                                className="w-24 bg-transparent text-right text-sm outline-none"
                                                                value={coinValue}
                                                                onChange={(e) => setCoinValue(e.target.value)}
                                                                autoFocus
                                                            />
                                                            <button
                                                                onClick={() => updateCoins(player.id)}
                                                                className="p-1 bg-green-900/50 text-green-400 rounded hover:bg-green-800"
                                                            >
                                                                <Save size={14} />
                                                            </button>
                                                            <button
                                                                onClick={() => setEditingCoins(null)}
                                                                className="p-1 text-red-400 hover:bg-red-900/20"
                                                            >
                                                                X
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <button
                                                            onClick={() => { setEditingCoins(player.id); setCoinValue(player.coins.toString()); }}
                                                            className="p-2 text-yellow-400 hover:bg-yellow-400/10 rounded-lg transition-colors"
                                                            title="Editar Monedas"
                                                        >
                                                            <Coins size={18} />
                                                        </button>
                                                    )}

                                                    {/* Ban Toggle */}
                                                    <button
                                                        onClick={() => toggleBan(player.id, player.is_banned)}
                                                        className={`p-2 rounded-lg transition ${player.is_banned
                                                            ? 'bg-green-500/10 text-green-500 hover:bg-green-500/20'
                                                            : 'bg-red-500/10 text-red-500 hover:bg-red-500/20'
                                                            }`}
                                                        title={player.is_banned ? "Desbanear" : "Banear"}
                                                    >
                                                        {player.is_banned ? <UserCheck size={18} /> : <Ban size={18} />}
                                                    </button>

                                                    {/* Wipe */}
                                                    <button
                                                        onClick={() => wipeUser(player.id)}
                                                        className="p-2 text-gray-500 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                                                        title="Resetear Progreso"
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
