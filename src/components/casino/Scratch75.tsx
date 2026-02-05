import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '../../stores/gameStore';
import { formatCurrency, cn } from '../../lib/utils';
import { toast } from 'sonner';
import { Eraser, RotateCcw, Trophy } from 'lucide-react';
import { playSound } from '../../lib/soundManager';

/* --- TYPES & CONSTANTS --- */
type Suit = 'Oros' | 'Copas' | 'Espadas' | 'Bastos';
type Rank = '1' | '2' | '3' | '4' | '5' | '6' | '7' | '10' | '11' | '12';

interface CardData {
    suit: Suit;
    rank: Rank;
    value: number;
    img: string;
}

const SUITS: Suit[] = ['Oros', 'Copas', 'Espadas', 'Bastos'];
const RANKS: Rank[] = ['1', '2', '3', '4', '5', '6', '7', '10', '11', '12'];

const getValue = (rank: Rank) => {
    if (['10', '11', '12'].includes(rank)) return 0.5;
    return parseInt(rank);
};

const createDeck = (): CardData[] => {
    const deck: CardData[] = [];
    SUITS.forEach(suit => {
        RANKS.forEach(rank => {
            deck.push({
                suit,
                rank,
                value: getValue(rank),
                img: `/cards/${suit}_${rank}.png` // Placeholder logic for visuals
            });
        });
    });
    return deck.sort(() => Math.random() - 0.5);
};

const BET_TIERS = [50000, 100000, 250000, 500000, 1000000, 5000000, 10000000];

