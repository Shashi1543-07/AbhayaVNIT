import { useState, useEffect } from 'react';
import MobileWrapper from '../../components/layout/MobileWrapper';
import TopHeader from '../../components/layout/TopHeader';
import BottomNav from '../../components/layout/BottomNav';
import { useAuthStore } from '../../context/authStore';
import { broadcastService, type Broadcast } from '../../services/broadcastService';
import { Megaphone, Send, Clock } from 'lucide-react';
import { securityNavItems } from '../../lib/navItems';
import { motion } from 'framer-motion';
import { containerStagger, cardVariant } from '../../lib/animations';

export default function SecurityBroadcasts() {
    const { user } = useAuthStore();
    const [broadcasts, setBroadcasts] = useState<Broadcast[]>([]);
    const [message, setMessage] = useState('');
    const [priority, setPriority] = useState<'info' | 'warning' | 'emergency'>('info');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const unsubscribe = broadcastService.subscribeToAllBroadcasts((data) => {
            // Security sees all security broadcasts or all broadcasts in general
            setBroadcasts(data.filter(b => b.senderRole === 'security'));
        });
        return () => unsubscribe();
    }, []);

    const handleSend = async () => {
        if (!message.trim()) return;
        setLoading(true);
        try {
            await broadcastService.sendBroadcast({
                title: priority === 'emergency' ? 'Security Emergency' : priority === 'warning' ? 'Security Notice' : 'Security Update',
                message: message,
                priority,
                hostelId: 'all', // Security broadcasts are campus-wide
                senderRole: 'security',
                createdBy: user?.uid || 'security'
            });
            setMessage('');
            setPriority('info');
            alert('Campus-wide alert sent!');
        } catch (error) {
            console.error(error);
            alert('Failed to send. Please check your network or permissions.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <MobileWrapper>
            <TopHeader title="Campus Security Alerts" showBackButton={true} />

            <motion.main
                className="px-4 pt-nav-safe pb-nav-safe"
                variants={containerStagger}
                initial="hidden"
                animate="visible"
            >
                {/* Create Broadcast */}
                <motion.div variants={cardVariant} className="glass-card bg-black/40 rounded-[32px] p-6 space-y-5 border border-[#D4AF37]/20 shadow-[0_0_30px_rgba(212,175,55,0.05)]">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2.5 bg-[#D4AF37]/10 rounded-xl border border-[#D4AF37]/20">
                            <Megaphone className="w-5 h-5 text-[#D4AF37]" strokeWidth={2.5} />
                        </div>
                        <h2 className="font-heading font-black text-white text-lg tracking-tight uppercase">New Campus Alert</h2>
                    </div>

                    <textarea
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        placeholder="Type your campus-wide announcement here..."
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
                            disabled={loading || !message.trim()}
                            className="w-full bg-gradient-to-r from-[#CF9E1B] via-[#D4AF37] to-[#8B6E13] text-black p-4 rounded-xl font-black uppercase tracking-wider text-xs shadow-lg hover:shadow-[#D4AF37]/20 hover:brightness-110 disabled:opacity-50 disabled:shadow-none active:scale-[0.98] transition-all flex items-center justify-center gap-3 border border-white/20"
                        >
                            <Send className="w-4 h-4" strokeWidth={3} />
                            {loading ? 'Transmitting...' : 'Send Campus-Wide Broadcast'}
                        </button>
                    </div>
                </motion.div>

                {/* History */}
                <motion.div variants={cardVariant} className="mt-8">
                    <div className="flex items-center gap-2 mb-4 ml-1">
                        <Clock className="w-4 h-4 text-[#D4AF37]" strokeWidth={2.5} />
                        <h3 className="text-xs font-black text-zinc-500 uppercase tracking-[0.2em]">Sent Alerts History</h3>
                    </div>

                    <div className="space-y-4">
                        {broadcasts.length === 0 ? (
                            <div className="text-center py-12 bg-white/5 rounded-[32px] border border-white/5">
                                <Megaphone className="w-10 h-10 text-[#D4AF37]/20 mx-auto mb-4" />
                                <p className="text-zinc-600 text-[10px] font-black uppercase tracking-widest">No active transmissions</p>
                            </div>
                        ) : (
                            broadcasts.map(b => (
                                <div key={b.id} className="relative bg-zinc-900/50 backdrop-blur-md rounded-[24px] p-6 border border-white/10 overflow-hidden group hover:border-[#D4AF37]/30 transition-all">
                                    <div className={`absolute top-0 left-0 w-1 h-full ${b.priority === 'emergency' ? 'bg-red-600' :
                                        b.priority === 'warning' ? 'bg-amber-500' :
                                            'bg-[#D4AF37]'
                                        }`} />

                                    <div className="flex justify-between items-start mb-4 pl-2">
                                        <span className={`text-[9px] font-black px-3 py-1.5 rounded-lg uppercase tracking-widest border ${b.priority === 'emergency' ? 'bg-red-600/10 text-red-500 border-red-500/20' :
                                            b.priority === 'warning' ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' :
                                                'bg-[#D4AF37]/10 text-[#D4AF37] border-[#D4AF37]/20'
                                            }`}>
                                            {b.priority}
                                        </span>
                                        <span className="text-[10px] font-bold text-zinc-500/80 font-mono">
                                            {b.createdAt?.seconds ? new Date(b.createdAt.seconds * 1000).toLocaleString() : 'Just now'}
                                        </span>
                                    </div>
                                    <h4 className="font-black text-white text-lg mb-2 font-heading tracking-tight pl-2 group-hover:text-[#D4AF37] transition-colors">{b.title}</h4>
                                    <p className="text-zinc-400 text-sm font-medium leading-relaxed pl-2">{b.message}</p>
                                </div>
                            ))
                        )}
                    </div>
                </motion.div>
            </motion.main>

            <BottomNav items={securityNavItems} />
        </MobileWrapper>
    );
}
