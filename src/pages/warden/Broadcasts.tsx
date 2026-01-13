import { useState, useEffect } from 'react';
import MobileWrapper from '../../components/layout/MobileWrapper';
import TopHeader from '../../components/layout/TopHeader';
import BottomNav from '../../components/layout/BottomNav';
import { useAuthStore } from '../../context/authStore';
import { broadcastService, type Broadcast } from '../../services/broadcastService';
import { Megaphone, Send } from 'lucide-react';
import { motion } from 'framer-motion';
import { containerStagger } from '../../lib/animations';
import { wardenNavItems } from '../../lib/navItems';

export default function WardenBroadcasts() {
    const { profile } = useAuthStore();
    const wardenHostelId = profile?.hostelId || profile?.hostel || 'H6';
    const [broadcasts, setBroadcasts] = useState<Broadcast[]>([]);
    const [newBroadcast, setNewBroadcast] = useState('');
    const [priority, setPriority] = useState<'info' | 'warning' | 'emergency'>('info');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const unsubscribe = broadcastService.subscribeToAllBroadcasts((data: Broadcast[]) => {
            // Filter hostel-specific or campus-wide broadcasts for the history list
            setBroadcasts(data.filter(b => b.hostelId === wardenHostelId || b.hostelId === 'all'));
        });
        return () => unsubscribe();
    }, [wardenHostelId]);

    const handleSend = async () => {
        if (!newBroadcast.trim()) return;
        setLoading(true);
        try {
            await broadcastService.sendBroadcast({
                title: priority === 'emergency' ? `Emergency Alert - ${wardenHostelId}` : priority === 'warning' ? 'Important Notice' : 'Hostel Announcement',
                message: newBroadcast,
                priority,
                hostelId: wardenHostelId,
                senderRole: 'warden',
                createdBy: profile?.uid || 'warden'
            });
            setNewBroadcast('');
            setPriority('info');
            alert('Broadcast sent successfully!');
        } catch (error) {
            console.error(error);
            alert('Failed to send broadcast.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <MobileWrapper>
            <TopHeader title="Broadcasts" showBackButton={true} />

            <motion.main
                className="px-4 pt-nav-safe pb-nav-safe"
                variants={containerStagger}
                initial="hidden"
                animate="show"
            >
                {/* Create Broadcast */}
                <div className="glass-card bg-black/40 rounded-[32px] p-6 space-y-5 border border-[#D4AF37]/20 shadow-[0_0_30px_rgba(212,175,55,0.05)]">
                    <h2 className="font-heading font-black text-white text-lg tracking-tight uppercase flex items-center gap-3">
                        <div className="p-2.5 bg-[#D4AF37]/10 rounded-xl border border-[#D4AF37]/20">
                            <Megaphone className="w-5 h-5 text-[#D4AF37]" strokeWidth={2.5} />
                        </div>
                        New Broadcast
                    </h2>

                    <textarea
                        value={newBroadcast}
                        onChange={(e) => setNewBroadcast(e.target.value)}
                        placeholder={`Message for ${wardenHostelId} students...`}
                        className="w-full p-5 bg-white/5 border border-white/10 rounded-2xl focus:outline-none focus:border-[#D4AF37]/50 focus:bg-white/10 min-h-[140px] shadow-inner text-white placeholder:text-zinc-600 font-bold transition-all text-sm"
                    />

                    <div className="flex flex-col gap-5">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                            <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest shrink-0">Priority:</span>
                            <div className="flex gap-2 w-full">
                                {['info', 'warning', 'emergency'].map((p) => (
                                    <button
                                        key={p}
                                        onClick={() => setPriority(p as any)}
                                        className={`px-1 py-3 rounded-xl text-[9px] sm:text-[10px] font-black uppercase tracking-widest transition-all flex-1 border shadow-sm ${priority === p
                                            ? p === 'emergency' ? 'bg-red-600 text-white border-red-500 shadow-red-900/20' :
                                                p === 'warning' ? 'bg-amber-500 text-black border-amber-400 shadow-amber-900/20' :
                                                    'bg-[#D4AF37] text-black border-[#FDE047] shadow-[#D4AF37]/20'
                                            : 'bg-white/5 text-zinc-500 border-white/5 hover:bg-white/10'
                                            }`}
                                    >
                                        {p}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <button
                            onClick={handleSend}
                            disabled={loading || !newBroadcast.trim()}
                            className="w-full bg-gradient-to-r from-[#CF9E1B] via-[#D4AF37] to-[#8B6E13] text-black p-4 rounded-xl font-black uppercase tracking-wider text-xs shadow-lg hover:shadow-[#D4AF37]/20 hover:brightness-110 disabled:opacity-50 disabled:shadow-none active:scale-[0.98] transition-all flex items-center justify-center gap-3 border border-white/20"
                        >
                            <Send className="w-4 h-4" strokeWidth={3} />
                            {loading ? 'Transmitting...' : 'Send Broadcast'}
                        </button>
                    </div>
                </div>

                {/* History */}
                <div className="mt-8">
                    <h3 className="text-xs font-black text-zinc-500 uppercase tracking-[0.2em] mb-4 ml-1">Recent Broadcasts</h3>
                    <div className="space-y-4">
                        {broadcasts.length === 0 ? (
                            <div className="text-center py-12 bg-white/5 rounded-[32px] border border-white/5">
                                <p className="text-zinc-600 text-[10px] font-black uppercase tracking-widest">No active transmissions</p>
                            </div>
                        ) : (
                            broadcasts.map(broadcast => (
                                <div key={broadcast.id} className="relative bg-zinc-900/50 backdrop-blur-md rounded-[24px] p-6 border border-white/10 overflow-hidden group hover:border-[#D4AF37]/30 transition-all">
                                    <div className={`absolute top-0 left-0 w-1 h-full ${broadcast.priority === 'emergency' ? 'bg-red-600' :
                                            broadcast.priority === 'warning' ? 'bg-amber-500' :
                                                'bg-[#D4AF37]'
                                        }`} />
                                    <div className="flex justify-between items-start mb-4 pl-2">
                                        <span className={`text-[9px] font-black px-3 py-1.5 rounded-lg uppercase tracking-widest border ${broadcast.priority === 'emergency' ? 'bg-red-600/10 text-red-500 border-red-500/20' :
                                                broadcast.priority === 'warning' ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' :
                                                    'bg-[#D4AF37]/10 text-[#D4AF37] border-[#D4AF37]/20'
                                            }`}>
                                            {broadcast.priority}
                                        </span>
                                        <span className="text-[10px] font-bold text-zinc-500/80 font-mono">
                                            {broadcast.createdAt?.seconds ? new Date(broadcast.createdAt.seconds * 1000).toLocaleDateString() : 'Just now'}
                                        </span>
                                    </div>
                                    <p className="text-zinc-300 text-sm font-medium leading-relaxed pl-2">{broadcast.message}</p>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </motion.main>

            <BottomNav items={wardenNavItems} />
        </MobileWrapper>
    );
}
