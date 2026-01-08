import MobileWrapper from '../../components/layout/MobileWrapper';
import { useAuthStore } from '../../context/authStore';
import TopHeader from '../../components/layout/TopHeader';
import BottomNav from '../../components/layout/BottomNav';
import SOSButton from '../../components/student/SOSButton';
import ActionCard from '../../components/ui/ActionCard';
import StatusBadge from '../../components/ui/StatusBadge';
import { Footprints, Shield, AlertTriangle, MapPin, Home, Video, Newspaper } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { callService } from '../../services/callService';
import { userService, type UserProfile } from '../../services/userService';
import { safeWalkService } from '../../services/safeWalkService';
import { motion } from 'framer-motion';
import { containerStagger, cardVariant } from '../../lib/animations';
import { useSOS } from '../../features/sos/useSOS';

import BroadcastViewer from '../../components/shared/BroadcastViewer';
import { Megaphone } from 'lucide-react';

export default function StudentDashboard() {
    const navigate = useNavigate();
    const { user, profile } = useAuthStore();
    const { activeSOS } = useSOS();
    const [staff, setStaff] = useState<UserProfile[]>([]);
    const [activeWalk, setActiveWalk] = useState<any>(null);
    const [showBroadcasts, setShowBroadcasts] = useState(false);
    const [locationName, setLocationName] = useState('Locating...');
    const [gpsOn, setGpsOn] = useState(true);

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

                try {
                    const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18`);
                    const data = await res.json();
                    const area = data.address.road || data.address.suburb || data.address.neighbourhood || data.address.city || 'VNIT Campus';
                    setLocationName(area);
                } catch (err) {
                    console.error("Dashboard: Geocoding failed:", err);
                    setLocationName(`${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
                }
            },
            (err) => {
                console.error("Dashboard: Geolocation failed:", err);
                setGpsOn(false);
                setLocationName('GPS Disabled');
            },
            { enableHighAccuracy: true }
        );

        return () => navigator.geolocation.clearWatch(watchId);
    }, []);

    useEffect(() => {
        userService.getStaff().then(data => {
            console.log("StudentDashboard: Staff list fetched:", data);
            setStaff(data);
        });
    }, []);

    useEffect(() => {
        if (!user) return;
        const unsubscribe = safeWalkService.subscribeToUserActiveWalk(user.uid, (walk) => {
            setActiveWalk(walk);
        });
        return () => unsubscribe();
    }, [user]);

    // Removed the automatic subscription to hostel broadcasts for the dashboard view to avoid duplication
    // We will use the BroadcastViewer for admin broadcasts.
    // Hostel specific broadcasts (if any) can remain if needed, but for now focusing on Admin Broadcasts.

    const handleSOS = () => {
        // Just vibrate, the button handles the API call
        if (navigator.vibrate) navigator.vibrate([500, 200, 500]);
    };

    const emergencyId = activeSOS?.id || activeWalk?.id;
    const emergencyType = activeSOS ? 'sos' : activeWalk ? 'safe_walk' : null;
    const isEmergencyActive = !!emergencyId;

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
                className="px-4 pb-24 main-content-safe"
                variants={containerStagger}
                initial="hidden"
                animate="visible"
            >
                {/* SOS Section */}
                <motion.div variants={cardVariant} className="flex flex-col items-center justify-center py-4 relative z-20">
                    <SOSButton
                        onActivate={handleSOS}
                        disabled={!!(activeSOS && !activeSOS.status?.resolved)}
                    />
                    <p className={`text-[10px] mt-4 font-black uppercase tracking-widest transition-all duration-500 ${activeSOS && !activeSOS.status?.resolved ? "text-amber-500 animate-pulse" : "text-slate-400 opacity-60"}`}>
                        {activeSOS && !activeSOS.status?.resolved ? "Trigger Restricted: SOS Active" : "Long press to activate emergency"}
                    </p>
                </motion.div>

                {/* Active SOS Status Card - Restored with Robust Visibility */}
                {activeSOS && (
                    <div className="glass-card rounded-3xl p-6 border-2 border-emerald-500/30 bg-white/60 shadow-2xl mb-8 relative z-30 transition-all duration-500 animate-in fade-in slide-in-from-top-4">
                        <div className="flex items-start justify-between mb-4">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-2xl bg-emerald-100 flex items-center justify-center shadow-inner">
                                    <Shield className="w-6 h-6 text-emerald-600" />
                                </div>
                                <div>
                                    <h3 className="font-extrabold text-slate-800 text-base">Current SOS State</h3>
                                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tight">
                                        Triggered: {activeSOS.triggeredAt ? new Date(activeSOS.triggeredAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Live'}
                                    </p>
                                </div>
                            </div>
                            <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest shadow-md border border-white/40
                                ${!activeSOS.status?.recognised ? 'bg-amber-100 text-amber-700 animate-pulse' :
                                    !activeSOS.status?.resolved ? 'bg-blue-100 text-blue-700' :
                                        'bg-green-100 text-green-700'}
                            `}>
                                {!activeSOS.status?.recognised ? 'Pending' :
                                    !activeSOS.status?.resolved ? 'Security Responding' :
                                        'Resolved'}
                            </span>
                        </div>

                        {/* Status Details */}
                        <div className="space-y-3">
                            {activeSOS.status?.recognised ? (
                                <div className="p-4 bg-blue-50/80 rounded-2xl border border-blue-200/50 backdrop-blur-sm shadow-sm">
                                    <div className="flex items-center gap-2 mb-1">
                                        <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                                        <p className="text-[10px] font-black text-blue-800 uppercase tracking-widest">Security Action Taken</p>
                                    </div>
                                    <p className="text-sm font-bold text-blue-900 leading-tight">
                                        {activeSOS.assignedTo?.name || 'Security Team'} is responding to your location.
                                    </p>
                                </div>
                            ) : (
                                <div className="p-4 bg-amber-50/80 rounded-2xl border border-amber-200/50 backdrop-blur-sm shadow-sm">
                                    <div className="flex items-center gap-2 mb-1">
                                        <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                                        <p className="text-[10px] font-black text-amber-800 uppercase tracking-widest">Alert Status</p>
                                    </div>
                                    <p className="text-sm font-bold text-amber-900 leading-tight">
                                        Waiting for security to recognise the signal.
                                    </p>
                                    <p className="text-[10px] text-amber-600 font-medium mt-1">
                                        Your emergency alert has been broadcasted to all nearby guards.
                                    </p>
                                </div>
                            )}

                            {activeSOS.status?.resolved && (
                                <div className="p-4 bg-green-50/80 rounded-2xl border border-green-200/50 backdrop-blur-sm shadow-sm">
                                    <div className="flex items-center gap-2 mb-1">
                                        <div className="w-2 h-2 rounded-full bg-green-500" />
                                        <p className="text-[10px] font-black text-green-800 uppercase tracking-widest">Incident Resolved</p>
                                    </div>
                                    <p className="text-sm font-bold text-green-900 leading-tight">
                                        This alert has been marked as resolved by security.
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Location Info */}
                <motion.div variants={cardVariant} className="glass-card rounded-2xl p-4 flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                        <div className="bg-surface p-2 rounded-full">
                            <MapPin className="text-secondary w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-xs text-muted font-medium">Nearby Area</p>
                            <p className="font-semibold text-primary">{locationName}</p>
                        </div>
                    </div>
                    <div className="flex items-center space-x-1">
                        <StatusBadge status={gpsOn ? "success" : "error"} label={gpsOn ? "GPS: ON" : "GPS: OFF"} />
                    </div>
                </motion.div>

                {/* Quick Actions */}
                <motion.div variants={cardVariant}>
                    <h3 className="text-sm font-bold text-primary mb-3 ml-1">Quick Actions</h3>
                    <div className="grid grid-cols-3 gap-3">
                        <ActionCard icon={Footprints} label="Safe Walk" onClick={() => navigate('/student/safewalk')} />
                        <ActionCard icon={AlertTriangle} label="Report" onClick={() => navigate('/student/report')} />
                        <ActionCard icon={Newspaper} label="Feed" onClick={() => navigate('/feed')} />
                    </div>
                </motion.div>

                {/* Calling Section */}
                <motion.div variants={cardVariant} className={`mt-10 ${!isEmergencyActive ? 'opacity-60' : ''}`}>
                    <div className="flex justify-between items-end mb-3 ml-1">
                        <h3 className="text-sm font-bold text-primary">Emergency Calling</h3>
                        {!isEmergencyActive && (
                            <span className="text-[9px] text-amber-600 font-bold bg-amber-50 px-2 py-0.5 rounded-full border border-amber-100">
                                ACTIVATE SOS TO ENABLE
                            </span>
                        )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        {/* Security Calls */}
                        <div className="space-y-2">
                            <button
                                disabled={!isEmergencyActive}
                                onClick={() => {
                                    const security = staff.find(s => s.role === 'security');
                                    if (security && user && emergencyId && emergencyType) {
                                        callService.startCall({
                                            uid: user.uid,
                                            name: profile?.name || user.displayName || 'Student',
                                            role: 'student'
                                        }, security, emergencyId, emergencyType, false);
                                    } else if (!isEmergencyActive) {
                                        alert("Calling is only enabled during active SOS or Safe Walk.");
                                    } else {
                                        alert("Security personnel currently unavailable.");
                                    }
                                }}
                                className={`w-full glass-card-soft rounded-2xl p-4 flex flex-col items-center gap-2 border border-primary/10 active:scale-95 transition-all bg-white/40 ${!isEmergencyActive ? 'grayscale cursor-not-allowed' : ''}`}
                            >
                                <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                                    <Shield className="w-5 h-5 text-primary" />
                                </div>
                                <span className="text-[10px] font-bold uppercase text-primary">Voice Security</span>
                            </button>
                            <button
                                disabled={!isEmergencyActive}
                                onClick={() => {
                                    const security = staff.find(s => s.role === 'security');
                                    if (security && user && emergencyId && emergencyType) {
                                        callService.startCall({
                                            uid: user.uid,
                                            name: profile?.name || user.displayName || 'Student',
                                            role: 'student'
                                        }, security, emergencyId, emergencyType, true);
                                    } else if (!isEmergencyActive) {
                                        alert("Calling is only enabled during active SOS or Safe Walk.");
                                    } else {
                                        alert("Security personnel currently unavailable.");
                                    }
                                }}
                                className={`w-full glass-card rounded-2xl p-4 flex flex-col items-center gap-2 border border-emerald-500/20 active:scale-95 transition-all bg-emerald-50/30 ${!isEmergencyActive ? 'grayscale cursor-not-allowed' : ''}`}
                            >
                                <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center">
                                    <Video className="w-5 h-5 text-emerald-600" />
                                </div>
                                <span className="text-[10px] font-bold uppercase text-emerald-600">Video Security</span>
                            </button>
                        </div>

                        {/* Warden Calls */}
                        <div className="space-y-2">
                            <button
                                disabled={!isEmergencyActive}
                                onClick={() => {
                                    const studentHostel = profile?.hostelId || profile?.hostel;
                                    const warden = staff.find(s =>
                                        s.role === 'warden' &&
                                        ((s as any).hostel === studentHostel || (s as any).hostelId === studentHostel)
                                    );
                                    if (warden && user && emergencyId && emergencyType) {
                                        callService.startCall({
                                            uid: user.uid,
                                            name: profile?.name || user.displayName || 'Student',
                                            role: 'student'
                                        }, warden, emergencyId, emergencyType, false);
                                    } else if (!isEmergencyActive) {
                                        alert("Calling is only enabled during active SOS or Safe Walk.");
                                    } else {
                                        alert(`Warden unavailable. (Hostel: ${studentHostel || 'N/A'})`);
                                    }
                                }}
                                className={`w-full glass-card-soft rounded-2xl p-4 flex flex-col items-center gap-2 border border-secondary/10 active:scale-95 transition-all bg-white/40 ${!isEmergencyActive ? 'grayscale cursor-not-allowed' : ''}`}
                            >
                                <div className="w-10 h-10 bg-secondary/10 rounded-full flex items-center justify-center">
                                    <Home className="w-5 h-5 text-secondary" />
                                </div>
                                <span className="text-[10px] font-bold uppercase text-secondary">Voice Warden</span>
                            </button>
                            <button
                                disabled={!isEmergencyActive}
                                onClick={() => {
                                    const studentHostel = profile?.hostelId || profile?.hostel;
                                    const warden = staff.find(s =>
                                        s.role === 'warden' &&
                                        ((s as any).hostel === studentHostel || (s as any).hostelId === studentHostel)
                                    );
                                    if (warden && user && emergencyId && emergencyType) {
                                        callService.startCall({
                                            uid: user.uid,
                                            name: profile?.name || user.displayName || 'Student',
                                            role: 'student'
                                        }, warden, emergencyId, emergencyType, true);
                                    } else if (!isEmergencyActive) {
                                        alert("Calling is only enabled during active SOS or Safe Walk.");
                                    } else {
                                        alert(`Warden unavailable. (Hostel: ${studentHostel || 'N/A'})`);
                                    }
                                }}
                                className={`w-full glass-card rounded-2xl p-4 flex flex-col items-center gap-2 border border-amber-500/20 active:scale-95 transition-all bg-amber-50/30 ${!isEmergencyActive ? 'grayscale cursor-not-allowed' : ''}`}
                            >
                                <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center">
                                    <Video className="w-5 h-5 text-amber-600" />
                                </div>
                                <span className="text-[10px] font-bold uppercase text-amber-600">Video Warden</span>
                            </button>
                        </div>
                    </div>
                </motion.div>

                {/* Bottom Spacer */}
                <div className="h-6" />

                {/* Admin Broadcast Button - Moved to Bottom */}
                <motion.button
                    variants={cardVariant}
                    onClick={() => setShowBroadcasts(true)}
                    className="w-full bg-gradient-to-r from-[#FF99AC] via-[#C084FC] to-[#89CFF0] p-1 rounded-2xl shadow-lg active:scale-95 transition-all mb-6"
                >
                    <div className="bg-white/20 backdrop-blur-sm rounded-xl p-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="bg-white/30 p-2 rounded-full">
                                <Megaphone className="w-5 h-5 text-white" />
                            </div>
                            <div className="text-left">
                                <h3 className="font-bold text-white text-sm">Announcements</h3>
                                <p className="text-xs text-white/90">View admin broadcasts</p>
                            </div>
                        </div>
                        <div className="bg-white/30 px-3 py-1 rounded-full text-xs font-bold text-white">
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
        </MobileWrapper>
    );
}
