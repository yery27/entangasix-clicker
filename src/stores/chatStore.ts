import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';

export interface ChatMessage {
    id: string;
    sender_id: string;
    recipient_id?: string | null;
    content: string;
    is_global: boolean;
    created_at: string;
    sender?: {
        username: string;
        avatar_url: string;
        cosmetics?: any; // Avoiding deep recursion type, just need the JSON
    };
}

export interface Friend {
    id: string; // The friend's profile ID
    friendship_id: string; // The ID of the friendship row
    username: string;
    avatar_url: string;
    status: 'pending' | 'accepted';
    is_sender: boolean; // True if WE sent the request
    last_seen?: string;
    cosmetics?: {
        equipped: {
            frame?: string;
        };
    };
}

interface ChatState {
    messages: ChatMessage[];
    friends: Friend[];
    activeChat: 'global' | string; // 'global' or friend_id for DM
    loading: boolean;

    // Actions
    setActiveChat: (chatId: 'global' | string) => void;

    // API Actions
    fetchMessages: () => Promise<void>;
    sendMessage: (content: string) => Promise<void>;

    fetchFriends: () => Promise<void>;
    sendFriendRequest: (username: string) => Promise<void>;
    acceptFriendRequest: (friendshipId: string) => Promise<void>;
    rejectFriendRequest: (friendshipId: string) => Promise<void>;

    // Realtime
    initializeRealtime: () => void;
    unsubscribe: () => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
    messages: [],
    friends: [],
    activeChat: 'global',
    loading: false,

    setActiveChat: (chatId) => {
        set({ activeChat: chatId });
        get().fetchMessages();
    },

    fetchMessages: async () => {
        const { activeChat } = get();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        let query = supabase
            .from('messages')
            .select(`
                *,
                sender:sender_id(username, avatar_url, cosmetics)
            `)
            .order('created_at', { ascending: false })
            .limit(50);

        if (activeChat === 'global') {
            query = query.eq('is_global', true);
        } else {
            // Private chat: (sender = me AND recipient = them) OR (sender = them AND recipient = me)
            query = query.or(`and(sender_id.eq.${user.id},recipient_id.eq.${activeChat}),and(sender_id.eq.${activeChat},recipient_id.eq.${user.id})`);
        }

        const { data, error } = await query;

        if (error) {
            console.error('Error fetching messages:', error);
            // toast.error('Error cargando chat');
            return;
        }

        if (data) {
            // Parse cosmetics if they come as string (Supabase sometimes returns stringified JSON)
            const parsedData = data.map((msg: any) => ({
                ...msg,
                sender: msg.sender ? {
                    ...msg.sender,
                    cosmetics: typeof msg.sender.cosmetics === 'string'
                        ? JSON.parse(msg.sender.cosmetics)
                        : msg.sender.cosmetics
                } : undefined
            }));
            set({ messages: parsedData.reverse() });
        }
    },

    sendMessage: async (content) => {
        const { activeChat } = get();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            toast.error('Debes iniciar sesión');
            return;
        }

        const payload = {
            sender_id: user.id,
            content: content.trim(),
            is_global: activeChat === 'global',
            recipient_id: activeChat === 'global' ? null : activeChat
        };

        // Optimistic UI update could go here, but let's rely on Realtime for accuracy first
        const { error } = await supabase.from('messages').insert(payload);

        if (error) {
            console.error('Error sending message:', error);
            toast.error('Error al enviar mensaje');
        }
    },

    fetchFriends: async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Fetch requests where I am the user_id OR the friend_id
        const { data, error } = await supabase
            .from('friends')
            .select(`
                id,
                status,
                user_id,
                friend_id,
                user:user_id(username, avatar_url, last_seen, cosmetics),
                friend:friend_id(username, avatar_url, last_seen, cosmetics)
            `)
            .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`);

        if (error) {
            console.error('Error fetching friends:', error);
            return;
        }

        // Normalize friends list
        const formattedFriends: Friend[] = data.map((row: any) => {
            const isMeUser = row.user_id === user.id;
            const otherProfile = isMeUser ? row.friend : row.user;
            const otherId = isMeUser ? row.friend_id : row.user_id;

            return {
                id: otherId,
                friendship_id: row.id,
                username: otherProfile?.username || 'Unknown',
                avatar_url: otherProfile?.avatar_url,
                last_seen: otherProfile?.last_seen,
                cosmetics: typeof otherProfile?.cosmetics === 'string'
                    ? JSON.parse(otherProfile.cosmetics)
                    : otherProfile?.cosmetics,
                status: row.status,
                is_sender: isMeUser // If I am user, I sent it
            };
        });

        set({ friends: formattedFriends });
    },

    sendFriendRequest: async (username) => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // 1. Find user by username
        const { data: targetUser, error: searchError } = await supabase
            .from('profiles')
            .select('id')
            .eq('username', username)
            .single();

        if (searchError || !targetUser) {
            toast.error('Usuario no encontrado');
            return;
        }

        if (targetUser.id === user.id) {
            toast.error('No puedes ser tu propio amigo 🥺');
            return;
        }

        // 2. Check if request exists
        const { data: existing } = await supabase
            .from('friends')
            .select('id')
            .or(`and(user_id.eq.${user.id},friend_id.eq.${targetUser.id}),and(user_id.eq.${targetUser.id},friend_id.eq.${user.id})`)
            .single();

        if (existing) {
            toast.info('Ya sois amigos o hay una solicitud pendiente.');
            return;
        }

        // 3. Send Request
        const { error } = await supabase.from('friends').insert({
            user_id: user.id,
            friend_id: targetUser.id,
            status: 'pending'
        });

        if (error) {
            toast.error('Error enviando solicitud');
        } else {
            toast.success('Solicitud enviada a ' + username);
            get().fetchFriends(); // Refresh list
        }
    },

    acceptFriendRequest: async (friendshipId) => {
        const { error } = await supabase
            .from('friends')
            .update({ status: 'accepted' })
            .eq('id', friendshipId);

        if (error) toast.error('Error al aceptar');
        else {
            toast.success('¡Ahora sois amigos!');
            get().fetchFriends();
        }
    },

    rejectFriendRequest: async (friendshipId) => {
        const { error } = await supabase.from('friends').delete().eq('id', friendshipId);
        if (error) toast.error('Error al rechazar');
        else {
            toast.info('Solicitud rechazada');
            get().fetchFriends();
        }
    },

    initializeRealtime: () => {
        // Subscribe to messages
        supabase
            .channel('chat_realtime')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
                const { activeChat } = get();
                const newMsg = payload.new as ChatMessage;

                // Only add if it belongs to current chat
                // Global
                if (activeChat === 'global' && newMsg.is_global) {
                    get().fetchMessages();
                }
                // DM matching active chat or user
                if (!newMsg.is_global) {
                    // Refetch to be safe and simple, or append if logic allows
                    get().fetchMessages();
                }
            })
            .subscribe();

        // Subscribe to friends
        supabase
            .channel('friends_realtime')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'friends' }, () => {
                get().fetchFriends();
            })
            .subscribe();
    },

    unsubscribe: () => {
        supabase.removeAllChannels();
    }
}));
