import { useEffect, useState } from 'react';
import { incidentService, type Incident } from '../../services/incidentService';
import { FileText, Trash2, Loader2, Filter } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../context/authStore';

interface IncidentReportsProps {
    hostelId: string;
}

export default function IncidentReports({ hostelId }: IncidentReportsProps) {
    const navigate = useNavigate();
    const { user, profile } = useAuthStore();
    const [incidents, setIncidents] = useState<Incident[]>([]);
    const [filter, setFilter] = useState('all');
    const [deletingId, setDeletingId] = useState<string | null>(null);

    const formatIncidentDate = (date: any) => {
        if (!date) return 'Just now';
        return new Date(date.seconds ? date.seconds * 1000 : date).toLocaleDateString();
    };

    useEffect(() => {
        console.log('Warden: Subscribing to reports for hostel:', hostelId);
        const unsubscribe = incidentService.subscribeToIncidents(hostelId, (data) => {
            console.log('Warden: Success! Reports fetched:', data.length);
            setIncidents(data);
        });
        return () => unsubscribe();
    }, [hostelId]);

    const handleDelete = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        if (!user || !profile) return;
        if (!confirm('Permanently delete this resolved report from the system?')) return;

        setDeletingId(id);
        try {
            await incidentService.deleteIncident(id, user.uid, profile.role || 'warden');
        } catch (error: any) {
            console.error("Warden: Delete failed:", error);
            alert(error.message || "Failed to delete report.");
        } finally {
            setDeletingId(null);
        }
    };

    const filteredIncidents = filter === 'all'
        ? incidents
        : incidents.filter(i => i.status === filter);

    return (
        <div className="flex flex-col h-[calc(100vh-140px)]">
            <div className="flex justify-between items-center mb-6 px-1">
                <h2 className="font-black text-2xl text-white font-heading uppercase tracking-tight">Report Intel</h2>
                <div className="relative group">
                    <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#D4AF37] pointer-events-none" />
                    <select
                        className="bg-black/40 border border-white/10 text-zinc-400 text-[10px] font-black uppercase tracking-widest rounded-2xl pl-10 pr-4 py-2.5 outline-none focus:border-[#D4AF37]/50 focus:text-white transition-all appearance-none cursor-pointer"
                        value={filter}
                        onChange={(e) => setFilter(e.target.value)}
                    >
                        <option value="all">All Records</option>
                        <option value="open">Active Open</option>
                        <option value="in_review">In Review</option>
                        <option value="resolved">Resolved Case</option>
                    </select>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4 pb-24 pr-1 custom-scrollbar">
                {filteredIncidents.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-64 text-zinc-600 bg-white/5 rounded-[32px] border border-dashed border-white/5">
                        <FileText className="w-12 h-12 opacity-20 mb-4" />
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40">No intelligence found</p>
                    </div>
                ) : (
                    filteredIncidents.map(incident => (
                        <div
                            key={incident.id}
                            onClick={() => navigate(`/warden/reports/${incident.id}`)}
                            className="group relative glass hover:bg-white/5 border border-white/5 hover:border-[#D4AF37]/20 p-5 rounded-[28px] cursor-pointer transition-all active:scale-[0.98] shadow-xl overflow-hidden"
                        >
                            {/* Status Header */}
                            <div className="flex justify-between items-start mb-4">
                                <div className="flex items-center gap-2">
                                    <div className={`px-2.5 py-1 rounded-xl text-[9px] font-black uppercase tracking-widest border ${incident.status === 'open' ? 'bg-red-500/10 text-red-500 border-red-500/20' :
                                        incident.status === 'resolved' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' :
                                            'bg-amber-500/10 text-amber-500 border-amber-500/20'
                                        }`}>
                                        {incident.status.replace('_', ' ')}
                                    </div>

                                    {incident.status === 'resolved' && (
                                        <button
                                            onClick={(e) => handleDelete(e, incident.id)}
                                            disabled={deletingId === incident.id}
                                            className="p-1.5 rounded-xl bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500/20 transition-all active:scale-90"
                                            title="Permanently remove"
                                        >
                                            {deletingId === incident.id ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                                        </button>
                                    )}
                                </div>
                                <span className="text-[9px] font-black text-zinc-600 uppercase tracking-tighter">
                                    {formatIncidentDate(incident.createdAt)}
                                </span>
                            </div>

                            <h3 className="font-heading font-black text-white text-lg mb-1 group-hover:text-[#D4AF37] transition-colors truncate drop-shadow-sm">
                                {incident.category.replace('_', ' ')}
                            </h3>
                            <p className="text-xs text-zinc-500 font-bold line-clamp-2 leading-relaxed opacity-60 italic">
                                "{incident.description}"
                            </p>

                            <div className="mt-4 flex items-center justify-between">
                                <span className={`text-[9px] font-black uppercase tracking-[0.1em] px-2 py-0.5 rounded-md ${incident.isAnonymous ? 'bg-zinc-800 text-zinc-500' : 'bg-[#D4AF37]/10 text-[#D4AF37]'}`}>
                                    BY {incident.isAnonymous ? 'ANONYMOUS' : (incident.reporterName || 'STUDENT')}
                                    {!incident.isAnonymous && incident.studentUsername && ` (@${incident.studentUsername})`}
                                </span>
                                <span className="text-[9px] font-black text-zinc-700 uppercase tracking-widest">
                                    ID: {incident.id.slice(-6).toUpperCase()}
                                </span>
                            </div>

                            <div className="absolute right-0 top-0 bottom-0 w-1 bg-transparent group-hover:bg-[#D4AF37]/40 transition-all rounded-r-full" />
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
