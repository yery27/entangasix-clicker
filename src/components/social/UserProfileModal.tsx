import { formatCurrency } from "../../lib/utils";
import { User, Wallet, UserPlus, Check, Send, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useGameStore } from "../../stores/gameStore";
import { motion, AnimatePresence } from "framer-motion";

interface UserProfileModalProps {
    isOpen: boolean;
    onClose: () => void;
    profile: {
        id: string;
        username: string;
        avatar?: string;
        score: number; // mapped from lifetime_coins
        level?: number;
    } | null;
}

export function UserProfileModal({ isOpen, onClose, profile }: UserProfileModalProps) {
    const { sendClicks } = useGameStore();
    const [amount, setAmount] = useState("");
    const [isSending, setIsSending] = useState(false);
    const [isFriend, setIsFriend] = useState(false); // Mock state

    if (!isOpen || !profile) return null;

    const handleSendBizun = async () => {
        const val = parseInt(amount.replace(/\D/g, '')); // soft sanitize
        if (!val || val <= 0) {
            toast.error("Ingresa una cantidad válida");
            return;
        }

        setIsSending(true);
        // Call store action
        const result = await sendClicks(profile.id, val);
        setIsSending(false);

        if (result.success) {
            setAmount("");
            onClose(); // Optional: close on success
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-black/80 backdrop-blur-sm cursor-pointer"
                    />

                    {/* Modal Content */}
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
                        className="relative w-full max-w-md bg-[#1a2c4e] border border-cyan-500/30 text-white rounded-3xl shadow-2xl overflow-hidden"
                    >
                        {/* Close Button */}
                        <button onClick={onClose} className="absolute top-4 right-4 text-white/50 hover:text-white transition-colors z-20">
                            <X size={24} />
                        </button>

                        <div className="p-6 flex flex-col items-center gap-6">
                            {/* Avatar Section */}
                            <div className="relative group mt-4">
                                <div className="absolute inset-0 bg-gradient-to-br from-cyan-500 to-purple-600 rounded-full blur opacity-50 group-hover:opacity-100 transition-opacity" />
                                <div className="w-24 h-24 rounded-full border-4 border-[#0f172a] relative z-10 shadow-2xl overflow-hidden bg-black">
                                    <img
                                        src={profile.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile.username}`}
                                        alt={profile.username}
                                        className="w-full h-full object-cover"
                                    />
                                </div>
                                {/* Level Badge Mock */}
                                <div className="absolute -bottom-2 right-0 bg-yellow-500 text-black text-xs font-black px-2 py-0.5 rounded-full border-2 border-[#0f172a] z-20">
                                    Lvl {Math.floor(Math.sqrt(profile.score / 1000)) + 1}
                                </div>
                            </div>

                            <div className="text-center">
                                <h2 className="text-2xl font-black tracking-tight text-white mb-1">
                                    {profile.username}
                                </h2>
                                <div className="text-cyan-400 font-mono font-bold flex items-center justify-center gap-2 bg-black/20 px-3 py-1 rounded-full text-sm inline-flex">
                                    <Wallet size={14} />
                                    {formatCurrency(profile.score)} <span className="text-xs opacity-70 uppercase">Lifetime</span>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3 w-full">
                                <button
                                    onClick={() => {
                                        setIsFriend(!isFriend);
                                        if (!isFriend) toast.success(`¡Ahora sigues a ${profile.username}!`);
                                    }}
                                    className={`flex items-center justify-center gap-2 py-3 rounded-xl font-bold transition-all ${isFriend
                                            ? "bg-green-500/20 text-green-400 border border-green-500/50"
                                            : "bg-white/5 hover:bg-white/10 text-white border border-white/10"
                                        }`}
                                >
                                    {isFriend ? <Check size={18} /> : <UserPlus size={18} />}
                                    {isFriend ? "Amigos" : "Seguir"}
                                </button>

                                <button className="flex items-center justify-center gap-2 py-3 rounded-xl bg-purple-600/20 text-purple-300 border border-purple-500/50 font-bold cursor-default opacity-80">
                                    <User size={18} />
                                    Perfil
                                </button>
                            </div>

                            {/* BIZUN SECTION */}
                            <div className="bg-black/30 rounded-2xl p-4 border border-white/5 w-full">
                                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 block flex items-center gap-2">
                                    <Send size={12} /> Enviar Fondos (Bizun)
                                </label>
                                <div className="flex gap-2">
                                    <div className="relative flex-1">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-green-400 font-bold">$</span>
                                        <input
                                            type="number"
                                            value={amount}
                                            onChange={(e) => setAmount(e.target.value)}
                                            placeholder="0"
                                            className="w-full bg-[#0f172a] border border-white/10 rounded-xl py-3 pl-7 pr-3 text-white font-mono font-bold focus:outline-none focus:border-green-500 transition-colors placeholder:text-gray-600"
                                        />
                                    </div>
                                    <button
                                        onClick={handleSendBizun}
                                        disabled={isSending || !amount}
                                        className="bg-green-500 hover:bg-green-400 disabled:opacity-50 disabled:cursor-not-allowed text-black font-black px-4 rounded-xl flex items-center gap-2 transition-all active:scale-95"
                                    >
                                        {isSending ? "..." : <Send size={18} />}
                                    </button>
                                </div>
                                <p className="text-[10px] text-gray-500 mt-2 text-center">
                                    La transferencia es instantánea y no tiene comisión.
                                </p>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
