import MobileWrapper from '../../components/layout/MobileWrapper';
import TopHeader from '../../components/layout/TopHeader';
import BottomNav from '../../components/layout/BottomNav';
import ActionCard from '../../components/ui/ActionCard';
import { useAuthStore } from '../../context/authStore';
import { Users, PhoneMissed, X, Megaphone, Newspaper } from 'lucide-react';
import WardenActiveSOS from '../../components/warden/WardenActiveSOS';
import ActiveWalksList from '../../components/security/ActiveWalksList';
import { motion } from 'framer-motion';
import { containerStagger, cardVariant } from '../../lib/animations';
import { useEffect, useState } from 'react';
import { collection, query, where, doc, deleteDoc, onSnapshot, limit } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { wardenNavItems } from '../../lib/navItems';
import { useNavigate } from 'react-router-dom';
import BroadcastViewer from '../../components/shared/BroadcastViewer';

export default function WardenDashboard() {
    const navigate = useNavigate();
    const { profile, user } = useAuthStore();
    const [showBroadcasts, setShowBroadcasts] = useState(false);

    const wardenHostelId = profile?.hostelId || profile?.hostel || 'H6';
    const [notifications, setNotifications] = useState<any[]>([]);

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

        return () => {
            unsubscribeNotif();
        };
    }, [user, wardenHostelId]);

    const dismissNotification = async (id: string) => {
        await deleteDoc(doc(db, 'notifications', id));
    };

    return (
        <MobileWrapper>
            <TopHeader
                title={`Hostel ${wardenHostelId} Warden`}
                showBackButton={true}
            />

            <BroadcastViewer
                isOpen={showBroadcasts}
                onClose={() => setShowBroadcasts(false)}
                role="warden"
            />

            <motion.main
                className="px-4 pt-nav-safe pb-nav-safe space-y-4"
                variants={containerStagger}
                initial="hidden"
                animate="visible"
            >
                {/* Alerts / Notifications */}
                {notifications.length > 0 && (
                    <div className="space-y-2">
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

                {/* Directory Link */}
                <motion.div variants={cardVariant}>
                    <ActionCard
                        icon={Users}
                        label="Student Directory"
                        variant="default"
                        className="w-full flex-row justify-start px-6 py-4 gap-4"
                        onClick={() => navigate('/warden/directory')}
                    />
                </motion.div>

                {/* Notice Button (Admin Broadcasts) */}
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
                                <h3 className="font-black text-white text-sm font-heading tracking-tight">Notice</h3>
                                <p className="text-[10px] text-[#D4AF37] font-bold opacity-60">Official alerts & announcements</p>
                            </div>
                        </div>
                        <div className="bg-[#D4AF37] px-3 py-1.5 rounded-xl text-[10px] font-black text-black uppercase tracking-widest shadow-lg">
                            View
                        </div>
                    </div>
                </motion.button>

                {/* Campus Feed Button */}
                <motion.button
                    variants={cardVariant}
                    onClick={() => navigate('/feed')}
                    className="w-full glass rounded-[24px] p-4 flex items-center justify-between border border-white/10 active:scale-95 transition-all"
                >
                    <div className="flex items-center gap-3">
                        <div className="bg-[#D4AF37]/10 p-2.5 rounded-2xl border border-[#D4AF37]/20">
                            <Newspaper className="w-5 h-5 text-[#D4AF37]" />
                        </div>
                        <div className="text-left">
                            <h3 className="font-bold text-white text-sm">Campus Feed</h3>
                            <p className="text-[10px] text-zinc-500">Student posts & updates</p>
                        </div>
                    </div>
                    <div className="bg-white/10 px-3 py-1.5 rounded-xl text-[10px] font-bold text-white uppercase tracking-widest">
                        View
                    </div>
                </motion.button>

                {/* Bottom Spacer */}
                <div className="h-4" />
            </motion.main>

            <BottomNav items={wardenNavItems} />
        </MobileWrapper>
    );
}
