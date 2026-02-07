import { useState } from 'react';
import { MapPin, Clock, MessageSquare, Navigation } from 'lucide-react';
import { safeWalkService, type SafeWalkRequest as SafeWalkRequestType } from '../../services/safeWalkService';
import { useAuthStore } from '../../context/authStore';

interface SafeWalkRequestProps {
    onWalkStarted: (walkId: string) => void;
}

const DESTINATIONS = [
    { name: 'Hostel 1', lat: 21.123, lng: 79.051 }, // Mock coords
    { name: 'Hostel 6', lat: 21.124, lng: 79.052 },
    { name: 'Library', lat: 21.125, lng: 79.053 },
    { name: 'Main Gate', lat: 21.126, lng: 79.054 },
    { name: 'Department', lat: 21.127, lng: 79.055 },
];

export default function SafeWalkRequest({ onWalkStarted }: SafeWalkRequestProps) {
    const { user, profile } = useAuthStore();
    const [loading, setLoading] = useState(false);
    const [destination, setDestination] = useState(DESTINATIONS[0]);
    const [duration, setDuration] = useState(10);
    const [message, setMessage] = useState('');

    const handleStartWalk = async () => {
        if (!user) return;
        setLoading(true);

        try {
            // Get current location
            const position = await new Promise<GeolocationPosition>((resolve, reject) => {
                navigator.geolocation.getCurrentPosition(resolve, reject, {
                    enableHighAccuracy: true,
                    timeout: 10000,
                    maximumAge: 0
                });
            });

            const requestData: SafeWalkRequestType = {
                userId: user.uid,
                userName: profile?.name || user.displayName || 'Student',
                phone: profile?.phone || '',
                hostelId: profile?.hostelId || profile?.hostel || '',
                startLocation: {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude,
                    name: 'Current Location'
                },
                destination: {
                    lat: destination.lat,
                    lng: destination.lng,
                    name: destination.name
                },
                expectedDuration: duration,
                note: message
            };

            const walkId = await safeWalkService.startSafeWalk(requestData);
            onWalkStarted(walkId);

        } catch (error) {
            console.error("Failed to start Safe Walk:", error);
            alert("Failed to start Safe Walk. Please check your location settings.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col h-full min-h-[calc(100vh-140px)]">
            <div className="flex-1 space-y-6">
                <div className="text-center">
                    <div className="bg-primary/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Navigation className="w-8 h-8 text-primary" />
                    </div>
                    <h2 className="text-xl font-bold text-primary">Start Safe Walk</h2>
                    <p className="text-sm text-muted mt-1">
                        Security will monitor your location until you reach your destination.
                    </p>
                </div>

                <div className="space-y-4">
                    {/* Destination Selection */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-muted flex items-center">
                            <MapPin className="w-4 h-4 mr-2" />
                            Destination
                        </label>
                        <select
                            value={destination.name}
                            onChange={(e) => setDestination(DESTINATIONS.find(d => d.name === e.target.value) || DESTINATIONS[0])}
                            className="w-full p-3 rounded-2xl bg-background border border-surface focus:outline-none focus:ring-2 focus:ring-primary/50"
                        >
                            {DESTINATIONS.map(dest => (
                                <option key={dest.name} value={dest.name}>{dest.name}</option>
                            ))}
                        </select>
                    </div>

                    {/* Duration Selection */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-muted flex items-center justify-between">
                            <span className="flex items-center">
                                <Clock className="w-4 h-4 mr-2" />
                                Expected Duration
                            </span>
                            <span className="text-primary font-bold">{duration} min</span>
                        </label>

                        {/* Range Slider */}
                        <input
                            type="range"
                            min="1"
                            max="60"
                            step="1"
                            value={duration}
                            onChange={(e) => setDuration(Number(e.target.value))}
                            className="w-full h-2 bg-surface rounded-lg appearance-none cursor-pointer accent-primary"
                            style={{
                                background: `linear-gradient(to right, #C084FC 0%, #C084FC ${(duration / 60) * 100}%, #E3E6EB ${(duration / 60) * 100}%, #E3E6EB 100%)`
                            }}
                        />

                        {/* Quick Duration Buttons */}
                        <div className="flex gap-2 flex-wrap">
                            {[5, 10, 15, 20, 30].map(mins => (
                                <button
                                    key={mins}
                                    type="button"
                                    onClick={() => setDuration(mins)}
                                    className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${duration === mins
                                        ? 'bg-primary text-white shadow-md'
                                        : 'bg-surface text-muted hover:bg-primary-50'
                                        }`}
                                >
                                    {mins}m
                                </button>
                            ))}
                        </div>

                        {/* Custom Time Input */}
                        <div className="flex items-center gap-2">
                            <label className="text-xs text-muted">Custom:</label>
                            <input
                                type="number"
                                min="1"
                                max="60"
                                value={duration}
                                onChange={(e) => setDuration(Math.min(60, Math.max(1, Number(e.target.value) || 1)))}
                                className="w-20 px-2 py-1 text-sm rounded-lg border border-surface bg-surface focus:outline-none focus:ring-2 focus:ring-primary/50"
                            />
                            <span className="text-xs text-muted">minutes (1-60)</span>
                        </div>
                    </div>

                    {/* Optional Message */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-muted flex items-center">
                            <MessageSquare className="w-4 h-4 mr-2" />
                            Note to Security (Optional)
                        </label>
                        <input
                            type="text"
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            placeholder="e.g., Walking alone, feeling uneasy..."
                            className="w-full p-3 rounded-2xl bg-background border border-surface focus:outline-none focus:ring-2 focus:ring-primary/50"
                        />
                    </div>
                </div>
            </div>

            <div className="pt-6 pb-4 mt-auto sticky bottom-0 bg-transparent backdrop-blur-sm">
                <button
                    onClick={handleStartWalk}
                    disabled={loading}
                    className="w-full bg-green-500 text-white py-4 rounded-2xl font-bold text-lg shadow-lg shadow-green-500/25 active:scale-[0.98] transition-all disabled:opacity-70 disabled:cursor-not-allowed hover:bg-green-600 hover:shadow-green-500/40"
                >
                    {loading ? 'Starting...' : 'Start Safe Walk'}
                </button>
            </div>
        </div>
    );
}
