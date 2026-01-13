import MobileWrapper from '../../components/layout/MobileWrapper';
import TopHeader from '../../components/layout/TopHeader';
import BottomNav from '../../components/layout/BottomNav';
import ActionCard from '../../components/ui/ActionCard';
import StatusBadge from '../../components/ui/StatusBadge';
import { useAuthStore } from '../../context/authStore';
import { Users, PhoneMissed, X, Newspaper } from 'lucide-react';
import WardenActiveSOS from '../../components/warden/WardenActiveSOS';
import ActiveWalksList from '../../components/security/ActiveWalksList';
import { motion } from 'framer-motion';
import { containerStagger, cardVariant } from '../../lib/animations';
import { useEffect, useState } from 'react';
import { collection, query, where } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { wardenNavItems } from '../../lib/navItems';
import { doc, deleteDoc, onSnapshot, limit } from 'firebase/firestore';
import { incidentService, type Incident } from '../../services/incidentService';

import { useNavigate } from 'react-router-dom';

import BroadcastViewer from '../../components/shared/BroadcastViewer';
import { Megaphone } from 'lucide-react';

export default function WardenDashboard() {
    const navigate = useNavigate();
    const { profile, user } = useAuthStore();
    const [showBroadcasts, setShowBroadcasts] = useState(false);

    const wardenHostelId = profile?.hostelId || profile?.hostel || 'H6';
    const [notifications, setNotifications] = useState<any[]>([]);
    const [incidents, setIncidents] = useState<Incident[]>([]);

    useEffect(() => {
        if (!user) return;

        // Notifications subscription
        const q = query(
            collection(db, 'notifications'),
            where('toUserId', '==', user.uid),
            limit(10)
        );
        const unsubscribeNotif = onSnapshot(q, (snapshot) => {
            const sorted = snapshot.docs
                .map(doc => ({ id: doc.id, ...doc.data() }))
                .sort((a: any, b: any) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
            setNotifications(sorted);
        });

        // Incidents subscription
        const unsubscribeIncidents = incidentService.subscribeToIncidents(wardenHostelId, (data) => {
            setIncidents(data.slice(0, 3)); // Show top 3 recent
        });

        return () => {
            unsubscribeNotif();
            unsubscribeIncidents();
        };
    }, [user, wardenHostelId]);

    const dismissNotification = async (id: string) => {
        await deleteDoc(doc(db, 'notifications', id));
    };


    // Nav items imported from src/lib/navItems.ts

    return (
        <MobileWrapper>
            <TopHeader title={`Hostel ${wardenHostelId} Warden`} showBackButton={true} />

            <BroadcastViewer
                isOpen={showBroadcasts}
                onClose={() => setShowBroadcasts(false)}
                role="warden"
            />

            <motion.main
                className="px-4 pt-nav-safe pb-nav-safe"
                variants={containerStagger}
                initial="hidden"
                animate="visible"
            >
                {/* Alerts / Notifications */}
                {notifications.length > 0 && (
                    <div className="space-y-2 mb-4">
                        {notifications.map(notif => (
                            <motion.div
                                key={notif.id}
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="glass-card-soft bg-red-50/80 border-red-200 p-3 rounded-xl flex items-center justify-between"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="bg-red-100 p-2 rounded-full">
                                        <PhoneMissed className="w-4 h-4 text-red-500" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-red-700">{notif.message}</p>
                                        <p className="text-[10px] text-red-500">Time: {notif.createdAt?.seconds ? new Date(notif.createdAt.seconds * 1000).toLocaleTimeString() : 'Just now'}</p>
                                    </div>
                                </div>
                                <button onClick={() => dismissNotification(notif.id)} className="text-red-400 hover:text-red-600">
                                    <X size={16} />
                                </button>
                            </motion.div>
                        ))}
                    </div>
                )}

                {/* Active SOS Section */}
                <motion.div variants={cardVariant}>
                    <h3 className="text-sm font-bold text-[#D4AF37] mb-3 ml-1 uppercase tracking-tighter">Active Emergencies</h3>
                    <WardenActiveSOS hostelId={wardenHostelId} />
                </motion.div>

                {/* Active Safe Walks Section */}
                <motion.div variants={cardVariant}>
                    <h3 className="text-sm font-bold text-[#D4AF37] mb-3 ml-1 uppercase tracking-tighter">Active Safe Walks</h3>
                    <ActiveWalksList
                        onSelectWalk={(walk) => navigate(`/warden/safe-walk/${walk.id}`)}
                    />
                </motion.div>


                {/* Recent Incidents Preview */}
                <motion.div variants={cardVariant}>
                    <div className="flex justify-between items-center mb-3 ml-1">
                        <h3 className="text-sm font-bold text-[#D4AF37] uppercase tracking-tighter">Recent Incidents</h3>
                        <button className="text-xs text-[#D4AF37]/60 font-medium">View All</button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {incidents.length === 0 ? (
                            <div className="text-center py-4 text-zinc-500 text-xs col-span-full">
                                No recent incidents reported.
                            </div>
                        ) : (
                            incidents.map((incident) => (
                                <div key={incident.id} className="glass rounded-2xl p-4 flex justify-between items-center cursor-pointer hover:bg-white/5 transition-colors border border-white/5" onClick={() => navigate(`/warden/reports/${incident.id}`)}>
                                    <div className="min-w-0 pr-2">
                                        <p className="font-bold text-sm text-[#D4AF37] truncate">{incident.category}</p>
                                        <p className="text-xs text-zinc-400 truncate">
                                            {incident.reporterName || 'Student'} • {incident.createdAt?.seconds ? new Date(incident.createdAt.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now'}
                                        </p>
                                    </div>
                                    <StatusBadge
                                        status={
                                            incident.status === 'resolved' ? 'success' :
                                                incident.status === 'open' ? 'warning' : 'neutral'
                                        }
                                        label={incident.status.charAt(0).toUpperCase() + incident.status.slice(1)}
                                    />
                                </div>
                            ))
                        )}
                    </div>
                </motion.div>

                {/* Directory Link */}
                {/* Directory Link and Feed */}
                <motion.div variants={cardVariant} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <ActionCard
                        icon={Users}
                        label="Student Directory"
                        variant="default"
                        className="w-full flex-row justify-start px-6 py-4 gap-4"
                        onClick={() => navigate('/warden/directory')}
                    />
                    <ActionCard
                        icon={Newspaper}
                        label="Campus Feed"
                        variant="default"
                        className="w-full flex-row justify-start px-6 py-4 gap-4"
                        onClick={() => navigate('/feed')}
                    />
                </motion.div>

                {/* Bottom Spacer */}
                <div className="h-4" />

                {/* Admin Broadcast Button - Moved to Bottom */}
                <motion.button
                    variants={cardVariant}
                    onClick={() => setShowBroadcasts(true)}
                    className="w-full bg-gradient-to-br from-[#CF9E1B] via-[#D4AF37] to-[#8B6E13] p-[1.5px] rounded-[24px] shadow-2xl active:scale-95 transition-all mb-4 group"
                >
                    <div className="bg-black/80 backdrop-blur-2xl rounded-[22px] p-4 flex items-center justify-between border border-white/5">
                        <div className="flex items-center gap-3">
                            <div className="bg-[#D4AF37]/10 p-2.5 rounded-2xl border border-[#D4AF37]/20">
                                <Megaphone className="w-5 h-5 text-[#D4AF37]" />
                            </div>
                            <div className="text-left">
                                <h3 className="font-black text-white text-sm font-heading tracking-tight">Admin Broadcasts</h3>
                                <p className="text-[10px] text-[#D4AF37] font-bold opacity-60">Official alerts & info</p>
                            </div>
                        </div>
                        <div className="bg-[#D4AF37] px-3 py-1.5 rounded-xl text-[10px] font-black text-black uppercase tracking-widest shadow-lg">
                            View
                        </div>
                    </div>
                </motion.button>

            </motion.main>

            <BottomNav items={wardenNavItems} />
        </MobileWrapper>
    );
}
