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
                <div className="p-4">
                    <div className="flex justify-between items-start mb-3">
                        <div>
                            <p className="font-bold text-lg text-primary">{event.userName}</p>
                            <p className="text-sm text-muted">
                                {event.hostelId ? `Hostel ${event.hostelId}` : 'Unknown Hostel'}
                                {event.roomNo ? ` • Room ${event.roomNo}` : ''}
                            </p>
                        </div>
                        {event.status.recognised && (
                            <span className={`px-2 py-1 text-[10px] font-bold rounded uppercase border ${event.status.resolved
                                ? 'bg-green-50 text-green-700 border-green-200'
                                : 'bg-indigo-50 text-indigo-700 border-indigo-200'
                                }`}>
                                {event.status.resolved ? 'Resolved' : 'Recognised'}
                            </span>
                        )}
                    </div>

                    <button
                        onClick={() => navigate(getDetailRoute())}
                        className="w-full mt-1 bg-gradient-to-r from-[#FF99AC] via-[#C084FC] to-[#89CFF0] text-white font-bold py-2.5 rounded-xl shadow-md hover:opacity-95 active:scale-[0.98] transition-all"
                    >
                        View Details
                    </button>
                </div>
            </div>
        </div>
    );
}
