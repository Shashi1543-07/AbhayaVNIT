import React, { useState, useEffect, useRef } from 'react';
import { X, Send, User as UserIcon, Shield, Search } from 'lucide-react';
import { chatService } from '../../services/chatService';
import type { ChatMessage, Conversation } from '../../services/chatService';
import { useAuthStore } from '../../context/authStore';
import MessageBubble from './MessageBubble';

interface ChatWindowProps {
    chatId: string;
    onClose: () => void;
    isMinimized?: boolean;
    onToggleMinimize?: () => void;
}

export default function ChatWindow({ chatId, onClose, isMinimized = false, onToggleMinimize }: ChatWindowProps) {
    const { user } = useAuthStore();
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [chatRoom, setChatRoom] = useState<Conversation | null>(null);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const [msgSearchTerm, setMsgSearchTerm] = useState('');
    const [showSearch, setShowSearch] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Cache key for messages
    const CACHE_KEY = `messages_${chatId}`;

    // Subscribe to Chat & Messages
    useEffect(() => {
        if (!chatId) return;

        // Load messages from cache for instant display
        const cached = localStorage.getItem(CACHE_KEY);
        if (cached) {
            try {
                setMessages(JSON.parse(cached));
                setLoading(false); // Show something immediate
            } catch (e) {
                console.warn("Failed to parse cached messages", e);
            }
        }

        const unsubscribeChat = chatService.subscribeToConversationDetails(chatId, (room) => {
            setChatRoom(room);
        });

        const unsubscribeMessages = chatService.subscribeToMessages(chatId, (msgs) => {
            setMessages(msgs);
            setLoading(false);
            // Persistence
            localStorage.setItem(CACHE_KEY, JSON.stringify(msgs));
            scrollToBottom();
        });

        return () => {
            unsubscribeChat();
            unsubscribeMessages();
        };
    }, [chatId, CACHE_KEY]);

    const scrollToBottom = () => {
        setTimeout(() => {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
    };

    const handleSend = async (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!newMessage.trim() || !user) return;

        try {
            await chatService.sendMessage(chatId, newMessage.trim(), user);
            setNewMessage('');
            scrollToBottom();
        } catch (error) {
            console.error("Failed to send", error);
        }
    };

    const getOtherParticipantName = () => {
        if (chatRoom?.type === 'sos') return '🆘 SOS EMERGENCY';
        if (chatRoom?.type === 'safe_walk') return '🚶 SAFE WALK';

        if (chatRoom?.participantNames && user) {
            const otherId = Object.keys(chatRoom.participantNames).find(id => id !== user.uid);
            if (otherId) return chatRoom.participantNames[otherId];
        }
        return 'Chat';
    };

    const getOtherParticipantRole = () => {
        if (chatRoom?.type !== 'manual') return 'Official Channel';
        if (chatRoom?.participantRoles && user) {
            const otherId = Object.keys(chatRoom.participantRoles).find(id => id !== user.uid);
            if (otherId) return chatRoom.participantRoles[otherId];
        }
        return '';
    };

    if (isMinimized) {
        return (
            <div
                className="fixed bottom-4 right-4 bg-[#075E54] text-white p-4 rounded-full shadow-xl cursor-pointer hover:bg-[#128C7E] transition-all z-50 flex items-center gap-2"
                onClick={onToggleMinimize}
            >
                <Shield className="w-6 h-6" />
                <span className="font-bold">Chat Active</span>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 z-[110] flex flex-col font-sans overflow-hidden pointer-events-none">
            {/* Background Backdrop for better modal focus */}
            <div className="absolute inset-0 bg-slate-900/10 backdrop-blur-[2px]" onClick={onClose} />

            {/* Main Window Container - Constrained for "App-like" feel */}
            <div className="relative w-full max-w-[480px] mx-auto h-full flex flex-col shadow-2xl pointer-events-auto border-x border-white/20 transition-all overflow-hidden">
                {/* Background Gradient - Global Theme Integration */}
                <div className="absolute inset-0 pointer-events-none" style={{
                    background: 'linear-gradient(20deg, #FF99AC 0%, #C084FC 35%, #89CFF0 70%, #FFFFFF 100%)'
                }} />

                {/* Header - Glassy & Rounded Bottom Edges */}
                <div className="relative bg-white/30 backdrop-blur-xl border-b border-white/20 p-4 pt-safe-top flex flex-col gap-3 shadow-sm z-10 rounded-b-[32px]">
                    <div className="flex justify-between items-center w-full">
                        <div className="flex items-center gap-3">
                            <button onClick={onClose} className="p-2.5 -ml-2 rounded-full bg-white/40 hover:bg-white/60 text-slate-700 transition-all shadow-sm border border-white/20 active:scale-90">
                                <X className="w-6 h-6" />
                            </button>
                            <div className={`w-12 h-12 rounded-full flex items-center justify-center shadow-lg border border-white/50 shrink-0
                                ${chatRoom?.type === 'sos' ? 'bg-red-500 text-white' : 'bg-white/80 text-primary'}
                            `}>
                                {chatRoom?.type === 'sos' ? <Shield className="w-6 h-6" /> : <UserIcon className="w-6 h-6" />}
                            </div>
                            <div className="min-w-0">
                                <h3 className="font-extrabold text-slate-800 text-base leading-none mb-1 truncate">
                                    {getOtherParticipantName()}
                                </h3>
                                <div className="flex items-center gap-1.5 font-black text-[9px] uppercase tracking-widest">
                                    <span className={`w-2 h-2 rounded-full ${chatRoom?.type === 'sos' ? 'bg-red-500' : 'bg-green-500'} animate-pulse shadow-sm`} />
                                    <span className="opacity-60">{getOtherParticipantRole()}</span>
                                </div>
                            </div>
                        </div>
                        <button
                            onClick={() => setShowSearch(!showSearch)}
                            className={`p-2.5 rounded-full transition-all active:scale-90 border border-white/10 ${showSearch ? 'bg-primary text-white shadow-lg' : 'bg-white/40 hover:bg-white/60 text-slate-700'}`}
                        >
                            <Search className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Expandable Search Input */}
                    {showSearch && (
                        <div className="px-1 pb-1 animate-in slide-in-from-top duration-300">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <input
                                    autoFocus
                                    type="text"
                                    placeholder="Search in conversation..."
                                    value={msgSearchTerm}
                                    onChange={(e) => setMsgSearchTerm(e.target.value)}
                                    className="w-full bg-white/40 backdrop-blur-3xl border border-white/60 rounded-2xl py-2.5 pl-10 pr-4 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary/20 placeholder:text-slate-500 shadow-inner"
                                />
                            </div>
                        </div>
                    )}
                </div>

                {/* Messages Area - Transparent to show gradient */}
                <div className="relative flex-1 overflow-y-auto p-4 space-y-4 scrollbar-hide bg-transparent">
                    {loading && messages.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full gap-4">
                            <div className="w-10 h-10 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
                            <p className="text-primary-dark font-black text-[10px] uppercase tracking-widest animate-pulse">Establishing Secure Link...</p>
                        </div>
                    ) : messages.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-center px-10">
                            <div className="w-24 h-24 bg-white/20 backdrop-blur-xl rounded-full flex items-center justify-center mb-6 shadow-2xl border border-white/40 animate-in zoom-in-50 duration-500">
                                <Shield className="w-12 h-12 text-white/50" />
                            </div>
                            <h3 className="font-black text-slate-800 text-lg mb-2">Encrypted Channel</h3>
                            <p className="text-xs text-slate-600 font-bold leading-relaxed opacity-70">
                                All messages are monitored for safety and end-to-end encrypted for privacy.
                            </p>
                        </div>
                    ) : (
                        messages
                            .filter(msg =>
                                msg.text.toLowerCase().includes(msgSearchTerm.toLowerCase()) ||
                                msgSearchTerm === ''
                            )
                            .map(msg => (
                                <MessageBubble
                                    key={msg.id}
                                    message={msg}
                                    isMe={msg.senderId === user?.uid}
                                />
                            ))
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* Input Area - Floating Glass Card */}
                <div className="relative p-6 pb-safe-bottom bg-transparent">
                    <form onSubmit={handleSend} className="bg-white/30 backdrop-blur-2xl border border-white/60 rounded-[32px] p-2 shadow-2xl shadow-primary/10 flex items-center gap-2">
                        <div className="flex-1 bg-white/40 rounded-2xl flex items-center px-4 py-2 border border-white/40">
                            <input
                                type="text"
                                value={newMessage}
                                onChange={(e) => setNewMessage(e.target.value)}
                                placeholder="Write a secure message..."
                                className="flex-1 bg-transparent border-none focus:ring-0 text-sm py-2 placeholder:text-slate-500 text-slate-800 font-bold"
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={!newMessage.trim()}
                            className="p-3 bg-gradient-to-br from-primary to-[#A78BFA] text-white rounded-2xl shadow-xl shadow-primary/20 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:scale-100 transition-all flex items-center justify-center h-[52px] w-[52px] border border-white/30"
                        >
                            <Send className="w-5 h-5 ml-0.5" />
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
