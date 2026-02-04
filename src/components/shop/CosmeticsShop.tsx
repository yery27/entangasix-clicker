import { useState } from 'react';
import { useGameStore } from '../../stores/gameStore';
import { COSMETIC_ITEMS } from '../../lib/constants';
import { formatCurrency, cn } from '../../lib/utils';
import { toast } from 'sonner';
import { Sparkles, Crown, Check, Lock } from 'lucide-react';
import { motion } from 'framer-motion';

export const CosmeticsShop = () => {
    const { coins, cosmetics, buyCosmetic, equipCosmetic } = useGameStore();
    const [activeTab, setActiveTab] = useState<'frames' | 'effects'>('frames');

    const handleBuy = (item: any) => {
        buyCosmetic(item.id, item.cost);
        // Toast is handled in store, but we could add more FX here
    };

    const handleEquip = (type: 'frame' | 'click_effect', id: string) => {
        // Toggle: If already equipped, unequip (pass empty string)
        const currentId = type === 'frame' ? cosmetics.equipped.frame : cosmetics.equipped.click_effect;
        if (currentId === id) {
            equipCosmetic(type, '');
            toast.info('Desequipado');
        } else {
            equipCosmetic(type, id);
            toast.success('¡Equipado!');
        }
    };

    const renderItem = (item: any, type: 'frames' | 'effects') => {
        const isOwned = cosmetics.owned.includes(item.id);
        const isEquipped = type === 'frames'
            ? cosmetics.equipped.frame === item.id
            : cosmetics.equipped.click_effect === item.id;

        const canAfford = coins >= item.cost;

        return (
            <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn(
                    "relative group bg-[#1a1a1a] border rounded-xl overflow-hidden transition-all duration-300",
                    isEquipped ? "border-purple-500 shadow-[0_0_15px_rgba(168,85,247,0.4)]" : "border-white/10 hover:border-white/30"
                )}
            >
                {/* Preview Area */}
                <div className="h-32 bg-black/40 flex items-center justify-center relative p-4">
                    {type === 'frames' ? (
                        <div className="relative">
                            <img
                                src={`https://api.dicebear.com/7.x/avataaars/svg?seed=Preview`}
                                className={cn("w-16 h-16 rounded-full bg-gray-800 relative z-10", item.style)}
                                alt="Preview"
                            />
                        </div>
                    ) : (
                        <div className="relative">
                            <div
                                className="w-8 h-8 rounded-full animate-bounce"
                                style={{
                                    backgroundColor: item.color === 'rainbow' ? undefined : item.color,
                                    backgroundImage: item.color === 'rainbow' ? 'linear-gradient(to right, red,orange,yellow,green,blue,indigo,violet)' : undefined,
                                    boxShadow: `0 0 20px ${item.color === 'rainbow' ? 'white' : item.color}`
                                }}
                            />
                        </div>
                    )}

                    {isOwned && (
                        <div className="absolute top-2 right-2 bg-green-500/20 text-green-400 text-xs px-2 py-0.5 rounded flex items-center gap-1">
                            <Check size={10} /> Propio
                        </div>
                    )}
                </div>

                {/* Content */}
                <div className="p-4">
                    <div className="flex justify-between items-start mb-2">
                        <h3 className="font-bold text-white text-sm">{item.name}</h3>
                    </div>
                    <p className="text-xs text-gray-400 mb-4 h-8">{item.description}</p>

                    <div className="flex items-center justify-between gap-3">
                        {!isOwned ? (
                            <>
                                <span className={cn("text-sm font-bold font-mono", canAfford ? "text-yellow-400" : "text-red-400")}>
                                    {formatCurrency(item.cost)}
                                </span>
                                <button
                                    onClick={() => canAfford && handleBuy(item)}
                                    disabled={!canAfford}
                                    className={cn(
                                        "px-4 py-2 rounded text-xs font-bold transition-all flex-1",
                                        canAfford
                                            ? "bg-yellow-600 hover:bg-yellow-500 text-white"
                                            : "bg-gray-800 text-gray-500 cursor-not-allowed"
                                    )}
                                >
                                    {canAfford ? 'Comprar' : 'Faltan fondos'}
                                </button>
                            </>
                        ) : (
                            <button
                                onClick={() => handleEquip(type === 'frames' ? 'frame' : 'click_effect', item.id)}
                                className={cn(
                                    "w-full py-2 rounded text-xs font-bold transition-all border",
                                    isEquipped
                                        ? "bg-red-500/10 border-red-500 text-red-500 hover:bg-red-500/20"
                                        : "bg-purple-600 border-transparent text-white hover:bg-purple-500"
                                )}
                            >
                                {isEquipped ? 'Desequipar' : 'Equipar'}
                            </button>
                        )}
                    </div>
                </div>
            </motion.div>
        );
    };

    return (
        <div className="animate-in fade-in zoom-in duration-300">
            {/* Sub-Tabs */}
            <div className="flex gap-4 mb-6 border-b border-white/10 pb-4">
                <button
                    onClick={() => setActiveTab('frames')}
                    className={cn(
                        "flex items-center gap-2 px-4 py-2 rounded-full transition-colors font-bold text-sm",
                        activeTab === 'frames' ? "bg-purple-600 text-white" : "hover:bg-white/10 text-gray-400"
                    )}
                >
                    <Crown size={16} /> Marcos
                </button>
                <button
                    onClick={() => setActiveTab('effects')}
                    className={cn(
                        "flex items-center gap-2 px-4 py-2 rounded-full transition-colors font-bold text-sm",
                        activeTab === 'effects' ? "bg-blue-600 text-white" : "hover:bg-white/10 text-gray-400"
                    )}
                >
                    <Sparkles size={16} /> Efectos
                </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {activeTab === 'frames' && COSMETIC_ITEMS.frames.map(item => renderItem(item, 'frames'))}
                {activeTab === 'effects' && COSMETIC_ITEMS.effects.map(item => renderItem(item, 'effects'))}
            </div>

            <div className="mt-8 p-4 bg-yellow-900/10 border border-yellow-500/30 rounded-lg flex gap-3 text-yellow-200/80 text-xs">
                <Lock size={16} className="shrink-0" />
                <p>Artículos "Premium" para demostrar tu estatus. No otorgan beneficios de juego, pero sí mucho estilo.</p>
            </div>
        </div>
    );
};
