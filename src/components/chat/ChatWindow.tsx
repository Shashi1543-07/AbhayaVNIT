import React, { useState, useEffect, useRef } from 'react';
import { X, Send, User as UserIcon, Shield, Search, Mic, Plus, Image as ImageIcon, Video, MapPin, Smile, ChevronDown, Trash2, Pause, Play, StopCircle, FileText } from 'lucide-react';
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
    const [showMediaMenu, setShowMediaMenu] = useState(false);
    const [presence, setPresence] = useState<{ isOnline: boolean, lastSeen: any }>({ isOnline: false, lastSeen: null });
    const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);
    const [editingMessage, setEditingMessage] = useState<ChatMessage | null>(null);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [recordingDuration, setRecordingDuration] = useState(0);
    const [showScrollButton, setShowScrollButton] = useState(false);

    // Voice Note State
    const [recordingStatus, setRecordingStatus] = useState<'idle' | 'recording' | 'paused' | 'review'>('idle');
    const [audioPreviewUrl, setAudioPreviewUrl] = useState<string | null>(null);
    const [audioBlob, setAudioBlob] = useState<Blob | null>(null);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const videoInputRef = useRef<HTMLInputElement>(null);
    const docInputRef = useRef<HTMLInputElement>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const messagesContainerRef = useRef<HTMLDivElement>(null);
    const inputAreaRef = useRef<HTMLDivElement>(null);
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

    // Close menus when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (inputAreaRef.current && !inputAreaRef.current.contains(event.target as Node)) {
                setShowMediaMenu(false);
                setShowEmojiPicker(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const toggleMediaMenu = () => {
        setShowMediaMenu(!showMediaMenu);
        if (!showMediaMenu) setShowEmojiPicker(false);
    };

    const toggleEmojiPicker = () => {
        setShowEmojiPicker(!showEmojiPicker);
        if (!showEmojiPicker) setShowMediaMenu(false);
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
        if (recordingStatus !== 'idle') return;

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const options = { audioBitsPerSecond: 32000 };
            const mediaRecorder = new MediaRecorder(stream, options);

            mediaRecorderRef.current = mediaRecorder;
            audioChunksRef.current = [];
            recordingStartTimeRef.current = Date.now();
            setRecordingDuration(0);

            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    audioChunksRef.current.push(event.data);
                }
            };

            mediaRecorder.onstop = () => {
                const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                setAudioBlob(blob);
                const url = URL.createObjectURL(blob);
                setAudioPreviewUrl(url);
                stream.getTracks().forEach(track => track.stop());
            };

            mediaRecorder.start(200); // Collect 200ms chunks
            setRecordingStatus('recording');

            // Timer
            recordingIntervalRef.current = setInterval(() => {
                setRecordingDuration(prev => prev + 1);
            }, 1000);

        } catch (error) {
            console.error("Failed to start recording:", error);
        }
    };

    const pauseVoiceRecording = () => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
            mediaRecorderRef.current.pause();
            setRecordingStatus('paused');
            if (recordingIntervalRef.current) clearInterval(recordingIntervalRef.current);
        }
    };

    const resumeVoiceRecording = () => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'paused') {
            mediaRecorderRef.current.resume();
            setRecordingStatus('recording');
            recordingIntervalRef.current = setInterval(() => {
                setRecordingDuration(prev => prev + 1);
            }, 1000);
        }
    };

    const stopVoiceRecording = () => {
        // Transition to Review Mode
        if (mediaRecorderRef.current) {
            mediaRecorderRef.current.stop();
            setRecordingStatus('review');
            if (recordingIntervalRef.current) clearInterval(recordingIntervalRef.current);
        }
    };

    const deleteVoiceRecording = () => {
        if (mediaRecorderRef.current) {
            mediaRecorderRef.current.stream.getTracks().forEach(t => t.stop());
        }
        setRecordingStatus('idle');
        setAudioBlob(null);
        setAudioPreviewUrl(null);
        setRecordingDuration(0);
        if (recordingIntervalRef.current) clearInterval(recordingIntervalRef.current);
    };

    const sendVoiceMessage = async () => {
        if (!audioBlob || !user) return;
        try {
            // Using logic from original handler, but adapted
            await chatService.sendVoiceNote(chatId, audioBlob, recordingDuration, user);
            deleteVoiceRecording(); // Reset after send
            scrollToBottom();
        } catch (error) {
            console.error("Failed to send voice note", error);
        }
    };

    const handleMediaSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !user) return;

        try {
            // For now, using DataURL as placeholder until Storage is confirmed working
            const reader = new FileReader();
            reader.readAsDataURL(file);
            setShowMediaMenu(false);
        } catch (error) {
            console.error("Failed to send media", error);
        }
    };

    // Helper for file inputs
    const triggerFileSelect = (ref: React.RefObject<HTMLInputElement | null>) => {
        ref.current?.click();
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

                {/* Header - Increased size to match TopHeader */}
                <div className="relative bg-black/40 backdrop-blur-3xl border-b border-white/5 px-5 py-4 pt-safe-top flex flex-col gap-3 shadow-2xl z-20">
                    <div className="flex justify-between items-center w-full">
                        <div className="flex items-center gap-3.5">
                            <button onClick={onClose} className="p-2.5 -ml-2 rounded-xl bg-white/5 backdrop-blur-md hover:bg-white/10 text-[#D4AF37] transition-all shadow-lg border border-white/10 active:scale-90" title="Close">
                                <X className="w-6 h-6" strokeWidth={3} />
                            </button>
                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-2xl border border-white/10 shrink-0 backdrop-blur-3xl
                                     ${chatRoom?.type === 'sos' ? 'bg-red-600/20 text-red-500 border-red-500/20' : 'bg-[#D4AF37]/10 text-[#D4AF37] border-[#D4AF37]/20'}
                                 `}>
                                {chatRoom?.type === 'sos' ? <Shield className="w-7 h-7" /> : <UserIcon className="w-7 h-7" />}
                            </div>
                            <div className="min-w-0">
                                <h3 className="font-extrabold text-white text-lg leading-tight mb-0.5 truncate font-heading tracking-tight drop-shadow-sm">
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
                <div className="relative p-2 pb-6 bg-transparent transition-colors z-[100]" ref={inputAreaRef}>
                    {/* Recording Mode UI */}
                    {recordingStatus !== 'idle' ? (
                        <div className="flex items-center gap-3 max-w-[98%] mx-auto bg-[#1a1a1a] p-3 rounded-[30px] border border-white/10 shadow-2xl animate-in slide-in-from-bottom-4">
                            {/* Delete Button */}
                            <button
                                onClick={deleteVoiceRecording}
                                className="p-3 rounded-full hover:bg-white/10 text-red-500 transition-colors"
                            >
                                <Trash2 className="w-5 h-5" />
                            </button>

                            {/* Timer & Visualization */}
                            <div className="flex-1 flex items-center justify-center gap-3">
                                <div className="text-[#D4AF37] font-black text-lg font-heading tracking-widest tabular-nums animate-pulse">
                                    {Math.floor(recordingDuration / 60)}:{String(recordingDuration % 60).padStart(2, '0')}
                                </div>
                                <div className="h-4 flex gap-1 items-center">
                                    {[...Array(10)].map((_, i) => (
                                        <div
                                            key={i}
                                            className="w-1 bg-[#D4AF37] rounded-full animate-[bounce_1s_infinite]"
                                            style={{
                                                height: `${Math.random() * 80 + 20}%`,
                                                animationDelay: `${i * 0.1}s`,
                                                opacity: recordingStatus === 'paused' ? 0.3 : 1
                                            }}
                                        />
                                    ))}
                                </div>
                            </div>

                            {/* Pause/Resume/Review Controls */}
                            {recordingStatus === 'review' ? (
                                <button
                                    onClick={() => {
                                        if (audioPreviewUrl) {
                                            const audio = new Audio(audioPreviewUrl);
                                            audio.play();
                                        }
                                    }}
                                    className="p-3 rounded-full bg-[#D4AF37]/10 text-[#D4AF37] hover:bg-[#D4AF37]/20 transition-all"
                                >
                                    <Play className="w-5 h-5" fill="currentColor" />
                                </button>
                            ) : (
                                <button
                                    onClick={recordingStatus === 'recording' ? pauseVoiceRecording : resumeVoiceRecording}
                                    className="p-3 rounded-full bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-all"
                                >
                                    {recordingStatus === 'recording' ? <Pause className="w-5 h-5" fill="currentColor" /> : <Mic className="w-5 h-5" />}
                                </button>
                            )}

                            {/* Send Button */}
                            {recordingStatus === 'review' ? (
                                <button
                                    onClick={sendVoiceMessage}
                                    className="p-3.5 bg-[#00A884] text-white rounded-full shadow-lg hover:scale-105 active:scale-90 transition-all"
                                >
                                    <Send className="w-5 h-5" strokeWidth={3} />
                                </button>
                            ) : (
                                <button
                                    onClick={stopVoiceRecording}
                                    className="p-3.5 bg-red-500 text-white rounded-full shadow-lg hover:scale-105 active:scale-90 transition-all animate-pulse"
                                >
                                    <StopCircle className="w-5 h-5" fill="currentColor" />
                                </button>
                            )}
                        </div>
                    ) : (
                        /* Standard Input Mode */
                        <div className="flex items-end gap-2 max-w-[98%] mx-auto relative z-[100]">
                            <div className="flex-1 bg-black/40 backdrop-blur-3xl rounded-[26px] shadow-lg border border-white/5 p-1.5 flex items-center min-h-[50px] transition-all">
                                <button
                                    type="button"
                                    onClick={toggleEmojiPicker}
                                    className={`p-2.5 rounded-full hover:bg-white/5 transition-all ${showEmojiPicker ? 'text-[#D4AF37]' : 'text-zinc-400'}`}
                                >
                                    <Smile className="w-6 h-6" />
                                </button>

                                <input
                                    type="text"
                                    value={newMessage}
                                    onChange={(e) => {
                                        setNewMessage(e.target.value);
                                        handleTyping();
                                    }}
                                    onClick={() => {
                                        setShowMediaMenu(false);
                                        setShowEmojiPicker(false);
                                    }}
                                    placeholder="Message"
                                    className="flex-1 bg-transparent border-none focus:ring-0 text-[16px] text-white placeholder:text-zinc-500 py-2.5 px-2"
                                />

                                <button
                                    type="button"
                                    onClick={toggleMediaMenu}
                                    className={`p-2.5 rounded-full hover:bg-white/5 transition-all ${showMediaMenu ? 'rotate-45 text-[#D4AF37]' : 'text-zinc-400'}`}
                                >
                                    <Plus className="w-6 h-6" strokeWidth={3} />
                                </button>

                                {newMessage.trim() && (
                                    <button onClick={() => fileInputRef.current?.click()} className="p-2.5 text-zinc-400 hover:text-white">
                                        <ImageIcon className="w-5 h-5" />
                                    </button>
                                )}
                            </div>

                            {/* Mic / Send Button */}
                            <div className="flex-shrink-0 mb-0.5">
                                {newMessage.trim() ? (
                                    <button
                                        onClick={handleSend}
                                        className="w-12 h-12 bg-[#00A884] text-white rounded-full flex items-center justify-center shadow-lg hover:scale-105 active:scale-90 transition-all"
                                    >
                                        <Send className="w-5 h-5 translate-x-0.5" strokeWidth={3} />
                                    </button>
                                ) : (
                                    <button
                                        onClick={startVoiceRecording}
                                        className="w-12 h-12 bg-[#00A884] text-white rounded-full flex items-center justify-center shadow-lg hover:scale-105 active:scale-90 transition-all"
                                    >
                                        <Mic className="w-6 h-6" strokeWidth={3} />
                                    </button>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Menus Overlay */}
                    <AnimatePresence>
                        {showMediaMenu && (
                            <motion.div
                                initial={{ opacity: 0, y: 50, scale: 0.9 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: 50, scale: 0.9 }}
                                className="absolute bottom-[80px] left-4 bg-[#232D36] rounded-[24px] shadow-2xl p-6 grid grid-cols-3 gap-6 border border-white/5 z-[110] w-[300px]"
                            >
                                <button onClick={() => triggerFileSelect(docInputRef)} className="flex flex-col items-center gap-2 group">
                                    <div className="w-14 h-14 bg-gradient-to-br from-purple-500 to-purple-700 rounded-full flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform"><FileText className="text-white w-6 h-6" /></div>
                                    <span className="text-zinc-300 text-xs font-medium">Document</span>
                                </button>
                                <button onClick={() => triggerFileSelect(fileInputRef)} className="flex flex-col items-center gap-2 group">
                                    <div className="w-14 h-14 bg-gradient-to-br from-pink-500 to-pink-700 rounded-full flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform"><ImageIcon className="text-white w-6 h-6" /></div>
                                    <span className="text-zinc-300 text-xs font-medium">Gallery</span>
                                </button>
                                <button onClick={handleLocationShare} className="flex flex-col items-center gap-2 group">
                                    <div className="w-14 h-14 bg-gradient-to-br from-green-500 to-green-700 rounded-full flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform"><MapPin className="text-white w-6 h-6" /></div>
                                    <span className="text-zinc-300 text-xs font-medium">Location</span>
                                </button>
                                <button onClick={() => triggerFileSelect(videoInputRef)} className="flex flex-col items-center gap-2 group">
                                    <div className="w-14 h-14 bg-gradient-to-br from-red-500 to-red-700 rounded-full flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform"><Video className="text-white w-6 h-6" /></div>
                                    <span className="text-zinc-300 text-xs font-medium">Video</span>
                                </button>
                            </motion.div>
                        )}

                        {showEmojiPicker && (
                            <motion.div
                                initial={{ opacity: 0, y: 50, scale: 0.9 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: 50, scale: 0.9 }}
                                className="absolute bottom-[80px] left-2 bg-[#232D36] rounded-[24px] shadow-2xl p-4 border border-white/5 z-[110] max-w-[340px]"
                            >
                                <div className="grid grid-cols-7 gap-3 max-h-[200px] overflow-y-auto scrollbar-hide">
                                    {['❤️', '👍', '😂', '😮', '😢', '🙏', '🔥', '✨', '🙌', '✅', '❌', '📍', '🎉', '👋', '💯', '🤔', '👀', '🤐', '🥳', '😎', '🤢', '🤮', '🤧', '🤒', '🤕', '🤑', '🤠', '😈', '👿', '👹', '👺', '💩', '👻', '💀', '☠️', '👽', '👾', '🤖'].map(emoji => (
                                        <button
                                            key={emoji}
                                            type="button"
                                            onClick={() => {
                                                setNewMessage(prev => prev + emoji);
                                            }}
                                            className="text-2xl hover:scale-125 transition-transform p-1"
                                        >
                                            {emoji}
                                        </button>
                                    ))}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Reply & Edit Overlays */}
                    <AnimatePresence>
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

                    {/* Hidden Inputs */}
                    <input type="file" ref={fileInputRef} className="hidden" onChange={(e) => handleMediaSelect(e)} accept="image/*" />
                    <input type="file" ref={videoInputRef} className="hidden" onChange={(e) => handleMediaSelect(e)} accept="video/*" />
                    <input type="file" ref={docInputRef} className="hidden" onChange={(e) => handleMediaSelect(e)} accept=".pdf,.doc,.docx" />
                </div>
            </div>
        </div>
    );
}
