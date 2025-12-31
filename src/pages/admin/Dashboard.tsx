import { useEffect, useState } from 'react';
import Layout from '../../components/Layout';
import SOSCard from '../../components/common/SOSCard';
import { sosService, type SOSEvent } from '../../services/sosService';
import { Users, UserPlus, FileText, Shield, UserCheck, UserX, Activity, Megaphone } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import ActiveWalksList from '../../components/security/ActiveWalksList';
import { collection, getCountFromServer, query, where, limit, getDocs, orderBy } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { motion } from 'framer-motion';
import { containerStagger, cardVariant } from '../../lib/animations';

export default function AdminDashboard() {
    const navigate = useNavigate();
    const [stats, setStats] = useState({
        totalStudents: 0,
        totalWardens: 0,
        totalSecurity: 0,
        activeUsers: 0,
        disabledUsers: 0
    });
    const [recentActivity, setRecentActivity] = useState<any[]>([]);
    const [activeSOS, setActiveSOS] = useState<SOSEvent[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = sosService.subscribeToActiveSOS((events) => {
            setActiveSOS(events);
        });
        return () => unsubscribe();
    }, []);

    useEffect(() => {
        const fetchData = async () => {
            try {
                // 1. Fetch Counts
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

                // 2. Fetch Recent Activity (Audit Logs)
                const logsQuery = query(collection(db, 'audit_logs'), orderBy('timestamp', 'desc'), limit(5));
                const logsSnap = await getDocs(logsQuery);
                setRecentActivity(logsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));

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
            <motion.div
                variants={containerStagger}
                initial="hidden"
                animate="visible"
                className="space-y-6"
            >
                <motion.div variants={cardVariant}>
                    <h1 className="text-2xl font-bold text-primary">Admin Dashboard</h1>
                    <p className="text-muted">Overview of campus safety system.</p>
                </motion.div>

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

                {/* Quick Actions */}
                <motion.div variants={cardVariant} className="glass-card p-5 rounded-xl shadow-sm border border-white/40">
                    <h3 className="text-lg font-bold text-primary mb-4 flex items-center gap-2">
                        <Activity className="w-5 h-5 text-primary" />
                        Quick Actions
                    </h3>
                    <div className="grid grid-cols-2 gap-3">
                        <Link to="/admin/users" className="flex flex-col items-center justify-center p-3 rounded-lg border border-surface hover:bg-surface transition-all">
                            <div className="bg-primary-50 p-2 rounded-full text-primary mb-1">
                                <UserPlus className="w-5 h-5" />
                            </div>
                            <span className="text-xs font-medium text-slate-700">Add User</span>
                        </Link>

                        <Link to="/admin/broadcasts" className="flex flex-col items-center justify-center p-3 rounded-lg border border-surface hover:bg-surface transition-all">
                            <div className="bg-warning-50 p-2 rounded-full text-warning mb-1">
                                <Megaphone className="w-5 h-5" />
                            </div>
                            <span className="text-xs font-medium text-slate-700">Broadcast</span>
                        </Link>
                    </div>
                </motion.div>

                {/* Recent Activity Log */}
                <motion.div variants={cardVariant} className="glass-card p-5 rounded-xl shadow-sm border border-white/40">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-bold text-primary flex items-center gap-2">
                            <FileText className="w-5 h-5 text-primary" />
                            Recent Activity
                        </h3>
                        <Link to="/admin/logs" className="text-xs text-primary font-medium">View All</Link>
                    </div>

                    <div className="space-y-3">
                        {loading ? (
                            <p className="text-slate-500 text-center py-4 text-sm">Loading...</p>
                        ) : recentActivity.length === 0 ? (
                            <p className="text-slate-500 text-center py-4 text-sm">No recent activity.</p>
                        ) : (
                            recentActivity.map(log => (
                                <div key={log.id} className="flex items-start gap-3 p-2 rounded-lg border-b border-slate-50 last:border-0">
                                    <div className="w-1.5 h-1.5 mt-1.5 rounded-full bg-indigo-400 flex-shrink-0" />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-slate-800 truncate">
                                            {log.action}
                                        </p>
                                        <p className="text-xs text-slate-500 truncate">{log.details}</p>
                                    </div>
                                    <span className="text-[10px] text-slate-400 whitespace-nowrap">
                                        {log.timestamp?.seconds ? new Date(log.timestamp.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Now'}
                                    </span>
                                </div>
                            ))
                        )}
                    </div>
                </motion.div>
            </motion.div>
        </Layout>
    );
}
