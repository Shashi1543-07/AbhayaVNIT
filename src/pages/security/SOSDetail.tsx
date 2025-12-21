import { useParams, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import MobileWrapper from '../../components/layout/MobileWrapper';
import TopHeader from '../../components/layout/TopHeader';
import LiveMap from '../../components/LiveMap';
import { sosService, type SOSEvent } from '../../services/sosService';
import { callService } from '../../services/callService';
import { useAuthStore } from '../../context/authStore';
import { Phone, MapPin, Clock, Shield, CheckCircle, ArrowLeft } from 'lucide-react';

export default function SecuritySOSDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user, profile } = useAuthStore();
    const [event, setEvent] = useState<SOSEvent | null>(null);
    const [loading, setLoading] = useState(true);

    const initiateCall = () => {
        if (!user || !event) return;
        const receiver = {
            uid: event.userId,
            name: event.userName,
            role: 'student'
        };
        callService.startCall({
            uid: user.uid,
            name: profile?.name || 'Security',
            role: 'security'
        }, receiver);
    };

    useEffect(() => {
        if (!id) return;

        // In a real app, we might fetch a single doc, but here we can subscribe or find it
        // For now, let's just subscribe to all and find the one we need, or fetch it once
        // Since we don't have a getById in the service exposed yet, let's use the subscription for now
        // or just fetch it directly if we had that method.
        // Let's assume we can get it from the active list for now.

        const unsubscribe = sosService.subscribeToActiveSOS((events) => {
            const found = events.find(e => e.id === id);
            if (found) {
                setEvent(found);
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, [id]);

    if (loading) {
        return (
            <MobileWrapper>
                <TopHeader title="Loading..." />
                <div className="flex items-center justify-center h-full">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                </div>
            </MobileWrapper>
        );
    }

    if (!event) {
        return (
            <MobileWrapper>
                <TopHeader title="Event Not Found" />
                <div className="p-4 text-center">
                    <p>This SOS event may have been resolved or does not exist.</p>
                    <button onClick={() => navigate('/security/dashboard')} className="mt-4 text-primary font-bold">
                        Return to Dashboard
                    </button>
                </div>
            </MobileWrapper>
        );
    }

    return (
        <MobileWrapper>
            <div className="bg-white shadow-sm pt-safe-top pb-2 px-4 flex items-center gap-3 sticky top-0 z-50">
                <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-full hover:bg-slate-100">
                    <ArrowLeft className="w-6 h-6 text-slate-700" />
                </button>
                <h1 className="text-lg font-bold text-slate-800">Emergency Details</h1>
            </div>

            <main className="flex-1 flex flex-col h-full">
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
                                <p className="text-slate-500 text-sm">Student ID: {event.userId.slice(0, 8)}...</p>
                            </div>
                            <span className="bg-red-100 text-red-700 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide">
                                {event.emergencyType || 'Critical'}
                            </span>
                        </div>

                        <div className="space-y-3 pt-2">
                            <div className="flex items-center gap-3 text-slate-700">
                                <div className="w-8 h-8 rounded-full bg-slate-100/50 flex items-center justify-center">
                                    <MapPin className="w-4 h-4 text-slate-500" />
                                </div>
                                <div className="flex-1">
                                    <p className="text-xs text-slate-500 font-bold uppercase">Location</p>
                                    <p className="text-sm font-medium">Hostel H6, Room 216 (Approx)</p>
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
                                        <p className="text-sm font-medium">+91 98765 43210</p>
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
                                onClick={async () => {
                                    if (window.confirm('Mark this SOS as resolved?')) {
                                        await sosService.resolveSOS(event.id, 'security-1', 'Resolved by Security');
                                        navigate('/security/dashboard');
                                    }
                                }}
                                className="flex items-center justify-center gap-2 bg-emerald-500 text-white py-3 rounded-xl font-bold shadow-lg shadow-emerald-200 active:scale-95 transition-transform"
                            >
                                <CheckCircle className="w-5 h-5" />
                                Resolve
                            </button>
                            <button
                                onClick={async () => {
                                    await sosService.assignGuard(event.id, { id: 'guard-1', name: 'Patrol Unit 1', role: 'guard' });
                                    alert('Guard Assigned!');
                                }}
                                className="flex items-center justify-center gap-2 bg-slate-100/80 text-slate-700 py-3 rounded-xl font-bold active:scale-95 transition-transform"
                            >
                                <Shield className="w-5 h-5" />
                                Assign Guard
                            </button>
                        </div>
                    </div>
                </div>
            </main>
        </MobileWrapper>
    );
}
