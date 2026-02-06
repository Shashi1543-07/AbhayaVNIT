import { Phone, PhoneOff, Video } from 'lucide-react';
import { motion } from 'framer-motion';

interface IncomingCallModalProps {
    callerName: string;
    callerRole: string;
    callType: 'audio' | 'video';
    contextType?: 'sos' | 'safe_walk';
    onAccept: () => void;
    onReject: () => void;
}

export default function IncomingCallModal({
    callerName,
    callerRole,
    callType,
    contextType,
    onAccept,
    onReject
}: IncomingCallModalProps) {
    const isVideo = callType === 'video';
    const isEmergency = !!contextType;

    return (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-6 bg-black/60 backdrop-blur-3xl">
            <motion.div
                initial={{ scale: 0.8, opacity: 0, y: 40 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                className="w-full max-w-sm p-8 pt-12 flex flex-col items-center text-center shadow-[0_30px_80px_rgba(0,0,0,0.8)] border border-white/10 bg-zinc-900/80 rounded-[48px] relative overflow-hidden"
            >
                {/* Emergency Background Glow */}
                <div className={`absolute -top-24 -left-24 w-48 h-48 rounded-full blur-[80px] opacity-30 ${isEmergency ? 'bg-red-600' : 'bg-[#D4AF37]'}`} />

                {isEmergency && (
                    <div className={`absolute top-0 left-0 right-0 py-2.5 text-[10px] font-black uppercase tracking-[0.3em] text-white text-center ${contextType === 'sos' ? 'bg-red-600 shadow-lg' : 'bg-[#D4AF37] shadow-lg'
                        }`}>
                        Emergency {contextType === 'sos' ? 'SOS' : 'Safe Walk'} Call
                    </div>
                )}

                <div className="relative mb-8">
                    <div className="w-28 h-28 bg-white/5 rounded-[40px] flex items-center justify-center border border-white/10 shadow-2xl relative z-10">
                        {isVideo ? <Video className="w-12 h-12 text-[#D4AF37]" /> : <Phone className="w-12 h-12 text-[#D4AF37]" />}
                    </div>
                    {/* Ringing Animation Rings */}
                    <div className="absolute inset-0 w-28 h-28 bg-[#D4AF37]/20 rounded-[40px] animate-ping opacity-40" />
                    <div className="absolute -bottom-1 -right-1 w-10 h-10 bg-[#050505] rounded-2xl flex items-center justify-center shadow-2xl border border-white/10 z-20">
                        <div className="w-6 h-6 bg-emerald-500 rounded-lg animate-pulse shadow-[0_0_15px_rgba(16,185,129,0.5)]" />
                    </div>
                </div>

                <h3 className="text-3xl font-black text-white mb-2 uppercase tracking-tighter">{callerName}</h3>
                <p className="text-[#D4AF37]/60 font-black uppercase tracking-[0.3em] text-[10px] mb-2">{callerRole}</p>
                <div className="px-4 py-1.5 bg-white/5 rounded-full border border-white/5 inline-block mb-10">
                    <p className="text-white/40 font-black uppercase tracking-[0.2em] text-[9px]">
                        Incoming {isVideo ? 'Video' : 'Voice'} Call
                    </p>
                </div>

                <div className="flex gap-6 w-full">
                    <button
                        onClick={onReject}
                        className="flex-1 h-20 bg-white/5 rounded-[32px] flex items-center justify-center text-red-500 active:scale-90 transition-all border border-white/10 hover:bg-red-500/10 hover:border-red-500/20 group"
                        title="Reject Call"
                    >
                        <PhoneOff className="w-8 h-8 group-hover:rotate-12 transition-transform" />
                    </button>
                    <button
                        onClick={onAccept}
                        className="flex-1 h-20 bg-emerald-600 rounded-[32px] flex items-center justify-center text-white shadow-[0_15px_40px_rgba(16,185,129,0.4)] active:scale-90 transition-all hover:bg-emerald-500 group"
                        title="Accept Call"
                    >
                        {isVideo ? <Video className="w-8 h-8" /> : <Phone className="w-8 h-8 animate-bounce" />}
                    </button>
                </div>

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
