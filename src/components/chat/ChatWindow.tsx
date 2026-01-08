import React, { useState, useEffect, useRef } from 'react';
import { X, Send, User as UserIcon, Shield, Search, Mic, MicOff } from 'lucide-react';
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
    const [isTyping, setIsTyping] = useState(false);
    const [isRecording, setIsRecording] = useState(false);
    const [isVoiceTyping, setIsVoiceTyping] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    const recognitionRef = useRef<any>(null);

    // Subscribe to Chat & Messages
    useEffect(() => {
        if (!chatId) return;

        const unsubscribeChat = chatService.subscribeToConversationDetails(chatId, (room) => {
            setChatRoom(room);
        });

        const unsubscribeMessages = chatService.subscribeToMessages(chatId, async (msgs) => {
            setMessages(msgs);
            setLoading(false);
            scrollToBottom();

            if (!user) return;

            // 1. Mark undelivered messages as delivered (messages sent by others that aren't delivered yet)
            const undeliveredMessages = msgs.filter(
                msg => msg.senderId !== user.uid && msg.status === 'sent'
            );
            if (undeliveredMessages.length > 0) {
                await chatService.updateMessageStatus(
                    chatId,
                    undeliveredMessages.map(m => m.id),
                    'delivered'
                );
            }

            // 2. Mark delivered messages as seen (when chat is open)
            await chatService.markMessagesAsSeen(chatId, msgs, user.uid);
        });

        // Subscribe to typing status
        const unsubscribeTyping = chatService.subscribeToTypingStatus(chatId, user?.uid || '', (typing) => {
            setIsTyping(typing);
        });

        return () => {
            unsubscribeChat();
            unsubscribeMessages();
            unsubscribeTyping();
        };
    }, [chatId, user]);

    const scrollToBottom = () => {
        setTimeout(() => {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
    };

    const handleTyping = () => {
        if (!user) return;

        // Set typing status to true
        chatService.setTypingStatus(chatId, user.uid, true);

        // Clear existing timeout
        if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current);
        }

        // Set timeout to clear typing status
        typingTimeoutRef.current = setTimeout(() => {
            chatService.setTypingStatus(chatId, user.uid, false);
        }, 3000);
    };

    const handleSend = async (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!newMessage.trim() || !user) return;

        try {
            await chatService.sendMessage(chatId, newMessage.trim(), user);
            setNewMessage('');
            chatService.setTypingStatus(chatId, user.uid, false);
            scrollToBottom();
        } catch (error) {
            console.error("Failed to send", error);
        }
    };

    const startVoiceRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mediaRecorder = new MediaRecorder(stream);
            mediaRecorderRef.current = mediaRecorder;
            audioChunksRef.current = [];

            mediaRecorder.ondataavailable = (event) => {
                audioChunksRef.current.push(event.data);
            };

            mediaRecorder.onstop = async () => {
                const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                const duration = audioChunksRef.current.length; // Approximate

                if (user) {
                    await chatService.sendVoiceNote(chatId, audioBlob, duration, user);
                }

                stream.getTracks().forEach(track => track.stop());
            };

            mediaRecorder.start();
            setIsRecording(true);
        } catch (error) {
            console.error("Failed to start recording:", error);
        }
    };

    const stopVoiceRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
        }
    };

    const startVoiceTyping = () => {
        if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
            alert('Voice typing not supported in this browser');
            return;
        }

        const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = 'en-US';

        recognition.onresult = (event: any) => {
            const transcript = event.results[0][0].transcript;
            setNewMessage(prev => prev + ' ' + transcript);
            setIsVoiceTyping(false);
        };

        recognition.onerror = () => {
            setIsVoiceTyping(false);
        };

        recognition.onend = () => {
            setIsVoiceTyping(false);
        };

        recognition.start();
        recognitionRef.current = recognition;
        setIsVoiceTyping(true);
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
            {/* Background Backdrop */}
            <div className="absolute inset-0 bg-slate-900/10 backdrop-blur-[2px]" onClick={onClose} />

            {/* Main Window Container */}
            <div className="relative w-full max-w-[480px] mx-auto h-full flex flex-col shadow-2xl pointer-events-auto border-x border-white/20 transition-all overflow-hidden">
                {/* Background Gradient */}
                <div className="absolute inset-0 pointer-events-none" style={{
                    background: 'linear-gradient(20deg, #FF99AC 0%, #C084FC 35%, #89CFF0 70%, #FFFFFF 100%)'
                }} />

                {/* Header */}
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
                                    {isTyping ? (
                                        <>
                                            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse shadow-sm" />
                                            <span className="text-green-600">typing...</span>
                                        </>
                                    ) : (
                                        <>
                                            <span className={`w-2 h-2 rounded-full ${chatRoom?.type === 'sos' ? 'bg-red-500' : 'bg-green-500'} animate-pulse shadow-sm`} />
                                            <span className="opacity-60">{getOtherParticipantRole()}</span>
                                        </>
                                    )}
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

                    {/* Search Input */}
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

                {/* Messages Area */}
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
                                    conversationId={chatId}
                                />
                            ))
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* Input Area */}
                <div className="relative p-6 pb-safe-bottom bg-transparent">
                    <form onSubmit={handleSend} className="bg-white/30 backdrop-blur-2xl border border-white/60 rounded-[32px] p-2 shadow-2xl shadow-primary/10 flex items-center gap-2">
                        {/* Voice Note Button */}
                        <button
                            type="button"
                            onClick={isRecording ? stopVoiceRecording : startVoiceRecording}
                            className={`p-3 ${isRecording ? 'bg-red-500 animate-pulse' : 'bg-white/40 hover:bg-white/60'} rounded-2xl transition-all active:scale-95 border border-white/30 flex items-center justify-center`}
                        >
                            {isRecording ? <MicOff className="w-5 h-5 text-white" /> : <Mic className="w-5 h-5 text-slate-700" />}
                        </button>

                        {/* Input Field */}
                        <div className="flex-1 bg-white/40 rounded-2xl flex items-center px-4 py-2 border border-white/40">
                            <input
                                type="text"
                                value={newMessage}
                                onChange={(e) => {
                                    setNewMessage(e.target.value);
                                    handleTyping();
                                }}
                                placeholder="Write a secure message..."
                                className="flex-1 bg-transparent border-none focus:ring-0 text-sm py-2 placeholder:text-slate-500 text-slate-800 font-bold"
                            />
                            {/* Voice Typing Button */}
                            <button
                                type="button"
                                onClick={startVoiceTyping}
                                className={`ml-2 p-1.5 rounded-lg ${isVoiceTyping ? 'bg-red-500 animate-pulse' : 'bg-white/40 hover:bg-white/60'} transition-all`}
                            >
                                <Mic className={`w-4 h-4 ${isVoiceTyping ? 'text-white' : 'text-slate-700'}`} />
                            </button>
                        </div>

                        {/* Send Button */}
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
