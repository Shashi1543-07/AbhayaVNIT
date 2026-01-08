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
                className="px-4 pt-28 pb-24"
                variants={containerStagger}
                initial="hidden"
                animate="visible"
            >
                {/* Create Broadcast */}
                <motion.div variants={cardVariant} className="glass-card rounded-2xl p-6 space-y-5 border border-white/20 shadow-xl">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-indigo-50 rounded-lg">
                            <Megaphone className="w-5 h-5 text-indigo-600" />
                        </div>
                        <h2 className="font-bold text-slate-800 text-lg">New Campus Alert</h2>
                    </div>

                    <textarea
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        placeholder="Type your campus-wide announcement here..."
                        className="w-full p-4 bg-white/50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-purple-400/30 min-h-[120px] shadow-inner text-slate-700 placeholder:text-slate-400"
                    />

                    <div className="flex flex-col gap-4">
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Priority:</span>
                            <div className="flex gap-2 flex-1">
                                {['info', 'warning', 'emergency'].map((p) => (
                                    <button
                                        key={p}
                                        onClick={() => setPriority(p as any)}
                                        className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all flex-1 border ${priority === p
                                            ? p === 'emergency' ? 'bg-red-500 text-white border-red-600' :
                                                p === 'warning' ? 'bg-amber-500 text-white border-amber-600' :
                                                    'bg-indigo-600 text-white border-indigo-700'
                                            : 'bg-white/50 text-slate-400 border-slate-100'
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
                            className="w-full bg-gradient-to-r from-[#FF99AC] via-[#C084FC] to-[#89CFF0] text-white p-4 rounded-2xl font-bold shadow-lg hover:opacity-90 hover:shadow-purple-200/50 disabled:opacity-50 disabled:shadow-none active:scale-[0.98] transition-all flex items-center justify-center gap-3 border border-white/20"
                        >
                            <Send className="w-5 h-5" />
                            {loading ? 'Sending...' : 'Send Campus-Wide Broadcast'}
                        </button>
                    </div>
                </motion.div>

                {/* History */}
                <motion.div variants={cardVariant}>
                    <div className="flex items-center gap-2 mb-4 ml-1">
                        <Clock className="w-4 h-4 text-slate-400" />
                        <h3 className="text-sm font-bold text-slate-600 uppercase tracking-widest">Sent Alerts History</h3>
                    </div>

                    <div className="space-y-4">
                        {broadcasts.length === 0 ? (
                            <div className="text-center py-12 glass-card rounded-2xl opacity-60">
                                <Megaphone className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                                <p className="text-slate-400 text-sm">No security broadcasts sent yet.</p>
                            </div>
                        ) : (
                            broadcasts.map(b => (
                                <div key={b.id} className="glass-card rounded-2xl p-5 border-l-8 shadow-sm transition-all hover:bg-white/60" style={{
                                    borderLeftColor: b.priority === 'emergency' ? '#fe3559' : b.priority === 'warning' ? '#f59e0b' : '#6366f1'
                                }}>
                                    <div className="flex justify-between items-start mb-3">
                                        <span className={`text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-tighter ${b.priority === 'emergency' ? 'bg-red-100 text-red-700' :
                                            b.priority === 'warning' ? 'bg-amber-100 text-amber-700' :
                                                'bg-indigo-100 text-indigo-700'
                                            }`}>
                                            {b.priority}
                                        </span>
                                        <span className="text-[10px] font-bold text-slate-400 bg-slate-50 px-2 py-0.5 rounded-full">
                                            {b.createdAt?.seconds ? new Date(b.createdAt.seconds * 1000).toLocaleString() : 'Just now'}
                                        </span>
                                    </div>
                                    <h4 className="font-bold text-slate-800 mb-1">{b.title}</h4>
                                    <p className="text-slate-600 text-sm leading-relaxed">{b.message}</p>
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
