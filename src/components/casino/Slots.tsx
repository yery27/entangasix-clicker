import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, useAnimation, AnimatePresence } from 'framer-motion';
import { useGameStore } from '../../stores/gameStore';
import { toast } from 'sonner';
import { cn, formatCurrency } from '../../lib/utils';
// import { Zap } from 'lucide-react'; // Removing potentially problematic imports for now
import { RefreshCw } from 'lucide-react';
import { playSound, setMuted } from '../../lib/soundManager';

const SYMBOLS = ['🍒', '🍋', '🍇', '💎', '7️⃣', '🔔'];
const SYMBOL_VALUES: Record<string, number> = {
    '🍒': 2,
    '🍋': 3,
    '🍇': 5,
    '🔔': 10,
    '💎': 20,
    '7️⃣': 50
};

const Reel = ({ spinning, stopSymbol, index, onStop }: { spinning: boolean, stopSymbol: string | null, index: number, onStop: () => void }) => {
    const controls = useAnimation();

    useEffect(() => {
        if (spinning) {
            controls.start({
                y: [0, -1000],
                transition: {
                    duration: 0.2 + (index * 0.05),
                    ease: "linear",
                    repeat: Infinity
                }
            });
        } else if (stopSymbol) {
            controls.stop();
            controls.start({
                y: 0,
                transition: { type: "spring", stiffness: 300, damping: 20 }
            }).then(onStop);
        }
    }, [spinning, stopSymbol, controls, onStop, index]); // Added missing deps

    return (
        <div className="relative w-24 h-32 md:w-32 md:h-40 bg-black overflow-hidden border-x-2 border-purple-900 shadow-inner">
            <div className="absolute inset-0 z-10 bg-gradient-to-b from-black/80 via-transparent to-black/80 pointer-events-none"></div>

            <motion.div
                animate={controls}
                className="flex flex-col items-center gap-8 py-4"
            >
                {!spinning && stopSymbol ? (
                    <div className="text-6xl md:text-7xl filter drop-shadow-[0_0_10px_rgba(255,255,255,0.5)] h-full flex items-center justify-center pt-8">
                        {stopSymbol}
                    </div>
                ) : (
                    Array.from({ length: 10 }).map((_, i) => (
                        <div key={i} className="text-6xl md:text-7xl opacity-50 blur-[2px]">
                            {SYMBOLS[i % SYMBOLS.length]}
                        </div>
                    ))
                )}
            </motion.div>
        </div>
    );
};

