import { useState, useEffect } from 'react';
import { motion, useAnimation, AnimatePresence } from 'framer-motion';
import { useGameStore } from '../../stores/gameStore';
import { toast } from 'sonner';
import { cn, formatCurrency } from '../../lib/utils';
import { Trash2, RotateCcw, Clock, Smartphone } from 'lucide-react';
import { playSound, setMuted } from '../../lib/soundManager';

export function Roulette() {
    const { coins, removeCoins, addCoins, soundEnabled } = useGameStore();

    // Sync mute
    useEffect(() => {
        setMuted(!soundEnabled);
    }, [soundEnabled]);

    const [spinning, setSpinning] = useState(false);
    const [history, setHistory] = useState<number[]>([]); // New History State

    // Betting System
    const [chipValue, setChipValue] = useState(100);
    // Bets: Key = BetID (e.g. "n-17", "red", "doz-1"), Value = Total Amount
    const [bets, setBets] = useState<Record<string, number>>({});
    const [previousBets, setPreviousBets] = useState<Record<string, number> | null>(null); // Last Bet State
    const [lastWin, setLastWin] = useState<{ number: number, amount: number } | null>(null);

    const controls = useAnimation();

    // Standard European Roulette Order (Clockwise)
    const WHEEL_NUMBERS = [0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26];
    const RED_NUMBERS = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36];

    const totalBet = Object.values(bets).reduce((a, b) => a + b, 0);

    const placeBet = (betId: string) => {
        if (spinning) return;
        if (coins < totalBet + chipValue) {
            toast.error('Sin fondos suficientes');
            return;
        }
        playSound.click();
        setBets(prev => ({
            ...prev,
            [betId]: (prev[betId] || 0) + chipValue
        }));
    };

    const clearBets = () => {
        playSound.click();
        setBets({});
    };

    const repeatBets = () => {
        if (!previousBets) return;
        const prevTotal = Object.values(previousBets).reduce((a, b) => a + b, 0);
        if (coins < prevTotal) {
            toast.error('Sin fondos para repetir apuesta');
            return;
        }
        playSound.click();
        setBets(previousBets);
    };

    const doubleBets = () => {
        if (Object.keys(bets).length === 0) return;
        if (coins < totalBet * 2) {
            toast.error('Sin fondos para doblar');
            return;
        }
        playSound.click();
        setBets(prev => {
            const newBets: any = {};
            Object.entries(prev).forEach(([k, v]) => newBets[k] = v * 2);
            return newBets;
        });
    };

    const spinRoulette = async () => {
        if (totalBet === 0) {
            toast.error('Haz una apuesta primero');
            return;
        }
        if (coins < totalBet) {
            toast.error('Sin fondos suficientes');
            return;
        }

        setSpinning(true);
        setLastWin(null);
        setPreviousBets(bets); // Save bets for repeat
        removeCoins(totalBet);
        playSound.spin(); // Start spin sound

        // Determine outcome
        const randomIndex = Math.floor(Math.random() * WHEEL_NUMBERS.length);
        const winningNumber = WHEEL_NUMBERS[randomIndex];

        // Animation calculations
        const sliceAngle = 360 / 37;
        const rotation = 1800 + (360 - (randomIndex * sliceAngle)); // 5 spins + alignment

        await controls.start({
            rotate: rotation,
            transition: { duration: 4, ease: [0.2, 0.8, 0.2, 1] }
        });

        // Reset rotation visually without animation for next spin
        controls.set({ rotate: rotation % 360 });

        setTimeout(() => {
            setSpinning(false);
            checkWin(winningNumber);
        }, 500);
    };

    const checkWin = (outcome: number) => {
        // Update History
        setHistory(prev => [outcome, ...prev].slice(0, 10));

        let totalWin = 0;
        const isRed = RED_NUMBERS.includes(outcome);
        const isBlack = !isRed && outcome !== 0;
        const isEven = outcome !== 0 && outcome % 2 === 0;
        const isOdd = outcome !== 0 && outcome % 2 !== 0;
        const isLow = outcome >= 1 && outcome <= 18;
        const isHigh = outcome >= 19 && outcome <= 36;

        // Helper to check dozen/column
        const getDozen = (n: number) => n === 0 ? 0 : Math.ceil(n / 12);
        const getColumn = (n: number) => n === 0 ? 0 : (n % 3 === 0 ? 3 : n % 3);

        const wonBets: string[] = [];

        Object.entries(bets).forEach(([betId, amount]) => {
            let winMultiplier = 0;

            // Straight Bet (e.g. "n-17")
            if (betId === `n-${outcome}`) winMultiplier = 36;

            // Red/Black
            else if (betId === 'red' && isRed) winMultiplier = 2;
            else if (betId === 'black' && isBlack) winMultiplier = 2;

            // Even/Odd
            else if (betId === 'even' && isEven) winMultiplier = 2;
            else if (betId === 'odd' && isOdd) winMultiplier = 2;

            // High/Low
            else if (betId === 'low' && isLow) winMultiplier = 2;
            else if (betId === 'high' && isHigh) winMultiplier = 2;

            // Dozens (e.g. "doz-1")
            else if (betId === `doz-${getDozen(outcome)}`) winMultiplier = 3;

            // Columns (e.g. "col-1")
            else if (betId === `col-${getColumn(outcome)}`) winMultiplier = 3;

            if (winMultiplier > 0) {
                totalWin += amount * winMultiplier;
                wonBets.push(betId);
            }
        });

        if (totalWin > 0) {
            addCoins(totalWin);
            setLastWin({ number: outcome, amount: totalWin });
            playSound.win();
            toast.success(`¡Ganaste ${formatCurrency(totalWin)}!`, {
                description: `Salió ${outcome} (${isRed ? 'Rojo' : outcome === 0 ? 'Verde' : 'Negro'})`,
            });
        } else {
            playSound.loss();
            toast.info(`Salió ${outcome}. Suerte la próxima.`);
        }

        // Clear bets after spin (Standard convention? Or leave them? Convention is clear)
        setBets({});
    };

    // Use local helper for chip display
    const formatChip = (amount: number) => amount >= 1000000 ? (amount / 1000000).toFixed(0) + 'M' : amount >= 1000 ? (amount / 1000).toFixed(0) + 'k' : amount;

    // Mobile Portrait Check
    const [isPortrait, setIsPortrait] = useState(false);
    useEffect(() => {
        const checkOrientation = () => {
            setIsPortrait(window.innerWidth < 768 && window.innerHeight > window.innerWidth);
        };
        checkOrientation();
        window.addEventListener('resize', checkOrientation);
        return () => window.removeEventListener('resize', checkOrientation);
    }, []);

    if (isPortrait) {
        return (
            <div className="w-full h-[60vh] flex flex-col items-center justify-center text-center p-8 bg-black/80 rounded-3xl border border-white/10 backdrop-blur-xl">
                <Smartphone className="w-16 h-16 text-cyber-DEFAULT animate-pulse mb-6 rotate-90" />
                <h3 className="text-2xl font-bold text-white mb-2">Gira tu móvil</h3>
                <p className="text-gray-400">Para una mejor experiencia, por favor juega en modo horizontal.</p>
            </div>
        );
    }

    return (
        <div className="w-full flex flex-col items-center max-w-6xl mx-auto px-2 pb-4 md:pb-20">

            {/* Removed Portrait Lock Overlay - Making it responsive instead */}
            {/* History Bar */}
            {history.length > 0 && (
                <div className="flex gap-2 mb-6 p-2 bg-black/40 rounded-full border border-white/10 overflow-x-auto max-w-full scrollbar-hide">
                    <div className="flex items-center gap-2 px-2 text-xs text-gray-400 font-bold uppercase tracking-wider">
                        <Clock size={14} /> Historial
                    </div>
                    {history.map((num, i) => (
                        <div key={i} className={cn(
                            "w-8 h-8 flex-shrink-0 rounded-full flex items-center justify-center text-xs font-bold border border-white/10 shadow-lg",
                            num === 0 ? "bg-green-600 text-white" : RED_NUMBERS.includes(num) ? "bg-red-600 text-white" : "bg-black text-white"
                        )}>
                            {num}
                        </div>
                    ))}
                </div>
            )}

            {/* --- WHEEL SECTION --- */}
            <div className="relative w-80 h-80 md:w-96 md:h-96 mb-8 flex items-center justify-center scale-75 md:scale-100">
                <div className="absolute top-0 z-20 text-yellow-500 text-5xl drop-shadow-[0_4px_4px_rgba(0,0,0,0.8)] filter drop-shadow">▼</div>
                <motion.div
                    animate={controls}
                    className="w-full h-full rounded-full border-[12px] border-[#2c1a0e] bg-black relative shadow-2xl overflow-hidden box-content"
                >
                    <div className="absolute inset-0 rounded-full border-4 border-[#d4af37] opacity-20 pointer-events-none z-10"></div>
                    {WHEEL_NUMBERS.map((num, i) => {
                        const angle = (360 / 37) * i;
                        const isRed = RED_NUMBERS.includes(num);
                        const isZero = num === 0;
                        return (
                            <div
                                key={num}
                                className="absolute top-0 left-1/2 w-8 h-[50%] origin-bottom -ml-4 pt-2 text-center text-sm font-bold"
                                style={{ transform: `rotate(${angle}deg)` }}
                            >
                                <span className={cn(
                                    "inline-block w-7 h-8 leading-8 text-white font-mono",
                                    isZero ? "text-green-500" : isRed ? "text-red-500" : "text-gray-300"
                                )}>
                                    {num}
                                </span>
                            </div>
                        )
                    })}
                    {/* Inner Decoration */}
                    <div className="absolute top-1/2 left-1/2 w-48 h-48 -ml-24 -mt-24 rounded-full border border-white/10 z-0"></div>

                    {/* Center Hub */}
                    <div className="absolute top-1/2 left-1/2 w-20 h-20 -ml-10 -mt-10 bg-gradient-to-br from-amber-600 to-amber-900 rounded-full border-4 border-amber-400 shadow-[inset_0_2px_4px_rgba(255,255,255,0.3)] z-10 flex items-center justify-center">
                        <div className="w-12 h-12 bg-[#2c1a0e] rounded-full flex items-center justify-center">
                            <span className="text-amber-500 font-bold text-xs">CASINO</span>
                        </div>
                    </div>
                </motion.div>
            </div>

            {/* --- WINNING DISPLAY --- */}
            <AnimatePresence>
                {lastWin && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                        className="mb-8 bg-green-500/90 text-black px-8 py-3 rounded-full font-black text-2xl shadow-[0_0_30px_rgba(34,197,94,0.6)] backdrop-blur border border-white/30"
                    >
                        GANASTE {formatCurrency(lastWin.amount)}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* --- BETTING CONTROLS --- */}
            <div className="flex flex-wrap justify-center gap-4 mb-4 items-center">
                <div className="flex bg-black/50 p-1 rounded-xl border border-white/10 overflow-x-auto max-w-full scrollbar-hide">
                    {[1000, 10000, 50000, 100000, 500000, 1000000].map(val => (
                        <button
                            key={val}
                            onClick={() => { playSound.click(); setChipValue(val); }}
                            className={cn(
                                "w-10 h-10 md:w-12 md:h-12 flex-shrink-0 rounded-lg font-bold text-[10px] md:text-sm transition-all relative overflow-hidden",
                                chipValue === val ? "bg-yellow-400 text-black scale-110 shadow-lg z-10 ring-2 ring-white" : "text-gray-400 hover:text-white hover:bg-white/10"
                            )}
                        >
                            {formatChip(val)}
                        </button>
                    ))}
                </div>

                <div className="flex gap-2">
                    <button onClick={repeatBets} disabled={!previousBets} className="w-12 h-12 rounded-full bg-purple-900/50 border border-purple-500/50 flex items-center justify-center hover:bg-purple-900 text-purple-200 disabled:opacity-30 disabled:cursor-not-allowed" title="Repetir Apuesta">
                        <RotateCcw size={18} />
                    </button>
                    <button onClick={clearBets} className="w-12 h-12 rounded-full bg-red-900/50 border border-red-500/50 flex items-center justify-center hover:bg-red-900 text-red-200" title="Borrar Apuestas">
                        <Trash2 size={18} />
                    </button>
                    <button onClick={doubleBets} className="w-12 h-12 rounded-full bg-blue-900/50 border border-blue-500/50 flex items-center justify-center hover:bg-blue-900 text-blue-200" title="Doblar Apuestas">
                        <span className="font-bold">x2</span>
                    </button>
                </div>

                <div className="bg-black/60 px-4 py-2 rounded-lg border border-white/10 font-mono text-yellow-400 min-w-[120px] text-center">
                    APUESTA: <span className="text-white">{formatCurrency(totalBet)}</span>
                </div>
            </div>

            {/* --- BOARD (Responsive Fit) --- */}
            <div className="w-full h-full flex items-center justify-center overflow-hidden py-2 md:py-8">
                <div className="origin-center scale-[0.55] sm:scale-[0.65] md:scale-100 min-w-[750px] md:min-w-[800px] max-w-5xl bg-green-800 p-2 md:p-8 rounded-xl border-[8px] md:border-[12px] border-[#3e2723] shadow-2xl relative select-none">

                    {/* Unified Grid Container */}
                    {/* Cols: Zero(1) + 12 Numbers + 2to1(1) = 14 cols */}
                    {/* Rows: 3 Num Rows + Dozen Row + Outside Row = 5 Rows */}
                    <div className="grid grid-cols-[40px_repeat(12,1fr)_30px] md:grid-cols-[50px_repeat(12,1fr)_40px] grid-rows-[repeat(3,40px)_30px_30px] md:grid-rows-[repeat(3,60px)_50px_50px] gap-1 auto-cols-fr">

                        {/* --- ZERO (Spans 3 Rows, Col 1) --- */}
                        <div
                            onClick={() => placeBet('n-0')}
                            className="row-span-3 col-start-1 flex items-center justify-center bg-green-600 border-2 border-white/30 text-white font-bold cursor-pointer hover:bg-green-500 relative rounded-l-full text-lg md:text-2xl"
                        >
                            <span className="-rotate-90">0</span>
                            {bets['n-0'] && <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6 md:w-8 md:h-8 bg-yellow-400 rounded-full border border-black flex items-center justify-center text-[8px] text-black font-bold z-10">{formatChip(bets['n-0'])}</div>}
                        </div>

                        {/* --- NUMBERS (Rows 1-3, Cols 2-13) --- */}
                        {[...Array(12)].map((_, i) => {
                            const n3 = (i + 1) * 3;
                            const n2 = n3 - 1;
                            const n1 = n3 - 2;
                            const col = i + 2;

                            return (
                                <>
                                    {/* Top Row (3, 6...) */}
                                    <div
                                        onClick={() => placeBet(`n-${n3}`)}
                                        className={cn(
                                            "row-start-1 h-full flex items-center justify-center border border-white/20 text-white font-bold text-lg md:text-xl cursor-pointer hover:opacity-80 relative",
                                            RED_NUMBERS.includes(n3) ? "bg-red-600" : "bg-black"
                                        )}
                                        style={{ gridColumn: col }}
                                    >
                                        {n3}
                                        {bets[`n-${n3}`] && <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6 md:w-8 md:h-8 bg-yellow-400 rounded-full border border-black flex items-center justify-center text-[8px] text-black font-bold z-10">{formatChip(bets[`n-${n3}`])}</div>}
                                    </div>

                                    {/* Mid Row (2, 5...) */}
                                    <div
                                        onClick={() => placeBet(`n-${n2}`)}
                                        className={cn(
                                            "row-start-2 h-full flex items-center justify-center border border-white/20 text-white font-bold text-lg md:text-xl cursor-pointer hover:opacity-80 relative",
                                            RED_NUMBERS.includes(n2) ? "bg-red-600" : "bg-black"
                                        )}
                                        style={{ gridColumn: col }}
                                    >
                                        {n2}
                                        {bets[`n-${n2}`] && <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6 md:w-8 md:h-8 bg-yellow-400 rounded-full border border-black flex items-center justify-center text-[8px] text-black font-bold z-10">{formatChip(bets[`n-${n2}`])}</div>}
                                    </div>

                                    {/* Bot Row (1, 4...) */}
                                    <div
                                        onClick={() => placeBet(`n-${n1}`)}
                                        className={cn(
                                            "row-start-3 h-full flex items-center justify-center border border-white/20 text-white font-bold text-lg md:text-xl cursor-pointer hover:opacity-80 relative",
                                            RED_NUMBERS.includes(n1) ? "bg-red-600" : "bg-black"
                                        )}
                                        style={{ gridColumn: col }}
                                    >
                                        {n1}
                                        {bets[`n-${n1}`] && <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6 md:w-8 md:h-8 bg-yellow-400 rounded-full border border-black flex items-center justify-center text-[8px] text-black font-bold z-10">{formatChip(bets[`n-${n1}`])}</div>}
                                    </div>
                                </>
                            )
                        })}

                        {/* --- 2:1 COLUMNS (Spans 1 Row each, Last Col) --- */}
                        <div onClick={() => placeBet('col-3')} className="row-start-1 col-start-14 flex items-center justify-center border-2 border-white/30 text-white font-bold text-[10px] md:text-xs cursor-pointer hover:bg-white/10 relative">
                            2:1
                            {bets['col-3'] && <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6 md:w-8 md:h-8 bg-yellow-400 rounded-full border border-black flex items-center justify-center text-[8px] text-black font-bold z-10">{formatChip(bets['col-3'])}</div>}
                        </div>
                        <div onClick={() => placeBet('col-2')} className="row-start-2 col-start-14 flex items-center justify-center border-2 border-white/30 text-white font-bold text-[10px] md:text-xs cursor-pointer hover:bg-white/10 relative">
                            2:1
                            {bets['col-2'] && <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6 md:w-8 md:h-8 bg-yellow-400 rounded-full border border-black flex items-center justify-center text-[8px] text-black font-bold z-10">{formatChip(bets['col-2'])}</div>}
                        </div>
                        <div onClick={() => placeBet('col-1')} className="row-start-3 col-start-14 flex items-center justify-center border-2 border-white/30 text-white font-bold text-[10px] md:text-xs cursor-pointer hover:bg-white/10 relative">
                            2:1
                            {bets['col-1'] && <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6 md:w-8 md:h-8 bg-yellow-400 rounded-full border border-black flex items-center justify-center text-[8px] text-black font-bold z-10">{formatChip(bets['col-1'])}</div>}
                        </div>

                        {/* --- DOZENS (Row 4) --- */}
                        <div onClick={() => placeBet('doz-1')} className="row-start-4 col-start-2 col-span-4 flex items-center justify-center border-2 border-white/30 text-white font-bold text-sm md:text-lg cursor-pointer hover:bg-white/10 relative mt-2">
                            1st 12
                            {bets['doz-1'] && <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6 md:w-8 md:h-8 bg-yellow-400 rounded-full border border-black flex items-center justify-center text-[8px] text-black font-bold z-10">{formatChip(bets['doz-1'])}</div>}
                        </div>
                        <div onClick={() => placeBet('doz-2')} className="row-start-4 col-start-6 col-span-4 flex items-center justify-center border-2 border-white/30 text-white font-bold text-sm md:text-lg cursor-pointer hover:bg-white/10 relative mt-2">
                            2nd 12
                            {bets['doz-2'] && <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6 md:w-8 md:h-8 bg-yellow-400 rounded-full border border-black flex items-center justify-center text-[8px] text-black font-bold z-10">{formatChip(bets['doz-2'])}</div>}
                        </div>
                        <div onClick={() => placeBet('doz-3')} className="row-start-4 col-start-10 col-span-4 flex items-center justify-center border-2 border-white/30 text-white font-bold text-sm md:text-lg cursor-pointer hover:bg-white/10 relative mt-2">
                            3rd 12
                            {bets['doz-3'] && <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6 md:w-8 md:h-8 bg-yellow-400 rounded-full border border-black flex items-center justify-center text-[8px] text-black font-bold z-10">{formatChip(bets['doz-3'])}</div>}
                        </div>

                        {/* --- OUTSIDE BETS (Row 5) --- */}
                        <div onClick={() => placeBet('low')} className="row-start-5 col-start-2 col-span-2 flex items-center justify-center border-2 border-white/30 text-white font-bold cursor-pointer hover:bg-white/10 relative mt-1 text-[10px] md:text-base">
                            1-18
                            {bets['low'] && <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6 md:w-8 md:h-8 bg-yellow-400 rounded-full border border-black flex items-center justify-center text-[8px] text-black font-bold z-10">{formatChip(bets['low'])}</div>}
                        </div>
                        <div onClick={() => placeBet('even')} className="row-start-5 col-start-4 col-span-2 flex items-center justify-center border-2 border-white/30 text-white font-bold cursor-pointer hover:bg-white/10 relative mt-1 text-[10px] md:text-base">
                            EVEN
                            {bets['even'] && <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6 md:w-8 md:h-8 bg-yellow-400 rounded-full border border-black flex items-center justify-center text-[8px] text-black font-bold z-10">{formatChip(bets['even'])}</div>}
                        </div>
                        <div onClick={() => placeBet('red')} className="row-start-5 col-start-6 col-span-2 flex items-center justify-center bg-red-600/50 border-2 border-white/30 text-white font-bold cursor-pointer hover:bg-red-600 relative mt-1 text-[10px] md:text-base">
                            RED
                            {bets['red'] && <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6 md:w-8 md:h-8 bg-yellow-400 rounded-full border border-black flex items-center justify-center text-[8px] text-black font-bold z-10">{formatChip(bets['red'])}</div>}
                        </div>
                        <div onClick={() => placeBet('black')} className="row-start-5 col-start-8 col-span-2 flex items-center justify-center bg-black/50 border-2 border-white/30 text-white font-bold cursor-pointer hover:bg-black relative mt-1 text-[10px] md:text-base">
                            BLACK
                            {bets['black'] && <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6 md:w-8 md:h-8 bg-yellow-400 rounded-full border border-black flex items-center justify-center text-[8px] text-black font-bold z-10">{formatChip(bets['black'])}</div>}
                        </div>
                        <div onClick={() => placeBet('odd')} className="row-start-5 col-start-10 col-span-2 flex items-center justify-center border-2 border-white/30 text-white font-bold cursor-pointer hover:bg-white/10 relative mt-1 text-[10px] md:text-base">
                            ODD
                            {bets['odd'] && <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6 md:w-8 md:h-8 bg-yellow-400 rounded-full border border-black flex items-center justify-center text-[8px] text-black font-bold z-10">{formatChip(bets['odd'])}</div>}
                        </div>
                        <div onClick={() => placeBet('high')} className="row-start-5 col-start-12 col-span-2 flex items-center justify-center border-2 border-white/30 text-white font-bold cursor-pointer hover:bg-white/10 relative mt-1 text-[10px] md:text-base">
                            19-36
                            {bets['high'] && <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6 md:w-8 md:h-8 bg-yellow-400 rounded-full border border-black flex items-center justify-center text-[8px] text-black font-bold z-10">{formatChip(bets['high'])}</div>}
                        </div>

                    </div>
                </div>
            </div>

            <button
                onClick={spinRoulette}
                disabled={spinning}
                className="mt-8 bg-green-500 text-black font-black px-16 py-4 rounded-full hover:bg-green-400 disabled:opacity-50 hover:scale-105 transition-all shadow-[0_0_40px_rgba(34,197,94,0.5)] text-2xl tracking-widest uppercase"
            >
                {spinning ? 'Girando...' : 'GIRAR'}
            </button>
        </div>
    );
}
