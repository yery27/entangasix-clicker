import { useState, useEffect, useRef } from 'react';
import { useAuthStore } from '../../stores/authStore';
import { useChatStore } from '../../stores/chatStore';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Users, MessageSquare, Send, UserPlus, Check, Circle } from 'lucide-react';
import { cn } from '../../lib/utils';
import { COSMETIC_ITEMS } from '../../lib/constants';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

export const SocialPanel = ({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) => {
    const { user } = useAuthStore();
    const {
        messages,
        friends,
        activeChat,
        setActiveChat,
        fetchMessages,
        sendMessage,
        fetchFriends,
        sendFriendRequest,
        acceptFriendRequest,
        rejectFriendRequest,
        initializeRealtime
    } = useChatStore();

    const [inputText, setInputText] = useState('');
    const [addFriendInput, setAddFriendInput] = useState('');
    const [tab, setTab] = useState<'chat' | 'friends'>('chat');

    const scrollRef = useRef<HTMLDivElement>(null);

    // Initialization
    useEffect(() => {
        if (isOpen && user) {
            fetchMessages();
            fetchFriends();
            initializeRealtime();
        }
    }, [isOpen, user]);

    // Scroll to bottom on new messages
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, tab]);

    const handleSend = (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!inputText.trim() || !user) return;
        sendMessage(inputText);
        setInputText('');
    };

    const handleAddFriend = (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!addFriendInput.trim()) return;
        sendFriendRequest(addFriendInput.trim());
        setAddFriendInput('');
    };

    const activeFriend = friends.find(f => f.id === activeChat);

    const getOnlineStatus = (lastSeen?: string) => {
        if (!lastSeen) return 'offline';
        const diff = Date.now() - new Date(lastSeen).getTime();
        return diff < 60000 ? 'online' : 'offline'; // 1 min threshold
    };

    const getFrameStyle = (cosmetics: any) => {
        const frameId = cosmetics?.equipped?.frame;
        return COSMETIC_ITEMS.frames.find(f => f.id === frameId)?.style;
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
                        className="fixed right-0 top-0 h-full w-full md:w-96 bg-[#121212] border-l border-white/10 z-50 flex flex-col shadow-2xl"
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between p-4 border-b border-white/10 bg-black/40">
                            <h2 className="font-bold text-white flex items-center gap-2">
                                <Users size={20} className="text-purple-400" />
                                {tab === 'chat' && activeChat === 'global' ? 'Chat Global' :
                                    tab === 'chat' && activeChat !== 'global' ? `Chat con ${activeFriend?.username || 'Amigo'}` :
                                        'Amigos'}
                            </h2>
                            <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full text-gray-400 hover:text-white transition-colors">
                                <X size={20} />
                            </button>
                        </div>

                        {/* Tabs */}
                        <div className="flex border-b border-white/10 bg-black/20">
                            <button
                                onClick={() => { setTab('chat'); setActiveChat('global'); }}
                                className={cn("flex-1 py-3 text-sm font-bold flex items-center justify-center gap-2 transition-colors",
                                    tab === 'chat' ? "text-white bg-white/5 border-b-2 border-purple-500" : "text-gray-400 hover:text-white")}
                            >
                                <MessageSquare size={16} /> Chat
                            </button>
                            <button
                                onClick={() => setTab('friends')}
                                className={cn("flex-1 py-3 text-sm font-bold flex items-center justify-center gap-2 transition-colors",
                                    tab === 'friends' ? "text-white bg-white/5 border-b-2 border-purple-500" : "text-gray-400 hover:text-white")}
                            >
                                <Users size={16} /> Amigos
                                {friends.filter(f => f.status === 'pending' && !f.is_sender).length > 0 && (
                                    <span className="bg-red-500 text-white text-[10px] px-1.5 rounded-full">
                                        {friends.filter(f => f.status === 'pending' && !f.is_sender).length}
                                    </span>
                                )}
                            </button>
                        </div>

                        {/* CHAT VIEW */}
                        {tab === 'chat' && (
                            <>
                                {/* Sub-header for DMs navigation */}
                                {activeChat !== 'global' && (
                                    <div className="p-2 bg-purple-900/20 border-b border-purple-500/20 flex justify-between items-center">
                                        <span className="text-xs text-purple-200">Privado con {activeFriend?.username}</span>
                                        <button onClick={() => setActiveChat('global')} className="text-xs text-gray-400 hover:text-white underline">Volver al Global</button>
                                    </div>
                                )}

                                <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent" ref={scrollRef}>
                                    {messages.map((msg) => (
                                        <div key={msg.id} className={cn("flex flex-col", msg.sender?.username === user?.username ? "items-end" : "items-start")}>
                                            <div className="flex items-end gap-2 max-w-[85%]">
                                                {msg.sender?.username !== user?.username && (
                                                    <div className="flex flex-col items-center">
                                                        <img
                                                            src={msg.sender?.avatar_url}
                                                            alt="av"
                                                            className={cn(
                                                                "w-6 h-6 rounded-full bg-gray-800",
                                                                getFrameStyle(msg.sender?.cosmetics)
                                                            )}
                                                        />
                                                    </div>
                                                )}
                                                <div className={cn(
                                                    "px-3 py-2 rounded-2xl text-sm break-words shadow-sm",
                                                    msg.sender?.username === user?.username ? "bg-purple-600 text-white rounded-tr-none" : "bg-[#2a2a2a] text-gray-200 rounded-tl-none"
                                                )}>
                                                    {msg.sender?.username !== user?.username && <span className="block text-[10px] font-bold text-purple-400 mb-0.5">{msg.sender?.username}</span>}
                                                    {msg.content}
                                                </div>
                                            </div>
                                            <span className="text-[10px] text-gray-600 mt-1 px-1">
                                                {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true, locale: es })}
                                            </span>
                                        </div>
                                    ))}
                                    {messages.length === 0 && (
                                        <div className="text-center text-gray-500 text-sm mt-10 italic">
                                            {activeChat === 'global' ? 'El chat está tranquilo... di hola 👋' : 'No hay mensajes. ¡Escribe algo!'}
                                        </div>
                                    )}
                                </div>

                                <form onSubmit={handleSend} className="p-3 bg-black/40 border-t border-white/10 flex gap-2">
                                    <input
                                        type="text"
                                        value={inputText}
                                        onChange={(e) => setInputText(e.target.value)}
                                        placeholder={`Enviar a ${activeChat === 'global' ? 'Global' : activeFriend?.username}...`}
                                        className="flex-1 bg-white/5 border border-white/10 rounded-full px-4 py-2 text-sm text-white focus:outline-none focus:border-purple-500 transition-colors"
                                    />
                                    <button type="submit" disabled={!inputText.trim()} className="w-10 h-10 rounded-full bg-purple-600 flex items-center justify-center text-white hover:bg-purple-500 disabled:opacity-50 disabled:bg-gray-700 transition-colors">
                                        <Send size={16} />
                                    </button>
                                </form>
                            </>
                        )}

                        {/* FRIENDS VIEW */}
                        {tab === 'friends' && (
                            <div className="flex-1 flex flex-col overflow-hidden">
                                <div className="p-4 border-b border-white/10">
                                    <form onSubmit={handleAddFriend} className="flex gap-2">
                                        <input
                                            value={addFriendInput}
                                            onChange={(e) => setAddFriendInput(e.target.value)}
                                            placeholder="Buscar usuario..."
                                            className="flex-1 bg-white/5 border border-white/10 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500"
                                        />
                                        <button type="submit" className="bg-green-600 hover:bg-green-500 text-white rounded px-3 py-2 transition-colors">
                                            <UserPlus size={18} />
                                        </button>
                                    </form>
                                </div>

                                <div className="flex-1 overflow-y-auto p-4 space-y-2">
                                    {/* Pending Requests */}
                                    {friends.filter(f => f.status === 'pending').map(request => (
                                        <div key={request.friendship_id} className="bg-yellow-900/20 border border-yellow-500/30 p-3 rounded flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <img
                                                    src={request.avatar_url}
                                                    className={cn(
                                                        "w-8 h-8 rounded-full",
                                                        getFrameStyle(request.cosmetics)
                                                    )}
                                                />
                                                <div>
                                                    <p className="font-bold text-sm text-white">{request.username}</p>
                                                    <p className="text-xs text-yellow-500">{request.is_sender ? 'Esperando respuesta...' : 'Te ha enviado solicitud'}</p>
                                                </div>
                                            </div>
                                            {!request.is_sender && (
                                                <div className="flex gap-2">
                                                    <button onClick={() => acceptFriendRequest(request.friendship_id)} className="p-1.5 bg-green-600/20 text-green-400 hover:bg-green-600 hover:text-white rounded transition-colors"><Check size={16} /></button>
                                                    <button onClick={() => rejectFriendRequest(request.friendship_id)} className="p-1.5 bg-red-600/20 text-red-400 hover:bg-red-600 hover:text-white rounded transition-colors"><X size={16} /></button>
                                                </div>
                                            )}
                                        </div>
                                    ))}

                                    {/* Active Friends */}
                                    <h3 className="text-xs font-bold text-gray-500 uppercase mt-4 mb-2">Mis Amigos</h3>
                                    {friends.filter(f => f.status === 'accepted').map(friend => (
                                        <div key={friend.friendship_id} className="bg-white/5 p-3 rounded flex items-center justify-between hover:bg-white/10 group transition-colors cursor-pointer" onClick={() => { setActiveChat(friend.id); setTab('chat'); }}>
                                            <div className="flex items-center gap-3">
                                                <div className="relative">
                                                    <img
                                                        src={friend.avatar_url}
                                                        className={cn(
                                                            "w-10 h-10 rounded-full",
                                                            getFrameStyle(friend.cosmetics)
                                                        )}
                                                    />
                                                    <Circle size={10} className={cn("absolute bottom-0 right-0 fill-current", getOnlineStatus(friend.last_seen) === 'online' ? "text-green-500" : "text-gray-500")} />
                                                </div>
                                                <div>
                                                    <p className="font-bold text-sm text-white group-hover:text-purple-400 transition-colors">{friend.username}</p>
                                                    <p className="text-xs text-gray-500">{getOnlineStatus(friend.last_seen) === 'online' ? 'En línea' : 'Desconectado'}</p>
                                                </div>
                                            </div>
                                            <MessageSquare size={16} className="text-gray-600 group-hover:text-white" />
                                        </div>
                                    ))}

                                    {friends.length === 0 && (
                                        <div className="text-center text-gray-500 text-sm mt-10">
                                            No tienes amigos aún.<br />¡Busca a alguien para chatear!
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
