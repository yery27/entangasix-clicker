import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '../../stores/gameStore';
import { toast } from 'sonner';
import { cn, formatCurrency } from '../../lib/utils';

import { playSound, setMuted } from '../../lib/soundManager';

/* --- CONSTANTS --- */
const ROWS = 12; // Standard hard difficulty
// Multipliers for 12 rows (High Risk)
const MULTIPLIERS = [10, 5, 2.5, 1.5, 1.2, 0.5, 0.2, 0.5, 1.2, 1.5, 2.5, 5, 10];
// Colors for buckets (Red at extremes, Orange, Yellow in middle)
const BUCKET_COLORS = [
    'bg-red-600', 'bg-red-500', 'bg-orange-500', 'bg-amber-500', 'bg-yellow-400', 'bg-yellow-200',
    'bg-yellow-200', // Center
    'bg-yellow-200', 'bg-yellow-400', 'bg-amber-500', 'bg-orange-500', 'bg-red-500', 'bg-red-600'
];

interface Ball {
    id: number;
    path: number[]; // Array of -1 (left) or 1 (right) decisions
    step: number; // Current row
    resultMult?: number;
    startX: number;
}

export function Plinko() {
    const { coins, removeCoins, addCoins, soundEnabled } = useGameStore();
    const [bet, setBet] = useState(100);
    const [numBalls, setNumBalls] = useState(1);
    const [balls, setBalls] = useState<Ball[]>([]);
    const [history, setHistory] = useState<number[]>([]);
    const [floatingTexts, setFloatingTexts] = useState<{ id: number; x: number; y: number; text: string; color: string }[]>([]);

    // Sync mute state
    useEffect(() => {
        setMuted(!soundEnabled);
    }, [soundEnabled]);

    // Refs for state accessed inside loop to avoid stale closures
    const betRef = useRef(bet);
    useEffect(() => { betRef.current = bet; }, [bet]);

    // Round Win Logic
    const [roundWinPopup, setRoundWinPopup] = useState<{ show: boolean; amount: number } | null>(null);
    const ballsPendingRef = useRef(0);
    const roundWinAccumulatorRef = useRef(0);

    // Animation Loop
    useEffect(() => {
        const interval = setInterval(() => {
            setBalls(prevBalls => {
                const nextBalls: Ball[] = [];
                let hasMoved = false;

                prevBalls.forEach(ball => {
                    if (ball.step < ROWS) {
                        nextBalls.push({ ...ball, step: ball.step + 1 });
                        hasMoved = true;
                    } else {
                        // Pass current bet via Ref
                        handleFinish(ball, betRef.current);
                    }
                });

                // Play plink sound if any ball moved
                if (hasMoved && nextBalls.length > 0) {
                    // Randomize pitch slightly? handled in soundManager
                    playSound.plink();
                }

                return nextBalls;
            });
        }, 300);
        return () => clearInterval(interval);
    }, []);

    const handleFinish = (ball: Ball, currentBet: number) => {
        const rights = ball.path.filter(d => d === 1).length;
        const index = rights;
        const mult = MULTIPLIERS[index];
        const win = Math.floor(currentBet * mult); // Use fresh bet passed from loop

        if (win > 0) addCoins(win);
        setHistory(prev => [mult, ...prev].slice(0, 5));

        // Accumulate Round Win
        roundWinAccumulatorRef.current += win;
        ballsPendingRef.current = Math.max(0, ballsPendingRef.current - 1);

        // Check if round finished
        if (ballsPendingRef.current === 0) {
            const totalWin = roundWinAccumulatorRef.current;
            // Show popup ONLY if we won something, or maybe always? User said "suma del dinero que ganas".
            // Let's show it even if it's 0 to indicate round over, but usually only positive wins matter.
            // If totalWin > 0 makes sense.
            if (totalWin > 0) {
                setRoundWinPopup({ show: true, amount: totalWin });
                playSound.jackpot(); // Sound for big result
                setTimeout(() => setRoundWinPopup(null), 2000);
            }
            // We do NOT reset accumulator here immediately if we want to retain it for display? 
            // Actually we passed it to state `roundWinPopup`. So we can reset ref safely.
            roundWinAccumulatorRef.current = 0;
        }

        // Floating Text Logic
        const textId = Date.now() + Math.random();
        const xPos = (index - 6) * 40;

        setFloatingTexts(prev => [...prev, {
            id: textId,
            x: xPos,
            y: 500, // Bottom of pins
            text: `+${formatCurrency(win)}`,
            color: mult >= 1 ? 'text-green-400' : 'text-gray-500'
        }]);

        // Play coin sound for win
        if (win > 0) playSound.coin();
        else playSound.loss();

        setTimeout(() => {
            setFloatingTexts(prev => prev.filter(t => t.id !== textId));
        }, 1500);

        // Toast only for big wins
        if (mult >= 2) {
            toast(`+${formatCurrency(win)}`, {
                className: 'bg-green-500 text-black font-bold',
                position: 'bottom-center',
                duration: 1000
            });
        }
    };

    const dropBall = () => {
        const totalBet = bet * numBalls;
        if (coins < totalBet) return toast.error(`Necesitas ${formatCurrency(totalBet)}`);
        removeCoins(totalBet);
        playSound.click(); // Click sound

        // Reset accumulation if we are starting a clean batch (previous balls finish).
        // If we are spamming, we might want to keep accumulating? 
        // "Suma del dinero que ganas con las bolas que caen". 
        // The standard behavior is: "This specific drop command" vs "Current active session".
        // Simplest and most robust: specific logic for "Active Balls".
        // If ballsPending is 0, it means a fresh start. Reset.
        // If ballsPending > 0, we are adding to the chaos. 
        // User likely wants to know the total of the *current storm of balls*.
        if (ballsPendingRef.current === 0) {
            roundWinAccumulatorRef.current = 0;
        }

        ballsPendingRef.current += numBalls;

        let dropped = 0;
        const interval = setInterval(() => {
            if (dropped >= numBalls) {
                clearInterval(interval);
                return;
            }

            const path: number[] = [];
            for (let i = 0; i < ROWS; i++) {
                path.push(Math.random() < 0.5 ? -1 : 1);
            }

            setBalls(prev => [...prev, {
                id: Date.now() + Math.random(),
                path,
                step: 0,
                startX: 50
            }]);
            dropped++;
        }, 200);
    };

    return (
        <div className="flex flex-col md:flex-row gap-6 max-w-6xl mx-auto h-full min-h-[600px]">

            {/* --- CONTROLS --- */}
            <div className="w-full md:w-72 bg-[#162032] p-6 rounded-3xl border border-white/10 flex flex-col gap-6 shadow-xl z-20">
                <div className="mt-4">
                    <label className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-2 block">Bolas: {numBalls}</label>
                    <input
                        type="range"
                        min="1"
                        max="50"
                        value={numBalls}
                        onChange={(e) => setNumBalls(parseInt(e.target.value))}
                        className="w-full accent-cyan-400"
                    />
                </div>

                <div className="mt-4">
                    <label className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-2 block">Apuesta / Bola</label>
                    <div className="bg-black/40 border border-white/10 rounded-xl p-4 flex justify-between items-center">
                        <button onClick={() => setBet(Math.max(10, bet - 100))} className="w-8 h-8 rounded bg-white/5 hover:bg-white/10 text-white font-bold">-</button>
                        <span className="text-xl font-mono font-bold text-cyan-400">{formatCurrency(bet)}</span>
                        <button onClick={() => setBet(coins >= bet + 100 ? bet + 100 : bet)} className="w-8 h-8 rounded bg-white/5 hover:bg-white/10 text-white font-bold">+</button>
                    </div>
                </div>

                <button
                    onClick={dropBall}
                    className="w-full py-6 bg-cyan-600 hover:bg-cyan-500 text-white font-black text-2xl rounded-2xl shadow-[0_0_40px_rgba(8,145,178,0.4)] transition-all active:scale-95 active:translate-y-1"
                >
                    SOLTAR {numBalls} BOLA{numBalls > 1 ? 'S' : ''}
                </button>

                <div className="mt-auto">
                    <div className="text-xs font-bold text-gray-500 uppercase mb-2">Historial</div>
                    <div className="flex gap-2 flex-wrap">
                        {history.map((h, i) => (
                            <div key={i} className={cn(
                                "w-10 h-8 rounded flex items-center justify-center text-xs font-bold",
                                h >= 10 ? "bg-red-600 text-white" : h >= 2 ? "bg-orange-500 text-black" : h < 1 ? "bg-gray-700 text-gray-400" : "bg-yellow-400 text-black"
                            )}>
                                {h}x
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* --- PYRAMID BOARD --- */}
            {/* Flex center is critical for mobile alignment */}
            <div className="flex-1 bg-[#0f1523] rounded-3xl relative overflow-hidden flex flex-col items-center justify-center border-4 border-[#162032] shadow-2xl py-8">

                {/* SCALED CONTAINER (FIXED SIZE INTERNAL) */}
                {/* Holds Pins, Balls, and Buckets together */}
                <div className="relative w-[600px] h-[550px] flex-shrink-0 origin-center transform scale-[0.55] sm:scale-[0.8] md:scale-100 transition-transform duration-300">

                    {/* Render Pins */}
                    {[...Array(ROWS + 1)].map((_, row) => {
                        const cols = row + 3;
                        return (
                            <div key={row} className="flex justify-center gap-6 md:gap-10 mb-6 md:mb-8 absolute w-full" style={{ top: `${row * 40}px` }}>
                                {[...Array(cols)].map((_, col) => (
                                    <div key={col} className="w-2 h-2 md:w-3 md:h-3 rounded-full bg-white/20 shadow-[0_0_5px_white]"></div>
                                ))}
                            </div>
                        );
                    })}

                    {/* BUCKETS (Inside container, positioned at bottom) */}
                    <div className="absolute top-[480px] w-full flex justify-center gap-1 px-4">
                        {MULTIPLIERS.map((m, i) => (
                            <div key={i} className={cn(
                                "flex-1 h-10 flex items-center justify-center text-xs font-bold rounded-md shadow-lg border border-black/20",
                                BUCKET_COLORS[i]
                            )}>
                                {m}x
                            </div>
                        ))}
                    </div>

                    {/* Render Balls */}
                    <AnimatePresence mode="popLayout">
                        {balls.map(ball => {
                            const rights = ball.path.slice(0, ball.step).filter(d => d === 1).length;
                            const lefts = ball.step - rights;
                            const offsetUnits = rights - lefts;

                            return (
                                <motion.div
                                    key={ball.id}
                                    initial={{ y: -20, opacity: 1 }}
                                    animate={{
                                        y: ball.step * 40,
                                        x: offsetUnits * 20,
                                        opacity: 1
                                    }}
                                    exit={{ opacity: 0, scale: 0 }}
                                    transition={{ type: "spring", stiffness: 300, damping: 20 }}
                                    className="absolute top-0 left-1/2 w-4 h-4 md:w-5 md:h-5 bg-cyan-400 rounded-full shadow-[0_0_10px_cyan] z-50 -ml-2.5"
                                />
                            );
                        })}
                    </AnimatePresence>

                    {/* Floating Win Texts */}
                    <AnimatePresence>
                        {floatingTexts.map(txt => (
                            <motion.div
                                key={txt.id}
                                initial={{ y: txt.y, opacity: 0, scale: 0.5, x: txt.x }}
                                animate={{ y: txt.y - 120, opacity: 1, scale: 1.2 }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 0.8, ease: "easeOut" }}
                                className={cn("absolute left-1/2 font-black text-xl drop-shadow-md z-[100] pointer-events-none whitespace-nowrap", txt.color)}
                                style={{ marginLeft: '-30px' }}
                            >
                                {txt.text}
                            </motion.div>
                        ))}
                    </AnimatePresence>

                    {/* ROUND WIN POPUP */}
                    <AnimatePresence>
                        {roundWinPopup && (
                            <motion.div
                                initial={{ scale: 0, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0, opacity: 0 }}
                                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[200] bg-black/80 backdrop-blur-md border border-yellow-400/50 px-8 py-4 rounded-3xl flex flex-col items-center justify-center shadow-[0_0_50px_rgba(250,204,21,0.4)] pointer-events-none"
                            >
                                <div className="text-yellow-400 text-sm font-bold uppercase tracking-widest mb-1">Ganancia Total</div>
                                <div className="text-4xl font-black text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.5)]">
                                    {formatCurrency(roundWinPopup.amount)}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                </div>
            </div>

        </div>
    );
}
