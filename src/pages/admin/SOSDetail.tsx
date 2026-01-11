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
                <div className="flex justify-between items-start mb-6">
                    <div>
                        <h2 className="text-3xl font-black text-slate-800 font-heading tracking-tighter">{event.userName || event.studentName}</h2>
                        <div className="flex flex-wrap items-center gap-3 text-sm text-slate-500 font-bold mt-1">
                            <span className="flex items-center gap-1">
                                <User className="w-3 h-3" /> {event.role}
                            </span>
                            <span className="flex items-center gap-1">
                                <Phone className="w-3 h-3" /> {event.userPhone || 'No Phone'}
                            </span>
                        </div>
                    </div>
                    <span className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg ${!event.status.recognised ? 'bg-red-500 text-white shadow-red-500/30' :
                        !event.status.resolved ? 'bg-amber-500 text-white shadow-amber-500/30' :
                            'bg-green-500 text-white shadow-green-500/30'
                        }`}>
                        {!event.status.recognised ? 'Pending' :
                            !event.status.resolved ? 'Recognised' :
                                'Resolved'}
                    </span>
                </div>

                <div className="space-y-4">
                    {/* Location & Map Card */}
                    <div className="glass-card p-5 rounded-[2rem] border border-white/60 shadow-xl relative overflow-hidden">
                        <div className="flex items-center gap-4 mb-4 relative z-10">
                            <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center shrink-0 border border-indigo-500/20">
                                <MapPin className="w-6 h-6 text-indigo-600" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-0.5">Location</p>
                                <p className="text-sm font-bold text-slate-800 truncate leading-tight">
                                    Hostel {event.hostelId || event.hostel} • Room {event.roomNo || event.roomNumber}
                                </p>
                                <p className="text-xs text-slate-500">(Approximate)</p>
                            </div>
                        </div>

                        <button
                            onClick={() => navigate(`/admin/map/${event.id}`)}
                            className="w-full bg-gradient-to-r from-[#FF99AC] via-[#C084FC] to-[#89CFF0] text-white py-3 rounded-xl text-sm font-bold shadow-lg shadow-purple-500/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 border border-white/20 relative z-10"
                        >
                            <MapPin className="w-4 h-4" />
                            View Live Map
                            {liveLocation && (
                                <span className="animate-pulse w-2 h-2 rounded-full bg-white ml-1"></span>
                            )}
                        </button>

                        {/* Decorative Background Blur */}
                        <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl z-0"></div>
                    </div>

                    {/* Time Card */}
                    <div className="glass-card p-4 rounded-[1.5rem] border border-white/60 shadow-lg flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-orange-500/10 flex items-center justify-center shrink-0 border border-orange-500/20">
                            <Clock className="w-5 h-5 text-orange-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-0.5">Time Elapsed</p>
                            <p className="text-sm font-bold text-slate-800">{timeElapsed} minutes ago</p>
                        </div>
                    </div>

                    {/* Emergency Details */}
                    {event.emergencyType && (
                        <div className="p-4 bg-red-50/50 border border-red-200 rounded-2xl">
                            <div className="flex items-center gap-2 mb-2">
                                <AlertTriangle className="w-5 h-5 text-red-600" />
                                <h3 className="font-bold text-red-700 uppercase text-sm">Emergency Type</h3>
                            </div>
                            <div className="flex flex-wrap items-center gap-3">
                                <span className={`px-3 py-1 border rounded-lg font-bold uppercase text-xs
                                    ${event.emergencyType === 'medical' ? 'bg-red-100 text-red-700 border-red-200' :
                                        event.emergencyType === 'harassment' ? 'bg-purple-100 text-purple-700 border-purple-200' :
                                            'bg-slate-100 text-slate-700 border-slate-200'}
                                `}>
                                    {event.emergencyType}
                                </span>
                                {event.triggerMethod && (
                                    <span className="text-xs text-slate-500 italic">
                                        Triggered via: {event.triggerMethod.replace('_', ' ')}
                                    </span>
                                )}
                            </div>
                            {event.description && (
                                <p className="text-sm text-slate-600 mt-2 italic">"{event.description}"</p>
                            )}
                        </div>
                    )}

                    {/* Assignment & Actions Card */}
                    <div className="glass-card p-5 rounded-[2rem] border border-white/60 shadow-xl space-y-4">
                        {event.status.recognised && event.assignedTo ? (
                            <div className="p-4 bg-blue-50/50 border border-blue-100 rounded-xl flex justify-between items-center">
                                <div className="flex items-center gap-3">
                                    <Shield className="w-8 h-8 text-blue-600 bg-white p-1.5 rounded-lg shadow-sm" />
                                    <div>
                                        <p className="text-[10px] text-blue-600 font-bold uppercase tracking-widest">Handled By</p>
                                        <p className="text-sm font-bold text-blue-900">{event.assignedTo.name}</p>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="p-4 bg-amber-50/50 border border-amber-100 rounded-xl flex justify-between items-center">
                                <div className="flex items-center gap-3">
                                    <AlertTriangle className="w-8 h-8 text-amber-600 bg-white p-1.5 rounded-lg shadow-sm" />
                                    <div>
                                        <p className="text-[10px] text-amber-600 font-bold uppercase tracking-widest">Status</p>
                                        <p className="text-sm font-bold text-amber-900">Waiting for Security</p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Timeline */}
                <div className="glass-card rounded-[2rem] p-6 border border-white/60 shadow-lg mt-4">
                    <div className="flex items-center gap-2 mb-4">
                        <Clock className="w-5 h-5 text-indigo-600" />
                        <h3 className="text-lg font-black text-slate-800 tracking-tight">Timeline</h3>
                    </div>
                    <div className="relative border-l-2 border-indigo-100 ml-2 space-y-6 pl-6 py-2">
                        {(event.timeline || []).map((entry, idx) => (
                            <div key={idx} className="relative">
                                <div className={`absolute -left-[31px] top-0 w-4 h-4 rounded-full border-2 shadow-sm
                                    ${entry.action.includes('Triggered') ? 'bg-red-500 border-white ring-2 ring-red-100' :
                                        entry.action.includes('Recognised') ? 'bg-blue-500 border-white ring-2 ring-blue-100' :
                                            entry.action.includes('Resolved') ? 'bg-green-500 border-white ring-2 ring-green-100' :
                                                'bg-slate-200 border-white'}
                                `}></div>
                                <div className="flex flex-col gap-1">
                                    <p className="font-bold text-slate-800 text-sm">{entry.action}</p>
                                    {entry.note && <p className="text-xs text-slate-500">{entry.note}</p>}
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                        {new Date(entry.time).toLocaleString()}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* View Only Notice */}
                <div className="glass-card rounded-xl p-4 bg-blue-50/30 border border-blue-100/50 mt-4">
                    <p className="text-xs text-blue-700 text-center font-medium">
                        <strong>Admin View:</strong> Monitoring mode only.
                    </p>
                </div>
            </motion.main>
            <BottomNav items={adminNavItems} />
        </MobileWrapper>
    );
}
