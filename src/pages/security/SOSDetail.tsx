import { useParams, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import MobileWrapper from '../../components/layout/MobileWrapper';
import TopHeader from '../../components/layout/TopHeader';
import LiveMap from '../../components/LiveMap';
import { sosService, type SOSEvent } from '../../services/sosService';
import { callService } from '../../services/callService';
import { useAuthStore } from '../../context/authStore';
import { Phone, MapPin, Clock, Shield, CheckCircle } from 'lucide-react';

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
            <TopHeader title="Emergency Details" showBackButton={true} />

            <main className="flex-1 flex flex-col h-full pt-24">
                {/* Map Section */}
                <div className="h-1/2 w-full bg-slate-100 relative shadow-inner shrink-0">
                    <LiveMap sosEvents={[event]} />
                </div>

                {/* Details Card */}
                <div className="flex-1 bg-gradient-to-b from-indigo-50/50 to-white p-0 overflow-y-auto rounded-t-3xl -mt-6 relative z-10">
                    <div className="p-6 space-y-6">
                        <div className="flex justify-between items-start">
                            <div>
                                <h2 className="text-2xl font-bold font-heading text-slate-800">{event.userName}</h2>
                                <p className="text-slate-500 font-medium text-sm mt-1">Student ID: {event.userId.slice(0, 8)}...</p>
                            </div>
                            <span className="bg-red-100 text-red-700 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wide shadow-sm">
                                {event.emergencyType || 'Critical'}
                            </span>
                        </div>

                        <div className="space-y-4">
                            <div className="p-4 bg-white/60 rounded-2xl border border-white/50 shadow-sm flex items-center gap-4">
                                <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center shrink-0">
                                    <MapPin className="w-5 h-5 text-indigo-600" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-0.5">Location</p>
                                    <p className="text-sm font-semibold text-slate-800 truncate">Hostel H6, Room 216 (Approx)</p>
                                </div>
                            </div>

                            <div className="p-4 bg-white/60 rounded-2xl border border-white/50 shadow-sm flex items-center gap-4">
                                <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center shrink-0">
                                    <Clock className="w-5 h-5 text-indigo-600" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-0.5">Time Reported</p>
                                    <p className="text-sm font-semibold text-slate-800">
                                        {new Date(event.triggeredAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {new Date(event.triggeredAt).toLocaleDateString()}
                                    </p>
                                </div>
                            </div>

                            <div className="p-4 bg-white/60 rounded-2xl border border-white/50 shadow-sm flex items-center gap-4">
                                <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center shrink-0">
                                    <Phone className="w-5 h-5 text-indigo-600" />
                                </div>
                                <div className="flex-1 flex justify-between items-center min-w-0">
                                    <div className="mr-2">
                                        <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-0.5">Contact</p>
                                        <p className="text-sm font-semibold text-slate-800">+91 98765 43210</p>
                                    </div>
                                    <button
                                        onClick={initiateCall}
                                        className="bg-indigo-50 text-indigo-600 px-4 py-2 rounded-xl text-xs font-bold border border-indigo-100 flex items-center gap-2 active:scale-95 transition-transform"
                                    >
                                        <Phone className="w-3.5 h-3.5 fill-current" /> Web Call
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="pt-2 grid grid-cols-2 gap-4 pb-6">
                            {!event.status.recognised && (
                                <button
                                    onClick={async () => {
                                        if (window.confirm('Recognise this SOS? You will be assigned to this emergency.')) {
                                            try {
                                                await sosService.recogniseSOS(
                                                    event.id,
                                                    user?.uid || '',
                                                    profile?.name || 'Security'
                                                );
                                                alert('SOS Recognised! You are now assigned to this emergency.');
                                            } catch (error) {
                                                alert('Failed to recognise SOS: ' + (error as Error).message);
                                            }
                                        }
                                    }}
                                    className="col-span-2 flex items-center justify-center gap-2 bg-indigo-600 text-white py-4 rounded-2xl font-bold text-lg shadow-xl shadow-indigo-200 active:scale-95 transition-all w-full"
                                >
                                    <Shield className="w-6 h-6" />
                                    Recognise SOS
                                </button>
                            )}

                            {event.status.recognised && !event.status.resolved && (
                                <button
                                    onClick={async () => {
                                        if (window.confirm('Mark this SOS as resolved?')) {
                                            try {
                                                await sosService.resolveSOS(
                                                    event.id,
                                                    user?.uid || 'security',
                                                    'Resolved by Security'
                                                );
                                                alert('SOS Resolved Successfully!');
                                                navigate('/security/dashboard');
                                            } catch (error) {
                                                alert('Failed to resolve SOS: ' + (error as Error).message);
                                            }
                                        }
                                    }}
                                    className="col-span-2 flex items-center justify-center gap-2 bg-indigo-600 text-white py-4 rounded-2xl font-bold text-lg shadow-xl shadow-indigo-200 active:scale-95 transition-all w-full"
                                >
                                    <CheckCircle className="w-6 h-6" />
                                    Resolve
                                </button>
                            )}

                            {event.status.resolved && (
                                <div className="col-span-2 bg-green-50 border border-green-100 rounded-2xl p-4 text-center">
                                    <p className="text-green-700 font-bold flex items-center justify-center gap-2">
                                        <CheckCircle className="w-5 h-5" />
                                        This SOS has been resolved
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </main>
        </MobileWrapper>
    );
}
