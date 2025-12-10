import { useState, useRef, useEffect } from 'react';
import { Mic, MicOff, MapPin, Loader2 } from 'lucide-react';
import { sosService } from '../../services/sosService';
import { useAuthStore } from '../../context/authStore';

export default function SOSButton() {
    const { user, profile } = useAuthStore();
    const [isLongPressing, setIsLongPressing] = useState(false);
    const [progress, setProgress] = useState(0);
    const [isActive, setIsActive] = useState(false);
    const [audioEnabled, setAudioEnabled] = useState(false);
    const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
    const [locationStatus, setLocationStatus] = useState('Locating...');
    const [sosId, setSosId] = useState<string | null>(null);

    const timerRef = useRef<any>(null);
    const startTimeRef = useRef<number>(0);

    // Get Location on Mount
    useEffect(() => {
        if ('geolocation' in navigator) {
            const watchId = navigator.geolocation.watchPosition(
                (position) => {
                    setLocation({
                        lat: position.coords.latitude,
                        lng: position.coords.longitude
                    });
                    setLocationStatus('Location Active');
                },
                (error) => {
                    console.error('Location error:', error);
                    setLocationStatus('Location Error');
                },
                { enableHighAccuracy: true }
            );
            return () => navigator.geolocation.clearWatch(watchId);
        } else {
            setLocationStatus('GPS Not Supported');
        }
    }, []);

    const handleMouseDown = () => {
        if (isActive) return;
        setIsLongPressing(true);
        startTimeRef.current = Date.now();

        timerRef.current = setInterval(() => {
            const elapsed = Date.now() - startTimeRef.current;
            const newProgress = Math.min((elapsed / 3000) * 100, 100);
            setProgress(newProgress);

            if (newProgress >= 100) {
                activateSOS();
            }
        }, 50);
    };

    const handleMouseUp = () => {
        if (isActive) return;
        setIsLongPressing(false);
        setProgress(0);
        if (timerRef.current) clearInterval(timerRef.current);
    };

    const activateSOS = async () => {
        if (timerRef.current) clearInterval(timerRef.current);
        setIsActive(true);

        if (!user || !location) {
            alert("Cannot trigger SOS: Missing user or location data.");
            setIsActive(false);
            return;
        }

        try {
            // Merge user auth object with profile data to ensure all fields (hostel, roomNo) are present
            const sosUser = { ...user, ...profile };
            const id = await sosService.triggerSOS(sosUser, location, audioEnabled ? 'audio-placeholder-url' : undefined);
            setSosId(id);
            console.log('SOS ACTIVATED', id);
        } catch (error) {
            console.error("Failed to trigger SOS", error);
            alert("Failed to send SOS alert. Please call emergency contacts directly.");
            setIsActive(false);
        }
    };

    const cancelSOS = async () => {
        if (!confirm("Are you sure you want to cancel the emergency alert?")) return;

        if (sosId && user) {
            await sosService.resolveSOS(sosId, user.uid, "Cancelled by student");
        }

        setIsActive(false);
        setProgress(0);
        setIsLongPressing(false);
        setSosId(null);
    };

    return (
        <div className="flex flex-col items-center justify-center w-full py-8 relative overflow-hidden">
            {/* Pulse Effects */}
            {isLongPressing && !isActive && (
                <div className="absolute w-64 h-64 rounded-full bg-red-100 animate-ping opacity-75" />
            )}
            {isActive && (
                <div className="absolute w-96 h-96 rounded-full bg-red-500 animate-ping opacity-20 duration-1000" />
            )}

            {/* Main Button */}
            <button
                onMouseDown={handleMouseDown}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                onTouchStart={handleMouseDown}
                onTouchEnd={handleMouseUp}
                className={`relative w-48 h-48 rounded-full flex items-center justify-center shadow-xl transition-all duration-300
                    ${isActive ? 'bg-red-600 scale-110' : 'bg-gradient-to-br from-red-500 to-red-600 hover:scale-105'}
                    ${isLongPressing ? 'scale-95' : ''}
                `}
            >
                {/* Progress Ring */}
                {!isActive && (
                    <svg className="absolute inset-0 w-full h-full -rotate-90 pointer-events-none">
                        <circle
                            cx="96" cy="96" r="92"
                            fill="none"
                            stroke="white"
                            strokeWidth="4"
                            strokeDasharray="578"
                            strokeDashoffset={578 - (578 * progress) / 100}
                            className="opacity-50"
                        />
                    </svg>
                )}

                <div className="text-center text-white z-10">
                    <span className="text-4xl font-black tracking-wider block mb-1">SOS</span>
                    <span className="text-xs font-medium opacity-90 uppercase tracking-wide">
                        {isActive ? 'ACTIVATED' : 'Hold 3 Sec'}
                    </span>
                </div>
            </button>

            {/* Controls */}
            <div className="mt-8 flex items-center gap-6 z-10">
                <button
                    onClick={() => setAudioEnabled(!audioEnabled)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors
                        ${audioEnabled ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}
                    `}
                >
                    {audioEnabled ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
                    {audioEnabled ? 'Audio On' : 'Audio Off'}
                </button>

                <div className="flex items-center gap-2 text-slate-500 text-sm">
                    {locationStatus === 'Locating...' ? <Loader2 className="w-4 h-4 animate-spin" /> : <MapPin className="w-4 h-4" />}
                    <span>{locationStatus}</span>
                </div>
            </div>

            {isActive && (
                <div className="mt-6 text-center">
                    <p className="text-red-600 font-bold animate-pulse mb-2">Emergency Alert Sent!</p>
                    <p className="text-xs text-slate-500 mb-4">Security and Wardens have been notified.</p>
                    <button
                        onClick={cancelSOS}
                        className="text-sm text-slate-400 underline hover:text-slate-600"
                    >
                        Cancel Emergency
                    </button>
                </div>
            )}
        </div>
    );
}
