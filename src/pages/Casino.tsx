import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Slots } from '../components/casino/Slots';
import { Roulette } from '../components/casino/Roulette';
import { Blackjack } from '../components/casino/Blackjack';
import { Mines } from '../components/casino/Mines';
import { Crash } from '../components/casino/Crash';
import { Plinko } from '../components/casino/Plinko';
import { Scratch75 } from '../components/casino/Scratch75';
import { LiveRoulette } from '../components/casino/LiveRoulette';
import { GatesOfClicker } from '../components/casino/GatesOfClicker';

import { cn, formatCurrency } from '../lib/utils';
import { useGameStore } from '../stores/gameStore';
import { ArrowLeft, Play } from 'lucide-react';

export default function Casino() {
    const [activeGame, setActiveGame] = useState<string | null>(null);
    const { coins } = useGameStore();

    const games = [
        { id: 'slots', label: 'Cyber Slots', color: 'from-purple-600 to-blue-600', icon: '🎰', desc: 'Gira y gana el Jackpot' },
        { id: 'roulette', label: 'Neon Roulette', color: 'from-green-600 to-emerald-600', icon: '🎡', desc: 'Clásica ruleta europea' },
        { id: 'live_roulette', label: 'Ruleta en VIVO', color: 'from-red-600 to-pink-600', icon: '🔴', desc: 'Juega con otros en tiempo real' },
        { id: 'blackjack', label: 'VIP Blackjack', color: 'from-red-600 to-orange-600', icon: '🃏', desc: 'Vence al croupier' },
        { id: 'scratch75', label: '7 y Media', color: 'from-yellow-400 to-green-600', icon: '🎟️', desc: 'Rasca y gana hasta 100x' },

        { id: 'gates', label: 'Gates of Clicker', color: 'from-yellow-400 to-purple-600', icon: '⚡', desc: '¡Multiplicadores hasta 500x!' },

        { id: 'mines', label: 'Mines', color: 'from-yellow-400 to-orange-500', icon: '💣', desc: 'Evita las minas', comingSoon: false },
        { id: 'crash', label: 'Crash', color: 'from-pink-500 to-rose-500', icon: '🚀', desc: 'Retírate antes del boom', comingSoon: false },
        { id: 'plinko', label: 'Plinko', color: 'from-cyan-400 to-blue-500', icon: '🎱', desc: 'Donde caiga la bola', comingSoon: false },

    ];

    const handleBack = () => setActiveGame(null);

    return (
        <div className="p-4 md:p-6 max-w-7xl mx-auto pb-24 h-full flex flex-col min-h-screen">

            {/* Header / Top Bar */}
            <div className="flex flex-col md:flex-row items-center justify-between mb-8 gap-4 z-10 relative">
                <div className="flex items-center gap-4">
                    {activeGame && (
                        <button
                            onClick={handleBack}
                            className="bg-white/10 p-3 rounded-full hover:bg-white/20 transition-all border border-white/10"
                        >
                            <ArrowLeft className="text-white" />
                        </button>
                    )}
                    <div>
                        <h1 className="text-3xl md:text-4xl font-black italic tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-400 drop-shadow-[0_0_10px_rgba(255,255,255,0.5)]">
                            {activeGame ? games.find(g => g.id === activeGame)?.label : <>CASINO <span className="text-cyber-DEFAULT">HUB</span></>}
                        </h1>
                    </div>
                </div>

                <div className="bg-black/60 border border-white/10 px-6 py-2 rounded-2xl flex flex-col items-end backdrop-blur-md shadow-lg">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Saldo</span>
                    <div className="text-2xl md:text-3xl font-bold text-cyber-yellow font-mono drop-shadow-[0_0_5px_rgba(252,238,10,0.5)]">
                        {formatCurrency(coins)}
                    </div>
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 relative">
                <AnimatePresence mode="wait">
                    {!activeGame ? (
                        /* --- GAME GRID --- */
                        <motion.div
                            key="grid"
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
                        >
                            {games.map((game) => (
                                <motion.button
                                    key={game.id}
                                    onClick={() => !game.comingSoon && setActiveGame(game.id)}
                                    className={cn(
                                        "relative h-64 rounded-3xl overflow-hidden border border-white/10 group text-left flex flex-col justify-end p-6 transition-all duration-300",
                                        game.comingSoon ? "opacity-70 cursor-not-allowed grayscale-[0.5]" : "hover:scale-[1.02] hover:shadow-[0_0_30px_rgba(255,255,255,0.1)] hover:border-white/30"
                                    )}
                                    whileHover={!game.comingSoon ? { y: -5 } : {}}
                                >
                                    {/* Background Gradient */}
                                    <div className={cn("absolute inset-0 bg-gradient-to-br opacity-80 transition-opacity group-hover:opacity-100", game.color)} />

                                    {/* Black Gradient Overlay for text readability */}
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />

                                    {/* Icon Background Element */}
                                    <div className="absolute top-4 right-4 text-8xl opacity-10 rotate-12 group-hover:rotate-12 transition-transform duration-700 pointer-events-none">
                                        {game.icon}
                                    </div>

                                    {/* Content */}
                                    <div className="relative z-10">
                                        <div className="text-5xl mb-2 filter drop-shadow-lg">{game.icon}</div>
                                        <h3 className="text-2xl font-black text-white italic tracking-wide mb-1 uppercase">
                                            {game.label}
                                        </h3>
                                        <p className="text-gray-300 text-sm font-medium opacity-80 mb-4">
                                            {game.desc}
                                        </p>

                                        {!game.comingSoon ? (
                                            <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur px-4 py-2 rounded-full text-xs font-bold text-white uppercase tracking-wider group-hover:bg-white group-hover:text-black transition-colors">
                                                <Play size={12} fill="currentColor" /> Jugar Ahora
                                            </div>
                                        ) : (
                                            <div className="inline-flex items-center gap-2 bg-black/40 backdrop-blur px-4 py-2 rounded-full text-xs font-bold text-gray-400 uppercase tracking-wider border border-white/5">
                                                Próximamente
                                            </div>
                                        )}
                                    </div>
                                </motion.button>
                            ))}
                        </motion.div>
                    ) : (
                        /* --- ACTIVE GAME VIEW --- */
                        <motion.div
                            key="game"
                            initial={{ opacity: 0, y: 50 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 50 }}
                            className="w-full h-full"
                        >
                            {activeGame === 'slots' && <Slots />}
                            {activeGame === 'gates' && <GatesOfClicker />}
                            {activeGame === 'roulette' && <Roulette />}
                            {activeGame === 'live_roulette' && <LiveRoulette />}
                            {activeGame === 'blackjack' && <Blackjack />}
                            {activeGame === 'scratch75' && <Scratch75 />}
                            {activeGame === 'mines' && <Mines />}
                            {activeGame === 'crash' && <Crash />}
                            {activeGame === 'plinko' && <Plinko />}

                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}
