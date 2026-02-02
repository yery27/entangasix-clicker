import { useState, useEffect, useRef } from 'react';
import { useAuthStore } from '../../stores/authStore';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Users, MessageSquare, Send } from 'lucide-react';
import { cn } from '../../lib/utils';

interface Message {
    id: string;
    sender: string;
    text: string;
    timestamp: number;
    isSystem?: boolean;
}

export const SocialPanel = ({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) => {
    const { user } = useAuthStore();
    const [messages, setMessages] = useState<Message[]>([
        { id: '1', sender: 'System', text: '¡Bienvenido al chat global!', timestamp: Date.now(), isSystem: true }
    ]);
    const [inputText, setInputText] = useState('');
    const scrollRef = useRef<HTMLDivElement>(null);

    // Mock Chat Simulation
    useEffect(() => {
        if (!isOpen) return;
        const interval = setInterval(() => {
            if (Math.random() > 0.7) {
                const randomUser = ['Alice', 'Bob', 'Charlie', 'Dave', 'Eve'][Math.floor(Math.random() * 5)];
                const randomMsg = ['¡Gran victoria!', '¿Alguien para Blackjack?', 'Jajaja', 'Gané 1M en Slots!!!', 'Hola a todos'][Math.floor(Math.random() * 5)];
                addMessage(randomUser, randomMsg);
            }
        }, 5000);
        return () => clearInterval(interval);
    }, [isOpen]);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, isOpen]);

    const addMessage = (sender: string, text: string) => {
        setMessages(prev => [...prev.slice(-49), {
            id: Math.random().toString(36),
            sender,
            text,
            timestamp: Date.now()
        }]);
    };

    const handleSend = (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!inputText.trim() || !user) return;
        addMessage(user.username, inputText);
        setInputText('');
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/60 z-40 backdrop-blur-sm"
                    />
                    <motion.div
                        initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
                        transition={{ type: 'spring', damping: 20 }}
                        className="fixed right-0 top-0 h-full w-full md:w-96 bg-[#1a1a1a] border-l border-white/10 z-50 flex flex-col shadow-2xl"
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between p-4 border-b border-white/10 bg-black/40">
                            <h2 className="font-bold text-white flex items-center gap-2">
                                <Users size={20} className="text-purple-400" />
                                Social Hub
                            </h2>
                            <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full text-gray-400 hover:text-white transition-colors">
                                <X size={20} />
                            </button>
                        </div>

                        {/* Tabs - HIDDEN FOR NOW UNTIL FRIENDS IMPLEMENTED */}
                        <div className="flex border-b border-white/10 bg-black/20">
                            <button
                                className={cn("flex-1 py-3 text-sm font-bold flex items-center justify-center gap-2 transition-colors text-white bg-white/5 border-b-2 border-purple-500")}
                            >
                                <MessageSquare size={16} /> Chat Global
                            </button>
                        </div>

                        {/* CONTENT: CHAT */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent" ref={scrollRef}>
                            {messages.map((msg) => (
                                <div key={msg.id} className={cn("flex flex-col", msg.sender === user?.username ? "items-end" : "items-start")}>
                                    <div className="flex items-end gap-2 max-w-[85%]">
                                        {msg.sender !== user?.username && (
                                            <div className={cn("w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-black flex-shrink-0", msg.isSystem ? "bg-blue-500" : "bg-purple-500")}>
                                                {msg.sender[0].toUpperCase()}
                                            </div>
                                        )}
                                        <div className={cn(
                                            "px-3 py-2 rounded-2xl text-sm break-words",
                                            msg.isSystem ? "bg-blue-900/30 text-blue-200 border border-blue-500/20 w-full text-center" :
                                                msg.sender === user?.username ? "bg-purple-600 text-white rounded-tr-none" : "bg-[#2a2a2a] text-gray-200 rounded-tl-none"
                                        )}>
                                            {!msg.isSystem && msg.sender !== user?.username && <span className="block text-[10px] font-bold text-purple-400 mb-0.5">{msg.sender}</span>}
                                            {msg.text}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <form onSubmit={handleSend} className="p-3 bg-black/40 border-t border-white/10 flex gap-2">
                            <input
                                type="text"
                                value={inputText}
                                onChange={(e) => setInputText(e.target.value)}
                                placeholder="Escribe un mensaje..."
                                className="flex-1 bg-white/5 border border-white/10 rounded-full px-4 py-2 text-sm text-white focus:outline-none focus:border-purple-500 transition-colors"
                            />
                            <button type="submit" disabled={!inputText.trim()} className="w-10 h-10 rounded-full bg-purple-600 flex items-center justify-center text-white hover:bg-purple-500 disabled:opacity-50 disabled:bg-gray-700 transition-colors">
                                <Send size={16} />
                            </button>
                        </form>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};
