import { useState, useEffect } from 'react';
import MobileWrapper from '../../components/layout/MobileWrapper';
import TopHeader from '../../components/layout/TopHeader';
import BottomNav from '../../components/layout/BottomNav';
import StatusBadge from '../../components/ui/StatusBadge';
import { incidentService, type Incident } from '../../services/incidentService';
import { useAuthStore } from '../../context/authStore';
import { useNavigate } from 'react-router-dom';
import { Plus, FileText, Calendar, MapPin, ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { containerStagger, cardVariant } from '../../lib/animations';


export default function Reports() {
    const { user } = useAuthStore();
    const navigate = useNavigate();
    const [reports, setReports] = useState<Incident[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user) return;

        const unsubscribe = incidentService.subscribeToUserIncidents(user.uid, (fetchedReports) => {
            setReports(fetchedReports);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [user]);

    const getStatusType = (status: string) => {
        switch (status) {
            case 'open': return 'warning';
            case 'in_progress': return 'neutral';
            case 'resolved': return 'success';
            default: return 'neutral';
        }
    };

    return (
        <MobileWrapper>
            <TopHeader title="My Reports" showBackButton={true} />

            <motion.main
                className="px-4 py-6 pb-20 min-h-screen bg-transparent"
                variants={containerStagger}
                initial="hidden"
                animate="visible"
            >
                {/* Create New Button */}
                <motion.button
                    variants={cardVariant}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => navigate('/student/report')}
                    className="w-full glass-card border-2 border-dashed border-white/60 rounded-2xl p-4 flex items-center justify-center gap-2 text-primary font-bold mb-6 hover:bg-white/40 transition-colors"
                >
                    <div className="bg-blue-100 p-1 rounded-full">
                        <Plus className="w-5 h-5" />
                    </div>
                    Report New Incident
                </motion.button>

                {/* Reports List */}
                <div className="space-y-4">
                    <h3 className="text-sm font-bold text-slate-800 ml-1">Recent History</h3>

                    {loading ? (
                        <div className="flex justify-center py-8">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                        </div>
                    ) : reports.length === 0 ? (
                        <motion.div variants={cardVariant} className="text-center py-10 text-slate-400">
                            <FileText className="w-12 h-12 mx-auto mb-3 opacity-20" />
                            <p>No reports submitted yet.</p>
                        </motion.div>
                    ) : (
                        reports.map((report) => (
                            <motion.div
                                key={report.id}
                                variants={cardVariant}
                                whileTap={{ scale: 0.98 }}
                                className="glass-card rounded-2xl p-4 shadow-soft active:scale-[0.98] transition-transform border border-white/40"
                            >
                                <div className="flex justify-between items-start mb-3">
                                    <div className="flex items-center gap-3">
                                        <div className="bg-slate-100 p-2 rounded-full">
                                            <FileText className="w-5 h-5 text-slate-600" />
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-slate-800 capitalize">{report.category.replace('_', ' ')}</h4>
                                            <p className="text-xs text-slate-500 line-clamp-1">{report.description}</p>
                                        </div>
                                    </div>
                                    <StatusBadge status={getStatusType(report.status)} label={report.status.replace('_', ' ')} />
                                </div>

                                <div className="flex items-center justify-between text-xs text-slate-400 pt-3 border-t border-slate-50">
                                    <div className="flex gap-3">
                                        <span className="flex items-center gap-1">
                                            <Calendar className="w-3 h-3" />
                                            {new Date(report.createdAt).toLocaleDateString()}
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <MapPin className="w-3 h-3" />
                                            View Map
                                        </span>
                                    </div>
                                    <ChevronRight className="w-4 h-4" />
                                </div>
                            </motion.div>
                        ))
                    )}
                </div>
            </motion.main>

            <BottomNav />
        </MobileWrapper>
    );
}
