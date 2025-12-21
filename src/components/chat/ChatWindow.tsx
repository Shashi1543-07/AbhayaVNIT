import React, { useState, useEffect, useRef } from 'react';
import { Send, X, Minimize2, Shield } from 'lucide-react';
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
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Subscribe to Chat & Messages
    useEffect(() => {
        if (!chatId) return;

        const unsubscribeChat = chatService.subscribeToConversationDetails(chatId, (room) => {
            setChatRoom(room);
        });

        const unsubscribeMessages = chatService.subscribeToMessages(chatId, (msgs) => {
            setMessages(msgs);
            setLoading(false);
            scrollToBottom();
        });

        return () => {
            unsubscribeChat();
            unsubscribeMessages();
        };
    }, [chatId]);

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

    if (isMinimized) {
        return (
            <div
                className="fixed bottom-4 right-4 bg-primary text-white p-4 rounded-full shadow-xl cursor-pointer hover:bg-primary-dark transition-all z-50 flex items-center gap-2"
                onClick={onToggleMinimize}
            >
                <Shield className="w-6 h-6" />
                <span className="font-bold">Chat Active</span>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 z-[100] flex flex-col font-sans bg-slate-50">
            {/* Background Gradient matching global theme */}
            {/* Background Gradient matching global theme */}
            <div className="absolute inset-0 pointer-events-none" style={{
                background: 'linear-gradient(20deg, #FF99AC 0%, #C084FC 35%, #89CFF0 70%, #FFFFFF 100%)'
            }} />

            {/* Header */}
            <div className="relative bg-white/30 backdrop-blur-md border-b border-white/20 p-4 pt-safe-top flex justify-between items-center shadow-sm z-10">
                <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center shadow-sm
                        ${chatRoom?.type === 'sos' ? 'bg-red-100 text-red-600' : 'bg-primary/10 text-primary'}
                    `}>
                        <Shield className="w-5 h-5" />
                    </div>
                    <div>
                        <h3 className="font-bold text-slate-800 text-lg">
                            {chatRoom?.type === 'sos' ? 'SOS Emergency' : 'Live Support'}
                        </h3>
                        <p className="text-xs text-slate-500 flex items-center gap-1 font-medium">
                            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                            Security Active
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={onToggleMinimize} className="p-2 hover:bg-white/40 rounded-full text-slate-500 transition-colors">
                        <Minimize2 className="w-5 h-5" />
                    </button>
                    <button onClick={onClose} className="p-2 hover:bg-red-500/10 rounded-full text-slate-500 hover:text-red-600 transition-colors">
                        <X className="w-6 h-6" />
                    </button>
                </div>
            </div>

            {/* Messages */}
            <div className="relative flex-1 overflow-y-auto p-4 space-y-4 scrollbar-hide">
                {loading ? (
                    <div className="flex justify-center items-center h-full text-slate-400 text-sm">
                        <div className="animate-pulse">Loading secure chat...</div>
                    </div>
                ) : messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-slate-400 text-sm text-center px-8 opacity-60">
                        <Shield className="w-16 h-16 mb-4 text-slate-300" />
                        <p className="font-medium text-slate-500">Secure Channel Established</p>
                        <p className="text-xs mt-1">Messages are monitored by Security & Warden.</p>
                    </div>
                ) : (
                    messages.map(msg => (
                        <MessageBubble
                            key={msg.id}
                            message={msg}
                            isMe={msg.senderId === user?.uid}
                        />
                    ))
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <form onSubmit={handleSend} className="relative p-4 bg-white/20 backdrop-blur-xl border-t border-white/20 pb-safe-bottom">
                <div className="flex items-end gap-3 max-w-2xl mx-auto">
                    <div className="flex-1 bg-white/40 backdrop-blur-md rounded-2xl border border-white/30 focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/10 transition-all shadow-sm flex items-center p-1">
                        <input
                            type="text"
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            placeholder="Type a message..."
                            className="flex-1 bg-transparent border-none focus:ring-0 text-sm p-3 placeholder:text-slate-500 min-h-[44px] text-slate-800"
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={!newMessage.trim()}
                        className="p-3 bg-gradient-to-r from-green-400 to-green-500 text-white rounded-full shadow-lg shadow-green-500/20 hover:shadow-green-500/40 hover:scale-105 disabled:opacity-50 disabled:shadow-none disabled:cursor-not-allowed transition-all transform active:scale-95 flex items-center justify-center h-[46px] w-[46px]"
                    >
                        <Send className="w-5 h-5 ml-0.5" />
                    </button>
                </div>
            </form>
        </div>
    );
}
