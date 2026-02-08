import { useEffect, useState } from 'react';
import { collection, query, where, onSnapshot, limit } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { sosService, type SOSEvent } from '../../services/sosService';
import { useAuthStore } from '../../context/authStore';
import MobileWrapper from '../../components/layout/MobileWrapper';
import TopHeader from '../../components/layout/TopHeader';
import BottomNav from '../../components/layout/BottomNav';
import SOSCard from '../../components/common/SOSCard';
import ActiveWalksList from '../../components/security/ActiveWalksList';
import { Siren, PhoneMissed, X, Megaphone } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { containerStagger, cardVariant } from '../../lib/animations';
import { useNavigate } from 'react-router-dom';
import BroadcastViewer from '../../components/shared/BroadcastViewer';
import { useSirenStore } from '../../context/sirenStore';
import { securityNavItems } from '../../lib/navItems';

export default function SecurityDashboard() {
    const navigate = useNavigate();
    const { user, profile } = useAuthStore();
    const { isUnlocked, setUnlocked } = useSirenStore();
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

    const dismissNotification = (id: string) => {
        setNotifications(prev => prev.filter(n => n.id !== id));
    };

    return (
        <MobileWrapper>
            <TopHeader title={profile?.name ? `Officer: ${profile.name}` : profile?.username ? `Officer: ${profile.username}` : 'Security Control'} showBackButton={false} />

            <BroadcastViewer
                isOpen={showBroadcasts}
                onClose={() => setShowBroadcasts(false)}
                role="security"
            />

            <motion.main
                className="px-4 pt-nav-safe pb-nav-safe space-y-4"
                variants={containerStagger}
                initial="hidden"
                animate="visible"
            >
                {/* Notifications */}
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

                {/* Visual Alert Status */}
                <motion.div
                    variants={cardVariant}
                    onClick={() => !isUnlocked && setUnlocked(true)}
                    className={`glass rounded-3xl p-5 border flex items-center justify-between mb-4 transition-all duration-500 cursor-pointer
                        ${!isUnlocked ? 'border-amber-500/30 bg-amber-500/5' : 'border-white/10 hover:bg-white/5'}
                    `}
                >
                    <div className="flex items-center gap-4">
                        <div className={`p-3 rounded-2xl border transition-all duration-500 ${!isUnlocked ? 'bg-amber-500/20 border-amber-500/30 text-amber-500' : 'bg-[#D4AF37]/10 border-[#D4AF37]/20 text-[#D4AF37]'}`}>
                            <Siren className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 className="font-black text-white text-sm uppercase tracking-tighter">
                                {!isUnlocked ? 'Security System Standby' : 'Incident Alert System'}
                            </h3>
                            <p className="text-[10px] text-zinc-500 font-bold uppercase">
                                {!isUnlocked ? 'Click here to arm sirens' : (activeEvents.length > 0 ? `${activeEvents.length} Active Emergencies` : 'All emergencies recognized')}
                            </p>
                        </div>
                    </div>
                    <div className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-500 border
                        ${!isUnlocked ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' :
                            activeEvents.some(e => !e.status.recognised) ? 'bg-red-500/10 text-red-500 border-red-500/20 animate-pulse font-bold' :
                                'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'}
                    `}>
                        {!isUnlocked ? 'Disarmed' : activeEvents.some(e => !e.status.recognised) ? 'Siren Triggered' : 'Armed'}
                    </div>
                </motion.div>

                {/* Active SOS Cards */}
                <div className="space-y-4">
                    <AnimatePresence>
                        {activeEvents.map((event) => (
                            <motion.div
                                key={event.id}
                                layout
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.9 }}
                            >
                                <SOSCard
                                    event={event}
                                    role="security"
                                />
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>

                {/* Active Safe Walks Section */}
                <motion.div variants={cardVariant} className="mt-8">
                    <div className="flex justify-between items-center mb-4 px-2">
                        <h3 className="text-sm font-black text-[#D4AF37] uppercase tracking-widest">Active Safe Walks</h3>
                        <button onClick={() => navigate('/security/safe-walks')} className="text-[10px] font-black text-zinc-500 uppercase tracking-widest hover:text-[#D4AF37] transition-all">View All</button>
                    </div>
                    <ActiveWalksList
                        onSelectWalk={(walk) => navigate(`/security/safe-walk/${walk.id}`)}
                    />
                </motion.div>

                {/* Broadcast Action */}
                <motion.button
                    variants={cardVariant}
                    onClick={() => setShowBroadcasts(true)}
                    className="w-full bg-gradient-to-br from-[#CF9E1B] via-[#D4AF37] to-[#8B6E13] p-[1.5px] rounded-[24px] shadow-2xl active:scale-95 transition-all group mt-6"
                >
                    <div className="bg-black/80 backdrop-blur-2xl rounded-[22px] p-4 flex items-center justify-between border border-white/5">
                        <div className="flex items-center gap-3">
                            <div className="bg-[#D4AF37]/10 p-2.5 rounded-2xl border border-[#D4AF37]/20">
                                <Megaphone className="w-5 h-5 text-[#D4AF37]" />
                            </div>
                            <div className="text-left">
                                <h3 className="font-black text-white text-sm font-heading tracking-tight">Announcements</h3>
                                <p className="text-[10px] text-[#D4AF37] font-bold opacity-60">Send official alerts & notices</p>
                            </div>
                        </div>
                        <div className="bg-[#D4AF37] px-3 py-1.5 rounded-xl text-[10px] font-black text-black uppercase tracking-widest shadow-lg">
                            Manage
                        </div>
                    </div>
                </motion.button>
            </motion.main>

            <BottomNav items={securityNavItems} />
        </MobileWrapper>
    );
}
