import { useParams, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import MobileWrapper from '../../components/layout/MobileWrapper';
import TopHeader from '../../components/layout/TopHeader';
import BottomNav from '../../components/layout/BottomNav';
import { adminNavItems } from '../../lib/navItems';
import { motion } from 'framer-motion';
import { containerStagger } from '../../lib/animations';
import { type SOSEvent } from '../../services/sosService';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { MapPin, Clock, Shield, Phone, User, AlertTriangle } from 'lucide-react';
import { mapService, type LocationData } from '../../services/mapService';

export default function AdminSOSDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
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

    useEffect(() => {
        if (!id) return;

        const unsubscribe = onSnapshot(doc(db, 'sos_events', id), (snapshot) => {
            if (snapshot.exists()) {
                const data = snapshot.data();
                setEvent({
                    id: snapshot.id,
                    ...data,
                    timeline: data.timeline || []
                } as SOSEvent);
            } else {
                setEvent(null);
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, [id]);

    if (loading) {
        return (
            <MobileWrapper>
                <TopHeader title="SOS Details" showBackButton={true} />
                <div className="flex items-center justify-center h-screen pb-20">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                </div>
            </MobileWrapper>
        );
    }

    if (!event) {
        return (
            <MobileWrapper>
                <TopHeader title="SOS Details" showBackButton={true} />
                <div className="p-4 text-center pt-20">
                    <p className="text-muted mb-4">This SOS event does not exist or has been removed.</p>
                    <button onClick={() => navigate('/admin/dashboard')} className="text-primary font-bold">
                        Return to Dashboard
                    </button>
                </div>
            </MobileWrapper>
        );
    }

    const timeElapsed = Math.floor((Date.now() - event.triggeredAt) / 1000 / 60); // minutes

    return (
        <MobileWrapper>
            <TopHeader title="Admin Oversight" showBackButton={true} />

            <motion.main
                className="px-4 pt-nav-safe pb-nav-safe"
                variants={containerStagger}
                initial="hidden"
                animate="visible"
            >
                {/* Header Section */}
                <div className="flex justify-between items-start mb-10">
                    <div className="flex-1 min-w-0 pr-4">
                        <h2 className="text-3xl font-black text-white font-heading tracking-tight drop-shadow-sm truncate">{event.userName || event.studentName}</h2>
                        <div className="flex flex-wrap items-center gap-3 text-[10px] text-[#D4AF37] font-black uppercase tracking-[0.2em] mt-3">
                            <span className="flex items-center gap-2 bg-[#D4AF37]/5 px-3 py-1.5 rounded-full border border-[#D4AF37]/10 whitespace-nowrap">
                                <User className="w-3.5 h-3.5" strokeWidth={3} /> {event.role?.toUpperCase()}
                            </span>
                            <span className="flex items-center gap-2 bg-[#D4AF37]/5 px-3 py-1.5 rounded-full border border-[#D4AF37]/10 whitespace-nowrap">
                                <Phone className="w-3.5 h-3.5" strokeWidth={3} /> {event.userPhone || 'PROTOCOL VOID'}
                            </span>
                        </div>
                    </div>
                    <span className={`px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] shadow-2xl backdrop-blur-3xl border whitespace-nowrap ${!event.status.recognised ? 'bg-red-600/20 text-red-500 border-red-500/40 shadow-red-500/10' :
                        !event.status.resolved ? 'bg-amber-500/20 text-amber-500 border-amber-500/40 shadow-amber-500/10' :
                            'bg-emerald-500/20 text-emerald-500 border-emerald-500/40 shadow-emerald-500/10'
                        }`}>
                        {!event.status.recognised ? 'CRITICAL PENDING' :
                            !event.status.resolved ? 'IN-ACK' :
                                'PROTOCOL SECURED'}
                    </span>
                </div>

                <div className="space-y-4">
                    {/* Location & Map Card */}
                    <div className="glass-card bg-black/40 p-6 rounded-[3rem] border border-white/5 shadow-2xl relative overflow-hidden group">
                        <div className="flex items-center gap-5 mb-8 relative z-10">
                            <div className="w-14 h-14 rounded-2xl bg-[#D4AF37]/10 flex items-center justify-center shrink-0 border border-[#D4AF37]/20 shadow-inner group-hover:bg-[#D4AF37]/20 transition-colors">
                                <MapPin className="w-7 h-7 text-[#D4AF37]" strokeWidth={3} />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-[9px] text-zinc-500 font-black uppercase tracking-[0.2em] mb-1">Target Sector</p>
                                <p className="text-base font-black text-white truncate leading-none drop-shadow-sm font-heading uppercase">
                                    Hostel {event.hostelId || event.hostel} • Unit {event.roomNo || event.roomNumber}
                                </p>
                                <p className="text-[10px] text-zinc-600 font-bold mt-1 uppercase tracking-widest">Global Surveillance</p>
                            </div>
                        </div>

                        <button
                            onClick={() => navigate(`/admin/map/${event.id}`)}
                            className="w-full bg-gradient-to-br from-[#CF9E1B] via-[#D4AF37] to-[#8B6E13] text-black py-4.5 rounded-[22px] text-[11px] font-black uppercase tracking-[0.2em] shadow-[0_10px_30px_rgba(212,175,55,0.2)] active:scale-[0.98] transition-all flex items-center justify-center gap-3 border border-white/20 relative z-10"
                        >
                            <MapPin className="w-5 h-5" strokeWidth={3} />
                            Access Live Intel
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
                            <p className="text-[9px] text-zinc-500 font-black uppercase tracking-[0.2em] mb-1">Time Elapsed</p>
                            <p className="text-base font-black text-white font-heading uppercase tracking-wide">{timeElapsed} MINUTES AGO</p>
                        </div>
                    </div>

                    {/* Emergency Details */}
                    {event.emergencyType && (
                        <div className="p-6 bg-red-600/10 border border-red-500/20 rounded-[2.5rem] shadow-inner">
                            <div className="flex items-center gap-3 mb-4">
                                <AlertTriangle className="w-6 h-6 text-red-500" strokeWidth={3} />
                                <h3 className="font-black text-red-500 uppercase text-[10px] tracking-[0.3em]">Critical Intel</h3>
                            </div>
                            <div className="flex flex-wrap items-center gap-3">
                                <span className={`px-4 py-2 border rounded-xl font-black uppercase text-[9px] tracking-widest
                                    ${event.emergencyType === 'medical' ? 'bg-red-500/20 text-red-400 border-red-400/30' :
                                        event.emergencyType === 'harassment' ? 'bg-purple-500/20 text-purple-400 border-purple-400/30' :
                                            'bg-zinc-800 text-zinc-400 border-zinc-700'}
                                `}>
                                    {event.emergencyType}
                                </span>
                                {event.triggerMethod && (
                                    <span className="text-[8px] text-zinc-600 font-black uppercase tracking-[0.2em]">
                                        VIA: {event.triggerMethod.replace('_', ' ')}
                                    </span>
                                )}
                            </div>
                            {event.description && (
                                <p className="text-sm text-zinc-400 mt-4 italic font-medium leading-relaxed border-l-2 border-red-500/20 pl-4 bg-black/20 p-3 rounded-r-xl">"{event.description}"</p>
                            )}
                        </div>
                    )}

                    {/* Assignment & Actions Card */}
                    <div className="glass-card bg-black/40 p-6 rounded-[3rem] border border-white/5 shadow-2xl space-y-6">
                        {event.status.recognised && event.assignedTo ? (
                            <div className="p-5 bg-white/5 border border-white/10 rounded-[2rem] flex justify-between items-center shadow-inner">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-blue-500/10 flex items-center justify-center rounded-2xl border border-blue-500/20 shadow-2xl">
                                        <Shield className="w-6 h-6 text-blue-500" strokeWidth={3} />
                                    </div>
                                    <div>
                                        <p className="text-[9px] text-blue-500 font-black uppercase tracking-[0.2em]">Active Responder</p>
                                        <p className="text-sm font-black text-white font-heading uppercase tracking-wide truncate max-w-[160px]">{event.assignedTo.name}</p>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="p-5 bg-amber-500/10 border border-amber-500/20 rounded-[2rem] flex items-center gap-4 shadow-inner">
                                <div className="w-12 h-12 bg-amber-500/10 flex items-center justify-center rounded-2xl border border-amber-500/20">
                                    <AlertTriangle className="w-6 h-6 text-amber-500" strokeWidth={3} />
                                </div>
                                <div>
                                    <p className="text-[9px] text-amber-500 font-black uppercase tracking-[0.2em]">Protocol Status</p>
                                    <p className="text-sm font-black text-amber-100 uppercase tracking-wide">Awaiting Security Response</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Timeline */}
                <div className="glass-card bg-black/40 rounded-[3rem] p-8 border border-white/5 shadow-2xl mt-8">
                    <div className="flex items-center gap-4 mb-10">
                        <div className="w-12 h-12 bg-[#D4AF37]/10 flex items-center justify-center rounded-2xl border border-[#D4AF37]/20 shadow-2xl">
                            <Clock className="w-6 h-6 text-[#D4AF37]" strokeWidth={3} />
                        </div>
                        <h3 className="text-xl font-black text-white tracking-tight font-heading drop-shadow-sm uppercase">Ops Timeline</h3>
                    </div>

                    <div className="space-y-10 relative">
                        <div className="absolute left-[23px] top-2 bottom-2 w-px bg-white/5" />

                        {[...(event.timeline || [])].reverse().map((entry, idx) => (
                            <div key={idx} className="flex gap-8 relative">
                                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 z-10 border shadow-2xl 
                                    ${idx === 0 ? 'bg-[#D4AF37] border-[#D4AF37]/20 shadow-[0_0_20px_rgba(212,175,55,0.4)]' : 'bg-black/60 border-white/10'}`}>
                                    <div className={`w-2.5 h-2.5 rounded-full ${idx === 0 ? 'bg-black animate-pulse' : 'bg-[#D4AF37]/40'}`} />
                                </div>
                                <div className="flex-1 pb-2">
                                    <div className="flex justify-between items-start mb-2">
                                        <p className="font-black text-white text-sm leading-tight font-heading drop-shadow-sm uppercase tracking-wider">{entry.action}</p>
                                        <span className="text-[9px] font-black text-[#D4AF37]/60 uppercase tracking-[0.2em] font-mono bg-[#D4AF37]/5 px-3 py-1 rounded-full border border-[#D4AF37]/10 whitespace-nowrap">
                                            {new Date(entry.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>
                                    {entry.note && <p className="text-xs text-zinc-500 font-medium italic opacity-80 leading-relaxed pl-1">{entry.note}</p>}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* View Only Notice */}
                <div className="glass-card rounded-[2rem] p-5 bg-blue-500/10 border border-blue-500/20 mt-8 mb-4">
                    <p className="text-[10px] text-blue-400 text-center font-black uppercase tracking-[0.2em] opacity-80">
                        <span className="text-white">GLOBAL OVERSIGHT ACTIVE</span> • AUTHORIZED ADMIN ONLY
                    </p>
                </div>
            </motion.main>
            <BottomNav items={adminNavItems} />
        </MobileWrapper>
    );
}
