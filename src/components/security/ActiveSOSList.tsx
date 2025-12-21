import { useEffect, useRef, useState } from 'react';
import { Shield, MapPin, Volume2, VolumeX } from 'lucide-react';
import { type SOSEvent } from '../../services/sosService';

interface ActiveSOSListProps {
    events: SOSEvent[];
    selectedEventId: string | undefined;
    onSelect: (event: SOSEvent) => void;
}

export default function ActiveSOSList({ events, selectedEventId, onSelect }: ActiveSOSListProps) {
    const [soundEnabled, setSoundEnabled] = useState(true);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    // Initialize audio
    useEffect(() => {
        audioRef.current = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3'); // Emergency siren sound
        audioRef.current.loop = true;
    }, []);

    // Handle audio playback
    useEffect(() => {
        if (!audioRef.current) return;

        const hasActiveEvents = events.some(e => e.status === 'active');

        if (hasActiveEvents && soundEnabled) {
            audioRef.current.play().catch(e => console.log("Audio play failed (interaction required):", e));
        } else {
            audioRef.current.pause();
            audioRef.current.currentTime = 0;
        }

        return () => {
            audioRef.current?.pause();
        };
    }, [events, soundEnabled]);

    return (
        <div className="bg-surface rounded-xl shadow-sm border border-surface overflow-hidden flex flex-col h-full">
            <div className="p-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
                <h2 className="font-bold text-primary flex items-center gap-2">
                    <span className="relative flex h-3 w-3">
                        <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${events.length > 0 ? 'bg-red-400' : 'bg-slate-400'}`}></span>
                        <span className={`relative inline-flex rounded-full h-3 w-3 ${events.length > 0 ? 'bg-red-500' : 'bg-slate-500'}`}></span>
                    </span>
                    Active Alerts ({events.length})
                </h2>
                <button
                    onClick={() => setSoundEnabled(!soundEnabled)}
                    className={`p-2 rounded-full hover:bg-slate-200 transition-colors ${soundEnabled ? 'text-slate-700' : 'text-slate-400'}`}
                    title={soundEnabled ? "Mute Alerts" : "Enable Alerts"}
                >
                    {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                </button>
            </div>

            <div className="overflow-y-auto flex-1 p-2 space-y-2">
                {events.length === 0 ? (
                    <div className="text-center p-8 text-slate-500">
                        <Shield className="w-12 h-12 mx-auto mb-2 opacity-20" />
                        <p>No active SOS alerts.</p>
                        <p className="text-xs">System is monitoring...</p>
                    </div>
                ) : (
                    events.map(event => (
                        <div
                            key={event.id}
                            onClick={() => onSelect(event)}
                            className={`p-4 rounded-lg border cursor-pointer transition-all
                                ${selectedEventId === event.id
                                    ? 'bg-red-50 border-red-200 ring-1 ring-red-200'
                                    : 'bg-white border-slate-100 hover:border-red-100 hover:bg-slate-50'}
                            `}
                        >
                            <div className="flex justify-between items-start mb-2">
                                <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase
                                    ${event.status === 'active' ? 'bg-red-100 text-red-700 animate-pulse' : 'bg-amber-100 text-amber-700'}
                                `}>
                                    {event.status}
                                </span>
                                <span className="text-xs text-slate-500 font-mono">
                                    {new Date(event.triggeredAt).toLocaleTimeString()}
                                </span>
                            </div>
                            <h3 className="font-bold text-slate-800">{event.userName}</h3>

                            {/* Emergency Type Badge */}
                            <div className="mt-2 flex flex-wrap gap-2">
                                {event.emergencyType && (
                                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold border uppercase
                                        ${event.emergencyType === 'medical' ? 'bg-red-100 text-red-700 border-red-200' :
                                            event.emergencyType === 'harassment' ? 'bg-purple-100 text-purple-700 border-purple-200' :
                                                'bg-slate-100 text-slate-700 border-slate-200'}
                                    `}>
                                        <Shield className="w-3 h-3" />
                                        {event.emergencyType}
                                    </span>
                                )}
                                {event.triggerMethod && (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-blue-50 text-blue-700 border border-blue-100 uppercase italic">
                                        {event.triggerMethod.replace('_', ' ')}
                                    </span>
                                )}
                            </div>

                            <p className="text-xs text-slate-500 flex items-center gap-1 mt-1">
                                <MapPin className="w-3 h-3" />
                                {event.location.address || `Lat: ${event.location.lat.toFixed(4)}`}
                            </p>
                            {event.hostelId && (
                                <p className="text-xs text-slate-500 mt-1">
                                    Hostel: {event.hostelId} • Room: {event.roomNo}
                                </p>
                            )}
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
