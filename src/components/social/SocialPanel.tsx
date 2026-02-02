import { useState, useEffect, useRef } from 'react';
import { useAuthStore } from '../../stores/authStore';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Users, MessageSquare, Send, UserPlus, Trash2, Circle } from 'lucide-react';
import { cn } from '../../lib/utils';
import { toast } from 'sonner';

interface Message {
    id: string;
    sender: string;
    text: string;
    timestamp: number;
    isSystem?: boolean;
}

export const SocialPanel = ({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) => {
    const { user, addFriend, removeFriend } = useAuthStore();
    const [activeTab, setActiveTab] = useState<'chat' | 'friends'>('chat');
    const [messages, setMessages] = useState<Message[]>([
        { id: '1', sender: 'System', text: '¡Bienvenido al chat global!', timestamp: Date.now(), isSystem: true }
    ]);
    const [inputText, setInputText] = useState('');
    const [newFriendName, setNewFriendName] = useState('');
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
    }, [messages, activeTab, isOpen]);

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

    const handleAddFriend = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newFriendName.trim()) return;
        if (newFriendName === user?.username) return toast.error("No puedes añadirte a ti mismo");
        addFriend(newFriendName);
        toast.success(`${newFriendName} añadido a amigos`);
        setNewFriendName('');
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

                        {/* Tabs */}
                        <div className="flex border-b border-white/10 bg-black/20">
                            <button
                                onClick={() => setActiveTab('chat')}
                                className={cn("flex-1 py-3 text-sm font-bold flex items-center justify-center gap-2 transition-colors", activeTab === 'chat' ? "text-white bg-white/5 border-b-2 border-purple-500" : "text-gray-500 hover:text-gray-300")}
                            >
                                <MessageSquare size={16} /> Chat Global
                            </button>
                            <button
                                onClick={() => setActiveTab('friends')}
                                className={cn("flex-1 py-3 text-sm font-bold flex items-center justify-center gap-2 transition-colors", activeTab === 'friends' ? "text-white bg-white/5 border-b-2 border-purple-500" : "text-gray-500 hover:text-gray-300")}
                            >
                                <Users size={16} /> Amigos ({user?.friends?.length || 0})
                            </button>
                        </div>

                        {/* CONTENT: CHAT */}
                        {activeTab === 'chat' && (
                            <>
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
                            </>
                        )}

                        {/* CONTENT: FRIENDS */}
                        {activeTab === 'friends' && (
                            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                                <form onSubmit={handleAddFriend} className="flex gap-2 mb-6">
                                    <input
                                        type="text"
                                        value={newFriendName}
                                        onChange={(e) => setNewFriendName(e.target.value)}
                                        placeholder="Nombre de usuario..."
                                        className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500 transition-colors"
                                    />
                                    <button type="submit" disabled={!newFriendName.trim()} className="px-3 bg-green-600 rounded-lg text-white hover:bg-green-500 disabled:opacity-50 transition-colors flex items-center gap-2 text-sm font-bold">
                                        <UserPlus size={16} /> Añadir
                                    </button>
                                </form>

                                <div className="space-y-2">
                                    {user?.friends && user.friends.length > 0 ? (
                                        user.friends.map((friend) => (
                                            <div key={friend} className="flex items-center justify-between bg-white/5 border border-white/10 p-3 rounded-lg hover:bg-white/10 transition-colors group">
                                                <div className="flex items-center gap-3">
                                                    <div className="relative">
                                                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center font-bold text-white text-xs">
                                                            {friend[0].toUpperCase()}
                                                        </div>
                                                        <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-green-500 border-2 border-[#1a1a1a] rounded-full"></div>
                                                    </div>
                                                    <div>
                                                        <div className="text-sm font-bold text-white">{friend}</div>
                                                        <div className="text-[10px] text-green-400 flex items-center gap-1">
                                                            <Circle size={6} fill="currentColor" /> En línea
                                                        </div>
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={() => removeFriend(friend)}
                                                    className="p-2 text-gray-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all rounded-full hover:bg-white/5"
                                                    title="Eliminar amigo"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="text-center py-12 text-gray-500 flex flex-col items-center gap-2">
                                            <Users size={32} className="opacity-20" />
                                            <p className="text-sm">No tienes amigos añadidos.</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};
