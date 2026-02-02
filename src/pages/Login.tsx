import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useAuthStore } from '../stores/authStore';
import { useNavigate, Link } from 'react-router-dom';
import { toast } from 'sonner';

export default function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const { login } = useAuthStore();
    const navigate = useNavigate();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email.trim() || !password.trim()) {
            toast.error("Por favor, introduce email y contraseña");
            return;
        }

        setIsLoading(true);
        try {
            await login(email, password);
            toast.success(`Bienvenido de nuevo!`);
            navigate('/');
        } catch (error: any) {
            toast.error(error.message || 'Error al iniciar sesión');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-md bg-cyber-gray/50 backdrop-blur-lg border border-white/10 p-8 rounded-2xl shadow-2xl relative overflow-hidden"
            >
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-cyber-DEFAULT to-transparent" />

                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold tracking-tight mb-2 neon-text">ENTANGASIX</h1>
                    <p className="text-gray-400">Identifícate para comenzar el hackeo.</p>
                </div>

                <form onSubmit={handleLogin} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">Email</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-cyber-DEFAULT focus:ring-1 focus:ring-cyber-DEFAULT transition-all"
                            placeholder="neo@matrix.com"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">Contraseña</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-cyber-DEFAULT focus:ring-1 focus:ring-cyber-DEFAULT transition-all"
                            placeholder="••••••"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full bg-cyber-DEFAULT text-cyber-dark font-bold py-3 rounded-lg hover:bg-cyan-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_15px_rgba(0,243,255,0.4)]"
                    >
                        {isLoading ? 'Conectando...' : 'INICIAR SISTEMA'}
                    </button>
                </form>

                <div className="mt-6 text-center text-sm">
                    <Link to="/register" className="text-cyber-pink hover:underline font-medium">
                        ¿No tienes cuenta? Regístrate aquí
                    </Link>
                </div>

                <div className="mt-4 text-center text-xs text-gray-600">
                    v2.0.0 • Secure Connection
                </div>
            </motion.div>
        </div>
    );
}
