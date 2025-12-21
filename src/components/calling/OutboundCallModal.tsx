import { PhoneOff, User } from 'lucide-react';
import { motion } from 'framer-motion';

interface OutboundCallModalProps {
    receiverName: string;
    receiverRole: string;
    onCancel: () => void;
}

export default function OutboundCallModal({ receiverName, receiverRole, onCancel }: OutboundCallModalProps) {
    return (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <motion.div
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                className="w-full max-w-sm glass-card border-white/50 p-8 flex flex-col items-center text-center shadow-2xl rounded-[2.5rem]"
            >
                {/* Receiver Avatar & Ringing Animation */}
                <div className="relative mb-8">
                    <motion.div
                        animate={{ scale: [1, 1.5, 1], opacity: [0.3, 0, 0.3] }}
                        transition={{ duration: 2, repeat: Infinity }}
                        className="absolute inset-[-20px] bg-primary-200 rounded-full"
                    />
                    <div className="relative w-24 h-24 bg-gradient-to-br from-slate-600 to-slate-800 rounded-full flex items-center justify-center shadow-lg">
                        <User className="w-12 h-12 text-white" />
                    </div>
                </div>

                <div className="mb-10">
                    <p className="text-primary-500 text-xs font-bold uppercase tracking-[0.2em] mb-2">Calling...</p>
                    <h2 className="text-2xl font-black text-slate-800 mb-1">{receiverName}</h2>
                    <p className="text-slate-500 font-medium capitalize">{receiverRole}</p>
                </div>

                {/* Cancel Button */}
                <button
                    onClick={onCancel}
                    className="w-16 h-16 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center shadow-lg shadow-red-200 transition-all active:scale-90"
                >
                    <PhoneOff className="w-8 h-8 rotate-[135deg]" />
                </button>
            </motion.div>
        </div>
    );
}
