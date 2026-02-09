import { useState, useEffect, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { useGameStore } from '../../stores/gameStore';
import { toast } from 'sonner';
import { cn, formatCurrency } from '../../lib/utils';
import { RefreshCw, Zap, Flame } from 'lucide-react';
import { playSound } from '../../lib/soundManager';

// --- GAME CONFIGURATION ---
const GRID_ROWS = 5;
const GRID_COLS = 6;
const MIN_MATCH = 8; // Scatter pays: 8+ anywhere
const SCATTER_TRIGGER = 4; // 4 Scatters for Free params

// Animation Timings (ms)
const EXPLOSION_DURATION = 0.5;
const DELAY_BETWEEN_CASCADES = 800;

// --- SYMBOLS & PAYTABLE ---
// Base payout is multiplier of BET. Logic: (8-9), (10-11), (12-30)
// Example: { id: 'gem_red', payout: [0.5, 1.5, 10] }
// NOTE: Gates uses absolute values usually, here we multiplier by bet.

type SymbolType = {
    id: string;
    icon: string;
    color: string;
    isHighPay: boolean;
    payouts: [number, number, number]; // [8-9, 10-11, 12+]
};

const SYMBOLS: Record<string, SymbolType> = {
    'gem_blue': { id: 'gem_blue', icon: '🔷', color: 'text-blue-400', isHighPay: false, payouts: [0.25, 0.75, 2] },
    'gem_green': { id: 'gem_green', icon: '🟢', color: 'text-green-400', isHighPay: false, payouts: [0.4, 0.9, 4] },
    'gem_yellow': { id: 'gem_yellow', icon: '🔶', color: 'text-yellow-400', isHighPay: false, payouts: [0.5, 1, 5] },
    'gem_purple': { id: 'gem_purple', icon: '🟣', color: 'text-purple-400', isHighPay: false, payouts: [0.8, 1.2, 8] },
    'gem_red': { id: 'gem_red', icon: '❤️', color: 'text-red-500', isHighPay: false, payouts: [1, 1.5, 10] },

    'chalice': { id: 'chalice', icon: '🏆', color: 'text-yellow-200', isHighPay: true, payouts: [1.5, 2, 12] },
    'ring': { id: 'ring', icon: '💍', color: 'text-blue-200', isHighPay: true, payouts: [2, 5, 15] },
    'hourglass': { id: 'hourglass', icon: '⏳', color: 'text-purple-200', isHighPay: true, payouts: [2.5, 10, 25] },
    'crown': { id: 'crown', icon: '👑', color: 'text-yellow-500', isHighPay: true, payouts: [10, 25, 50] },
};

const SYMBOL_KEYS = Object.keys(SYMBOLS);

// Special Symbols
const SCATTER = { id: 'scatter', icon: '👺', color: 'text-pink-500' }; // "Dios del Click"
const MULTIPLIER_ORBS = [
    { value: 2, color: 'bg-green-500' },
    { value: 5, color: 'bg-blue-500' },
    { value: 10, color: 'bg-purple-500' },
    { value: 25, color: 'bg-red-500' },
    { value: 50, color: 'bg-pink-500 shadow-glow' },
    { value: 100, color: 'bg-yellow-400 shadow-glow' },
    { value: 500, color: 'bg-white shadow-[0_0_30px_white]' },
];

interface GridCell {
    id: string; // unique ID for framer motion animation keys
    symbol: string; // Key in SYMBOLS or 'scatter' or 'mult_X'
    multValue?: number; // If symbol is a multiplier
}

export function GatesOfClicker() {
    const { coins, removeCoins, addCoins, recordGameResult } = useGameStore();

    // --- STATE ---
    const [grid, setGrid] = useState<GridCell[][]>([]); // [col][row] - easier for dropping
    const [gameState, setGameState] = useState<'IDLE' | 'SPINNING' | 'CASCADING' | 'WIN_SHOW'>('IDLE');

    // Betting
    const [bet, setBet] = useState(100);
    const [anteBet, setAnteBet] = useState(false);

    // Round Stats
    const [roundWin, setRoundWin] = useState(0);
    const [totalMult, setTotalMult] = useState(0); // Acumulado de la ronda actual
    const [currentWinText, setCurrentWinText] = useState<string | null>(null);

    // Free Spins
    const [freeSpins, setFreeSpins] = useState(0);
    const [isFreeSpinMode, setIsFreeSpinMode] = useState(false);
    const [totalFreeSpinWin, setTotalFreeSpinWin] = useState(0);
    const [globalFreeSpinMult, setGlobalFreeSpinMult] = useState(0); // Multiplicador GLOBAL acumulado (Persistente en Free Spins)

    // Refs for game loop
    const isProcessingRef = useRef(false);
    const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            timeoutsRef.current.forEach(t => clearTimeout(t));
        };
    }, []);

    const safeSetTimeout = (fn: () => void, ms: number) => {
        const id = setTimeout(() => {
            fn();
            // Remove from ref if needed, but simple clear on unmount is usually enough for this scale
        }, ms);
        timeoutsRef.current.push(id);
    };

    // --- HELPERS ---

    const getRandomSymbol = (isAnte: boolean): GridCell => {
        const rand = Math.random();
        const id = Math.random().toString(36).substr(2, 9);

        // Probabilities
        // Scatter: Low chance (increased by Ante)
        const scatterChance = isAnte ? 0.04 : 0.02; // Doubled chance
        if (rand < scatterChance) return { id, symbol: 'scatter' };

        // Multiplier: High Volatility but frequent enough to be exciting
        // Increased base chance slightly
        if (rand < scatterChance + 0.035) {
            const m = MULTIPLIER_ORBS[Math.floor(Math.random() > 0.9 ? Math.random() * MULTIPLIER_ORBS.length : Math.floor(Math.random() * 4))];
            return { id, symbol: `mult`, multValue: m.value };
        }

        // Regular Symbols
        // Weighted slightly towards low pay
        const symbolIndex = Math.floor(Math.random() * SYMBOL_KEYS.length);
        return { id, symbol: SYMBOL_KEYS[symbolIndex] };
    };

    const generateInitialGrid = () => {
        const newGrid: GridCell[][] = [];
        for (let c = 0; c < GRID_COLS; c++) {
            const col: GridCell[] = [];
            for (let r = 0; r < GRID_ROWS; r++) {
                col.push(getRandomSymbol(anteBet));
            }
            newGrid.push(col);
        }
        return newGrid;
    };

    // --- CORE MECHANICS ---

    const spin = useCallback(async () => {
        if (gameState !== 'IDLE' && !isFreeSpinMode) return;

        const cost = anteBet ? Math.floor(bet * 1.25) : bet;

        if (!isFreeSpinMode) {
            if (coins < cost) {
                toast.error("Sin saldo suficiente!");
                return;
            }
            removeCoins(cost);
            setTotalFreeSpinWin(0); // Reset if new manual spin
            setGlobalFreeSpinMult(0); // Reset global mult
            playSound.spin();
            setRoundWin(0);
        }

        setGameState('SPINNING');
        setTotalMult(0);
        setCurrentWinText(null);
        isProcessingRef.current = true;

        // Simulate Spin Delay (Visual only)
        // safeSetTimeout not used for await/promise pattern usually, but ok here
        await new Promise(resolve => safeSetTimeout(() => resolve(true), 200));

        const newGrid = generateInitialGrid();
        setGrid(newGrid);

        // Start Cascade Loop
        safeSetTimeout(() => processGrid(newGrid), 500);

    }, [bet, anteBet, coins, gameState, isFreeSpinMode]);

    const processGrid = async (currentGrid: GridCell[][]) => {
        setGameState('CASCADING');

        // 1. Count Symbols
        const counts: Record<string, number> = {};
        let scatters = 0;
        let multSum = 0;

        // Flatten for counting
        currentGrid.flat().forEach(cell => {
            if (cell.symbol === 'scatter') scatters++;
            else if (cell.symbol === 'mult') multSum += (cell.multValue || 0);
            else {
                counts[cell.symbol] = (counts[cell.symbol] || 0) + 1;
            }
        });

        // 2. Identify Winners
        const winningSymbols = new Set<string>();
        let stepWin = 0;

        Object.entries(counts).forEach(([sym, count]) => {
            // Check counts for regular symbols (not Scatter/Mult)
            if (SYMBOLS[sym] && count >= MIN_MATCH) {
                winningSymbols.add(sym);
                // Calculate Payout
                const s = SYMBOLS[sym];
                let multiplier = 0;
                if (count >= 12) multiplier = s.payouts[2]; // 12+
                else if (count >= 10) multiplier = s.payouts[1]; // 10-11
                else multiplier = s.payouts[0]; // 8-9

                stepWin += bet * multiplier;
            }
        });

        // 3. Handle Scatter Trigger (Start of round only? usually scatters persist or trigger at end)

        // 4. If Step Win > 0: Remove and Drop
        if (stepWin > 0) {
            playSound.win();
            setRoundWin(prev => prev + stepWin);
            setCurrentWinText(`+${formatCurrency(stepWin)}`);

            // Highlight / Explode Animation Delay
            await new Promise(resolve => safeSetTimeout(() => resolve(true), EXPLOSION_DURATION * 1000));

            const nextGrid = currentGrid.map(col => {
                // Filter out winning symbols
                const kept = col.filter(cell => !winningSymbols.has(cell.symbol));
                // Fill missing spots at TOP
                const missing = GRID_ROWS - kept.length;
                const newCells = Array.from({ length: missing }).map(() => getRandomSymbol(anteBet));
                return [...newCells, ...kept]; // New ones at start (top)
            });

            setGrid(nextGrid);
            playSound.click(); // Drop sound

            // Loop
            setTimeout(() => processGrid(nextGrid), DELAY_BETWEEN_CASCADES);

        } else {
            // NO MORE WINS - FINALIZE ROUND
            finalizeRound(currentGrid, roundWin, scatters);
        }
    };

    const finalizeRound = async (finalGrid: GridCell[][], totalWin: number, scatters: number) => {
        // Collect Multipliers visible on screen
        let roundMultValues = 0;
        finalGrid.flat().forEach(c => {
            if (c.symbol === 'mult') roundMultValues += (c.multValue || 0);
        });

        let finalPayout = totalWin;
        let appliedTotalMult = roundMultValues;

        // Apply Global Multiplier Logic (Free Spins)
        if (isFreeSpinMode) {
            // If there's a Multiplier symbol AND a win, add to Global
            if (roundMultValues > 0 && totalWin > 0) {
                setGlobalFreeSpinMult(prev => prev + roundMultValues);
                appliedTotalMult = globalFreeSpinMult + roundMultValues;
            } else if (totalWin > 0 && globalFreeSpinMult > 0) {
                // If just a win but no new multiplier, use existing global
                // In Gates: Is global applied even if no *new* mult hits?
                // Rule: "Whenever a Multiplier symbol hits... the Multiplier value is added to Total Multiplier."
                // "For the whole duration... whenever any new Multiplier symbol hits... Total Multiplier value is also used."
                // Implication: You NEED a Multiplier symbol on screen to trigger the Total Multiplier application.
                // Let's stick to simple logic: If (Win > 0 and MultOnScreen > 0), Apply (Global + Local). And Add Local to Global.
                // Actually most implementations: Total Multiplier applies ONLY if a multiplier lands on the winning spin.
                // Re-reading request: "los multiplicadores se acumulan en un contador global que no se reinicia"
                // Let's implement: If (Win > 0 and MultOnScreen > 0), add to Global. Then Apply Global to Win.

                // If there are NO multipliers on screen, usually global is NOT applied (in Gates).
                // But let's check user request "suma de los multiplicadores se aplica a la ganancia total". 
                // Let's go with: Apply Global ONLY if Local > 0.
                appliedTotalMult = globalFreeSpinMult; // If no new multiplier, but global exists and there's a win, apply global.
            }
        } else {
            appliedTotalMult = roundMultValues;
        }

        // Calculate Final Win for this Spin
        if (totalWin > 0 && appliedTotalMult > 0) {
            // Show animation
            toast.success(`MULTIPLICADOR x${appliedTotalMult}!`);
            playSound.jackpot();
            finalPayout = totalWin * appliedTotalMult;
            setTotalMult(appliedTotalMult);
            await new Promise(resolve => safeSetTimeout(() => resolve(true), 1000));
        }

        if (finalPayout > 0) {
            addCoins(finalPayout);
            if (isFreeSpinMode) {
                setTotalFreeSpinWin(prev => prev + finalPayout);
            }
            setCurrentWinText(`TOTAL: ${formatCurrency(finalPayout)}`);
        }

        // Check Free Spins Trigger/Retrigger
        if (scatters >= SCATTER_TRIGGER) {
            playSound.jackpot();
            if (!isFreeSpinMode) {
                toast.success("🎰 BONO DE 15 GIROS GRATIS! 🎰");
                setIsFreeSpinMode(true);
                setFreeSpins(15);
                setGlobalFreeSpinMult(0); // Start fresh global
            } else {
                toast.success("🎰 +5 GIROS GRATIS! 🎰");
                setFreeSpins(prev => prev + 5); // Retrigger
            }
        }

        // Record Stats
        recordGameResult('gates_clicker', {
            win: finalPayout,
            bet: anteBet ? bet * 1.25 : bet,
            custom: { multiplier: appliedTotalMult }
        });

        isProcessingRef.current = false;
        setGameState('IDLE');

        // Auto-Play Free Spins
        if (isFreeSpinMode && freeSpins > 0) {
            safeSetTimeout(() => {
                setFreeSpins(prev => prev - 1);
                spin(); // Recursive-ish
            }, 1500);
        } else if (isFreeSpinMode && freeSpins <= 0) {
            setIsFreeSpinMode(false);
            setGlobalFreeSpinMult(0);
            toast.info(`Fin del Bono. Total: ${formatCurrency(totalFreeSpinWin)}`);
        }
    };

    // --- RENDER ---

    return (
        <div className="flex flex-col items-center w-full max-w-6xl mx-auto min-h-[600px]">
            {/* Header */}
            <div className="w-full flex justify-between items-center mb-4 px-4">
                <div className="flex flex-col">
                    <h1 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-red-600 tracking-tighter drop-shadow-sm">
                        GATES OF CLICKER
                    </h1>
                    <span className="text-xs text-yellow-500 font-mono tracking-widest">VOLATILIDAD EXTREMA</span>
                </div>

                {/* Total Win Display */}
                <div className="bg-black/60 border-2 border-yellow-500/50 rounded-xl px-6 py-2 text-right">
                    <div className="text-xs text-gray-400 uppercase">Ganancia Ronda</div>
                    <div className="text-2xl font-mono font-bold text-green-400">
                        {currentWinText || formatCurrency(roundWin)}
                    </div>
                </div>
            </div>

            <div className="flex flex-col lg:flex-row gap-6 w-full">

                {/* SIDEBAR: Stats & Free Spins Info */}
                <div className="w-full lg:w-64 flex flex-col gap-4 order-2 lg:order-1">
                    <div className={cn(
                        "rounded-2xl p-4 border transition-all duration-300 relative overflow-hidden",
                        isFreeSpinMode
                            ? "bg-gradient-to-b from-purple-900 to-indigo-900 border-purple-400 shadow-[0_0_30px_rgba(168,85,247,0.4)]"
                            : "bg-black/40 border-white/10"
                    )}>
                        {isFreeSpinMode && (
                            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-purple-400 to-transparent animate-pulse"></div>
                        )}

                        <div className="text-center">
                            {isFreeSpinMode ? (
                                <>
                                    <h3 className="text-purple-300 font-black text-lg uppercase mb-2">Giros Gratis</h3>
                                    <div className="text-5xl font-black text-white mb-2 filter drop-shadow-[0_0_10px_purple]">{freeSpins}</div>
                                    <div className="text-xs text-purple-200">Restantes</div>

                                    {/* Global Multiplier Display */}
                                    <div className="mt-4 pt-4 border-t border-white/10">
                                        <div className="text-xs text-yellow-500 font-bold uppercase mb-1">Multiplicador Global</div>
                                        <div className="text-3xl font-black text-yellow-400 bg-white/10 rounded-lg py-1 px-3 inline-block">
                                            x{globalFreeSpinMult}
                                        </div>
                                    </div>

                                    <div className="mt-4 pt-4 border-t border-white/10">
                                        <div className="text-xs text-gray-400">Total Ganado</div>
                                        <div className="text-xl text-green-400 font-mono">{formatCurrency(totalFreeSpinWin)}</div>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div className="flex items-center justify-center gap-2 mb-2">
                                        <Zap className="text-yellow-500 w-5 h-5" />
                                        <span className="font-bold text-white">Multiplicador</span>
                                    </div>
                                    <div className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-b from-yellow-300 to-orange-500">
                                        {totalMult > 0 ? `x${totalMult}` : '---'}
                                    </div>
                                </>
                            )}
                        </div>
                    </div>

                    {/* ANTE BET TOGGLE */}
                    <button
                        onClick={() => !gameState.match(/SPINNING|CASCADING/) && setAnteBet(!anteBet)}
                        disabled={gameState !== 'IDLE'}
                        className={cn(
                            "group relative p-4 rounded-xl border-2 transition-all text-left overflow-hidden",
                            anteBet
                                ? "bg-amber-900/40 border-amber-500 shadow-[0_0_20px_rgba(245,158,11,0.2)]"
                                : "bg-black/40 border-white/10 hover:border-white/20"
                        )}
                    >
                        <div className="relative z-10 flex flex-col">
                            <span className="text-xs font-bold text-amber-500 uppercase tracking-wider mb-1">
                                Doble Probabilidad
                            </span>
                            <span className="text-sm text-gray-300 leading-tight">
                                Activa el <b className="text-white">Ante Bet</b> para duplicar la chance de scatter.
                            </span>
                            <div className="mt-3 text-xs font-mono bg-black/50 inline-block px-2 py-1 rounded">
                                Costo: +25%
                            </div>
                        </div>
                        {anteBet && (
                            <div className="absolute -right-4 -bottom-4 text-amber-500/10 rotate-12">
                                <Flame size={100} />
                            </div>
                        )}
                    </button>
                </div>

                {/* GAME GRID (CENTER) */}
                <div className="flex-1 order-1 lg:order-2">
                    <div className="relative aspect-[6/5] w-full max-w-[800px] bg-[#0f0b15] rounded-xl border-4 border-[#2d2438] shadow-2xl p-2 md:p-4 overflow-hidden">
                        {/* Background Effect */}
                        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/dark-matter.png')] opacity-30 pointer-events-none"></div>
                        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-purple-900/20 to-transparent pointer-events-none"></div>

                        {/* GRID CONTAINER */}
                        <div className="grid grid-cols-6 gap-1 md:gap-2 h-full z-10 relative">
                            {grid.map((col, cIndex) => (
                                <div key={cIndex} className="flex flex-col gap-1 md:gap-2 h-full">
                                    {col.map((cell) => {
                                        const isScatter = cell.symbol === 'scatter';
                                        const isMult = cell.symbol === 'mult';
                                        const asset = SYMBOLS[cell.symbol];

                                        return (
                                            <motion.div
                                                layoutId={cell.id}
                                                key={cell.id}
                                                initial={{ y: -500, opacity: 0 }}
                                                animate={{ y: 0, opacity: 1 }}
                                                exit={{ scale: 0, opacity: 0, rotate: 180 }}
                                                transition={{ duration: 0.3, type: "spring", stiffness: 200, damping: 25 }}
                                                className={cn(
                                                    "flex-1 rounded-lg md:rounded-xl flex items-center justify-center relative shadow-inner group",
                                                    isMult ? "bg-black/60" : "bg-[#1a1523]",
                                                    "border border-white/5"
                                                )}
                                            >
                                                {isScatter ? (
                                                    <div className="text-3xl md:text-5xl animate-pulse filter drop-shadow-[0_0_10px_rgba(236,72,153,0.8)]">
                                                        {SCATTER.icon}
                                                    </div>
                                                ) : isMult ? (
                                                    <div className={cn(
                                                        "w-10 h-10 md:w-16 md:h-16 rounded-full flex items-center justify-center font-black text-white text-xs md:text-lg border-2 border-white/30",
                                                        MULTIPLIER_ORBS.find(m => m.value === cell.multValue)?.color || 'bg-gray-500'
                                                    )}>
                                                        x{cell.multValue}
                                                    </div>
                                                ) : (
                                                    <div className={cn("text-3xl md:text-5xl transform transition-transform group-hover:scale-110", asset?.color)}>
                                                        {asset?.icon || '?'}
                                                    </div>
                                                )}
                                            </motion.div>
                                        );
                                    })}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* CONTROLS (BOTTOM) */}
            <div className="w-full max-w-2xl mt-8 bg-[#15101f] p-4 rounded-3xl border border-white/10 flex items-center justify-between gap-4 shadow-xl z-20">
                <div className="flex flex-col gap-1">
                    <span className="text-[10px] text-gray-500 uppercase tracking-wider font-bold">Tu Apuesta</span>
                    <div className="flex items-center gap-2 bg-black/40 rounded-lg p-1.5 border border-white/5">
                        <button
                            onClick={() => setBet(b => Math.max(100, b - 100))}
                            className="w-8 h-8 flex items-center justify-center bg-white/10 rounded hover:bg-white/20 text-white font-bold"
                        >-</button>
                        <span className="w-24 text-center font-mono font-bold text-yellow-500">{formatCurrency(bet)}</span>
                        <button
                            onClick={() => setBet(b => b + 100)}
                            className="w-8 h-8 flex items-center justify-center bg-white/10 rounded hover:bg-white/20 text-white font-bold"
                        >+</button>
                    </div>
                </div>

                <button
                    onClick={spin}
                    disabled={gameState !== 'IDLE' && !isFreeSpinMode}
                    className={cn(
                        "flex-1 h-16 rounded-2xl font-black text-xl md:text-3xl tracking-wide shadow-lg transition-all flex items-center justify-center gap-3",
                        gameState !== 'IDLE'
                            ? "bg-gray-700 text-gray-400 cursor-not-allowed"
                            : "bg-gradient-to-b from-green-500 to-green-700 hover:scale-[1.02] active:scale-95 text-white shadow-[0_4px_0_rgb(21,128,61)]"
                    )}
                >
                    {isFreeSpinMode ? (
                        <>
                            <RefreshCw className="animate-spin w-8 h-8" />
                            AUTO {freeSpins}
                        </>
                    ) : gameState === 'IDLE' ? (
                        <>GIRAR</>
                    ) : (
                        <>...</>
                    )}
                </button>
            </div>
        </div>
    );
}
