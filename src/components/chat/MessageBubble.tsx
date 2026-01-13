import { useState, useRef, useEffect } from 'react';
import { format } from 'date-fns';
import { Check, CheckCheck, MoreVertical, Trash2, Play, Pause, FileText, MapPin, Reply as ReplyIcon, Pencil } from 'lucide-react';
import { motion } from 'framer-motion';
import { chatService, type ChatMessage } from '../../services/chatService';
import { useAuthStore } from '../../context/authStore';

interface MessageBubbleProps {
    message: ChatMessage;
    isMe: boolean;
    conversationId: string;
    onReply?: () => void;
    onEdit?: (message: ChatMessage) => void;
}

export default function MessageBubble({ message, isMe, conversationId, onReply, onEdit }: MessageBubbleProps) {
    const { user } = useAuthStore();
    const [showMenu, setShowMenu] = useState(false);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isLongPressing, setIsLongPressing] = useState(false);
    const audioRef = useRef<HTMLAudioElement>(null);
    const longPressTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

    // Close menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (showMenu && !(event.target as Element).closest('.message-menu-container')) {
                setShowMenu(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [showMenu]);

    // Filter out messages deleted by current user
    if (message.deletedFor?.includes(user?.uid || '')) {
        return null;
    }

    // Show deletion placeholder for globally deleted messages
    if (message.deletedGlobal) {
        return (
            <div className="flex justify-center my-6 px-10">
                <div className="bg-black/40 backdrop-blur-xl text-zinc-500 italic text-[11px] px-5 py-2.5 rounded-2xl border border-white/5 text-center shadow-xl font-heading font-black opacity-60 uppercase tracking-widest">
                    🚫 Message Revoked
                </div>
            </div>
        );
    }

    // System message rendering
    if (message.isSystemMessage) {
        return (
            <div className="flex justify-center my-6 px-10">
                <div className="bg-[#D4AF37]/10 backdrop-blur-xl text-[#D4AF37] text-[10px] px-5 py-2 rounded-2xl border border-[#D4AF37]/20 text-center shadow-xl font-heading font-black uppercase tracking-widest leading-relaxed">
                    🔐 {message.text}
                </div>
            </div>
        );
    }

    const handleDelete = async (type: 'me' | 'everyone') => {
        if (!user) return;
        try {
            await chatService.deleteMessage(conversationId, message.id, user.uid, type);
            setShowMenu(false);
        } catch (error) {
            console.error('Failed to delete message:', error);
        }
    };

    const toggleAudio = () => {
        if (audioRef.current) {
            if (isPlaying) {
                audioRef.current.pause();
            } else {
                audioRef.current.play();
            }
            setIsPlaying(!isPlaying);
        }
    };

    const handleReaction = async (emoji: string) => {
        if (!user) return;
        await chatService.addReaction(conversationId, message.id, user.uid, emoji);
        setShowMenu(false);
    };

    const commonEmojis = ['❤️', '👍', '😂', '😮', '😢', '🙏'];

    // Status check icons - WhatsApp style
    const renderStatusIcon = () => {
        if (!isMe) return null;

        switch (message.status) {
            case 'sent':
                return <Check className="w-4 h-4 text-black/40" strokeWidth={3} />;
            case 'delivered':
                return <CheckCheck className="w-4 h-4 text-black/50" strokeWidth={3} />;
            case 'seen':
                return <CheckCheck className="w-4 h-4 text-[#D4AF37] drop-shadow-[0_0_3px_rgba(212,175,55,0.5)]" strokeWidth={3} />;
            default:
                return <Check className="w-4 h-4 text-black/30" strokeWidth={3} />;
        }
    };

    // Long press handlers for mobile
    const handleTouchStart = () => {
        setIsLongPressing(true);
        longPressTimer.current = setTimeout(() => {
            // Haptic feedback if available
            if (navigator.vibrate) {
                navigator.vibrate(50);
            }
            setShowMenu(true);
            setIsLongPressing(false);
        }, 500); // 500ms long press
    };

    const handleTouchEnd = () => {
        setIsLongPressing(false);
        if (longPressTimer.current) {
            clearTimeout(longPressTimer.current);
        }
    };


    const handleReplyClick = () => {
        if (!message.replyTo) return;
        const originalMsg = document.getElementById(`msg-${message.replyTo.id}`);
        if (originalMsg) {
            originalMsg.scrollIntoView({ behavior: 'smooth', block: 'center' });
            originalMsg.classList.add('ring-4', 'ring-primary/40', 'ring-offset-2');
            setTimeout(() => {
                originalMsg.classList.remove('ring-4', 'ring-primary/40', 'ring-offset-2');
            }, 2000);
        }
    };

    return (
        <motion.div
            id={`msg-${message.id}`}
            initial={{ opacity: 0, scale: 0.9, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ type: 'spring', damping: 20, stiffness: 300 }}
            className={`flex w-full mb-4 ${isMe ? 'justify-end' : 'justify-start'} group relative transition-all duration-300 rounded-[32px]`}
        >
            <div className={`max-w-[80%] flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                {/* Sender Name (if not me) */}
                {!isMe && (message.senderRole !== 'student' || message.senderName) && (
                    <span className="text-[10px] uppercase font-bold text-zinc-500 ml-3 mb-1 block tracking-wider">
                        {message.senderName || 'Staff'} <span className="bg-[#D4AF37]/10 px-1.5 py-0.5 rounded text-[#D4AF37] border border-[#D4AF37]/20 ml-1 font-bold">{message.senderRole}</span>
                    </span>
                )}

                {/* Message Bubble with Long Press */}
                <div
                    className={`relative px-4 py-2.5 rounded-[24px] shadow-2xl backdrop-blur-3xl border transition-all duration-150 font-heading
                        ${isMe
                            ? 'bg-gradient-to-br from-[#CF9E1B] via-[#D4AF37] to-[#8B6E13] text-black border-white/20 shadow-xl rounded-br-none'
                            : 'bg-[#1a1a1a]/80 backdrop-blur-xl text-white border-white/5 shadow-sm rounded-bl-none'
                        }
                        ${isMe && isLongPressing ? 'scale-95 opacity-80 shadow-none' : ''}
                    `}
                    onTouchStart={handleTouchStart}
                    onTouchEnd={handleTouchEnd}
                    onTouchMove={handleTouchEnd}
                    onTouchCancel={handleTouchEnd}
                >
                    {/* Reply Context */}
                    {message.replyTo && (
                        <div
                            onClick={handleReplyClick}
                            className={`mb-2 p-2 rounded-xl bg-black/5 border-l-4 ${isMe ? 'border-white/50' : 'border-[#D4AF37]/50'} text-[11px] overflow-hidden cursor-pointer hover:bg-black/10 transition-colors`}
                        >
                            <p className="font-black opacity-60 mb-0.5 text-[#D4AF37]">{message.replyTo.senderName}</p>
                            <p className="italic truncate">{message.replyTo.text}</p>
                        </div>
                    )}

                    {/* Media Content */}
                    {message.type === 'image' && message.mediaUrl && (
                        <div className="mb-2 rounded-2xl overflow-hidden shadow-sm border border-white/20">
                            <img src={message.mediaUrl} alt="Shared" className="w-full max-h-[300px] object-cover" />
                        </div>
                    )}

                    {message.type === 'location' && message.location && (
                        <div className="mb-2 rounded-2xl overflow-hidden shadow-sm border border-white/20 bg-white/5 p-3 flex flex-col gap-2">
                            <div className="flex items-center gap-2">
                                <MapPin className="text-[#D4AF37] w-5 h-5" />
                                <span className="font-bold text-[12px] text-white">Location Shared</span>
                            </div>
                            <a
                                href={`https://www.google.com/maps?q=${message.location.latitude},${message.location.longitude}`}
                                target="_blank"
                                rel="noreferrer"
                                className="text-[10px] bg-gradient-to-br from-[#CF9E1B] to-[#8B6E13] text-black py-1.5 px-3 rounded-xl text-center font-black uppercase tracking-widest hover:opacity-90 transition-opacity"
                            >
                                View on Maps
                            </a>
                        </div>
                    )}

                    {message.type === 'document' && (
                        <div className="mb-2 rounded-2xl overflow-hidden shadow-sm border border-white/20 bg-white/5 p-3 flex items-center gap-3">
                            <div className="p-2 bg-[#D4AF37]/20 rounded-xl">
                                <FileText className="text-[#D4AF37] w-6 h-6" />
                            </div>
                            <div className="flex-1 min-w-0 text-white">
                                <p className="font-bold text-[12px] truncate">{message.mediaName || 'Document'}</p>
                                <p className="text-[9px] opacity-60 uppercase font-black text-[#D4AF37]">PDF / Doc</p>
                            </div>
                        </div>
                    )}

                    {message.type === 'audio' || message.audioUrl ? (
                        <div className="flex items-center gap-3 pr-14 min-w-[180px]">
                            <button
                                onClick={toggleAudio}
                                className="p-2 rounded-full bg-white/20 hover:bg-white/30 transition-all flex-shrink-0"
                            >
                                {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                            </button>
                            <div className="flex-1">
                                <div className="h-1 bg-white/20 rounded-full overflow-hidden">
                                    <div className="h-full bg-white/60 rounded-full w-0" />
                                </div>
                                <span className="text-[10px] opacity-70 mt-1 block font-black">
                                    {message.duration
                                        ? `${Math.floor(message.duration / 60)}:${String(Math.floor(message.duration % 60)).padStart(2, '0')}`
                                        : 'Voice Message'}
                                </span>
                            </div>
                            <audio ref={audioRef} src={message.mediaUrl} onEnded={() => setIsPlaying(false)} />
                        </div>
                    ) : (
                        message.text && (
                            <div className="pr-14 min-w-[70px] pb-1">
                                <p className={`leading-relaxed font-bold tracking-tight ${/^(\u00a9|\u00ae|[\u2000-\u3300]|\ud83c[\ud000-\udfff]|\ud83d[\ud000-\udfff]|\ud83e[\ud000-\udfff])+$/.test(message.text.trim()) && message.text.length <= 10
                                    ? 'text-[44px] leading-tight'
                                    : 'text-[15px]'
                                    }`}>
                                    {message.text}
                                </p>
                                {message.isEdited && (
                                    <span className="text-[10px] opacity-50 font-black flex items-center gap-1 mt-1 uppercase tracking-widest leading-none">
                                        <Pencil className="w-2.5 h-2.5" /> edited
                                    </span>
                                )}
                            </div>
                        )
                    )}

                    {/* Reactions */}
                    {message.reactions && Object.keys(message.reactions).length > 0 && (
                        <div className={`absolute -bottom-2 ${isMe ? 'right-4' : 'left-4'} flex -space-x-1`}>
                            {Object.entries(message.reactions).map(([uid, emoji]) => (
                                <span key={uid} className="bg-white/90 backdrop-blur-sm rounded-full px-1 shadow-sm border border-slate-100 text-[12px] animate-in zoom-in-50 duration-200">
                                    {emoji}
                                </span>
                            ))}
                        </div>
                    )}

                    {/* Time & Status */}
                    <div className={`absolute bottom-1 right-2 flex items-center gap-1 ${isMe ? 'text-black/60' : 'text-zinc-500'} bg-black/5 px-1.5 py-0.5 rounded-full`}>
                        <span className="text-[9px] font-black tracking-tighter">
                            {message.timestamp?.seconds
                                ? format(new Date(message.timestamp.seconds * 1000), 'h:mm a')
                                : '...'}
                        </span>
                        {renderStatusIcon()}
                    </div>

                    {/* Delete & Reaction Menu Toggle */}
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            setShowMenu(!showMenu);
                        }}
                        className={`absolute ${isMe ? '-left-8' : '-right-8'} top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-all duration-200 p-2 rounded-full bg-slate-700/80 hover:bg-slate-800/90 shadow-lg backdrop-blur-sm`}
                        title="Message options"
                    >
                        <MoreVertical className="w-4 h-4 text-white" />
                    </button>
                </div>

                {/* Delete & Reaction Menu */}
                {showMenu && (
                    <div className={`message-menu-container absolute ${isMe ? 'right-0' : 'left-0'} top-full mt-2 bg-black/80 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/10 overflow-hidden z-50 min-w-[200px] animate-in fade-in slide-in-from-top-2 duration-200`}>
                        {/* Reaction Picker */}
                        <div className="flex justify-between px-4 py-3 bg-white/5 border-b border-white/5">
                            {commonEmojis.map(emoji => (
                                <button
                                    key={emoji}
                                    onClick={() => handleReaction(emoji)}
                                    className="text-lg hover:scale-125 transition-transform"
                                >
                                    {emoji}
                                </button>
                            ))}
                        </div>

                        <div className="py-1">
                            <button
                                onClick={() => {
                                    onReply?.();
                                    setShowMenu(false);
                                }}
                                className="w-full px-4 py-3 text-left text-sm font-bold text-white hover:bg-white/5 transition-colors flex items-center gap-3"
                            >
                                <ReplyIcon className="w-4 h-4 text-[#D4AF37]" />
                                <span>Reply</span>
                            </button>

                            {isMe && message.type !== 'image' && message.type !== 'video' && message.type !== 'audio' && message.type !== 'location' && (
                                <button
                                    onClick={() => {
                                        // 15 minutes edit limit
                                        const now = new Date().getTime();
                                        const sentAt = message.timestamp?.seconds ? message.timestamp.seconds * 1000 : now;
                                        if (now - sentAt < 15 * 60 * 1000) {
                                            onEdit?.(message);
                                        } else {
                                            alert("Message editing window has expired (15 min limit)");
                                        }
                                        setShowMenu(false);
                                    }}
                                    className="w-full px-4 py-3 text-left text-sm font-bold text-white hover:bg-white/5 transition-colors flex items-center gap-3"
                                >
                                    <Pencil className="w-4 h-4 text-[#D4AF37]" />
                                    <span>Edit</span>
                                </button>
                            )}

                            <button
                                onClick={() => handleDelete('me')}
                                className="w-full px-4 py-3 text-left text-sm font-bold text-white hover:bg-white/5 transition-colors flex items-center gap-3"
                            >
                                <Trash2 className="w-4 h-4 text-[#D4AF37]" />
                                <span>Delete for me</span>
                            </button>

                            {isMe && (
                                <button
                                    onClick={() => handleDelete('everyone')}
                                    className="w-full px-4 py-3 text-left text-sm font-bold text-red-500 hover:bg-red-500/10 transition-colors flex items-center gap-3 border-t border-white/5"
                                >
                                    <Trash2 className="w-4 h-4" />
                                    <span>Delete for everyone</span>
                                </button>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </motion.div>
    );
}
