import React, { useState, useEffect } from 'react';
import MobileWrapper from '../../components/layout/MobileWrapper';
import TopHeader from '../../components/layout/TopHeader';
import BottomNav from '../../components/layout/BottomNav';
import { useAuthStore } from '../../context/authStore';
import { broadcastService, type Broadcast } from '../../services/broadcastService';
import { Megaphone, Send, AlertTriangle, FileText, Home, User } from 'lucide-react';

export default function WardenBroadcasts() {
    const { profile } = useAuthStore();
    const wardenHostelId = profile?.hostelId || profile?.hostel || 'H6';
    const [broadcasts, setBroadcasts] = useState<Broadcast[]>([]);
    const [newBroadcast, setNewBroadcast] = useState('');
    const [priority, setPriority] = useState<'info' | 'warning' | 'urgent'>('info');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const unsubscribe = broadcastService.subscribeToBroadcasts(wardenHostelId, (data) => {
            setBroadcasts(data);
        });
        return () => unsubscribe();
    }, [wardenHostelId]);

    const handleSend = async () => {
        if (!newBroadcast.trim()) return;
        setLoading(true);
        try {
            await broadcastService.sendBroadcast({
                title: priority === 'urgent' ? 'Urgent Alert' : priority === 'warning' ? 'Important Notice' : 'Announcement',
                message: newBroadcast,
                priority,
                hostelId: wardenHostelId,
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

    const wardenNavItems = [
        { icon: Home, label: 'Dashboard', path: '/warden/dashboard' },
        { icon: AlertTriangle, label: 'SOS', path: '/warden/sos' },
        { icon: FileText, label: 'Reports', path: '/warden/reports' },
        { icon: Megaphone, label: 'Broadcast', path: '/warden/broadcasts' },
    ];

    return (
        <MobileWrapper>
            <TopHeader title="Broadcasts" showBackButton={true} showProfile={true} />

            <main className="px-4 py-6 space-y-6 pb-24">
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
                        className="glass-input w-full p-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 min-h-[100px]"
                    />

                    <div className="flex items-center justify-between gap-3">
                        <div className="flex gap-2">
                            <button
                                onClick={() => setPriority('info')}
                                className={`px-3 py-1 rounded-full text-xs font-bold transition-colors ${priority === 'info' ? 'bg-blue-100 text-blue-700 ring-2 ring-blue-500' : 'bg-white/30 backdrop-blur text-slate-700'}`}
                            >
                                Info
                            </button>
                            <button
                                onClick={() => setPriority('warning')}
                                className={`px-3 py-1 rounded-full text-xs font-bold transition-colors ${priority === 'warning' ? 'bg-amber-100 text-amber-700 ring-2 ring-amber-500' : 'bg-white/30 backdrop-blur text-slate-700'}`}
                            >
                                Warning
                            </button>
                            <button
                                onClick={() => setPriority('urgent')}
                                className={`px-3 py-1 rounded-full text-xs font-bold transition-colors ${priority === 'urgent' ? 'bg-red-100 text-red-700 ring-2 ring-red-500' : 'bg-white/30 backdrop-blur text-slate-700'}`}
                            >
                                Urgent
                            </button>
                        </div>

                        <button
                            onClick={handleSend}
                            disabled={loading || !newBroadcast.trim()}
                            className="bg-primary text-white p-3 rounded-xl shadow-lg shadow-primary/30 disabled:opacity-50 disabled:shadow-none active:scale-95 transition-all"
                        >
                            <Send className="w-5 h-5 text-green-500" />
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
                                    borderLeftColor: broadcast.priority === 'urgent' ? '#ef4444' : broadcast.priority === 'warning' ? '#f59e0b' : '#3b82f6'
                                }}>
                                    <div className="flex justify-between items-start mb-1">
                                        <span className={`text-xs font-bold px-2 py-0.5 rounded uppercase ${broadcast.priority === 'urgent' ? 'bg-red-100 text-red-700' :
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
            </main>

            <BottomNav items={wardenNavItems} />
        </MobileWrapper>
    );
}
