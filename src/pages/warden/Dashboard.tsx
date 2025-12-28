import MobileWrapper from '../../components/layout/MobileWrapper';
import TopHeader from '../../components/layout/TopHeader';
import BottomNav from '../../components/layout/BottomNav';
import ActionCard from '../../components/ui/ActionCard';
import StatusBadge from '../../components/ui/StatusBadge';
import { useAuthStore } from '../../context/authStore';
import { Users, PhoneMissed, X } from 'lucide-react';
import WardenActiveSOS from '../../components/warden/WardenActiveSOS';
import ActiveWalksList from '../../components/security/ActiveWalksList';
import SafeWalkMap from '../../components/security/SafeWalkMap';
import { type SafeWalkSession } from '../../services/safeWalkService';
import { motion } from 'framer-motion';
import { containerStagger, cardVariant } from '../../lib/animations';
import { useEffect, useState } from 'react';
import { collection, query, where } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { wardenNavItems } from '../../lib/navItems';
import { doc, deleteDoc, onSnapshot, limit } from 'firebase/firestore';

import { useNavigate } from 'react-router-dom';

export default function WardenDashboard() {
    const navigate = useNavigate();
    const { profile, user } = useAuthStore();

    const wardenHostelId = profile?.hostelId || profile?.hostel || 'H6';
    const [selectedWalk, setSelectedWalk] = useState<SafeWalkSession | null>(null);
    const [notifications, setNotifications] = useState<any[]>([]);
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


    // Nav items imported from src/lib/navItems.ts

    return (
        <MobileWrapper>
            <TopHeader title={`Hostel ${wardenHostelId} Warden`} showBackButton={true} />

            <motion.main
                className="px-4 py-6 space-y-6 pb-20 pt-24"
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
                    <h3 className="text-sm font-bold text-primary mb-3 ml-1">Active Emergencies</h3>
                    <div className="glass-card-soft bg-surface/50 rounded-2xl overflow-hidden border-2 border-emergency">
                        <WardenActiveSOS hostelId={wardenHostelId} />
                    </div>
                </motion.div>

                {/* Active Safe Walks Section */}
                <motion.div variants={cardVariant}>
                    <h3 className="text-sm font-bold text-primary mb-3 ml-1">Active Safe Walks</h3>
                    <ActiveWalksList
                        hostelFilter={wardenHostelId}
                        onSelectWalk={(walk) => setSelectedWalk(walk)}
                    />
                </motion.div>

                {/* Map Modal */}
                {selectedWalk && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                        <div className="bg-white w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl">
                            <div className="p-4 border-b flex justify-between items-center">
                                <h3 className="font-bold text-lg">Live Tracking</h3>
                                <button
                                    onClick={() => setSelectedWalk(null)}
                                    className="text-muted hover:text-primary transition-colors"
                                >
                                    Close
                                </button>
                            </div>
                            <div className="h-[400px]"><SafeWalkMap walks={[selectedWalk]} /></div>
                            <div className="p-4 bg-primary-50">
                                <p className="font-bold">{selectedWalk.userName}</p>
                                <p className="text-sm text-muted">{selectedWalk.startLocation.name || 'Start'} → {selectedWalk.destination.name}</p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Recent Incidents Preview */}
                <motion.div variants={cardVariant}>
                    <div className="flex justify-between items-center mb-3 ml-1">
                        <h3 className="text-sm font-bold text-primary">Recent Incidents</h3>
                        <button className="text-xs text-primary font-medium">View All</button>
                    </div>
                    <div className="space-y-3">
                        <div className="glass-card-soft rounded-2xl p-4 flex justify-between items-center">
                            <div>
                                <p className="font-bold text-sm text-primary">Water Supply Issue</p>
                                <p className="text-xs text-muted">Room 204 • 2 hrs ago</p>
                            </div>
                            <StatusBadge status="warning" label="Pending" />
                        </div>
                        <div className="glass-card-soft rounded-2xl p-4 flex justify-between items-center">
                            <div>
                                <p className="font-bold text-sm text-primary">Late Entry Request</p>
                                <p className="text-xs text-muted">Priya Sharma • 5 hrs ago</p>
                            </div>
                            <StatusBadge status="success" label="Approved" />
                        </div>
                    </div>
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

            </motion.main>

            <BottomNav items={wardenNavItems} />
        </MobileWrapper>
    );
}
