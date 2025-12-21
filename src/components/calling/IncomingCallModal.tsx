import { Phone, PhoneOff, User } from 'lucide-react';
import { motion } from 'framer-motion';

interface IncomingCallModalProps {
    callerName: string;
    callerRole: string;
    onAccept: () => void;
    onReject: () => void;
}

export default function IncomingCallModal({ callerName, callerRole, onAccept, onReject }: IncomingCallModalProps) {
    return (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <motion.div
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                className="w-full max-w-sm glass-card border-white/50 p-8 flex flex-col items-center text-center shadow-2xl rounded-[2.5rem]"
            >
                {/* Caller Avatar & Pulse */}
                <div className="relative mb-8">
                    <div className="absolute inset-0 bg-primary-200 rounded-full animate-ping opacity-25" />
                    <div className="absolute inset-[-10px] bg-primary-100 rounded-full animate-pulse opacity-40" />
                    <div className="relative w-24 h-24 bg-gradient-to-br from-primary-400 to-primary-600 rounded-full flex items-center justify-center shadow-lg">
                        <User className="w-12 h-12 text-white" />
                    </div>
                </div>

                <div className="mb-10">
                    <p className="text-primary-500 text-xs font-bold uppercase tracking-[0.2em] mb-2">Incoming Audio Call</p>
                    <h2 className="text-2xl font-black text-slate-800 mb-1">{callerName}</h2>
                    <p className="text-slate-500 font-medium capitalize">{callerRole}</p>
                </div>

                {/* Actions */}
                <div className="flex gap-8 w-full justify-center">
                    <button
                        onClick={onReject}
                        className="w-16 h-16 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center shadow-lg shadow-red-200 transition-all active:scale-90"
                    >
                        <PhoneOff className="w-8 h-8 rotate-[135deg]" />
                    </button>
                    <button
                        onClick={onAccept}
                        className="w-16 h-16 bg-green-500 hover:bg-green-600 text-white rounded-full flex items-center justify-center shadow-lg shadow-green-200 transition-all animate-bounce active:scale-90"
                    >
                        <Phone className="w-8 h-8" />
                    </button>
                </div>
            </motion.div>
        </div>
    );
}
