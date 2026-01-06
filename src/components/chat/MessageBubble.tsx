import { format } from 'date-fns';

interface MessageBubbleProps {
    message: any;
    isMe: boolean;
}

export default function MessageBubble({ message, isMe }: MessageBubbleProps) {
    if (message.isSystemMessage) {
        return (
            <div className="flex justify-center my-4 px-6">
                <div className="bg-[#FFF9C4]/80 backdrop-blur-sm text-slate-600 text-[11px] px-3 py-1 rounded-lg border border-[#FFF59D] text-center shadow-sm">
                    {message.text}
                </div>
            </div>
        );
    }

    return (
        <div className={`flex w-full mb-4 ${isMe ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                {/* Sender Name (if not me) */}
                {!isMe && (message.senderRole !== 'student' || message.senderName) && (
                    <span className="text-[10px] uppercase font-bold text-slate-500 ml-3 mb-1 block tracking-wider">
                        {message.senderName || 'Staff'} <span className="bg-white/50 px-1.5 py-0.5 rounded text-primary border border-primary/10 ml-1 font-bold">{message.senderRole}</span>
                    </span>
                )}

                {/* Glassy Bubble Restoration - More aggressive rounding for "App" feel */}
                <div className={`px-6 py-3.5 rounded-[28px] text-sm relative shadow-md backdrop-blur-md border border-white/50
                    ${isMe
                        ? 'bg-gradient-to-br from-primary to-[#A78BFA] text-white rounded-br-lg'
                        : 'bg-gradient-to-br from-[#FCE7F3]/90 via-[#FBCFE8]/80 to-[#F9A8D4]/70 text-slate-800 rounded-bl-lg'
                    }
                `}>
                    <div className="pr-10 min-w-[50px]">
                        <p className="leading-relaxed font-medium">{message.text}</p>
                    </div>

                    {/* Time Inside Bubble - Refined for Glassy UI */}
                    <div className="absolute bottom-1 right-2 flex items-center gap-1 opacity-60">
                        <span className={`text-[9px] font-bold ${isMe ? 'text-white' : 'text-slate-500'}`}>
                            {message.timestamp?.seconds
                                ? format(new Date(message.timestamp.seconds * 1000), 'h:mm a')
                                : '...'}
                        </span>
                        {isMe && (
                            <span className="text-white">
                                <svg width="10" height="10" viewBox="0 0 16 16" fill="currentColor">
                                    <path d="M15.421 2.106L5.592 11.935 1.579 7.922l-.789.789L5.592 13.513l10.618-10.618zM11.934 2.106L5.592 8.448 4.013 6.869l-.789.789L5.592 10.027l7.132-7.132z" />
                                </svg>
                            </span>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
