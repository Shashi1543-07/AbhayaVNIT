import { useParams, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import MobileWrapper from '../../components/layout/MobileWrapper';
import TopHeader from '../../components/layout/TopHeader';
import BottomNav from '../../components/layout/BottomNav';
import { securityNavItems } from '../../lib/navItems';

import { sosService, type SOSEvent } from '../../services/sosService';
import { mapService, type LocationData } from '../../services/mapService';
import { callService } from '../../services/callService';
import { useAuthStore } from '../../context/authStore';
import { Phone, MapPin, Clock, Shield, CheckCircle, Video } from 'lucide-react';
import { motion } from 'framer-motion';
import { containerStagger } from '../../lib/animations';

export default function SecuritySOSDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user, profile } = useAuthStore();
    const [event, setEvent] = useState<SOSEvent | null>(null);
    const [loading, setLoading] = useState(true);
    const [liveLocation, setLiveLocation] = useState<LocationData | null>(null);

    useEffect(() => {
        if (!event?.userId) return;
        const unsubscribe = mapService.subscribeToSingleLocation(event.userId, (data) => {
            setLiveLocation(data);
        });
        return () => unsubscribe();
    }, [event?.userId]);

    const handleCall = (isVideo: boolean = false) => {
        if (!user || !event) return;
        if (!event.status.recognised) {
            alert("Please recognise the SOS before initiating a call.");
            return;
        }

        const receiver = {
            uid: event.userId,
            name: event.userName,
            role: 'student'
        };

        callService.startCall({
            uid: user.uid,
            name: profile?.name || 'Security',
            role: 'security'
        }, receiver, event.id, 'sos', isVideo);
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

            <motion.main
                className="px-4 pt-nav-safe pb-nav-safe"
                variants={containerStagger}
                initial="hidden"
                animate="visible"
            >
                {/* Header Information */}
                <div className="flex justify-between items-start mb-6">
                    <div>
                        <h2 className="text-3xl font-black font-heading text-slate-800 tracking-tighter">{event.userName}</h2>
                        <p className="text-slate-500 font-bold text-xs uppercase tracking-wider mt-1 opacity-80">
                            Student ID: {event.userId.slice(0, 8)}...
                        </p>
                    </div>
                    <span className="bg-red-500 text-white px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg shadow-red-500/30">
                        {event.emergencyType || 'Critical'}
                    </span>
                </div>

                <div className="space-y-4">
                    {/* Location Card */}
                    <div className="glass-card p-5 rounded-[2rem] border border-white/60 shadow-xl relative overflow-hidden">
                        <div className="flex items-center gap-4 mb-4 relative z-10">
                            <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center shrink-0 border border-indigo-500/20">
                                <MapPin className="w-6 h-6 text-indigo-600" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-0.5">Location</p>
                                <p className="text-sm font-bold text-slate-800 truncate leading-tight">Hostel H6, Room 216</p>
                                <p className="text-xs text-slate-500">(Approximate)</p>
                            </div>
                        </div>

                        {liveLocation ? (
                            <button
                                onClick={() => navigate(`/security/map/${event.id}`)}
                                className="w-full bg-gradient-to-r from-[#FF99AC] via-[#C084FC] to-[#89CFF0] text-white py-3 rounded-xl text-sm font-bold shadow-lg shadow-purple-500/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 border border-white/20"
                            >
                                <MapPin className="w-4 h-4" />
                                View Live Map
                                <span className="animate-pulse w-2 h-2 rounded-full bg-white ml-1"></span>
                            </button>
                        ) : (
                            <button
                                onClick={() => navigate(`/security/map/${event.id}`)}
                                className="w-full bg-gradient-to-r from-[#FF99AC] via-[#C084FC] to-[#89CFF0] text-white py-3 rounded-xl text-sm font-bold shadow-lg shadow-purple-500/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 border border-white/20 opacity-90"
                            >
                                <MapPin className="w-4 h-4" />
                                View Last Location
                            </button>
                        )}

                        {/* Decorative Background Blur */}
                        <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl z-0"></div>
                    </div>

                    {/* Time Card */}
                    <div className="glass-card p-4 rounded-[1.5rem] border border-white/60 shadow-lg flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-orange-500/10 flex items-center justify-center shrink-0 border border-orange-500/20">
                            <Clock className="w-5 h-5 text-orange-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-0.5">Time Reported</p>
                            <p className="text-sm font-bold text-slate-800">
                                {new Date(event.triggeredAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {new Date(event.triggeredAt).toLocaleDateString()}
                            </p>
                        </div>
                    </div>

                    {/* Contact Card */}
                    <div className="glass-card p-5 rounded-[2rem] border border-white/60 shadow-xl space-y-4">
                        <div className="flex justify-between items-center">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-full bg-purple-500/10 flex items-center justify-center shrink-0 border border-purple-500/20">
                                    <Phone className="w-5 h-5 text-purple-600" />
                                </div>
                                <div>
                                    <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-0.5">Contact Student</p>
                                    <p className="text-sm font-bold text-slate-800">{event.userPhone || 'Not provided'}</p>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <button
                                onClick={() => handleCall(false)}
                                disabled={!event.status.recognised || event.status.resolved}
                                className={`p-3 rounded-xl border flex items-center justify-center gap-2 transition-all active:scale-95 font-bold text-xs ${(event.status.recognised && !event.status.resolved)
                                    ? 'bg-indigo-50 text-indigo-600 border-indigo-100 hover:bg-indigo-100'
                                    : 'bg-slate-50 text-slate-400 border-slate-100 cursor-not-allowed opacity-50'
                                    }`}
                            >
                                <Phone className="w-4 h-4" />
                                Audio Call
                            </button>
                            <button
                                onClick={() => handleCall(true)}
                                disabled={!event.status.recognised || event.status.resolved}
                                className={`p-3 rounded-xl border flex items-center justify-center gap-2 transition-all active:scale-95 font-bold text-xs ${(event.status.recognised && !event.status.resolved)
                                    ? 'bg-emerald-50 text-emerald-600 border-emerald-100 hover:bg-emerald-100'
                                    : 'bg-slate-50 text-slate-400 border-slate-100 cursor-not-allowed opacity-50'
                                    }`}
                            >
                                <Video className="w-4 h-4" />
                                Video Call
                            </button>
                        </div>

                        {!event.status.recognised && (
                            <div className="text-center">
                                <span className="text-[10px] text-amber-600 font-bold bg-amber-50 px-3 py-1 rounded-full border border-amber-100">
                                    RECOGNISE TO ENABLE CALLING
                                </span>
                            </div>
                        )}
                    </div>

                    {/* Action Buttons */}
                    <div className="pt-4 grid grid-cols-1 gap-4">
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
                                className="flex items-center justify-center gap-2 bg-gradient-to-r from-[#FF99AC] via-[#C084FC] to-[#89CFF0] text-white py-4 rounded-2xl font-bold text-lg shadow-xl shadow-primary/20 active:scale-95 transition-all w-full border border-white/20"
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
                                className="flex items-center justify-center gap-2 bg-gradient-to-r from-[#FF99AC] via-[#C084FC] to-[#89CFF0] text-white py-4 rounded-2xl font-bold text-lg shadow-xl shadow-purple-500/30 active:scale-95 transition-all w-full border border-white/20"
                            >
                                <CheckCircle className="w-6 h-6" />
                                Resolve Emergency
                            </button>
                        )}

                        {event.status.resolved && (
                            <div className="bg-green-50 border border-green-100 rounded-2xl p-4 text-center">
                                <p className="text-green-700 font-bold flex items-center justify-center gap-2">
                                    <CheckCircle className="w-5 h-5" />
                                    This SOS has been resolved
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </motion.main>
            <BottomNav items={securityNavItems} />
        </MobileWrapper>
    );
}
