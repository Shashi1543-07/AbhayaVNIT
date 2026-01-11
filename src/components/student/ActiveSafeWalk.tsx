import { useEffect, useState, useRef } from 'react';
import { Clock, Shield, AlertTriangle, CheckCircle, Navigation, MessageCircle } from 'lucide-react';
import { safeWalkService, type SafeWalkSession } from '../../services/safeWalkService';
import { sosService } from '../../services/sosService';
import { useAuthStore } from '../../context/authStore';

interface ActiveSafeWalkProps {
    walkId: string;
    initialData?: SafeWalkSession;
    onWalkEnded: () => void;
}

export default function ActiveSafeWalk({ walkId, initialData, onWalkEnded }: ActiveSafeWalkProps) {
    const { user, profile } = useAuthStore();
    const [walkData, setWalkData] = useState<SafeWalkSession | null>(initialData || null);
    const [status, setStatus] = useState<SafeWalkSession['status']>('active');
    const [timeLeft, setTimeLeft] = useState<number>(0);
    const [lastMovementTime, setLastMovementTime] = useState<number>(Date.now());
    const [escortRequesting, setEscortRequesting] = useState(false);
    const [sosTriggering, setSosTriggering] = useState(false);
    const watchIdRef = useRef<number | null>(null);
    const lastPosRef = useRef<{ lat: number; lng: number } | null>(null);
    const [distanceToDestination, setDistanceToDestination] = useState<number | null>(null);

    useEffect(() => {
        if (initialData) {
            setWalkData(initialData);
            setStatus(initialData.status);
            // Calculate initial time left based on startTime and expectedDuration
            const startTime = initialData.startTime.toDate ? initialData.startTime.toDate() : new Date(initialData.startTime as any);
            const elapsed = (Date.now() - startTime.getTime()) / 1000;
            const total = initialData.expectedDuration * 60;
            setTimeLeft(Math.max(0, total - elapsed));
        }

        // Subscribe to walk updates
        const unsubscribe = safeWalkService.subscribeToUserActiveWalk(user?.uid || '', (walk) => {
            if (walk && walk.id === walkId) {
                setWalkData(walk);
                setStatus(walk.status);
            }
        });

        return () => unsubscribe();
    }, [initialData, walkId, user]);

    // Timer countdown
    useEffect(() => {
        const timer = setInterval(() => {
            setTimeLeft((prev) => {
                if (prev <= 0) {
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(timer);
    }, []);

    // Location Tracking
    useEffect(() => {
        if (!navigator.geolocation || !walkData) return;

        const success = (position: GeolocationPosition) => {
            const { latitude, longitude, speed } = position.coords;

            // Update RTDB
            if (user?.uid) {
                safeWalkService.updateLocation(user.uid, {
                    latitude,
                    longitude,
                    speed,
                    lastUpdated: Date.now()
                });
            }

            // Check distance to destination
            if (walkData.destination) {
                const result = safeWalkService.checkOffRoute(
                    latitude,
                    longitude,
                    walkData.destination.lat,
                    walkData.destination.lng,
                    distanceToDestination || undefined
                );
                setDistanceToDestination(result.currentDistance);

                // Auto-update status if off-route
                if (result.isOffRoute && status === 'active') {
                    safeWalkService.updateWalkStatus(walkId, 'off-route', 'User appears to be moving away from destination');
                }
            }

            // Check movement for "No movement" alert
            const currentPos = { lat: latitude, lng: longitude };
            if (lastPosRef.current) {
                const dist = calculateDistance(lastPosRef.current.lat, lastPosRef.current.lng, latitude, longitude);
                if (dist > 5) { // Moved more than 5 meters
                    setLastMovementTime(Date.now());
                    lastPosRef.current = currentPos;
                }
            } else {
                lastPosRef.current = currentPos;
            }
        };

        const error = (err: GeolocationPositionError) => {
            console.error("Location tracking error:", err);
        };

        watchIdRef.current = navigator.geolocation.watchPosition(success, error, {
            enableHighAccuracy: true,
            timeout: 5000,
            maximumAge: 0
        });

        return () => {
            if (watchIdRef.current !== null) {
                navigator.geolocation.clearWatch(watchIdRef.current);
            }
        };
    }, [walkId, walkData, distanceToDestination, status]);

    // Check for inactivity
    useEffect(() => {
        const checkInactivity = setInterval(() => {
            if (Date.now() - lastMovementTime > 60000) { // 60 seconds
                console.warn("No movement detected for 60s");
                // Could auto-update status to 'paused' if needed
            }
        }, 5000);
        return () => clearInterval(checkInactivity);
    }, [lastMovementTime]);

    const handleEndWalk = async () => {
        await safeWalkService.updateWalkStatus(walkId, 'completed');
        onWalkEnded();
    };

    const handleRequestEscort = async () => {
        if (!walkData || walkData.escortRequested) return;
        setEscortRequesting(true);
        try {
            await safeWalkService.requestEscort(walkId);
            alert("Escort requested! Security will be notified.");
        } catch (error) {
            console.error("Failed to request escort:", error);
            alert("Failed to request escort. Please try again.");
        } finally {
            setEscortRequesting(false);
        }
    };

    const handleSOS = async () => {
        setSosTriggering(true);
        try {
            // Update walk status to danger
            await safeWalkService.updateWalkStatus(walkId, 'danger', 'SOS Triggered by user');

            // Also trigger main SOS service
            if (user && profile) {
                const position = await new Promise<GeolocationPosition>((resolve, reject) => {
                    navigator.geolocation.getCurrentPosition(resolve, reject, {
                        enableHighAccuracy: true,
                        timeout: 5000,
                        maximumAge: 0
                    });
                });

                const location = {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude
                };

                const userData = {
                    uid: user.uid,
                    displayName: profile?.name || user.displayName,
                    phoneNumber: profile?.contactNumber || user.phoneNumber,
                    role: 'student',
                    hostelId: profile?.hostelId || profile?.hostel,
                    roomNo: profile?.roomNo
                };

                await sosService.triggerSOS(userData, location, 'general');
            }

            alert("SOS Alert Sent to Security!");
        } catch (error) {
            console.error("Failed to trigger SOS:", error);
            alert("Failed to send SOS. Please call emergency services.");
        } finally {
            setSosTriggering(false);
        }
    };

    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}:${s < 10 ? '0' : ''}${s}`;
    };

    // Helper for distance (Haversine)
    function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
        const R = 6371e3; // metres
        const φ1 = lat1 * Math.PI / 180;
        const φ2 = lat2 * Math.PI / 180;
        const Δφ = (lat2 - lat1) * Math.PI / 180;
        const Δλ = (lon2 - lon1) * Math.PI / 180;

        const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

        return R * c;
    }

    return (
        <div className="space-y-6">
            {/* Status Card */}
            <div className="bg-surface rounded-2xl p-6 shadow-sm border border-surface relative overflow-hidden">
                <div className={`absolute top-0 left-0 w-full h-1 ${status === 'danger' ? 'bg-emergency' : status === 'delayed' ? 'bg-warning' : 'bg-success'} animate-pulse`}></div>

                <div className="flex justify-between items-start mb-6">
                    <div>
                        <h2 className="text-xl font-bold text-primary flex items-center">
                            <span className={`w-3 h-3 ${status === 'danger' ? 'bg-emergency' : status === 'delayed' ? 'bg-warning' : 'bg-success'} rounded-full mr-2 animate-pulse`}></span>
                            Safe Walk {status === 'danger' ? 'EMERGENCY' : status === 'delayed' ? 'Delayed' : 'Active'}
                        </h2>
                        <p className="text-sm text-muted mt-1">Monitoring your location...</p>
                    </div>
                    <div className={`px-3 py-1 rounded-full flex items-center ${timeLeft <= 60 ? 'bg-emergency-pulse' : 'bg-background'}`}>
                        <Clock className={`w-4 h-4 ${timeLeft <= 60 ? 'text-emergency' : 'text-muted'} mr-1`} />
                        <span className={`font-mono font-bold ${timeLeft <= 60 ? 'text-emergency' : 'text-muted'}`}>{formatTime(timeLeft)}</span>
                    </div>
                </div>

                <div className="space-y-4">
                    <div className="flex items-center p-3 bg-background rounded-xl">
                        <Navigation className="w-5 h-5 text-primary mr-3" />
                        <div>
                            <p className="text-xs text-muted uppercase font-bold">Destination</p>
                            <p className="font-semibold text-primary">{walkData?.destination.name || "Selected Destination"}</p>
                        </div>
                    </div>

                    {/* Escort Status */}
                    {walkData?.assignedEscort && (
                        <div className="flex items-center p-3 bg-blue-50 rounded-xl border border-blue-100">
                            <Shield className="w-5 h-5 text-blue-600 mr-3" />
                            <div>
                                <p className="text-xs text-blue-600 uppercase font-bold">Escort Assigned</p>
                                <p className="font-semibold text-blue-800">{walkData.assignedEscort}</p>
                            </div>
                        </div>
                    )}

                    {/* Messages from Security */}
                    {walkData?.timeline && walkData.timeline.filter(t => t.type === 'message').length > 0 && (
                        <div className="p-3 bg-amber-50 rounded-xl border border-amber-100">
                            <div className="flex items-center mb-2">
                                <MessageCircle className="w-4 h-4 text-amber-600 mr-2" />
                                <p className="text-xs text-amber-700 uppercase font-bold">Message from Security</p>
                            </div>
                            <p className="text-sm text-amber-900">
                                {walkData.timeline.filter(t => t.type === 'message')[walkData.timeline.filter(t => t.type === 'message').length - 1].details}
                            </p>
                        </div>
                    )}
                </div>
            </div>

            {/* Actions */}
            <div className="grid grid-cols-2 gap-4">
                <button
                    onClick={handleEndWalk}
                    className="col-span-2 bg-success text-white py-4 rounded-2xl font-bold text-lg shadow-lg shadow-success/20 active:scale-[0.98] transition-all flex items-center justify-center"
                >
                    <CheckCircle className="w-6 h-6 mr-2" />
                    End Walk Safely
                </button>

                <button
                    onClick={handleRequestEscort}
                    disabled={walkData?.escortRequested || escortRequesting}
                    className="bg-surface border-2 border-surface text-muted py-3 rounded-2xl font-bold shadow-sm active:scale-[0.95] transition-all flex flex-col items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <Shield className="w-6 h-6 mb-1 text-secondary" />
                    <span className="text-xs">
                        {walkData?.escortRequested ? 'Escort Requested' : escortRequesting ? 'Requesting...' : 'Request Escort'}
                    </span>
                </button>

                <button
                    onClick={handleSOS}
                    disabled={sosTriggering}
                    className="bg-emergency-pulse border-2 border-emergency/20 text-emergency py-3 rounded-2xl font-bold shadow-sm active:scale-[0.95] transition-all flex flex-col items-center justify-center disabled:opacity-50"
                >
                    <AlertTriangle className="w-6 h-6 mb-1" />
                    <span className="text-xs">{sosTriggering ? 'Sending...' : 'SOS'}</span>
                </button>
            </div>

            {/* Pause/Resume Button */}
            {walkData?.status !== 'paused' ? (
                <button
                    onClick={() => safeWalkService.updateWalkStatus(walkId, 'paused', 'Walk paused by student')}
                    className="w-full p-3 bg-muted text-white rounded-2xl font-semibold hover:bg-slate-600 transition-colors"
                >
                    Pause Walk
                </button>
            ) : (
                <button
                    onClick={() => safeWalkService.updateWalkStatus(walkId, 'active', 'Walk resumed by student')}
                    className="w-full p-3 bg-primary text-white rounded-2xl font-semibold hover:bg-primary/90 transition-colors"
                >
                    Resume Walk
                </button>
            )}

            <div className="text-center text-xs text-muted">
                <p>Security is monitoring your location in real-time.</p>
                <p>ID: {walkId}</p>
            </div>
        </div>
    );
}
