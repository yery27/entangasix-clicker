import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '../../stores/gameStore';
import { toast } from 'sonner';
import { cn, formatCurrency } from '../../lib/utils';
import { Rocket } from 'lucide-react';
import { playSound, setMuted } from '../../lib/soundManager';

export function Crash() {
    const { coins, removeCoins, addCoins, soundEnabled } = useGameStore();

    // Config
    const [bet, setBet] = useState(100);

    // Game State
    const [gameStatus, setGameStatus] = useState<'IDLE' | 'RUNNING' | 'CRASHED'>('IDLE');
    const [multiplier, setMultiplier] = useState(1.00);
    const [history, setHistory] = useState<number[]>([]);
    const [cashedOut, setCashedOut] = useState<number | null>(null);

    // Animation refs
    const crashPointRef = useRef<number>(0);
    const requestRef = useRef<number>(0);
    const startTimeRef = useRef<number>(0);

    // Sync mute
    useEffect(() => {
        setMuted(!soundEnabled);
    }, [soundEnabled]);

    // --- GAME LOGIC ---
    useEffect(() => {
        return () => {
            if (requestRef.current) cancelAnimationFrame(requestRef.current);
        };
    }, []);

    const startGame = () => {
        if (coins < bet) return toast.error(`Necesitas ${formatCurrency(bet)}`);
        removeCoins(bet);
        playSound.click();

        setGameStatus('RUNNING');
        setCashedOut(null);
        setMultiplier(1.00);

        // Sound: Engine start
        playSound.crashStart();

        // Determine crash point
        // Algorithm: 1% instant crash, exponential decay distribution
        // E[X] = 1/p. Here we use standard provably fair-like logic
        // Crash point = 0.99 / (1 - U), where U is uniform (0,1)
        const r = Math.random();
        const crash = 0.99 / (1 - r);
        const safeCrash = Math.max(1.10, Math.min(crash, 1000)); // Cap at 1000x, min 1.10x to prevent instant hate

        // To prevent instant death on 1.00:
        // We already force min 1.10x.

        // crashPointRef.current = safeCrash; 
        // Using ref to ensure loop sees it
        crashPointRef.current = safeCrash;

        startTimeRef.current = Date.now();
        requestRef.current = requestAnimationFrame(gameLoop);
    };

    const gameLoop = () => {
        const now = Date.now();
        const elapsed = (now - startTimeRef.current) / 1000; // seconds

        // Exponential growth: 1 * e^(0.15 * t) approx speed
        const growth = Math.pow(Math.E, 0.15 * elapsed);

        const currentCrashPoint = crashPointRef.current;

        if (growth >= currentCrashPoint) {
            setMultiplier(currentCrashPoint);
            handleCrash(currentCrashPoint);
        } else {
            setMultiplier(growth);
            requestRef.current = requestAnimationFrame(gameLoop);
        }
    };

    const handleCrash = (finalMult: number) => {
        cancelAnimationFrame(requestRef.current!);
        setGameStatus('CRASHED');
        setHistory(prev => [finalMult, ...prev].slice(0, 10));
        playSound.explosion(); // BOOM
        toast.error(`CRASHED @ ${finalMult.toFixed(2)}x`);
    };

    const handleCashout = () => {
        if (gameStatus !== 'RUNNING' || cashedOut) return;

        const win = Math.floor(bet * multiplier);
        addCoins(win);
        setCashedOut(multiplier);
        playSound.win(); // Nice win sound

        toast.success(`Retirado: ${formatCurrency(win)}`);
    };



    return (
        <div className="flex flex-col md:flex-row gap-6 max-w-6xl mx-auto h-full min-h-[600px]">
            {/* Controls */}
            <div className="w-full md:w-80 bg-[#162032] p-6 rounded-3xl border border-white/10 flex flex-col gap-6 shadow-xl z-20">
                <div className="flex items-center gap-2 text-cyan-400 mb-2">
                    <Rocket className="w-6 h-6" />
                    <h2 className="text-xl font-black uppercase tracking-wider">Crash</h2>
                </div>

                <div className="mt-4">
                    <label className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-2 block">Tu Apuesta</label>
                    <div className="bg-black/40 border border-white/10 rounded-xl p-2 flex gap-2">
                        <div className="relative flex-1">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-cyan-400 font-bold">$</span>
                            <input
                                type="number"
                                value={bet}
                                onChange={(e) => setBet(Math.max(0, parseInt(e.target.value) || 0))}
                                disabled={gameStatus === 'RUNNING'}
                                className="w-full bg-black/40 border border-white/5 rounded-lg py-2 pl-6 pr-2 text-white font-mono focus:outline-none focus:border-cyan-500/50 transition-colors"
                            />
                        </div>
                        <button
                            onClick={() => setBet(coins)}
                            disabled={gameStatus === 'RUNNING'}
                            className="px-3 py-2 bg-cyan-600/20 text-cyan-400 text-xs font-bold rounded-lg hover:bg-cyan-600/30 border border-cyan-600/50 transition-colors disabled:opacity-50"
                        >
                            MAX
                        </button>
                    </div>
                </div>

                {gameStatus === 'RUNNING' && !cashedOut ? (
                    <button
                        onClick={handleCashout}
                        className="w-full py-6 bg-green-500 hover:bg-green-400 text-black font-black text-2xl rounded-2xl shadow-[0_0_40px_rgba(34,197,94,0.4)] transition-all active:scale-95 active:translate-y-1 mt-auto"
                    >
                        RETIRAR ({multiplier.toFixed(2)}x)
                    </button>
                ) : (
                    <button
                        onClick={startGame}
                        disabled={gameStatus === 'RUNNING'}
                        className="w-full py-6 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white font-black text-2xl rounded-2xl shadow-[0_0_40px_rgba(8,145,178,0.4)] transition-all active:scale-95 active:translate-y-1 mt-auto"
                    >
                        {gameStatus === 'CRASHED' ? 'REINTENTAR' : 'APOSTAR'}
                    </button>
                )}
            </div>

            {/* Game Board */}
            <div className="flex-1 bg-[#0f1523] rounded-3xl relative overflow-hidden flex flex-col items-center justify-center border-4 border-[#162032] shadow-2xl p-6">

                {/* Graph Background (Simplified visual) */}
                <div className="absolute inset-0 opacity-20"
                    style={{
                        backgroundImage: 'radial-gradient(circle at center, #22d3ee 1px, transparent 1px)',
                        backgroundSize: '40px 40px'
                    }}>
                </div>

                {/* Multiplier Display */}
                <div className="z-10 text-center">
                    <AnimatePresence mode="wait">
                        {gameStatus === 'CRASHED' ? (
                            <motion.div
                                initial={{ scale: 0.5, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                className="text-red-500"
                            >
                                <div className="text-2xl font-bold uppercase tracking-widest mb-2 opacity-80">Crashed</div>
                                <div className="text-7xl md:text-9xl font-black drop-shadow-[0_0_30px_rgba(239,68,68,0.8)]">
                                    {multiplier.toFixed(2)}x
                                </div>
                            </motion.div>
                        ) : (
                            <div className={cn("transition-colors duration-200",
                                gameStatus === 'RUNNING' ? "text-white" : "text-gray-500"
                            )}>
                                <div className="text-7xl md:text-9xl font-black tabular-nums tracking-tighter drop-shadow-2xl">
                                    {multiplier.toFixed(2)}x
                                </div>
                                {cashedOut && (
                                    <motion.div
                                        initial={{ y: 20, opacity: 0 }}
                                        animate={{ y: 0, opacity: 1 }}
                                        className="text-green-400 font-bold text-xl mt-4"
                                    >
                                        Retirado @ {cashedOut.toFixed(2)}x (+{formatCurrency(Math.floor(bet * cashedOut))})
                                    </motion.div>
                                )}
                            </div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Rocket Animation */}
                {gameStatus === 'RUNNING' && (
                    <motion.div
                        animate={{
                            y: [0, -20, 0],
                            rotate: [0, 1, -1, 0]
                        }}
                        transition={{ repeat: Infinity, duration: 2 }}
                        className="absolute bottom-20 left-1/2 -translate-x-1/2"
                    >
                        <Rocket className="w-16 h-16 text-cyan-400 drop-shadow-[0_0_20px_cyan]" />
                    </motion.div>
                )}

                {/* History */}
                <div className="absolute top-6 right-6 flex gap-2">
                    {history.map((h, i) => (
                        <div key={i} className={cn(
                            "px-3 py-1 rounded font-bold text-xs border border-white/10",
                            h >= 10 ? "bg-yellow-400 text-black" :
                                h >= 2 ? "bg-green-500 text-black" : "bg-gray-700 text-gray-400"
                        )}>
                            {h.toFixed(2)}x
                        </div>
                    ))}
                </div>

            </div>
        </div>
    );
}
