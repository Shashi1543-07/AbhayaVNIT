import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import MobileWrapper from '../../components/layout/MobileWrapper';
import SOSCard from '../../components/common/SOSCard';
import TopHeader from '../../components/layout/TopHeader';
import BottomNav from '../../components/layout/BottomNav';
import { sosService, type SOSEvent } from '../../services/sosService';
import { db } from '../../lib/firebase';
import { collection, query, where, onSnapshot, limit, deleteDoc, doc } from 'firebase/firestore';
import { Shield, PhoneMissed, X, Newspaper } from 'lucide-react';
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
                        <div className="glass-card bg-success/10 rounded-2xl p-4 border border-success/30 flex items-center gap-3">
                            <div className="bg-success/20 p-2 rounded-full">
                                <Shield className="text-success w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="font-bold text-primary">All Clear</h3>
                                <p className="text-xs text-muted">No active emergencies reported.</p>
                            </div>
                        </div>
                    </motion.div>
                )}

                {/* Active Safe Walks */}
                <motion.div variants={cardVariant} className="p-4 space-y-3">
                    <div className="flex justify-between items-center">
                        <h3 className="font-bold text-primary">Active Safe Walks</h3>
                        <button
                            onClick={() => window.location.href = '/security/safe-walks'}
                            className="text-muted hover:text-primary transition-colors"
                        >
                            View All
                        </button>
                    </div>
                    <ActiveWalksList
                        onSelectWalk={(walk) => navigate(`/security/safe-walk/${walk.id}`)}
                    />
                </motion.div>

                {/* Call Support Section */}
                <motion.div variants={cardVariant} className="p-4">
                    <h3 className="text-sm font-bold text-primary mb-3 ml-1">Communication</h3>
                    <div className="grid grid-cols-3 lg:grid-cols-6 gap-3">
                        <button
                            onClick={() => {
                                // Security can call any online warden
                                alert("Routing call to Warden on duty...");
                            }}
                            className="glass-card-soft rounded-2xl p-4 flex flex-col items-center gap-2 border border-secondary/10 active:scale-95 transition-all"
                        >
                            <div className="w-10 h-10 bg-secondary/10 rounded-full flex items-center justify-center">
                                <Shield className="w-5 h-5 text-secondary" />
                            </div>
                            <span className="text-[10px] font-bold uppercase text-secondary">Contact Warden</span>
                        </button>
                        <button
                            onClick={() => {
                                alert("Connecting to Control Room...");
                            }}
                            className="glass-card-soft rounded-2xl p-4 flex flex-col items-center gap-2 border border-primary/10 active:scale-95 transition-all"
                        >
                            <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                                <Shield className="w-5 h-5 text-primary" />
                            </div>
                            <span className="text-[10px] font-bold uppercase text-primary">Dispatch</span>
                        </button>
                        <button
                            onClick={() => navigate('/feed')}
                            className="glass-card-soft rounded-2xl p-4 flex flex-col items-center gap-2 border border-blue-500/10 active:scale-95 transition-all"
                        >
                            <div className="w-10 h-10 bg-blue-50 rounded-full flex items-center justify-center">
                                <Newspaper className="w-5 h-5 text-blue-500" />
                            </div>
                            <span className="text-[10px] font-bold uppercase text-blue-500">Campus Feed</span>
                        </button>
                    </div>
                </motion.div>

                {/* Bottom Spacer */}
                <div className="h-4" />

                {/* Admin Broadcast Button - Moved to Bottom */}
                <div className="px-4 mb-4">
                    <motion.button
                        variants={cardVariant}
                        onClick={() => setShowBroadcasts(true)}
                        className="w-full bg-gradient-to-r from-[#FF99AC] via-[#C084FC] to-[#89CFF0] p-1 rounded-2xl shadow-lg active:scale-95 transition-all"
                    >
                        <div className="bg-white/20 backdrop-blur-sm rounded-xl p-4 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="bg-white/30 p-2 rounded-full">
                                    <Megaphone className="w-5 h-5 text-white" />
                                </div>
                                <div className="text-left">
                                    <h3 className="font-bold text-white text-sm">Priority Broadcasts</h3>
                                    <p className="text-xs text-white/90">View admin alerts</p>
                                </div>
                            </div>
                            <div className="bg-white/30 px-3 py-1 rounded-full text-xs font-bold text-white">
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
