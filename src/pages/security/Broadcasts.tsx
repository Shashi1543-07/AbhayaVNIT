import { useState, useEffect } from 'react';
import MobileWrapper from '../../components/layout/MobileWrapper';
import TopHeader from '../../components/layout/TopHeader';
import BottomNav from '../../components/layout/BottomNav';
import { useAuthStore } from '../../context/authStore';
import { broadcastService, type Broadcast } from '../../services/broadcastService';
import { Megaphone, Send, Timer, Trash2 } from 'lucide-react';
import { securityNavItems } from '../../lib/navItems';
import { motion } from 'framer-motion';
import { containerStagger, cardVariant } from '../../lib/animations';

export default function SecurityBroadcasts() {
    const { user, profile } = useAuthStore();
    const [broadcasts, setBroadcasts] = useState<Broadcast[]>([]);
    const [message, setMessage] = useState('');
    const [title, setTitle] = useState('');
    const [priority, setPriority] = useState<'info' | 'warning' | 'emergency'>('info');
    const [durationHours, setDurationHours] = useState(24);
    const [loading, setLoading] = useState(false);
    const [deleting, setDeleting] = useState<string | null>(null);

    useEffect(() => {
        const unsubscribe = broadcastService.subscribeToAllBroadcasts((data) => {
            // Security sees their own broadcasts
            setBroadcasts(data.filter(b => b.senderRole === 'security'));
        });
        return () => unsubscribe();
    }, []);

    const handleSend = async () => {
        if (!message.trim() || !user) return;
        setLoading(true);
        try {
            await broadcastService.sendBroadcast({
                title: title || (priority === 'emergency' ? 'Security Emergency' : 'Security Notice'),
                message: message,
                priority,
                targetGroup: 'all',
                hostelId: 'all',
                senderRole: 'security',
                createdBy: profile?.name || user.email?.split('@')[0] || 'Security',
                createdById: user.uid,
                durationHours
            });
            setMessage('');
            setTitle('');
            setPriority('info');
            setDurationHours(24);
            alert('Campus-wide alert sent!');
        } catch (error) {
            console.error(error);
            alert('Failed to send.');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (broadcast: Broadcast) => {
        if (!confirm(`Delete "${broadcast.title}"?`)) return;
        setDeleting(broadcast.id);
        try {
            await broadcastService.deleteBroadcast(broadcast.id);
        } catch (error) {
            console.error(error);
            alert('Failed to delete.');
        } finally {
            setDeleting(null);
        }
    };

    const getTimeRemaining = (b: Broadcast) => broadcastService.getTimeRemaining(b);
    const isExpired = (b: Broadcast) => broadcastService.isExpired(b);

    return (
        <MobileWrapper>
            <TopHeader title="Campus Security Alerts" showBackButton={true} />

            <motion.main
                className="px-4 pt-nav-safe pb-nav-safe space-y-6"
                variants={containerStagger}
                initial="hidden"
                animate="visible"
            >
                {/* Create Broadcast */}
                <motion.div variants={cardVariant} className="glass rounded-3xl p-5 border border-white/10">
                    <h2 className="font-bold text-white text-lg mb-4 flex items-center gap-3">
                        <div className="p-2 bg-[#D4AF37]/10 rounded-xl border border-[#D4AF37]/20">
                            <Megaphone className="w-5 h-5 text-[#D4AF37]" />
                        </div>
                        New Campus Alert
                    </h2>

                    <div className="space-y-4">
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="Title (optional)"
                            className="w-full p-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm font-medium placeholder:text-zinc-600"
                        />

                        <textarea
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            placeholder="Campus-wide announcement..."
                            className="w-full p-3 bg-white/5 border border-white/10 rounded-xl min-h-[100px] text-white text-sm font-medium placeholder:text-zinc-600 resize-none"
                        />

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-xs text-zinc-500 mb-1.5">Priority</label>
                                <div className="flex gap-1">
                                    {['info', 'warning', 'emergency'].map((p) => (
                                        <button
                                            key={p}
                                            onClick={() => setPriority(p as any)}
                                            className={`flex-1 py-2 rounded-lg text-[10px] font-bold uppercase transition-all
                                                ${priority === p
                                                    ? p === 'emergency' ? 'bg-red-600 text-white' :
                                                        p === 'warning' ? 'bg-amber-500 text-black' :
                                                            'bg-[#D4AF37] text-black'
                                                    : 'bg-white/5 text-zinc-500'
                                                }`}
                                        >
                                            {p.slice(0, 4)}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs text-zinc-500 mb-1.5">Duration</label>
                                <select
                                    className="w-full p-2 bg-white/5 border border-white/10 rounded-xl text-white text-sm"
                                    value={durationHours}
                                    onChange={(e) => setDurationHours(Number(e.target.value))}
                                >
                                    <option value={1} className="bg-zinc-900">1 hour</option>
                                    <option value={6} className="bg-zinc-900">6 hours</option>
                                    <option value={12} className="bg-zinc-900">12 hours</option>
                                    <option value={24} className="bg-zinc-900">24 hours</option>
                                    <option value={48} className="bg-zinc-900">48 hours</option>
                                    <option value={72} className="bg-zinc-900">72 hours</option>
                                </select>
                            </div>
                        </div>

                        <button
                            onClick={handleSend}
                            disabled={loading || !message.trim()}
                            className="w-full bg-gradient-to-r from-[#D4AF37] to-[#8B6E13] text-black py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50 active:scale-[0.98] transition-all"
                        >
                            <Send className="w-4 h-4" />
                            {loading ? 'Sending...' : 'Send Campus-Wide Alert'}
                        </button>
                    </div>
                </motion.div>

                {/* History */}
                <motion.div variants={cardVariant}>
                    <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-3 ml-1">Sent Alerts</h3>
                    <div className="space-y-3">
                        {broadcasts.length === 0 ? (
                            <div className="text-center py-10 bg-white/5 rounded-2xl border border-white/5">
                                <Megaphone className="w-8 h-8 text-[#D4AF37]/20 mx-auto mb-3" />
                                <p className="text-zinc-600 text-xs">No alerts sent yet</p>
                            </div>
                        ) : (
                            broadcasts.map(b => {
                                const expired = isExpired(b);
                                // Allow delete if creator matches by ID or if it's a security broadcast and user is security
                                const canDelete = user?.uid === b.createdById || user?.uid === b.createdBy || (b.senderRole === 'security' && profile?.role === 'security');

                                return (
                                    <div
                                        key={b.id}
                                        className={`p-4 rounded-2xl border ${expired ? 'opacity-50 border-white/5' : 'border-white/10'} bg-white/5`}
                                    >
                                        <div className="flex justify-between items-start mb-2">
                                            <div className="flex flex-wrap gap-1.5">
                                                <span className={`text-[9px] font-bold px-2 py-0.5 rounded-lg uppercase
                                                    ${b.priority === 'emergency' ? 'bg-red-500/20 text-red-400' :
                                                        b.priority === 'warning' ? 'bg-amber-500/20 text-amber-400' :
                                                            'bg-[#D4AF37]/20 text-[#D4AF37]'}`}>
                                                    {b.priority}
                                                </span>
                                                <span className={`text-[9px] font-bold px-2 py-0.5 rounded-lg flex items-center gap-1
                                                    ${expired ? 'bg-red-500/20 text-red-400' : 'bg-white/10 text-zinc-400'}`}>
                                                    <Timer className="w-2.5 h-2.5" />
                                                    {getTimeRemaining(b)}
                                                </span>
                                            </div>
                                            {canDelete && (
                                                <button
                                                    onClick={() => handleDelete(b)}
                                                    disabled={deleting === b.id}
                                                    className="p-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 disabled:opacity-50"
                                                >
                                                    <Trash2 className="w-3 h-3" />
                                                </button>
                                            )}
                                        </div>
                                        <h4 className="font-semibold text-white text-sm mb-1">{b.title}</h4>
                                        <p className="text-xs text-zinc-400 leading-relaxed">{b.message}</p>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </motion.div>
            </motion.main>

            <BottomNav items={securityNavItems} />
        </MobileWrapper>
    );
}
