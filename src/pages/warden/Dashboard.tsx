import MobileWrapper from '../../components/layout/MobileWrapper';
import TopHeader from '../../components/layout/TopHeader';
import BottomNav from '../../components/layout/BottomNav';
import ActionCard from '../../components/ui/ActionCard';
import StatusBadge from '../../components/ui/StatusBadge';
import { useAuthStore } from '../../context/authStore';
import { AlertTriangle, FileText, Megaphone, Users, Home } from 'lucide-react';
import WardenActiveSOS from '../../components/warden/WardenActiveSOS';
import ActiveWalksList from '../../components/security/ActiveWalksList';
import SafeWalkMap from '../../components/security/SafeWalkMap';
import { type SafeWalkSession } from '../../services/safeWalkService';
import { motion } from 'framer-motion';
import { containerStagger, cardVariant } from '../../lib/animations';
import { useEffect, useState } from 'react';
import { collection, query, where, getCountFromServer } from 'firebase/firestore';
import { db } from '../../lib/firebase';

export default function WardenDashboard() {
    const { profile } = useAuthStore();
    const wardenHostelId = profile?.hostelId || profile?.hostel || 'H6';
    const [selectedWalk, setSelectedWalk] = useState<SafeWalkSession | null>(null);
    const [stats, setStats] = useState({
        studentsPresent: 0,
        pendingReports: 0
    });

    useEffect(() => {
        const fetchStats = async () => {
            try {
                // Count students in this hostel
                const studentsQuery = query(
                    collection(db, 'users'),
                    where('role', '==', 'student'),
                    where('hostelId', '==', wardenHostelId)
                );
                const studentsSnapshot = await getCountFromServer(studentsQuery);

                // Count pending reports for this hostel
                let pendingReportsCount = 0;
                try {
                    const reportsQuery = query(
                        collection(db, 'reports'),
                        where('hostelId', '==', wardenHostelId),
                        where('status', '==', 'pending')
                    );
                    const reportsSnapshot = await getCountFromServer(reportsQuery);
                    pendingReportsCount = reportsSnapshot.data().count;
                } catch (e) {
                    console.log('Reports collection might not exist yet', e);
                }

                setStats({
                    studentsPresent: studentsSnapshot.data().count,
                    pendingReports: pendingReportsCount
                });
            } catch (error) {
                console.error('Error fetching warden stats:', error);
            }
        };
        fetchStats();
    }, [wardenHostelId]);

    const wardenNavItems = [
        { icon: Home, label: 'Dashboard', path: '/warden/dashboard' },
        { icon: AlertTriangle, label: 'SOS', path: '/warden/sos' },
        { icon: FileText, label: 'Reports', path: '/warden/reports' },
        { icon: Megaphone, label: 'Broadcast', path: '/warden/broadcasts' },
    ];

    return (
        <MobileWrapper>
            <TopHeader title={`Hostel ${wardenHostelId} Warden`} showBackButton={true} showProfile={true} />
            <motion.main
                className="px-4 py-6 space-y-6 pb-20"
                variants={containerStagger}
                initial="hidden"
                animate="visible"
            >
                {/* Active SOS Section */}
                <motion.div variants={cardVariant}>
                    <h3 className="text-sm font-bold text-primary mb-3 ml-1">Active Emergencies</h3>
                    <div className="glass-card-soft bg-surface/50 rounded-2xl overflow-hidden border-2 border-emergency">
                        <WardenActiveSOS />
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
                    />
                </motion.div>
            </motion.main>

            <BottomNav items={wardenNavItems} />
        </MobileWrapper>
    );
}
