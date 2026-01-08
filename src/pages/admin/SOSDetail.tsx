import { useParams, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
import LiveMap from '../../components/LiveMap';
import { type SOSEvent } from '../../services/sosService';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { MapPin, Clock, Shield, Phone, User, AlertTriangle, ArrowLeft } from 'lucide-react';

export default function AdminSOSDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [event, setEvent] = useState<SOSEvent | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!id) return;

        // Subscribe to specific SOS event
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
            <Layout role="admin">
                <div className="flex items-center justify-center h-full">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                </div>
            </Layout>
        );
    }

    if (!event) {
        return (
            <Layout role="admin">
                <div className="p-4 text-center">
                    <p className="text-muted mb-4">This SOS event does not exist or has been removed.</p>
                    <button onClick={() => navigate('/admin/dashboard')} className="text-primary font-bold">
                        Return to Dashboard
                    </button>
                </div>
            </Layout>
        );
    }

    const timeElapsed = Math.floor((Date.now() - event.triggeredAt) / 1000 / 60); // minutes

    return (
        <Layout role="admin">
            <div className="space-y-4">
                {/* Header */}
                <div className="flex items-center gap-3">
                    <button onClick={() => navigate('/admin/dashboard')} className="text-primary hover:text-primary-dark">
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <h1 className="text-2xl font-bold text-primary">SOS Event Details</h1>
                </div>

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

                    {/* Assignment Info */}
                    {event.status.recognised && event.assignedTo && (
                        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                            <div className="flex items-center gap-2">
                                <Shield className="w-5 h-5 text-blue-600" />
                                <div>
                                    <p className="text-sm font-bold text-blue-800">Assigned to Security</p>
                                    <p className="text-xs text-blue-600">{event.assignedTo.name}</p>
                                </div>
                            </div>
                        </div>
                    )}
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
                        <strong>Admin View:</strong> You are viewing this SOS in read-only mode. Only Security personnel can take action on SOS events.
                    </p>
                </div>
            </div>
        </Layout>
    );
}
