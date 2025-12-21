import { useEffect, useState } from 'react';
import { sosService, type SOSEvent } from '../../services/sosService';
import { AlertTriangle, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function WardenActiveSOS() {
    const [allEvents, setAllEvents] = useState<SOSEvent[]>([]);
    const navigate = useNavigate();

    useEffect(() => {
        // Subscribe to ALL active SOS events (no hostelId filter)
        const unsubscribe = sosService.subscribeToActiveSOS((events) => {
            setAllEvents(events);
        });
        return () => unsubscribe();
    }, []);

    if (allEvents.length === 0) {
        return (
            <div className="bg-success/10 p-8 rounded-2xl border border-success/30 text-success flex flex-col items-center justify-center text-center">
                <div className="w-12 h-12 bg-success/20 rounded-full flex items-center justify-center mb-3">
                    <span className="text-2xl">🛡️</span>
                </div>
                <h3 className="text-lg font-bold">All Clear</h3>
                <p className="text-sm">No active emergencies across campus.</p>
            </div>
        );
    }

    return (
        <div className="glass-card-soft rounded-2xl shadow-sm border border-white/40 overflow-hidden flex flex-col">
            <div className="p-4 bg-emergency-pulse border-b border-emergency/30 flex justify-between items-center">
                <h2 className="font-bold text-emergency flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5" />
                    Active Alerts (<span className="text-emergency">{allEvents.length}</span>)
                </h2>
                <span className="text-xs text-emergency bg-emergency/20 px-2 py-1 rounded">Global View</span>
            </div>

            <div className="flex-1 p-2 space-y-2">
                {/* Group events by userId */}
                {Object.values(allEvents.reduce((acc, event) => {
                    if (!acc[event.userId]) {
                        acc[event.userId] = [];
                    }
                    acc[event.userId].push(event);
                    return acc;
                }, {} as Record<string, SOSEvent[]>)).map(userEvents => {
                    // Sort user events by time (newest first)
                    userEvents.sort((a, b) => b.triggeredAt - a.triggeredAt);
                    const latestEvent = userEvents[0];
                    const count = userEvents.length;

                    return (
                        <div
                            key={latestEvent.userId}
                            onClick={() => navigate(`/warden/sos/${latestEvent.id}`)}
                            className="p-4 rounded-2xl bg-surface hover:bg-emergency/5 cursor-pointer transition-all flex items-center justify-between group"
                        >
                            <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="px-2 py-0.5 bg-emergency/20 text-emergency rounded text-xs font-bold animate-pulse">
                                        {latestEvent.status.toUpperCase()}
                                    </span>
                                    {count > 1 && (
                                        <span className="px-2 py-0.5 bg-emergency text-white rounded-full text-xs font-bold">
                                            {count} Alerts
                                        </span>
                                    )}
                                    <span className="text-xs text-muted font-mono">
                                        {new Date(latestEvent.triggeredAt).toLocaleTimeString()}
                                    </span>
                                </div>
                                <h3 className="font-bold text-primary">{latestEvent.userName}</h3>
                                <div className="flex flex-wrap gap-2 mt-1 mb-1">
                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold border uppercase
                                        ${latestEvent.emergencyType === 'medical' ? 'bg-red-100 text-red-700 border-red-200' :
                                            latestEvent.emergencyType === 'harassment' ? 'bg-purple-100 text-purple-700 border-purple-200' :
                                                'bg-slate-100 text-slate-700 border-slate-200'}
                                    `}>
                                        {latestEvent.emergencyType || 'General'}
                                    </span>
                                    {latestEvent.triggerMethod && (
                                        <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-[10px] font-medium border border-blue-100 italic">
                                            {latestEvent.triggerMethod.replace('_', ' ')}
                                        </span>
                                    )}
                                </div>
                                <p className="text-sm text-muted">
                                    Hostel {latestEvent.hostelId} • Room {latestEvent.roomNo}
                                </p>
                            </div>
                            <ChevronRight className="text-muted group-hover:text-primary" />
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
