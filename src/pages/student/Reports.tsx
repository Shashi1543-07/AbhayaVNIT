import { useState, useEffect } from 'react';
import MobileWrapper from '../../components/layout/MobileWrapper';
import TopHeader from '../../components/layout/TopHeader';
import BottomNav from '../../components/layout/BottomNav';
import { incidentService, type Incident } from '../../services/incidentService';
import { useAuthStore } from '../../context/authStore';
import { useNavigate } from 'react-router-dom';
import { Plus, FileText, MapPin, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { containerStagger, cardVariant } from '../../lib/animations';




export default function Reports() {
    const { user } = useAuthStore();
    const navigate = useNavigate();
    const [reports, setReports] = useState<Incident[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedId, setSelectedId] = useState<string | null>(null);

    useEffect(() => {
        console.log('Reports: User state check:', user?.uid);
        if (!user) {
            console.log('Reports: No user, resetting state');
            setReports([]);
            setLoading(false);
            return;
        }

        console.log('Reports: Subscribing to incidents for uid:', user.uid);
        const unsubscribe = incidentService.subscribeToUserIncidents(user.uid, (fetchedReports) => {
            console.log('Reports: Fetched', fetchedReports.length, 'reports');
            setReports(fetchedReports);
            setLoading(false);
        });

        const timer = setTimeout(() => {
            console.log('Reports: Safe-timeout triggered, current state:', { loading, reportCount: reports.length });
            setLoading(false); // Forced end of loading state to debug empty views
        }, 5000);

        return () => {
            unsubscribe();
            clearTimeout(timer);
        };
    }, [user]);

    const formatDate = (date: any) => {
        if (!date) return 'Just now';
        if (date.seconds) return new Date(date.seconds * 1000).toLocaleDateString();
        return new Date(date).toLocaleDateString();
    };


    return (
        <MobileWrapper>
            <TopHeader title="My Reports" showBackButton={true} />

            <motion.main
                className="px-4 pt-28 pb-24"
                variants={containerStagger}
                animate="visible"
            >
                {/* Create New Button */}
                <motion.button
                    variants={cardVariant}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => navigate('/student/report')}
                    className="w-full glass-card border-2 border-dashed border-white/60 rounded-3xl p-6 flex items-center justify-center gap-3 text-indigo-600 font-black mb-8 hover:bg-white/40 transition-all shadow-lg shadow-indigo-500/5 group"
                >
                    <div className="bg-indigo-100 p-2 rounded-2xl group-hover:scale-110 transition-transform">
                        <Plus className="w-5 h-5" />
                    </div>
                    Report New Incident
                </motion.button>

                {/* Reports List */}
                <div className="space-y-4">
                    <h3 className="text-[10px] font-black text-slate-500 ml-1 uppercase tracking-[0.2em] mb-4">Past Reports history</h3>

                    {loading ? (
                        <div className="flex justify-center py-12">
                            <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
                        </div>
                    ) : reports.length === 0 ? (
                        <motion.div variants={cardVariant} className="text-center py-20 glass-card bg-white/20 rounded-3xl border border-white/40">
                            <FileText className="w-16 h-16 mx-auto mb-4 text-slate-400 opacity-20" />
                            <p className="text-slate-500 font-bold">No reports submitted yet.</p>
                            <p className="text-xs text-slate-400 mt-1">Your history will appear here.</p>
                        </motion.div>
                    ) : (
                        <div className="space-y-4 pb-40"> {/* pb-40 to clear bottom nav */}
                            {reports.map((report) => (
                                <motion.div
                                    key={report.id}
                                    variants={cardVariant}
                                    layout
                                    className={`glass-card backdrop-blur-2xl rounded-3xl p-5 shadow-soft border transition-all duration-500
                                        ${selectedId === report.id ? 'ring-2 ring-indigo-500/20 bg-white/50' : 'hover:bg-white/40'}
                                    `}
                                >
                                    <div
                                        onClick={() => setSelectedId(selectedId === report.id ? null : report.id)}
                                        className="cursor-pointer"
                                    >
                                        <div className="flex justify-between items-start mb-4 relative z-10">
                                            <div className="flex items-center gap-4">
                                                <div className="bg-gradient-to-br from-indigo-500 to-purple-600 p-3 rounded-2xl shadow-lg shadow-indigo-500/20">
                                                    <FileText className="w-5 h-5 text-white" />
                                                </div>
                                                <div className="min-w-0">
                                                    <h4 className="font-black text-slate-800 capitalize leading-tight truncate">
                                                        {report.category.replace('_', ' ')}
                                                    </h4>
                                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter mt-0.5">
                                                        ID: {report.id.slice(-6).toUpperCase()} • {formatDate(report.createdAt)}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className={`px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-widest border shrink-0
                                                ${report.status === 'open' ? 'bg-red-500/10 text-red-600 border-red-500/20' :
                                                    report.status === 'resolved' ? 'bg-green-500/10 text-green-600 border-green-500/20' :
                                                        'bg-amber-500/10 text-amber-600 border-amber-500/20'}
                                            `}>
                                                {report.status.replace('_', ' ')}
                                            </div>
                                        </div>

                                        {!selectedId || selectedId !== report.id ? (
                                            <p className="text-sm text-slate-500 font-medium line-clamp-1 pl-1 italic">
                                                {report.description}
                                            </p>
                                        ) : null}
                                    </div>

                                    {/* Expanded Content: Full Details */}
                                    <AnimatePresence>
                                        {selectedId === report.id && (
                                            <motion.div
                                                initial={{ opacity: 0, height: 0 }}
                                                animate={{ opacity: 1, height: 'auto' }}
                                                exit={{ opacity: 0, height: 0 }}
                                                className="overflow-hidden"
                                            >
                                                <div className="mt-6 space-y-6 pt-6 border-t border-white/40">
                                                    {/* Description */}
                                                    <div className="bg-white/40 rounded-2xl p-4 border border-white shadow-soft">
                                                        <h5 className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-2">Description</h5>
                                                        <p className="text-sm text-slate-700 font-bold leading-relaxed">{report.description}</p>
                                                    </div>

                                                    {/* Photo Evidence */}
                                                    {report.photoURL && (
                                                        <div className="bg-white/40 rounded-2xl p-4 border border-white shadow-soft">
                                                            <h5 className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-3">Photo Evidence</h5>
                                                            <img src={report.photoURL} alt="Evidence" className="w-full h-48 object-cover rounded-xl shadow-md" />
                                                        </div>
                                                    )}

                                                    {/* Detail Info */}
                                                    <div className="grid grid-cols-2 gap-3">
                                                        <DetailBox label="Location" value={typeof report.location === 'string' ? report.location : 'See Map'} icon={<MapPin size={12} />} />
                                                        <DetailBox label="Hostel" value={report.hostelId} icon={<MapPin size={12} />} />
                                                    </div>

                                                    {/* Timeline */}
                                                    <div className="bg-white/30 backdrop-blur-xl p-5 rounded-2xl border border-white shadow-soft">
                                                        <h5 className="text-xs font-black text-indigo-500 uppercase tracking-widest mb-6 flex items-center gap-2">
                                                            <Loader2 className="w-3.5 h-3.5" /> Activity evolution
                                                        </h5>
                                                        <div className="space-y-6 relative ml-1">
                                                            <div className="absolute left-[7px] top-2 bottom-2 w-0.5 bg-indigo-100" />
                                                            {report.timeline?.map((item, idx) => (
                                                                <div key={idx} className="relative pl-6">
                                                                    <div className="absolute left-[-4px] top-1.5 w-2 h-2 rounded-full bg-indigo-500 ring-4 ring-white shadow-sm" />
                                                                    <p className="text-xs font-black text-slate-800">{item.action}</p>
                                                                    {item.note && <p className="text-xs text-slate-600 mt-1 font-bold leading-relaxed">{item.note}</p>}
                                                                    <p className="text-[9px] font-bold text-slate-400 mt-2 uppercase opacity-70">
                                                                        {new Date(item.time).toLocaleString()}
                                                                    </p>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>

                                                    <button
                                                        onClick={() => setSelectedId(null)}
                                                        className="w-full py-3 bg-white/60 text-slate-500 font-black text-[10px] uppercase tracking-[0.2em] rounded-2xl border border-white shadow-sm hover:bg-white transition-all"
                                                    >
                                                        Collapse Details
                                                    </button>
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </motion.div>
                            ))}
                        </div>
                    )}
                </div>
            </motion.main>

            <BottomNav />
        </MobileWrapper>
    );
}

function DetailBox({ label, value, icon }: { label: string, value: string, icon: any }) {
    return (
        <div className="bg-white/40 p-3 rounded-2xl border border-white shadow-sm flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-indigo-100 text-indigo-600">{icon}</div>
            <div className="min-w-0">
                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">{label}</p>
                <p className="text-[10px] font-black text-slate-700 truncate">{value}</p>
            </div>
        </div>
    );
}
