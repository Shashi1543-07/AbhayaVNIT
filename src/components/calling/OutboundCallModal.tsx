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
        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-6 bg-black/60 backdrop-blur-3xl">
            <motion.div
                initial={{ scale: 0.8, opacity: 0, y: 40 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                className="w-full max-w-sm p-8 pt-12 flex flex-col items-center text-center shadow-[0_30px_80px_rgba(0,0,0,0.8)] border border-white/10 bg-zinc-900/80 rounded-[48px] relative overflow-hidden"
            >
                {/* Background Glow */}
                <div className="absolute -top-24 -right-24 w-48 h-48 rounded-full blur-[80px] opacity-20 bg-[#D4AF37]" />

                <div className="relative mb-10">
                    <div className="w-28 h-28 bg-white/5 rounded-[40px] flex items-center justify-center border border-white/10 shadow-2xl relative z-10">
                        {isVideo ? <Video className="w-12 h-12 text-[#D4AF37]" /> : <Phone className="w-12 h-12 text-[#D4AF37]" />}
                    </div>

                    {/* Ringing Animation Rings */}
                    {[...Array(3)].map((_, i) => (
                        <motion.div
                            key={i}
                            initial={{ scale: 1, opacity: 0 }}
                            animate={{ scale: 2.2, opacity: [0, 0.2, 0] }}
                            transition={{ duration: 3, repeat: Infinity, delay: i * 1, ease: "easeOut" }}
                            className="absolute inset-0 bg-[#D4AF37] rounded-[40px] -z-10"
                        />
                    ))}
                </div>

                <h3 className="text-3xl font-black text-white mb-2 uppercase tracking-tighter">{receiverName}</h3>
                <p className="text-[#D4AF37]/60 font-black uppercase tracking-[0.3em] text-[10px] mb-2">{receiverRole}</p>
                <div className="px-4 py-1.5 bg-white/5 rounded-full border border-white/5 inline-block mb-12">
                    <p className="text-[#D4AF37] font-black uppercase tracking-[0.3em] text-[10px] animate-pulse">
                        Ringing {isVideo ? 'Video' : 'Voice'}...
                    </p>
                </div>

                <button
                    onClick={onCancel}
                    className="w-20 h-20 bg-white/5 rounded-[28px] flex items-center justify-center text-red-500 shadow-2xl active:scale-90 transition-all border border-white/10 hover:bg-red-500/10 hover:border-red-500/20 group"
                    title="Cancel Call"
                >
                    <X className="w-8 h-8 group-hover:rotate-90 transition-transform" />
                </button>
                <p className="text-white/20 text-[9px] font-black uppercase tracking-[0.3em] mt-6">Cancel Call</p>

                {/* Aesthetic Detail */}
                <div className="mt-8 flex gap-1">
                    {[...Array(3)].map((_, i) => (
                        <div key={i} className="w-1.5 h-1.5 rounded-full bg-white/10" />
                    ))}
                </div>
            </motion.div>
        </div>
    );
}
