export const RANKS = [
    { name: 'Novato', threshold: 0, color: 'text-gray-400', border: 'border-gray-400' },
    { name: 'Aprendiz', threshold: 1000, color: 'text-green-400', border: 'border-green-400' },
    { name: 'Hacker', threshold: 5000, color: 'text-blue-400', border: 'border-blue-400' },
    { name: 'Cyber-Punk', threshold: 25000, color: 'text-purple-400', border: 'border-purple-400' },
    { name: 'Netrunner', threshold: 100000, color: 'text-pink-400', border: 'border-pink-400' },
    { name: 'Señor del Click', threshold: 500000, color: 'text-yellow-400', border: 'border-yellow-400' },
    { name: 'Leyenda', threshold: 1000000, color: 'text-red-500', border: 'border-red-500 glow-red' },
];

export const SHOP_ITEMS = {
    click: [
        { id: 'c1', name: 'Guantes Táctiles', cost: 15, increase: 1, description: '+1 por click' },
        { id: 'c2', name: 'Mouse Gamer RGB', cost: 100, increase: 5, description: '+5 por click' },
        { id: 'c3', name: 'Implante Neural', cost: 500, increase: 20, description: '+20 por click' },
        { id: 'c4', name: 'AI Assistant', cost: 2000, increase: 50, description: '+50 por click' },
    ],
    idle: [
        { id: 'i1', name: 'Bot Minero', cost: 50, cps: 1, description: '+1 moneda/seg' },
        { id: 'i2', name: 'Servidor Local', cost: 250, cps: 5, description: '+5 monedas/seg' },
        { id: 'i3', name: 'Granja de Cripto', cost: 1000, cps: 20, description: '+20 monedas/seg' },
        { id: 'i4', name: 'Computación Cuántica', cost: 5000, cps: 100, description: '+100 monedas/seg' },
    ]
};
