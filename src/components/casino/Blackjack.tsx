
import { useState, useEffect } from 'react';
import { useGameStore } from '../../stores/gameStore';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { cn, formatCurrency } from '../../lib/utils';
import { User, Shield, RotateCcw } from 'lucide-react';
import { playSound, setMuted } from '../../lib/soundManager';

/* --- TYPES --- */
type Suit = 'H' | 'D' | 'C' | 'S';
type Rank = '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K' | 'A';

interface CardData {
    suit: Suit;
    rank: Rank;
    value: number;
    id: string; // Unique ID for keys
}

/* --- CONSTANTS --- */
const SUITS: Suit[] = ['H', 'D', 'C', 'S'];
const RANKS: Rank[] = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

/* --- HELPERS --- */
const getCardValue = (rank: Rank): number => {
    if (['J', 'Q', 'K'].includes(rank)) return 10;
    if (rank === 'A') return 11;
    return parseInt(rank);
};

const createDeck = (): CardData[] => {
    const deck: CardData[] = [];
    SUITS.forEach(suit => {
        RANKS.forEach(rank => {
            deck.push({
                suit,
                rank,
                value: getCardValue(rank),
                id: `${rank}-${suit}-${Math.random().toString(36).substr(2, 9)}`
            });
        });
    });
    return deck.sort(() => Math.random() - 0.5);
};

/* --- COMPONENTS --- */
const Card = ({ card, hidden = false, index, isDealer = false }: { card: CardData | null, hidden?: boolean, index: number, isDealer?: boolean }) => {
    // Determine start position based on who the card is for (Dealer vs Player) for animation
    const initialY = isDealer ? -200 : -200; // Fly in from top

    // Hidden Card (Back)
    if (hidden || !card) {
        return (
            <motion.div
                initial={{ opacity: 0, y: initialY, rotateY: 180, scale: 0.5 }}
                animate={{ opacity: 1, y: 0, rotateY: 0, scale: 1 }}
                transition={{ delay: index * 0.2, duration: 0.4, type: "spring" }}
                className="w-16 h-24 md:w-24 md:h-36 bg-red-900 rounded-lg border-2 border-white/20 shadow-xl flex items-center justify-center relative overflow-hidden pattern-box"
            >
                <div className="w-12 h-20 md:w-16 md:h-24 border border-white/10 rounded opacity-30 bg-repeat space-y-2 flex flex-col items-center justify-center">
                    <div className="w-6 h-6 md:w-8 md:h-8 rounded-full border border-white/20"></div>
                    <div className="w-6 h-6 md:w-8 md:h-8 rounded-full border border-white/20"></div>
                </div>
            </motion.div>
        );
    }

    const isRed = card.suit === 'H' || card.suit === 'D';
    const suitSymbol = { 'H': '♥', 'D': '♦', 'C': '♣', 'S': '♠' }[card.suit];

    return (
        <motion.div
            layoutId={card.id}
            initial={{ opacity: 0, y: initialY, scale: 0.5, rotate: Math.random() * 10 - 5 }}
            animate={{ opacity: 1, y: 0, scale: 1, rotate: 0 }}
            transition={{ delay: index * 0.2, type: "spring", stiffness: 200, damping: 20 }}
            className="w-16 h-24 md:w-24 md:h-36 bg-gray-100 rounded-lg shadow-2xl relative select-none flex flex-col justify-between p-1 md:p-2 border border-black/10"
        >
            <div className={cn("text-base md:text-xl font-bold leading-none flex flex-col items-center", isRed ? "text-red-600" : "text-black")}>
                <span>{card.rank}</span>
                <span className="text-xs md:text-sm">{suitSymbol}</span>
            </div>

            <div className={cn("absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-3xl md:text-5xl opacity-20 pointer-events-none", isRed ? "text-red-600" : "text-black")}>
                {suitSymbol}
            </div>

            <div className={cn("text-base md:text-xl font-bold leading-none flex flex-col items-center self-end rotate-180", isRed ? "text-red-600" : "text-black")}>
                <span>{card.rank}</span>
                <span className="text-xs md:text-sm">{suitSymbol}</span>
            </div>
        </motion.div>
    );
};

