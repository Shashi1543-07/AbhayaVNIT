import MobileWrapper from '../../components/layout/MobileWrapper';
import { useAuthStore } from '../../context/authStore';
import TopHeader from '../../components/layout/TopHeader';
import BottomNav from '../../components/layout/BottomNav';
import SOSButton from '../../components/student/SOSButton';
import ActionCard from '../../components/ui/ActionCard';
import { X, Shield, MapPin, Footprints, AlertTriangle, Home, Video, Newspaper, Megaphone } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { callService } from '../../services/callService';
import { userService, type UserProfile } from '../../services/userService';
import { containerStagger, cardVariant } from '../../lib/animations';
import { useSOS } from '../../features/sos/useSOS';
import { motion } from 'framer-motion';
import BroadcastViewer from '../../components/shared/BroadcastViewer';

export default function StudentDashboard() {
    const navigate = useNavigate();
    const { user, profile } = useAuthStore();
    const { activeSOS, resolveSOS } = useSOS();
    const [staff, setStaff] = useState<UserProfile[]>([]);
    const [showBroadcasts, setShowBroadcasts] = useState(false);
    const [locationName, setLocationName] = useState('Locating...');
    const [gpsOn, setGpsOn] = useState(true);
    const [lastGeocodeTime, setLastGeocodeTime] = useState(0);

    useEffect(() => {
        if (!navigator.geolocation) {
            setGpsOn(false);
            setLocationName('GPS Not Supported');
            return;
        }

        const watchId = navigator.geolocation.watchPosition(
            async (pos) => {
                setGpsOn(true);
                const { latitude, longitude } = pos.coords;

                // Throttle geocoding to once every 30 seconds
                const now = Date.now();
                if (now - lastGeocodeTime < 30000) return;
                setLastGeocodeTime(now);

                try {
                    const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18`, {
                        headers: { 'Accept-Language': 'en' }
                    });

                    if (res.ok) {
                        const data = await res.json();
                        const area = data.address?.road || data.address?.suburb || data.address?.neighbourhood || data.address?.city || 'VNIT Campus';
                        setLocationName(area);
                    } else {
                        setLocationName(`${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
                    }
                } catch (err) {
                    setLocationName(`${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
                }
            },
            (err) => {
                if (err.code !== 3) {
                    console.error("Dashboard: Geolocation failed:", err);
                }
                setGpsOn(false);
                setLocationName(err.code === 3 ? 'GPS Timeout' : 'GPS Disabled');
            },
            {
                enableHighAccuracy: true,
                timeout: 15000,
                maximumAge: 10000
            }
        );

        return () => navigator.geolocation.clearWatch(watchId);
    }, [lastGeocodeTime]);

    useEffect(() => {
        userService.getStaff().then(data => {
            console.log("StudentDashboard: Staff list fetched:", data);
            setStaff(data);
        });
    }, []);

    // Removed the automatic subscription to hostel broadcasts for the dashboard view to avoid duplication
    // We will use the BroadcastViewer for admin broadcasts.
    // Hostel specific broadcasts (if any) can remain if needed, but for now focusing on Admin Broadcasts.

    const handleSOS = () => {
        // Just vibrate, the button handles the API call
        if (navigator.vibrate) navigator.vibrate([500, 200, 500]);
    };

    const isSOSActive = !!(activeSOS && !activeSOS.status?.resolved);

    return (
        <MobileWrapper>
            <TopHeader
                title={profile?.name ? `Welcome, ${profile.name.split(' ')[0]}!` : 'Welcome!'}
                showBackButton={true}
            />

            <BroadcastViewer
                isOpen={showBroadcasts}
                onClose={() => setShowBroadcasts(false)}
                role="student"
            />

            <motion.main
                className="px-4 pt-nav-safe pb-nav-safe"
                variants={containerStagger}
                initial="hidden"
                animate="visible"
            >
                {/* SOS Section */}
                <motion.div variants={cardVariant} className="flex flex-col items-center justify-center py-4 relative z-20">

                    {/* SOS Button always visible, grayscale if active */}
                    <div className="relative">
                        <SOSButton
                            onActivate={handleSOS}
                            disabled={isSOSActive}
                        />
                        {isSOSActive && <div className="absolute inset-0 z-30 cursor-not-allowed" title="SOS is active" />}
                    </div>

                    <p className={`text-[10px] mt-6 font-black uppercase tracking-[0.2em] transition-all duration-500 ${isSOSActive ? "text-[#D4AF37] animate-pulse" : "text-slate-400 opacity-60"}`}>
                        {isSOSActive ? "Trigger Restricted: SOS Active" : "Long press to activate emergency"}
                    </p>
                </motion.div>

                {/* Unified SOS Status Card */}
                {isSOSActive && (
                    <div className="w-full glass-card rounded-[40px] p-8 border border-[#D4AF37]/20 shadow-[0_0_50px_rgba(212,175,55,0.1)] relative overflow-hidden flex flex-col items-center mb-8 animate-in fade-in slide-in-from-top-6 duration-700">
                        {/* Subtle internal pulse/glow */}
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(212,175,55,0.08)_0%,transparent_70%)] animate-pulse" />

                        <div className="flex items-center gap-2 mb-4 bg-red-500/10 px-4 py-1.5 rounded-full border border-red-500/20 relative z-10">
                            <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.8)]" />
                            <span className="text-[10px] font-black tracking-[0.2em] text-red-500 uppercase">Monitoring Active</span>
                        </div>

                        <h2 className="text-[32px] font-black text-white mb-2 tracking-tight text-center leading-[1.1] relative z-10 font-heading">
                            Help is on the way
                        </h2>

                        <div className="flex flex-col items-center gap-1 mb-10 relative z-10">
                            <span className="text-[9px] font-black text-zinc-500 uppercase tracking-[0.2em] mb-1">Signal Status</span>
                            <div className="bg-[#D4AF37]/10 px-5 py-2 rounded-2xl border border-[#D4AF37]/20 backdrop-blur-md">
                                <span className={`text-[12px] font-black uppercase tracking-[0.15em] ${!activeSOS?.status?.recognised ? 'text-amber-500' : 'text-[#D4AF37]'}`}>
                                    {!activeSOS?.status?.recognised ? 'PENDING' : 'RECOGNIZED'}
                                </span>
                            </div>
                        </div>

                        <button
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                if (activeSOS?.id) {
                                    resolveSOS(activeSOS.id).then(() => {
                                        console.log("SOS Successfully Cancelled");
                                    }).catch(err => {
                                        console.error("SOS Cancel Error:", err);
                                    });
                                }
                            }}
                            className="w-full py-5 border-2 border-red-500/40 rounded-[28px] flex items-center justify-center gap-3 transition-all bg-red-500/10 hover:bg-red-500/20 relative z-30 pointer-events-auto active:scale-[0.98]"
                        >
                            <div className="w-6 h-6 rounded-full border border-red-500 flex items-center justify-center shadow-[0_0_10px_rgba(239,68,68,0.2)]">
                                <X className="w-4 h-4 text-red-500" />
                            </div>
                            <span className="text-sm font-black text-red-500 tracking-[0.15em] uppercase">CANCEL SOS</span>
                        </button>
                    </div>
                )}

                {/* Location Info */}
                <motion.div variants={cardVariant} className="glass rounded-[32px] p-4 flex items-center justify-between mb-8 shadow-2xl">
                    <div className="flex items-center space-x-3">
                        <div className="bg-[#D4AF37]/10 p-2.5 rounded-2xl border border-[#D4AF37]/20">
                            <MapPin className="text-[#D4AF37] w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest font-heading mb-0.5">Nearby Area</p>
                            <h4 className="text-sm font-black text-white font-heading tracking-tight leading-tight">
                                {locationName}
                            </h4>
                        </div>
                    </div>
                    {gpsOn && (
                        <div className="flex items-center gap-1 bg-emerald-500/5 px-3 py-1.5 rounded-xl border border-emerald-500/10 backdrop-blur-md">
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            <span className="text-[9px] font-black text-emerald-500 uppercase tracking-widest font-heading">GPS: ON</span>
                        </div>
                    )}
                </motion.div>

                {/* Quick Actions */}
                <motion.div variants={cardVariant}>
                    <h3 className="text-sm font-bold text-[#D4AF37] mb-3 ml-1 font-heading uppercase tracking-tighter">Quick Actions</h3>
                    <div className="grid grid-cols-3 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                        <ActionCard icon={Footprints} label="Safe Walk" onClick={() => navigate('/student/safewalk')} />
                        <ActionCard icon={AlertTriangle} label="Report" onClick={() => navigate('/student/report')} />
                        <ActionCard icon={Newspaper} label="Feed" onClick={() => navigate('/feed')} />
                    </div>
                </motion.div>

                {/* Calling Section */}
                <motion.div variants={cardVariant} className={`mt-10 ${!isSOSActive ? 'opacity-60' : ''}`}>
                    <div className="flex justify-between items-end mb-3 ml-1">
                        <h3 className="text-sm font-bold text-[#D4AF37] font-heading uppercase tracking-tighter">Emergency Calling</h3>
                        {!isSOSActive && (
                            <span className="text-[9px] text-[#CF9E1B] font-bold bg-[#D4AF37]/10 px-2 py-0.5 rounded-full border border-[#D4AF37]/20">
                                ACTIVATE SOS TO ENABLE
                            </span>
                        )}
                    </div>

                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        {/* Security Calls */}
                        <div className="space-y-2">
                            <button
                                disabled={!isSOSActive}
                                onClick={() => {
                                    const security = staff.find(s => s.role === 'security');
                                    if (security && user && activeSOS?.id) {
                                        callService.startCall({
                                            uid: user.uid,
                                            name: profile?.name || user.displayName || 'Student',
                                            role: 'student'
                                        }, security, activeSOS.id, 'sos', false);
                                    } else if (!isSOSActive) {
                                        alert("Calling is only enabled during an active SOS.");
                                    } else {
                                        alert("Security personnel currently unavailable.");
                                    }
                                }}
                                className={`w-full glass rounded-3xl p-4 flex flex-col items-center gap-2 border border-[#D4AF37]/20 active:scale-95 transition-all shadow-xl ${!isSOSActive ? 'grayscale cursor-not-allowed opacity-50' : ''}`}
                            >
                                <div className="w-12 h-12 bg-[#D4AF37]/10 rounded-2xl flex items-center justify-center border border-[#D4AF37]/20">
                                    <Shield className="w-6 h-6 text-[#D4AF37]" />
                                </div>
                                <span className="text-[10px] font-black uppercase tracking-widest text-[#D4AF37] font-heading">Voice Security</span>
                            </button>
                            <button
                                disabled={!isSOSActive}
                                onClick={() => {
                                    const security = staff.find(s => s.role === 'security');
                                    if (security && user && activeSOS?.id) {
                                        callService.startCall({
                                            uid: user.uid,
                                            name: profile?.name || user.displayName || 'Student',
                                            role: 'student'
                                        }, security, activeSOS.id, 'sos', true);
                                    } else if (!isSOSActive) {
                                        alert("Calling is only enabled during an active SOS.");
                                    } else {
                                        alert("Security personnel currently unavailable.");
                                    }
                                }}
                                className={`w-full glass rounded-3xl p-4 flex flex-col items-center gap-2 border border-emerald-500/20 active:scale-95 transition-all shadow-xl ${!isSOSActive ? 'grayscale cursor-not-allowed opacity-50' : ''}`}
                            >
                                <div className="w-12 h-12 bg-emerald-500/10 rounded-2xl flex items-center justify-center border border-emerald-500/20">
                                    <Video className="w-6 h-6 text-emerald-500" />
                                </div>
                                <span className="text-[10px] font-black uppercase tracking-widest text-emerald-500 font-heading">Video Security</span>
                            </button>
                        </div>

                        {/* Warden Calls */}
                        <div className="space-y-2">
                            <button
                                disabled={!isSOSActive}
                                onClick={() => {
                                    const studentHostel = profile?.hostelId || profile?.hostel;
                                    const warden = staff.find(s =>
                                        s.role === 'warden' &&
                                        ((s as any).hostel === studentHostel || (s as any).hostelId === studentHostel)
                                    );
                                    if (warden && user && activeSOS?.id) {
                                        callService.startCall({
                                            uid: user.uid,
                                            name: profile?.name || user.displayName || 'Student',
                                            role: 'student'
                                        }, warden, activeSOS.id, 'sos', false);
                                    } else if (!isSOSActive) {
                                        alert("Calling is only enabled during an active SOS.");
                                    } else {
                                        alert(`Warden unavailable. (Hostel: ${studentHostel || 'N/A'})`);
                                    }
                                }}
                                className={`w-full glass rounded-3xl p-4 flex flex-col items-center gap-2 border border-[#D4AF37]/20 active:scale-95 transition-all shadow-xl ${!isSOSActive ? 'grayscale cursor-not-allowed opacity-50' : ''}`}
                            >
                                <div className="w-12 h-12 bg-[#D4AF37]/10 rounded-2xl flex items-center justify-center border border-[#D4AF37]/20">
                                    <Home className="w-6 h-6 text-[#D4AF37]" />
                                </div>
                                <span className="text-[10px] font-black uppercase tracking-widest text-[#D4AF37] font-heading">Voice Warden</span>
                            </button>
                            <button
                                disabled={!isSOSActive}
                                onClick={() => {
                                    const studentHostel = profile?.hostelId || profile?.hostel;
                                    const warden = staff.find(s =>
                                        s.role === 'warden' &&
                                        ((s as any).hostel === studentHostel || (s as any).hostelId === studentHostel)
                                    );
                                    if (warden && user && activeSOS?.id) {
                                        callService.startCall({
                                            uid: user.uid,
                                            name: profile?.name || user.displayName || 'Student',
                                            role: 'student'
                                        }, warden, activeSOS.id, 'sos', true);
                                    } else if (!isSOSActive) {
                                        alert("Calling is only enabled during an active SOS.");
                                    } else {
                                        alert(`Warden unavailable. (Hostel: ${studentHostel || 'N/A'})`);
                                    }
                                }}
                                className={`w-full glass rounded-3xl p-4 flex flex-col items-center gap-2 border border-amber-500/20 active:scale-95 transition-all shadow-xl ${!isSOSActive ? 'grayscale cursor-not-allowed opacity-50' : ''}`}
                            >
                                <div className="w-12 h-12 bg-amber-500/10 rounded-2xl flex items-center justify-center border border-amber-500/20">
                                    <Video className="w-6 h-6 text-amber-500" />
                                </div>
                                <span className="text-[10px] font-black uppercase tracking-widest text-amber-500 font-heading">Video Warden</span>
                            </button>
                        </div>
                    </div>
                </motion.div>

                {/* Bottom Spacer */}
                <div className="h-6" />

                <motion.button
                    variants={cardVariant}
                    onClick={() => setShowBroadcasts(true)}
                    className="w-full bg-gradient-to-br from-[#CF9E1B] via-[#D4AF37] to-[#8B6E13] p-[1.5px] rounded-[32px] shadow-2xl active:scale-95 transition-all mb-6 group"
                >
                    <div className="bg-black/80 backdrop-blur-2xl rounded-[30px] p-5 flex items-center justify-between border border-white/5">
                        <div className="flex items-center gap-4">
                            <div className="bg-[#D4AF37]/10 p-3 rounded-2xl shadow-lg group-hover:scale-110 transition-transform border border-[#D4AF37]/20">
                                <Megaphone className="w-6 h-6 text-[#D4AF37]" />
                            </div>
                            <div className="text-left">
                                <h3 className="font-black text-white text-base font-heading tracking-tight">Announcements</h3>
                                <p className="text-xs text-[#D4AF37] font-bold opacity-60">View official admin broadcasts</p>
                            </div>
                        </div>
                        <div className="bg-[#D4AF37] px-4 py-2 rounded-2xl text-[10px] font-black text-black uppercase tracking-widest shadow-lg font-heading">
                            View
                        </div>
                    </div>
                </motion.button>

                <div className="h-20" />

                {/* Alerts / Broadcasts */}
                {/* Alerts / Broadcasts - Replaced by BroadcastViewer */}

                {/* My Reports Preview */}

            </motion.main>

            <BottomNav />
        </MobileWrapper >
    );
}
