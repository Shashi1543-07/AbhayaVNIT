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
        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-6 bg-slate-900/40 backdrop-blur-sm">
            <motion.div
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                className="glass-card w-full max-w-sm p-8 pt-10 flex flex-col items-center text-center shadow-2xl border border-white/20 bg-white/80 relative overflow-hidden"
            >
                {isEmergency && (
                    <div className={`absolute top-0 left-0 right-0 py-1.5 text-[10px] font-black uppercase tracking-[0.2em] text-white ${contextType === 'sos' ? 'bg-red-600' : 'bg-primary-600'
                        }`}>
                        Active {contextType === 'sos' ? 'SOS' : 'Safe Walk'} Coordination
                    </div>
                )}
                <div className="relative mb-6">
                    <div className="w-24 h-24 bg-primary-100 rounded-full flex items-center justify-center animate-pulse">
                        {isVideo ? <Video className="w-10 h-10 text-primary-600" /> : <Phone className="w-10 h-10 text-primary-600" />}
                    </div>
                    <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-md">
                        <div className="w-6 h-6 bg-emerald-500 rounded-full animate-ping" />
                    </div>
                </div>

                <h3 className="text-2xl font-black text-slate-900 mb-1">{callerName}</h3>
                <p className="text-slate-500 font-medium mb-1 uppercase tracking-wider text-xs">{callerRole}</p>
                <p className="text-primary-600 font-bold text-sm mb-8">
                    Incoming {isVideo ? 'Video' : 'Voice'} Call...
                </p>

                <div className="flex gap-6 w-full">
                    <button
                        onClick={onReject}
                        className="flex-1 py-4 bg-red-50 rounded-2xl flex items-center justify-center text-red-600 active:scale-95 transition-all border border-red-100"
                    >
                        <PhoneOff className="w-6 h-6" />
                    </button>
                    <button
                        onClick={onAccept}
                        className="flex-1 py-4 bg-emerald-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-emerald-200 active:scale-95 transition-all"
                    >
                        {isVideo ? <Video className="w-6 h-6" /> : <Phone className="w-6 h-6" />}
                    </button>
                </div>
            </motion.div>
        </div>
    );
}
