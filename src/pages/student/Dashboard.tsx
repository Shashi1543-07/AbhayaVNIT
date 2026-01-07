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
                className="px-4 pt-28 pb-24"
                variants={containerStagger}
                initial="hidden"
                animate="visible"
            >
                {/* SOS Section */}
                <motion.div variants={cardVariant} className="flex flex-col items-center justify-center py-4">
                    <SOSButton onActivate={handleSOS} />
                    <p className="text-muted text-xs mt-4">Long press to activate emergency</p>
                </motion.div>

                {/* Active SOS Status */}
                {activeSOS && (
                    <motion.div
                        variants={cardVariant}
                        className="glass-card rounded-2xl p-5 border-2 border-emerald-500 bg-gradient-to-br from-emerald-50 to-white"
                    >
                        <div className="flex items-start justify-between mb-4">
                            <div className="flex items-center gap-2">
                                <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
                                    <Shield className="w-5 h-5 text-emerald-600" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-emerald-800">SOS Active</h3>
                                    <p className="text-xs text-emerald-600">
                                        {new Date(activeSOS.triggeredAt).toLocaleTimeString()}
                                    </p>
                                </div>
                            </div>
                            <span className={`px-3 py-1 rounded-lg text-xs font-bold
                                ${!activeSOS.status.recognised ? 'bg-amber-100 text-amber-700 animate-pulse' :
                                    !activeSOS.status.resolved ? 'bg-blue-100 text-blue-700' :
                                        'bg-green-100 text-green-700'}
                            `}>
                                {!activeSOS.status.recognised ? 'Pending' :
                                    !activeSOS.status.resolved ? 'Security Responding' :
                                        'Resolved'}
                            </span>
                        </div>

                        {activeSOS.status.recognised && activeSOS.assignedTo && (
                            <div className="p-3 bg-blue-50 rounded-lg border border-blue-200 mb-3">
                                <p className="text-sm font-bold text-blue-800">Security Personnel Assigned</p>
                                <p className="text-xs text-blue-600">{activeSOS.assignedTo.name}</p>
                            </div>
                        )}

                        {!activeSOS.status.recognised && (
                            <div className="text-center py-3">
                                <p className="text-sm text-amber-700 font-medium">
                                    ⏳ Awaiting security response...
                                </p>
                                <p className="text-xs text-muted mt-1">
                                    Your emergency signal has been sent. Help is on the way.
                                </p>
                            </div>
                        )}

                        {activeSOS.status.resolved && (
                            <div className="text-center py-3 bg-green-50 rounded-lg">
                                <p className="text-sm text-green-700 font-bold">
                                    ✓ Emergency Resolved
                                </p>
                                <p className="text-xs text-muted mt-1">
                                    Resolved at {activeSOS.resolvedAt ? new Date(activeSOS.resolvedAt).toLocaleTimeString() : 'N/A'}
                                </p>
                            </div>
                        )}
                    </motion.div>
                )}

                {/* Location Info */}
                <motion.div variants={cardVariant} className="glass-card rounded-2xl p-4 flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                        <div className="bg-surface p-2 rounded-full">
                            <MapPin className="text-secondary w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-xs text-muted font-medium">Nearby Area</p>
                            <p className="font-semibold text-primary">Workshop Road</p>
                        </div>
                    </div>
                    <div className="flex items-center space-x-1">
                        <StatusBadge status="success" label="GPS: ON" />
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
                <motion.div variants={cardVariant} className={!isEmergencyActive ? 'opacity-60' : ''}>
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
