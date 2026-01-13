import { useState, useEffect } from 'react';
import MobileWrapper from '../../components/layout/MobileWrapper';
import TopHeader from '../../components/layout/TopHeader';
import BottomNav from '../../components/layout/BottomNav';
import { incidentService, type Incident } from '../../services/incidentService';
import { useAuthStore } from '../../context/authStore';
import { useNavigate } from 'react-router-dom';
import { Plus, FileText, MapPin, Loader2, Activity } from 'lucide-react';
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
                className="px-4 pt-nav-safe pb-nav-safe"
                variants={containerStagger}
                animate="visible"
            >
                {/* Create New Button */}
                <motion.button
                    variants={cardVariant}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => navigate('/student/report')}
                    className="w-full glass border-2 border-dashed border-[#D4AF37]/40 rounded-[32px] p-6 flex items-center justify-center gap-4 text-[#D4AF37] font-black mb-10 hover:bg-white/5 transition-all shadow-2xl font-heading tracking-tight group"
                >
                    <div className="bg-[#D4AF37]/10 p-3 rounded-2xl group-hover:scale-110 transition-transform border border-[#D4AF37]/20">
                        <Plus className="w-6 h-6" />
                    </div>
                    Report New Incident
                </motion.button>

                {/* Reports List */}
                <div className="space-y-6">
                    <h3 className="text-[10px] font-black text-[#D4AF37]/60 ml-2 uppercase tracking-[0.2em] mb-4 font-heading">Past report history</h3>

                    {loading ? (
                        <div className="flex justify-center py-12">
                            <Loader2 className="w-8 h-8 animate-spin text-[#D4AF37]" />
                        </div>
                    ) : reports.length === 0 ? (
                        <motion.div variants={cardVariant} className="text-center py-20 glass rounded-3xl border border-white/5">
                            <FileText className="w-16 h-16 mx-auto mb-4 text-[#D4AF37] opacity-20" />
                            <p className="text-white font-black uppercase tracking-widest text-xs">No reports submitted yet.</p>
                            <p className="text-[10px] text-zinc-500 mt-2 font-bold">Your history will appear here.</p>
                        </motion.div>
                    ) : (
                        <div className="space-y-4 pb-40"> {/* pb-40 to clear bottom nav */}
                            {reports.map((report) => (
                                <motion.div
                                    key={report.id}
                                    variants={cardVariant}
                                    layout
                                    className={`glass rounded-3xl p-5 shadow-2xl border transition-all duration-500
                                        ${selectedId === report.id ? 'border-[#D4AF37]/40 bg-black/40' : 'border-white/5 hover:bg-white/5'}
                                    `}
                                >
                                    <div
                                        onClick={() => setSelectedId(selectedId === report.id ? null : report.id)}
                                        className="cursor-pointer"
                                    >
                                        <div className="flex justify-between items-start mb-4 relative z-10">
                                            <div className="flex items-center gap-4">
                                                <div className="bg-gradient-to-br from-[#CF9E1B] via-[#D4AF37] to-[#8B6E13] p-3 rounded-2xl shadow-lg border border-white/10">
                                                    <FileText className="w-6 h-6 text-black" />
                                                </div>
                                                <div className="min-w-0">
                                                    <h4 className="font-black text-white capitalize leading-tight truncate font-heading text-base drop-shadow-sm">
                                                        {report.category.replace('_', ' ')}
                                                    </h4>
                                                    <p className="text-[10px] font-black text-[#D4AF37] uppercase tracking-widest mt-0.5 font-heading">
                                                        #{report.id.slice(-6).toUpperCase()} • {formatDate(report.createdAt)}
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
                                            <p className="text-sm text-zinc-500 font-bold line-clamp-1 pl-1 italic opacity-60">
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
                                                <div className="mt-6 space-y-6 pt-6 border-t border-white/5">
                                                    {/* Description */}
                                                    <div className="bg-black/40 rounded-2xl p-4 border border-white/5 shadow-inner">
                                                        <h5 className="text-[10px] font-black text-[#D4AF37] uppercase tracking-widest mb-2 font-heading">Description</h5>
                                                        <p className="text-sm text-white font-bold leading-relaxed">{report.description}</p>
                                                    </div>

                                                    {/* Photo Evidence */}
                                                    {report.photoURL && (
                                                        <div className="bg-black/40 rounded-2xl p-4 border border-white/5 shadow-inner">
                                                            <h5 className="text-[10px] font-black text-[#D4AF37] uppercase tracking-widest mb-3 font-heading">Visual Evidence</h5>
                                                            <img src={report.photoURL} alt="Evidence" className="w-full h-48 object-cover rounded-xl shadow-2xl border border-white/5" />
                                                        </div>
                                                    )}

                                                    {/* Detail Info */}
                                                    <div className="grid grid-cols-2 gap-3">
                                                        <DetailBox label="Location" value={typeof report.location === 'string' ? report.location : 'See Map'} icon={<MapPin size={12} />} />
                                                        <DetailBox label="Hostel" value={report.hostelId} icon={<MapPin size={12} />} />
                                                    </div>

                                                    {/* Timeline */}
                                                    <div className="bg-black/40 p-5 rounded-2xl border border-white/5 shadow-inner">
                                                        <h5 className="text-[10px] font-black text-[#D4AF37] uppercase tracking-widest mb-6 flex items-center gap-2 font-heading">
                                                            <Activity className="w-3.5 h-3.5" /> Activity Evolution
                                                        </h5>
                                                        <div className="space-y-6 relative ml-1">
                                                            <div className="absolute left-[7px] top-2 bottom-2 w-0.5 bg-white/5" />
                                                            {report.timeline?.map((item, idx) => (
                                                                <div key={idx} className="relative pl-6">
                                                                    <div className="absolute left-[-4px] top-1.5 w-2 h-2 rounded-full bg-[#D4AF37] shadow-[0_0_8px_rgba(212,175,55,0.5)] border border-black" />
                                                                    <p className="text-xs font-black text-white font-heading">{item.action}</p>
                                                                    {item.note && <p className="text-xs text-zinc-500 mt-1 font-bold leading-relaxed">{item.note}</p>}
                                                                    <p className="text-[9px] font-black text-zinc-600 mt-2 uppercase tracking-tighter">
                                                                        {new Date(item.time).toLocaleString()}
                                                                    </p>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>

                                                    <button
                                                        onClick={() => setSelectedId(null)}
                                                        className="w-full py-4 bg-white/5 text-[#D4AF37] font-black text-[10px] uppercase tracking-[0.2em] rounded-2xl border border-white/10 shadow-lg hover:bg-white/10 transition-all font-heading"
                                                    >
                                                        Collapse Intel
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
        <div className="bg-black/40 p-3 rounded-2xl border border-white/5 shadow-inner flex items-center gap-3">
            <div className="p-2 rounded-xl bg-[#D4AF37]/10 text-[#D4AF37] border border-[#D4AF37]/20">{icon}</div>
            <div className="min-w-0">
                <p className="text-[9px] font-black text-zinc-500 uppercase tracking-widest font-heading">{label}</p>
                <p className="text-xs font-black text-white truncate font-heading">{value}</p>
            </div>
        </div>
    );
}
