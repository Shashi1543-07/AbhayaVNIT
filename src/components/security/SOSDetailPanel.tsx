import { Phone, User, Shield, CheckCircle, MapPin, Clock, AlertTriangle } from 'lucide-react';
import { type SOSEvent } from '../../services/sosService';
import { callService } from '../../services/callService';
import { useAuthStore } from '../../context/authStore';
import LiveMap from '../LiveMap';

interface SOSDetailPanelProps {
    event: SOSEvent;
    onRecognise: (eventId: string) => void;
    onResolve: (eventId: string) => void;
    onTrack: (eventId: string) => void;
}

export default function SOSDetailPanel({ event, onRecognise, onResolve, onTrack }: SOSDetailPanelProps) {
    const { user } = useAuthStore();
    const timeElapsed = Math.floor((Date.now() - event.triggeredAt) / 1000 / 60); // minutes

    const initiateCall = () => {
        if (!user) return;
        const receiver = {
            uid: event.userId,
            name: event.userName,
            role: 'student'
        };
        callService.startCall(user, receiver, event.id, 'sos');
    };

    return (
        <div className="bg-surface rounded-2xl shadow-sm border border-surface overflow-hidden flex flex-col h-full">
            {/* Map Section */}
            <div className="h-64 relative border-b-4 border-surface shadow-sm z-0">
                <LiveMap sosEvents={[event]} />
                <div className="absolute top-4 right-4 z-[400]">
                    <button
                        onClick={() => onTrack(event.id)}
                        className="bg-surface px-3 py-1.5 rounded-xl shadow-md text-sm font-bold text-primary hover:bg-primary-50 flex items-center gap-2"
                    >
                        <MapPin className="w-4 h-4 text-primary" />
                        Refresh Location
                    </button>
                </div>
            </div>

            {/* Content Section */}
            <div className="flex-1 p-6 overflow-y-auto">
                {/* Header Info */}
                <div className="flex justify-between items-start mb-6">
                    <div>
                        <h2 className="text-2xl font-bold text-primary mb-1">{event.userName}</h2>
                        <div className="flex flex-wrap items-center gap-4 text-sm text-muted">
                            <span className="flex items-center gap-1 bg-background px-2 py-1 rounded">
                                <Phone className="w-3 h-3" /> {event.userPhone || 'No Phone'}
                            </span>
                            <span className="flex items-center gap-1 bg-background px-2 py-1 rounded uppercase">
                                <User className="w-3 h-3" /> {event.role}
                            </span>
                            {event.hostelId && (
                                <span className="flex items-center gap-1 bg-primary-50 text-primary px-2 py-1 rounded font-medium">
                                    Hostel {event.hostelId} • Room {event.roomNo}
                                </span>
                            )}
                        </div>
                        {event.status.recognised && event.assignedTo && (
                            <div className="mt-2 flex items-center gap-2 text-sm bg-blue-50 text-blue-700 px-3 py-1.5 rounded-lg inline-flex">
                                <Shield className="w-4 h-4" />
                                <span className="font-medium">Assigned to: {event.assignedTo.name}</span>
                            </div>
                        )}
                    </div>

                    <div className="text-right">
                        <p className="text-sm text-muted flex items-center justify-end gap-1">
                            <Clock className="w-3 h-3" /> Time Elapsed
                        </p>
                        <p className="text-2xl font-mono font-bold text-emergency animate-pulse">
                            {timeElapsed}m
                        </p>
                    </div>
                </div>

                {/* Emergency Details Section */}
                {(event.emergencyType || event.description || event.voiceTranscript) && (
                    <div className="mb-6 p-4 bg-emergency/10 border border-emergency/20 rounded-xl space-y-3">
                        <div className="flex items-center gap-2 mb-2">
                            <AlertTriangle className="w-5 h-5 text-emergency" />
                            <h3 className="font-bold text-emergency uppercase">Emergency Details</h3>
                        </div>

                        {event.emergencyType && (
                            <div className="flex items-center gap-4">
                                <div className="flex items-center gap-2">
                                    <span className="text-sm font-bold text-muted">Type:</span>
                                    <span className={`px-2 py-1 border rounded text-sm font-bold uppercase
                                        ${event.emergencyType === 'medical' ? 'bg-red-50 text-red-700 border-red-200' :
                                            event.emergencyType === 'harassment' ? 'bg-purple-50 text-purple-700 border-purple-200' :
                                                'bg-slate-50 text-slate-700 border-slate-200'}
                                    `}>
                                        {event.emergencyType}
                                    </span>
                                </div>
                                {event.triggerMethod && (
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm font-bold text-muted">Method:</span>
                                        <span className="px-2 py-1 bg-blue-50 border border-blue-100 rounded text-sm font-medium text-blue-700 uppercase italic">
                                            {event.triggerMethod.replace('_', ' ')}
                                        </span>
                                    </div>
                                )}
                            </div>
                        )}

                        {event.description && (
                            <div>
                                <span className="text-sm font-bold text-muted block mb-1">Description:</span>
                                <p className="text-sm text-primary bg-surface p-2 rounded border border-surface italic">
                                    "{event.description}"
                                </p>
                            </div>
                        )}

                        {event.voiceTranscript && (
                            <div>
                                <span className="text-sm font-bold text-muted block mb-1">Voice Transcript:</span>
                                <p className="text-sm text-muted bg-background p-2 rounded border border-surface font-mono text-xs">
                                    🎤 {event.voiceTranscript}
                                </p>
                            </div>
                        )}
                    </div>
                )}

                {/* Emergency Contact (Mock) */}
                <div className="mb-6 p-4 bg-emergency/10 border border-emergency/20 rounded-xl">
                    <h3 className="text-xs font-bold text-emergency uppercase mb-2 flex items-center gap-2">
                        <AlertTriangle className="w-3 h-3" /> Emergency Contact
                    </h3>
                    <div className="flex justify-between items-center">
                        <span className="font-medium text-primary">Mother</span>
                        <a href={`tel:${event.userPhone}`} className="bg-surface border border-emergency/30 text-emergency px-3 py-1 rounded text-sm font-bold hover:bg-emergency/5">
                            GSM Call
                        </a>
                        <button
                            onClick={initiateCall}
                            className="bg-primary text-white px-3 py-1 rounded text-sm font-bold hover:bg-primary/90 flex items-center gap-1"
                        >
                            <Phone className="w-3 h-3" /> Web Call
                        </button>
                    </div>
                </div>

                {/* Timeline */}
                <div className="mb-6">
                    <h3 className="text-sm font-bold text-primary mb-3">Incident Timeline</h3>
                    <div className="relative border-l-2 border-surface ml-2 space-y-6 pl-6 py-2">
                        {(event.timeline || []).map((entry, idx) => (
                            <div key={idx} className="relative">
                                <div className="absolute -left-[31px] top-0 w-4 h-4 rounded-full bg-surface border-2 border-primary"></div>
                                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-1">
                                    <div>
                                        <p className="font-bold text-primary text-sm">{entry.action}</p>
                                        {entry.note && <p className="text-xs text-muted mt-0.5">{entry.note}</p>}
                                        <p className="text-xs text-muted mt-1">By: {entry.by}</p>
                                    </div>
                                    <span className="text-xs font-mono text-muted bg-background px-2 py-1 rounded self-start">
                                        {new Date(entry.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-auto pt-4 border-t border-surface">
                    {!event.status.recognised && (
                        <button
                            onClick={() => onRecognise(event.id)}
                            className="col-span-2 bg-indigo-600 text-white py-3 rounded-2xl font-bold hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2 shadow-sm"
                        >
                            <Shield className="w-5 h-5" />
                            Recognise SOS
                        </button>
                    )}

                    {event.status.recognised && !event.status.resolved && (
                        <button
                            onClick={() => onResolve(event.id)}
                            className="col-span-2 bg-indigo-600 text-white py-3 rounded-2xl font-bold hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2 shadow-sm"
                        >
                            <CheckCircle className="w-5 h-5" />
                            Mark Resolved
                        </button>
                    )}

                    {event.status.resolved && (
                        <div className="col-span-2 text-center py-3 text-success font-bold">
                            ✓ This SOS has been resolved
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
