import { useState, useEffect, useRef } from 'react';
import MobileWrapper from '../../components/layout/MobileWrapper';
import TopHeader from '../../components/layout/TopHeader';
import BottomNav from '../../components/layout/BottomNav';
import { safeWalkService, type SafeWalkSession } from '../../services/safeWalkService';
import { useAuthStore } from '../../context/authStore';
import { MapPin, Clock, Shield, Navigation, AlertCircle, MessageCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { containerStagger, cardVariant, buttonGlow } from '../../lib/animations';

const CAMPUS_LOCATIONS = [
    { name: 'Main Gate (South Ambazari Rd)', lat: 21.1262, lng: 79.0511, category: 'Gates' },
    { name: 'Bajaj Nagar Gate', lat: 21.1285, lng: 79.0560, category: 'Gates' },
    { name: 'Yashwant Nagar Gate', lat: 21.1240, lng: 79.0470, category: 'Gates' },
    { name: 'Kalpana Chawla Hall (GIRLS)', lat: 21.1255, lng: 79.0495, category: 'Hostels' },
    { name: 'New GIRLS Hostel', lat: 21.1258, lng: 79.0498, category: 'Hostels' },
    { name: 'Hostel Block 1-10 (BOYS)', lat: 21.1230, lng: 79.0530, category: 'Hostels' },
    { name: 'Mega Mess', lat: 21.1240, lng: 79.0535, category: 'Dining' },
    { name: 'Computer Science Dept', lat: 21.1270, lng: 79.0505, category: 'Departments' },
    { name: 'Mechanical Dept', lat: 21.1275, lng: 79.0510, category: 'Departments' },
    { name: 'Electronics Dept', lat: 21.1268, lng: 79.0515, category: 'Departments' },
    { name: 'Architecture Dept', lat: 21.1272, lng: 79.0490, category: 'Departments' },
    { name: 'Administrative Building', lat: 21.1260, lng: 79.0520, category: 'Admin' },
    { name: 'Library', lat: 21.1265, lng: 79.0518, category: 'Admin' },
    { name: 'Sports Complex (Gymkhana)', lat: 21.1245, lng: 79.0500, category: 'Sports' },
    { name: 'Cricket Ground', lat: 21.1235, lng: 79.0490, category: 'Sports' },
    { name: 'VNIT Health Center', lat: 21.1250, lng: 79.0540, category: 'Other' },
];

export default function SafeWalk() {
    const { user, profile } = useAuthStore();
    const [activeSession, setActiveSession] = useState<SafeWalkSession | null>(null);
    const [destination, setDestination] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [customDestination, setCustomDestination] = useState('');
    const [duration, setDuration] = useState(15);
    const [note, setNote] = useState('');
    const [loading, setLoading] = useState(false);

    // Status alerting states
    const [showNoMovementPopup, setShowNoMovementPopup] = useState(false);
    const [showDelayPopup, setShowDelayPopup] = useState(false);
    const [remainingTime, setRemainingTime] = useState(0);

    const watchIdRef = useRef<number | null>(null);
    const lastLocationRef = useRef<{ lat: number; lng: number; timestamp: number } | null>(null);
    const lastStatusUpdateRef = useRef<'active' | 'paused' | 'delayed'>('active');

    // 1. Subscribe to active session & Handle Local GPS Monitoring
    useEffect(() => {
        if (!user) return;

        const unsubscribe = safeWalkService.subscribeToUserActiveWalk(user.uid, (session) => {
            setActiveSession(session);

            // Start local safety monitoring if session is active
            if (session && !watchIdRef.current) {
                startLocalMonitoring();
            } else if (!session && watchIdRef.current) {
                stopGPSTracking();
            }
        });

        return () => {
            unsubscribe();
            stopGPSTracking();
        };
    }, [user]);

    // Local Location Watch for "No Movement" and "SOS Calibration"
    // Note: RTDB updates are handled by the global LiveTrackingManager
    const startLocalMonitoring = () => {
        if ('geolocation' in navigator) {
            watchIdRef.current = navigator.geolocation.watchPosition(
                (position) => {
                    const { latitude, longitude } = position.coords;

                    // Track movement for "paused" check locally
                    const prevLoc = lastLocationRef.current;
                    if (!prevLoc || prevLoc.lat !== latitude || prevLoc.lng !== longitude) {
                        lastLocationRef.current = {
                            lat: latitude,
                            lng: longitude,
                            timestamp: Date.now()
                        };
                        if (showNoMovementPopup) setShowNoMovementPopup(false);
                    }
                },
                (error) => console.error('Local GPS error:', error),
                { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
            );
        }
    };

    const stopGPSTracking = () => {
        if (watchIdRef.current !== null) {
            navigator.geolocation.clearWatch(watchIdRef.current);
            watchIdRef.current = null;
        }
        lastLocationRef.current = null;
    };

    // 2. Monitoring & Countdown Timers
    useEffect(() => {
        if (!activeSession) return;

        const interval = setInterval(() => {
            // A. Countdown timer
            const startTime = (activeSession.startTime as any)?.toDate
                ? (activeSession.startTime as any).toDate()
                : new Date(activeSession.startTime as any);
            const expectedEndTime = new Date(startTime.getTime() + activeSession.expectedDuration * 60000);
            const remaining = Math.max(0, Math.floor((expectedEndTime.getTime() - Date.now()) / 1000));
            setRemainingTime(remaining);

            // B. Client-side status checks
            checkSafetyStatus(activeSession, remaining);
        }, 3000); // Check every 3 seconds

        return () => clearInterval(interval);
    }, [activeSession]);

    const checkSafetyStatus = (session: SafeWalkSession, remaining: number) => {
        if (session.status === 'completed' || session.status === 'danger') return;

        let nextStatus: 'active' | 'paused' | 'delayed' = 'active';

        // Check for delay
        if (remaining <= 0) {
            nextStatus = 'delayed';
            if (!showDelayPopup) setShowDelayPopup(true);
        }

        // Check for no movement (90s - more lenient locally)
        if (lastLocationRef.current) {
            const timeSinceMove = Date.now() - lastLocationRef.current.timestamp;
            if (timeSinceMove > 90000) {
                nextStatus = 'paused';
                if (!showNoMovementPopup) setShowNoMovementPopup(true);
            }
        }

        // Update database only if status changed
        if (nextStatus !== lastStatusUpdateRef.current) {
            lastStatusUpdateRef.current = nextStatus;
            safeWalkService.updateWalkStatus(session.id, nextStatus);
        }
    };

    // 4. Actions
    const handleStartWalk = async () => {
        if (!user || (!destination && !customDestination)) return;
        setLoading(true);
        try {
            // Get initial location
            const position = await new Promise<GeolocationPosition>((resolve, reject) => {
                navigator.geolocation.getCurrentPosition(resolve, reject);
            });

            const startCoords = { lat: position.coords.latitude, lng: position.coords.longitude };
            const selectedDestName = destination || customDestination;
            const preset = CAMPUS_LOCATIONS.find(d => d.name === destination);

            const destCoords = preset ? { lat: preset.lat, lng: preset.lng } : {
                lat: startCoords.lat + 0.005, // Approximation for custom
                lng: startCoords.lng + 0.005
            };

            await safeWalkService.startSafeWalk({
                userId: user.uid,
                userName: profile?.name || user.displayName || 'Student',
                hostelId: profile?.hostelId || 'Unknown',
                startLocation: { ...startCoords, name: 'Current Location' },
                destination: { ...destCoords, name: selectedDestName },
                expectedDuration: duration,
                note: note || null
            });
        } catch (error) {
            console.error('Failed to start safe walk:', error);
            alert('Failed to start tracking. Please check GPS settings.');
        } finally {
            setLoading(false);
        }
    };

    const handleEndWalk = async () => {
        if (!activeSession) return;
        try {
            await safeWalkService.updateWalkStatus(activeSession.id, 'completed');
            stopGPSTracking();
        } catch (error) {
            console.error('Error ending walk:', error);
        }
    };

    const handleSOS = async () => {
        if (!activeSession || !user) return;

        const confirmMsg = "ESCALATE TO SOS? This will stop the Safe Walk and alert Security IMMEDIATELY.";
        if (confirm(confirmMsg)) {
            try {
                const currentPos = lastLocationRef.current || { lat: 0, lng: 0 };
                await safeWalkService.convertToSOS(activeSession.id, {
                    ...profile,
                    uid: user.uid,
                    displayName: profile?.name || 'Student'
                }, { lat: currentPos.lat, lng: currentPos.lng });

                stopGPSTracking();
                alert('Emergency SOS triggered.');
            } catch (error) {
                console.error('SOS Escalation failed:', error);
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
                className="px-6 pt-nav-safe pb-nav-safe space-y-6 max-w-[480px] mx-auto"
                variants={containerStagger}
                initial="hidden"
                animate="visible"
            >
                {/* Popups & Alerts */}
                <AnimatePresence>
                    {(showNoMovementPopup || showDelayPopup) && (
                        <motion.div
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.8, opacity: 0 }}
                            className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-900/40 backdrop-blur-md"
                        >
                            <div className="glass-card p-6 rounded-[2rem] w-full max-w-xs text-center border-2 border-white/50 shadow-2xl">
                                <AlertCircle className="w-12 h-12 text-warning mx-auto mb-4" />
                                <h3 className="text-xl font-black text-slate-900 mb-2">Are you okay?</h3>
                                <p className="text-sm text-slate-600 font-medium mb-6">
                                    {showNoMovementPopup
                                        ? "No movement detected for 60 seconds."
                                        : "You have exceeded your expected duration."
                                    }
                                </p>
                                <div className="space-y-3">
                                    <button
                                        onClick={() => { setShowNoMovementPopup(false); setShowDelayPopup(false); }}
                                        className="w-full py-4 bg-emerald-500 text-white font-black rounded-2xl shadow-lg border border-emerald-400/30"
                                    >
                                        I'M SAFE
                                    </button>
                                    <button
                                        onClick={handleSOS}
                                        className="w-full py-4 bg-red-500 text-white font-black rounded-2xl shadow-lg border border-red-400/30"
                                    >
                                        I'M IN DANGER
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Main Card */}
                <motion.div variants={cardVariant} className="glass-card p-8 rounded-[2.5rem] relative overflow-hidden border border-white/50 shadow-2xl">
                    <div className={`absolute top-0 left-0 w-full h-2 ${activeSession ? (activeSession.status === 'active' ? 'bg-emerald-500' : 'bg-orange-500') : 'bg-primary'
                        }`} />

                    <div className="flex justify-between items-start mb-8">
                        <div className="w-16 h-16 bg-white/40 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/60 shadow-sm text-primary">
                            <Navigation className="w-8 h-8" />
                        </div>
                        {activeSession && (
                            <div className="bg-white/40 backdrop-blur-md px-5 py-2.5 rounded-2xl border border-white/60 shadow-sm">
                                <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest text-center">Remaining</p>
                                <p className="text-xl font-black text-primary font-mono">{formatTime(remainingTime)}</p>
                            </div>
                        )}
                    </div>

                    <h2 className="text-3xl font-black text-slate-800 mb-2 tracking-tight">
                        {activeSession ? 'Tracking Live' : 'Start Safe Walk'}
                    </h2>
                    <p className="text-sm text-slate-600 font-medium mb-10 leading-relaxed opacity-80">
                        {activeSession
                            ? 'Your location is being shared with security and hostel wardens for your safety.'
                            : 'Heading back late? Let security and your warden stay informed while you walk.'}
                    </p>

                    <AnimatePresence mode="wait">
                        {activeSession ? (
                            <motion.div key="active" className="space-y-8">
                                <div className="bg-white/30 backdrop-blur-md p-6 rounded-3xl text-left border border-white/60 shadow-sm">
                                    <div className="flex items-center gap-4 mb-6">
                                        <div className="p-2.5 bg-emerald-100/50 rounded-xl border border-emerald-200/50">
                                            <MapPin className="w-5 h-5 text-emerald-600" />
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Destination</p>
                                            <p className="text-base font-bold text-slate-800">{activeSession.destination.name}</p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-4">
                                        <div className="p-2.5 bg-primary/10 rounded-xl border border-primary/20">
                                            <Clock className="w-5 h-5 text-primary" />
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Live Status</p>
                                            <div className="flex items-center gap-2">
                                                <div className={`w-3 h-3 rounded-full animate-pulse shadow-sm ${activeSession.status === 'active' ? 'bg-emerald-500' :
                                                    activeSession.status === 'paused' ? 'bg-yellow-500' : 'bg-orange-500'
                                                    }`} />
                                                <p className="text-base font-black capitalize text-slate-800 tracking-tight">{activeSession.status}</p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Security Communications */}
                                    {activeSession.timeline && activeSession.timeline.some(e => e.type === 'message') && (
                                        <div className="pt-4 border-t border-white/40">
                                            <div className="flex items-center gap-2 mb-3 ml-1">
                                                <MessageCircle className="w-4 h-4 text-primary" />
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Security Guidance</p>
                                            </div>
                                            <div className="space-y-3">
                                                {activeSession.timeline
                                                    .filter(e => e.type === 'message')
                                                    .slice(-3) // Show last 3 messages for context
                                                    .map((msg, idx) => (
                                                        <motion.div
                                                            key={idx}
                                                            initial={{ x: -10, opacity: 0 }}
                                                            animate={{ x: 0, opacity: 1 }}
                                                            transition={{ delay: idx * 0.1 }}
                                                            className="p-4 bg-primary text-white rounded-2xl shadow-lg shadow-primary/20 border border-white/20"
                                                        >
                                                            <p className="text-sm font-bold leading-relaxed italic">
                                                                "{msg.details.split(': ')[1] || msg.details}"
                                                            </p>
                                                            <div className="flex justify-between items-center mt-2 opacity-60">
                                                                <p className="text-[8px] font-black uppercase">Official Protocol</p>
                                                                <p className="text-[8px] font-black uppercase">
                                                                    {msg.timestamp ? (typeof msg.timestamp === 'string' ? msg.timestamp.split('T')[1].split('.')[0] : new Date(msg.timestamp.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })) : 'Now'}
                                                                </p>
                                                            </div>
                                                        </motion.div>
                                                    ))
                                                }
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div className="grid grid-cols-2 gap-4 pt-4">
                                    <button
                                        onClick={handleEndWalk}
                                        className="py-5 bg-emerald-500 text-white font-black rounded-2xl shadow-xl shadow-emerald-500/20 active:scale-95 transition-all text-sm tracking-widest border border-emerald-400/20"
                                    >
                                        ARRIVED
                                    </button>
                                    <button
                                        onClick={handleSOS}
                                        className="py-5 bg-red-500 text-white font-black rounded-2xl shadow-xl shadow-red-500/20 active:scale-95 transition-all text-sm tracking-widest border border-red-400/20"
                                    >
                                        SOS
                                    </button>
                                </div>
                            </motion.div>
                        ) : (
                            <motion.div key="setup" className="space-y-6">
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Search Destination</label>
                                    <div className="relative">
                                        <input
                                            type="text"
                                            placeholder="Search Hall, Dept, Mess..."
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            className="w-full px-5 py-4 pl-12 rounded-2xl bg-white/40 backdrop-blur-md border border-white/60 focus:border-primary/50 outline-none font-bold text-slate-700 transition-all shadow-sm placeholder:text-slate-400"
                                        />
                                        <Navigation className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                    </div>

                                    <div className="max-h-[220px] overflow-y-auto pr-2 space-y-2 custom-scrollbar">
                                        {CAMPUS_LOCATIONS
                                            .filter(loc =>
                                                loc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                                loc.category.toLowerCase().includes(searchQuery.toLowerCase())
                                            )
                                            .map((loc) => (
                                                <button
                                                    key={loc.name}
                                                    onClick={() => {
                                                        setDestination(loc.name);
                                                        setSearchQuery(loc.name);
                                                        setCustomDestination('');
                                                    }}
                                                    className={`w-full flex items-center justify-between p-4 rounded-xl border transition-all ${destination === loc.name
                                                        ? 'bg-primary/10 border-primary/40'
                                                        : 'bg-white/20 border-white/40 hover:bg-white/40'
                                                        }`}
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <div className={`p-1.5 rounded-lg ${loc.category === 'Hostels' ? 'bg-pink-100 text-pink-600' :
                                                            loc.category === 'Departments' ? 'bg-blue-100 text-blue-600' :
                                                                'bg-slate-100 text-slate-600'
                                                            }`}>
                                                            <MapPin className="w-4 h-4" />
                                                        </div>
                                                        <div className="text-left">
                                                            <p className="text-sm font-bold text-slate-800">{loc.name}</p>
                                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">{loc.category}</p>
                                                        </div>
                                                    </div>
                                                    {destination === loc.name && <div className="w-2 h-2 rounded-full bg-primary" />}
                                                </button>
                                            ))
                                        }
                                    </div>

                                    <div className="relative pt-2">
                                        <div className="absolute inset-0 flex items-center" aria-hidden="true">
                                            <div className="w-full border-t border-slate-200/50"></div>
                                        </div>
                                        <div className="relative flex justify-center">
                                            <span className="bg-slate-50 px-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Or Custom</span>
                                        </div>
                                    </div>

                                    <input
                                        type="text"
                                        placeholder="Enter custom location name..."
                                        value={customDestination}
                                        onChange={(e) => { setCustomDestination(e.target.value); if (e.target.value) setDestination(''); }}
                                        className="w-full px-5 py-4 rounded-2xl bg-white/40 backdrop-blur-md border border-white/60 focus:border-primary/50 outline-none font-bold text-slate-700 transition-all shadow-sm placeholder:text-slate-400"
                                    />
                                </div>

                                <div className="space-y-5 pt-2">
                                    <div className="flex justify-between items-center px-1">
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Walk Duration</span>
                                        <span className="text-sm font-black text-primary bg-primary/10 px-3 py-1 rounded-xl border border-primary/20">{duration} mins</span>
                                    </div>
                                    <input
                                        type="range" min="5" max="30" step="5"
                                        value={duration}
                                        onChange={(e) => setDuration(Number(e.target.value))}
                                        className="w-full h-2.5 bg-slate-200/50 rounded-full appearance-none accent-primary cursor-pointer border border-white/20"
                                    />
                                    <div className="flex justify-between px-1">
                                        <span className="text-[9px] text-slate-400 font-black">5M</span>
                                        <span className="text-[9px] text-slate-400 font-black">15M</span>
                                        <span className="text-[9px] text-slate-400 font-black">30M</span>
                                    </div>
                                </div>

                                <textarea
                                    value={note}
                                    onChange={(e) => setNote(e.target.value)}
                                    placeholder="Add an optional note..."
                                    className="w-full p-5 rounded-2xl bg-white/40 backdrop-blur-md border border-white/60 focus:border-primary/50 outline-none text-sm font-bold text-slate-700 transition-all resize-none h-28 shadow-sm placeholder:text-slate-400"
                                />

                                <motion.button
                                    variants={buttonGlow}
                                    animate="animate"
                                    whileTap={{ scale: 0.98 }}
                                    onClick={handleStartWalk}
                                    disabled={loading || (!destination && !customDestination)}
                                    className="w-full py-3 bg-gradient-to-r from-[#FF99AC] via-[#C084FC] to-[#89CFF0] text-white font-bold rounded-2xl shadow-lg hover:opacity-90 transition-all text-sm tracking-[0.1em] flex items-center justify-center gap-2 border border-white/20 mt-6 disabled:opacity-50"
                                >
                                    {loading ? 'STARTING...' : 'START SAFE WALK'}
                                </motion.button>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </motion.div>

                {/* Features Info - Glassy Grid */}
                <div className="grid grid-cols-2 gap-4">
                    <div className="glass-card p-6 rounded-[2rem] border border-white/50 flex flex-col items-center text-center shadow-xl">
                        <div className="p-3 bg-secondary/10 rounded-2xl mb-3 border border-secondary/5">
                            <Shield className="w-8 h-8 text-secondary" />
                        </div>
                        <h4 className="text-sm font-black text-slate-800 uppercase tracking-wider mb-1">Monitored</h4>
                        <p className="text-[10px] text-slate-500 font-black opacity-60">Synced with Security</p>
                    </div>
                    <div className="glass-card p-6 rounded-[2rem] border border-white/50 flex flex-col items-center text-center shadow-xl">
                        <div className="p-3 bg-secondary/10 rounded-2xl mb-3 border border-secondary/5">
                            <Navigation className="w-8 h-8 text-secondary" />
                        </div>
                        <h4 className="text-sm font-black text-slate-800 uppercase tracking-wider mb-1">Live GPS</h4>
                        <p className="text-[10px] text-slate-500 font-black opacity-60">Real-time tracking</p>
                    </div>
                </div>
            </motion.main>

            <BottomNav />
        </MobileWrapper>
    );
}
