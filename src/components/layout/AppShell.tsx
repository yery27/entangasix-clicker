
import { useState } from 'react';
import { NavLink, Outlet, useLocation, Link } from 'react-router-dom';
import { Home, ShoppingBag, Joystick, Trophy, User, LogOut, MessageSquare } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useAuthStore } from '../../stores/authStore';
import { useGameStore } from '../../stores/gameStore';
import { formatCurrency } from '../../lib/utils';
import { SocialPanel } from '../social/SocialPanel';
import { COSMETIC_ITEMS } from '../../lib/constants';

export function AppShell() {
    const { coins, cosmetics } = useGameStore();
    const { logout, user } = useAuthStore();
    const location = useLocation();
    const [isSocialOpen, setIsSocialOpen] = useState(false);

    const navItems = [
        { to: '/', icon: Home, label: 'Juego' },
        { to: '/shop', icon: ShoppingBag, label: 'Tienda' },
        { to: '/casino', icon: Joystick, label: 'Casino' },
        { to: '/leaderboard', icon: Trophy, label: 'Ranking' },
    ];

    const equippedFrame = COSMETIC_ITEMS.frames.find(f => f.id === cosmetics.equipped.frame);
    const frameStyle = equippedFrame?.style || "border-white/20 hover:border-cyber-DEFAULT";

    return (
        <div className="min-h-screen flex flex-col md:flex-row bg-cyber-dark text-white relative">
            {/* Background Ambience */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
                <div className="absolute top-0 left-1/4 w-96 h-96 bg-cyber-purple/20 blur-[100px] rounded-full" />
                <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-cyber-DEFAULT/20 blur-[100px] rounded-full" />
            </div>

            {/* Sidebar (Desktop) */}
            <aside className="hidden md:flex flex-col w-64 border-r border-white/10 bg-cyber-gray/50 backdrop-blur-md p-4 z-20">
                <div className="flex items-center gap-2 mb-8 px-2">
                    <div className="w-8 h-8 rounded bg-gradient-to-br from-cyber-DEFAULT to-cyber-purple flex items-center justify-center font-bold">
                        E
                    </div>
                    <h1 className="text-xl font-bold tracking-tighter neon-text">ENTANGASIX</h1>
                </div>

                <nav className="flex-1 space-y-2">
                    {navItems.map((item) => (
                        <NavLink
                            key={item.to}
                            to={item.to}
                            className={({ isActive }) =>
                                cn(
                                    "flex items-center gap-3 px-3 py-3 rounded-lg transition-all",
                                    isActive
                                        ? "bg-cyber-DEFAULT/10 text-cyber-DEFAULT shadow-[0_0_10px_rgba(0,243,255,0.2)]"
                                        : "text-gray-400 hover:text-white hover:bg-white/5"
                                )
                            }
                        >
                            <item.icon size={20} />
                            <span className="font-medium">{item.label}</span>
                        </NavLink>
                    ))}

                    {/* Social Button in Nav */}
                    <button
                        onClick={() => setIsSocialOpen(true)}
                        className="flex items-center gap-3 px-3 py-3 rounded-lg transition-all text-gray-400 hover:text-white hover:bg-white/5 w-full text-left"
                    >
                        <MessageSquare size={20} className="text-purple-400" />
                        <span className="font-medium">Social Hub</span>
                    </button>
                </nav>

                <div className="mt-auto pt-4 border-t border-white/10">
                    <div className="p-3 rounded-lg bg-black/40 mb-3 border border-white/5">
                        <p className="text-xs text-gray-400">Coins</p>
                        <p className="text-xl font-bold text-cyber-yellow">{formatCurrency(coins)}</p>
                    </div>

                    <div className="flex items-center gap-3 px-2">
                        <Link to="/profile" className={cn("w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center overflow-hidden border transition-all duration-300", frameStyle)}>
                            {user?.avatar_url ? <img src={user.avatar_url} className="w-full h-full object-cover" /> : <User size={14} />}
                        </Link>
                        <div className="overflow-hidden">
                            <p className="text-sm font-medium truncate">{user?.username}</p>
                        </div>
                        <button onClick={logout} className="ml-auto text-gray-500 hover:text-red-400">
                            <LogOut size={16} />
                        </button>
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 overflow-y-auto overflow-x-hidden relative z-10 pb-20 md:pb-0">
                <div className="md:hidden flex items-center justify-between p-4 border-b border-white/10 bg-cyber-gray/80 backdrop-blur sticky top-0 z-30">
                    <span className="font-bold neon-text">ENTANGASIX</span>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setIsSocialOpen(true)}
                            className="w-8 h-8 rounded-full bg-purple-900/50 flex items-center justify-center border border-purple-500/30 text-purple-200"
                        >
                            <MessageSquare size={16} />
                        </button>
                        <Link to="/profile" className={cn("w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center overflow-hidden border transition-all duration-300", frameStyle)}>
                            {user?.avatar_url ? <img src={user.avatar_url} className="w-full h-full object-cover" /> : <User size={14} />}
                        </Link>
                        <span className="text-cyber-yellow font-bold font-mono">{formatCurrency(coins)}</span>
                    </div>
                </div>
                <Outlet />
            </main>

            {/* Bottom Nav (Mobile) */}
            <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-cyber-gray/90 backdrop-blur-xl border-t border-white/10 z-40 pb-safe">
                <div className="flex justify-around items-center p-2">
                    {navItems.map((item) => (
                        <NavLink
                            key={item.to}
                            to={item.to}
                            className={({ isActive }) =>
                                cn(
                                    "flex flex-col items-center gap-1 p-2 rounded-lg transition-all min-w-[64px]",
                                    isActive
                                        ? "text-cyber-DEFAULT"
                                        : "text-gray-500"
                                )
                            }
                        >
                            <item.icon size={24} className={cn(location.pathname === item.to && "drop-shadow-[0_0_5px_rgba(0,243,255,0.8)]")} />
                            <span className="text-[10px] font-medium">{item.label}</span>
                        </NavLink>
                    ))}
                </div>
            </nav>

            {/* Social Overlay */}
            <SocialPanel isOpen={isSocialOpen} onClose={() => setIsSocialOpen(false)} />
        </div>
    );
}
