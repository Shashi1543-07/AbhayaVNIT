import { useEffect, useState } from 'react';
import Layout from '../../components/Layout';
import SOSCard from '../../components/common/SOSCard';
import { sosService, type SOSEvent } from '../../services/sosService';
import { Users, Shield, UserCheck, UserX, Activity, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import ActiveWalksList from '../../components/security/ActiveWalksList';
import { collection, getCountFromServer, query, where, limit, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { motion } from 'framer-motion';
import { containerStagger, cardVariant } from '../../lib/animations';
import TopHeader from '../../components/layout/TopHeader';
import type { Incident } from '../../services/incidentService';
import StatusBadge from '../../components/ui/StatusBadge';

export default function AdminDashboard() {
    const navigate = useNavigate();
    const [stats, setStats] = useState({
        totalStudents: 0,
        totalWardens: 0,
        totalSecurity: 0,
        activeUsers: 0,
        disabledUsers: 0
    });
    const [incidents, setIncidents] = useState<Incident[]>([]);
    const [activeSOS, setActiveSOS] = useState<SOSEvent[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = sosService.subscribeToActiveSOS((events) => {
            setActiveSOS(events);
        });
        return () => unsubscribe();
    }, []);

    // Incidents Subscription
    useEffect(() => {
        const q = query(
            collection(db, 'incidents'),
            orderBy('createdAt', 'desc'),
            limit(5)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as Incident[];
            setIncidents(data);
        });

        return () => unsubscribe();
    }, []);

    useEffect(() => {
        const fetchData = async () => {
            try {
                // Fetch Counts
                const usersColl = collection(db, 'users');

                const studentSnap = await getCountFromServer(query(usersColl, where('role', '==', 'student')));
                const wardenSnap = await getCountFromServer(query(usersColl, where('role', '==', 'warden')));
                const securitySnap = await getCountFromServer(query(usersColl, where('role', '==', 'security')));
                const activeSnap = await getCountFromServer(query(usersColl, where('status', '==', 'active')));
                const disabledSnap = await getCountFromServer(query(usersColl, where('status', '==', 'disabled')));

                setStats({
                    totalStudents: studentSnap.data().count,
                    totalWardens: wardenSnap.data().count,
                    totalSecurity: securitySnap.data().count,
                    activeUsers: activeSnap.data().count,
                    disabledUsers: disabledSnap.data().count
                });
            } catch (error) {
                console.error("Error fetching dashboard data:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    return (
        <Layout role="admin">
            <TopHeader title="Admin Dashboard" showBackButton={false} />

            <motion.div
                variants={containerStagger}
                initial="hidden"
                animate="visible"
                className="space-y-6 pt-16"
            >
                {/* Stats Grid - Responsive */}
                <div className="grid grid-cols-2 gap-3">
                    <motion.div variants={cardVariant} className="glass-card p-4 rounded-xl shadow-soft border border-white/40">
                        <div className="bg-primary-50 w-10 h-10 rounded-lg flex items-center justify-center text-primary mb-2">
                            <Users className="w-5 h-5" />
                        </div>
                        <p className="text-2xl font-bold text-gray-800">{loading ? '...' : stats.totalStudents}</p>
                        <p className="text-xs text-slate-500 font-medium">Students</p>
                    </motion.div>

                    <motion.div variants={cardVariant} className="glass-card p-4 rounded-xl shadow-soft border border-white/40">
                        <div className="bg-success-50 w-10 h-10 rounded-lg flex items-center justify-center text-success mb-2">
                            <UserCheck className="w-5 h-5" />
                        </div>
                        <p className="text-2xl font-bold text-gray-800">{loading ? '...' : stats.totalWardens}</p>
                        <p className="text-xs text-slate-500 font-medium">Wardens</p>
                    </motion.div>

                    <motion.div variants={cardVariant} className="glass-card p-4 rounded-xl shadow-soft border border-white/40">
                        <div className="bg-warning-50 w-10 h-10 rounded-lg flex items-center justify-center text-warning mb-2">
                            <Shield className="w-5 h-5" />
                        </div>
                        <p className="text-2xl font-bold text-gray-800">{loading ? '...' : stats.totalSecurity}</p>
                        <p className="text-xs text-slate-500 font-medium">Security</p>
                    </motion.div>

                    <motion.div variants={cardVariant} className="glass-card p-4 rounded-xl shadow-soft border border-white/40">
                        <div className="bg-emergency-50 w-10 h-10 rounded-lg flex items-center justify-center text-emergency mb-2">
                            <UserX className="w-5 h-5" />
                        </div>
                        <p className="text-2xl font-bold text-gray-800">{loading ? '...' : stats.disabledUsers}</p>
                        <p className="text-xs text-slate-500 font-medium">Disabled</p>
                    </motion.div>
                </div>

                {/* Live SOS Alerts */}
                <motion.div variants={cardVariant} className="glass-card p-5 rounded-xl shadow-sm border border-red-100/50">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-bold text-red-600 flex items-center gap-2">
                            <Shield className="w-5 h-5 animate-pulse" />
                            Live Monitor
                        </h3>
                    </div>

                    {activeSOS.length === 0 ? (
                        <div className="text-center py-6 bg-white/50 rounded-lg border border-white/60">
                            <Shield className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                            <p className="text-sm text-slate-500">No active emergencies.</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {activeSOS.map(sos => (
                                <SOSCard key={sos.id} event={sos} role="admin" />
                            ))}
                        </div>
                    )}
                </motion.div>

                {/* Live Safe Walk Monitor */}
                <motion.div variants={cardVariant} className="glass-card p-5 rounded-xl shadow-sm border border-white/40">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-bold text-primary flex items-center gap-2">
                            <Activity className="w-5 h-5 text-primary" />
                            Active Safe Walks
                        </h3>
                    </div>
                    <ActiveWalksList
                        onSelectWalk={(walk) => navigate(`/admin/safe-walk/${walk.id}`)}
                    />
                </motion.div>

                {/* Live Recent Incidents */}
                <motion.div variants={cardVariant} className="glass-card p-5 rounded-xl shadow-sm border border-white/40">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-bold text-primary flex items-center gap-2">
                            <Activity className="w-5 h-5 text-primary" />
                            Recent Incidents
                        </h3>
                    </div>

                    <div className="space-y-3">
                        {loading ? (
                            <p className="text-slate-500 text-center py-4 text-sm">Loading...</p>
                        ) : incidents.length === 0 ? (
                            <p className="text-slate-500 text-center py-4 text-sm">No recent incidents.</p>
                        ) : (
                            incidents.map(incident => (
                                <div key={incident.id} className="glass-card-soft rounded-2xl p-4 flex justify-between items-center">
                                    <div>
                                        <p className="font-bold text-sm text-primary">{incident.category}</p>
                                        <p className="text-xs text-muted">
                                            {incident.reporterName || 'Unknown'} • {incident.createdAt?.seconds ? new Date(incident.createdAt.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now'}
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
            </motion.div>
        </Layout>
    );
}
