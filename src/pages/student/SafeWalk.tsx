import { useState, useEffect, useRef } from 'react';
import MobileWrapper from '../../components/layout/MobileWrapper';
import TopHeader from '../../components/layout/TopHeader';
import BottomNav from '../../components/layout/BottomNav';
import { safeWalkService, type SafeWalkSession } from '../../services/safeWalkService';
import { useAuthStore } from '../../context/authStore';
import { MapPin, Clock, Shield, Navigation, AlertCircle, Send } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { containerStagger, cardVariant, buttonGlow } from '../../lib/animations';

const PRESET_DESTINATIONS = [
    { name: 'Main Gate', lat: 0, lng: 0 },
    { name: 'Library', lat: 0, lng: 0 },
    { name: 'Department Block', lat: 0, lng: 0 },
    { name: 'Hostel Gate', lat: 0, lng: 0 },
];

export default function SafeWalk() {
    const { user, profile } = useAuthStore();
    const [activeSession, setActiveSession] = useState<SafeWalkSession | null>(null);
    const [destination, setDestination] = useState('');
    const [customDestination, setCustomDestination] = useState('');
    const [duration, setDuration] = useState(15);
    const [note, setNote] = useState('');
    const [loading, setLoading] = useState(false);
    const [showNoMovementAlert, setShowNoMovementAlert] = useState(false);
    const [showDelayAlert, setShowDelayAlert] = useState(false);
    const [remainingTime, setRemainingTime] = useState(0);

    const watchIdRef = useRef<number | null>(null);
    const lastLocationRef = useRef<{ lat: number; lng: number; timestamp: number } | null>(null);
    const movementCheckRef = useRef<NodeJS.Timeout | null>(null);

    // Subscribe to active session
    useEffect(() => {
        if (user) {
            const unsubscribe = safeWalkService.subscribeToUserActiveWalk(user.uid, (session) => {
                setActiveSession(session);
                if (session && session.status === 'active') {
                    startGPSTracking(session.id);
                    startMovementCheck();
                    startDelayCheck(session);
                } else {
                    stopGPSTracking();
                }
            });
            return () => {
                unsubscribe();
                stopGPSTracking();
            };
        }
    }, [user]);

    // Countdown timer
    useEffect(() => {
        if (!activeSession) return;

        const interval = setInterval(() => {
            const startTime = activeSession.startTime?.toDate ? activeSession.startTime.toDate() : new Date(activeSession.startTime as any);
            const expectedEndTime = new Date(startTime.getTime() + activeSession.expectedDuration * 60000);
            const remaining = Math.max(0, Math.floor((expectedEndTime.getTime() - Date.now()) / 1000));
            setRemainingTime(remaining);
        }, 1000);

        return () => clearInterval(interval);
    }, [activeSession]);

    // GPS Tracking
    const startGPSTracking = (walkId: string) => {
        if ('geolocation' in navigator) {
            const watchId = navigator.geolocation.watchPosition(
                (position) => {
                    const location = {
                        latitude: position.coords.latitude,
                        longitude: position.coords.longitude,
                        speed: position.coords.speed,
                        lastUpdated: Date.now()
                    };
                    safeWalkService.updateLocation(walkId, location);
                    lastLocationRef.current = {
                        lat: position.coords.latitude,
                        lng: position.coords.longitude,
                        timestamp: Date.now()
                    };
                },
                (error) => console.error('GPS Error:', error),
                { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
            );
            watchIdRef.current = watchId;
        }
    };

    const stopGPSTracking = () => {
        if (watchIdRef.current !== null) {
            navigator.geolocation.clearWatch(watchIdRef.current);
            watchIdRef.current = null;
        }
        if (movementCheckRef.current) {
            clearInterval(movementCheckRef.current);
            movementCheckRef.current = null;
        }
    };

    // No Movement Detection
    const startMovementCheck = () => {
        movementCheckRef.current = setInterval(() => {
            if (lastLocationRef.current) {
                const timeSinceLastUpdate = Date.now() - lastLocationRef.current.timestamp;
                if (timeSinceLastUpdate > 60000) { // 60 seconds no movement
                    setShowNoMovementAlert(true);
                }
            }
        }, 30000); // Check every 30 seconds
    };

    // Delay Detection
    const startDelayCheck = (session: SafeWalkSession) => {
        const checkInterval = setInterval(() => {
            if (safeWalkService.isWalkDelayed(session)) {
                setShowDelayAlert(true);
                clearInterval(checkInterval);
            }
        }, 30000);
        return () => clearInterval(checkInterval);
    };

    const handleStartWalk = async () => {
        if (!user || (!destination && !customDestination)) return;
        setLoading(true);
        try {
            const position = await new Promise<GeolocationPosition>((resolve, reject) => {
                navigator.geolocation.getCurrentPosition(resolve, reject);
            });

            const startLocation = {
                lat: position.coords.latitude,
                lng: position.coords.longitude,
                name: 'Current Location'
            };

            const selectedDest = destination || customDestination;
            const destCoords = PRESET_DESTINATIONS.find(d => d.name === destination) || {
                lat: position.coords.latitude + 0.001,
                lng: position.coords.longitude + 0.001
            };

            const destLocation = {
                lat: destCoords.lat,
                lng: destCoords.lng,
                name: selectedDest
            };

            await safeWalkService.startSafeWalk({
                userId: user.uid,
                userName: profile?.name || user.displayName || 'Student',
                userHostel: profile?.hostelId,
                startLocation,
                destination: destLocation,
                expectedDuration: duration,
                note: note || undefined
            });
        } catch (error) {
            console.error('Failed to start safe walk:', error);
            alert('Failed to start Safe Walk. Please check GPS permissions.');
        } finally {
            setLoading(false);
        }
    };

    const handleEndWalk = async () => {
        if (!activeSession) return;
        try {
            await safeWalkService.updateWalkStatus(activeSession.id, 'completed', 'Walk completed safely');
            stopGPSTracking();
        } catch (error) {
            console.error('Failed to end session:', error);
        }
    };

    const handleRequestEscort = async () => {
        if (!activeSession) return;
        try {
            await safeWalkService.requestEscort(activeSession.id);
            alert('Escort request sent to security!');
        } catch (error) {
            console.error('Failed to request escort:', error);
        }
    };

    const handleSOSTrigger = async () => {
        if (!activeSession) return;
        if (confirm('Are you in danger? This will trigger an emergency alert!')) {
            try {
                await safeWalkService.convertToSOS(activeSession.id);
                alert('SOS triggered! Security has been notified.');
            } catch (error) {
                console.error('Failed to trigger SOS:', error);
            }
        }
    };

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <MobileWrapper>
            <TopHeader title="Safe Walk" showBackButton={true} />

            <motion.main
                className="px-4 py-6 space-y-6 pb-24"
                variants={containerStagger}
                initial="hidden"
                animate="visible"
            >
                {/* Alerts */}
                <AnimatePresence>
                    {showNoMovementAlert && (
                        <motion.div
                            initial={{ opacity: 0, y: -20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            className="glass-card p-4 rounded-xl border border-warning bg-warning/10"
                        >
                            <div className="flex items-start gap-3">
                                <AlertCircle className="w-5 h-5 text-warning mt-0.5" />
                                <div className="flex-1">
                                    <h3 className="font-bold text-warning mb-1">Are you safe?</h3>
                                    <p className="text-sm text-slate-600">We haven't detected movement for a while.</p>
                                    <button
                                        onClick={() => setShowNoMovementAlert(false)}
                                        className="mt-2 text-sm font-bold text-primary underline"
                                    >
                                        I'm safe
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {showDelayAlert && (
                        <motion.div
                            initial={{ opacity: 0, y: -20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            className="glass-card p-4 rounded-xl border border-warning bg-warning/10"
                        >
                            <div className="flex items-start gap-3">
                                <AlertCircle className="w-5 h-5 text-warning mt-0.5" />
                                <div className="flex-1">
                                    <h3 className="font-bold text-warning mb-1">Walk seems delayed</h3>
                                    <p className="text-sm text-slate-600">Do you need help?</p>
                                    <div className="flex gap-2 mt-2">
                                        <button
                                            onClick={handleRequestEscort}
                                            className="text-sm font-bold text-primary underline"
                                        >
                                            Request Escort
                                        </button>
                                        <button
                                            onClick={() => setShowDelayAlert(false)}
                                            className="text-sm font-bold text-slate-600 underline"
                                        >
                                            I'm okay
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Main Card */}
                <motion.div variants={cardVariant} className="glass-card p-6 rounded-2xl text-center relative overflow-hidden border border-white/40">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#FF99AC] to-[#C084FC]" />
                    <div className="w-16 h-16 bg-primary-50 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Navigation className="w-8 h-8 text-primary" />
                    </div>
                    <h2 className="text-xl font-bold text-primary mb-2">
                        {activeSession ? 'Tracking Active' : 'Start Safe Walk'}
                    </h2>
                    <p className="text-sm text-muted mb-6">
                        {activeSession
                            ? 'Security is monitoring your location.'
                            : 'Share your live location with security while you walk.'}
                    </p>

                    <AnimatePresence mode="wait">
                        {activeSession ? (
                            <motion.div
                                key="active"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="space-y-4"
                            >
                                <div className="glass-card p-4 rounded-xl text-left space-y-3 border border-white/30">
                                    <div className="flex items-start gap-3">
                                        <MapPin className="w-5 h-5 text-secondary mt-0.5" />
                                        <div className="flex-1">
                                            <p className="text-xs text-muted">Destination</p>
                                            <p className="font-semibold text-primary">{activeSession.destination.name}</p>
                                        </div>
                                        <div className="bg-primary/10 px-3 py-1 rounded-full">
                                            <p className="text-sm font-bold text-primary">{formatTime(remainingTime)}</p>
                                        </div>
                                    </div>

                                    {activeSession.note && (
                                        <div className="bg-surface-card p-2 rounded-lg">
                                            <p className="text-xs text-slate-600">{activeSession.note}</p>
                                        </div>
                                    )}

                                    {activeSession.assignedEscort && (
                                        <div className="flex items-center gap-2 bg-success/10 p-2 rounded-lg">
                                            <Shield className="w-4 h-4 text-success" />
                                            <p className="text-xs text-success font-medium">Escort: {activeSession.assignedEscort}</p>
                                        </div>
                                    )}
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <motion.button
                                        onClick={handleRequestEscort}
                                        whileTap={{ scale: 0.95 }}
                                        disabled={activeSession.escortRequested}
                                        className="bg-primary/10 text-primary font-bold py-2 px-4 rounded-xl text-sm border border-primary/30 disabled:opacity-50"
                                    >
                                        {activeSession.escortRequested ? 'Escort Requested' : 'Request Escort'}
                                    </motion.button>

                                    <motion.button
                                        onMouseDown={(e) => {
                                            const timeout = setTimeout(() => handleSOSTrigger(), 1000);
                                            const onUp = () => {
                                                clearTimeout(timeout);
                                                document.removeEventListener('mouseup', onUp);
                                                document.removeEventListener('touchend', onUp);
                                            };
                                            document.addEventListener('mouseup', onUp);
                                            document.addEventListener('touchend', onUp);
                                        }}
                                        whileTap={{ scale: 0.95 }}
                                        className="bg-emergency text-white font-bold py-2 px-4 rounded-xl text-sm shadow-lg"
                                    >
                                        SOS (Hold)
                                    </motion.button>
                                </div>

                                <motion.button
                                    onClick={handleEndWalk}
                                    whileTap={{ scale: 0.95 }}
                                    className="w-full bg-success text-white font-bold py-3 rounded-xl shadow-lg hover:opacity-90 transition-all"
                                >
                                    I've Arrived Safely
                                </motion.button>
                            </motion.div>
                        ) : (
                            <motion.div
                                key="inactive"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="space-y-4"
                            >
                                <label className="block text-left text-sm font-medium text-slate-700">Destination</label>
                                <select
                                    value={destination}
                                    onChange={(e) => {
                                        setDestination(e.target.value);
                                        if (e.target.value) setCustomDestination('');
                                    }}
                                    className="glass-input w-full px-4 py-3 rounded-xl focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                                >
                                    <option value="">Select preset location</option>
                                    {PRESET_DESTINATIONS.map((dest) => (
                                        <option key={dest.name} value={dest.name}>{dest.name}</option>
                                    ))}
                                </select>

                                <div className="relative">
                                    <MapPin className="absolute left-3 top-3.5 w-5 h-5 text-slate-600" />
                                    <input
                                        type="text"
                                        placeholder="Or type custom destination..."
                                        value={customDestination}
                                        onChange={(e) => {
                                            setCustomDestination(e.target.value);
                                            if (e.target.value) setDestination('');
                                        }}
                                        className="glass-input w-full pl-10 pr-4 py-3 rounded-xl focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                                    />
                                </div>

                                {/* Duration Slider */}
                                <div className="space-y-2">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-slate-600 font-medium">Expected Duration</span>
                                        <span className="text-primary font-bold">{duration} mins</span>
                                    </div>
                                    <input
                                        type="range"
                                        min="5"
                                        max="30"
                                        step="5"
                                        value={duration}
                                        onChange={(e) => setDuration(Number(e.target.value))}
                                        className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-primary"
                                    />
                                    <div className="flex justify-between text-xs text-slate-400">
                                        <span>5m</span>
                                        <span>15m</span>
                                        <span>30m</span>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-left text-sm font-medium text-slate-700 mb-1">Note (Optional)</label>
                                    <textarea
                                        value={note}
                                        onChange={(e) => setNote(e.target.value)}
                                        placeholder="e.g., Feels unsafe, Low visibility area..."
                                        rows={2}
                                        className="glass-input w-full px-4 py-2 rounded-xl focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all resize-none text-sm"
                                    />
                                </div>

                                <motion.button
                                    variants={buttonGlow}
                                    animate="animate"
                                    whileTap={{ scale: 0.95 }}
                                    onClick={handleStartWalk}
                                    disabled={(!destination && !customDestination) || loading}
                                    className="w-full bg-gradient-to-r from-[#FF99AC] via-[#C084FC] to-[#89CFF0] text-white font-bold py-3 rounded-xl shadow-lg hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {loading ? 'Starting...' : 'Start Walking'}
                                </motion.button>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </motion.div>

                {/* Info Cards */}
                <motion.div variants={cardVariant} className="grid grid-cols-2 gap-4">
                    <div className="glass-card p-4 rounded-xl text-center border border-white/30">
                        <Shield className="w-6 h-6 text-secondary mx-auto mb-2" />
                        <h3 className="font-bold text-sm text-primary">24/7 Monitored</h3>
                        <p className="text-[10px] text-muted">Security is watching</p>
                    </div>
                    <div className="glass-card p-4 rounded-xl text-center border border-white/30">
                        <Navigation className="w-6 h-6 text-secondary mx-auto mb-2" />
                        <h3 className="font-bold text-sm text-primary">Live Tracking</h3>
                        <p className="text-[10px] text-muted">Real-time updates</p>
                    </div>
                </motion.div>
            </motion.main>

            <BottomNav />
        </MobileWrapper>
    );
}
