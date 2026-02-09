import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../stores/authStore';
import { toast } from 'sonner';
import {
    Shield, Ban, Search, Trash2,
    UserCheck, RefreshCw, Save, Users, DollarSign,
    Power
} from 'lucide-react';
import { formatCurrency } from '../../lib/utils';

interface PlayerProfile {
    id: string;
    username: string;
    avatar_url: string;
    coins: number;
    lifetime_coins: number; // New V3
    role: 'user' | 'admin';
    is_banned: boolean;
    ban_reason?: string; // New V3
    last_seen: string;
}

export default function AdminPanel() {
    const { user } = useAuthStore();
    const [players, setPlayers] = useState<PlayerProfile[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    // Edit States
    const [editingCoins, setEditingCoins] = useState<string | null>(null);
    const [coinValue, setCoinValue] = useState<string>('');
    const [lifetimeValue, setLifetimeValue] = useState<string>(''); // New V3

    // Maintenance State
    const [maintenanceMode, setMaintenanceMode] = useState(false);
    const [maintenanceLoading, setMaintenanceLoading] = useState(false);

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

        // Fetch Maintenance Status
        const { data: settings } = await supabase.from('server_settings').select('value').eq('key', 'maintenance_mode').single();
        if (settings) setMaintenanceMode(settings.value === true);

        setLoading(false);
    };

    useEffect(() => {
        fetchPlayers();
    }, []);

    // --- ACTIONS V3 ---

    const toggleMaintenance = async () => {
        setMaintenanceLoading(true);
        const newState = !maintenanceMode;

        try {
            const { error } = await supabase
                .from('server_settings')
                .upsert({ key: 'maintenance_mode', value: newState });

            if (error) throw error;

            setMaintenanceMode(newState);
            toast.success(newState ? '🔴 MANTENIMIENTO ACTIVADO' : '🟢 SITIO ONLINE');
        } catch (e) {
            toast.error("Error al cambiar estado de mantenimiento");
            console.error(e);
        } finally {
            setMaintenanceLoading(false);
        }
    };

    const toggleBan = async (playerId: string, currentStatus: boolean, currentReason?: string) => {
        let reason = '';
        if (!currentStatus) {
            // New V3: Ask for reason
            const input = window.prompt("Motivo del Baneo (Opcional):", "Incumplimiento de normas");
            if (input === null) return; // Cancelled
            reason = input;
        }

        // Optimistic update
        setPlayers(prev => prev.map(p => p.id === playerId ? { ...p, is_banned: !currentStatus, ban_reason: reason } : p));
        const toastId = toast.loading('Actualizando estado...');

        try {
            const { error } = await supabase.from('profiles')
                .update({ is_banned: !currentStatus, ban_reason: reason })
                .eq('id', playerId);

            if (error) throw error;

            toast.success(currentStatus ? 'Usuario Desbaneado' : `BANEADO: ${reason}`, { id: toastId });
            fetchPlayers();
        } catch (error) {
            // Revert optimistic
            setPlayers(prev => prev.map(p => p.id === playerId ? { ...p, is_banned: currentStatus, ban_reason: currentReason } : p));
            toast.error('Error al cambiar estado', { id: toastId });
        }
    };

    const startEditing = (p: PlayerProfile) => {
        setEditingCoins(p.id);
        setCoinValue(p.coins.toString());
        setLifetimeValue(p.lifetime_coins?.toString() || p.coins.toString());
    };

    const updateCoins = async (playerId: string) => {
        const amount = parseFloat(coinValue);
        const lifetime = parseFloat(lifetimeValue);

        if (isNaN(amount)) return toast.error("Cantidad inválida");

        const updates: any = { coins: amount };
        if (!isNaN(lifetime)) updates.lifetime_coins = lifetime;

        await supabase.from('profiles').update(updates).eq('id', playerId);

        setPlayers(prev => prev.map(p => p.id === playerId ? { ...p, ...updates } : p));
        setEditingCoins(null);
        toast.success(`Saldo actualizado`);
    };

    const wipeUser = async (playerId: string) => {
        if (!window.confirm("¿Seguro que quieres reiniciar a ESTE usuario? Perderá TODO.")) return;

        await supabase.from('profiles').update({ coins: 0, lifetime_coins: 0, click_power: 1, auto_clickers: 0 }).eq('id', playerId);
        fetchPlayers();
        toast.success("Usuario reiniciado a 0");
    };

    // Stats Calculation
    const totalUsers = players.length;
    const totalCoins = players.reduce((sum, p) => sum + (p.coins || 0), 0);
    const bannedUsers = players.filter(p => p.is_banned).length;

    const filteredPlayers = players.filter(p =>
        p.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.id.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="min-h-screen bg-cyber-dark text-white p-4 md:p-8 pb-32">
            <div className="max-w-7xl mx-auto space-y-8">

                {/* Header & Global Controls */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-black/40 p-6 rounded-2xl border border-white/10 backdrop-blur-md">
                    <div>
                        <h1 className="text-4xl font-black neon-text flex items-center gap-3">
                            <Shield className="text-cyber-DEFAULT" size={32} />
                            GOD MODE V3.0
                        </h1>
                        <p className="text-gray-400 mt-1">Control Total del Servidor</p>
                    </div>

                    <div className="flex items-center gap-4">
                        {/* MAINTENANCE TOGGLE */}
                        <button
                            onClick={toggleMaintenance}
                            disabled={maintenanceLoading}
                            className={`flex items-center gap-3 px-4 py-2 rounded-xl font-bold transition-all ${maintenanceMode
                                ? 'bg-red-500/20 text-red-400 border border-red-500/50 animate-pulse'
                                : 'bg-green-500/20 text-green-400 border border-green-500/50'
                                }`}
                        >
                            <Power size={20} />
                            {maintenanceMode ? 'MANTENIMIENTO ACTIVADO' : 'SERVIDOR ONLINE'}
                        </button>

                        <button
                            onClick={fetchPlayers}
                            className="p-3 bg-cyber-DEFAULT/20 text-cyber-DEFAULT rounded-xl hover:bg-cyber-DEFAULT/40 transition-all border border-cyber-DEFAULT/50"
                            title="Reforzar Sincronización"
                        >
                            <RefreshCw size={20} className={loading ? "animate-spin" : ""} />
                        </button>
                    </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="bg-black/40 border border-white/10 p-5 rounded-xl backdrop-blur-md relative overflow-hidden group">
                        <div className="flex justify-between items-center mb-2">
                            <h3 className="text-gray-400 text-sm font-mono">USUARIOS</h3>
                            <Users size={18} className="text-blue-400" />
                        </div>
                        <p className="text-3xl font-bold">{totalUsers}</p>
                    </div>
                    <div className="bg-black/40 border border-white/10 p-5 rounded-xl backdrop-blur-md">
                        <div className="flex justify-between items-center mb-2">
                            <h3 className="text-gray-400 text-sm font-mono">ECONOMÍA TOTAL</h3>
                            <DollarSign size={18} className="text-green-400" />
                        </div>
                        <p className="text-3xl font-bold text-green-400">{formatCurrency(totalCoins)}</p>
                    </div>
                    <div className="bg-black/40 border border-white/10 p-5 rounded-xl backdrop-blur-md">
                        <div className="flex justify-between items-center mb-2">
                            <h3 className="text-gray-400 text-sm font-mono">BANEADOS</h3>
                            <Ban size={18} className="text-red-400" />
                        </div>
                        <p className="text-3xl font-bold text-red-500">{bannedUsers}</p>
                    </div>
                </div>

                {/* User List */}
                <div className="bg-black/40 border border-white/10 rounded-2xl overflow-hidden backdrop-blur-md">
                    <div className="p-4 border-b border-white/10 flex gap-4">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={20} />
                            <input
                                type="text"
                                placeholder="Buscar por nombre o ID..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full bg-black/50 border border-white/10 rounded-xl py-2 pl-10 pr-4 text-white focus:outline-none focus:border-cyber-DEFAULT"
                            />
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-white/5 text-gray-400 text-xs font-mono">
                                <tr>
                                    <th className="px-6 py-3 text-left">USUARIO</th>
                                    <th className="px-6 py-3 text-left">ESTADO</th>
                                    <th className="px-6 py-3 text-right">MONEDAS (ACTUAL / TOTAL)</th>
                                    <th className="px-6 py-3 text-center">ACCIONES</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {filteredPlayers.map(p => (
                                    <tr key={p.id} className="hover:bg-white/5 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-gray-700 overflow-hidden">
                                                    {p.avatar_url ? (
                                                        <img src={p.avatar_url} alt="" className="w-full h-full object-cover" />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center text-xs">IMG</div>
                                                    )}
                                                </div>
                                                <div>
                                                    <div className="font-bold flex items-center gap-2">
                                                        {p.username || 'Sin Nombre'}
                                                        {p.role === 'admin' && <Shield size={14} className="text-cyber-DEFAULT" />}
                                                    </div>
                                                    <div className="text-xs text-gray-500 font-mono">{p.id}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            {p.is_banned ? (
                                                <div className="flex flex-col">
                                                    <span className="inline-flex items-center gap-1 text-red-500 bg-red-500/10 px-2 py-1 rounded text-xs font-bold w-fit">
                                                        <Ban size={12} /> BANEADO
                                                    </span>
                                                    {p.ban_reason && (
                                                        <span className="text-xs text-red-400 mt-1 italic">"{p.ban_reason}"</span>
                                                    )}
                                                </div>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 text-green-500 bg-green-500/10 px-2 py-1 rounded text-xs font-bold">
                                                    <UserCheck size={12} /> ACTIVO
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-right font-mono">
                                            {editingCoins === p.id ? (
                                                <div className="flex flex-col gap-2 items-end">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-xs text-gray-400">Act:</span>
                                                        <input
                                                            type="number"
                                                            value={coinValue}
                                                            onChange={(e) => setCoinValue(e.target.value)}
                                                            className="w-32 bg-black border border-cyber-DEFAULT rounded px-2 py-1 text-right"
                                                        />
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-xs text-gray-400">Total:</span>
                                                        <input
                                                            type="number"
                                                            value={lifetimeValue}
                                                            onChange={(e) => setLifetimeValue(e.target.value)}
                                                            className="w-32 bg-black border border-gray-600 rounded px-2 py-1 text-right"
                                                        />
                                                    </div>
                                                    <div className="flex gap-2 mt-1">
                                                        <button onClick={() => updateCoins(p.id)} className="p-1 bg-green-500/20 text-green-500 rounded hover:bg-green-500/40">
                                                            <Save size={16} />
                                                        </button>
                                                        <button onClick={() => setEditingCoins(null)} className="p-1 bg-gray-700 text-gray-400 rounded hover:bg-gray-600">
                                                            X
                                                        </button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="flex flex-col items-end gap-1 cursor-pointer hover:text-cyber-DEFAULT transition-colors"
                                                    onClick={() => startEditing(p)}>
                                                    <div className="text-green-400 font-bold">{formatCurrency(p.coins)}</div>
                                                    <div className="text-xs text-gray-500">Total: {formatCurrency(p.lifetime_coins || p.coins)}</div>
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex justify-center gap-2">
                                                <button
                                                    onClick={() => toggleBan(p.id, p.is_banned, p.ban_reason)}
                                                    className={`p-2 rounded-lg transition-colors ${p.is_banned
                                                        ? 'bg-green-500/10 text-green-500 hover:bg-green-500/20'
                                                        : 'bg-red-500/10 text-red-500 hover:bg-red-500/20'
                                                        }`}
                                                    title={p.is_banned ? "Desbanear" : "Banear"}
                                                >
                                                    {p.is_banned ? <UserCheck size={18} /> : <Ban size={18} />}
                                                </button>

                                                <button
                                                    onClick={() => wipeUser(p.id)}
                                                    className="p-2 bg-gray-700/50 text-gray-400 rounded-lg hover:bg-red-900/50 hover:text-red-500 transition-colors"
                                                    title="Reiniciar Progreso"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}
