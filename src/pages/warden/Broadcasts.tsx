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
                className="px-4 pt-28 pb-24"
                variants={containerStagger}
                initial="hidden"
                animate="show"
            >
                {/* Create Broadcast */}
                <div className="glass-card rounded-2xl p-4 space-y-4 border-2 border-black/15">
                    <h2 className="font-bold text-slate-800 flex items-center gap-2">
                        <Megaphone className="w-5 h-5 text-primary" />
                        New Broadcast
                    </h2>

                    <textarea
                        value={newBroadcast}
                        onChange={(e) => setNewBroadcast(e.target.value)}
                        placeholder={`Message for ${wardenHostelId} students...`}
                        className="glass-input w-full p-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-400/50 min-h-[100px]"
                    />

                    <div className="flex items-center justify-between gap-3">
                        <div className="flex gap-2">
                            {['info', 'warning', 'emergency'].map((p) => (
                                <button
                                    key={p}
                                    onClick={() => setPriority(p as any)}
                                    className={`px-3 py-1 rounded-full text-xs font-bold transition-colors capitalize ${priority === p
                                        ? p === 'emergency' ? 'bg-red-100 text-red-700 ring-2 ring-red-500' :
                                            p === 'warning' ? 'bg-amber-100 text-amber-700 ring-2 ring-amber-500' :
                                                'bg-blue-100 text-blue-700 ring-2 ring-blue-500'
                                        : 'bg-white/30 backdrop-blur text-slate-700'
                                        }`}
                                >
                                    {p}
                                </button>
                            ))}
                        </div>

                        <button
                            onClick={handleSend}
                            disabled={loading || !newBroadcast.trim()}
                            className="bg-gradient-to-r from-[#FF99AC] via-[#C084FC] to-[#89CFF0] text-white p-3 rounded-xl shadow-lg hover:opacity-90 hover:shadow-purple-200/50 disabled:opacity-50 disabled:shadow-none active:scale-95 transition-all border border-white/20"
                        >
                            <Send className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* History */}
                <div>
                    <h3 className="text-sm font-bold text-slate-800 mb-3 ml-1">Recent Broadcasts</h3>
                    <div className="space-y-3">
                        {broadcasts.length === 0 ? (
                            <p className="text-center text-slate-400 text-sm py-8">No broadcasts sent yet.</p>
                        ) : (
                            broadcasts.map(broadcast => (
                                <div key={broadcast.id} className="glass-card rounded-xl p-4 border-l-4" style={{
                                    borderLeftColor: broadcast.priority === 'emergency' ? '#ef4444' : broadcast.priority === 'warning' ? '#f59e0b' : '#3b82f6'
                                }}>
                                    <div className="flex justify-between items-start mb-1">
                                        <span className={`text-xs font-bold px-2 py-0.5 rounded uppercase ${broadcast.priority === 'emergency' ? 'bg-red-100 text-red-700' :
                                            broadcast.priority === 'warning' ? 'bg-amber-100 text-amber-700' :
                                                'bg-blue-100 text-blue-700'
                                            }`}>
                                            {broadcast.priority}
                                        </span>
                                        <span className="text-xs text-slate-400">
                                            {broadcast.createdAt?.seconds ? new Date(broadcast.createdAt.seconds * 1000).toLocaleDateString() : 'Just now'}
                                        </span>
                                    </div>
                                    <p className="text-slate-700 mt-2 text-sm">{broadcast.message}</p>
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
