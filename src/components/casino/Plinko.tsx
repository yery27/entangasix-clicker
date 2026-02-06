import { useState, useRef, useEffect } from 'react';
import { useGameStore } from '../../stores/gameStore';
import { toast } from 'sonner';
import { formatCurrency } from '../../lib/utils';
import { playSound, setMuted } from '../../lib/soundManager';
import { Info } from 'lucide-react';

/* --- CONSTANTS --- */
// Canvas Dimensions
const WIDTH = 800;
const HEIGHT = 600;
const PADDING_TOP = 50;

// Game Config
const ROWS = 12; // As requested
const PIN_RADIUS = 6;
const BALL_RADIUS = 8;
const PIN_SPACING = 55; // Horizontal spacing

// Physics Config
const GRAVITY = 0.25;      // Gravity
const FRICTION = 0.99;     // Air resistance
const RESTITUTION = 0.6;   // Bounciness (lower = lose more energy)
const X_BIAS = 0.15;       // <--- CRITICAL: Force applied on pin hit to push away from center

// Multipliers & Colors
const MULTIPLIERS = [10, 5, 2, 0.5, 0.2, 0.2, 0.5, 2, 5, 10];
const BIN_COLORS = [
    '#dc2626', // x10 - Red
    '#f97316', // x5 - Orange
    '#fbbf24', // x2 - Amber
    '#3b82f6', // x0.5 - Blue
    '#3b82f6', // x0.2 - Blue
    '#3b82f6', // x0.2 - Blue
    '#3b82f6', // x0.5 - Blue
    '#fbbf24', // x2 - Amber
    '#f97316', // x5 - Orange
    '#dc2626', // x10 - Red
];

interface Ball {
    id: number;
    x: number;
    y: number;
    vx: number;
    vy: number;
    value: number; // Bet amount for this ball
    finished: boolean;
    color: string;
}

interface Pin {
    x: number;
    y: number;
}

