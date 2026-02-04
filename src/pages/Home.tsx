import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '../stores/gameStore';
import { formatCurrency, cn } from '../lib/utils';
import { RANKS, COSMETIC_ITEMS } from '../lib/constants';
import { Zap, TrendingUp } from 'lucide-react';

export default function Home() {
    const { coins, lifetimeCoins, clickPower, autoClickPower, click } = useGameStore();
    const [clicks, setClicks] = useState<{ id: number, x: number, y: number, val: number }[]>([]);

    // Determine current rank
    const currentRankIndex = RANKS.findIndex(r => lifetimeCoins < r.threshold) === -1
        ? RANKS.length - 1
        : Math.max(0, RANKS.findIndex(r => lifetimeCoins < r.threshold) - 1);
    const currentRank = RANKS[currentRankIndex];
    const nextRank = RANKS[currentRankIndex + 1];

    // Progress to next rank
    const progressCalls = nextRank
        ? ((lifetimeCoins - currentRank.threshold) / (nextRank.threshold - currentRank.threshold)) * 100
        : 100;

    const handleClick = (e: React.MouseEvent) => {
        // Get click position relative to the button center roughly, or exact
        const rect = (e.target as HTMLElement).getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        click();

        // Add floating text
        const id = Date.now();
        setClicks(prev => [...prev, { id, x, y, val: clickPower }]);

        // Cleanup old clicks
        setTimeout(() => {
            setClicks(prev => prev.filter(c => c.id !== id));
        }, 1000);
    };

    return (
        <div className="h-full flex flex-col items-center p-6 max-w-4xl mx-auto">

            {/* Stats Header */}
            <div className="w-full grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
                <div className="bg-cyber-gray/50 border border-white/5 p-4 rounded-xl backdrop-blur-sm">
                    <p className="text-gray-400 text-xs uppercase tracking-wider">CPS (Auto)</p>
                    <div className="flex items-center gap-2 text-cyber-purple font-mono text-xl font-bold">
                        <Zap size={18} />
                        {formatCurrency(autoClickPower)}/s
                    </div>
                </div>
                <div className="bg-cyber-gray/50 border border-white/5 p-4 rounded-xl backdrop-blur-sm">
                    <p className="text-gray-400 text-xs uppercase tracking-wider">Dinero Total</p>
                    <div className="flex items-center gap-2 text-cyber-pink font-mono text-xl font-bold">
                        <TrendingUp size={18} />
                        {formatCurrency(lifetimeCoins)}
                    </div>
                </div>
                <div className="col-span-2 md:col-span-1 bg-gradient-to-r from-cyber-dark to-cyber-gray border border-cyber-DEFAULT/30 p-4 rounded-xl relative overflow-hidden">
                    <p className="text-cyber-DEFAULT text-xs uppercase tracking-wider font-bold">Saldo Actual</p>
                    <div className="text-3xl font-bold text-white font-mono mt-1 neon-text">
                        {formatCurrency(coins)}
                    </div>
                    <div className="absolute right-0 top-0 h-full w-1 bg-cyber-DEFAULT opacity-50" />
                </div>
            </div>

            {/* Main Clicker Area */}
            <div className="flex-1 flex flex-col items-center justify-center w-full min-h-[400px]">

                {/* Rank Display */}
                <div className="mb-12 w-full max-w-sm text-center">
                    <div className="flex justify-between items-end mb-2">
                        <span className={cn("font-bold text-lg", currentRank.color)}>{currentRank.name}</span>
                        <span className="text-xs text-gray-500">
                            {nextRank ? `${formatCurrency(lifetimeCoins)} / ${formatCurrency(nextRank.threshold)}` : 'MAX LEVEL'}
                        </span>
                    </div>
                    <div className="h-2 bg-gray-800 rounded-full overflow-hidden border border-white/5">
                        <motion.div
                            className={cn("h-full bg-gradient-to-r", currentRank.color.replace('text-', 'bg-'))}
                            initial={{ width: 0 }}
                            animate={{ width: `${Math.min(100, Math.max(0, progressCalls))}%` }}
                            transition={{ type: "spring", stiffness: 50 }}
                        />
                    </div>
                </div>

                {/* The Button */}
                <div className="relative">
                    <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={handleClick}
                        className={cn(
                            "w-64 h-64 rounded-full bg-gradient-to-b from-cyber-gray to-black border-4 shadow-[0_0_50px_rgba(0,0,0,0.5)] flex items-center justify-center relative overflow-hidden group",
                            currentRank.border
                        )}
                    >
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.05),transparent)] pointer-events-none" />
                        <div className="w-56 h-56 rounded-full bg-cyber-dark flex items-center justify-center shadow-inner relative z-10 group-active:shadow-[inset_0_0_30px_rgba(0,0,0,0.8)] transition-shadow">
                            <div className="text-6xl select-none pointer-events-none">👆</div>
                        </div>

                        {/* Ring Animation */}
                        <div className="absolute inset-0 border-2 border-white/5 rounded-full animate-spin-slow" style={{ borderTopColor: 'rgba(0, 243, 255, 0.5)' }} />
                    </motion.button>

                    {/* Floating Numbers */}
                    <AnimatePresence>
                        {clicks.map((click) => {
                            const equippedEffectId = useGameStore.getState().cosmetics.equipped.click_effect;
                            const effect = COSMETIC_ITEMS.effects.find(e => e.id === equippedEffectId);
                            const isRainbow = effect?.color === 'rainbow';

                            return (
                                <motion.div
                                    key={click.id}
                                    initial={{ opacity: 1, y: click.y - 100, x: click.x - 100, scale: 0.5 }}
                                    animate={{
                                        opacity: 0,
                                        y: click.y - 300,
                                        scale: 1.5,
                                        rotate: Math.random() * 20 - 10
                                    }}
                                    exit={{ opacity: 0 }}
                                    transition={{ duration: 0.8, ease: "easeOut" }}
                                    className={cn(
                                        "absolute top-0 left-0 text-4xl font-black pointer-events-none select-none z-50 flex items-center gap-2",
                                        !effect && "text-white"
                                    )}
                                    style={{
                                        left: 0, top: 0, marginLeft: click.x, marginTop: click.y,
                                        color: isRainbow ? undefined : effect?.color,
                                        textShadow: isRainbow
                                            ? '0 0 10px rgba(255,255,255,0.8)'
                                            : effect?.color ? `0 0 20px ${effect.color}` : '0 0 10px rgba(0,0,0,0.5)',
                                        backgroundImage: isRainbow ? 'linear-gradient(to right, #ef5350, #f48fb1, #7e57c2, #2196f3, #26c6da, #43a047, #eeff41, #f9a825, #ff5722)' : undefined,
                                        WebkitBackgroundClip: isRainbow ? 'text' : undefined,
                                        WebkitTextFillColor: isRainbow ? 'transparent' : undefined,
                                    }}
                                >
                                    +{click.val}
                                    {effect?.id === 'effect_money' && '💸'}
                                    {effect?.id === 'effect_fire' && '🔥'}
                                    {effect?.id === 'effect_lightning' && '⚡'}
                                </motion.div>
                            );
                        })}
                    </AnimatePresence>
                </div>

            </div>
        </div>
    );
}
