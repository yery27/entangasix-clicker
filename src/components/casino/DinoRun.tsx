import { useState, useEffect, useRef } from 'react';
import { useGameStore } from '../../stores/gameStore';
import { toast } from 'sonner';
import { formatCurrency } from '../../lib/utils';
import { Footprints, Flame } from 'lucide-react';
import { playSound, setMuted } from '../../lib/soundManager'; // Added import

/* --- CONSTANTS --- */
const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 300;
const DINO_SIZE = 40;
const GROUND_Y = 250;
const GRAVITY = 0.6;
const JUMP_FORCE = -12;
const SPEED_INITIAL = 5;
const SPEED_INCREMENT = 0.001;

export function DinoRun() {
    const { coins, removeCoins, addCoins, soundEnabled } = useGameStore(); // Added soundEnabled

    // Config
    const [bet, setBet] = useState(100);

    // Game State
    const [gameState, setGameState] = useState<'betting' | 'running' | 'crashed' | 'cashed_out'>('betting');
    const [multiplier, setMultiplier] = useState(1.0);
    const canvasRef = useRef<HTMLCanvasElement>(null);

    // Game Loop Refs
    const requestRef = useRef<number>(0);
    const dinoRef = useRef({ x: 50, y: GROUND_Y - DINO_SIZE, vy: 0, grounded: true });
    const obstaclesRef = useRef<{ x: number, type: 'cactus' | 'meteor' }[]>([]);
    const speedRef = useRef(SPEED_INITIAL);
    const distanceRef = useRef(0);
    const meteorRef = useRef<{ x: number, y: number } | null>(null);
    const lastTimeRef = useRef<number>(0);

    // Score tracking for coin sound
    const lastCoinSoundMultiplierRef = useRef(1.0);

    // Sync mute
    useEffect(() => {
        setMuted(!soundEnabled);
    }, [soundEnabled]);

    // --- GAME LOOP ---
    useEffect(() => {
        return () => cancelAnimation();
    }, []);

    const cancelAnimation = () => {
        if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };

    const startGame = () => {
        if (coins < bet) return toast.error("Sin saldo suficiente");
        removeCoins(bet);
        playSound.click(); // Added sound

        // Reset State
        setGameState('running');
        setMultiplier(1.0);
        dinoRef.current = { x: 50, y: GROUND_Y - DINO_SIZE, vy: 0, grounded: true };
        obstaclesRef.current = [];
        speedRef.current = SPEED_INITIAL; // Reset to 5
        distanceRef.current = 0;
        meteorRef.current = null;
        lastTimeRef.current = performance.now(); // Init time
        lastCoinSoundMultiplierRef.current = 1.0; // Reset coin sound tracker

        requestRef.current = requestAnimationFrame(update);
    };

    const jump = () => {
        if (gameState !== 'running') return;
        if (dinoRef.current.grounded) {
            dinoRef.current.vy = JUMP_FORCE; // Impulse is instant, no dt
            dinoRef.current.grounded = false;
            playSound.jump(); // Added sound
        }
    };

    // Handle Spacebar
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.code === 'Space') jump();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [gameState]);

    const update = (time: number) => {
        const dt = Math.min((time - lastTimeRef.current) / 16.66, 2); // Delta time normalized to 60fps (1 = 16ms), capped at 2x to prevent huge skips
        lastTimeRef.current = time;

        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (!canvas || !ctx) return;

        // Clear
        ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

        // --- UPDATE LOGIC ---

        // Dino Physics
        dinoRef.current.vy += GRAVITY * dt;
        dinoRef.current.y += dinoRef.current.vy * dt;

        // Ground Collision
        if (dinoRef.current.y >= GROUND_Y - DINO_SIZE) {
            dinoRef.current.y = GROUND_Y - DINO_SIZE;
            dinoRef.current.vy = 0;
            dinoRef.current.grounded = true;
        }

        // Distance & Speed
        speedRef.current += (SPEED_INCREMENT * dt);
        const currentSpeed = speedRef.current;
        distanceRef.current += (currentSpeed * dt);

        // Multiplier based on distance
        const newMult = 1 + (distanceRef.current / 1000);
        const roundedNewMult = parseFloat(newMult.toFixed(2));
        setMultiplier(roundedNewMult);

        // Play coin sound for every 1.0x multiplier milestone
        if (Math.floor(roundedNewMult) > Math.floor(lastCoinSoundMultiplierRef.current)) {
            playSound.coin(); // Added sound
            lastCoinSoundMultiplierRef.current = roundedNewMult;
        }


        // Spawn Obstacles (Cactus) - Chance adjusted for dt?
        // Basic chance per frame is bad. Use distance or interval?
        // Simple fix: Chance * dt
        if (Math.random() < 0.015 * dt) {
            const lastObs = obstaclesRef.current[obstaclesRef.current.length - 1];
            if (!lastObs || (CANVAS_WIDTH - lastObs.x > 300)) {
                obstaclesRef.current.push({ x: CANVAS_WIDTH, type: 'cactus' });
            }
        }

        // Meteor - Adjusted chance
        if (Math.random() < 0.005 * dt && !meteorRef.current) {
            meteorRef.current = { x: CANVAS_WIDTH, y: GROUND_Y - DINO_SIZE * 2 };
        }

        // Move Obstacles
        obstaclesRef.current.forEach(obs => obs.x -= currentSpeed * dt);
        obstaclesRef.current = obstaclesRef.current.filter(obs => obs.x > -50);

        // Move Meteor
        if (meteorRef.current) {
            meteorRef.current.x -= (currentSpeed * 1.5 * dt);
            if (meteorRef.current.x < -50) meteorRef.current = null;
        }

        // Collision Check (Simple AABB)
        const dinoRect = { x: dinoRef.current.x + 10, y: dinoRef.current.y + 10, w: DINO_SIZE - 20, h: DINO_SIZE - 20 };

        for (const obs of obstaclesRef.current) {
            if (
                dinoRect.x < obs.x + 30 &&
                dinoRect.x + dinoRect.w > obs.x &&
                dinoRect.y < GROUND_Y &&
                dinoRect.y + dinoRect.h > GROUND_Y - 40
            ) {
                handleCrash();
                return;
            }
        }

        if (meteorRef.current) {
            if (
                dinoRect.x < meteorRef.current.x + 40 &&
                dinoRect.x + dinoRect.w > meteorRef.current.x &&
                dinoRect.y < meteorRef.current.y + 40 &&
                dinoRect.y + dinoRect.h > meteorRef.current.y
            ) {
                handleCrash();
                return;
            }
        }

        // --- DRAW ---
        // Ground
        ctx.fillStyle = '#3e2723';
        ctx.fillRect(0, GROUND_Y, CANVAS_WIDTH, CANVAS_HEIGHT - GROUND_Y);

        // Dino
        ctx.fillStyle = '#4ade80';
        ctx.fillRect(dinoRef.current.x, dinoRef.current.y, DINO_SIZE, DINO_SIZE);
        ctx.fillStyle = 'black';
        ctx.fillRect(dinoRef.current.x + 25, dinoRef.current.y + 5, 5, 5);

        // Obstacles
        ctx.fillStyle = '#166534';
        obstaclesRef.current.forEach(obs => {
            ctx.fillRect(obs.x, GROUND_Y - 40, 30, 40);
        });

        // Meteor
        if (meteorRef.current) {
            ctx.fillStyle = '#ef4444';
            ctx.beginPath();
            ctx.arc(meteorRef.current.x + 20, meteorRef.current.y + 20, 20, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = 'orange';
            ctx.fillRect(meteorRef.current.x + 40, meteorRef.current.y + 10, 30, 10);
        }

        requestRef.current = requestAnimationFrame(update);
    };

    const handleCrash = () => {
        setGameState('crashed');
        cancelAnimation();
        toast.error("¡TE ALCANZÓ EL METEORITO!", { icon: <Flame className="text-red-500" /> });
        playSound.loss(); // Added sound
    };

    const cashOut = () => {
        if (gameState !== 'running') return;
        setGameState('cashed_out');
        cancelAnimation();
        const win = Math.floor(bet * multiplier);
        addCoins(win);
        toast.success(`VICTORIA: ${formatCurrency(win)} `);
    };

    return (
        <div className="flex flex-col md:flex-row gap-6 max-w-6xl mx-auto h-full min-h-[500px]">
            {/* --- CONTROLS --- */}
            <div className="w-full md:w-72 bg-[#1a2e1a] p-6 rounded-3xl border border-white/10 flex flex-col gap-6 shadow-xl z-20">
                <div className="mt-4">
                    <label className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-2 block">Apuesta</label>
                    <div className="bg-black/40 border border-white/10 rounded-xl p-4 flex justify-between items-center">
                        <button onClick={() => setBet(Math.max(10, bet - 100))} disabled={gameState === 'running'} className="w-8 h-8 rounded bg-white/5 hover:bg-white/10 text-white font-bold disabled:opacity-30">-</button>
                        <span className="text-xl font-mono font-bold text-green-400">{formatCurrency(bet)}</span>
                        <button onClick={() => setBet(coins >= bet + 100 ? bet + 100 : bet)} disabled={gameState === 'running'} className="w-8 h-8 rounded bg-white/5 hover:bg-white/10 text-white font-bold disabled:opacity-30">+</button>
                    </div>
                </div>

                <div className="mt-auto">
                    {gameState === 'running' ? (
                        <button
                            onClick={cashOut}
                            className="w-full py-6 bg-yellow-500 hover:bg-yellow-400 text-black font-black text-2xl rounded-2xl shadow-[0_0_40px_rgba(234,179,8,0.4)] transition-all active:scale-95 flex flex-col items-center leading-none gap-2 animate-pulse"
                        >
                            <span>RETIRAR</span>
                            <span className="text-base opacity-80 font-mono">{formatCurrency(Math.floor(bet * multiplier))}</span>
                        </button>
                    ) : (
                        <button
                            onClick={startGame}
                            className="w-full py-6 bg-green-600 hover:bg-green-500 text-white font-black text-2xl rounded-2xl shadow-[0_0_40px_rgba(22,163,74,0.4)] transition-all active:scale-95"
                        >
                            CORRER
                        </button>
                    )}
                </div>
            </div>

            {/* --- CANVAS --- */}
            <div className="flex-1 bg-[#87ceeb] rounded-3xl relative overflow-hidden border-4 border-[#1a2e1a] shadow-inner flex flex-col">
                <div className="absolute top-4 right-6 text-6xl font-black text-white drop-shadow-lg z-10 font-mono">
                    {multiplier.toFixed(2)}x
                </div>

                {/* Instructions Overlay */}
                {gameState === 'betting' && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm z-20 pointer-events-none">
                        <div className="text-center text-white">
                            <h2 className="text-4xl font-black mb-2 flex items-center justify-center gap-3"><Footprints size={40} /> DINO RUN</h2>
                            <p className="text-xl font-bold">Usa [ESPACIO] o Clic para saltar</p>
                            <p className="text-sm opacity-80">Corre, esquiva meteoritos y retírate antes de morir.</p>
                        </div>
                    </div>
                )}

                {/* Click area to jump for Mobile/Mouse users */}
                <canvas
                    ref={canvasRef}
                    width={CANVAS_WIDTH}
                    height={CANVAS_HEIGHT}
                    className="w-full h-full cursor-pointer"
                    style={{ objectFit: 'contain' }} // Maintain aspect ratio without cropping
                    onClick={jump}
                />
            </div>
        </div>
    );
}
