import React, { useState, useEffect, useRef } from 'react';
import { X, Send, User as UserIcon, Shield, Search, Mic, Plus, Image as ImageIcon, Video, Paperclip, MapPin, Smile, ChevronDown, Trash2 } from 'lucide-react';
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
    const shouldDiscardRef = useRef<boolean>(false);

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
        if (isRecording) return; // Prevent multiple starts
        setIsRecording(true); // Set immediately to prevent race conditions

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

                const finalDuration = (Date.now() - recordingStartTimeRef.current) / 1000;

                // Only send if NOT discarded and longer than 0.5s
                if (!shouldDiscardRef.current && user && finalDuration > 0.5) {
                    const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                    await chatService.sendVoiceNote(chatId, audioBlob, finalDuration, user);
                }

                shouldDiscardRef.current = false; // Reset for next time
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
        } catch (error) {
            console.error("Failed to start recording:", error);
            setIsRecording(false); // Reset on error
        }
    };

    const stopVoiceRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            shouldDiscardRef.current = false;
            mediaRecorderRef.current.stop();
            setIsRecording(false);
        }
    };

    const cancelVoiceRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            shouldDiscardRef.current = true;
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
                            <div className="bg-[#D4AF37]/10 backdrop-blur-xl text-[#D4AF37] text-[10px] px-4 py-1.5 rounded-full border border-[#D4AF37]/20 font-black shadow-sm uppercase tracking-widest">
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
                {/* Background Gradient - Inheritance from Global Breathing Gradient */}
                <div className="absolute inset-0 pointer-events-none z-0" style={{
                    background: 'radial-gradient(circle at 50% 50%, #1a1a1a 0%, #000000 100%)',
                    backgroundSize: '400% 400%',
                    animation: 'breathingGradient 15s ease infinite'
                }} />

                {/* Header - Almost invisible glass to prevent 'white strip' look */}
                <div className="relative bg-black/40 backdrop-blur-3xl border-b border-white/5 px-6 py-4 pt-safe-top flex flex-col gap-3 shadow-2xl z-20">
                    <div className="flex justify-between items-center w-full">
                        <div className="flex items-center gap-3">
                            <button onClick={onClose} className="p-2.5 -ml-1 rounded-xl bg-white/5 backdrop-blur-md hover:bg-white/10 text-[#D4AF37] transition-all shadow-lg border border-white/10 active:scale-90" title="Close">
                                <X className="w-6 h-6" strokeWidth={3} />
                            </button>
                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-2xl border border-white/10 shrink-0 backdrop-blur-3xl
                                     ${chatRoom?.type === 'sos' ? 'bg-red-600/20 text-red-500 border-red-500/20' : 'bg-[#D4AF37]/10 text-[#D4AF37] border-[#D4AF37]/20'}
                                 `}>
                                {chatRoom?.type === 'sos' ? <Shield className="w-7 h-7" /> : <UserIcon className="w-7 h-7" />}
                            </div>
                            <div className="min-w-0">
                                <h3 className="font-black text-white text-[15px] leading-tight mb-0.5 truncate font-heading tracking-tight drop-shadow-sm">
                                    {getOtherParticipantName()}
                                </h3>
                                <div className="flex items-center gap-1.5 font-black text-[9px] uppercase tracking-widest font-heading">
                                    {isTyping ? (
                                        <>
                                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                                            <span className="text-emerald-500">typing...</span>
                                        </>
                                    ) : (
                                        <>
                                            <span className={`w-1.5 h-1.5 rounded-full ${presence.isOnline ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-zinc-600'}`} />
                                            <span className={`${presence.isOnline ? 'text-emerald-500' : 'text-zinc-500'}`}>
                                                {presence.isOnline ? 'Online' : presence.lastSeen ? `Last seen ${format(new Date(presence.lastSeen.seconds * 1000), 'h:mm a')}` : getOtherParticipantRole()}
                                            </span>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                        <button
                            onClick={() => setShowSearch(!showSearch)}
                            className={`p-2.5 rounded-xl transition-all active:scale-90 shadow-lg border border-white/10 ${showSearch ? 'bg-[#D4AF37] text-black border-[#D4AF37]' : 'bg-white/5 backdrop-blur-md hover:bg-white/10 text-[#D4AF37]'}`}
                            title="Search messages"
                        >
                            <Search className="w-5 h-5" strokeWidth={3} />
                        </button>
                    </div>

                    {/* Search Input - Improved visibility */}
                    {showSearch && (
                        <div className="px-1 pb-1 animate-in slide-in-from-top duration-300">
                            <div className="relative group">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#D4AF37] group-focus-within:text-[#CF9E1B] transition-colors" strokeWidth={3} />
                                <input
                                    autoFocus
                                    type="text"
                                    placeholder="Search in conversation..."
                                    value={msgSearchTerm}
                                    onChange={(e) => setMsgSearchTerm(e.target.value)}
                                    className="w-full bg-black/40 border border-white/10 rounded-2xl py-3.5 pl-12 pr-4 text-sm font-black text-white placeholder:text-zinc-600 focus:outline-none focus:ring-4 focus:ring-[#D4AF37]/10 transition-all font-heading"
                                />
                            </div>
                        </div>
                    )}
                </div>

                {/* Messages Area Wrapper */}
                <div className="relative flex-1 min-h-0 z-10">
                    <div
                        ref={messagesContainerRef}
                        onScroll={handleScroll}
                        className="absolute inset-0 overflow-y-auto p-5 pb-10 space-y-4 scrollbar-hide bg-transparent"
                    >
                        {loading && messages.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full gap-5">
                                <div className="w-12 h-12 border-[5px] border-[#D4AF37]/20 border-t-[#D4AF37] rounded-full animate-spin" />
                                <p className="text-[#D4AF37] font-black text-[11px] uppercase tracking-[0.25em] animate-pulse font-heading">Secure Link Established...</p>
                            </div>
                        ) : messages.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full text-center px-12">
                                <div className="w-28 h-28 bg-[#D4AF37]/10 backdrop-blur-2xl rounded-[40px] flex items-center justify-center mb-8 shadow-2xl border border-[#D4AF37]/20 animate-in zoom-in-50 duration-700">
                                    <Shield className="w-14 h-14 text-[#D4AF37]/40" />
                                </div>
                                <h3 className="font-black text-white text-xl mb-3 font-heading tracking-tight">Encrypted Channel</h3>
                                <p className="text-sm text-zinc-500 font-bold leading-relaxed opacity-60">
                                    Messages are end-to-end encrypted and monitored for student safety.
                                </p>
                            </div>
                        ) : (
                            renderMessagesWithDates()
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Scroll to Bottom Button */}
                    <AnimatePresence>
                        {showScrollButton && (
                            <motion.button
                                initial={{ opacity: 0, scale: 0.5, y: 20 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.5, y: 20 }}
                                onClick={() => scrollToBottom()}
                                className="absolute bottom-10 right-6 p-4.5 bg-[#D4AF37]/20 backdrop-blur-3xl text-[#D4AF37] rounded-[24px] shadow-2xl border border-[#D4AF37]/30 z-[150] hover:bg-[#D4AF37]/30 hover:scale-110 transition-all group active:scale-95"
                            >
                                <ChevronDown className="w-7 h-7 animate-bounce" style={{ animationDuration: '2.5s' }} />
                                <div className="absolute inset-0 bg-white/5 group-hover:bg-white/10 transition-colors rounded-[24px]" />
                            </motion.button>
                        )}
                    </AnimatePresence>
                </div>

                {/* Input Area - Fully Transparent for Motion Background */}
                <div className="relative p-4 pb-8 bg-transparent transition-colors">
                    {/* Reply Preview */}
                    {/* Floating Native Input Shell */}
                    <div className="flex items-end gap-3 max-w-[95%] mx-auto relative z-[100]">
                        {/* Main Glass Pill - More Transparent/Glassy */}
                        <div className="flex-1 bg-black/40 backdrop-blur-3xl rounded-[32px] shadow-2xl border border-white/5 p-1.5 flex items-center min-h-[56px] transition-all">
                            {!isRecording && (
                                <button
                                    type="button"
                                    onClick={() => setShowMediaMenu(!showMediaMenu)}
                                    className={`p-2.5 rounded-full hover:bg-white/5 transition-all ${showMediaMenu ? 'rotate-45 text-[#D4AF37] bg-[#D4AF37]/10' : 'text-[#D4AF37]'}`}
                                >
                                    <Plus className="w-6 h-6" strokeWidth={3} />
                                </button>
                            )}

                            <div className="flex-1 flex items-center min-h-[44px]">
                                {isRecording ? (
                                    <div className="flex-1 flex items-center gap-3 px-3">
                                        <button
                                            type="button"
                                            onClick={cancelVoiceRecording}
                                            className="p-2 rounded-full bg-red-600/10 text-red-500 hover:bg-red-600/20 transition-all border border-red-500/20"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                        <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.5)]" />
                                        <span className="text-[14px] font-black text-white tracking-tight flex-1">
                                            {Math.floor(recordingDuration / 60)}:{String(recordingDuration % 60).padStart(2, '0')}
                                        </span>
                                    </div>
                                ) : (
                                    <input
                                        type="text"
                                        value={newMessage}
                                        onChange={(e) => {
                                            setNewMessage(e.target.value);
                                            handleTyping();
                                        }}
                                        placeholder="Royal Transmission..."
                                        className="w-full bg-transparent border-none focus:ring-0 text-[15px] font-black text-white placeholder:text-zinc-600 py-2.5 px-3"
                                    />
                                )}
                            </div>

                            {!isRecording && (
                                <button
                                    type="button"
                                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                                    className={`p-2.5 rounded-full hover:bg-white/5 transition-all ${showEmojiPicker ? 'text-[#D4AF37] bg-[#D4AF37]/10' : 'text-[#D4AF37]'}`}
                                >
                                    <Smile className="w-6 h-6" />
                                </button>
                            )}
                        </div>

                        {/* Direct Action Circle */}
                        <div className="flex-shrink-0">
                            {newMessage.trim() || isRecording ? (
                                <button
                                    onClick={handleSend}
                                    className="w-14 h-14 bg-gradient-to-br from-[#CF9E1B] via-[#D4AF37] to-[#8B6E13] text-black rounded-full flex items-center justify-center shadow-2xl hover:scale-105 active:scale-90 transition-all border border-white/20"
                                >
                                    <Send className="w-6 h-6 translate-x-0.5" strokeWidth={3} />
                                </button>
                            ) : (
                                <button
                                    onMouseDown={startVoiceRecording}
                                    onMouseUp={stopVoiceRecording}
                                    onTouchStart={startVoiceRecording}
                                    onTouchEnd={stopVoiceRecording}
                                    className="w-14 h-14 bg-white/5 backdrop-blur-3xl text-[#D4AF37] rounded-full flex items-center justify-center shadow-2xl border border-white/10 hover:bg-white/10 active:scale-95 transition-all"
                                >
                                    <Mic className="w-6 h-6" strokeWidth={3} />
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Menus Overlay */}
                    <AnimatePresence>
                        {showMediaMenu && (
                            <motion.div
                                initial={{ opacity: 0, y: 20, scale: 0.9 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: 20, scale: 0.9 }}
                                className="absolute bottom-[calc(100%+12px)] left-4 mb-4 bg-black/80 backdrop-blur-3xl rounded-[28px] shadow-2xl p-4 grid grid-cols-4 gap-4 border border-white/10 z-[110]"
                            >
                                <button onClick={handleLocationShare} className="flex flex-col items-center gap-1.5 p-3 hover:bg-[#1A7CCC]/5 rounded-2xl transition-all">
                                    <div className="p-3 bg-blue-500/10 rounded-xl"><MapPin className="text-blue-500 w-6 h-6" /></div>
                                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Location</span>
                                </button>
                                <button onClick={() => fileInputRef.current?.click()} className="flex flex-col items-center gap-1.5 p-3 hover:bg-[#1A7CCC]/5 rounded-2xl transition-all">
                                    <div className="p-3 bg-purple-500/10 rounded-xl"><ImageIcon className="text-purple-500 w-6 h-6" /></div>
                                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Gallery</span>
                                </button>
                                <button className="flex flex-col items-center gap-1.5 p-3 hover:bg-[#1A7CCC]/5 rounded-2xl transition-all">
                                    <div className="p-3 bg-red-500/10 rounded-xl"><Video className="text-red-500 w-6 h-6" /></div>
                                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Video</span>
                                </button>
                                <button className="flex flex-col items-center gap-1.5 p-3 hover:bg-[#1A7CCC]/5 rounded-2xl transition-all">
                                    <div className="p-3 bg-orange-500/10 rounded-xl"><Paperclip className="text-orange-500 w-6 h-6" /></div>
                                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Files</span>
                                </button>
                            </motion.div>
                        )}

                        {showEmojiPicker && (
                            <motion.div
                                initial={{ opacity: 0, y: 20, scale: 0.9 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: 20, scale: 0.9 }}
                                className="absolute bottom-[calc(100%+12px)] right-4 mb-4 bg-black/80 backdrop-blur-3xl rounded-[28px] shadow-2xl p-5 border border-white/10 z-[110] max-w-[280px]"
                            >
                                <div className="grid grid-cols-6 gap-3">
                                    {['❤️', '👍', '😂', '😮', '😢', '🙏', '🔥', '✨', '🙌', '✅', '❌', '📍'].map(emoji => (
                                        <button
                                            key={emoji}
                                            type="button"
                                            onClick={() => {
                                                setNewMessage(prev => prev + emoji);
                                                setShowEmojiPicker(false);
                                            }}
                                            className="text-2xl hover:scale-125 transition-transform p-1"
                                        >
                                            {emoji}
                                        </button>
                                    ))}
                                </div>
                            </motion.div>
                        )}

                        {replyTo && (
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: 10 }}
                                className="absolute bottom-[calc(100%+8px)] left-4 right-4 bg-black/80 backdrop-blur-3xl rounded-[24px] shadow-2xl p-4 border border-white/10 z-[105] flex items-center justify-between gap-4"
                            >
                                <div className="flex-1 min-w-0 border-l-4 border-[#D4AF37] pl-4">
                                    <p className="text-[10px] font-black text-[#D4AF37] uppercase tracking-widest font-heading mb-0.5">Replying to {replyTo.senderName}</p>
                                    <p className="text-sm text-slate-600 truncate font-semibold">{replyTo.text || (replyTo.type === 'image' ? 'Photo' : 'Media')}</p>
                                </div>
                                <button onClick={() => setReplyTo(null)} className="p-2 bg-slate-100 hover:bg-slate-200 rounded-full transition-colors">
                                    <X className="w-4 h-4 text-slate-500" />
                                </button>
                            </motion.div>
                        )}

                        {editingMessage && (
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: 10 }}
                                className="absolute bottom-[calc(100%+8px)] left-4 right-4 bg-black/80 backdrop-blur-3xl rounded-[24px] shadow-2xl p-4 border border-white/10 z-[105] flex items-center justify-between gap-4"
                            >
                                <div className="flex-1 min-w-0 border-l-4 border-[#D4AF37] pl-4">
                                    <p className="text-[10px] font-black text-[#D4AF37] uppercase tracking-widest font-heading mb-0.5">Editing Message</p>
                                    <p className="text-sm text-slate-600 truncate font-semibold">{editingMessage.text}</p>
                                </div>
                                <button onClick={() => {
                                    setEditingMessage(null);
                                    setNewMessage('');
                                }} className="p-2 bg-indigo-100 hover:bg-indigo-200 rounded-full transition-colors">
                                    <X className="w-4 h-4 text-indigo-500" />
                                </button>
                            </motion.div>
                        )}
                    </AnimatePresence>
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
