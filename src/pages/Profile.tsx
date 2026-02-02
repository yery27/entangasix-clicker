import { useState } from 'react';
import { useAuthStore } from '../stores/authStore';
import { useGameStore } from '../stores/gameStore'; // To delete progress if needed? For now just viewing.
import { formatCurrency } from '../lib/utils';
import { toast } from 'sonner';

export default function Profile() {
    const { user, updateUser } = useAuthStore();
    const { lifetimeCoins } = useGameStore();

    // State for form fields
    const [seed, setSeed] = useState(user?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.username}`);
    const [isEditing, setIsEditing] = useState(false);
    const [username, setUsername] = useState(user?.username || '');
    const [password, setPassword] = useState(user?.password || '');
    const [confirmPassword, setConfirmPassword] = useState('');



    const handleSaveProfile = () => {
        try {
            if (!username.trim()) throw new Error("El nombre de usuario no puede estar vacío");

            const updates: any = {};
            if (username !== user?.username) updates.username = username;

            if (password) {
                if (password !== confirmPassword) throw new Error("Las contraseñas no coinciden");
                updates.password = password;
            }

            if (Object.keys(updates).length > 0) {
                updateUser(updates);
                toast.success("Perfil actualizado correctamente");
                setIsEditing(false);
                setPassword('');
                setConfirmPassword('');
            } else {
                setIsEditing(false);
            }
        } catch (error: any) {
            toast.error(error.message);
        }
    };

    return (
        <div className="p-6 max-w-4xl mx-auto">
            <h1 className="text-4xl font-black mb-8 neon-text text-center tracking-tighter">PERFIL DE AGENTE</h1>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">

                {/* Avatar Section */}
                <div className="md:col-span-1 flex flex-col items-center gap-6 bg-black/40 p-6 rounded-2xl border border-white/10 backdrop-blur-sm">
                    <div className="relative group">
                        <div className="w-40 h-40 rounded-full border-4 border-cyber-DEFAULT overflow-hidden bg-black shadow-[0_0_30px_rgba(34,211,238,0.3)]">
                            <img src={seed.startsWith('http') || seed.startsWith('data:') ? seed : `https://api.dicebear.com/7.x/avataaars/svg?seed=${seed}`} alt="Avatar" className="w-full h-full object-cover" />
                        </div>
                        <div className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <span className="text-xs font-bold text-white">Previsualización</span>
                        </div>
                    </div>

                    <div className="w-full space-y-3">
                        <label className="text-xs text-cyber-DEFAULT font-bold uppercase tracking-wider">Subir Nueva Foto</label>
                        <div className="flex gap-2 relative">
                            <input
                                type="file"
                                accept="image/*"
                                onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) {
                                        if (file.size > 2 * 1024 * 1024) {
                                            toast.error("La imagen no puede superar 2MB");
                                            return;
                                        }
                                        const reader = new FileReader();
                                        reader.onloadend = () => {
                                            setSeed(reader.result as string); // Using 'seed' state to hold preview blob/base64 temporarily
                                        };
                                        reader.readAsDataURL(file);
                                    }
                                }}
                                className="hidden"
                                id="avatar-upload"
                            />
                            <label
                                htmlFor="avatar-upload"
                                className="cursor-pointer bg-black/50 border border-white/20 rounded px-4 py-2 text-sm flex-1 hover:bg-white/10 text-center text-gray-300 flex items-center justify-center gap-2 transition-all"
                            >
                                <span className="text-xl">📁</span> Seleccionar Archivo...
                            </label>
                        </div>
                        <p className="text-[10px] text-gray-500 text-center">Mássimo 2MB (JPG, PNG, GIF)</p>
                        <button
                            onClick={() => {
                                updateUser({ avatar: seed });
                                toast.success("Avatar actualizado");
                            }}
                            className="bg-cyber-DEFAULT text-black font-black uppercase text-sm py-2 rounded w-full hover:bg-cyan-400 hover:scale-[1.02] transition-all shadow-[0_0_15px_rgba(34,211,238,0.4)]"
                        >
                            Guardar Avatar
                        </button>
                    </div>
                </div>

                {/* Details Section */}
                <div className="md:col-span-2 bg-black/40 p-8 rounded-2xl border border-white/10 backdrop-blur-sm flex flex-col justify-between">

                    <div className="space-y-6">
                        <div className="flex justify-between items-start">
                            <h2 className="text-2xl font-bold text-white">Credenciales</h2>
                            <button
                                onClick={() => setIsEditing(!isEditing)}
                                className="text-sm text-cyber-DEFAULT hover:text-white transition-colors underline decoration-dotted underline-offset-4"
                            >
                                {isEditing ? 'Cancelar Edición' : 'Editar Información'}
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="text-xs uppercase text-gray-500 font-bold block mb-1">Nombre en Clave (Usuario)</label>
                                {isEditing ? (
                                    <input
                                        type="text"
                                        value={username}
                                        onChange={(e) => setUsername(e.target.value)}
                                        className="w-full bg-black/50 border border-cyber-DEFAULT/50 rounded p-3 text-white focus:outline-none focus:ring-2 focus:ring-cyber-DEFAULT"
                                    />
                                ) : (
                                    <div className="text-3xl font-black text-white tracking-tight">{user?.username}</div>
                                )}
                            </div>

                            {isEditing && (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-4 duration-300">
                                    <div>
                                        <label className="text-xs uppercase text-gray-500 font-bold block mb-1">Nueva Contraseña</label>
                                        <input
                                            type="password"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            placeholder="Dejar vacío para no cambiar"
                                            className="w-full bg-black/50 border border-white/20 rounded p-3 text-white focus:outline-none focus:ring-2 focus:ring-cyber-DEFAULT"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs uppercase text-gray-500 font-bold block mb-1">Confirmar Contraseña</label>
                                        <input
                                            type="password"
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                            placeholder="Repetir nueva contraseña"
                                            className="w-full bg-black/50 border border-white/20 rounded p-3 text-white focus:outline-none focus:ring-2 focus:ring-cyber-DEFAULT"
                                        />
                                    </div>
                                </div>
                            )}

                            <div>
                                <label className="text-xs uppercase text-gray-500 font-bold block mb-1">Patrimonio Total Acumulado</label>
                                <div className="text-2xl font-mono text-cyber-yellow drop-shadow-[0_0_5px_rgba(253,224,71,0.5)]">
                                    {formatCurrency(lifetimeCoins)}
                                </div>
                            </div>

                            <div className="pt-4 border-t border-white/5">
                                <p className="text-xs text-gray-500 font-mono">ID DE SISTEMA: <span className="text-gray-400">{user?.id}</span></p>
                            </div>
                        </div>
                    </div>

                    {isEditing && (
                        <div className="mt-8 flex justify-end">
                            <button
                                onClick={handleSaveProfile}
                                className="bg-green-500 text-black font-black px-8 py-3 rounded hover:bg-green-400 hover:scale-105 transition-all shadow-[0_0_20px_rgba(34,197,94,0.5)]"
                            >
                                GUARDAR CAMBIOS
                            </button>
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
}
