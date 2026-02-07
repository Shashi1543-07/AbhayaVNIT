import { useState, useEffect, useRef } from 'react';
import MobileWrapper from '../../components/layout/MobileWrapper';
import TopHeader from '../../components/layout/TopHeader';
import BottomNav from '../../components/layout/BottomNav';
import { safeWalkService, type SafeWalkSession } from '../../services/safeWalkService';
import { mapService, type LocationData } from '../../services/mapService';
import EventDetailMap from '../../components/map/EventDetailMap';
import { useAuthStore } from '../../context/authStore';
import { MapPin, Clock, Shield, Navigation, AlertCircle, MessageCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { containerStagger, cardVariant, buttonGlow } from '../../lib/animations';

const CAMPUS_LOCATIONS = [
    // --- GATES ---
    { name: 'Main Gate (South Ambazari Rd)', lat: 21.1262, lng: 79.0511, category: 'Gates' },
    { name: 'Bajaj Nagar Gate', lat: 21.1285, lng: 79.0560, category: 'Gates' },
    { name: 'Yashwant Nagar Gate', lat: 21.1240, lng: 79.0470, category: 'Gates' },

    // --- DEPARTMENTS ---
    { name: 'Computer Science Dept', lat: 21.1270, lng: 79.0505, category: 'Departments' },
    { name: 'Mechanical Dept', lat: 21.1275, lng: 79.0510, category: 'Departments' },
    { name: 'Electronics & Comm. Dept', lat: 21.1268, lng: 79.0515, category: 'Departments' },
    { name: 'Electrical Engineering Dept', lat: 21.1265, lng: 79.0525, category: 'Departments' },
    { name: 'Civil Engineering Dept', lat: 21.1280, lng: 79.0530, category: 'Departments' },
    { name: 'Chemical Engineering Dept', lat: 21.1285, lng: 79.0520, category: 'Departments' },
    { name: 'Architecture & Planning Dept', lat: 21.1272, lng: 79.0490, category: 'Departments' },
    { name: 'Metallurgy & Materials Dept', lat: 21.1290, lng: 79.0510, category: 'Departments' },
    { name: 'Mining Engineering Dept', lat: 21.1295, lng: 79.0500, category: 'Departments' },
    { name: 'Applied Mechanics Dept', lat: 21.1260, lng: 79.0535, category: 'Departments' },
    { name: 'Physics Department', lat: 21.1255, lng: 79.0520, category: 'Departments' },
    { name: 'Chemistry Department', lat: 21.1258, lng: 79.0522, category: 'Departments' },
    { name: 'Mathematics Department', lat: 21.1252, lng: 79.0518, category: 'Departments' },
    { name: 'Humanities & Social Sciences', lat: 21.1250, lng: 79.0515, category: 'Departments' },

    // --- HOSTELS (GIRLS) ---
    { name: 'GH-1 (Kalpana Chawla Hall)', lat: 21.1255, lng: 79.0495, category: 'G-Hostels' },
    { name: 'GH-2 (Dr. Anandi Joshi Hall)', lat: 21.1258, lng: 79.0498, category: 'G-Hostels' },
    { name: 'New GIRLS Hostel (A Block)', lat: 21.1259, lng: 79.0500, category: 'G-Hostels' },

    // --- HOSTELS (BOYS) ---
    { name: 'HB-1 (Aryabhatta)', lat: 21.1230, lng: 79.0530, category: 'B-Hostels' },
    { name: 'HB-2 (Ramanujan)', lat: 21.1225, lng: 79.0535, category: 'B-Hostels' },
    { name: 'HB-3 (Swaminathan)', lat: 21.1220, lng: 79.0540, category: 'B-Hostels' },
    { name: 'HB-4 (Bhide Hall)', lat: 21.1215, lng: 79.0545, category: 'B-Hostels' },
    { name: 'HB-5 (Kalam Hall)', lat: 21.1210, lng: 79.0550, category: 'B-Hostels' },
    { name: 'HB-6 (C.V. Raman)', lat: 21.1205, lng: 79.0555, category: 'B-Hostels' },
    { name: 'HB-7 (Homi Bhabha)', lat: 21.1200, lng: 79.0560, category: 'B-Hostels' },
    { name: 'HB-8 (J.C. Bose)', lat: 21.1195, lng: 79.0565, category: 'B-Hostels' },
    { name: 'HB-9 (Meghnad Saha)', lat: 21.1190, lng: 79.0570, category: 'B-Hostels' },
    { name: 'HB-10 (Sarabhai)', lat: 21.1185, lng: 79.0575, category: 'B-Hostels' },

    // --- ADMINISTRATIVE & SERVICES ---
    { name: 'Administrative Building', lat: 21.1260, lng: 79.0520, category: 'Admin' },
    { name: 'New Academic Building', lat: 21.1265, lng: 79.0510, category: 'Admin' },
    { name: 'Classroom Complex (CRC)', lat: 21.1270, lng: 79.0520, category: 'Academic' },
    { name: 'Library (Central)', lat: 21.1265, lng: 79.0518, category: 'Admin' },
    { name: 'Computer Center', lat: 21.1268, lng: 79.0512, category: 'Academic' },
    { name: 'Health Center', lat: 21.1250, lng: 79.0540, category: 'Other' },
    { name: 'Post Office', lat: 21.1255, lng: 79.0545, category: 'Other' },
    { name: 'Auditorium', lat: 21.1262, lng: 79.0530, category: 'Other' },

    // --- DINING & SPORTS ---
    { name: 'Mega Mess', lat: 21.1240, lng: 79.0535, category: 'Dining' },
    { name: 'Canteen (Academic)', lat: 21.1272, lng: 79.0525, category: 'Dining' },
    { name: 'Sports Complex (Gymkhana)', lat: 21.1245, lng: 79.0500, category: 'Sports' },
    { name: 'Cricket Ground', lat: 21.1235, lng: 79.0490, category: 'Sports' },
    { name: 'Swimming Pool', lat: 21.1242, lng: 79.0505, category: 'Sports' },
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
    const [liveLocation, setLiveLocation] = useState<LocationData | null>(null);

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

    // 2. Subscribe to live location when walk is active
    useEffect(() => {
        if (!user || !activeSession) {
            setLiveLocation(null);
            return;
        }

        const unsubscribe = mapService.subscribeToSingleLocation(user.uid, (location) => {
            if (location) {
                setLiveLocation(location);
            }
        });

        return () => unsubscribe();
    }, [user, activeSession]);

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
                { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
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
                phone: profile?.phoneNumber || profile?.phone || '',
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
                await safeWalkService.convertToSOS(activeSession.id, user, { lat: currentPos.lat, lng: currentPos.lng });

                stopGPSTracking();
                alert('Emergency SOS triggered.');
            } catch (error) {
                console.error('SOS Escalation failed:', error);
            }
        }
    };

    // Handler for "I'M IN DANGER" button - immediate action without confirmation
    const handleDanger = async () => {
        if (!activeSession || !user) return;

        // Close popup immediately
        setShowNoMovementPopup(false);
        setShowDelayPopup(false);

        try {
            const currentPos = lastLocationRef.current || { lat: 0, lng: 0 };

            // End the SafeWalk and trigger SOS
            await safeWalkService.convertToSOS(activeSession.id, user, { lat: currentPos.lat, lng: currentPos.lng });
            stopGPSTracking();
        } catch (error) {
            console.error('Error triggering danger alert:', error);
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
                className="px-4 pt-nav-safe pb-nav-safe space-y-6 max-w-[500px] mx-auto"
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
                            className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/60 backdrop-blur-3xl"
                        >
                            <div className="glass p-8 rounded-[2.5rem] w-full max-w-xs text-center border border-white/5 shadow-2xl">
                                <AlertCircle className="w-16 h-16 text-amber-500 mx-auto mb-6 drop-shadow-[0_0_15px_rgba(245,158,11,0.4)]" />
                                <h3 className="text-2xl font-black text-white mb-3 font-heading tracking-tight">Are you okay?</h3>
                                <p className="text-sm text-zinc-400 font-bold mb-8 leading-relaxed">
                                    {showNoMovementPopup
                                        ? "No movement detected for 60 seconds."
                                        : "You have exceeded your expected duration."
                                    }
                                </p>
                                <div className="space-y-4">
                                    <button
                                        onClick={() => { setShowNoMovementPopup(false); setShowDelayPopup(false); }}
                                        className="w-full py-4.5 bg-emerald-500 text-black font-black uppercase tracking-widest text-[11px] rounded-[20px] shadow-2xl active:scale-95 transition-all border border-emerald-400/30"
                                    >
                                        I'M SAFE
                                    </button>
                                    <button
                                        onClick={handleDanger}
                                        className="w-full py-4.5 bg-red-600 text-white font-black uppercase tracking-widest text-[11px] rounded-[20px] shadow-2xl active:scale-95 transition-all border border-red-500/30"
                                    >
                                        I'M IN DANGER
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Header Information Pod */}
                <motion.div variants={cardVariant} className="glass p-6 rounded-[2.5rem] border border-white/5 shadow-2xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-[#D4AF37]/5 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-[#D4AF37]/10 transition-all duration-700" />

                    <div className="flex items-center gap-5 mb-4">
                        <div className="w-14 h-14 bg-gradient-to-br from-black/40 to-black/20 backdrop-blur-3xl rounded-2xl flex items-center justify-center border border-white/10 shadow-2xl text-[#D4AF37] group-hover:scale-110 transition-transform duration-500">
                            <Navigation className="w-7 h-7" strokeWidth={2.5} />
                        </div>
                        <div>
                            <h2 className="text-2xl font-black text-white tracking-tight font-heading leading-tight">
                                {activeSession ? 'Tracking Live' : 'Deployment'}
                            </h2>
                            <p className="text-[10px] text-zinc-500 font-black uppercase tracking-[0.2em]">Safe Walk Protocol v2.5</p>
                        </div>
                    </div>

                    <p className="text-sm text-zinc-400 font-medium leading-relaxed">
                        {activeSession
                            ? 'Your movements are being monitored by VNIT Security HQ and your Hostel Warden.'
                            : 'Initialize a secure tracking session for your cross-campus movement.'}
                    </p>
                </motion.div>

                <AnimatePresence mode="wait">
                    {activeSession ? (
                        <motion.div
                            key="active"
                            className="space-y-6"
                            initial="hidden"
                            animate="visible"
                            variants={containerStagger}
                        >
                            {/* Mission Clock Pod */}
                            <motion.div variants={cardVariant} className="glass p-6 rounded-[2.5rem] border border-white/5 flex items-center justify-between shadow-xl">
                                <div>
                                    <p className="text-[9px] text-zinc-500 font-black uppercase tracking-[0.2em] mb-1">Mission Clock</p>
                                    <p className="text-4xl font-black text-white font-mono tracking-tighter drop-shadow-[0_0_10px_rgba(255,255,255,0.1)]">
                                        {formatTime(remainingTime)}
                                    </p>
                                </div>
                                <div className="text-right">
                                    <p className="text-[9px] text-zinc-500 font-black uppercase tracking-[0.2em] mb-1">Status</p>
                                    <div className="flex items-center gap-2 justify-end">
                                        <div className={`w-2.5 h-2.5 rounded-full animate-pulse shadow-[0_0_10px_rgba(34,197,94,0.5)] ${activeSession.status === 'active' ? 'bg-emerald-500' :
                                            activeSession.status === 'paused' ? 'bg-amber-500' : 'bg-red-500'
                                            }`} />
                                        <p className="text-sm font-black text-white uppercase tracking-wider">{activeSession.status}</p>
                                    </div>
                                </div>
                            </motion.div>

                            {/* Destination Detail Pod */}
                            <motion.div variants={cardVariant} className="glass p-6 rounded-[2.5rem] border border-white/5 space-y-5">
                                <div className="flex items-center gap-4">
                                    <div className="p-3 bg-white/5 rounded-xl border border-white/10">
                                        <MapPin className="w-5 h-5 text-[#D4AF37]" />
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-[9px] font-black text-zinc-500 uppercase tracking-[0.2em]">Target Location</p>
                                        <p className="text-lg font-black text-white tracking-tight">{activeSession.destination.name}</p>
                                    </div>
                                </div>

                                {activeSession.timeline && activeSession.timeline.some(e => e.type === 'message') && (
                                    <div className="pt-5 border-t border-white/5 space-y-4">
                                        <div className="flex items-center gap-2">
                                            <MessageCircle className="w-4 h-4 text-[#D4AF37]" />
                                            <p className="text-[9px] font-black text-zinc-500 uppercase tracking-[0.2em]">HQ Communications</p>
                                        </div>
                                        {activeSession.timeline
                                            .filter(e => e.type === 'message')
                                            .slice(-2)
                                            .map((msg, idx) => (
                                                <div key={idx} className="p-4 bg-white/5 rounded-2xl border border-white/5">
                                                    <p className="text-sm text-zinc-300 font-medium italic">"{msg.details.split(': ')[1] || msg.details}"</p>
                                                </div>
                                            ))
                                        }
                                    </div>
                                )}
                            </motion.div>

                            {/* Tactical Intel Map Pod */}
                            <motion.div variants={cardVariant} className="glass rounded-[2.5rem] border border-white/5 overflow-hidden shadow-2xl h-[300px] relative">
                                <EventDetailMap
                                    userName={profile?.name || user?.displayName || 'Student'}
                                    eventType="SAFEWALK"
                                    location={liveLocation}
                                    destination={{
                                        lat: activeSession.destination.lat,
                                        lng: activeSession.destination.lng
                                    }}
                                />
                                <div className="absolute top-4 left-4 z-[30]">
                                    <div className="glass px-3 py-1.5 rounded-xl border border-white/10 flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-[#D4AF37] animate-pulse" />
                                        <span className="text-[10px] font-black text-white uppercase tracking-widest">Tactical Intel</span>
                                    </div>
                                </div>
                            </motion.div>

                            {/* Action Matrix */}
                            <div className="grid grid-cols-2 gap-4">
                                <button
                                    onClick={handleEndWalk}
                                    className="py-5 bg-emerald-500 text-black font-black uppercase tracking-widest text-[11px] rounded-[24px] shadow-2xl active:scale-95 transition-all border border-emerald-400/20"
                                >
                                    MISSION COMPLETE
                                </button>
                                <button
                                    onClick={handleSOS}
                                    className="py-5 bg-red-600 text-white font-black uppercase tracking-widest text-[11px] rounded-[24px] shadow-2xl active:scale-95 transition-all border border-red-500/30"
                                >
                                    ABORT/SOS
                                </button>
                            </div>
                        </motion.div>
                    ) : (
                        <motion.div
                            key="setup"
                            className="space-y-6"
                            initial="hidden"
                            animate="visible"
                            variants={containerStagger}
                        >
                            {/* Destination Pod */}
                            <motion.div variants={cardVariant} className="glass p-6 rounded-[2.5rem] border border-white/5 space-y-4">
                                <div className="flex items-center justify-between px-2">
                                    <p className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em]">Select Target</p>
                                    <Navigation className="w-4 h-4 text-[#D4AF37]/40" />
                                </div>

                                <div className="relative group">
                                    <input
                                        type="text"
                                        placeholder="Search locations..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="w-full px-5 py-4 pl-12 rounded-[22px] bg-black/40 border border-white/10 focus:border-[#D4AF37]/50 focus:ring-4 focus:ring-[#D4AF37]/5 outline-none font-bold text-white transition-all shadow-inner placeholder:text-zinc-700"
                                    />
                                    <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#D4AF37]" strokeWidth={2.5} />
                                </div>

                                <div className="max-h-[180px] overflow-y-auto pr-1 space-y-2 custom-scrollbar">
                                    {CAMPUS_LOCATIONS
                                        .filter(loc => loc.name.toLowerCase().includes(searchQuery.toLowerCase()))
                                        .map((loc) => (
                                            <button
                                                key={loc.name}
                                                onClick={() => { setDestination(loc.name); setSearchQuery(loc.name); setCustomDestination(''); }}
                                                className={`w-full flex items-center justify-between p-4 rounded-2xl border transition-all ${destination === loc.name
                                                    ? 'bg-[#D4AF37]/10 border-[#D4AF37]/40 text-white'
                                                    : 'bg-white/5 border-transparent text-zinc-500 hover:bg-white/10'
                                                    }`}
                                            >
                                                <span className="text-sm font-black tracking-tight">{loc.name}</span>
                                                {destination === loc.name && <div className="w-2 h-2 rounded-full bg-[#D4AF37] shadow-[0_0_10px_#D4AF37]" />}
                                            </button>
                                        ))
                                    }
                                </div>
                            </motion.div>

                            {/* Advanced Timing Matrix Pod */}
                            <motion.div variants={cardVariant} className="glass p-6 rounded-[2.5rem] border border-white/5 space-y-6 relative overflow-hidden group">
                                <div className="absolute top-0 right-0 w-24 h-24 bg-[#D4AF37]/5 rounded-full blur-2xl -mr-12 -mt-12 transition-all duration-1000 group-hover:bg-[#D4AF37]/10" />

                                <div className="flex items-center justify-between px-2 relative z-10">
                                    <div className="flex items-center gap-2">
                                        <Clock className="w-4 h-4 text-[#D4AF37]" />
                                        <p className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em]">Mission Duration</p>
                                    </div>
                                    <div className="flex items-baseline gap-1">
                                        <span className="text-2xl font-black text-[#D4AF37] font-mono tracking-tighter drop-shadow-[0_0_8px_rgba(212,175,55,0.4)]">{duration}</span>
                                        <span className="text-[10px] font-black text-zinc-500 uppercase">min</span>
                                    </div>
                                </div>

                                {/* Precision Scrubber */}
                                <div className="px-2 space-y-3 relative z-10">
                                    <input
                                        type="range"
                                        min="1"
                                        max="60"
                                        step="1"
                                        value={duration}
                                        onChange={(e) => setDuration(Number(e.target.value))}
                                        className="w-full h-1.5 bg-white/5 rounded-full appearance-none accent-[#D4AF37] cursor-pointer border border-white/5 shadow-inner"
                                    />
                                    <div className="flex justify-between px-1">
                                        <span className="text-[8px] text-zinc-600 font-black uppercase tracking-tighter">01m</span>
                                        <span className="text-[8px] text-zinc-600 font-black uppercase tracking-tighter">predefined presets below</span>
                                        <span className="text-[8px] text-zinc-600 font-black uppercase tracking-tighter">60m</span>
                                    </div>
                                </div>

                                {/* Quick Presets Horziontal Scroll */}
                                <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar-hide px-2 relative z-10">
                                    {[5, 10, 15, 20, 30, 45, 60].map((time) => (
                                        <button
                                            key={time}
                                            onClick={() => setDuration(time)}
                                            className={`flex-shrink-0 px-6 py-3 rounded-xl border transition-all duration-300 ${duration === time
                                                ? 'bg-[#D4AF37] border-[#D4AF37] text-black shadow-[0_5px_15px_rgba(212,175,55,0.3)] scale-105'
                                                : 'bg-white/5 border-white/5 text-zinc-500 hover:border-white/10'
                                                }`}
                                        >
                                            <span className="text-xs font-black">{time}m</span>
                                        </button>
                                    ))}
                                </div>
                            </motion.div>

                            {/* Note Matrix */}
                            <motion.div variants={cardVariant} className="glass p-6 rounded-[2.5rem] border border-white/5">
                                <textarea
                                    value={note}
                                    onChange={(e) => setNote(e.target.value)}
                                    placeholder="Add tactical note (optional)..."
                                    className="w-full p-4 rounded-2xl bg-black/20 border border-white/5 focus:border-[#D4AF37]/30 outline-none text-sm font-bold text-white transition-all resize-none h-24 placeholder:text-zinc-700"
                                />
                            </motion.div>

                            <motion.button
                                variants={buttonGlow}
                                animate="animate"
                                whileTap={{ scale: 0.98 }}
                                onClick={handleStartWalk}
                                disabled={loading || (!destination && !customDestination)}
                                className="w-full py-5 bg-gradient-to-br from-[#D4AF37] via-[#B8962D] to-[#8B6E13] text-black font-black uppercase tracking-[0.3em] text-[11px] rounded-[24px] shadow-[0_15px_40px_rgba(212,175,55,0.25)] hover:shadow-[0_20px_50px_rgba(212,175,55,0.35)] transition-all border border-white/20 disabled:opacity-30 flex items-center justify-center gap-3"
                            >
                                {loading ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-black/20 border-t-black rounded-full animate-spin" />
                                        <span>Calibrating...</span>
                                    </>
                                ) : (
                                    <>
                                        <Shield className="w-4 h-4" strokeWidth={3} />
                                        <span>Deploy Protocol</span>
                                    </>
                                )}
                            </motion.button>
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.main >

            <BottomNav />
        </MobileWrapper >
    );
}
