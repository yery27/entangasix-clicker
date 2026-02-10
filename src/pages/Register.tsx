import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useAuthStore } from '../stores/authStore';
import { useNavigate, Link } from 'react-router-dom';
import { toast } from 'sonner';

export default function Register() {
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const { register } = useAuthStore();
    const navigate = useNavigate();

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!username.trim() || !email.trim() || !password.trim()) {
            toast.error("Rellena todos los campos");
            return;
        }

        setIsLoading(true);
        try {
            await register(email, password, username);
            toast.success(`Bienvenido a la resistencia, ${username}!`);
            navigate('/');
        } catch (error: any) {
            toast.error(error.message || 'Error al registrarse');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-cyber-dark">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-md bg-cyber-gray/80 backdrop-blur-lg border border-white/10 p-8 rounded-2xl shadow-2xl relative overflow-hidden"
            >
                <div className="text-center mb-8">
                    <img src="/logo.png" alt="ENTANGASIX" className="w-48 h-auto mx-auto mb-6 drop-shadow-[0_0_15px_rgba(168,85,247,0.5)]" />
                    <h1 className="text-3xl font-bold tracking-tight mb-2 neon-text">NUEVO AGENTE</h1>
                    <p className="text-gray-400">Crea tu identidad digital.</p>
                </div>

                <form onSubmit={handleRegister} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">Email</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-cyber-DEFAULT focus:ring-1 focus:ring-cyber-DEFAULT transition-all"
                            placeholder="tu@email.com"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">Usuario</label>
                        <input
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-cyber-DEFAULT focus:ring-1 focus:ring-cyber-DEFAULT transition-all"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">Contraseña</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-cyber-DEFAULT focus:ring-1 focus:ring-cyber-DEFAULT transition-all"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full bg-cyber-pink text-white font-bold py-3 rounded-lg hover:bg-pink-500 transition-colors shadow-[0_0_15px_rgba(255,0,255,0.4)] disabled:opacity-50"
                    >
                        {isLoading ? 'Creando identidad...' : 'REGISTRARSE'}
                    </button>
                </form>

                <div className="mt-6 text-center text-sm">
                    <Link to="/login" className="text-cyber-DEFAULT hover:underline">¿Ya tienes cuenta? Inicia sesión</Link>
                </div>
            </motion.div>
        </div>
    );
}
