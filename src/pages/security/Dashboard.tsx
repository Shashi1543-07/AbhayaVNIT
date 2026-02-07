import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import MobileWrapper from '../../components/layout/MobileWrapper';
import SOSCard from '../../components/common/SOSCard';
import TopHeader from '../../components/layout/TopHeader';
import BottomNav from '../../components/layout/BottomNav';
import { sosService, type SOSEvent } from '../../services/sosService';
import { db } from '../../lib/firebase';
import { collection, query, where, onSnapshot, limit, deleteDoc, doc } from 'firebase/firestore';
import { Shield, PhoneMissed, X } from 'lucide-react';
import ActiveWalksList from '../../components/security/ActiveWalksList';
import { motion } from 'framer-motion';
import { containerStagger, cardVariant } from '../../lib/animations';
import { securityNavItems } from '../../lib/navItems';
import { useAuthStore } from '../../context/authStore';

import BroadcastViewer from '../../components/shared/BroadcastViewer';
import { Megaphone } from 'lucide-react';

export default function SecurityDashboard() {
    const { user } = useAuthStore();
    const navigate = useNavigate();
    const [activeEvents, setActiveEvents] = useState<SOSEvent[]>([]);
    const [notifications, setNotifications] = useState<any[]>([]);
    const [showBroadcasts, setShowBroadcasts] = useState(false);

    useEffect(() => {
        const unsubscribe = sosService.subscribeToActiveSOS((events) => {
            setActiveEvents(events);
        });
        return () => unsubscribe();
    }, []);

    useEffect(() => {
        if (!user) return;
        const q = query(
            collection(db, 'notifications'),
            where('toUserId', '==', user.uid),
            limit(10)
        );
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const sorted = snapshot.docs
                .map(doc => ({ id: doc.id, ...doc.data() }))
                .sort((a: any, b: any) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
            setNotifications(sorted);
        });
        return () => unsubscribe();
    }, [user]);

    const dismissNotification = async (id: string) => {
        await deleteDoc(doc(db, 'notifications', id));
    };

    return (
        <MobileWrapper>
            <TopHeader title="Security Control" showBackButton={true} />

            <BroadcastViewer
                isOpen={showBroadcasts}
                onClose={() => setShowBroadcasts(false)}
                role="security"
            />

            <motion.main
                className="px-4 pt-nav-safe pb-nav-safe"
                variants={containerStagger}
                initial="hidden"
                animate="visible"
            >
                {/* Visual Alerts / Notifications */}
                {notifications.length > 0 && (
                    <div className="px-4 pt-4 space-y-2">
                        {notifications.map(notif => (
                            <motion.div
                                key={notif.id}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                className="glass-card-soft bg-red-50 border-red-200 p-3 rounded-xl flex items-center justify-between"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="bg-red-100 p-2 rounded-full">
                                        <PhoneMissed className="w-4 h-4 text-red-500" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-red-700">{notif.message}</p>
                                        <p className="text-[10px] text-red-500">
                                            {notif.createdAt?.seconds ? new Date(notif.createdAt.seconds * 1000).toLocaleTimeString() : 'Just now'}
                                        </p>
                                    </div>
                                </div>
                                <button onClick={() => dismissNotification(notif.id)} className="text-red-400 hover:text-red-600">
                                    <X size={16} />
                                </button>
                            </motion.div>
                        ))}
                    </div>
                )}

                {/* Active SOS Cards - Unified Design */}
                {activeEvents.length > 0 ? (
                    <div className="px-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {activeEvents.map(event => (
                            <SOSCard key={event.id} event={event} role="security" />
                        ))}
                    </div>
                ) : (
                    <motion.div variants={cardVariant} className="p-4">
                        <div className="glass rounded-[32px] bg-emerald-500/5 p-6 border border-emerald-500/20 flex items-center gap-4 shadow-2xl">
                            <div className="bg-emerald-500/10 p-3 rounded-2xl border border-emerald-500/20">
                                <Shield className="text-emerald-500 w-6 h-6" />
                            </div>
                            <div>
                                <h3 className="font-extrabold text-white text-base font-heading">All Clear</h3>
                                <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest leading-none">No active emergencies</p>
                            </div>
                        </div>
                    </motion.div>
                )}

                {/* Active Safe Walks */}
                <motion.div variants={cardVariant} className="p-4 space-y-3">
                    <div className="flex justify-between items-center px-1">
                        <h3 className="text-sm font-bold text-[#D4AF37] font-heading uppercase tracking-tighter">Active Safe Walks</h3>
                        <button
                            onClick={() => window.location.href = '/security/safe-walks'}
                            className="text-[10px] text-[#D4AF37]/60 font-black uppercase tracking-widest"
                        >
                            View All
                        </button>
                    </div>
                    <ActiveWalksList
                        onSelectWalk={(walk) => navigate(`/security/safe-walk/${walk.id}`)}
                    />
                </motion.div>


                {/* Bottom Spacer */}
                <div className="h-4" />

                {/* Admin Broadcast Button - Moved to Bottom */}
                <div className="px-4 mb-4">
                    <motion.button
                        variants={cardVariant}
                        onClick={() => setShowBroadcasts(true)}
                        className="w-full bg-gradient-to-br from-[#CF9E1B] via-[#D4AF37] to-[#8B6E13] p-[1.5px] rounded-[24px] shadow-2xl active:scale-95 transition-all group"
                    >
                        <div className="bg-black/80 backdrop-blur-2xl rounded-[22px] p-4 flex items-center justify-between border border-white/5">
                            <div className="flex items-center gap-3">
                                <div className="bg-[#D4AF37]/10 p-2.5 rounded-2xl border border-[#D4AF37]/20">
                                    <Megaphone className="w-5 h-5 text-[#D4AF37]" />
                                </div>
                                <div className="text-left">
                                    <h3 className="font-black text-white text-sm font-heading tracking-tight">Priority Broadcasts</h3>
                                    <p className="text-[10px] text-[#D4AF37] font-bold opacity-60">Admin alerts & notices</p>
                                </div>
                            </div>
                            <div className="bg-[#D4AF37] px-4 py-1.5 rounded-xl text-[10px] font-black text-black uppercase tracking-widest shadow-lg">
                                Check
                            </div>
                        </div>
                    </motion.button>
                </div>
            </motion.main>

            <BottomNav items={securityNavItems} />
        </MobileWrapper >
    );
}