export function Plinko() {
    const { coins, removeCoins, addCoins, soundEnabled } = useGameStore();

    // State
    const [bet, setBet] = useState(100);
    const [lastWin, setLastWin] = useState<{ amount: number; mult: number } | null>(null);

    // Refs
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const ballsRef = useRef<Ball[]>([]);
    const pinsRef = useRef<Pin[]>([]);
    const reqIdRef = useRef<number>(0);
    const binsRef = useRef<{ x: number, width: number, val: number, color: string }[]>([]);

    // Effects
    useEffect(() => {
        setMuted(!soundEnabled);
    }, [soundEnabled]);

    // Initialize Geometry
    useEffect(() => {
        // Create Pins (Pyramid)
        const newPins: Pin[] = [];
        // Rows 0..ROWS-1
        // Row 0 has 3 pins, Row 1 has 4...
        // Wait, standard plinko: Row 0 has 3 holes -> 2 pins?
        // Let's use: Row 0 = 3 pins.

        for (let row = 0; row < ROWS; row++) {
            const cols = row + 3;
            const rowWidth = (cols - 1) * PIN_SPACING;
            const startX = (WIDTH - rowWidth) / 2;
            const y = PADDING_TOP + row * 40;

            for (let col = 0; col < cols; col++) {
                newPins.push({
                    x: startX + col * PIN_SPACING,
                    y: y
                });
            }
        }
        pinsRef.current = newPins;

        // Initialize Bins (at bottom)
        const binCount = MULTIPLIERS.length;
        // The last row of pins determines the width
        // const lastRowCols = ROWS + 2; // ROWS-1 + 3 = 11 + 3 = 14? 
        // Let's match bins to the gaps of the last row.
        // Last row index = ROWS-1. Cols = ROWS-1 + 3 = ROWS+2.
        // Gaps = Cols - 1 = ROWS+1.
        // We have 12 Rows. 
        // Row 0: 3 pins (2 gaps)
        // ...
        // Row 11: 14 pins (13 gaps)
        // Constant MULTIPLIERS length is 10.
        // We need 10 bins. 
        // Let's adjust geometry slightly or just fit bins to width.
        // Let's assume standard pyramid growth: pins(r) = 3 + r
        // pins(11) = 14.
        // The balls fall into the gaps between the last pins? Or below?
        // Typically bins are below the last pins.

        // Let's align bins exactly under the 10 central gaps of the standard board, 
        // or just divide the total width of the bottom row.


        // We have 10 bins, but 13 gaps if we follow straight pyramid.
        // Let's scale the bins to fit the "active area" where balls fall.
        // Balls usually fall within the pyramid bounds.
        // Let's just make 10 bins span the expected width.
        const binWidth = PIN_SPACING; // Keep consistent
        // Center the 10 bins
        const totalBinWidth = binCount * binWidth;
        const binStartX = (WIDTH - totalBinWidth) / 2;

        const bins = [];
        for (let i = 0; i < binCount; i++) {
            bins.push({
                x: binStartX + i * binWidth,
                width: binWidth,
                val: MULTIPLIERS[i],
                color: BIN_COLORS[i]
            });
        }
        binsRef.current = bins;

    }, []);

    // Game Loop
    const update = () => {
        if (!canvasRef.current) return;
        const ctx = canvasRef.current.getContext('2d');
        if (!ctx) return;

        // Clear
        ctx.clearRect(0, 0, WIDTH, HEIGHT);

        // --- PHYSICS ---
        ballsRef.current.forEach(ball => {
            if (ball.finished) return;

            // Apply forces
            ball.vy += GRAVITY;
            ball.vx *= FRICTION;
            ball.vy *= FRICTION;

            // Move
            ball.x += ball.vx;
            ball.y += ball.vy;

            // Pin Collisions
            for (const pin of pinsRef.current) {
                const dx = ball.x - pin.x;
                const dy = ball.y - pin.y;
                const distSq = dx * dx + dy * dy;
                const minDist = PIN_RADIUS + BALL_RADIUS;

                if (distSq < minDist * minDist) {
                    // HIT!
                    playSound.plink(); // Use a very short sound preferably

                    const angle = Math.atan2(dy, dx);
                    const speed = Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy);

                    // Reflect
                    // Simple "push out" logic + velocity redirect
                    const pushFactor = 0.5; // Prevent sticking
                    ball.x = pin.x + Math.cos(angle) * (minDist + pushFactor);
                    ball.y = pin.y + Math.sin(angle) * (minDist + pushFactor);

                    // New Velocity with Restitution
                    // We want to randomize x a bit to avoid "perfect stacking"
                    // AND apply the BIAS user requested.

                    // Bias calculation:
                    // If ball is to the left of center, push left. Right, push right.
                    const centerX = WIDTH / 2;
                    const side = ball.x < centerX ? -1 : 1;
                    // stronger bias if further out?
                    // The user wants "Probability of ends significantly higher".

                    // We add a horizontal force on every bounce.
                    const biasForce = side * X_BIAS;
                    // Random noise
                    const noise = (Math.random() - 0.5) * 1.5;

                    ball.vx = (Math.cos(angle) * speed * RESTITUTION) + biasForce + noise;
                    ball.vy = Math.sin(angle) * speed * RESTITUTION;

                    // Ensure it falls down eventually
                    if (ball.vy < 0.5 && ball.y < pin.y) ball.vy += 1;
                }
            }

            // Bin Collisions (Bottom)
            // Just check Y threshold
            const bottomThreshold = HEIGHT - 50;
            if (ball.y > bottomThreshold && !ball.finished) {
                // Find which bin
                const bin = binsRef.current.find(b => ball.x >= b.x && ball.x < b.x + b.width);
                if (bin) {
                    finishBall(ball, bin.val);
                } else {
                    // Missed bins? (should be rare if geometry matches)
                    // Treat as 0 or refund? Let's assume 0.2 (min loss) or edge case (0).
                    // If it falls off screen side, kill it.
                    ball.finished = true;
                }
            }

            // Kill bounds
            if (ball.y > HEIGHT || ball.x < 0 || ball.x > WIDTH) {
                ball.finished = true;
            }
        });

        // Cleanup finished balls
        ballsRef.current = ballsRef.current.filter(b => !b.finished);

        // --- DRAW ---

        // Draw Pins
        ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
        pinsRef.current.forEach(pin => {
            ctx.beginPath();
            ctx.arc(pin.x, pin.y, PIN_RADIUS, 0, Math.PI * 2);
            ctx.fill();
        });

        // Draw Bins
        binsRef.current.forEach(bin => {
            ctx.fillStyle = bin.color;
            // Draw rounded rect or simple rect
            ctx.globalAlpha = 0.2;
            ctx.fillRect(bin.x + 2, HEIGHT - 60, bin.width - 4, 40);

            ctx.globalAlpha = 1;
            ctx.fillStyle = '#fff';
            ctx.font = 'bold 12px monospace';
            ctx.textAlign = 'center';
            ctx.fillText(`${bin.val}x`, bin.x + bin.width / 2, HEIGHT - 35);
        });

        // Draw Balls
        ballsRef.current.forEach(ball => {
            ctx.beginPath();
            ctx.arc(ball.x, ball.y, BALL_RADIUS, 0, Math.PI * 2);
            ctx.fillStyle = ball.color;
            ctx.fill();
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 1;
            ctx.stroke();
        });

        reqIdRef.current = requestAnimationFrame(update);
    };

    const finishBall = (ball: Ball, mult: number) => {
        ball.finished = true;
        const win = Math.floor(ball.value * mult);

        if (win > 0) {
            addCoins(win);
            playSound.coin();
        } else {
            playSound.loss();
        }

        // Stats
        useGameStore.getState().recordGameResult('plinko', {
            win: win,
            bet: ball.value,
            custom: { balls: 1, multiplier: mult }
        });

        setLastWin({ amount: win, mult });

        // Visual Feedback (Toast or Floating Text)
        // Since we are in canvas, we might want DOM overlay for popups.
        if (mult >= 10) {
            toast.success(`¡JACKPOT! ${mult}x`, { description: `+${formatCurrency(win)}` });
            playSound.jackpot();
        }
    };

    useEffect(() => {
        reqIdRef.current = requestAnimationFrame(update);
        return () => cancelAnimationFrame(reqIdRef.current);
    }, []);


    const dropBall = () => {
        if (coins < bet) return toast.error(`Saldo insuficiente`);

        removeCoins(bet);
        playSound.click();

        // Horizontal randomization (-0.5 to 0.5px) for unpredictability
        // Standard start X is center
        const centerX = WIDTH / 2;
        const randX = (Math.random() - 0.5) * 4; // Use slightly more variance to ensure it hits pins differently

        const newBall: Ball = {
            id: Date.now() + Math.random(),
            x: centerX + randX,
            y: 20,
            vx: 0,
            vy: 0,
            value: bet,
            finished: false,
            color: `hsl(${Math.random() * 360}, 70%, 50%)`
        };

        ballsRef.current.push(newBall);
    };

    return (
        <div className="flex flex-col md:flex-row gap-6 max-w-6xl mx-auto h-full min-h-[700px]">
            {/* Sidebar */}
            <div className="w-full md:w-80 bg-[#162032] p-6 rounded-3xl border border-white/10 flex flex-col gap-6 shadow-xl z-20">
                <div className="flex items-center gap-2 mb-4">
                    <div className="w-10 h-10 rounded-full bg-cyan-500/20 flex items-center justify-center">
                        <span className="text-2xl">🎱</span>
                    </div>
                    <h2 className="text-2xl font-black text-white italic">PLINKO <span className="text-cyan-400">PRO</span></h2>
                </div>

                <div>
                    <label className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-2 block">Apuesta</label>
                    <div className="bg-black/40 border border-white/10 rounded-xl p-2 flex gap-2">
                        <div className="relative flex-1">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-cyan-400 font-bold">$</span>
                            <input
                                type="number"
                                value={bet}
                                onChange={(e) => setBet(Math.max(0, parseInt(e.target.value) || 0))}
                                className="w-full bg-black/40 border border-white/5 rounded-lg py-2 pl-6 pr-2 text-white font-mono focus:outline-none focus:border-cyan-500/50 transition-colors"
                            />
                        </div>
                        <button
                            onClick={() => setBet(coins)}
                            className="px-3 py-2 bg-cyan-600/20 text-cyan-400 text-xs font-bold rounded-lg hover:bg-cyan-600/30 border border-cyan-600/50 transition-colors"
                        >
                            MAX
                        </button>
                    </div>
                </div>

                <div className="p-4 bg-white/5 rounded-xl border border-white/5">
                    <div className="flex items-center gap-2 text-gray-400 text-xs mb-2">
                        <Info size={14} />
                        <span>Info del Juego</span>
                    </div>
                    <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                            <span className="text-gray-500">Filas</span>
                            <span className="font-bold text-white">{ROWS}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-500">Riesgo</span>
                            <span className="font-bold text-red-400">Alto (x10)</span>
                        </div>
                    </div>
                </div>

                {lastWin && (
                    <div className="mt-4 p-4 bg-green-500/10 border border-green-500/20 rounded-xl text-center animate-pulse">
                        <div className="text-xs text-green-400 uppercase font-bold tracking-widest">Último Pago</div>
                        <div className="text-3xl font-black text-white drop-shadow">{formatCurrency(lastWin.amount)}</div>
                        <div className="text-sm font-bold text-green-300">{lastWin.mult}x</div>
                    </div>
                )}

                <button
                    onClick={dropBall}
                    className="w-full py-8 mt-auto bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-black text-2xl rounded-2xl shadow-[0_0_30px_rgba(8,145,178,0.4)] transition-all active:scale-95 active:translate-y-1 border-t border-white/20"
                >
                    LANZAR BOLA 🟢
                </button>
            </div>

            {/* Game Area */}
            <div className="flex-1 bg-[#0f1523] rounded-3xl relative overflow-hidden flex flex-col items-center justify-center border-4 border-[#162032] shadow-2xl p-4">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_transparent_0%,_#000_100%)] opacity-50 pointer-events-none"></div>

                <canvas
                    ref={canvasRef}
                    width={WIDTH}
                    height={HEIGHT}
                    className="max-w-full h-auto object-contain drop-shadow-2xl"
                />
            </div>
        </div>
    );
}
