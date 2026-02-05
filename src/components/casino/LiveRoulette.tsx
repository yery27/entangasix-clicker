import { useState, useEffect, useRef } from 'react';
import { motion, useAnimation, AnimatePresence } from 'framer-motion';
import { useGameStore } from '../../stores/gameStore';
import { useAuthStore } from '../../stores/authStore';
import { toast } from 'sonner';
import { cn, formatCurrency } from '../../lib/utils';
import { Trash2, RotateCcw, Users, MessageSquare, Send } from 'lucide-react';
import { playSound, setMuted } from '../../lib/soundManager';
import { supabase } from '../../lib/supabase';

const ROUND_DURATION = 45000; // 45 seconds total round
const SPIN_DURATION = 8000; // 8 seconds spinning

interface RouletteUser {
    user_id: string;
    username: string;
    avatar_url: string;
    online_at: string;
}

interface ChatMessage {
    id: number;
    user_id: string;
    username: string;
    text: string;
    timestamp: string;
}

// Pseudo-random number generator
function mulberry32(a: number) {
    return function () {
        var t = a += 0x6D2B79F5;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    }
}

export function LiveRoulette() {
    const { coins, removeCoins, addCoins, soundEnabled } = useGameStore();
    const { user } = useAuthStore();

    // Sync mute
    useEffect(() => {
        setMuted(!soundEnabled);
    }, [soundEnabled]);

    const [timeLeft, setTimeLeft] = useState(0);
    const [gameState, setGameState] = useState<'BETTING' | 'SPINNING' | 'RESULT'>('BETTING');
    const [history, setHistory] = useState<number[]>([]);

    // Multiplayer State
    const [onlineUsers, setOnlineUsers] = useState<RouletteUser[]>([]);
    const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
    const [newMessage, setNewMessage] = useState('');

    // Betting
    const [chipValue, setChipValue] = useState(100);
    const [bets, setBets] = useState<Record<string, number>>({});
    const [previousBets, setPreviousBets] = useState<Record<string, number> | null>(null);
    const [lastWin, setLastWin] = useState<{ number: number, amount: number } | null>(null);

    const controls = useAnimation();
    const chatContainerRef = useRef<HTMLDivElement>(null);

    // Scroll to bottom of chat
    useEffect(() => {
        if (chatContainerRef.current) {
            chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
        }
    }, [chatMessages]);

    // --- SUPABASE REALTIME ---
    useEffect(() => {
        // if (!user) return; // Allow spectating

        const channel = supabase.channel('room_roulette')
            .on('presence', { event: 'sync' }, () => {
                const newState = channel.presenceState();
                const users = Object.values(newState).flat() as unknown as RouletteUser[];
                setOnlineUsers(users);
            })
            .on('broadcast', { event: 'chat' }, ({ payload }) => {
                setChatMessages(prev => [...prev.slice(-49), payload as ChatMessage]);
            })
            .subscribe(async (status) => {
                if (status === 'SUBSCRIBED' && user) {
                    const avatar = user.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.email}`;
                    await channel.track({
                        user_id: user.id,
                        username: user.username || user.email?.split('@')[0] || 'Anon',
                        avatar_url: avatar,
                        online_at: new Date().toISOString(),
                    });
                }
            });

        return () => {
            supabase.removeChannel(channel);
        };
    }, [user]);

    const sendMessage = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!newMessage.trim()) return;

        const msg: ChatMessage = {
            id: Date.now(),
            user_id: user?.id || 'anon',
            username: user?.username || 'Anon',
            text: newMessage.trim(),
            timestamp: new Date().toISOString(),
        };

        // Optimistic UI
        setChatMessages(prev => [...prev.slice(-49), msg]);
        setNewMessage('');

        // Broadcast
        await supabase.channel('room_roulette').send({
            type: 'broadcast',
            event: 'chat',
            payload: msg,
        });
    };

    // Standard European Roulette Order (Clockwise)
    const WHEEL_NUMBERS = [0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26];
    const RED_NUMBERS = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36];
    const totalBet = Object.values(bets).reduce((a, b) => a + b, 0);

    const hasSprunRef = useRef(false);

    // --- GAME LOOP ---
    useEffect(() => {
        const interval = setInterval(() => {
            const now = Date.now();
            const cycleTime = now % ROUND_DURATION;
            const remaining = ROUND_DURATION - cycleTime;

            // Logic States
            if (remaining > SPIN_DURATION + 2000) {
                // Betting Phase
                if (gameState !== 'BETTING') {
                    setGameState('BETTING');
                    setLastWin(null);
                    hasSprunRef.current = false;
                    controls.set({ rotate: 0 });
                }
            } else if (remaining <= SPIN_DURATION + 2000 && remaining > 2000) {
                // Spinning Phase
                if (gameState !== 'SPINNING') {
                    setGameState('SPINNING');
                    triggerSpin(now);
                }
            } else {
                // Result Phase
                if (gameState !== 'RESULT') {
                    setGameState('RESULT');
                }
            }
            setTimeLeft(Math.ceil(remaining / 1000));
        }, 100);

        return () => clearInterval(interval);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [gameState]);

    const triggerSpin = async (now: number) => {
        if (hasSprunRef.current) return;
        hasSprunRef.current = true;
        playSound.spin();

        // Deterministic Outcome
        const roundSeed = Math.floor(now / ROUND_DURATION);
        const rng = mulberry32(roundSeed);
        const randomIndex = Math.floor(rng() * WHEEL_NUMBERS.length);
        const winningNumber = WHEEL_NUMBERS[randomIndex];

        // Animation
        const sliceAngle = 360 / 37;
        const rotation = 1440 + (360 - (randomIndex * sliceAngle));

        await controls.start({
            rotate: rotation,
            transition: { duration: SPIN_DURATION / 1000, ease: [0.2, 0.8, 0.2, 1] }
        });

        checkWin(winningNumber);
    };

    const placeBet = (betId: string) => {
        if (gameState !== 'BETTING') {
            toast.error('¡Las apuestas están cerradas!');
            return;
        }
        if (coins < totalBet + chipValue) {
            toast.error('Sin fondos suficientes');
            return;
        }
        playSound.click();

        if (removeCoins(chipValue)) {
            setBets(prev => ({
                ...prev,
                [betId]: (prev[betId] || 0) + chipValue
            }));
        }
    };

    const clearBets = () => {
        if (gameState !== 'BETTING') return;
        // Refund
        const refund = Object.values(bets).reduce((a, b) => a + b, 0);
        addCoins(refund);
        setBets({});
        playSound.click();
    };

    const repeatBets = () => {
        if (gameState !== 'BETTING') return;
        if (!previousBets) return;
        const prevTotal = Object.values(previousBets).reduce((a, b) => a + b, 0);
        if (coins < prevTotal) {
            toast.error('Sin fondos para repetir');
            return;
        }
        if (removeCoins(prevTotal)) {
            setBets(previousBets);
            playSound.click();
        }
    };

    const doubleBets = () => {
        if (gameState !== 'BETTING') return;
        if (Object.keys(bets).length === 0) return;
        if (coins < totalBet) {
            toast.error('Sin fondos para doblar');
            return;
        }
        if (removeCoins(totalBet)) {
            setBets(prev => {
                const newBets: Record<string, number> = {};
                Object.entries(prev).forEach(([k, v]) => newBets[k] = v * 2);
                return newBets;
            });
            playSound.click();
        }
    };

    const checkWin = (outcome: number) => {
        setHistory(prev => [outcome, ...prev].slice(0, 10));
        setPreviousBets(bets);

        let totalWin = 0;
        const isRed = RED_NUMBERS.includes(outcome);
        const isBlack = !isRed && outcome !== 0;
        const isEven = outcome !== 0 && outcome % 2 === 0;
        const isOdd = outcome !== 0 && outcome % 2 !== 0;
        const isLow = outcome >= 1 && outcome <= 18;
        const isHigh = outcome >= 19 && outcome <= 36;

        const getDozen = (n: number) => n === 0 ? 0 : Math.ceil(n / 12);
        const getColumn = (n: number) => n === 0 ? 0 : (n % 3 === 0 ? 3 : n % 3);

        Object.entries(bets).forEach(([betId, amount]) => {
            let winMultiplier = 0;
            if (betId === `n-${outcome}`) winMultiplier = 36;
            else if (betId === 'red' && isRed) winMultiplier = 2;
            else if (betId === 'black' && isBlack) winMultiplier = 2;
            else if (betId === 'even' && isEven) winMultiplier = 2;
            else if (betId === 'odd' && isOdd) winMultiplier = 2;
            else if (betId === 'low' && isLow) winMultiplier = 2;
            else if (betId === 'high' && isHigh) winMultiplier = 2;
            else if (betId === `doz-${getDozen(outcome)}`) winMultiplier = 3;
            else if (betId === `col-${getColumn(outcome)}`) winMultiplier = 3;

            if (winMultiplier > 0) {
                totalWin += amount * winMultiplier;
            }
        });

        setBets({});

        if (totalWin > 0) {
            addCoins(totalWin);
            setLastWin({ number: outcome, amount: totalWin });
            playSound.win();
            toast.success(`¡GANASTE ${formatCurrency(totalWin)}!`, {
                description: `Salió ${outcome}`,
                duration: 5000
            });
        } else {
            if (totalBet > 0) playSound.loss();
        }
    };

    const formatChip = (amount: number) => amount >= 1000000 ? (amount / 1000000).toFixed(0) + 'M' : amount >= 1000 ? (amount / 1000).toFixed(0) + 'k' : amount;

    return (
        <div className="w-full flex flex-col xl:flex-row gap-6 max-w-7xl mx-auto px-2 pb-20 items-start">

            {/* --- MAIN GAME SECTION --- */}
            <div className="flex-1 w-full flex flex-col items-center">

                {/* --- LIVE HEADER --- */}
                <div className="w-full flex justify-between items-center bg-black/60 p-4 rounded-xl border border-white/10 mb-6 backdrop-blur-md">
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-red-600 animate-pulse" />
                            <span className="font-bold text-white tracking-wider">EN DIRECTO</span>
                        </div>
                        <div className="flex items-center gap-2 text-gray-400 text-sm">
                            <Users size={16} />
                            {onlineUsers.length} Online
                        </div>
                    </div>

                    <div className={cn(
                        "font-mono text-xl md:text-2xl font-black px-4 py-1 rounded bg-black/50 border min-w-[140px] text-center",
                        gameState === 'BETTING' ? "text-green-400 border-green-500/50" : "text-red-400 border-red-500/50"
                    )}>
                        {gameState === 'BETTING' ? `${timeLeft - 10}s` : gameState === 'SPINNING' ? 'GIRANDO' : 'RESULTADO'}
                    </div>
                </div>

                {/* History Bar */}
                <div className="w-full flex gap-2 mb-6 p-2 bg-black/40 rounded-full border border-white/10 overflow-x-auto scrollbar-hide">
                    {history.map((num, i) => (
                        <div key={i} className={cn(
                            "w-8 h-8 flex-shrink-0 rounded-full flex items-center justify-center text-xs font-bold border border-white/10 shadow-lg",
                            num === 0 ? "bg-green-600 text-white" : RED_NUMBERS.includes(num) ? "bg-red-600 text-white" : "bg-black text-white"
                        )}>
                            {num}
                        </div>
                    ))}
                </div>

                {/* --- WHEEL SECTION --- */}
                <div className="relative w-72 h-72 md:w-96 md:h-96 mb-8 flex items-center justify-center scale-90 md:scale-100">
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
                        <div className="absolute top-1/2 left-1/2 w-48 h-48 -ml-24 -mt-24 rounded-full border border-white/10 z-0"></div>
                        <div className="absolute top-1/2 left-1/2 w-20 h-20 -ml-10 -mt-10 bg-gradient-to-br from-amber-600 to-amber-900 rounded-full border-4 border-amber-400 shadow-[inset_0_2px_4px_rgba(255,255,255,0.3)] z-10 flex items-center justify-center">
                            <div className="w-12 h-12 bg-[#2c1a0e] rounded-full flex items-center justify-center">
                                <span className="text-amber-500 font-bold text-xs">LIVE</span>
                            </div>
                        </div>
                    </motion.div>
                </div>

                {/* --- CONTROLS + BOARD --- */}
                <div className={cn("transition-opacity duration-300 w-full flex flex-col items-center", gameState === 'BETTING' ? "opacity-100" : "opacity-50 pointer-events-none")}>

                    {/* Chips */}
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
                            <button onClick={repeatBets} disabled={!previousBets} className="w-12 h-12 rounded-full bg-purple-900/50 border border-purple-500/50 flex items-center justify-center hover:bg-purple-900 text-purple-200 disabled:opacity-30 disabled:cursor-not-allowed">
                                <RotateCcw size={18} />
                            </button>
                            <button onClick={clearBets} className="w-12 h-12 rounded-full bg-red-900/50 border border-red-500/50 flex items-center justify-center hover:bg-red-900 text-red-200">
                                <Trash2 size={18} />
                            </button>
                            <button onClick={doubleBets} className="w-12 h-12 rounded-full bg-blue-900/50 border border-blue-500/50 flex items-center justify-center hover:bg-blue-900 text-blue-200">
                                <span className="font-bold">x2</span>
                            </button>
                        </div>

                        <div className="bg-black/60 px-4 py-2 rounded-lg border border-white/10 font-mono text-yellow-400 min-w-[120px] text-center">
                            APUESTA: <span className="text-white">{formatCurrency(totalBet)}</span>
                        </div>
                    </div>

                    {/* BOARD */}
                    <div className="w-full flex items-center justify-center overflow-hidden py-2">
                        <div className="origin-center scale-[0.55] sm:scale-[0.65] md:scale-100 min-w-[750px] md:min-w-[800px] max-w-5xl bg-green-800 p-2 md:p-8 rounded-xl border-[8px] md:border-[12px] border-[#3e2723] shadow-2xl relative select-none">
                            <div className="grid grid-cols-[40px_repeat(12,1fr)_30px] md:grid-cols-[50px_repeat(12,1fr)_40px] grid-rows-[repeat(3,40px)_30px_30px] md:grid-rows-[repeat(3,60px)_50px_50px] gap-1 auto-cols-fr">

                                {/* ZERO */}
                                <div onClick={() => placeBet('n-0')} className="row-span-3 col-start-1 flex items-center justify-center bg-green-600 border-2 border-white/30 text-white font-bold cursor-pointer hover:bg-green-500 relative rounded-l-full text-lg md:text-2xl"><span className="-rotate-90">0</span>{bets['n-0'] && <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6 bg-yellow-400 rounded-full border border-black flex items-center justify-center text-[8px] text-black font-bold z-10">{formatChip(bets['n-0'])}</div>}</div>

                                {/* 1-36 Numbers */}
                                {[...Array(36)].map((_, i) => {
                                    const n = i + 1; // 1 to 36
                                    // Based on standard roulette layout logic
                                    // Col: 1..12 based on tri-set. 
                                    // Row: n%3=0 -> Row 1 (top). n%3=2 -> Row 2. n%3=1 -> Row 3.
                                    // BUT, in CSS Grid here:
                                    // Top Row (3,6,9...) is Row 1.
                                    const col = Math.ceil(n / 3) + 1;
                                    const row = n % 3 === 0 ? 1 : n % 3 === 2 ? 2 : 3;

                                    return (
                                        <div key={n} onClick={() => placeBet(`n-${n}`)}
                                            className={cn("h-full flex items-center justify-center border border-white/20 text-white font-bold text-lg md:text-xl cursor-pointer hover:opacity-80 relative", RED_NUMBERS.includes(n) ? "bg-red-600" : "bg-black")}
                                            style={{ gridColumn: col, gridRow: row }}>
                                            {n}
                                            {bets[`n-${n}`] && <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6 bg-yellow-400 rounded-full border border-black flex items-center justify-center text-[8px] text-black font-bold z-10">{formatChip(bets[`n-${n}`])}</div>}
                                        </div>
                                    )
                                })}

                                {/* 2:1 */}
                                {[[1, 3], [2, 2], [3, 1]].map(([row, val]) => (
                                    <div key={val} onClick={() => placeBet(`col-${val}`)} className={`row-start-${row} col-start-14 flex items-center justify-center border-2 border-white/30 text-white font-bold text-[10px] md:text-xs cursor-pointer hover:bg-white/10 relative`}>
                                        2:1
                                        {bets[`col-${val}`] && <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6 bg-yellow-400 rounded-full border border-black flex items-center justify-center text-[8px] text-black font-bold z-10">{formatChip(bets[`col-${val}`])}</div>}
                                    </div>
                                ))}

                                {/* DOZENS */}
                                {[1, 2, 3].map((d, i) => (
                                    <div key={d} onClick={() => placeBet(`doz-${d}`)} className={`row-start-4 col-start-${2 + i * 4} col-span-4 flex items-center justify-center border-2 border-white/30 text-white font-bold text-sm md:text-lg cursor-pointer hover:bg-white/10 relative mt-2`}>
                                        {d === 1 ? '1st 12' : d === 2 ? '2nd 12' : '3rd 12'}
                                        {bets[`doz-${d}`] && <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6 bg-yellow-400 rounded-full border border-black flex items-center justify-center text-[8px] text-black font-bold z-10">{formatChip(bets[`doz-${d}`])}</div>}
                                    </div>
                                ))}

                                {/* OUTSIDE */}
                                <div onClick={() => placeBet('low')} className="row-start-5 col-start-2 col-span-2 flex items-center justify-center border-2 border-white/30 text-white font-bold cursor-pointer hover:bg-white/10 relative mt-1 text-[10px] md:text-base">1-18 {bets['low'] && <div className="absolute top-1/2 w-6 h-6 bg-yellow-400 rounded-full"></div>}</div>
                                <div onClick={() => placeBet('even')} className="row-start-5 col-start-4 col-span-2 flex items-center justify-center border-2 border-white/30 text-white font-bold cursor-pointer hover:bg-white/10 relative mt-1 text-[10px] md:text-base">EVEN {bets['even'] && <div className="absolute top-1/2 w-6 h-6 bg-yellow-400 rounded-full"></div>}</div>
                                <div onClick={() => placeBet('red')} className="row-start-5 col-start-6 col-span-2 flex items-center justify-center bg-red-600/50 border-2 border-white/30 text-white font-bold cursor-pointer hover:bg-red-600 relative mt-1 text-[10px] md:text-base">RED {bets['red'] && <div className="absolute top-1/2 w-6 h-6 bg-yellow-400 rounded-full"></div>}</div>
                                <div onClick={() => placeBet('black')} className="row-start-5 col-start-8 col-span-2 flex items-center justify-center bg-black/50 border-2 border-white/30 text-white font-bold cursor-pointer hover:bg-black relative mt-1 text-[10px] md:text-base">BLACK {bets['black'] && <div className="absolute top-1/2 w-6 h-6 bg-yellow-400 rounded-full"></div>}</div>
                                <div onClick={() => placeBet('odd')} className="row-start-5 col-start-10 col-span-2 flex items-center justify-center border-2 border-white/30 text-white font-bold cursor-pointer hover:bg-white/10 relative mt-1 text-[10px] md:text-base">ODD {bets['odd'] && <div className="absolute top-1/2 w-6 h-6 bg-yellow-400 rounded-full"></div>}</div>
                                <div onClick={() => placeBet('high')} className="row-start-5 col-start-12 col-span-2 flex items-center justify-center border-2 border-white/30 text-white font-bold cursor-pointer hover:bg-white/10 relative mt-1 text-[10px] md:text-base">19-36 {bets['high'] && <div className="absolute top-1/2 w-6 h-6 bg-yellow-400 rounded-full"></div>}</div>

                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* --- RIGHT SIDEBAR: CHAT & USERS --- */}
            <div className="w-full xl:w-80 flex flex-col gap-4 h-[600px] flex-shrink-0">
                {/* User List */}
                <div className="bg-black/60 rounded-xl border border-white/10 p-4 max-h-48 overflow-y-auto backdrop-blur-md">
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                        <Users size={12} /> Jugadores en Sala ({onlineUsers.length})
                    </h3>
                    <div className="space-y-2">
                        {onlineUsers.map((u, i) => (
                            <div key={i} className="flex items-center gap-2 bg-white/5 p-1 rounded-full">
                                <img src={u.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${u.username}`} className="w-6 h-6 rounded-full bg-black" />
                                <span className="text-sm font-bold truncate max-w-[100px] text-white">{u.username || 'Anónimo'}</span>
                                {u.user_id === user?.id && <span className="text-[10px] bg-green-500/20 text-green-400 px-1 rounded">TÚ</span>}
                            </div>
                        ))}
                        {onlineUsers.length === 0 && <span className="text-gray-500 text-xs italic">Conectando...</span>}
                    </div>
                </div>

                {/* Chat */}
                <div className="flex-1 bg-black/60 rounded-xl border border-white/10 flex flex-col backdrop-blur-md overflow-hidden">
                    <div className="p-3 border-b border-white/5 bg-white/5 flex items-center gap-2">
                        <MessageSquare size={14} className="text-cyber-DEFAULT" />
                        <span className="text-sm font-bold text-white">Chat de Sala</span>
                    </div>

                    <div ref={chatContainerRef} className="flex-1 overflow-y-auto p-4 space-y-3">
                        {chatMessages.map((msg, i) => (
                            <div key={i} className="flex flex-col">
                                <span className={cn("text-[10px] font-bold mb-0.5", msg.user_id === user?.id ? "text-green-400" : "text-purple-400")}>
                                    {msg.username}
                                </span>
                                <span className="text-sm text-gray-200 bg-white/5 p-2 rounded-lg rounded-tl-none break-words">
                                    {msg.text}
                                </span>
                            </div>
                        ))}
                        {chatMessages.length === 0 && <div className="text-center text-gray-600 text-xs mt-10">¡Di hola! 👋</div>}
                    </div>

                    <form onSubmit={sendMessage} className="p-2 border-t border-white/10 flex gap-2">
                        <input
                            type="text"
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            placeholder="Escribe algo..."
                            className="flex-1 bg-black border border-white/20 rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:border-green-500 placeholder:text-gray-600"
                        />
                        <button type="submit" className="bg-green-600 hover:bg-green-500 text-black p-2 rounded-md">
                            <Send size={16} />
                        </button>
                    </form>
                </div>
            </div>

            <AnimatePresence>
                {lastWin && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.5, y: 100 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0 }}
                        className="fixed bottom-1/2 left-1/2 -translate-x-1/2 translate-y-1/2 bg-green-500 text-black px-12 py-6 rounded-3xl font-black text-4xl shadow-[0_0_50px_rgba(34,197,94,0.8)] border-4 border-white z-[100] text-center pointer-events-none"
                    >
                        <div>¡GANASTE!</div>
                        <div className="text-xl font-mono mt-2">{formatCurrency(lastWin.amount)}</div>
                    </motion.div>
                )}
            </AnimatePresence>

        </div>
    );
}
