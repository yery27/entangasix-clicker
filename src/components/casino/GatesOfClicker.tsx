import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '../../stores/gameStore';
import { toast } from 'sonner';
import { cn, formatCurrency } from '../../lib/utils';
import {
    RefreshCw, Zap, Flame, MousePointer2, Crown,
    Gem, Hexagon, Triangle, Square, Circle
} from 'lucide-react';
import { playSound } from '../../lib/soundManager';

// --- GAME CONFIGURATION V3.0 GOD MODE ---
const GRID_ROWS = 5;
const GRID_COLS = 6;
const MIN_MATCH = 8;
const SCATTER_TRIGGER = 4;

// Animation Timings (ms)
const EXPLOSION_DURATION = 0.6;
const DELAY_BETWEEN_CASCADES = 900; // Slower for dramatic effect

// THEME CONSTANTS
const GOD_THEME = {
    primary: 'from-amber-500 via-yellow-400 to-amber-600',
    glow: 'shadow-[0_0_50px_rgba(251,191,36,0.5)]',
    text: 'text-amber-400',
    bg: 'bg-[#0f0b15]' // Dark void
};

// --- SYMBOLS & PAYTABLE ---
// Adjusted Payouts for High Volatility
// Low Pay: Shapes
// High Pay: Golden Relics

type SymbolType = {
    id: string;
    icon: React.ElementType; // Lucide Icon
    color: string;
    shadow: string; // Neon glow color
    isHighPay: boolean;
    payouts: [number, number, number]; // [8-9, 10-11, 12+] Multipliers
};

const SYMBOLS: Record<string, SymbolType> = {
    // LOW PAY
    'shape_circle': { id: 'shape_circle', icon: Circle, color: 'text-blue-500', shadow: 'blue', isHighPay: false, payouts: [0.25, 0.75, 2] },
    'shape_square': { id: 'shape_square', icon: Square, color: 'text-green-500', shadow: 'green', isHighPay: false, payouts: [0.4, 0.9, 4] },
    'shape_triangle': { id: 'shape_triangle', icon: Triangle, color: 'text-purple-500', shadow: 'purple', isHighPay: false, payouts: [0.5, 1, 5] },
    'shape_hex': { id: 'shape_hex', icon: Hexagon, color: 'text-pink-500', shadow: 'pink', isHighPay: false, payouts: [0.8, 1.2, 8] },
    'shape_gem': { id: 'shape_gem', icon: Gem, color: 'text-red-500', shadow: 'red', isHighPay: false, payouts: [1, 1.5, 10] },

    // HIGH PAY (Golden Artifacts)
    'relic_mouse': { id: 'relic_mouse', icon: MousePointer2, color: 'text-yellow-300', shadow: 'yellow', isHighPay: true, payouts: [1.5, 2, 12] }, // "Golden Cursor"
    'relic_battery': { id: 'relic_battery', icon: Zap, color: 'text-cyan-300', shadow: 'cyan', isHighPay: true, payouts: [2, 5, 15] },       // "Quantum Battery"
    'relic_crown': { id: 'relic_crown', icon: Crown, color: 'text-amber-400', shadow: 'amber', isHighPay: true, payouts: [10, 25, 50] },     // "Click Crown"
};

const SYMBOL_KEYS = Object.keys(SYMBOLS);

// Special Symbols
const SCATTER = { id: 'scatter', icon: '⚡', color: 'text-white drop-shadow-[0_0_15px_rgba(255,255,255,1)]' }; // ZEUS HEAD (Emoji or Image)
// Using Emoji for now but styled heavily
const ZEUS_HEAD = '🌩️';

const MULTIPLIER_ORBS = [
    { value: 2, color: 'bg-green-500', glow: 'shadow-[0_0_20px_#22c55e]' },
    { value: 5, color: 'bg-blue-500', glow: 'shadow-[0_0_20px_#3b82f6]' },
    { value: 10, color: 'bg-purple-500', glow: 'shadow-[0_0_25px_#a855f7]' },
    { value: 50, color: 'bg-red-600', glow: 'shadow-[0_0_30px_#dc2626] animate-pulse' },
    { value: 100, color: 'bg-gradient-to-br from-yellow-300 to-amber-600', glow: 'shadow-[0_0_50px_#f59e0b] animate-bounce' },
    { value: 500, color: 'bg-white', glow: 'shadow-[0_0_80px_#ffffff] ring-4 ring-yellow-400' },
];

