import { useState, useEffect } from 'react';
import { Phone, User, Shield, CheckCircle, MapPin, Clock, AlertTriangle } from 'lucide-react';
import { type SOSEvent } from '../../services/sosService';
import { callService } from '../../services/callService';
import { useAuthStore } from '../../context/authStore';
import EventDetailMap from '../map/EventDetailMap';
import { mapService, type LocationData } from '../../services/mapService';

interface SOSDetailPanelProps {
    event: SOSEvent;
    onRecognise: (eventId: string) => void;
    onResolve: (eventId: string) => void;
    onTrack: (eventId: string) => void;
}

export default function SOSDetailPanel({ event, onRecognise, onResolve, onTrack }: SOSDetailPanelProps) {
    const { user } = useAuthStore();
    const timeElapsed = Math.floor((Date.now() - event.triggeredAt) / 1000 / 60); // minutes
    const [liveLocation, setLiveLocation] = useState<LocationData | null>(null);

    useEffect(() => {
        if (!event.userId) return;
        const unsubscribe = mapService.subscribeToSingleLocation(event.userId, (data) => {
            setLiveLocation(data);
        });
        return () => unsubscribe();
    }, [event.userId]);

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
        <div className="bg-[#0a0a0a] rounded-2xl shadow-2xl border border-[#D4AF37]/10 overflow-hidden flex flex-col h-full">
            {/* Map Section */}
            <div className="h-64 relative border-b border-[#D4AF37]/10 shadow-sm z-0">
                <div className="h-full w-full">
                    <EventDetailMap
                        userName={event.userName}
                        eventType="SOS"
                        location={liveLocation}
                        center={
                            liveLocation ? { lat: liveLocation.latitude, lng: liveLocation.longitude } :
                                (typeof event.location === 'object' && event.location !== null && 'lat' in event.location) ?
                                    { lat: (event.location as any).lat, lng: (event.location as any).lng } :
                                    { lat: 21.1259, lng: 79.0525 }
                        }
                    />
                </div>
                <div className="absolute top-4 right-4 z-[400]">
                    <button
                        onClick={() => onTrack(event.id)}
                        className="bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-xl border border-[#D4AF37]/20 shadow-md text-xs font-black text-[#D4AF37] uppercase tracking-widest hover:bg-black/80 flex items-center gap-2"
                    >
                        <MapPin className="w-4 h-4" />
                        Live Track
                    </button>
                </div>
            </div>

            {/* Content Section */}
            <div className="flex-1 p-6 overflow-y-auto">
                {/* Header Info */}
                <div className="flex justify-between items-start mb-6">
                    <div>
                        <h2 className="text-3xl font-black text-white font-heading tracking-tight mb-1">{event.userName}</h2>
                        <div className="flex flex-wrap items-center gap-4 text-xs text-zinc-400 font-bold uppercase tracking-widest">
                            <span className="flex items-center gap-1.5 bg-white/5 px-2.5 py-1 rounded-lg border border-white/10">
                                <Phone className="w-3.5 h-3.5 text-[#D4AF37]" /> {event.userPhone || 'No Phone'}
                            </span>
                            <span className="flex items-center gap-1.5 bg-white/5 px-2.5 py-1 rounded-lg border border-white/10">
                                <User className="w-3.5 h-3.5 text-[#D4AF37]" /> {event.role}
                            </span>
                            {event.hostelId && (
                                <span className="flex items-center gap-1.5 bg-[#D4AF37]/10 text-[#D4AF37] px-2.5 py-1 rounded-lg border border-[#D4AF37]/20 font-black">
                                    {event.hostelId} • RM {event.roomNo}
                                </span>
                            )}
                        </div>
                        {event.status.recognised && event.assignedTo && (
                            <div className="mt-4 flex items-center gap-3 text-xs bg-[#D4AF37]/10 text-[#D4AF37] px-4 py-2 rounded-xl border border-[#D4AF37]/20 font-black uppercase tracking-widest">
                                <Shield className="w-4 h-4" />
                                <span>Assigned: {event.assignedTo.name}</span>
                            </div>
                        )}
                    </div>

                    <div className="text-right">
                        <p className="text-[10px] text-zinc-500 font-black uppercase tracking-widest flex items-center justify-end gap-1.5 mb-1">
                            <Clock className="w-3 h-3" /> Elapsed
                        </p>
                        <p className="text-3xl font-black text-red-500 drop-shadow-[0_0_10px_rgba(239,68,68,0.3)]">
                            {timeElapsed}m
                        </p>
                    </div>
                </div>

                {/* Emergency Details Section */}
                {(event.emergencyType || event.description || event.voiceTranscript) && (
                    <div className="mb-6 p-5 bg-red-500/5 border border-red-500/20 rounded-[24px] space-y-4">
                        <div className="flex items-center gap-2 mb-1">
                            <AlertTriangle className="w-5 h-5 text-red-500" />
                            <h3 className="font-black text-red-500 uppercase text-xs tracking-[0.2em]">Emergency Context</h3>
                        </div>

                        {event.emergencyType && (
                            <div className="flex flex-wrap items-center gap-4">
                                <div className="flex items-center gap-2">
                                    <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Type:</span>
                                    <span className={`px-3 py-1 border rounded-lg text-xs font-black uppercase tracking-[0.1em]
                                        ${event.emergencyType === 'medical' ? 'bg-red-500/10 text-red-500 border-red-500/20' :
                                            event.emergencyType === 'harassment' ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' :
                                                'bg-white/5 text-zinc-300 border-white/10'}
                                    `}>
                                        {event.emergencyType}
                                    </span>
                                </div>
                                {event.triggerMethod && (
                                    <div className="flex items-center gap-2">
                                        <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Trigger:</span>
                                        <span className="px-3 py-1 bg-[#D4AF37]/10 border border-[#D4AF37]/20 rounded-lg text-xs font-black text-[#D4AF37] uppercase italic">
                                            {event.triggerMethod.replace('_', ' ')}
                                        </span>
                                    </div>
                                )}
                            </div>
                        )}

                        {event.description && (
                            <div>
                                <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest block mb-2">Description:</span>
                                <p className="text-sm text-white bg-white/5 p-4 rounded-2xl border border-white/5 italic leading-relaxed">
                                    "{event.description}"
                                </p>
                            </div>
                        )}

                        {event.voiceTranscript && (
                            <div>
                                <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest block mb-2">Voice Transcript:</span>
                                <p className="text-xs text-zinc-400 bg-white/5 p-4 rounded-2xl border border-white/5 font-mono leading-relaxed">
                                    <span className="text-red-500 mr-2">🎤</span> {event.voiceTranscript}
                                </p>
                            </div>
                        )}
                    </div>
                )}

                {/* Emergency Contact */}
                <div className="mb-6 p-5 bg-[#D4AF37]/5 border border-[#D4AF37]/20 rounded-[24px]">
                    <h3 className="text-[10px] font-black text-[#D4AF37] uppercase mb-4 flex items-center gap-2 tracking-[0.2em]">
                        <AlertTriangle className="w-3.5 h-3.5" /> Next of Kin
                    </h3>
                    <div className="flex justify-between items-center bg-white/5 p-3 rounded-2xl border border-white/5">
                        <span className="font-black text-white text-sm">Emergency Contact Pool</span>
                        <div className="flex gap-2">
                            <a href={`tel:${event.userPhone}`} className="bg-white/5 border border-white/10 text-white px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-white/10 transition-colors">
                                Call GSM
                            </a>
                            <button
                                onClick={initiateCall}
                                className="bg-gradient-to-br from-[#CF9E1B] via-[#D4AF37] to-[#8B6E13] text-black px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest shadow-lg active:scale-95 transition-all"
                            >
                                Web Portal Call
                            </button>
                        </div>
                    </div>
                </div>

                {/* Timeline */}
                <div className="mb-6">
                    <h3 className="text-xs font-black text-[#D4AF37] mb-4 uppercase tracking-[0.2em]">Tactical Timeline</h3>
                    <div className="relative border-l-2 border-[#D4AF37]/10 ml-2 space-y-6 pl-6 py-2">
                        {(event.timeline || []).map((entry, idx) => (
                            <div key={idx} className="relative">
                                <div className="absolute -left-[31px] top-0 w-3.5 h-3.5 rounded-full bg-black border-2 border-[#D4AF37]"></div>
                                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-1">
                                    <div className="bg-white/5 p-3 rounded-xl border border-white/5 flex-1 w-full">
                                        <p className="font-black text-white text-sm">{entry.action}</p>
                                        {entry.note && <p className="text-xs text-zinc-400 mt-1 italic font-medium">"{entry.note}"</p>}
                                        <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mt-2 flex items-center gap-1.5">
                                            <Shield className="w-3 h-3" /> {entry.by}
                                        </p>
                                    </div>
                                    <span className="text-[10px] font-black text-zinc-500 bg-white/5 px-2 py-1 rounded-lg border border-white/5 self-start mt-1">
                                        {new Date(entry.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-auto pt-6 border-t border-[#D4AF37]/10">
                    {!event.status.recognised && (
                        <button
                            onClick={() => onRecognise(event.id)}
                            className="col-span-2 bg-gradient-to-br from-indigo-500 to-indigo-700 text-white py-4 rounded-[20px] font-black uppercase tracking-widest hover:opacity-90 transition-all flex items-center justify-center gap-2 shadow-2xl active:scale-95"
                        >
                            <Shield className="w-5 h-5" />
                            Acknowledge Call
                        </button>
                    )}

                    {event.status.recognised && !event.status.resolved && (
                        <button
                            onClick={() => onResolve(event.id)}
                            className="col-span-2 bg-gradient-to-br from-emerald-500 to-emerald-700 text-white py-4 rounded-[20px] font-black uppercase tracking-widest hover:opacity-90 transition-all flex items-center justify-center gap-2 shadow-2xl active:scale-95"
                        >
                            <CheckCircle className="w-5 h-5" />
                            Resolve Situation
                        </button>
                    )}

                    {event.status.resolved && (
                        <div className="col-span-2 text-center py-4 bg-emerald-500/10 border border-emerald-500/20 rounded-[20px] text-emerald-500 font-black uppercase tracking-[0.2em] text-xs">
                            ✓ Situation Secured & Resolved
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
