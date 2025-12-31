import { Phone, X, Video } from 'lucide-react';
import { motion } from 'framer-motion';

interface OutboundCallModalProps {
    receiverName: string;
    receiverRole: string;
    callType: 'audio' | 'video';
    onCancel: () => void;
}

export default function OutboundCallModal({ receiverName, receiverRole, callType, onCancel }: OutboundCallModalProps) {
    const isVideo = callType === 'video';

    return (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-6 bg-slate-900/40 backdrop-blur-sm">
            <motion.div
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                className="glass-card w-full max-w-sm p-8 flex flex-col items-center text-center shadow-2xl border border-white/20 bg-white/80"
            >
                <div className="relative mb-6">
                    <div className="w-24 h-24 bg-primary-100 rounded-full flex items-center justify-center">
                        {isVideo ? <Video className="w-10 h-10 text-primary-600" /> : <Phone className="w-10 h-10 text-primary-600" />}
                    </div>
                    {[...Array(3)].map((_, i) => (
                        <motion.div
                            key={i}
                            initial={{ scale: 1, opacity: 0 }}
                            animate={{ scale: 2.5, opacity: [0, 0.2, 0] }}
                            transition={{ duration: 2, repeat: Infinity, delay: i * 0.6 }}
                            className="absolute inset-0 bg-primary-400 rounded-full -z-10"
                        />
                    ))}
                </div>

                <h3 className="text-2xl font-black text-slate-900 mb-1">{receiverName}</h3>
                <p className="text-slate-500 font-medium mb-1 uppercase tracking-wider text-xs">{receiverRole}</p>
                <p className="text-primary-600 font-bold text-sm mb-12 animate-pulse">
                    Ringing ({isVideo ? 'Video' : 'Voice'})...
                </p>

                <button
                    onClick={onCancel}
                    className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center text-white shadow-lg shadow-red-200 active:scale-95 transition-all"
                >
                    <X className="w-8 h-8" />
                </button>
                <p className="text-slate-400 text-xs font-medium mt-4 uppercase tracking-widest">Cancel Call</p>
            </motion.div>
        </div>
    );
}
