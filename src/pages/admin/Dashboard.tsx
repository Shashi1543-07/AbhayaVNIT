import { useEffect, useState } from 'react';
import MobileWrapper from '../../components/layout/MobileWrapper';
import BottomNav from '../../components/layout/BottomNav';
import { adminNavItems } from '../../lib/navItems';
import SOSCard from '../../components/common/SOSCard';
import { sosService, type SOSEvent } from '../../services/sosService';
import { Users, Shield, UserCheck, UserX, Activity } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import ActiveWalksList from '../../components/security/ActiveWalksList';
import { collection, getCountFromServer, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { motion } from 'framer-motion';
import { containerStagger, cardVariant } from '../../lib/animations';
import TopHeader from '../../components/layout/TopHeader';

export default function AdminDashboard() {
    const navigate = useNavigate();
    const [stats, setStats] = useState({
        totalStudents: 0,
        totalWardens: 0,
        totalSecurity: 0,
        activeUsers: 0,
        disabledUsers: 0
    });
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
        <MobileWrapper>
            <TopHeader title="Admin Control" showBackButton={false} />

            <motion.main
                className="px-4 pt-nav-safe pb-nav-safe space-y-6"
                variants={containerStagger}
                initial="hidden"
                animate="visible"
            >
                {/* Stats Grid - Premium Layout */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <motion.div variants={cardVariant} onClick={() => navigate('/admin/users')} className="glass-card bg-black/40 p-5 rounded-[24px] shadow-lg border border-white/10 cursor-pointer hover:border-[#D4AF37]/40 transition-all group active:scale-[0.98]">
                        <div className="bg-[#D4AF37]/10 w-12 h-12 rounded-2xl flex items-center justify-center text-[#D4AF37] mb-3 border border-[#D4AF37]/20 group-hover:bg-[#D4AF37]/20 transition-colors">
                            <Users className="w-6 h-6" />
                        </div>
                        <p className="text-3xl font-black text-white font-heading">{loading ? '...' : stats.totalStudents}</p>
                        <p className="text-[10px] text-zinc-500 font-black uppercase tracking-[0.2em] mt-1 group-hover:text-[#D4AF37] transition-colors">Students</p>
                    </motion.div>

                    <motion.div variants={cardVariant} onClick={() => navigate('/admin/users')} className="glass-card bg-black/40 p-5 rounded-[24px] shadow-lg border border-white/10 cursor-pointer hover:border-[#D4AF37]/40 transition-all group active:scale-[0.98]">
                        <div className="bg-emerald-500/10 w-12 h-12 rounded-2xl flex items-center justify-center text-emerald-500 mb-3 border border-emerald-500/20 group-hover:bg-emerald-500/20 transition-colors">
                            <UserCheck className="w-6 h-6" />
                        </div>
                        <p className="text-3xl font-black text-white font-heading">{loading ? '...' : stats.totalWardens}</p>
                        <p className="text-[10px] text-zinc-500 font-black uppercase tracking-[0.2em] mt-1 group-hover:text-emerald-500 transition-colors">Wardens</p>
                    </motion.div>

                    <motion.div variants={cardVariant} onClick={() => navigate('/admin/users')} className="glass-card bg-black/40 p-5 rounded-[24px] shadow-lg border border-white/10 cursor-pointer hover:border-[#D4AF37]/40 transition-all group active:scale-[0.98]">
                        <div className="bg-blue-500/10 w-12 h-12 rounded-2xl flex items-center justify-center text-blue-500 mb-3 border border-blue-500/20 group-hover:bg-blue-500/20 transition-colors">
                            <Shield className="w-6 h-6" />
                        </div>
                        <p className="text-3xl font-black text-white font-heading">{loading ? '...' : stats.totalSecurity}</p>
                        <p className="text-[10px] text-zinc-500 font-black uppercase tracking-[0.2em] mt-1 group-hover:text-blue-500 transition-colors">Security</p>
                    </motion.div>

                    <motion.div variants={cardVariant} className="glass-card bg-black/40 p-5 rounded-[24px] shadow-lg border border-white/10 group">
                        <div className="bg-red-500/10 w-12 h-12 rounded-2xl flex items-center justify-center text-red-500 mb-3 border border-red-500/20">
                            <UserX className="w-6 h-6" />
                        </div>
                        <p className="text-3xl font-black text-white font-heading">{loading ? '...' : stats.disabledUsers}</p>
                        <p className="text-[10px] text-zinc-500 font-black uppercase tracking-[0.2em] mt-1">Disabled</p>
                    </motion.div>
                </div>

                {/* Live SOS Alerts */}
                <motion.div variants={cardVariant} className="glass-card bg-black/40 p-6 rounded-[32px] shadow-2xl border border-red-500/20 relative overflow-hidden">
                    <div className="flex justify-between items-center mb-6 relative z-10">
                        <h3 className="text-xs font-black text-red-500 flex items-center gap-2 uppercase tracking-[0.2em] font-heading">
                            <Shield className="w-5 h-5 animate-pulse" />
                            Emergency Live Monitor
                        </h3>
                        <div className="px-3 py-1 bg-red-500/10 rounded-full border border-red-500/20 text-[8px] font-black text-red-500 uppercase tracking-widest">Real-time</div>
                    </div>

                    {activeSOS.length === 0 ? (
                        <div className="text-center py-12 bg-white/5 rounded-3xl border border-white/5 relative z-10">
                            <Shield className="w-12 h-12 text-zinc-700 mx-auto mb-4 opacity-30" />
                            <p className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.3em]">System clear • No active emergencies</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 relative z-10">
                            {activeSOS.map(sos => (
                                <SOSCard key={sos.id} event={sos} role="admin" />
                            ))}
                        </div>
                    )}
                    {/* Background glow */}
                    <div className="absolute -top-20 -right-20 w-40 h-40 bg-red-500/5 rounded-full blur-[100px] z-0"></div>
                </motion.div>

                {/* Live Safe Walk Monitor */}
                <motion.div variants={cardVariant} className="glass-card bg-black/40 p-6 rounded-[32px] shadow-2xl border border-white/10">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-xs font-black text-[#D4AF37] flex items-center gap-3 uppercase tracking-[0.2em] font-heading">
                            <Activity className="w-5 h-5 text-[#D4AF37]" strokeWidth={3} />
                            Tactical Safe Walks
                        </h3>
                    </div>
                    <ActiveWalksList
                        onSelectWalk={(walk) => navigate(`/admin/safe-walk/${walk.id}`)}
                    />
                </motion.div>
            </motion.main>

            <BottomNav items={adminNavItems} />
        </MobileWrapper>
    );
}
