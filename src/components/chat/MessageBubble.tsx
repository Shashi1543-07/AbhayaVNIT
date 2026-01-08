import { format } from 'date-fns';
import { Check, CheckCheck, MoreVertical, Trash2, Play, Pause } from 'lucide-react';
import { useState, useRef } from 'react';
import { chatService, type ChatMessage } from '../../services/chatService';
import { useAuthStore } from '../../context/authStore';

interface MessageBubbleProps {
    message: ChatMessage;
    isMe: boolean;
    conversationId: string;
}

export default function MessageBubble({ message, isMe, conversationId }: MessageBubbleProps) {
    const { user } = useAuthStore();
    const [showMenu, setShowMenu] = useState(false);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isLongPressing, setIsLongPressing] = useState(false);
    const audioRef = useRef<HTMLAudioElement>(null);
    const longPressTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

    // Filter out messages deleted by current user
    if (message.deletedFor?.includes(user?.uid || '')) {
        return null;
    }

    // Show deletion placeholder for globally deleted messages
    if (message.deletedGlobal) {
        return (
            <div className="flex justify-center my-4 px-6">
                <div className="bg-slate-200/50 backdrop-blur-sm text-slate-500 italic text-[11px] px-3 py-1.5 rounded-lg border border-slate-300/30 text-center shadow-sm">
                    🚫 This message was deleted
                </div>
            </div>
        );
    }

    // System message rendering
    if (message.isSystemMessage) {
        return (
            <div className="flex justify-center my-4 px-6">
                <div className="bg-[#FFF9C4]/80 backdrop-blur-sm text-slate-600 text-[11px] px-3 py-1 rounded-lg border border-[#FFF59D] text-center shadow-sm">
                    {message.text}
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

    // Status check icons - WhatsApp style
    const renderStatusIcon = () => {
        if (!isMe) return null;

        switch (message.status) {
            case 'sent':
                return <Check className="w-4 h-4 text-white/70" strokeWidth={2.5} />;
            case 'delivered':
                return <CheckCheck className="w-4 h-4 text-white/70" strokeWidth={2.5} />;
            case 'seen':
                return <CheckCheck className="w-4 h-4 text-blue-400 drop-shadow-lg" strokeWidth={2.5} />;
            default:
                return <Check className="w-4 h-4 text-white/50" strokeWidth={2.5} />;
        }
    };

    // Long press handlers for mobile
    const handleTouchStart = () => {
        if (!isMe) return;
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

    return (
        <div className={`flex w-full mb-4 ${isMe ? 'justify-end' : 'justify-start'} group relative`}>
            <div className={`max-w-[80%] flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                {/* Sender Name (if not me) */}
                {!isMe && (message.senderRole !== 'student' || message.senderName) && (
                    <span className="text-[10px] uppercase font-bold text-slate-500 ml-3 mb-1 block tracking-wider">
                        {message.senderName || 'Staff'} <span className="bg-white/50 px-1.5 py-0.5 rounded text-primary border border-primary/10 ml-1 font-bold">{message.senderRole}</span>
                    </span>
                )}

                {/* Message Bubble with Long Press */}
                <div
                    className={`relative px-6 py-3.5 rounded-[28px] text-sm shadow-md backdrop-blur-md border border-white/50 transition-all duration-150
                        ${isMe
                            ? 'bg-gradient-to-br from-primary to-[#A78BFA] text-white rounded-br-lg'
                            : 'bg-gradient-to-br from-[#FCE7F3]/90 via-[#FBCFE8]/80 to-[#F9A8D4]/70 text-slate-800 rounded-bl-lg'
                        }
                        ${isMe && isLongPressing ? 'scale-95 opacity-80' : ''}
                    `}
                    onTouchStart={handleTouchStart}
                    onTouchEnd={handleTouchEnd}
                    onTouchMove={handleTouchEnd}
                    onTouchCancel={handleTouchEnd}
                >
                    {/* Voice Message */}
                    {message.audioUrl ? (
                        <div className="flex items-center gap-3 pr-12">
                            <button
                                onClick={toggleAudio}
                                className="p-2 rounded-full bg-white/20 hover:bg-white/30 transition-all"
                            >
                                {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                            </button>
                            <div className="flex-1">
                                <div className="h-1 bg-white/20 rounded-full overflow-hidden">
                                    <div className="h-full bg-white/60 rounded-full w-0" />
                                </div>
                                <span className="text-[10px] opacity-70 mt-1 block">
                                    {message.duration ? `${Math.floor(message.duration)}s` : '...'}
                                </span>
                            </div>
                            <audio ref={audioRef} src={message.audioUrl} onEnded={() => setIsPlaying(false)} />
                        </div>
                    ) : (
                        <div className="pr-10 min-w-[50px]">
                            <p className="leading-relaxed font-medium">{message.text}</p>
                        </div>
                    )}

                    {/* Time & Status */}
                    <div className="absolute bottom-1 right-2 flex items-center gap-1 opacity-70">
                        <span className={`text-[9px] font-bold ${isMe ? 'text-white' : 'text-slate-500'}`}>
                            {message.timestamp?.seconds
                                ? format(new Date(message.timestamp.seconds * 1000), 'h:mm a')
                                : '...'}
                        </span>
                        {renderStatusIcon()}
                    </div>

                    {/* Delete Menu Button (only for sender) */}
                    {isMe && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                setShowMenu(!showMenu);
                            }}
                            className="absolute -right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-all duration-200 p-2 rounded-full bg-slate-700/80 hover:bg-slate-800/90 shadow-lg backdrop-blur-sm"
                            title="Message options"
                        >
                            <MoreVertical className="w-4 h-4 text-white" />
                        </button>
                    )}
                </div>

                {/* Delete Menu */}
                {showMenu && isMe && (
                    <div className="absolute right-0 top-full mt-2 bg-white rounded-2xl shadow-2xl border-2 border-slate-200/50 overflow-hidden z-50 min-w-[200px] animate-in fade-in slide-in-from-top-2 duration-200">
                        <div className="bg-slate-50 px-4 py-2 border-b border-slate-200/50">
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Message Options</p>
                        </div>
                        <button
                            onClick={() => handleDelete('me')}
                            className="w-full px-4 py-3.5 text-left text-sm font-bold text-slate-700 hover:bg-slate-50 active:bg-slate-100 transition-colors flex items-center gap-3 group/item"
                        >
                            <Trash2 className="w-4 h-4 text-slate-500 group-hover/item:text-slate-700" />
                            <span>Delete for me</span>
                        </button>
                        {message.status === 'sent' && (
                            <button
                                onClick={() => handleDelete('everyone')}
                                className="w-full px-4 py-3.5 text-left text-sm font-bold text-red-600 hover:bg-red-50 active:bg-red-100 transition-colors flex items-center gap-3 border-t border-slate-200/50 group/item"
                            >
                                <Trash2 className="w-4 h-4 group-hover/item:scale-110 transition-transform" />
                                <div className="flex-1">
                                    <div>Delete for everyone</div>
                                    <div className="text-[10px] text-red-500 font-medium mt-0.5">Only unseen messages</div>
                                </div>
                            </button>
                        )}
                    </div>
                )}
            </div>

            {/* Close menu on outside click */}
            {showMenu && (
                <div
                    className="fixed inset-0 z-40"
                    onClick={() => setShowMenu(false)}
                />
            )}
        </div>
    );
}
