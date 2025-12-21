import { useParams } from 'react-router-dom';
import { useState, useEffect } from 'react';
import MobileWrapper from '../../components/layout/MobileWrapper';
import TopHeader from '../../components/layout/TopHeader';
import LiveMap from '../../components/LiveMap';
import { sosService, type SOSEvent } from '../../services/sosService';
import { callService } from '../../services/callService';
import { useAuthStore } from '../../context/authStore';
import { Phone, MapPin, Clock, Shield, AlertTriangle } from 'lucide-react';

export default function WardenSOSDetail() {
    const { id } = useParams();
    const { user } = useAuthStore();
    const [event, setEvent] = useState<SOSEvent | null>(null);
    const [loading, setLoading] = useState(true);

    const initiateCall = () => {
        if (!user || !event) return;
        const receiver = {
            uid: event.userId,
            name: event.userName,
            role: 'student'
        };
        callService.startCall(user, receiver);
    };

    useEffect(() => {
        if (!id) return;
        const unsubscribe = sosService.subscribeToActiveSOS((events) => {
            const found = events.find(e => e.id === id);
            if (found) {
                setEvent(found);
            }
            setLoading(false);
        });
        return () => unsubscribe();
    }, [id]);

    const handleAcknowledge = async () => {
        if (!event) return;
        try {
            await sosService.acknowledgeSOS(event.id, 'Warden');
            alert("Acknowledged alert.");
        } catch (error) {
            console.error("Failed to acknowledge:", error);
        }
    };

    if (loading) return <div className="p-8 text-center">Loading...</div>;
    if (!event) return <div className="p-8 text-center">Event not found.</div>;

    return (
        <MobileWrapper>
            <TopHeader
                title="Emergency Details"
                showBackButton={true}
            />

            <main className="flex-1 flex flex-col h-full pb-20">
                {/* Map Section */}
                <div className="h-1/2 w-full bg-slate-100 relative shadow-inner shrink-0">
                    <LiveMap sosEvents={[event]} />
                </div>

                {/* Details Card */}
                <div className="flex-1 p-4 bg-slate-50 overflow-y-auto">
                    <div className="glass-card rounded-2xl p-5 space-y-4">
                        <div className="flex justify-between items-start">
                            <div>
                                <h2 className="text-xl font-bold text-slate-800">{event.userName}</h2>
                                <p className="text-slate-500 text-sm">Hostel {event.hostelId} • Room {event.roomNo}</p>
                            </div>
                            <div className="flex flex-col items-end gap-2">
                                <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide border
                                    ${event.emergencyType === 'medical' ? 'bg-red-100 text-red-700 border-red-200' :
                                        event.emergencyType === 'harassment' ? 'bg-purple-100 text-purple-700 border-purple-200' :
                                            'bg-slate-100 text-slate-700 border-slate-200'}
                                `}>
                                    {event.emergencyType || 'Critical'}
                                </span>
                                {event.triggerMethod && (
                                    <span className="text-[10px] font-medium text-blue-600 uppercase italic bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                                        {event.triggerMethod.replace('_', ' ')}
                                    </span>
                                )}
                            </div>
                        </div>

                        <div className="space-y-3 pt-2">
                            <div className="flex items-center gap-3 text-slate-700">
                                <div className="w-8 h-8 rounded-full bg-slate-100/50 flex items-center justify-center">
                                    <MapPin className="w-4 h-4 text-slate-500" />
                                </div>
                                <div className="flex-1">
                                    <p className="text-xs text-slate-500 font-bold uppercase">Location</p>
                                    <p className="text-sm font-medium">Hostel {event.hostelId}, Room {event.roomNo}</p>
                                </div>
                            </div>

                            <div className="flex items-center gap-3 text-slate-700">
                                <div className="w-8 h-8 rounded-full bg-slate-100/50 flex items-center justify-center">
                                    <Clock className="w-4 h-4 text-slate-500" />
                                </div>
                                <div className="flex-1">
                                    <p className="text-xs text-slate-500 font-bold uppercase">Time Reported</p>
                                    <p className="text-sm font-medium">
                                        {new Date(event.triggeredAt).toLocaleTimeString()} • {new Date(event.triggeredAt).toLocaleDateString()}
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center gap-3 text-slate-700">
                                <div className="w-8 h-8 rounded-full bg-slate-100/50 flex items-center justify-center">
                                    <Phone className="w-4 h-4 text-slate-500" />
                                </div>
                                <div className="flex-1 flex justify-between items-center">
                                    <div>
                                        <p className="text-xs text-slate-500 font-bold uppercase">Contact</p>
                                        <p className="text-sm font-medium">{event.userPhone}</p>
                                    </div>
                                    <button
                                        onClick={initiateCall}
                                        className="bg-primary/10 text-primary px-3 py-1.5 rounded-lg text-xs font-bold border border-primary/20 flex items-center gap-1 active:scale-95 transition-transform"
                                    >
                                        <Phone className="w-3 h-3" /> Web Call
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="pt-4 grid grid-cols-2 gap-3">
                            <button
                                onClick={handleAcknowledge}
                                className="flex items-center justify-center gap-2 bg-indigo-500 text-white py-3 rounded-xl font-bold shadow-lg shadow-indigo-200 active:scale-95 transition-transform"
                            >
                                <Shield className="w-5 h-5" />
                                Acknowledge
                            </button>
                            <button
                                onClick={() => alert("Escalated to Chief Security Officer")}
                                className="flex items-center justify-center gap-2 bg-amber-100 text-amber-800 py-3 rounded-xl font-bold active:scale-95 transition-transform"
                            >
                                <AlertTriangle className="w-5 h-5" />
                                Escalate
                            </button>
                        </div>
                    </div>
                </div>
            </main>
        </MobileWrapper>
    );
}