const Chip = ({ value, onClick, selected }: { value: number, onClick: () => void, selected?: boolean }) => (
    <button
        onClick={onClick}
        className={cn(
            "w-10 h-10 md:w-14 md:h-14 flex-shrink-0 rounded-full border-2 md:border-4 border-dashed flex items-center justify-center font-bold text-[10px] md:text-sm shadow-lg transition-all active:scale-95",
            selected ? "scale-110 ring-2 ring-white z-10" : "hover:scale-105",
            value === 10 ? "bg-white border-gray-300 text-black" :
                value === 50 ? "bg-red-600 border-red-800 text-white" :
                    value === 100 ? "bg-blue-600 border-blue-800 text-white" :
                        value === 500 ? "bg-green-600 border-green-800 text-white" :
                            "bg-black border-yellow-500 text-yellow-500" // 1000+
        )}
    >
        {value >= 1000000 ? (value / 1000000) + 'M' : value >= 1000 ? (value / 1000) + 'k' : value}
    </button>
);

export function Blackjack() {
    const { coins, removeCoins, addCoins, soundEnabled } = useGameStore();

    // Sync mute
    useEffect(() => {
        setMuted(!soundEnabled);
    }, [soundEnabled]);

    // Game State
    const [gameState, setGameState] = useState<'betting' | 'playing' | 'dealer' | 'finished'>('betting');
    const [deck, setDeck] = useState<CardData[]>([]);
    const [playerHand, setPlayerHand] = useState<CardData[]>([]);
    const [dealerHand, setDealerHand] = useState<CardData[]>([]);

    // Betting State
    const [bet, setBet] = useState(0);
    const [selectedChip, setSelectedChip] = useState(100);
    const [lastBet, setLastBet] = useState(0); // For Repeat Bet
    const [message, setMessage] = useState("¡Hagan sus apuestas!");
    const [endRoundWin, setEndRoundWin] = useState<number | null>(null);

    // Auto-dismiss message
    useEffect(() => {
        if (!message || message === "¡Hagan sus apuestas!") return;
        const timer = setTimeout(() => {
            setMessage('');
        }, 3000);
        return () => clearTimeout(timer);
    }, [message]);

    /* --- LOGIC --- */
    const calculateScore = (hand: CardData[]) => {
        let score = hand.reduce((acc, c) => acc + c.value, 0);
        let aces = hand.filter(c => c.rank === 'A').length;
        while (score > 21 && aces > 0) {
            score -= 10;
            aces--;
        }
        return score;
    };

    const addBet = () => {
        if (coins < bet + selectedChip) return toast.error("No tienes suficientes fichas");
        playSound.click();
        setMessage(''); // Clear optional message on interaction
        setBet(prev => prev + selectedChip);
    };

    const clearBet = () => {
        playSound.click();
        setBet(0);
    };

    const repeatBet = () => {
        if (lastBet === 0) return;
        if (coins < lastBet) return toast.error("Saldo insuficiente para repetir");
        playSound.click();
        setBet(lastBet);
    };

    const deal = async () => {
        if (bet < 10) return toast.error("Apuesta mínima: 10");
        if (coins < bet) return toast.error("Saldo insuficiente");

        playSound.click();
        setLastBet(bet);
        setEndRoundWin(null);
        removeCoins(bet);
        const newDeck = createDeck();

        // Initial setup
        setDeck(newDeck);
        setPlayerHand([]);
        setDealerHand([]);
        setGameState('playing');
        setMessage("Repartiendo...");

        // Sequential Deal Animation
        const p1 = newDeck.pop()!;
        const d1 = newDeck.pop()!;
        const p2 = newDeck.pop()!;
        const d2 = newDeck.pop()!;

        playSound.cardFlip();
        await new Promise(r => setTimeout(r, 200));
        setPlayerHand([p1]);

        playSound.cardFlip();
        await new Promise(r => setTimeout(r, 400));
        setDealerHand([d1]);

        playSound.cardFlip();
        await new Promise(r => setTimeout(r, 400));
        setPlayerHand([p1, p2]);

        playSound.cardFlip();
        await new Promise(r => setTimeout(r, 400));
        setDealerHand([d1, d2]);
        setDeck(newDeck);

        setMessage("¿Pedir o Plantarse?");

        if (calculateScore([p1, p2]) === 21) {
            // Check dealer blackjack too? Usually player blackjack wins 3:2 immediately unless dealer matches
            // Simplified: Instant win
            endGame('blackjack');
        }
    };

    const hit = () => {
        const newDeck = [...deck];
        const card = newDeck.pop()!;
        const newHand = [...playerHand, card];

        playSound.cardFlip();
        setDeck(newDeck);
        setPlayerHand(newHand);

        if (calculateScore(newHand) > 21) {
            setGameState('finished');
            setMessage("¡Te has pasado! 💥");
            playSound.loss();
            setEndRoundWin(0); // Lost
        }
    };

    const stand = async () => {
        setGameState('dealer');
        setMessage("Turno de la banca...");
        playSound.click();

        // Dealer Logic with delays for visual realism
        let dHand = [...dealerHand];
        let dScore = calculateScore(dHand);
        let currentDeck = [...deck];

        // Reveal hidden card animation delay
        playSound.cardFlip();
        await new Promise(r => setTimeout(r, 600));

        // Draw until 17
        while (dScore < 17) {
            await new Promise(r => setTimeout(r, 800)); // Suspense delay
            const card = currentDeck.pop()!;
            playSound.cardFlip();
            dHand = [...dHand, card];
            setDealerHand(dHand);
            setDeck(currentDeck);
            dScore = calculateScore(dHand);
        }

        const pScore = calculateScore(playerHand);

        if (dScore > 21) handleResult('dealer_bust', dScore);
        else if (dScore > pScore) handleResult('lose', dScore);
        else if (dScore < pScore) handleResult('win', dScore);
        else handleResult('push', dScore);
    };

    const handleResult = (res: string, dScore: number) => {
        setGameState('finished');
        if (res === 'dealer_bust') {
            const win = bet * 2;
            addCoins(win);
            setEndRoundWin(win);
            playSound.win();
            setMessage(`¡Banca se pasa (${dScore})! GANAS 🏆`);
        } else if (res === 'win') {
            const win = bet * 2;
            addCoins(win);
            setEndRoundWin(win);
            playSound.win();
            setMessage(`¡Ganas a la banca! (${dScore} vs ${calculateScore(playerHand)}) 🏆`);
        } else if (res === 'push') {
            addCoins(bet);
            setEndRoundWin(bet);
            playSound.click();
            setMessage(`Empate (${dScore} vs ${calculateScore(playerHand)}) 🤝`);
        } else {
            setEndRoundWin(0);
            playSound.loss();
            setMessage(`La banca gana (${dScore}) 🏠`);
        }
    };

    const endGame = (res: string) => {
        setGameState('finished');
        if (res === 'blackjack') {
            const win = Math.floor(bet * 2.5);
            addCoins(win);
            setEndRoundWin(win);
            playSound.jackpot();
            setMessage("✨ ¡BLACKJACK! Pago 3:2 ✨");
        }
    };

    return (
        <div className="w-full max-w-5xl mx-auto flex flex-col items-center pb-12">

            {/* Header / Table Name */}
            <div className="bg-[#2e1a0f] border-2 border-[#d4af37] px-8 py-2 rounded-xl mb-[-20px] relative z-20 shadow-xl">
                <h2 className="text-[#d4af37] font-black tracking-widest text-lg uppercase">Blackjack VIP</h2>
            </div>

            {/* --- TABLE SURFACE --- */}
            <div className="w-full bg-[#1a472a] border-[8px] md:border-[16px] border-[#3e2723] rounded-[40px] md:rounded-[100px] shadow-[0_20px_50px_rgba(0,0,0,0.6)] p-4 md:p-12 relative min-h-[500px] md:min-h-[600px] flex flex-col justify-between overflow-hidden">

                {/* Felt Pattern */}
                <div className="absolute inset-0 opacity-20 pointer-events-none" style={{ backgroundImage: 'radial-gradient(black 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>

                {/* --- DEALER AREA (Top) --- */}
                <div className="flex flex-col items-center justify-center z-10 relative">
                    <div className="flex flex-col items-center mb-8">
                        <div className="w-10 h-10 md:w-16 md:h-16 bg-black rounded-full border-2 border-white/20 flex items-center justify-center mb-2 shadow-lg z-10">
                            <Shield className="text-gray-400" size={20} />
                        </div>
                        <div className="bg-black/40 px-3 py-1 rounded-full border border-white/10 text-[10px] md:text-xs text-gray-300 font-bold z-10 flex gap-2 items-center">
                            <span>CROUPIER</span>
                            {dealerHand.length > 0 && (
                                <span className="bg-white text-black text-[10px] font-black px-1.5 rounded-full min-w-[20px] text-center">
                                    {(gameState === 'playing' || gameState === 'betting')
                                        ? calculateScore([dealerHand[0]]) // Only show first card value if hidden
                                        : calculateScore(dealerHand)}
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Dealer Hand */}
                    <div className="flex h-24 md:h-36 items-center justify-center relative">
                        {dealerHand.map((card, i) => (
                            <div key={i} className="ml-[-30px] md:ml-[-40px] first:ml-0 transition-all hover:translate-y-[-10px]">
                                <Card
                                    card={card}
                                    index={i}
                                    isDealer={true}
                                    // Use explicit check: if state is 'betting' or 'playing', hide 2nd card
                                    hidden={i === 1 && (gameState === 'playing' || gameState === 'betting')}
                                />
                            </div>
                        ))}
                    </div>
                </div>

                {/* --- CENTER INFO --- */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-0 opacity-30 text-center pointer-events-none w-full px-4">
                    <p className="text-yellow-400 font-bold tracking-widest text-xs md:text-sm mb-1">BLACKJACK PAYS 3 TO 2</p>
                    <p className="text-white text-[10px] md:text-xs">Dealer must draw to 16 and stand on all 17s</p>
                    <div className="w-full h-px bg-white/20 mt-4"></div>
                </div>

                {/* Message Overlay - Robust Centering */}
                <AnimatePresence>
                    {message && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-x-0 top-1/2 -translate-y-1/2 z-30 flex justify-center pointer-events-none"
                            style={{ top: '40%' }} // Slightly higher than center
                        >
                            <div className="bg-black/80 backdrop-blur border border-[#d4af37] px-6 py-3 rounded-xl shadow-2xl">
                                <p className="text-white font-bold text-base md:text-2xl whitespace-nowrap text-center">
                                    {message}
                                </p>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Win Popup */}
                <AnimatePresence>
                    {endRoundWin !== null && endRoundWin > 0 && (
                        <motion.div
                            initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}
                            className="absolute top-[60%] left-1/2 -translate-x-1/2 -translate-y-1/2 z-40"
                        >
                            <div className="bg-yellow-400 text-black px-8 py-4 rounded-full font-black text-3xl shadow-[0_0_50px_rgba(250,204,21,0.8)] border-4 border-white rotate-[-2deg] whitespace-nowrap">
                                +{formatCurrency(endRoundWin)}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>


                {/* --- PLAYER AREA (Bottom) --- */}
                <div className="flex flex-col items-center justify-center z-10">

                    {/* Player Hand */}
                    <div className="flex h-24 md:h-36 items-center justify-center mb-4">
                        {playerHand.map((card, i) => (
                            <div key={i} className="ml-[-30px] md:ml-[-40px] first:ml-0 transition-all hover:translate-y-[-10px]">
                                <Card card={card} index={i} />
                            </div>
                        ))}
                    </div>

                    <div className="flex items-center gap-2 bg-black/40 px-4 py-1 rounded-full border border-white/10">
                        <User size={14} className="text-white" />
                        <span className="text-xs text-white font-bold tracking-wider">TÚ</span>
                        {gameState !== 'betting' && (
                            <span className="ml-2 bg-white text-black text-xs font-black px-2 rounded-full">
                                {calculateScore(playerHand)}
                            </span>
                        )}
                    </div>
                </div>
            </div>

            {/* --- CONTROLS SECTION --- */}
            <div className="mt-8 w-full bg-black/60 backdrop-blur-md border-t border-white/10 p-4 rounded-3xl flex flex-col items-center gap-4">

                {gameState === 'betting' ? (
                    <>
                        <div className="flex bg-black/50 p-1 rounded-xl border border-white/10 overflow-x-auto max-w-full scrollbar-hide w-full justify-center">
                            <div className="flex gap-2">
                                {[1000, 10000, 50000, 100000, 500000, 1000000].map(val => (
                                    <Chip
                                        key={val}
                                        value={val}
                                        onClick={() => { playSound.click(); setSelectedChip(val); }}
                                        selected={selectedChip === val}
                                    />
                                ))}
                            </div>
                        </div>

                        <div className="flex items-center gap-4 mt-2">
                            <div className="bg-black px-6 py-3 rounded-xl border border-white/20 min-w-[120px] text-center">
                                <span className="text-gray-400 text-xs uppercase block text-center mb-1">Apuesta</span>
                                <span className="text-2xl font-mono text-yellow-400">{formatCurrency(bet)}</span>
                            </div>

                            <button onClick={repeatBet} disabled={lastBet === 0} className="w-12 h-12 rounded-full bg-purple-900/50 border border-purple-500 hover:bg-purple-900 flex items-center justify-center text-purple-200 disabled:opacity-30" title="Repetir Apuesta Anterior">
                                <RotateCcw size={20} />
                            </button>

                            <button onClick={clearBet} className="text-red-400 hover:text-red-300 font-bold text-sm uppercase px-4">Borrar</button>

                            <button
                                onClick={addBet}
                                className="w-16 h-16 rounded-full bg-yellow-500 hover:bg-yellow-400 flex items-center justify-center text-black shadow-[0_0_20px_rgba(234,179,8,0.5)] active:scale-95 transition-all"
                            >
                                <span className="text-2xl font-black">+</span>
                            </button>
                        </div>

                        <button
                            onClick={deal}
                            disabled={bet === 0}
                            className="mt-4 w-full md:w-auto px-16 py-4 bg-green-600 hover:bg-green-500 rounded-full text-xl font-black text-white shadow-lg disabled:opacity-50 disabled:grayscale transition-all"
                        >
                            REPARTIR
                        </button>
                    </>
                ) : gameState === 'playing' ? (
                    <div className="flex gap-4">
                        <button
                            onClick={hit}
                            className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-4 rounded-xl font-black text-xl shadow-[0_0_15px_rgba(37,99,235,0.4)] transition-all transform hover:scale-105"
                        >
                            PEDIR CARTA
                        </button>
                        <button
                            onClick={stand}
                            className="bg-red-600 hover:bg-red-500 text-white px-8 py-4 rounded-xl font-black text-xl shadow-[0_0_15px_rgba(220,38,38,0.4)] transition-all transform hover:scale-105"
                        >
                            PLANTARSE
                        </button>
                    </div>
                ) : (
                    <button
                        onClick={() => { playSound.click(); setGameState('betting'); setBet(0); setPlayerHand([]); setDealerHand([]); setEndRoundWin(null); }}
                        className="bg-white text-black px-12 py-4 rounded-full font-black text-xl hover:bg-gray-200 transition-all shadow-lg animate-pulse"
                    >
                        NUEVA PARTIDA
                    </button>
                )}
            </div>
        </div>
    );
}
