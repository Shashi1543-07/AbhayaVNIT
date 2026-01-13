import { type SOSEvent } from '../../services/sosService';

import { useNavigate } from 'react-router-dom';

interface SOSCardProps {
    event: SOSEvent;
    role: 'security' | 'admin' | 'warden';
}

export default function SOSCard({ event, role }: SOSCardProps) {
    const navigate = useNavigate();

    // Determine the target route based on role
    const getDetailRoute = () => {
        switch (role) {
            case 'security': return `/security/sos/${event.id}`;
            case 'admin': return `/admin/sos/${event.id}`;
            case 'warden': return `/warden/sos/${event.id}`;
            default: return '#';
        }
    };

    return (
        <div className="mb-4">
            <div className="glass-card rounded-2xl border-l-4 border-emergency overflow-hidden shadow-md hover:shadow-lg transition-shadow">
                {/* Header Section */}
                <div className="p-4 bg-emergency-pulse border-b border-emergency/30 flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        <span className="relative flex h-3 w-3">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                        </span>
                        <h3 className="font-bold text-emergency">Active SOS</h3>
                    </div>
                    <span className="text-xs font-mono font-bold text-emergency bg-emergency-pulse/30 px-2 py-1 rounded-full">
                        {new Date(event.triggeredAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                </div>

                {/* Content Section */}
                <div className="p-4 bg-black/20">
                    <div className="flex justify-between items-start mb-3">
                        <div>
                            <p className="font-extrabold text-lg text-white font-heading tracking-tight leading-tight">{event.userName}</p>
                            <p className="text-[10px] text-[#D4AF37] font-black uppercase tracking-[0.2em] mt-1">
                                {event.hostelId || event.hostel || 'Unknown'} • {event.roomNo || 'Emergency Zone'}
                            </p>
                        </div>
                        {event.status.recognised && (
                            <span className={`px-2.5 py-1 text-[8px] font-black rounded-lg uppercase tracking-widest border shadow-sm ${event.status.resolved
                                ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                                : 'bg-amber-500/10 text-amber-500 border-amber-500/20'
                                }`}>
                                {event.status.resolved ? 'Secured' : 'In Progress'}
                            </span>
                        )}
                    </div>

                    <button
                        onClick={() => navigate(getDetailRoute())}
                        className="w-full mt-2 bg-gradient-to-br from-[#CF9E1B] via-[#D4AF37] to-[#8B6E13] text-black font-black py-3 rounded-2xl shadow-[0_4px_15px_rgba(212,175,55,0.2)] hover:opacity-90 active:scale-[0.97] transition-all text-[11px] uppercase tracking-[0.2em] border border-white/20"
                    >
                        Tactical Details
                    </button>
                </div>
            </div>
        </div>
    );
}
