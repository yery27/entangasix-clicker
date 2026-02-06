import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '../../stores/gameStore';
import { toast } from 'sonner';
import { cn, formatCurrency } from '../../lib/utils';
import { Bomb, Diamond } from 'lucide-react';
import { playSound, setMuted } from '../../lib/soundManager';

/* --- LOGIC CONSTANTS --- */
const GRID_SIZE = 25;
const MULTIPLIERS = {
    1: [1.01, 1.08, 1.12, 1.18, 1.24, 1.30, 1.37, 1.46, 1.55, 1.65, 1.77, 1.90, 2.06, 2.25, 2.47, 2.75, 3.09, 3.54, 4.12, 4.95, 6.19, 8.25, 12.38, 24.75],
    3: [1.01, 1.17, 1.35, 1.57, 1.84, 2.17, 2.58, 3.11, 3.79, 4.69, 5.90, 7.62, 10.16, 14.22, 21.33],
    5: [1.01, 1.25, 1.56, 1.96, 2.49, 3.20, 4.19, 5.58, 7.62, 10.16, 14.93, 22.39, 37.32, 74.64],
    10: [1.01, 1.63, 2.48, 3.79, 5.92, 9.61, 16.35, 29.80, 60.12, 149.20]
};

export function Mines() {
    const { coins, removeCoins, addCoins, soundEnabled } = useGameStore();

    // Sync mute
    useEffect(() => {
        setMuted(!soundEnabled);
    }, [soundEnabled]);

    // Game Config
    const [mineCount, setMineCount] = useState(3);
    const [bet, setBet] = useState(100);

    // Game State
    const [gameState, setGameState] = useState<'betting' | 'playing' | 'cashed_out' | 'boom'>('betting');
    const [mines, setMines] = useState<number[]>([]); // Indices of mines
    const [revealed, setRevealed] = useState<number[]>([]); // Indices of revealed tiles
    const [currentMultiplier, setCurrentMultiplier] = useState(1.0);

    // Generate Game
    const startGame = () => {
        if (coins < bet) return toast.error("Sin saldo suficiente");
        playSound.click();
        removeCoins(bet);

        // Generate Random Mines
        const newMines: number[] = [];
        while (newMines.length < mineCount) {
            const r = Math.floor(Math.random() * GRID_SIZE);
            if (!newMines.includes(r)) newMines.push(r);
        }

        setMines(newMines);
        setRevealed([]);
        setCurrentMultiplier(1.0);
        setGameState('playing');
    };

    const handleTileClick = (index: number) => {
        if (gameState !== 'playing') return;
        if (revealed.includes(index)) return;

        // Reveal logic
        setRevealed(prev => [...prev, index]);
        playSound.click(); // Initial click

        if (mines.includes(index)) {
            // BOOM!
            setGameState('boom');
            playSound.explosion();
            setTimeout(() => playSound.loss(), 500); // Delayed loss sound
            toast.error("¡EXPLOSIÓN!", { description: "Has perdido tu apuesta." });

            // Record Stats (Loss)
            useGameStore.getState().recordGameResult('mines', {
                win: 0,
                bet: bet,
                custom: { rounds: 1 }
            });

            // Reveal all mines
            setRevealed([...Array(GRID_SIZE).keys()]);
        } else {
            // Safe! Increase Multiplier
            playSound.coin(); // Nice gem sound
            // Get predefined multiplier or calculate
            const step = revealed.length; // 0 previous revealed
            // Use specific table or generic growth
            let nextMult = currentMultiplier;

            if (MULTIPLIERS[mineCount as keyof typeof MULTIPLIERS] && MULTIPLIERS[mineCount as keyof typeof MULTIPLIERS][step]) {
                nextMult = MULTIPLIERS[mineCount as keyof typeof MULTIPLIERS][step];
            } else {
                // Approximate for dynamic counts: (25 - mines - revealed) / (25 - revealed) inverted... simplified:
                nextMult = currentMultiplier * (1 + (mineCount / (25 - step - mineCount)));
            }

            setCurrentMultiplier(nextMult);
        }
    };

    const cashOut = () => {
        if (gameState !== 'playing') return;

        const winAmount = Math.floor(bet * currentMultiplier);
        addCoins(winAmount);
        setGameState('cashed_out');
        playSound.win();
        toast.success("¡RETIRADO!", { description: `Has ganado ${formatCurrency(winAmount)}` });

        // Record Stats (Win)
        useGameStore.getState().recordGameResult('mines', {
            win: winAmount,
            bet: bet,
            custom: { rounds: 1 }
        });

        // Reveal all to show where mines were
        setRevealed([...Array(GRID_SIZE).keys()]);
    };

    const nextWinAmount = Math.floor(bet * currentMultiplier);

    return (
        <div className="flex flex-col md:flex-row gap-8 max-w-5xl mx-auto items-start">

            {/* --- CONTROLS SIDEBAR --- */}
            <div className="w-full md:w-80 bg-[#1a1d26] p-6 rounded-3xl border border-white/10 flex flex-col gap-6 shadow-xl relative z-10">
                <div>
                    <label className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-2 block">Apuesta</label>
                    <div className="bg-black/40 border border-white/10 rounded-xl p-2 flex gap-2">
                        <div className="relative flex-1">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-yellow-500 font-bold">$</span>
                            <input
                                type="number"
                                value={bet}
                                onChange={(e) => setBet(Math.max(0, parseInt(e.target.value) || 0))}
                                disabled={gameState === 'playing'}
                                className="w-full bg-black/40 border border-white/5 rounded-lg py-2 pl-6 pr-2 text-white font-mono focus:outline-none focus:border-yellow-500/50 transition-colors"
                            />
                        </div>
                        <button
                            onClick={() => setBet(coins)}
                            disabled={gameState === 'playing'}
                            className="px-3 py-2 bg-yellow-600/20 text-yellow-400 text-xs font-bold rounded-lg hover:bg-yellow-600/30 border border-yellow-600/50 transition-colors disabled:opacity-50"
                        >
                            MAX
                        </button>
                    </div>
                </div>

                <div>
                    <label className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-2 block">Minas</label>
                    <div className="grid grid-cols-4 gap-2">
                        {[1, 3, 5, 10].map(cnt => (
                            <button
                                key={cnt}
                                onClick={() => { playSound.click(); setMineCount(cnt); }}
                                disabled={gameState === 'playing'}
                                className={cn(
                                    "py-2 rounded-lg font-bold text-sm transition-all border",
                                    mineCount === cnt ? "bg-red-600 border-red-400 text-white shadow-[0_0_15px_rgba(220,38,38,0.5)]" : "bg-black/40 border-transparent text-gray-500 hover:bg-white/5"
                                )}
                            >
                                {cnt}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="mt-4 pt-6 border-t border-white/10">
                    {gameState === 'playing' ? (
                        <button
                            onClick={cashOut}
                            className="w-full py-4 bg-green-500 hover:bg-green-400 text-black font-black text-xl rounded-xl shadow-[0_0_30px_rgba(34,197,94,0.4)] transition-all active:scale-95 flex flex-col items-center leading-none gap-1"
                        >
                            <span>RETIRAR</span>
                            <span className="text-sm opacity-80 font-mono">{formatCurrency(nextWinAmount)}</span>
                        </button>
                    ) : (
                        <button
                            onClick={startGame}
                            className="w-full py-4 bg-yellow-500 hover:bg-yellow-400 text-black font-black text-xl rounded-xl shadow-[0_0_30px_rgba(234,179,8,0.4)] transition-all active:scale-95"
                        >
                            JUGAR
                        </button>
                    )}
                </div>
            </div>

            {/* --- GAME BOARD --- */}
            <div className="flex-1 w-full bg-[#0f1115] border-[8px] border-[#1a1d26] rounded-3xl p-4 md:p-8 shadow-2xl relative overflow-hidden">
                {/* Decoration */}
                <div className="absolute top-0 right-0 w-full h-full bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-blue-900/10 via-transparent to-transparent pointer-events-none" />

                <div className="grid grid-cols-5 gap-2 md:gap-4 aspect-square max-w-[500px] mx-auto relative z-10">
                    {[...Array(GRID_SIZE)].map((_, i) => {
                        const isRevealed = revealed.includes(i);
                        const isMine = mines.includes(i);
                        const isBoom = isRevealed && isMine;

                        return (
                            <motion.button
                                key={i}
                                disabled={gameState !== 'playing' || isRevealed}
                                onClick={() => handleTileClick(i)}
                                whileHover={gameState === 'playing' && !isRevealed ? { scale: 1.05 } : {}}
                                whileTap={gameState === 'playing' && !isRevealed ? { scale: 0.95 } : {}}
                                className={cn(
                                    "rounded-xl md:rounded-2xl transition-all duration-300 relative overflow-hidden shadow-lg",
                                    !isRevealed
                                        ? "bg-[#2a2e3b] hover:bg-[#343a4a] border-b-4 border-black/20"
                                        : isBoom
                                            ? "bg-red-500 border-none"
                                            : "bg-[#0f1115] border-2 border-green-500/20"
                                )}
                            >
                                <AnimatePresence mode="popLayout">
                                    {isRevealed && (
                                        <motion.div
                                            initial={{ scale: 0, rotate: 180 }}
                                            animate={{ scale: 1, rotate: 0 }}
                                            className="absolute inset-0 flex items-center justify-center"
                                        >
                                            {isMine ? (
                                                <Bomb size={32} className="text-white drop-shadow-md animate-pulse" />
                                            ) : (
                                                <Diamond size={32} className="text-green-400 drop-shadow-[0_0_10px_rgba(74,222,128,0.8)]" />
                                            )}
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </motion.button>
                        );
                    })}
                </div>

                {/* Status Overlay */}
                {(gameState === 'cashed_out' || gameState === 'boom') && (
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-20 flex items-center justify-center">
                        <motion.div
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="bg-[#1a1d26] p-8 rounded-3xl border border-white/10 text-center shadow-2xl"
                        >
                            {gameState === 'boom' ? (
                                <>
                                    <Bomb size={64} className="text-red-500 mx-auto mb-4" />
                                    <h2 className="text-3xl font-black text-white mb-2">¡BOOM!</h2>
                                    <p className="text-gray-400">Suerte la próxima vez.</p>
                                </>
                            ) : (
                                <>
                                    <Diamond size={64} className="text-green-400 mx-auto mb-4" />
                                    <h2 className="text-3xl font-black text-white mb-2">¡GANASTE!</h2>
                                    <p className="text-2xl font-mono text-yellow-400">{formatCurrency(Math.floor(bet * currentMultiplier))}</p>
                                </>
                            )}
                            <button
                                onClick={() => {
                                    setGameState('betting');
                                    setRevealed([]);
                                    setMines([]);
                                }}
                                className="mt-6 px-8 py-3 bg-white text-black font-bold rounded-xl hover:bg-gray-200 transition-colors"
                            >
                                Jugar de Nuevo
                            </button>
                        </motion.div>
                    </div>
                )}
            </div>

        </div>
    );
}
