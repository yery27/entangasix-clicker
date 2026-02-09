import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '../../stores/gameStore';
import { toast } from 'sonner';
import { cn, formatCurrency } from '../../lib/utils';
import {
    Zap, MousePointer2, Crown,
    Gem, Hexagon, Triangle, Square, Circle
} from 'lucide-react';
import { playSound } from '../../lib/soundManager';

// --- GAME CONFIGURATION V3.1 OPTIMIZED ---
const GRID_ROWS = 5;
const GRID_COLS = 6;
const MIN_MATCH = 8;
const SCATTER_TRIGGER = 4;

// Animation Timings (ms)
const EXPLOSION_DURATION = 0.6;
const DELAY_BETWEEN_CASCADES = 800; // Slower for dramatic effect

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
    'relic_mouse': { id: 'relic_mouse', icon: MousePointer2, color: 'text-yellow-300', shadow: 'yellow', isHighPay: true, payouts: [2, 5, 20] }, // "Golden Cursor"
    'relic_battery': { id: 'relic_battery', icon: Zap, color: 'text-cyan-300', shadow: 'cyan', isHighPay: true, payouts: [5, 10, 30] },       // "Quantum Battery"
    'relic_crown': { id: 'relic_crown', icon: Crown, color: 'text-amber-400', shadow: 'amber', isHighPay: true, payouts: [20, 50, 200] },     // "Click Crown"
};



// Special Symbols
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
    colIndex: number; // Stored for line drawing
    rowIndex: number;
}

