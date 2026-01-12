import React, { useState, useEffect, useRef } from 'react';
import { X, Send, User as UserIcon, Shield, Search, Mic, Plus, Image as ImageIcon, Video, Paperclip, MapPin, Smile, Pencil, Check, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { chatService } from '../../services/chatService';
import type { ChatMessage, Conversation } from '../../services/chatService';
import { useAuthStore } from '../../context/authStore';
import MessageBubble from './MessageBubble';
import { format, isToday, isYesterday } from 'date-fns';

interface ChatWindowProps {
    chatId: string;
    onClose: () => void;
    isMinimized?: boolean;
    onToggleMinimize?: () => void;
}

export default function ChatWindow({ chatId, onClose, isMinimized = false, onToggleMinimize }: ChatWindowProps) {
    const { user, role } = useAuthStore();
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [chatRoom, setChatRoom] = useState<Conversation | null>(null);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const [msgSearchTerm, setMsgSearchTerm] = useState('');
    const [showSearch, setShowSearch] = useState(false);
    const [isTyping, setIsTyping] = useState(false);
    const [isRecording, setIsRecording] = useState(false);
    const [showMediaMenu, setShowMediaMenu] = useState(false);
    const [presence, setPresence] = useState<{ isOnline: boolean, lastSeen: any }>({ isOnline: false, lastSeen: null });
    const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);
    const [editingMessage, setEditingMessage] = useState<ChatMessage | null>(null);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [recordingDuration, setRecordingDuration] = useState(0);
    const [showScrollButton, setShowScrollButton] = useState(false);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const messagesContainerRef = useRef<HTMLDivElement>(null);
    const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    const recordingIntervalRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
    const recordingStartTimeRef = useRef<number>(0);

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

    // Robust Auto-Scroll when messages change
    useEffect(() => {
        if (!loading) {
            scrollToBottom();
        }
    }, [messages.length, loading]);

    // Subscribe to other participant's presence
    useEffect(() => {
        if (!user || !chatRoom || !chatId) return;

        // Logic to find the "active" other person to show status for
        let otherId = '';
        if (chatRoom.type === 'sos' || chatRoom.type === 'safe_walk') {
            const roles = chatRoom.participantRoles || {};
            if (role === 'student') {
                otherId = Object.keys(roles).find(id => roles[id] !== 'student') || '';
            } else {
                otherId = Object.keys(roles).find(id => roles[id] === 'student') || '';
            }
        } else {
            // For manual 1-on-1 chats
            otherId = Object.keys(chatRoom.participants).find(id => id !== user.uid) || '';
        }

        if (!otherId) return;

        const unsubscribePresence = chatService.subscribeToPresence(otherId, (p) => {
            setPresence(p);
        });

        return () => unsubscribePresence();
    }, [user?.uid, role, chatRoom?.id, chatRoom?.participants, chatRoom?.participantRoles]);

    // Update current user's presence
    useEffect(() => {
        if (!user) return;
        chatService.updateUserPresence(user.uid);
        const interval = setInterval(() => {
            chatService.updateUserPresence(user.uid);
        }, 60000); // Update every minute

        return () => {
            clearInterval(interval);
            chatService.setUserOffline(user.uid);
        };
    }, [user]);

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

    const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
        const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
        // Show button if user is NOT at the very bottom (10px threshold for instant feel)
        const isAtBottom = Math.ceil(scrollTop + clientHeight) >= scrollHeight - 10;
        setShowScrollButton(!isAtBottom);
    };

    const handleSend = async (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!newMessage.trim() || !user) return;

        try {
            if (editingMessage) {
                // Handle Editing
                await chatService.editMessage(chatId, editingMessage.id, newMessage.trim());
                setEditingMessage(null);
            } else {
                // Handle Sending
                const replyContext = replyTo ? {
                    id: replyTo.id,
                    text: replyTo.text || (replyTo.type === 'image' ? 'Photo' : 'Media'),
                    senderName: replyTo.senderName || 'Staff'
                } : undefined;

                await chatService.sendMessage(chatId, newMessage.trim(), user, 'text', undefined, replyContext);
                setReplyTo(null);
            }

            setNewMessage('');
            chatService.setTypingStatus(chatId, user.uid, false);
            scrollToBottom();
        } catch (error) {
            console.error("Failed to process message", error);
        }
    };

    const startVoiceRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

            // Optimize bitrate for Firestore DataURL storage (1MB limit)
            // 32kbps = ~4KB/sec = ~250 seconds (4 mins) per 1MB
            const options = { audioBitsPerSecond: 32000 };
            const mediaRecorder = new MediaRecorder(stream, options);

            mediaRecorderRef.current = mediaRecorder;
            audioChunksRef.current = [];
            recordingStartTimeRef.current = Date.now();
            setRecordingDuration(0);

            // Live timer update
            recordingIntervalRef.current = setInterval(() => {
                setRecordingDuration(Math.floor((Date.now() - recordingStartTimeRef.current) / 1000));
            }, 1000);

            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    audioChunksRef.current.push(event.data);
                }
            };

            mediaRecorder.onstop = async () => {
                if (recordingIntervalRef.current) {
                    clearInterval(recordingIntervalRef.current);
                }

                const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                const finalDuration = (Date.now() - recordingStartTimeRef.current) / 1000;

                if (user && finalDuration > 0.5) { // Only send if longer than 0.5s
                    await chatService.sendVoiceNote(chatId, audioBlob, finalDuration, user);
                }

                setRecordingDuration(0);
                stream.getTracks().forEach(track => track.stop());
            };

            // Safety limit: 120 seconds (2 minutes)
            setTimeout(() => {
                if (mediaRecorderRef.current?.state === 'recording') {
                    stopVoiceRecording();
                }
            }, 120000);

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

    const handleMediaSelect = async (e: React.ChangeEvent<HTMLInputElement>, type: 'image' | 'video' | 'document') => {
        const file = e.target.files?.[0];
        if (!file || !user) return;

        try {
            // For now, using DataURL as placeholder until Storage is confirmed working
            const reader = new FileReader();
            reader.onloadend = async () => {
                const url = reader.result as string;
                await chatService.sendMessage(chatId, '', user, type, { url, name: file.name });
            };
            reader.readAsDataURL(file);
            setShowMediaMenu(false);
        } catch (error) {
            console.error("Failed to send media", error);
        }
    };

    const handleLocationShare = () => {
        if (!navigator.geolocation || !user) {
            alert("Geolocation not supported");
            return;
        }

        navigator.geolocation.getCurrentPosition(async (pos) => {
            const { latitude, longitude } = pos.coords;
            await chatService.sendMessage(chatId, '📍 Shared my location', user, 'location', {
                location: { latitude, longitude }
            });
            setShowMediaMenu(false);
        }, (err) => {
            console.error("Location error", err);
            alert("Could not get location");
        });
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

    const renderMessagesWithDates = () => {
        const filteredMessages = messages.filter(msg =>
            msg.text.toLowerCase().includes(msgSearchTerm.toLowerCase()) ||
            msgSearchTerm === ''
        );

        const rendered: React.ReactNode[] = [];
        let lastDateStr = "";

        filteredMessages.forEach((msg) => {
            const date = msg.timestamp?.seconds ? new Date(msg.timestamp.seconds * 1000) : null;
            if (date) {
                const dateStr = format(date, 'yyyy-MM-dd');
                if (dateStr !== lastDateStr) {
                    let displayDate = format(date, 'MMMM d, yyyy');
                    if (isToday(date)) displayDate = "Today";
                    else if (isYesterday(date)) displayDate = "Yesterday";

                    rendered.push(
                        <div key={`date-${dateStr}`} className="flex justify-center my-6 sticky top-2 z-20">
                            <div className="bg-white/40 backdrop-blur-xl text-slate-700 text-[10px] px-4 py-1.5 rounded-full border border-white/40 font-black shadow-sm uppercase tracking-widest">
                                {displayDate}
                            </div>
                        </div>
                    );
                    lastDateStr = dateStr;
                }
            }

            rendered.push(
                <MessageBubble
                    key={msg.id}
                    message={msg}
                    isMe={msg.senderId === user?.uid}
                    conversationId={chatId}
                    onReply={() => setReplyTo(msg)}
                    onEdit={(m) => {
                        setEditingMessage(m);
                        setNewMessage(m.text);
                        setReplyTo(null);
                    }}
                />
            );
        });

        return rendered;
    };

    return isMinimized ? (
        <div
            className="fixed bottom-4 right-4 bg-[#075E54] text-white p-4 rounded-full shadow-xl cursor-pointer hover:bg-[#128C7E] transition-all z-50 flex items-center gap-2"
            onClick={onToggleMinimize}
        >
            <Shield className="w-6 h-6" />
            <span className="font-bold">Chat Active</span>
        </div>
    ) : (
        <div className="fixed inset-0 z-[110] flex flex-col font-sans overflow-hidden pointer-events-none">
            {/* Background Backdrop */}
            <div className="absolute inset-0 bg-slate-900/10 backdrop-blur-[2px]" onClick={onClose} />

            {/* Main Window Container - REBUILT TO MATCH APP WIDTH */}
            <div className="relative w-full h-full flex flex-col pointer-events-auto bg-transparent transition-all overflow-hidden">
                {/* Background Gradient - Global Consistency */}
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
                                            <span className={`w-2 h-2 rounded-full ${presence.isOnline ? 'bg-green-500' : 'bg-slate-400'} shadow-sm`} />
                                            <span className="opacity-60">
                                                {presence.isOnline ? 'Online' : presence.lastSeen ? `Last seen ${format(new Date(presence.lastSeen.seconds * 1000), 'h:mm a')}` : getOtherParticipantRole()}
                                            </span>
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
                                />
                            </div>
                        </div>
                    )}
                </div>

                {/* Messages Area Wrapper */}
                <div className="relative flex-1 min-h-0">
                    <div
                        ref={messagesContainerRef}
                        onScroll={handleScroll}
                        className="absolute inset-0 overflow-y-auto p-4 space-y-4 scrollbar-hide bg-transparent"
                    >
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
                            renderMessagesWithDates()
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Scroll to Bottom Button - MOVED HIGHER AND HIGHER Z-INDEX */}
                    <AnimatePresence>
                        {showScrollButton && (
                            <motion.button
                                initial={{ opacity: 0, scale: 0.5, y: 20 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.5, y: 20 }}
                                onClick={() => scrollToBottom()}
                                className="absolute bottom-10 right-6 p-4 bg-white/60 backdrop-blur-2xl text-primary rounded-full shadow-[0_8px_32px_rgba(0,0,0,0.15)] border border-white/60 z-[150] hover:bg-white/80 transition-all group active:scale-95"
                            >
                                <ChevronDown className="w-6 h-6 animate-bounce" style={{ animationDuration: '2s' }} />
                                <div className="absolute inset-0 bg-primary/5 group-hover:bg-primary/10 transition-colors rounded-full" />
                            </motion.button>
                        )}
                    </AnimatePresence>
                </div>

                {/* Input Area */}
                <div className="relative p-4 pb-10 bg-white/20 backdrop-blur-3xl border-t border-white/20">
                    {/* Reply Preview */}
                    {replyTo && (
                        <div className="absolute bottom-full left-4 right-4 mb-2 bg-white/90 backdrop-blur-xl rounded-2xl shadow-xl p-3 border border-white/40 z-[100] animate-in slide-in-from-bottom flex items-center justify-between gap-3">
                            <div className="flex-1 min-w-0 border-l-4 border-primary pl-3">
                                <p className="text-[10px] font-black text-primary uppercase">Replying to {replyTo.senderName}</p>
                                <p className="text-xs text-slate-600 truncate">{replyTo.text || (replyTo.type === 'image' ? 'Photo' : 'Media')}</p>
                            </div>
                            <button onClick={() => setReplyTo(null)} className="p-1 hover:bg-slate-100 rounded-full">
                                <X className="w-4 h-4 text-slate-400" />
                            </button>
                        </div>
                    )}

                    {/* Edit Preview */}
                    {editingMessage && (
                        <div className="absolute bottom-full left-4 right-4 mb-2 bg-primary/10 backdrop-blur-xl rounded-2xl shadow-xl p-3 border border-primary/20 z-[100] animate-in slide-in-from-bottom flex items-center justify-between gap-3">
                            <div className="flex-1 min-w-0 border-l-4 border-primary pl-3">
                                <span className="text-[10px] font-black text-primary uppercase flex items-center gap-1">
                                    <Pencil className="w-3 h-3" /> Editing Message
                                </span>
                                <p className="text-xs text-slate-600 truncate">{editingMessage.text}</p>
                            </div>
                            <button onClick={() => {
                                setEditingMessage(null);
                                setNewMessage('');
                            }} className="p-1 hover:bg-white/50 rounded-full">
                                <X className="w-4 h-4 text-slate-400" />
                            </button>
                        </div>
                    )}
                    {/* Media Menu */}
                    {showMediaMenu && (
                        <div className="absolute bottom-full left-4 mb-4 bg-white/90 backdrop-blur-xl rounded-2xl shadow-2xl p-4 grid grid-cols-4 gap-4 animate-in slide-in-from-bottom border border-white/40 z-[100]">
                            <button onClick={handleLocationShare} className="flex flex-col items-center gap-1 p-2 hover:bg-primary/10 rounded-xl transition-colors">
                                <MapPin className="text-blue-500" />
                                <span className="text-[10px] font-bold">Location</span>
                            </button>
                            <button onClick={() => fileInputRef.current?.click()} className="flex flex-col items-center gap-1 p-2 hover:bg-primary/10 rounded-xl transition-colors">
                                <ImageIcon className="text-purple-500" />
                                <span className="text-[10px] font-bold">Gallery</span>
                            </button>
                            <button className="flex flex-col items-center gap-1 p-2 hover:bg-primary/10 rounded-xl transition-colors">
                                <Video className="text-red-500" />
                                <span className="text-[10px] font-bold">Video</span>
                            </button>
                            <button className="flex flex-col items-center gap-1 p-2 hover:bg-primary/10 rounded-xl transition-colors">
                                <Paperclip className="text-orange-500" />
                                <span className="text-[10px] font-bold">Files</span>
                            </button>
                        </div>
                    )}

                    <form onSubmit={handleSend} className="bg-white/40 border border-white/60 rounded-[28px] p-1.5 flex items-center gap-2 shadow-inner">
                        <button
                            type="button"
                            onClick={() => setShowMediaMenu(!showMediaMenu)}
                            className={`p-2 rounded-full hover:bg-white/60 transition-all ${showMediaMenu ? 'rotate-45 text-primary' : 'text-slate-600'}`}
                        >
                            <Plus className="w-6 h-6" />
                        </button>

                        {/* Input Field Overlay */}
                        <div className="flex-1 bg-white/40 rounded-2xl p-1 px-3 flex items-center gap-2">
                            {isRecording ? (
                                <div className="flex-1 flex items-center gap-3 px-2">
                                    <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.5)]" />
                                    <span className="text-[11px] font-black text-red-600 uppercase tracking-widest flex-1">
                                        Recording {Math.floor(recordingDuration / 60)}:{String(recordingDuration % 60).padStart(2, '0')}
                                    </span>
                                </div>
                            ) : (
                                <>
                                    <input
                                        type="text"
                                        value={newMessage}
                                        onChange={(e) => {
                                            setNewMessage(e.target.value);
                                            handleTyping();
                                        }}
                                        placeholder="Message..."
                                        onClick={() => setShowEmojiPicker(false)}
                                        className="flex-1 bg-transparent border-none focus:ring-0 text-sm py-2 font-bold text-slate-800 placeholder:text-slate-400"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                                        className={`p-1 transition-colors ${showEmojiPicker ? 'text-primary' : 'text-slate-500 hover:text-primary'}`}
                                    >
                                        <Smile className="w-5 h-5" />
                                    </button>
                                </>
                            )}
                        </div>

                        {/* Quick Emoji Picker */}
                        {showEmojiPicker && (
                            <div className="absolute bottom-full right-4 mb-4 bg-white/95 backdrop-blur-2xl rounded-2xl shadow-2xl p-4 grid grid-cols-6 gap-3 animate-in fade-in zoom-in-50 duration-200 border border-white/40 z-[100] max-w-[280px]">
                                {['❤️', '👍', '😂', '😮', '😢', '🙏', '🔥', '✨', '🙌', '✅', '❌', '📍'].map(emoji => (
                                    <button
                                        key={emoji}
                                        type="button"
                                        onClick={() => {
                                            setNewMessage(prev => prev + emoji);
                                            setShowEmojiPicker(false);
                                        }}
                                        className="text-xl hover:scale-125 transition-transform p-1"
                                    >
                                        {emoji}
                                    </button>
                                ))}
                            </div>
                        )}

                        {editingMessage ? (
                            <button
                                type="submit"
                                className="p-3 bg-green-500 text-white rounded-full shadow-lg shadow-green-500/30 active:scale-90 transition-all"
                            >
                                <Check className="w-5 h-5" />
                            </button>
                        ) : newMessage.trim() === '' ? (
                            <button
                                type="button"
                                onMouseDown={startVoiceRecording}
                                onMouseUp={stopVoiceRecording}
                                onTouchStart={startVoiceRecording}
                                onTouchEnd={stopVoiceRecording}
                                className={`p-3 rounded-full transition-all ${isRecording ? 'bg-red-500 scale-125 shadow-red-500/50' : 'bg-white/60 text-slate-600'} shadow-lg`}
                            >
                                <Mic className={`w-5 h-5 ${isRecording ? 'text-white translate-y-[-2px] animate-pulse' : ''}`} />
                            </button>
                        ) : (
                            <button
                                type="submit"
                                className="p-3 bg-primary text-white rounded-full shadow-lg shadow-primary/30 active:scale-90 transition-all"
                            >
                                <Send className="w-5 h-5" />
                            </button>
                        )}
                    </form>
                    <input
                        type="file"
                        ref={fileInputRef}
                        className="hidden"
                        onChange={(e) => handleMediaSelect(e, 'image')}
                        accept="image/*,video/*,application/pdf"
                    />
                </div>
            </div>
        </div>
    );
}
