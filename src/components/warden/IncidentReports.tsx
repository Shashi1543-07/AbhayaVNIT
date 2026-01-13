import { useEffect, useState } from 'react';
import { incidentService, type Incident } from '../../services/incidentService';
import { FileText } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface IncidentReportsProps {
    hostelId: string;
}

export default function IncidentReports({ hostelId }: IncidentReportsProps) {
    const navigate = useNavigate();
    const [incidents, setIncidents] = useState<Incident[]>([]);
    const [filter, setFilter] = useState('all');

    const formatIncidentDate = (date: any) => {
        if (!date) return 'Just now';
        if (date.seconds) return new Date(date.seconds * 1000).toLocaleDateString();
        return new Date(date).toLocaleDateString();
    };

    useEffect(() => {
        const unsubscribe = incidentService.subscribeToIncidents(hostelId, (data) => {
            setIncidents(data);
        });
        return () => unsubscribe();
    }, [hostelId]);

    const filteredIncidents = filter === 'all'
        ? incidents
        : incidents.filter(i => i.status === filter);

    return (
        <div className="flex flex-col h-[calc(100vh-140px)]">
            {/* Filter Header */}
            <div className="flex justify-between items-center mb-6">
                <h2 className="font-black text-2xl text-white font-heading uppercase tracking-tight">Records</h2>
                <div className="relative">
                    <select
                        className="bg-zinc-900 border border-zinc-800 text-zinc-400 text-xs font-black uppercase tracking-widest rounded-xl px-4 py-2 outline-none focus:border-[#D4AF37]/50 focus:text-[#D4AF37] transition-all"
                        value={filter}
                        onChange={(e) => setFilter(e.target.value)}
                    >
                        <option value="all">All Records</option>
                        <option value="open">Open</option>
                        <option value="in_review">In Review</option>
                        <option value="resolved">Resolved</option>
                    </select>
                </div>
            </div>

            {/* List Content */}
            <div className="flex-1 overflow-y-auto space-y-3 pb-24 pr-2 custom-scrollbar">
                {filteredIncidents.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-64 text-zinc-600">
                        <div className="w-16 h-16 rounded-full bg-zinc-900 flex items-center justify-center mb-4 border border-zinc-800">
                            <FileText className="w-8 h-8 opacity-50" />
                        </div>
                        <p className="text-sm font-bold uppercase tracking-widest">No Records Found</p>
                    </div>
                ) : (
                    filteredIncidents.map(incident => (
                        <div
                            key={incident.id}
                            onClick={() => navigate(`/warden/reports/${incident.id}`)}
                            className="group relative bg-zinc-900/50 hover:bg-zinc-900 border border-white/5 hover:border-[#D4AF37]/30 p-5 rounded-2xl cursor-pointer transition-all active:scale-[0.98]"
                        >
                            <div className="flex justify-between items-start mb-3">
                                <span className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border ${incident.status === 'open' ? 'bg-red-500/10 text-red-500 border-red-500/20' :
                                    incident.status === 'resolved' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' :
                                        'bg-amber-500/10 text-amber-500 border-amber-500/20'
                                    }`}>
                                    {incident.status.replace('_', ' ')}
                                </span>
                                <span className="text-[10px] font-bold text-zinc-500 font-heading tracking-wider">
                                    {formatIncidentDate(incident.createdAt)}
                                </span>
                            </div>

                            <h3 className="font-heading font-black text-zinc-200 text-lg mb-1 group-hover:text-[#D4AF37] transition-colors truncate">
                                {incident.category}
                            </h3>
                            <p className="text-xs text-zinc-500 font-medium line-clamp-2 leading-relaxed">
                                {incident.description}
                            </p>
                            <div className="mt-3 flex items-center gap-2">
                                <span className="text-[10px] font-bold text-zinc-600 uppercase tracking-wider">
                                    By {incident.reporterName || 'Student'}
                                </span>
                            </div>

                            {/* Chevron decoration */}
                            <div className="absolute right-5 bottom-5 opacity-0 group-hover:opacity-100 transition-opacity -translate-x-2 group-hover:translate-x-0">
                                <div className="w-1.5 h-1.5 border-t-2 border-r-2 border-[#D4AF37] rotate-45" />
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}

