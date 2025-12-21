import React from 'react';
import { format } from 'date-fns';

interface MessageBubbleProps {
    message: any;
    isMe: boolean;
}

export default function MessageBubble({ message, isMe }: MessageBubbleProps) {
    if (message.isSystemMessage) {
        return (
            <div className="flex justify-center my-4">
                <div className="bg-slate-100 text-slate-500 text-xs px-3 py-1 rounded-full border border-slate-200">
                    {message.text}
                </div>
            </div>
        );
    }

    return (
        <div className={`flex w-full mb-4 ${isMe ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                {/* Sender Name (if not me) */}
                {!isMe && (
                    <span className="text-[10px] uppercase font-bold text-slate-500 ml-3 mb-1 block tracking-wider">
                        {message.senderName || 'Staff'} <span className="bg-white/50 px-1.5 py-0.5 rounded text-primary border border-primary/10 ml-1">{message.senderRole}</span>
                    </span>
                )}

                {/* Bubble */}
                <div className={`px-5 py-3 rounded-2xl text-sm relative shadow-md backdrop-blur-md border border-white/50
                    ${isMe
                        ? 'bg-gradient-to-br from-primary to-[#A78BFA] text-white rounded-br-sm'
                        : 'bg-gradient-to-br from-[#FCE7F3]/90 via-[#FBCFE8]/80 to-[#F9A8D4]/70 text-slate-800 rounded-bl-sm'
                    }
                `}>
                    <p className="leading-relaxed font-medium">{message.text}</p>
                </div>

                {/* Time */}
                <span className={`text-[10px] font-medium mt-1 mx-1 ${isMe ? 'text-white/60 text-right' : 'text-slate-400'}`}>
                    {message.timestamp?.seconds
                        ? format(new Date(message.timestamp.seconds * 1000), 'h:mm a')
                        : 'Sending...'}
                </span>
            </div>
        </div>
    );
}