export function GatesOfClicker() {
    const { coins, removeCoins, addCoins, recordGameResult } = useGameStore();

    // --- STATE ---
    const [grid, setGrid] = useState<GridCell[][]>([]);
    const [gameState, setGameState] = useState<'IDLE' | 'SPINNING' | 'CASCADING' | 'RESOLVING'>('IDLE');

    // Betting (High Roller Range)
    const [bet, setBet] = useState(1000);
    const [anteBet, setAnteBet] = useState(false);

    // Stats
    const [roundWin, setRoundWin] = useState(0);
    const [totalMult, setTotalMult] = useState(0);
    const [currentWinText, setCurrentWinText] = useState<string | null>(null);
    const [winningGroups, setWinningGroups] = useState<{ points: { x: number, y: number }[], color: string }[]>([]); // SVG Lines

    // Free Spins
    const [freeSpins, setFreeSpins] = useState(0);
    const [isFreeSpinMode, setIsFreeSpinMode] = useState(false);
    const [totalFreeSpinWin, setTotalFreeSpinWin] = useState(0);
    const [globalFreeSpinMult, setGlobalFreeSpinMult] = useState(0);
    // Auto-spin trigger
    const triggerNextSpin = useRef(false);

    // Visuals
    const [shake, setShake] = useState(false);
    const [lightning, setLightning] = useState(false);

    const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);

    useEffect(() => {
        return () => clearAllTimeouts();
    }, []);

    const clearAllTimeouts = () => {
        timeoutsRef.current.forEach(t => clearTimeout(t));
        timeoutsRef.current = [];
    };

    const safeSetTimeout = (fn: () => void, ms: number) => {
        const id = setTimeout(fn, ms);
        timeoutsRef.current.push(id);
        return id;
    };

    // --- LOGIC ---

    const getRandomSymbol = (c: number, r: number, isAnte: boolean): GridCell => {
        const rand = Math.random();
        const id = Math.random().toString(36).substr(2, 9);

        // VOLATILITY TUNING V4.0 (NERFED)
        // Harder to trigger bonus, harder to get multipliers.
        const scatterBase = 0.003; // 0.3% (approx 1 in 333)
        const scatterChance = isAnte ? scatterBase * 2 : scatterBase;

        const multChance = 0.005; // 0.5% chance for multiplier orb (was 1.5%)

        let symbol = '';
        let multValue = undefined;

        if (rand < scatterChance) {
            symbol = 'scatter';
        } else if (rand < scatterChance + multChance) {
            symbol = 'mult';
            // Adjusted Orb Weights: mostly small ones
            const orbRand = Math.random();
            if (orbRand > 0.998) multValue = 500; // 0.2% of orbs
            else if (orbRand > 0.98) multValue = 100; // 2%
            else if (orbRand > 0.90) multValue = 50; // 8%
            else if (orbRand > 0.70) multValue = 10; // 20%
            else multValue = [2, 3, 4, 5, 8][Math.floor(Math.random() * 5)]; // 70%
        } else {
            // WEIGHTED SYMBOL SELECTION
            // Shapes (Low Pay): 92% (was 85%)
            // Relics (High Pay): 8% (was 15%)
            const symbolRand = Math.random();
            const lowPayKeys = ['shape_circle', 'shape_square', 'shape_triangle', 'shape_hex', 'shape_gem'];

            if (symbolRand < 0.92) {
                symbol = lowPayKeys[Math.floor(Math.random() * lowPayKeys.length)];
            } else {
                // Within High Pay, Crown is harder
                const highRand = Math.random();
                if (highRand > 0.85) symbol = 'relic_crown'; // ~1.2% total
                else if (highRand > 0.50) symbol = 'relic_battery';
                else symbol = 'relic_mouse';
            }
        }

        return { id, symbol, multValue, colIndex: c, rowIndex: r };
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

        // Safety Clean: Prevent spinning if in bonus mode but no spins left
        if (isFreeSpinMode && freeSpins <= 0) return;

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
        setWinningGroups([]);
        clearAllTimeouts(); // Clear any pending timeouts from previous rounds

        await new Promise(resolve => safeSetTimeout(() => resolve(true), 200));

        // GENERATE GRID
        const newGrid: GridCell[][] = [];
        for (let c = 0; c < GRID_COLS; c++) {
            const col: GridCell[] = [];
            for (let r = 0; r < GRID_ROWS; r++) {
                col.push(getRandomSymbol(c, r, anteBet));
            }
            newGrid.push(col);
        }
        setGrid(newGrid);

        // Play Drop Sound
        // playSound.click();

        safeSetTimeout(() => processGrid(newGrid), 400);

    }, [bet, anteBet, coins, gameState, isFreeSpinMode, freeSpins, removeCoins, setTotalFreeSpinWin, setGlobalFreeSpinMult, setRoundWin]);


    // --- EFFECT: FREE SPINS LOOP ---
    // Moved here to be after 'spin' declaration
    useEffect(() => {
        if (gameState !== 'IDLE') return;

        if (isFreeSpinMode) {
            if (freeSpins > 0 && triggerNextSpin.current) {
                triggerNextSpin.current = false;
                const timer = setTimeout(() => {
                    setFreeSpins(prev => prev - 1);
                    spin();
                }, 1000);
                timeoutsRef.current.push(timer);
            } else if (freeSpins <= 0) {
                // End of Bonus - Fixed: Removed !triggerNextSpin.current check which caused soft-lock
                setIsFreeSpinMode(false);
                setGlobalFreeSpinMult(0);
                triggerNextSpin.current = false;
                toast.info(`Fin del Modo Dios. Ganancia: ${formatCurrency(totalFreeSpinWin)}`);
            }
        }
    }, [isFreeSpinMode, gameState, freeSpins, spin, totalFreeSpinWin]);


    const processGrid = async (currentGrid: GridCell[][]) => {
        setGameState('CASCADING');

        // 1. Analyze Matches
        const counts: Record<string, GridCell[]> = {};
        let scatters = 0;
        let roundMultValues = 0;

        const allCells = currentGrid.flat();
        allCells.forEach(cell => {
            if (cell.symbol === 'scatter') scatters++;
            else if (cell.symbol === 'mult') roundMultValues += (cell.multValue || 0);
            else {
                if (!counts[cell.symbol]) counts[cell.symbol] = [];
                counts[cell.symbol].push(cell);
            }
        });

        // 2. Identify Winners & Lines
        const winningIds = new Set<string>();
        const newWinningGroups: { points: { x: number, y: number }[], color: string }[] = [];
        let stepWin = 0;

        Object.entries(counts).forEach(([sym, cells]) => {
            if (SYMBOLS[sym] && cells.length >= MIN_MATCH) {
                cells.forEach(c => winningIds.add(c.id));

                // Calculate Centers for Lines (0-100 scale relative to grid container)
                // Col width ~= 100/6 %, Row height ~= 100/5 %
                // Center X = (colIndex + 0.5) * (100/6)
                // Center Y = (rowIndex + 0.5) * (100/5)
                const points = cells.map(c => ({
                    x: (c.colIndex + 0.5) * (100 / GRID_COLS),
                    y: (c.rowIndex + 0.5) * (100 / GRID_ROWS)
                }));
                // Sort by X then Y to make drawing cleaner
                points.sort((a, b) => a.x - b.x || a.y - b.y);

                newWinningGroups.push({
                    points,
                    color: getSymbolColor(sym)
                });

                const s = SYMBOLS[sym];
                let multiplier = s.payouts[0];
                if (cells.length >= 12) multiplier = s.payouts[2];
                else if (cells.length >= 10) multiplier = s.payouts[1];
                else multiplier = s.payouts[0];
                stepWin += bet * multiplier;
            }
        });

        if (stepWin > 0) {
            // SHOW WINS
            setWinningGroups(newWinningGroups);
            playSound.win();
            setRoundWin(prev => prev + stepWin);
            setCurrentWinText(`+${formatCurrency(stepWin)}`);

            // Dramatic Effect if Big Win
            if (stepWin > bet * 10) triggerShake('light');

            // Wait for visual confirmation (Lines + Highlight)
            await new Promise(resolve => safeSetTimeout(() => resolve(true), EXPLOSION_DURATION * 1000));
            setWinningGroups([]); // Clear lines

            // 3. Cascade Logic
            const nextGrid = currentGrid.map((col, cIndex) => {
                const kept = col.filter(cell => !winningIds.has(cell.id));
                const missing = GRID_ROWS - kept.length;
                // Add new cells at top
                const newCells = Array.from({ length: missing }).map((_, i) => getRandomSymbol(cIndex, i, anteBet));
                // Remap row indices for kept cells
                const remappedKept = kept.map((cell, i) => ({ ...cell, rowIndex: missing + i }));

                // New cells go to 0..missing-1.
                // Kept cells go to missing..ROWS-1.
                const newCellsWithPos = newCells.map((c, i) => ({ ...c, rowIndex: i }));

                return [...newCellsWithPos, ...remappedKept];
            });

            setGrid(nextGrid);
            safeSetTimeout(() => processGrid(nextGrid), DELAY_BETWEEN_CASCADES);

        } else {
            // NO MORE WINS
            finalizeRound(roundWin, scatters, roundMultValues);
        }
    };

    const getSymbolColor = (sym: string) => {
        // Map symbol names to a consistent color for SVG lines
        if (sym === 'shape_circle') return '#3b82f6'; // blue
        if (sym === 'shape_square') return '#22c55e'; // green
        if (sym === 'shape_triangle') return '#a855f7'; // purple
        if (sym === 'shape_hex') return '#ec4899'; // pink
        if (sym === 'shape_gem') return '#ef4444'; // red
        if (sym === 'relic_mouse') return '#fde047'; // yellow-300
        if (sym === 'relic_battery') return '#67e8f9'; // cyan-300
        if (sym === 'relic_crown') return '#fbbf24'; // amber-400
        return '#ffffff'; // Default white
    };

    const finalizeRound = async (totalWin: number, scatters: number, roundMultValues: number) => {
        setGameState('RESOLVING');
        let finalPayout = totalWin;
        let appliedMult = 0;

        // --- GOD MODE MULTIPLIER LOGIC ---
        // 1. Accumulate Multipliers animation (if any)
        if (roundMultValues > 0 && totalWin > 0) {
            // Visual wait for orb collection
            await new Promise(resolve => safeSetTimeout(() => resolve(true), 600));

            if (isFreeSpinMode) {
                setGlobalFreeSpinMult(prev => prev + roundMultValues);
                // "Broken" Mechanic: Add Local to Global, THEN Apply Global
                // This scaling is exponential if user gets lucky.
                appliedMult = globalFreeSpinMult + roundMultValues;
                finalPayout = totalWin * appliedMult;

                // Shake heavy if mult applied is huge
                if (appliedMult > 50) triggerShake('heavy');
            } else {
                appliedMult = roundMultValues;
                finalPayout = totalWin * appliedMult;
                if (appliedMult > 20) triggerShake('heavy');
            }

            toast.success(`¡X${appliedMult}!`);
            playSound.jackpot();
            setTotalMult(appliedMult);

            // Dramactic Pause after multiplier hit
            await new Promise(resolve => safeSetTimeout(() => resolve(true), 1000));
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
            triggerShake('heavy');
            if (!isFreeSpinMode) {
                toast.success("⚡ 15 GIROS GRATIS ⚡");
                setIsFreeSpinMode(true);
                setFreeSpins(15);
                setGlobalFreeSpinMult(0);
                triggerNextSpin.current = true; // Start loop
            } else {
                toast.success("⚡ RETRIGGER: +5 GIROS ⚡");
                setFreeSpins(prev => prev + 5);
            }
        } else if (isFreeSpinMode) {
            triggerNextSpin.current = true; // Continue loop
        }

        recordGameResult('gates_god_mode', {
            win: finalPayout,
            bet: anteBet ? bet * 1.25 : bet,
            custom: { multiplier: appliedMult }
        });

        setGameState('IDLE');
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
            <div className="z-10 w-full flex justify-between items-center mb-6 px-4 py-2 bg-black/20 rounded-xl backdrop-blur-sm border border-white/5">
                <div className="flex items-center gap-2">
                    <Zap className="text-amber-500 fill-amber-500" />
                    <h1 className="text-2xl font-black italic text-amber-400">GATES OF CLICKER</h1>
                </div>
                <div className="text-2xl font-mono font-bold text-green-400">
                    {currentWinText || formatCurrency(roundWin)}
                </div>
            </div>

            <div className="flex flex-col lg:flex-row gap-8 w-full z-10">

                {/* LEFT PANEL: STATS & CONTROLS */}
                <div className="w-full lg:w-72 flex flex-col gap-6 order-2 lg:order-1">

                    {/* STATS CARD */}
                    <div className={cn(
                        "rounded-3xl p-6 border-2 relative overflow-hidden flex flex-col items-center justify-center min-h-[160px] transition-colors",
                        isFreeSpinMode ? "bg-purple-900/50 border-purple-500" : "bg-black/40 border-amber-900/40"
                    )}>
                        {isFreeSpinMode ? (
                            <>
                                <span className="text-white font-bold text-lg animate-pulse">GIROS GRATIS</span>
                                <span className="text-6xl font-black text-white">{freeSpins}</span>
                                <div className="w-full h-px bg-white/20 my-2"></div>
                                <span className="text-amber-400 font-bold">MULT GLOBAL: x{globalFreeSpinMult}</span>
                            </>
                        ) : (
                            <>
                                <span className="text-gray-500 text-sm font-bold">MULTIPLICADOR</span>
                                <span className={cn("text-5xl font-black", totalMult > 0 ? "text-amber-400" : "text-gray-600")}>
                                    x{totalMult}
                                </span>
                            </>
                        )}
                    </div>

                    {/* ANTE BET */}
                    <button
                        onClick={() => gameState === 'IDLE' && setAnteBet(!anteBet)}
                        className={cn(
                            "relative p-4 rounded-xl border-2 transition-all flex items-center justify-between group",
                            anteBet ? "bg-amber-900/30 border-amber-500" : "bg-white/5 border-white/10 hover:border-white/20"
                        )}
                    >
                        <div className="flex flex-col items-start">
                            <span className="font-bold text-white text-sm">DOBLE PROBABILIDAD</span>
                            <span className="text-xs text-gray-400">Mas Scatters (+25% Coste)</span>
                        </div>
                        <div className={cn("w-6 h-6 rounded-full border flex items-center justify-center", anteBet ? "bg-green-500 border-green-500" : "border-gray-500")}>
                            {anteBet && <Zap size={14} className="text-white fill-white" />}
                        </div>
                    </button>

                    {/* BET SELECTOR */}
                    <div className="grid grid-cols-3 gap-2">
                        {bets.map(b => (
                            <button
                                key={b}
                                onClick={() => setBet(b)}
                                disabled={gameState !== 'IDLE' && !isFreeSpinMode}
                                className={cn(
                                    "py-2 rounded-lg text-xs font-bold border transition-colors",
                                    bet === b ? "bg-amber-600 border-amber-400 text-white" : "bg-white/5 border-transparent text-gray-500 hover:bg-white/10"
                                )}
                            >
                                {b >= 1000000 ? (b / 1000000) + 'M' : (b / 1000) + 'k'}
                            </button>
                        ))}
                    </div>
                </div>

                {/* GAME GRID (CENTER) */}
                <div className="flex-1 relative order-1 lg:order-2 select-none">
                    <div className="relative aspect-[6/5] w-full bg-[#16121d] rounded-xl border-[4px] border-amber-800/50 shadow-2xl p-2 overflow-hidden">

                        {/* WINNING LINES SVG OVERLAY */}
                        <svg className="absolute inset-0 w-full h-full z-20 pointer-events-none">
                            <AnimatePresence>
                                {winningGroups.map((group, i) => (
                                    <motion.g key={i}
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                    >
                                        <path
                                            d={`M ${group.points.map(p => `${p.x} ${p.y}`).join(' L ')}`}
                                            fill="none"
                                            stroke={group.color}
                                            strokeWidth="1.5"
                                            strokeOpacity="0.8"
                                            filter="url(#glow)"
                                        />
                                        {group.points.map((p, j) => (
                                            <circle key={j} cx={p.x} cy={p.y} r="1.5" fill={group.color} />
                                        ))}
                                    </motion.g>
                                ))}
                            </AnimatePresence>
                            <defs>
                                <filter id="glow">
                                    <feGaussianBlur stdDeviation="2" result="coloredBlur" />
                                    <feMerge>
                                        <feMergeNode in="coloredBlur" />
                                        <feMergeNode in="SourceGraphic" />
                                    </feMerge>
                                </filter>
                            </defs>
                        </svg>

                        <div className="grid grid-cols-6 gap-1 h-full relative z-10 perspective-1000">
                            {grid.map((col, cIndex) => (
                                <div key={cIndex} className="flex flex-col gap-1 h-full">
                                    <AnimatePresence mode='popLayout'>
                                        {col.map((cell) => {
                                            const asset = SYMBOLS[cell.symbol];
                                            const isMult = cell.symbol === 'mult';
                                            const isScatter = cell.symbol === 'scatter';
                                            const isWin = winningGroups.some(g => g.points.some(p => Math.abs(p.x - (cIndex + 0.5) * (100 / GRID_COLS)) < 1 && Math.abs(p.y - (cell.rowIndex + 0.5) * (100 / GRID_ROWS)) < 1));

                                            return (
                                                <motion.div
                                                    layout
                                                    key={cell.id}
                                                    initial={{ y: -500, opacity: 0, scale: 0.5 }}
                                                    animate={{
                                                        y: 0,
                                                        opacity: 1,
                                                        scale: isWin ? 1.1 : 1,
                                                        filter: isWin ? 'brightness(1.5)' : 'none',
                                                        zIndex: isWin ? 50 : 0
                                                    }}
                                                    exit={{ scale: 0, opacity: 0, filter: 'brightness(3)' }}
                                                    transition={{ type: "spring", bounce: 0.2, duration: 0.5 }}
                                                    className={cn(
                                                        "flex-1 rounded-lg flex items-center justify-center relative",
                                                        isMult ? "" : "bg-[#1f1a29]" // Dark cell bg
                                                    )}
                                                >
                                                    {isScatter && <span className="text-4xl animate-bounce">{ZEUS_HEAD}</span>}
                                                    {isMult && (
                                                        <div className={cn(
                                                            "w-10 h-10 rounded-full flex items-center justify-center border-2 border-white font-black text-xs text-white shadow-lg",
                                                            MULTIPLIER_ORBS.find(o => o.value === cell.multValue)?.color
                                                        )}>
                                                            {cell.multValue}x
                                                        </div>
                                                    )}
                                                    {asset && (
                                                        <div className={cn("transition-transform", asset.color)}>
                                                            <asset.icon
                                                                size={32}
                                                                strokeWidth={isWin ? 3 : 2}
                                                                className={cn(isWin ? "animate-pulse drop-shadow-[0_0_10px_currentColor]" : "")}
                                                            />
                                                        </div>
                                                    )}
                                                </motion.div>
                                            );
                                        })}
                                    </AnimatePresence>
                                </div>
                            ))}
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
                        "w-full h-16 rounded-full font-black text-xl tracking-widest uppercase shadow-xl flex items-center justify-center gap-2",
                        gameState !== 'IDLE'
                            ? "bg-gray-800 text-gray-500 cursor-not-allowed"
                            : "bg-gradient-to-b from-green-500 to-green-700 text-white hover:brightness-110 active:scale-95"
                    )}
                >
                    {isFreeSpinMode ? (
                        <span>AUTO-SPIN ({freeSpins})</span>
                    ) : (
                        gameState === 'IDLE' ? "GIRAR" : "JUGANDO..."
                    )}
                </button>
            </div>
        </div>
    );
}
