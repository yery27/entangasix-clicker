
import { useGameStore } from '../stores/gameStore';
import { SHOP_ITEMS } from '../lib/constants';
import { formatCurrency, cn } from '../lib/utils';
import { toast } from 'sonner';
import { MousePointer2, Cpu, Lock } from 'lucide-react';

export default function Shop() {
    const { coins, buyItem, inventory } = useGameStore();

    const handleBuy = (type: 'click' | 'idle', item: any) => {
        // Calculate cost dynamically


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
                    "bg-cyber-gray/40 border border-white/5 rounded-xl p-4 transition-all duration-200 relative overflow-hidden group select-none",
                    canAfford
                        ? "hover:bg-cyber-gray/60 hover:border-cyber-DEFAULT/50 cursor-pointer active:scale-95"
                        : "opacity-60 cursor-not-allowed grayscale"
                )}
            >
                <div className="flex justify-between items-start mb-2">
                    <h3 className="font-bold text-white group-hover:text-cyber-DEFAULT transition-colors">{item.name}</h3>
                    <span className="text-xs bg-black/50 px-2 py-1 rounded text-gray-400">Lvl {currentQty}</span>
                </div>

                <p className="text-xs text-gray-400 mb-4 h-8">{item.description}</p>

                <div className="flex items-center justify-between mt-auto">
                    <div className={cn("text-sm font-bold font-mono", canAfford ? "text-cyber-yellow" : "text-red-400")}>
                        {formatCurrency(cost)}
                    </div>
                    {canAfford ? (
                        <div className="w-8 h-8 rounded-full bg-cyber-DEFAULT/10 flex items-center justify-center text-cyber-DEFAULT">
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
                    <h1 className="text-3xl font-bold mb-1 neon-text">Mercado Negro</h1>
                    <p className="text-gray-400">Mejora tu equipo para maximizar ganancias.</p>
                </div>
                <div className="text-right">
                    <span className="text-sm text-gray-500">Saldo Disponible</span>
                    <div className="text-2xl font-bold text-cyber-yellow font-mono">{formatCurrency(coins)}</div>
                </div>
            </div>

            <div className="grid md:grid-cols-2 gap-8">

                {/* Click Upgrades */}
                <section>
                    <div className="flex items-center gap-2 mb-4 text-cyber-pink">
                        <MousePointer2 />
                        <h2 className="text-xl font-bold">Mejoras de Click</h2>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {SHOP_ITEMS.click.map(item => renderItem(item, 'click'))}
                    </div>
                </section>

                {/* Idle Upgrades */}
                <section>
                    <div className="flex items-center gap-2 mb-4 text-cyber-DEFAULT">
                        <Cpu />
                        <h2 className="text-xl font-bold">Automatización</h2>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {SHOP_ITEMS.idle.map(item => renderItem(item, 'idle'))}
                    </div>
                </section>

            </div>
        </div>
    );
}