interface GridCell {
    id: string;
    symbol: string;
    multValue?: number;
}

export function GatesOfClicker() {
    const { coins, removeCoins, addCoins, recordGameResult } = useGameStore();

    // --- STATE ---
    const [grid, setGrid] = useState<GridCell[][]>([]);
    const [gameState, setGameState] = useState<'IDLE' | 'SPINNING' | 'CASCADING' | 'WIN_SHOW'>('IDLE');

    // Betting (High Roller Range)
    const [bet, setBet] = useState(1000);
    const [anteBet, setAnteBet] = useState(false);

    // Stats
    const [roundWin, setRoundWin] = useState(0);
    const [totalMult, setTotalMult] = useState(0);
    const [currentWinText, setCurrentWinText] = useState<string | null>(null);

    // Free Spins
    const [freeSpins, setFreeSpins] = useState(0);
    const [isFreeSpinMode, setIsFreeSpinMode] = useState(false);
    const [totalFreeSpinWin, setTotalFreeSpinWin] = useState(0);
    const [globalFreeSpinMult, setGlobalFreeSpinMult] = useState(0);

    // Visual Effects
    const [shake, setShake] = useState(false);
    const [lightning, setLightning] = useState(false);

    const isProcessingRef = useRef(false);
    const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);

    useEffect(() => {
        return () => timeoutsRef.current.forEach(t => clearTimeout(t));
    }, []);

    const safeSetTimeout = (fn: () => void, ms: number) => {
        const id = setTimeout(fn, ms);
        timeoutsRef.current.push(id);
        return id;
    };

    // --- LOGIC ---

    const getRandomSymbol = (isAnte: boolean): GridCell => {
        const rand = Math.random();
        const id = Math.random().toString(36).substr(2, 9);

        // VOLATILITY TUNING
        const scatterChance = isAnte ? 0.05 : 0.025; // 1 in 40 vs 1 in 20
        if (rand < scatterChance) return { id, symbol: 'scatter' };

        // Multipliers: Rare but Impactful
        if (rand < scatterChance + 0.03) {
            // Weighted Orbs: 70% Small, 20% Medium, 9% Big, 1% GOD
            const orbRand = Math.random();
            let m;
            if (orbRand > 0.99) m = MULTIPLIER_ORBS[5]; // 500x
            else if (orbRand > 0.90) m = MULTIPLIER_ORBS[4]; // 100x
            else if (orbRand > 0.80) m = MULTIPLIER_ORBS[3]; // 50x
            else if (orbRand > 0.60) m = MULTIPLIER_ORBS[2]; // 10x
            else m = MULTIPLIER_ORBS[Math.floor(Math.random() * 2)]; // 2x-5x

            return { id, symbol: `mult`, multValue: m.value };
        }

        // Normal Symbols
        const symbolIndex = Math.floor(Math.random() * SYMBOL_KEYS.length);
        return { id, symbol: SYMBOL_KEYS[symbolIndex] };
    };

    const triggerShake = (intensity: 'light' | 'heavy') => {
        setShake(true);
        if (intensity === 'heavy') setLightning(true);
        safeSetTimeout(() => {
            setShake(false);
            setLightning(false);
        }, intensity === 'heavy' ? 800 : 400);
    };

    // --- MAIN LOOP ---

    const spin = useCallback(async () => {
        if (gameState !== 'IDLE' && !isFreeSpinMode) return;

        const cost = anteBet ? Math.floor(bet * 1.25) : bet;

        if (!isFreeSpinMode) {
            if (coins < cost) {
                toast.error("¡Necesitas más clicks para esta apuesta de Dioses!");
                return;
            }
            removeCoins(cost);
            setTotalFreeSpinWin(0);
            setGlobalFreeSpinMult(0);
            playSound.spin();
            setRoundWin(0);
        }

        setGameState('SPINNING');
        setTotalMult(0);
        setCurrentWinText(null);
        isProcessingRef.current = true;

        await new Promise(resolve => safeSetTimeout(() => resolve(true), 200));

        // GENERATE GRID
        const newGrid: GridCell[][] = [];
        for (let c = 0; c < GRID_COLS; c++) {
            const col: GridCell[] = [];
            for (let r = 0; r < GRID_ROWS; r++) {
                col.push(getRandomSymbol(anteBet));
            }
            newGrid.push(col);
        }
        setGrid(newGrid);

        // Play Drop Sound
        // playSound.click();

        safeSetTimeout(() => processGrid(newGrid), 500);

    }, [bet, anteBet, coins, gameState, isFreeSpinMode]);


    const processGrid = async (currentGrid: GridCell[][]) => {
        setGameState('CASCADING');

        const counts: Record<string, number> = {};
        let scatters = 0;
        let roundMultValues = 0;

        currentGrid.flat().forEach(cell => {
            if (cell.symbol === 'scatter') scatters++;
            else if (cell.symbol === 'mult') roundMultValues += (cell.multValue || 0);
            else counts[cell.symbol] = (counts[cell.symbol] || 0) + 1;
        });

        const winningSymbols = new Set<string>();
        let stepWin = 0;

        Object.entries(counts).forEach(([sym, count]) => {
            if (SYMBOLS[sym] && count >= MIN_MATCH) {
                winningSymbols.add(sym);
                const s = SYMBOLS[sym];
                let multiplier = 0;
                if (count >= 12) multiplier = s.payouts[2];
                else if (count >= 10) multiplier = s.payouts[1];
                else multiplier = s.payouts[0];
                stepWin += bet * multiplier;
            }
        });

        if (stepWin > 0) {
            playSound.win();
            setRoundWin(prev => prev + stepWin);
            setCurrentWinText(`+${formatCurrency(stepWin)}`);

            // Dramatic Effect if Big Win
            if (stepWin > bet * 10) triggerShake('light');

            await new Promise(resolve => safeSetTimeout(() => resolve(true), EXPLOSION_DURATION * 1000));

            const nextGrid = currentGrid.map(col => {
                const kept = col.filter(cell => !winningSymbols.has(cell.symbol));
                const missing = GRID_ROWS - kept.length;
                const newCells = Array.from({ length: missing }).map(() => getRandomSymbol(anteBet));
                return [...newCells, ...kept];
            });

            setGrid(nextGrid);
            safeSetTimeout(() => processGrid(nextGrid), DELAY_BETWEEN_CASCADES);

        } else {
            finalizeRound(currentGrid, roundWin, scatters);
        }
    };

    const finalizeRound = async (finalGrid: GridCell[][], totalWin: number, scatters: number) => {
        let roundMultValues = 0;
        finalGrid.flat().forEach(c => {
            if (c.symbol === 'mult') roundMultValues += (c.multValue || 0);
        });

        let finalPayout = totalWin;

        // --- GOD MODE MULTIPLIER LOGIC ---
        // 1. Accumulate Multipliers animation (if any)
        if (roundMultValues > 0 && totalWin > 0) {
            // Visual wait for orb collection
            await new Promise(resolve => safeSetTimeout(() => resolve(true), 500));

            if (isFreeSpinMode) {
                setGlobalFreeSpinMult(prev => prev + roundMultValues);
                // "Broken" Mechanic: Add Local to Global, THEN Apply Global
                // This scaling is exponential if user gets lucky.
                finalPayout = totalWin * (globalFreeSpinMult + roundMultValues);

                // Shake heavy if mult applied is huge
                if (globalFreeSpinMult + roundMultValues > 50) triggerShake('heavy');
            } else {
                finalPayout = totalWin * roundMultValues;
                if (roundMultValues > 20) triggerShake('heavy');
            }

            toast.success(`¡MULTIPLICADOR APLICADO!`);
            playSound.jackpot();
            setTotalMult(isFreeSpinMode ? globalFreeSpinMult + roundMultValues : roundMultValues);

            // Dramactic Pause after multiplier hit
            await new Promise(resolve => safeSetTimeout(() => resolve(true), 1200));
        } else if (isFreeSpinMode && totalWin > 0 && globalFreeSpinMult > 0 && roundMultValues === 0) {
            // If FreeSpin and NO new orb, usually Gates DOES NOT apply global.
            // But user asked for "Chetado". Let's apply Global if win exists?
            // "si hay 8 o más símbolos... paga" -> Logic standard.
            // "Durante los giros gratis, si un multiplicador aterriza Y hay una victoria... se suma"
            // Implies: If NO multiplier lands, NO global application?
            // Most implementations require a multiplier symbol to "Unlock" the global multiplier for that spin.
            // But let's be generous for the "Chetado" feel.
            // Actually, the prompt says "si un multiplicador aterriza... se suma". It doesn't explicitly say "Apply global always".
            // Let's stick to: Global applies ONLY if Local lands. This builds TENSION. You have a huge 500x global, but you NEED a 2x to land to cash it out. That is DOPAMINE.
            finalPayout = totalWin; // No mult applied if no orb landed.
        }

        if (finalPayout > 0) {
            addCoins(finalPayout);
            if (isFreeSpinMode) setTotalFreeSpinWin(prev => prev + finalPayout);
        }

        if (scatters >= SCATTER_TRIGGER) {
            playSound.jackpot();
            if (!isFreeSpinMode) {
                triggerShake('heavy');
                toast.success("⚡ MODO DIOS ACTIVADO: 15 GIROS GRATIS ⚡");
                setIsFreeSpinMode(true);
                setFreeSpins(15);
                setGlobalFreeSpinMult(0);
            } else {
                toast.success("⚡ RETRIGGER: +5 GIROS ⚡");
                setFreeSpins(prev => prev + 5);
            }
        }

        recordGameResult('gates_god_mode', {
            win: finalPayout,
            bet: anteBet ? bet * 1.25 : bet,
            custom: { multiplier: isFreeSpinMode ? globalFreeSpinMult : roundMultValues }
        });

        isProcessingRef.current = false;
        setGameState('IDLE');

        if (isFreeSpinMode && freeSpins > 0) {
            safeSetTimeout(() => {
                setFreeSpins(prev => prev - 1);
                spin();
            }, 1500);
        } else if (isFreeSpinMode && freeSpins <= 0) {
            setIsFreeSpinMode(false);
            setGlobalFreeSpinMult(0);
            toast.info(`Fin del Modo Dios. Ganancia: ${formatCurrency(totalFreeSpinWin)}`);
        }
    };

    // --- RENDER HELPERS ---
    const bets = [1000, 10000, 50000, 100000, 250000, 500000, 1000000, 2500000, 5000000];

    return (
        <div className={cn(
            "relative flex flex-col items-center w-full max-w-6xl mx-auto min-h-[700px] p-4 rounded-3xl overflow-hidden transition-all duration-100",
            shake ? "translate-x-1 translate-y-1 rotate-1 scale-[1.01]" : "",
            GOD_THEME.bg
        )}>
            {/* BACKGROUND EFFECTS */}
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/dark-matter.png')] opacity-20 pointer-events-none"></div>
            {lightning && <div className="absolute inset-0 bg-white/20 z-50 animate-pulse pointer-events-none mix-blend-overlay"></div>}

            {/* HEADER */}
            <div className="z-10 w-full flex justify-between items-center mb-6 pl-4 pr-4 border-b border-white/5 pb-4">
                <div className="flex items-center gap-3">
                    <div className="bg-gradient-to-br from-yellow-400 to-amber-700 w-12 h-12 rounded-full flex items-center justify-center shadow-[0_0_20px_orange]">
                        <Zap className="text-white fill-white" />
                    </div>
                    <div>
                        <h1 className="text-4xl font-black italic tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-yellow-200 via-amber-400 to-yellow-600 drop-shadow-[0_2px_4px_rgba(0,0,0,1)]">
                            GATES OF CLICKER
                        </h1>
                        <span className="text-[10px] text-amber-500 font-mono tracking-[0.3em] uppercase opacity-80">God Mode V3.0</span>
                    </div>
                </div>

                <div className="flex flex-col items-end">
                    <span className="text-xs text-gray-400 uppercase tracking-widest">Ganancia Actual</span>
                    <div className="text-3xl font-mono font-bold text-green-400 drop-shadow-[0_0_10px_rgba(74,222,128,0.5)]">
                        {currentWinText || formatCurrency(roundWin)}
                    </div>
                </div>
            </div>

            <div className="flex flex-col lg:flex-row gap-8 w-full z-10">

                {/* LEFT PANEL: STATS & CONTROLS */}
                <div className="w-full lg:w-72 flex flex-col gap-6 order-2 lg:order-1">

                    {/* ACCUMULATOR CARD */}
                    <motion.div
                        animate={isFreeSpinMode ? { boxShadow: ["0 0 20px #a855f7", "0 0 40px #a855f7", "0 0 20px #a855f7"] } : {}}
                        transition={{ duration: 2, repeat: Infinity }}
                        className={cn(
                            "rounded-3xl p-6 border-2 relative overflow-hidden flex flex-col items-center justify-center min-h-[160px]",
                            isFreeSpinMode
                                ? "bg-gradient-to-br from-purple-900/80 to-indigo-950/80 border-purple-500"
                                : "bg-white/5 border-white/10"
                        )}
                    >
                        {isFreeSpinMode ? (
                            <>
                                <div className="absolute top-2 right-2 text-xs font-bold bg-purple-600 px-2 py-0.5 rounded text-white">FREE SPINS</div>
                                <div className="text-6xl font-black text-white mb-2 drop-shadow-[0_0_15px_rgba(255,255,255,0.8)]">{freeSpins}</div>
                                <div className="w-full h-px bg-white/20 my-2"></div>
                                <div className="flex flex-col items-center">
                                    <span className="text-xs text-yellow-500 font-bold uppercase">Mult. Global</span>
                                    <div className="text-4xl font-black text-yellow-400 drop-shadow-[0_0_10px_orange]">x{globalFreeSpinMult}</div>
                                </div>
                            </>
                        ) : (
                            <>
                                <div className="text-xs text-gray-500 uppercase tracking-widest mb-2 font-bold">Multiplicador Ronda</div>
                                <div className={cn(
                                    "text-5xl font-black transition-all",
                                    totalMult > 0 ? "text-yellow-400 scale-110 drop-shadow-[0_0_30px_orange]" : "text-gray-700"
                                )}>
                                    x{totalMult}
                                </div>
                            </>
                        )}
                    </motion.div>

                    {/* ANTE BET */}
                    <button
                        onClick={() => gameState === 'IDLE' && setAnteBet(!anteBet)}
                        className={cn(
                            "relative p-4 rounded-2xl border-2 transition-all duration-300 group overflow-hidden",
                            anteBet ? "bg-amber-900/40 border-amber-500" : "bg-white/5 border-white/10 hover:border-white/20"
                        )}
                    >
                        <div className="absolute -right-6 -bottom-6 opacity-20 group-hover:opacity-40 transition-opacity">
                            <Flame size={80} className={anteBet ? "text-amber-500" : "text-gray-500"} />
                        </div>
                        <div className="relative z-10 text-left">
                            <div className="flex items-center gap-2 mb-1">
                                <span className={cn("w-3 h-3 rounded-full shadow-[0_0_10px_currentColor]", anteBet ? "bg-green-500 text-green-500" : "bg-gray-600 text-gray-600")}></span>
                                <span className="font-bold text-sm uppercase text-white">Doble Probabilidad</span>
                            </div>
                            <p className="text-xs text-gray-400 leading-relaxed">
                                Aumenta la apuesta un <span className="text-amber-500 font-bold">25%</span> para duplicar la chance de encontrar a Zeus.
                            </p>
                        </div>
                    </button>

                    {/* BET SELECTOR */}
                    <div className="bg-[#1a1625] p-4 rounded-2xl border border-white/10">
                        <span className="text-xs text-gray-500 font-bold uppercase mb-3 block">Apuesta</span>
                        <div className="grid grid-cols-3 gap-2">
                            {bets.map(b => (
                                <button
                                    key={b}
                                    onClick={() => setBet(b)}
                                    disabled={gameState !== 'IDLE'}
                                    className={cn(
                                        "py-2 px-1 rounded-lg text-[10px] sm:text-xs font-bold transition-all border",
                                        bet === b
                                            ? "bg-amber-600 border-amber-400 text-white shadow-[0_0_10px_orange]"
                                            : "bg-white/5 border-transparent text-gray-400 hover:bg-white/10"
                                    )}
                                >
                                    {b >= 1000000 ? (b / 1000000) + 'M' : (b / 1000) + 'k'}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* GAME GRID (CENTER) */}
                <div className="flex-1 relative order-1 lg:order-2">
                    <div className="relative aspect-[6/5] w-full bg-[#16121d] rounded-2xl border-[3px] border-amber-700/30 shadow-2xl overflow-hidden p-2">
                        {/* Grid Inner Border */}
                        <div className="absolute inset-0 border border-amber-500/10 rounded-xl pointer-events-none z-20"></div>

                        <div className="grid grid-cols-6 gap-1.5 h-full relative z-10">
                            <AnimatePresence>
                                {grid.map((col, cIndex) => (
                                    <div key={`col-${cIndex}`} className="flex flex-col gap-1.5 h-full">
                                        {col.map((cell) => {
                                            const asset = SYMBOLS[cell.symbol];
                                            const isScatter = cell.symbol === 'scatter';
                                            const isMult = cell.symbol === 'mult';
                                            const orb = isMult ? MULTIPLIER_ORBS.find(o => o.value === cell.multValue) : null;

                                            // Handle Variants
                                            return (
                                                <motion.div
                                                    layoutId={cell.id}
                                                    key={cell.id}
                                                    initial={{ y: -600, opacity: 0, scale: 0.5 }}
                                                    animate={{ y: 0, opacity: 1, scale: 1 }}
                                                    exit={{ scale: 0, opacity: 0, filter: 'brightness(3)' }}
                                                    transition={{
                                                        type: "spring",
                                                        stiffness: 250,
                                                        damping: 25,
                                                        mass: 1
                                                    }}
                                                    className={cn(
                                                        "flex-1 rounded-lg flex items-center justify-center relative group overflow-visible",
                                                        isMult ? "" : "bg-[#1f1a29]"
                                                    )}
                                                >
                                                    {/* SYMBOL CONTENT */}
                                                    {isScatter ? (
                                                        <div className="text-4xl sm:text-5xl animate-pulse drop-shadow-[0_0_15px_rgba(255,255,255,0.8)] filter brightness-125">
                                                            {ZEUS_HEAD}
                                                        </div>
                                                    ) : isMult ? (
                                                        <div className={cn(
                                                            "w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center border-2 border-white/40",
                                                            orb?.color, orb?.glow
                                                        )}>
                                                            <span className="font-black text-white text-xs sm:text-sm drop-shadow-md">
                                                                {cell.multValue}x
                                                            </span>
                                                        </div>
                                                    ) : (
                                                        <div className={cn(
                                                            "transition-all duration-300 group-hover:scale-110",
                                                            asset?.color,
                                                            `drop-shadow-[0_0_8px_${asset?.shadow}]`
                                                        )}>
                                                            {asset && <asset.icon size={36} strokeWidth={2.5} />}
                                                        </div>
                                                    )}
                                                </motion.div>
                                            );
                                        })}
                                    </div>
                                ))}
                            </AnimatePresence>
                        </div>
                    </div>
                </div>
            </div>

            {/* BIG SPIN BUTTON */}
            <div className="w-full max-w-md mt-6 z-20">
                <button
                    onClick={spin}
                    disabled={gameState !== 'IDLE' && !isFreeSpinMode}
                    className={cn(
                        "w-full h-20 rounded-full font-black text-2xl tracking-widest uppercase transition-all shadow-xl active:scale-95 flex items-center justify-center gap-4 border-b-4",
                        gameState !== 'IDLE'
                            ? "bg-gray-800 text-gray-500 border-gray-950 cursor-not-allowed"
                            : "bg-gradient-to-b from-green-500 to-emerald-700 border-emerald-900 text-white hover:brightness-110 shadow-[0_0_30px_rgba(16,185,129,0.4)]"
                    )}
                >
                    {isFreeSpinMode ? (
                        <>
                            <div className="w-6 h-6 border-b-2 border-l-2 border-white rounded-full animate-spin"></div>
                            AUTO ({freeSpins})
                        </>
                    ) : (
                        gameState === 'IDLE' ? "GIRAR" : "..."
                    )}
                </button>
            </div>
        </div>
    );
}

// TODO: Move types to separate file if file grows too large.
