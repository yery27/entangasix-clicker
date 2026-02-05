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

export const COSMETIC_ITEMS = {
    frames: [
        { id: 'frame_gold', name: 'Marco Dorado', cost: 10000000, description: 'Un borde de oro macizo.', style: 'border-4 border-yellow-500 shadow-[0_0_15px_rgba(234,179,8,0.6)]' },
        { id: 'frame_neon', name: 'Marco Neón', cost: 50000000, description: 'Brilla con la intensidad de mil soles.', style: 'border-4 border-purple-500 shadow-[0_0_20px_purple] animate-pulse' },
        { id: 'frame_diamond', name: 'Marco Diamante', cost: 250000000, description: 'Puro lujo helado.', style: 'border-4 border-cyan-400 shadow-[0_0_25px_cyan]' },
        { id: 'frame_admin', name: 'Marco Glitch', cost: 1000000000, description: '¿Eres el dueño del juego?', style: 'border-4 border-red-500 animate-pulse shadow-[0_0_30px_red]' },
        {
            id: 'title_entangado',
            name: 'El Más Entangado',
            cost: 1000000000000,
            description: 'Solo para el rey del servidor. Muestra tu título exclusivo.',
            style: 'border-4 border-emerald-500 shadow-[0_0_50px_emerald] animate-bounce'
        },
    ],
    effects: [
        { id: 'effect_fire', name: 'Fuego', cost: 5000000, description: 'Tus clicks queman.', color: '#ef4444' }, // Red
        { id: 'effect_lightning', name: 'Rayo', cost: 20000000, description: 'Poder eléctrico.', color: '#3b82f6' }, // Blue
        { id: 'effect_money', name: 'Lluvia de Dinero', cost: 100000000, description: '¡Billetes por todas partes!', color: '#22c55e' }, // Green
        { id: 'effect_rainbow', name: 'Arcoíris', cost: 500000000, description: 'RGB Gaming.', color: 'rainbow' },
    ]
};
