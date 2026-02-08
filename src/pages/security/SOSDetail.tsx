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
import CustomModal from '../../components/common/CustomModal';

export default function SecuritySOSDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user, profile } = useAuthStore();
    const [event, setEvent] = useState<SOSEvent | null>(null);
    const [loading, setLoading] = useState(true);
    const [liveLocation, setLiveLocation] = useState<LocationData | null>(null);
    const [modalConfig, setModalConfig] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        type: 'info' | 'danger' | 'success' | 'warning';
        onConfirm?: () => void;
        confirmText?: string;
    }>({
        isOpen: false,
        title: '',
        message: '',
        type: 'info'
    });
    const [isActionLoading, setIsActionLoading] = useState(false);

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
            setModalConfig({
                isOpen: true,
                title: 'Recognition Required',
                message: 'Please recognise the SOS before initiating a call to establish priority connection.',
                type: 'warning'
            });
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
                <div className="flex flex-col items-center justify-center h-full bg-black">
                    <div className="w-16 h-16 border-4 border-[#D4AF37] border-t-transparent rounded-full animate-spin mb-6 shadow-[0_0_15px_rgba(212,175,55,0.3)]"></div>
                    <p className="text-[10px] text-[#D4AF37] font-black uppercase tracking-[0.3em]">Accessing Ops-Intel...</p>
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
                <div className="flex justify-between items-start mb-10">
                    <div className="flex-1 min-w-0 pr-4">
                        <h2 className="text-3xl font-black text-white font-heading tracking-tight drop-shadow-sm truncate">{event.userName}</h2>
                        <div className="flex flex-wrap items-center gap-3 text-[10px] text-[#D4AF37] font-black uppercase tracking-[0.2em] mt-3">
                            <span className="flex items-center gap-2 bg-[#D4AF37]/5 px-3 py-1.5 rounded-full border border-[#D4AF37]/10 whitespace-nowrap">
                                <Shield className="w-3.5 h-3.5" strokeWidth={3} /> ID: {event.studentIdNumber || 'N/A'}
                            </span>
                            <span className="flex items-center gap-2 bg-[#D4AF37]/5 px-3 py-1.5 rounded-full border border-[#D4AF37]/10 whitespace-nowrap">
                                ENROLL: {event.studentEnrollmentNumber || 'N/A'}
                            </span>
                        </div>
                    </div>
                    <span className={`px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] shadow-2xl backdrop-blur-3xl border whitespace-nowrap ${!event.status.recognised ? 'bg-red-600/20 text-red-500 border-red-500/40 shadow-red-500/10' :
                        !event.status.resolved ? 'bg-[#D4AF37]/20 text-[#D4AF37] border-[#D4AF37]/40 shadow-[#D4AF37]/10' :
                            'bg-emerald-500/20 text-emerald-500 border-emerald-500/40 shadow-emerald-500/10'
                        }`}>
                        {event.emergencyType?.toUpperCase() || 'CRITICAL'}
                    </span>
                </div>

                <div className="space-y-4">
                    {/* Location Card */}
                    <div className="glass-card bg-black/40 p-6 rounded-[3rem] border border-white/5 shadow-2xl relative overflow-hidden">
                        <div className="flex items-center gap-5 mb-8 relative z-10">
                            <div className="w-14 h-14 rounded-2xl bg-[#D4AF37]/10 flex items-center justify-center shrink-0 border border-[#D4AF37]/20 shadow-inner group-hover:bg-[#D4AF37]/20 transition-colors">
                                <MapPin className="w-7 h-7 text-[#D4AF37]" strokeWidth={3} />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-[9px] text-zinc-500 font-black uppercase tracking-[0.2em] mb-1">Target Sector</p>
                                <p className="text-base font-black text-white truncate leading-none drop-shadow-sm font-heading">
                                    {event.hostelId || event.hostel || 'UNKNOWN'} • {event.roomNo || event.roomNumber || 'SEC-INTEL'}
                                </p>
                                <p className="text-[10px] text-zinc-600 font-bold mt-1 uppercase tracking-widest">Live Presence Data</p>
                            </div>
                        </div>

                        <button
                            onClick={() => navigate(`/security/map/${event.id}`)}
                            className="w-full bg-gradient-to-br from-[#CF9E1B] via-[#D4AF37] to-[#8B6E13] text-black py-4.5 rounded-[22px] text-[11px] font-black uppercase tracking-[0.2em] shadow-[0_10px_30px_rgba(212,175,55,0.2)] active:scale-[0.98] transition-all flex items-center justify-center gap-3 border border-white/20 relative z-10"
                        >
                            <MapPin className="w-5 h-5" strokeWidth={3} />
                            {liveLocation ? 'Access Live Intel' : 'Last Known Position'}
                            {liveLocation && (
                                <span className="animate-pulse w-2 h-2 rounded-full bg-black ml-1"></span>
                            )}
                        </button>
                    </div>

                    {/* Time Card */}
                    <div className="glass-card bg-black/40 p-5 rounded-[2rem] border border-white/5 shadow-2xl flex items-center gap-5">
                        <div className="w-12 h-12 rounded-2xl bg-amber-500/10 flex items-center justify-center shrink-0 border border-amber-500/20">
                            <Clock className="w-6 h-6 text-amber-500" strokeWidth={3} />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-[9px] text-zinc-500 font-black uppercase tracking-[0.2em] mb-1">Incident Timestamp</p>
                            <p className="text-base font-black text-white font-heading uppercase">
                                {new Date(event.triggeredAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {new Date(event.triggeredAt).toLocaleDateString()}
                            </p>
                        </div>
                    </div>

                    {/* Contact Card */}
                    <div className="glass-card bg-black/40 p-6 rounded-[3rem] border border-white/5 shadow-2xl space-y-6">
                        <div className="flex justify-between items-center bg-white/5 p-5 rounded-[2rem] border border-white/10 shadow-inner">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-purple-500/10 flex items-center justify-center rounded-2xl border border-purple-500/20 shadow-2xl">
                                    <Phone className="w-6 h-6 text-purple-500" strokeWidth={3} />
                                </div>
                                <div>
                                    <p className="text-[9px] text-zinc-500 font-black uppercase tracking-[0.2em] mb-1">Comms Channel</p>
                                    <p className="text-sm font-black text-white font-heading uppercase tracking-wide">{event.userPhone || 'PROTOCOL VOID'}</p>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <button
                                onClick={() => handleCall(false)}
                                disabled={!event.status.recognised || event.status.resolved}
                                className={`h-14 rounded-2xl border flex items-center justify-center gap-3 transition-all active:scale-95 shadow-2xl font-black text-[11px] uppercase tracking-[0.2em] ${(event.status.recognised && !event.status.resolved)
                                    ? 'bg-emerald-500 text-black border-emerald-400 shadow-[0_5px_15px_rgba(16,185,129,0.3)]'
                                    : 'bg-white/5 text-zinc-600 border-white/5 cursor-not-allowed opacity-50'
                                    }`}
                            >
                                <Phone className="w-5 h-5" strokeWidth={3} />
                                Audio
                            </button>
                            <button
                                onClick={() => handleCall(true)}
                                disabled={!event.status.recognised || event.status.resolved}
                                className={`h-14 rounded-2xl border flex items-center justify-center gap-3 transition-all active:scale-95 shadow-2xl font-black text-[11px] uppercase tracking-[0.2em] ${(event.status.recognised && !event.status.resolved)
                                    ? 'bg-[#D4AF37] text-black border-[#D4AF37]/20 shadow-[0_5px_15px_rgba(212,175,55,0.3)]'
                                    : 'bg-white/5 text-zinc-600 border-white/5 cursor-not-allowed opacity-50'
                                    }`}
                            >
                                <Video className="w-5 h-5" strokeWidth={3} />
                                Video
                            </button>
                        </div>

                        {!event.status.recognised && (
                            <p className="text-[8px] text-center text-[#D4AF37] font-black tracking-[0.2em] uppercase py-2.5 rounded-xl border border-[#D4AF37]/10 bg-[#D4AF37]/5">
                                🔒 HQ LOCK: SECURITY ACK-INTEL REQUIRED TO LINK
                            </p>
                        )}
                    </div>

                    {/* Action Buttons */}
                    <div className="pt-8 grid grid-cols-1 gap-6 pb-nav-safe">
                        {!event.status.recognised && (
                            <button
                                onClick={() => {
                                    setModalConfig({
                                        isOpen: true,
                                        title: 'Recognise SOS',
                                        message: 'Are you sure you want to recognise this SOS? You will be assigned as the primary responder for this emergency.',
                                        type: 'info',
                                        confirmText: 'Acknowledge',
                                        onConfirm: async () => {
                                            setIsActionLoading(true);
                                            try {
                                                await sosService.recogniseSOS(
                                                    event.id,
                                                    user?.uid || '',
                                                    profile?.name || 'Security',
                                                    profile
                                                );
                                                setModalConfig(prev => ({ ...prev, isOpen: false }));
                                            } catch (error) {
                                                setModalConfig({
                                                    isOpen: true,
                                                    title: 'Auth Error',
                                                    message: 'Failed to access Ops-Intel: ' + (error as Error).message,
                                                    type: 'danger'
                                                });
                                            } finally {
                                                setIsActionLoading(false);
                                            }
                                        }
                                    });
                                }}
                                className="flex items-center justify-center gap-4 bg-gradient-to-br from-[#CF9E1B] via-[#D4AF37] to-[#8B6E13] text-black py-5 rounded-[2.5rem] font-black text-sm uppercase tracking-[0.3em] shadow-[0_20px_50px_rgba(212,175,55,0.3)] active:scale-95 transition-all w-full border border-white/20"
                            >
                                <Shield className="w-7 h-7" strokeWidth={3} />
                                Recognise SOS
                            </button>
                        )}

                        {event.status.recognised && !event.status.resolved && (
                            <button
                                onClick={() => {
                                    setModalConfig({
                                        isOpen: true,
                                        title: 'Resolve Incident',
                                        message: 'Confirm that this emergency situation has been handled and can be marked as resolved in the logs?',
                                        type: 'warning',
                                        confirmText: 'Resolve',
                                        onConfirm: async () => {
                                            setIsActionLoading(true);
                                            try {
                                                await sosService.resolveSOS(
                                                    event.id,
                                                    'Resolved by Security',
                                                    profile
                                                );
                                                setModalConfig(prev => ({ ...prev, isOpen: false }));
                                                navigate('/security/dashboard');
                                            } catch (error) {
                                                setModalConfig({
                                                    isOpen: true,
                                                    title: 'Protocol Error',
                                                    message: 'Failed to update system: ' + (error as Error).message,
                                                    type: 'danger'
                                                });
                                            } finally {
                                                setIsActionLoading(false);
                                            }
                                        }
                                    });
                                }}
                                className="flex items-center justify-center gap-4 bg-gradient-to-br from-emerald-500 via-emerald-600 to-emerald-700 text-black py-5 rounded-[2.5rem] font-black text-sm uppercase tracking-[0.3em] shadow-[0_20px_50px_rgba(16,185,129,0.3)] active:scale-95 transition-all w-full border border-white/20"
                            >
                                <CheckCircle className="w-7 h-7" strokeWidth={3} />
                                Resolve Emergency
                            </button>
                        )}

                        {event.status.resolved && (
                            <div className="glass-card rounded-[2.5rem] p-8 border border-emerald-500/20 bg-emerald-500/5 text-center shadow-2xl">
                                <p className="text-emerald-500 font-black flex items-center justify-center gap-3 uppercase tracking-[0.3em] text-xs">
                                    <CheckCircle className="w-8 h-8" strokeWidth={3} />
                                    PROTOCOL RESOLVED
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </motion.main>
            <CustomModal
                {...modalConfig}
                onClose={() => setModalConfig(prev => ({ ...prev, isOpen: false }))}
                isLoading={isActionLoading}
            />
            <BottomNav items={securityNavItems} />
        </MobileWrapper>
    );
}
