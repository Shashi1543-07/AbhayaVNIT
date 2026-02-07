import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Megaphone, Clock, X, Timer } from 'lucide-react';
import { useAuthStore } from '../../context/authStore';
import { broadcastService } from '../../services/broadcastService';

interface BroadcastViewerProps {
    isOpen: boolean;
    onClose: () => void;
    role: 'student' | 'warden' | 'security';
}

export default function BroadcastViewer({ isOpen, onClose, role }: BroadcastViewerProps) {
    const [broadcasts, setBroadcasts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const { profile } = useAuthStore();
    const userHostel = profile?.hostelId || profile?.hostel || '';

    useEffect(() => {
        if (!isOpen) return;

        setLoading(true);
        // Using the updated service method to get all broadcasts
        const unsubscribe = broadcastService.subscribeToAllBroadcasts((allBroadcasts) => {
            // Filter relevant broadcasts based on role and hostel
            const relevant = allBroadcasts.filter((b: any) => {
                // Admin broadcasts: check targetGroup
                if (b.senderRole === 'admin') {
                    return b.targetGroup === 'all' || b.targetGroup === role;
                }

                // Warden broadcasts: check hostel match
                if (b.senderRole === 'warden') {
                    // Students only see theirs, wardens/security see all for transparency or can be filtered further
                    if (role === 'student') return b.hostelId === userHostel;
                    return true;
                }

                // Security broadcasts: visible to all
                if (b.senderRole === 'security') return true;

                // Fallback for older broadcasts (optional but safe)
                if (!b.senderRole && b.targetGroup === 'all') return true;
                if (!b.senderRole && b.targetGroup === role) return true;

                return false;
            });

            setBroadcasts(relevant);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [isOpen, role, userHostel]);

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[120] flex flex-col bg-black">
                    {/* Background Layer */}
                    <div className="absolute inset-0 bg-black z-0" />

                    {/* Header - Tactical Style */}
                    <div className="relative z-10 px-6 pb-6 pt-12 flex items-end justify-between bg-black/40 backdrop-blur-xl border-b border-white/5">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-white/5 rounded-2xl border border-[#D4AF37]/20 shadow-[0_0_15px_rgba(212,175,55,0.1)]">
                                <Megaphone className="w-6 h-6 text-[#D4AF37]" strokeWidth={3} />
                            </div>
                            <div>
                                <h2 className="text-xl font-black text-white font-heading tracking-tight uppercase tracking-[0.2em]">Campus News</h2>
                                <p className="text-[10px] text-zinc-500 font-black uppercase tracking-widest font-heading">Official Alerts</p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl transition-all text-zinc-400 border border-white/10 active:scale-90"
                        >
                            <X className="w-5 h-5" strokeWidth={3} />
                        </button>
                    </div>

                    {/* Content Area */}
                    <div className="relative z-10 flex-1 overflow-y-auto p-6 space-y-5 pb-nav-safe">
                        {loading ? (
                            <div className="flex flex-col items-center justify-center py-20 text-zinc-500">
                                <div className="w-12 h-12 border-4 border-[#D4AF37] border-t-transparent rounded-full animate-spin shadow-[0_0_15px_rgba(212,175,55,0.2)]" />
                                <p className="text-[10px] font-black uppercase tracking-[0.3em] mt-6">Scanning Channels...</p>
                            </div>
                        ) : broadcasts.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-20 text-zinc-500 text-center">
                                <div className="bg-white/5 p-6 rounded-full mb-6 border border-white/5">
                                    <Megaphone className="w-10 h-10 opacity-20 text-[#D4AF37]" />
                                </div>
                                <p className="font-black text-white uppercase tracking-widest text-xs">No active broadcasts</p>
                                <p className="text-[10px] font-bold mt-2 opacity-40 uppercase">You are fully synchronized</p>
                            </div>
                        ) : (
                            broadcasts.map((item) => (
                                <motion.div
                                    key={item.id}
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className={`relative p-6 rounded-[32px] border transition-all hover:bg-white/5 overflow-hidden ${item.priority === 'emergency'
                                        ? 'bg-red-600/10 border-red-500/30'
                                        : item.priority === 'warning'
                                            ? 'bg-amber-500/10 border-amber-500/30'
                                            : 'bg-white/5 border-white/5'
                                        }`}
                                >
                                    {/* Glass Overlay for depth */}
                                    <div className="absolute inset-0 bg-white/[0.02] backdrop-blur-3xl pointer-events-none" />

                                    {/* Priority Badge */}
                                    <div className="relative z-10 flex justify-between items-center mb-5">
                                        <span className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest font-heading shadow-lg border
                                            ${item.priority === 'emergency'
                                                ? 'bg-red-600 text-white border-red-400/50 pulse-border'
                                                : item.priority === 'warning'
                                                    ? 'bg-amber-500 text-black border-amber-300/50'
                                                    : 'bg-[#D4AF37]/20 text-[#D4AF37] border-[#D4AF37]/30'
                                            }`}
                                        >
                                            {item.priority}
                                        </span>
                                        <div className="flex items-center gap-3">
                                            <div className="flex items-center gap-1.5 text-[10px] text-zinc-500 font-bold uppercase">
                                                <Clock className="w-3.5 h-3.5" />
                                                <span>
                                                    {item.createdAt?.seconds
                                                        ? new Date(item.createdAt.seconds * 1000).toLocaleDateString()
                                                        : 'Active'}
                                                </span>
                                            </div>
                                            {item.expiresAt && (
                                                <div className="flex items-center gap-1.5 text-[10px] text-[#D4AF37] font-bold uppercase">
                                                    <Timer className="w-3.5 h-3.5" />
                                                    <span>{broadcastService.getTimeRemaining(item)}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <h3 className="relative z-10 text-xl font-black text-white mb-3 leading-tight font-heading tracking-tight uppercase">
                                        {item.title}
                                    </h3>

                                    <div className="relative z-10 text-zinc-400 text-[15px] leading-relaxed font-bold opacity-80 mb-6">
                                        {item.message}
                                    </div>

                                    <div className="relative z-10 pt-5 border-t border-white/5 flex flex-wrap gap-2 items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <span className={`text-[9px] font-black uppercase tracking-[0.15em] py-2 px-4 rounded-xl font-heading bg-white/5 border border-white/10 ${item.senderRole === 'admin' ? 'text-[#D4AF37]' :
                                                item.senderRole === 'security' ? 'text-red-400' :
                                                    'text-purple-400'
                                                }`}>
                                                Origin: {item.senderRole}
                                                {item.senderRole === 'warden' && ` (H-${item.hostelId})`}
                                            </span>
                                        </div>
                                        {item.targetGroup && item.targetGroup !== 'all' && (
                                            <span className="text-[9px] font-black uppercase tracking-[0.15em] bg-[#D4AF37]/5 text-[#D4AF37]/60 px-4 py-2 rounded-xl font-heading border border-[#D4AF37]/10">
                                                Scope: {item.targetGroup}
                                            </span>
                                        )}
                                    </div>
                                </motion.div>
                            ))
                        )}
                    </div>
                </div>
            )}
        </AnimatePresence>
    );
}