/* --- COMPONENTS --- */
const ScratchArea = ({
    isRevealed,
    onReveal,
    children,
    label
}: {
    isRevealed: boolean,
    onReveal: () => void,
    children: React.ReactNode,
    label?: string
}) => {
    return (
        <div
            className="relative overflow-hidden rounded-xl cursor-pointer select-none group"
            onClick={!isRevealed ? onReveal : undefined}
        >
            {/* The Hidden Content */}
            <div className={cn("w-full h-full bg-white flex items-center justify-center p-2", !isRevealed && "pointer-events-none")}>
                {children}
            </div>

            {/* The Scratch Layer */}
            <AnimatePresence>
                {!isRevealed && (
                    <motion.div
                        initial={{ opacity: 1 }}
                        exit={{ opacity: 0, scale: 1.5, filter: "blur(10px)" }}
                        transition={{ duration: 0.4 }}
                        className="absolute inset-0 bg-cover bg-center flex flex-col items-center justify-center text-center p-2 shadow-inner border-2 border-[#d4af37]"
                        style={{
                            backgroundImage: 'url("https://www.transparenttextures.com/patterns/gold-scales.png")',
                            backgroundColor: '#FFD700'
                        }}
                    >
                        <div className="absolute inset-0 bg-gradient-to-br from-yellow-300 via-yellow-500 to-yellow-700 opacity-90" />
                        <span className="relative z-10 font-black text-yellow-900 uppercase drop-shadow-md text-sm md:text-base">
                            {label || "RASCAR"}
                        </span>
                        <Eraser className="relative z-10 w-6 h-6 text-yellow-900/50 mt-1 opacity-0 group-hover:opacity-100 transition-opacity animate-bounce" />
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

const CardDisplay = ({ card }: { card: CardData }) => {
    const symbol = { 'Oros': '🪙', 'Copas': '🏆', 'Espadas': '⚔️', 'Bastos': '🪵' }[card.suit];

    return (
        <div className="flex flex-col items-center justify-center w-20 h-28 md:w-24 md:h-32 border-2 border-slate-200 rounded-lg bg-white shadow-sm relative overflow-hidden">
            <div className="absolute top-1 left-1 text-xs font-bold">{card.rank}</div>
            <div className="absolute top-1 right-1 text-xs">{symbol}</div>
            <div className="text-4xl">{symbol}</div>
            <div className="text-sm font-bold mt-2 text-center text-gray-800 leading-tight">
                {card.rank === '10' ? 'Sota' : card.rank === '11' ? 'Caballo' : card.rank === '12' ? 'Rey' : card.value}
            </div>
            <div className="absolute bottom-1 right-1 text-xs font-bold rotate-180">{card.rank}</div>
        </div>
    );
};

export function Scratch75() {
    const { coins, removeCoins, addCoins } = useGameStore();

    // Game State
    const [isPlaying, setIsPlaying] = useState(false);
    const [isFinished, setIsFinished] = useState(false);
    const [bet, setBet] = useState(BET_TIERS[3]); // Default 500k
    const [winAmount, setWinAmount] = useState(0);

    // Card Data
    const [bankerCards, setBankerCards] = useState<CardData[]>([]);
    const [playerCards, setPlayerCards] = useState<CardData[]>([]);
    const [bonusCard, setBonusCard] = useState<CardData | null>(null);
    const [potentialPrize, setPotentialPrize] = useState(0);

    // Scratch State (all false initially)
    const [revealed, setRevealed] = useState<{
        banker: boolean[];
        player: boolean[];
        bonus: boolean;
        prize: boolean;
    }>({
        banker: [false, false],
        player: [false, false, false],
        bonus: false,
        prize: false
    });

    const startGame = () => {
        if (coins < bet) {
            toast.error("Saldo insuficiente");
            return;
        }

        removeCoins(bet);
        playSound.click();

        const deck = createDeck();

        // Deal logic
        const bCards = [deck.pop()!, deck.pop()!];
        const pCards = [deck.pop()!, deck.pop()!, deck.pop()!];
        const bonCard = deck.pop()!;

        // Generate Prize Multiplier (mostly 1x, sometimes 10x, rarely 100x)
        const rand = Math.random();
        let mult = 1.5; // Minimo para recuperar algo si ganas
        if (rand > 0.98) mult = 100;
        else if (rand > 0.90) mult = 10;
        else if (rand > 0.60) mult = 2;

        const prizeVal = Math.floor(bet * mult);

        setBankerCards(bCards);
        setPlayerCards(pCards);
        setBonusCard(bonCard);
        setPotentialPrize(prizeVal);

        setRevealed({
            banker: [false, false],
            player: [false, false, false],
            bonus: false,
            prize: false
        });

        setIsPlaying(true);
        setIsFinished(false);
        setWinAmount(0);
    };

    const handleReveal = (area: 'banker' | 'player' | 'bonus' | 'prize', index?: number) => {
        if (!isPlaying || isFinished) return;

        playSound.cardFlip();

        setRevealed(prev => {
            const newState = { ...prev };

            if (area === 'banker' && typeof index === 'number') {
                newState.banker = [...prev.banker];
                newState.banker[index] = true;
            } else if (area === 'player' && typeof index === 'number') {
                newState.player = [...prev.player];
                newState.player[index] = true;
            } else if (area === 'bonus') {
                newState.bonus = true;
            } else if (area === 'prize') {
                newState.prize = true;
            }

            checkWinCondition(newState);
            return newState;
        });
    };

    const checkWinCondition = (currentRevealed: typeof revealed) => {
        // Check if EVERYTHING is revealed
        const allBanker = currentRevealed.banker.every(r => r);
        const allPlayer = currentRevealed.player.every(r => r);
        const bonusRev = currentRevealed.bonus;
        const prizeRev = currentRevealed.prize;

        if (allBanker && allPlayer && bonusRev && prizeRev) {
            evaluateGame();
        }
    };

    const revealAll = () => {
        if (!isPlaying || isFinished) return;

        setRevealed({
            banker: [true, true],
            player: [true, true, true],
            bonus: true,
            prize: true
        });

        // Need to wait for state update in a real effect, but here we can just call eval directly 
        // since we know the state *will* be full. 
        // But better to let the effect/check logic handle it? 
        // We'll force eval immediately with the full state.
        setTimeout(() => evaluateGame(), 500);
    };

    const evaluateGame = () => {
        if (isFinished) return; // Prevent double eval

        const bankScore = bankerCards.reduce((acc, c) => acc + c.value, 0);
        const playerScore = playerCards.reduce((acc, c) => acc + c.value, 0);

        let totalWin = 0;
        let reasons: string[] = [];

        // 1. Regular Win (Beat Dealer without busting)
        // Dealer busts if > 7.5? Rules say: "Si tus cartas > banca sin alcanzar 7.5".
        // What if banker busts? Rules usually imply banker plays to win. 
        // Official rules: "Si suma player > suma banca SIN ALCANZAR 7.5, ganas premio."
        // "Si dicha suma alcanza 7.5, ganas DOBLE."

        const playerBust = playerScore > 7.5;
        // Does banker bust matter? The rule only compares sums. "Supera a la banca".
        // Implicitly if I have 5 and Banker has 6, I lose.
        // If Banker has 7.5 and I have 7.5? "Alcanza 7.5 -> ganas doble". Usually plays in favor of player on exact 7.5.

        if (!playerBust) {
            const bankerBust = bankScore > 7.5; // Not strictly in rules text provided but standard.

            if (playerScore === 7.5) {
                totalWin += potentialPrize * 2;
                reasons.push("¡7.5 EXACTOS! (x2)");
            } else if (bankerBust || playerScore > bankScore) {
                totalWin += potentialPrize;
                reasons.push("Ganas a la Banca");
            }
        }

        // 2. Bonus Win
        // "Si Carta Bonus es igual a alguna de Tus Cartas"
        // Usually matches Rank/Number, not Suit.
        const matchesBonus = playerCards.some(c => c.rank === bonusCard?.rank);
        if (matchesBonus) {
            // Bonus prize logic? User simple said "Premio extra". 
            // Default to 5x Bet for bonus.
            const bonusPrize = bet * 5;
            totalWin += bonusPrize;
            reasons.push("¡BONUS! coincidencias");
        }

        setIsFinished(true);
        setWinAmount(totalWin);

        if (totalWin > 0) {
            addCoins(totalWin);
            playSound.win();
            toast.success(`🎉 HAS GANADO: ${formatCurrency(totalWin)}`, {
                description: reasons.join(" + ")
            });
        } else {
            playSound.loss();
            // toast.error("Suerte la próxima vez...");
        }
    };

    return (
        <div className="w-full max-w-4xl mx-auto flex flex-col items-center">

            {/* --- BETTING CONTROLS --- */}
            {!isPlaying && (
                <div className="bg-black/80 backdrop-blur border border-green-500/30 p-8 rounded-3xl shadow-2xl w-full max-w-2xl mb-8 flex flex-col items-center gap-6">
                    <h2 className="text-3xl font-black text-green-400 italic">7 Y MEDIA</h2>
                    <p className="text-gray-400 text-center text-sm">
                        ¡Rasca y gana hasta x100! Consigue 7.5 para doblar el premio.
                    </p>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 w-full">
                        {BET_TIERS.map(tier => (
                            <button
                                key={tier}
                                onClick={() => setBet(tier)}
                                className={cn(
                                    "px-4 py-3 rounded-xl font-bold font-mono transition-all border-2",
                                    bet === tier
                                        ? "bg-green-600 border-green-400 text-white shadow-[0_0_15px_rgba(22,163,74,0.5)] scale-105"
                                        : "bg-black/50 border-white/10 text-gray-400 hover:bg-white/5 hover:border-white/30"
                                )}
                            >
                                {formatCurrency(tier)}
                            </button>
                        ))}
                    </div>

                    <button
                        onClick={startGame}
                        className="w-full py-4 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 rounded-full font-black text-2xl text-white shadow-lg transition-all transform hover:scale-[1.02]"
                    >
                        COMPRAR RASCA ({formatCurrency(bet)})
                    </button>
                </div>
            )}

            {/* --- GAME BOARD --- */}
            {isPlaying && (
                <div className="bg-green-600 p-1 rounded-3xl shadow-2xl rotate-1 animate-in fade-in zoom-in duration-300">
                    <div className="bg-[#00a86b] border-4 border-yellow-400 border-dashed rounded-[20px] p-4 md:p-8 flex flex-col gap-6 relative max-w-3xl w-full shadow-inner">

                        {/* Header Image / Title */}
                        <div className="flex justify-between items-center bg-white/10 rounded-xl p-2 mb-2">
                            <div className="text-yellow-300 font-black text-4xl drop-shadow-md tracking-tighter" style={{ textShadow: '2px 2px 0 #006644' }}>
                                7 ½
                            </div>
                            <div className="bg-red-600 text-white font-bold px-3 py-1 rounded rotate-[-5deg] text-xs shadow-lg">
                                EDICIÓN ESPECIAL
                            </div>
                            <div className="text-white font-bold text-xl drop-shadow-md">
                                {formatCurrency(bet)}
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

                            {/* LEFT COL: BANKER */}
                            <div className="flex flex-col gap-2 bg-[#005c3a] p-3 rounded-xl border-2 border-yellow-400/50 shadow-lg">
                                <span className="text-yellow-300 font-bold uppercase text-xs tracking-widest text-center mb-1">BANCA</span>
                                <div className="flex justify-center gap-2">
                                    {bankerCards.map((card, i) => (
                                        <ScratchArea
                                            key={`bank-${i}`}
                                            isRevealed={revealed.banker[i]}
                                            onReveal={() => handleReveal('banker', i)}
                                            label="BANCA"
                                        >
                                            <CardDisplay card={card} />
                                        </ScratchArea>
                                    ))}
                                </div>
                            </div>

                            {/* RIGHT COL: BONUS */}
                            <div className="flex flex-col gap-2 bg-[#005c3a] p-3 rounded-xl border-2 border-yellow-400/50 shadow-lg md:col-start-3">
                                <span className="text-yellow-300 font-bold uppercase text-xs tracking-widest text-center mb-1">BONUS</span>
                                <div className="flex justify-center">
                                    {bonusCard && (
                                        <ScratchArea
                                            isRevealed={revealed.bonus}
                                            onReveal={() => handleReveal('bonus')}
                                            label="BONUS"
                                        >
                                            <CardDisplay card={bonusCard} />
                                        </ScratchArea>
                                    )}
                                </div>
                            </div>

                            {/* CENTER ROW for mobile, or below for logic visual flow */}
                            {/* Actually visual layout in image is Banker | Bonus on top row, Player on bottom row */}
                        </div>

                        {/* BOTTOM ROW: PLAYER */}
                        <div className="bg-[#005c3a] p-4 rounded-xl border-2 border-yellow-400/50 shadow-lg mt-2">
                            <span className="text-yellow-300 font-bold uppercase text-xs tracking-widest text-center block mb-3">TUS CARTAS</span>
                            <div className="flex justify-center gap-2 md:gap-4 flex-wrap">
                                {playerCards.map((card, i) => (
                                    <ScratchArea
                                        key={`player-${i}`}
                                        isRevealed={revealed.player[i]}
                                        onReveal={() => handleReveal('player', i)}
                                        label="TÚ"
                                    >
                                        <CardDisplay card={card} />
                                    </ScratchArea>
                                ))}
                            </div>
                        </div>

                        {/* FOOTER: PRIZE */}
                        <div className="mt-2 text-center">
                            <div className="w-48 mx-auto h-20">
                                <ScratchArea
                                    isRevealed={revealed.prize}
                                    onReveal={() => handleReveal('prize')}
                                    label="PREMIO"
                                >
                                    <div className="font-black text-3xl text-green-600 font-mono">
                                        {formatCurrency(potentialPrize)}
                                    </div>
                                </ScratchArea>
                            </div>
                        </div>

                        {/* ACTIONS */}
                        {!isFinished ? (
                            <button
                                onClick={revealAll}
                                className="absolute -bottom-16 left-1/2 -translate-x-1/2 md:bottom-auto md:top-1/2 md:-right-24 md:left-auto md:translate-x-0 whitespace-nowrap bg-yellow-400 hover:bg-yellow-300 text-yellow-900 border-b-4 border-yellow-600 font-black px-6 py-3 rounded-full shadow-xl transition-all active:translate-y-1 active:border-b-0"
                            >
                                <Eraser className="inline-block mr-2 w-5 h-5" />
                                RASCAR TODO
                            </button>
                        ) : (
                            <motion.div
                                initial={{ scale: 0 }} animate={{ scale: 1 }}
                                className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm rounded-[18px]"
                            >
                                <div className="bg-white p-6 rounded-2xl shadow-2xl text-center max-w-sm w-full mx-4 animate-in zoom-in spin-in-1 duration-300">
                                    {winAmount > 0 ? (
                                        <>
                                            <Trophy className="w-16 h-16 text-yellow-500 mx-auto mb-2" />
                                            <h3 className="text-2xl font-black text-gray-900 mb-1">¡GANASTE!</h3>
                                            <p className="text-4xl font-black text-green-600 font-mono mb-4">{formatCurrency(winAmount)}</p>
                                        </>
                                    ) : (
                                        <>
                                            <h3 className="text-xl font-bold text-gray-500 mb-2">Sin Premio</h3>
                                            <p className="text-gray-400 mb-4 text-sm">Prueba suerte de nuevo</p>
                                        </>
                                    )}

                                    <button
                                        onClick={() => setIsPlaying(false)}
                                        className="w-full py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-500 transition-colors flex items-center justify-center gap-2"
                                    >
                                        <RotateCcw size={18} /> OTRA JUGADA
                                    </button>
                                </div>
                            </motion.div>
                        )}

                    </div>
                </div>
            )}
        </div>
    );
}
