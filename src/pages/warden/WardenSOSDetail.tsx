import { useParams, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import MobileWrapper from '../../components/layout/MobileWrapper';
import TopHeader from '../../components/layout/TopHeader';
import LiveMap from '../../components/LiveMap';
import { motion } from 'framer-motion';
import { containerStagger } from '../../lib/animations';
import { type SOSEvent } from '../../services/sosService';
import { callService } from '../../services/callService';
import { useAuthStore } from '../../context/authStore';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { MapPin, Clock, Shield, Phone, User, AlertTriangle, Video } from 'lucide-react';

export default function WardenSOSDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user, profile } = useAuthStore();
    const [event, setEvent] = useState<SOSEvent | null>(null);
    const [loading, setLoading] = useState(true);

    const handleCall = (destRole: 'student' | 'security', isVideo: boolean = false) => {
        if (!user || !event) return;

        // Final guard check
        const isWardenHostel = (profile?.hostelId || profile?.hostel) === event.hostelId || (profile?.hostelId || profile?.hostel) === event.hostel;
        if (!isWardenHostel) {
            alert("Security Error: You can only call participants of SOS events in your hostel.");
            return;
        }

        if (!event.status.recognised) {
            alert("Calling is disabled until Security has acknowledged the SOS.");
            return;
        }

        let receiver;
        if (destRole === 'student') {
            receiver = {
                uid: event.userId,
                name: event.userName,
                role: 'student'
            };
        } else {
            // Call Security handler
            if (!event.assignedTo) {
                alert("No security officer is currently assigned to this SOS.");
                return;
            }
            receiver = {
                uid: event.assignedTo.id,
                name: event.assignedTo.name,
                role: 'security'
            };
        }

        callService.startCall({
            uid: user.uid,
            name: profile?.name || 'Warden',
            role: 'warden'
        }, receiver, event.id, 'sos', isVideo);
    };

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
                    <button onClick={() => navigate('/warden/dashboard')} className="text-primary font-bold">
                        Return to Dashboard
                    </button>
                </div>
            </MobileWrapper>
        );
    }

    const timeElapsed = Math.floor((Date.now() - event.triggeredAt) / 1000 / 60); // minutes

    return (
        <MobileWrapper>
            <TopHeader title="SOS Event Details" showBackButton={true} />

            <motion.main
                className="px-4 pt-28 pb-24"
                variants={containerStagger}
            >
                {/* Map Section */}
                <div className="h-64 rounded-xl overflow-hidden border-2 border-surface shadow-lg">
                    <LiveMap sosEvents={[event]} />
                </div>

                {/* Event Information Card */}
                <div className="glass-card rounded-xl p-6 space-y-4">
                    <div className="flex justify-between items-start">
                        <div>
                            <h2 className="text-xl font-bold text-primary mb-1">{event.userName || event.studentName}</h2>
                            <div className="flex flex-wrap items-center gap-3 text-sm text-muted">
                                <span className="flex items-center gap-1 bg-background px-2 py-1 rounded">
                                    <User className="w-3 h-3" /> {event.role}
                                </span>
                                <span className="flex items-center gap-1 bg-background px-2 py-1 rounded">
                                    <Phone className="w-3 h-3" /> {event.userPhone || 'No Phone'}
                                </span>
                            </div>
                        </div>
                        <span className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase
                            ${!event.status.recognised ? 'bg-red-100 text-red-700' :
                                !event.status.resolved ? 'bg-amber-100 text-amber-700' :
                                    'bg-green-100 text-green-700'}
                        `}>
                            {!event.status.recognised ? 'Pending' :
                                !event.status.resolved ? 'Recognised' :
                                    'Resolved'}
                        </span>
                    </div>

                    {/* Location & Time Info */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-surface">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-primary-50 flex items-center justify-center">
                                <MapPin className="w-5 h-5 text-primary" />
                            </div>
                            <div>
                                <p className="text-xs text-muted font-bold uppercase">Location</p>
                                <p className="text-sm font-medium">
                                    Hostel {event.hostelId || event.hostel} • Room {event.roomNo || event.roomNumber}
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-warning-50 flex items-center justify-center">
                                <Clock className="w-5 h-5 text-warning" />
                            </div>
                            <div>
                                <p className="text-xs text-muted font-bold uppercase">Time Elapsed</p>
                                <p className="text-sm font-bold text-warning">{timeElapsed} minutes</p>
                            </div>
                        </div>
                    </div>

                    {/* Emergency Details */}
                    {event.emergencyType && (
                        <div className="p-4 bg-emergency/5 border border-emergency/20 rounded-lg">
                            <div className="flex items-center gap-2 mb-2">
                                <AlertTriangle className="w-5 h-5 text-emergency" />
                                <h3 className="font-bold text-emergency uppercase">Emergency Type</h3>
                            </div>
                            <div className="flex items-center gap-4">
                                <span className={`px-3 py-1 border rounded font-bold uppercase text-sm
                                    ${event.emergencyType === 'medical' ? 'bg-red-50 text-red-700 border-red-200' :
                                        event.emergencyType === 'harassment' ? 'bg-purple-50 text-purple-700 border-purple-200' :
                                            'bg-slate-50 text-slate-700 border-slate-200'}
                                `}>
                                    {event.emergencyType}
                                </span>
                                {event.triggerMethod && (
                                    <span className="text-sm text-muted italic">
                                        Triggered via: {event.triggerMethod.replace('_', ' ')}
                                    </span>
                                )}
                            </div>
                            {event.description && (
                                <p className="text-sm text-muted mt-3 italic">"{event.description}"</p>
                            )}
                        </div>
                    )}

                    {/* Assignment Info & Coordinator Calls */}
                    {event.status.recognised && event.assignedTo && (
                        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg space-y-3">
                            <div className="flex justify-between items-center">
                                <div className="flex items-center gap-2">
                                    <Shield className="w-5 h-5 text-blue-600" />
                                    <div>
                                        <p className="text-sm font-bold text-blue-800">Assigned Security</p>
                                        <p className="text-xs text-blue-600">{event.assignedTo.name}</p>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => handleCall('security', false)}
                                        className="p-2 bg-white border border-blue-200 text-blue-600 rounded-lg active:scale-90 transition-all hover:bg-blue-50"
                                        title="Voice Call Security"
                                    >
                                        <Phone className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => handleCall('security', true)}
                                        className="p-2 bg-white border border-blue-200 text-blue-600 rounded-lg active:scale-90 transition-all hover:bg-blue-50"
                                        title="Video Call Security"
                                    >
                                        <Video className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Calling Actions */}
                    <div className="pt-2 border-t border-surface">
                        <div className="flex justify-between items-center bg-background p-4 rounded-xl border border-surface">
                            <div>
                                <p className="text-xs text-muted font-bold uppercase">Call Student</p>
                                <p className="text-sm font-medium">{event.userName}</p>
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => handleCall('student', false)}
                                    disabled={!event.status.recognised}
                                    className={`p-2.5 rounded-xl border flex items-center justify-center transition-all active:scale-95 ${event.status.recognised
                                        ? 'bg-secondary/10 text-secondary border-secondary/20 hover:bg-secondary/20'
                                        : 'bg-slate-50 text-slate-400 border-slate-100 cursor-not-allowed opacity-50'
                                        }`}
                                >
                                    <Phone className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={() => handleCall('student', true)}
                                    disabled={!event.status.recognised}
                                    className={`p-2.5 rounded-xl border flex items-center justify-center transition-all active:scale-95 ${event.status.recognised
                                        ? 'bg-amber-50 text-amber-600 border-amber-100 hover:bg-amber-100'
                                        : 'bg-slate-50 text-slate-400 border-slate-100 cursor-not-allowed opacity-50'
                                        }`}
                                >
                                    <Video className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                        {!event.status.recognised && (
                            <p className="text-[10px] text-center text-amber-600 font-bold mt-2">
                                🔒 CALLING ENABLED AFTER SECURITY ACKNOWLEDGEMENT
                            </p>
                        )}
                    </div>
                </div>

                {/* Timeline */}
                <div className="glass-card rounded-xl p-6">
                    <h3 className="text-lg font-bold text-primary mb-4">Incident Timeline</h3>
                    <div className="relative border-l-2 border-surface ml-2 space-y-6 pl-6 py-2">
                        {(event.timeline || []).map((entry, idx) => (
                            <div key={idx} className="relative">
                                <div className={`absolute -left-[31px] top-0 w-4 h-4 rounded-full border-2 
                                    ${entry.action.includes('Triggered') ? 'bg-red-500 border-red-500' :
                                        entry.action.includes('Recognised') ? 'bg-blue-500 border-blue-500' :
                                            entry.action.includes('Resolved') ? 'bg-green-500 border-green-500' :
                                                'bg-surface border-primary'}
                                `}></div>
                                <div className="flex flex-col gap-1">
                                    <p className="font-bold text-primary text-sm">{entry.action}</p>
                                    {entry.note && <p className="text-xs text-muted">{entry.note}</p>}
                                    <span className="text-xs font-mono text-muted bg-background px-2 py-1 rounded self-start">
                                        {new Date(entry.time).toLocaleString()}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* View Only Notice */}
                <div className="glass-card rounded-xl p-4 bg-blue-50/50 border border-blue-200">
                    <p className="text-sm text-blue-700 text-center">
                        <strong>Warden View:</strong> You are viewing this SOS in read-only mode. Only Security personnel can take action on SOS events.
                    </p>
                </div>
            </motion.main>
        </MobileWrapper>
    );
}
