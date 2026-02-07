import { useState, useEffect } from 'react';
import MobileWrapper from '../../components/layout/MobileWrapper';
import TopHeader from '../../components/layout/TopHeader';
import BottomNav from '../../components/layout/BottomNav';
import { useAuthStore } from '../../context/authStore';
import { broadcastService, type Broadcast } from '../../services/broadcastService';
import { Megaphone, Send, Timer, Trash2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { containerStagger, cardVariant } from '../../lib/animations';
import { wardenNavItems } from '../../lib/navItems';

export default function WardenBroadcasts() {
    const { user, profile } = useAuthStore();
    const wardenHostelId = profile?.hostelId || profile?.hostel || 'H6';
    const [broadcasts, setBroadcasts] = useState<Broadcast[]>([]);
    const [newBroadcast, setNewBroadcast] = useState('');
    const [title, setTitle] = useState('');
    const [priority, setPriority] = useState<'info' | 'warning' | 'emergency'>('info');
    const [durationHours, setDurationHours] = useState(24);
    const [loading, setLoading] = useState(false);
    const [deleting, setDeleting] = useState<string | null>(null);

    useEffect(() => {
        const unsubscribe = broadcastService.subscribeToAllBroadcasts((data: Broadcast[]) => {
            // Filter hostel-specific broadcasts for the history list
            setBroadcasts(data.filter(b => b.hostelId === wardenHostelId || b.senderRole === 'warden'));
        });
        return () => unsubscribe();
    }, [wardenHostelId]);

    const handleSend = async () => {
        if (!newBroadcast.trim() || !user) return;
        setLoading(true);
        try {
            await broadcastService.sendBroadcast({
                title: title || (priority === 'emergency' ? `Emergency - ${wardenHostelId}` : 'Hostel Notice'),
                message: newBroadcast,
                priority,
                targetGroup: 'student',
                hostelId: wardenHostelId,
                senderRole: 'warden',
                createdBy: profile?.name || user.email?.split('@')[0] || 'Warden',
                createdById: user.uid,
                durationHours
            });
            setNewBroadcast('');
            setTitle('');
            setPriority('info');
            setDurationHours(24);
            alert('Broadcast sent successfully!');
        } catch (error) {
            console.error(error);
            alert('Failed to send broadcast.');
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
            <TopHeader title="Broadcasts" showBackButton={true} />

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
                        New Broadcast
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
                            value={newBroadcast}
                            onChange={(e) => setNewBroadcast(e.target.value)}
                            placeholder={`Message for ${wardenHostelId} students...`}
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
                            disabled={loading || !newBroadcast.trim()}
                            className="w-full bg-gradient-to-r from-[#D4AF37] to-[#8B6E13] text-black py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50 active:scale-[0.98] transition-all"
                        >
                            <Send className="w-4 h-4" />
                            {loading ? 'Sending...' : 'Send Broadcast'}
                        </button>
                    </div>
                </motion.div>

                {/* History */}
                <motion.div variants={cardVariant}>
                    <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-3 ml-1">Recent Broadcasts</h3>
                    <div className="space-y-3">
                        {broadcasts.length === 0 ? (
                            <div className="text-center py-10 bg-white/5 rounded-2xl border border-white/5">
                                <p className="text-zinc-600 text-xs">No broadcasts yet</p>
                            </div>
                        ) : (
                            broadcasts.map(broadcast => {
                                const expired = isExpired(broadcast);
                                // Allow delete if creator matches by ID or createdBy field
                                const canDelete = user?.uid === broadcast.createdById || user?.uid === broadcast.createdBy || (broadcast.senderRole === 'warden' && profile?.role === 'warden');

                                return (
                                    <div
                                        key={broadcast.id}
                                        className={`p-4 rounded-2xl border ${expired ? 'opacity-50 border-white/5' : 'border-white/10'} bg-white/5`}
                                    >
                                        <div className="flex justify-between items-start mb-2">
                                            <div className="flex flex-wrap gap-1.5">
                                                <span className={`text-[9px] font-bold px-2 py-0.5 rounded-lg uppercase
                                                    ${broadcast.priority === 'emergency' ? 'bg-red-500/20 text-red-400' :
                                                        broadcast.priority === 'warning' ? 'bg-amber-500/20 text-amber-400' :
                                                            'bg-[#D4AF37]/20 text-[#D4AF37]'}`}>
                                                    {broadcast.priority}
                                                </span>
                                                <span className={`text-[9px] font-bold px-2 py-0.5 rounded-lg flex items-center gap-1
                                                    ${expired ? 'bg-red-500/20 text-red-400' : 'bg-white/10 text-zinc-400'}`}>
                                                    <Timer className="w-2.5 h-2.5" />
                                                    {getTimeRemaining(broadcast)}
                                                </span>
                                            </div>
                                            {canDelete && (
                                                <button
                                                    onClick={() => handleDelete(broadcast)}
                                                    disabled={deleting === broadcast.id}
                                                    className="p-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 disabled:opacity-50"
                                                >
                                                    <Trash2 className="w-3 h-3" />
                                                </button>
                                            )}
                                        </div>
                                        <h4 className="font-semibold text-white text-sm mb-1">{broadcast.title}</h4>
                                        <p className="text-xs text-zinc-400 leading-relaxed">{broadcast.message}</p>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </motion.div>
            </motion.main>

            <BottomNav items={wardenNavItems} />
        </MobileWrapper>
    );
}