export function Slots() {
    const { removeCoins, addCoins, soundEnabled } = useGameStore();

    // Sync mute
    useEffect(() => {
        setMuted(!soundEnabled);
    }, [soundEnabled]);
    const [spinning, setSpinning] = useState(false);
    const [result, setResult] = useState<[string, string, string] | null>(null);
    const [bet, setBet] = useState(50);
    const [winData, setWinData] = useState<{ amount: number, text: string } | null>(null);
    const [autoSpin, setAutoSpin] = useState(false);
    const stopsRef = useRef(0);
    const autoSpinTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const spin = useCallback(() => {
        const currentCoins = useGameStore.getState().coins;
        if (currentCoins < bet) {
            toast.error("Sin monedas suficientes!");
            setAutoSpin(false);
            return;
        }

        setSpinning(true);
        setResult(null);
        setWinData(null);
        stopsRef.current = 0;
        removeCoins(bet);
        playSound.spin();

        const r1 = SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
        const r2 = SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
        const r3 = SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];

        setTimeout(() => {
            setResult([r1, r2, r3]);
        }, 2000);
    }, [bet, removeCoins]);

    const handleReelStop = () => {
        stopsRef.current += 1;
        playSound.click(); // Stop click
        if (stopsRef.current === 3 && result) {
            setSpinning(false);
            checkWin(result);
        }
    };

    const checkWin = (res: [string, string, string]) => {
        const [s1, s2, s3] = res;
        let win = 0;
        let text = '';

        if (s1 === s2 && s2 === s3) {
            const val = SYMBOL_VALUES[s1];
            win = bet * val * 2;
            text = `¡JACKPOT! 3x ${s1}`;
            playSound.jackpot();
        }
        else if (s1 === s2 || s2 === s3 || s1 === s3) {
            const match = s1 === s2 ? s1 : s3;
            const val = SYMBOL_VALUES[match];
            win = Math.floor(bet * val * 0.5);
            text = `¡PAR! 2x ${match}`;
            playSound.win();
        } else {
            playSound.loss();
        }

        if (win > 0) {
            addCoins(win);
            setWinData({ amount: win, text });
            toast.success('GANASTE!');
        }
    };

    // Auto Spin Effect
    useEffect(() => {
        if (autoSpin && !spinning && result) {
            // Wait a bit after spin finishes before spinning again
            autoSpinTimeoutRef.current = setTimeout(() => {
                spin();
            }, 1500);
        }
        return () => {
            if (autoSpinTimeoutRef.current) clearTimeout(autoSpinTimeoutRef.current);
        };
    }, [autoSpin, spinning, result, spin]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (autoSpinTimeoutRef.current) clearTimeout(autoSpinTimeoutRef.current);
        };
    }, []);

    const toggleAutoSpin = () => {
        if (!autoSpin) {
            setAutoSpin(true);
            playSound.click();
            if (!spinning) spin();
        } else {
            playSound.click();
            setAutoSpin(false);
        }
    };

    return (
        <div className="flex flex-col items-center w-full max-w-4xl mx-auto">
            <h1 className="text-4xl font-black text-purple-400 neon-text mb-8 tracking-tighter flex items-center gap-2">
                CYBER SLOTS
            </h1>

            <div className="bg-gradient-to-br from-purple-900 to-black p-8 rounded-[40px] border-4 border-purple-500 shadow-[0_0_50px_rgba(168,85,247,0.4)] relative">
                <div className="flex justify-center gap-2 md:gap-4 bg-black p-4 rounded-3xl border border-white/10 mb-8 shadow-inner overflow-hidden relative">
                    <div className="absolute top-1/2 left-0 right-0 h-1 bg-red-500/50 z-20 pointer-events-none shadow-[0_0_10px_red]"></div>

                    {[0, 1, 2].map(i => (
                        <Reel
                            key={i}
                            index={i}
                            spinning={spinning && !result}
                            stopSymbol={result ? result[i] : (spinning ? null : '?')}
                            onStop={handleReelStop}
                        />
                    ))}
                </div>

                <AnimatePresence>
                    {winData && (
                        <motion.div
                            initial={{ scale: 0, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-30 pointer-events-none"
                        >
                            <div className="bg-yellow-400 text-black px-6 py-4 rounded-xl font-black text-center shadow-[0_0_40px_rgba(250,204,21,0.8)] border-4 border-white rotate-[-5deg]">
                                <div className="text-xl uppercase">{winData.text}</div>
                                <div className="text-4xl">{formatCurrency(winData.amount)}</div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                <div className="flex flex-col md:flex-row items-center justify-between gap-6 bg-black/40 p-4 rounded-2xl border border-white/5">
                    <div className="flex items-center gap-4">
                        <span className="text-purple-300 font-bold uppercase text-xs tracking-widest">Apuesta</span>
                        <div className="flex gap-1 flex-wrap justify-center">
                            {[1000, 10000, 50000, 100000, 500000, 1000000, 5000000].map(val => (
                                <button
                                    key={val}
                                    onClick={() => { playSound.click(); setBet(val); }}
                                    disabled={spinning || autoSpin}
                                    className={cn(
                                        "w-12 h-10 rounded font-bold transition-all border border-transparent text-xs",
                                        bet === val ? "bg-purple-500 text-white shadow shadow-purple-500" : "bg-white/10 text-gray-400 hover:bg-white/20"
                                    )}
                                >
                                    {val >= 1000000 ? (val / 1000000) + 'M' : val >= 1000 ? (val / 1000) + 'k' : val}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="flex gap-3">
                        <button
                            onClick={toggleAutoSpin}
                            className={cn(
                                "p-4 rounded-full font-black text-white shadow-lg transition-all hover:scale-105 active:scale-95 flex items-center gap-2",
                                autoSpin ? "bg-red-500 hover:bg-red-600 shadow-[0_0_20px_rgba(239,68,68,0.4)]" : "bg-blue-600 hover:bg-blue-700 shadow-[0_0_20px_rgba(37,99,235,0.4)]"
                            )}
                            title="Tirada Automática"
                        >
                            <RefreshCw className={cn("w-6 h-6", autoSpin && "animate-spin")} />
                            {autoSpin ? 'STOP' : 'AUTO'}
                        </button>

                        <button
                            onClick={spin}
                            disabled={spinning || autoSpin}
                            className="px-10 py-4 bg-gradient-to-b from-yellow-400 to-yellow-600 rounded-full font-black text-black shadow-[0_0_30px_rgba(234,179,8,0.4)] transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:grayscale"
                        >
                            {spinning ? 'GIRANDO...' : 'GIRAR'}
                        </button>
                    </div>
                </div>
            </div>

            <div className="mt-8 grid grid-cols-2 md:grid-cols-6 gap-4 text-center opacity-50 text-xs">
                {Object.entries(SYMBOL_VALUES).map(([sym, val]) => (
                    <div key={sym} className="bg-white/5 p-2 rounded border border-white/10">
                        <div className="text-2xl mb-1">{sym}</div>
                        <div className="text-purple-300 font-mono">x{val}</div>
                    </div>
                ))}
            </div>
        </div>
    );
}
