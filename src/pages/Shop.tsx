
import { useState } from 'react';
import { useGameStore } from '../stores/gameStore';
import { SHOP_ITEMS } from '../lib/constants';
import { formatCurrency, cn } from '../lib/utils';
import { toast } from 'sonner';
import { MousePointer2, Cpu, Lock, Sparkles, Zap } from 'lucide-react';
import { CosmeticsShop } from '../components/shop/CosmeticsShop';

export default function Shop() {
    const { coins, buyItem, inventory } = useGameStore();
    const [view, setView] = useState<'upgrades' | 'cosmetics'>('upgrades');

    const handleBuy = (type: 'click' | 'idle', item: any) => {
        const success = buyItem(type, item.id);
        if (success) {
            toast.success(`Comprado: ${item.name}`);
        } else {
            toast.error('Fondos insuficientes');
        }
    };

    const renderItem = (item: any, type: 'click' | 'idle') => {
        const currentQty = inventory[item.id] || 0;
        const cost = Math.floor(item.cost * Math.pow(1.15, currentQty));
        const canAfford = coins >= cost;

        return (
            <div
                key={item.id}
                onClick={() => canAfford && handleBuy(type, item)}
                className={cn(
                    "bg-[#1a1a1a] border border-white/5 rounded-xl p-4 transition-all duration-200 relative overflow-hidden group select-none",
                    canAfford
                        ? "hover:bg-[#252525] hover:border-purple-500/50 cursor-pointer active:scale-95"
                        : "opacity-60 cursor-not-allowed grayscale"
                )}
            >
                <div className="flex justify-between items-start mb-2">
                    <h3 className="font-bold text-white group-hover:text-purple-400 transition-colors">{item.name}</h3>
                    <span className="text-xs bg-black/50 px-2 py-1 rounded text-gray-400">Lvl {currentQty}</span>
                </div>

                <p className="text-xs text-gray-400 mb-4 h-8">{item.description}</p>

                <div className="flex items-center justify-between mt-auto">
                    <div className={cn("text-sm font-bold font-mono", canAfford ? "text-yellow-400" : "text-red-400")}>
                        {formatCurrency(cost)}
                    </div>
                    {canAfford ? (
                        <div className="w-8 h-8 rounded-full bg-purple-500/10 flex items-center justify-center text-purple-400">
                            +
                        </div>
                    ) : (
                        <Lock size={14} className="text-gray-500" />
                    )}
                </div>

                {/* Shine effect on hover */}
                <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-500 pointer-events-none" />
            </div>
        );
    };

    return (
        <div className="p-6 max-w-5xl mx-auto pb-24">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-bold mb-1 text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600">
                        {view === 'upgrades' ? 'Mercado Negro' : 'Boutique Premium'}
                    </h1>
                    <p className="text-gray-400">
                        {view === 'upgrades' ? 'Mejora tu equipo para maximizar ganancias.' : 'Personaliza tu perfil y destaca.'}
                    </p>
                </div>
                <div className="text-right">
                    <span className="text-sm text-gray-500">Saldo Disponible</span>
                    <div className="text-2xl font-bold text-yellow-400 font-mono">{formatCurrency(coins)}</div>
                </div>
            </div>

            {/* Main Tabs */}
            <div className="flex p-1 bg-white/5 rounded-xl mb-8 w-fit mx-auto sm:mx-0">
                <button
                    onClick={() => setView('upgrades')}
                    className={cn(
                        "px-6 py-2 rounded-lg font-bold text-sm transition-all flex items-center gap-2",
                        view === 'upgrades' ? "bg-purple-600 text-white shadow-lg" : "text-gray-400 hover:text-white hover:bg-white/5"
                    )}
                >
                    <Zap size={18} /> Mejoras
                </button>
                <button
                    onClick={() => setView('cosmetics')}
                    className={cn(
                        "px-6 py-2 rounded-lg font-bold text-sm transition-all flex items-center gap-2",
                        view === 'cosmetics' ? "bg-gradient-to-r from-pink-600 to-purple-600 text-white shadow-lg" : "text-gray-400 hover:text-white hover:bg-white/5"
                    )}
                >
                    <Sparkles size={18} /> Cosméticos
                </button>
            </div>

            {view === 'upgrades' ? (
                <div className="grid md:grid-cols-2 gap-8 animate-in fade-in slide-in-from-bottom-5 duration-300">
                    {/* Click Upgrades */}
                    <section>
                        <div className="flex items-center gap-2 mb-4 text-purple-400">
                            <MousePointer2 />
                            <h2 className="text-xl font-bold">Mejoras de Click</h2>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {SHOP_ITEMS.click.map(item => renderItem(item, 'click'))}
                        </div>
                    </section>

                    {/* Idle Upgrades */}
                    <section>
                        <div className="flex items-center gap-2 mb-4 text-blue-400">
                            <Cpu />
                            <h2 className="text-xl font-bold">Automatización</h2>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {SHOP_ITEMS.idle.map(item => renderItem(item, 'idle'))}
                        </div>
                    </section>
                </div>
            ) : (
                <CosmeticsShop />
            )}
        </div>
    );
}
