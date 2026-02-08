import MobileWrapper from '../../components/layout/MobileWrapper';
import { useAuthStore } from '../../context/authStore';
import TopHeader from '../../components/layout/TopHeader';
import BottomNav from '../../components/layout/BottomNav';
import SOSButton from '../../components/student/SOSButton';
import ActionCard from '../../components/ui/ActionCard';
import { X, Shield, Footprints, AlertTriangle, Home, Video, Newspaper, Megaphone, Phone, ChevronDown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { callService } from '../../services/callService';
import { userService } from '../../services/userService';
import type { UserProfile } from '../../services/userService';
import { containerStagger, cardVariant } from '../../lib/animations';
import { useSOS } from '../../features/sos/useSOS';
import { motion } from 'framer-motion';
import BroadcastViewer from '../../components/shared/BroadcastViewer';

export default function StudentDashboard() {
    const navigate = useNavigate();
    const { user, profile } = useAuthStore();
    const { activeSOS, resolveSOS } = useSOS();
    const [showBroadcasts, setShowBroadcasts] = useState(false);
    const [wardens, setWardens] = useState<UserProfile[]>([]);
    const [securityStaff, setSecurityStaff] = useState<UserProfile[]>([]);
    const [expandedSection, setExpandedSection] = useState<'wardens' | 'security' | null>(null);

    // Fetch wardens and security staff on mount
    useEffect(() => {
        const fetchStaff = async () => {
            const [w, s] = await Promise.all([
                userService.getWardens(),
                userService.getSecurityStaff()
            ]);
            setWardens(w);
            setSecurityStaff(s);
        };
        fetchStaff();
    }, []);

    const handleSOS = () => {
        if (navigator.vibrate) navigator.vibrate([500, 200, 500]);
    };

    const isSOSActive = !!(activeSOS && !activeSOS.status?.resolved);

    return (
        <MobileWrapper>
            <TopHeader
                title={profile?.name ? `Hi, ${profile.name}!` : profile?.username ? `Welcome, ${profile.username}!` : 'Welcome!'}
                showBackButton={false}
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

                {/* Quick Actions */}
                <motion.div variants={cardVariant} className="mt-4">
                    <h3 className="text-sm font-bold text-[#D4AF37] mb-3 ml-1 font-heading uppercase tracking-tighter">Quick Actions</h3>
                    <div className="grid grid-cols-3 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                        <ActionCard icon={Footprints} label="Safe Walk" onClick={() => navigate('/student/safewalk')} />
                        <ActionCard icon={AlertTriangle} label="Report" onClick={() => navigate('/student/report')} />
                        <ActionCard icon={Newspaper} label="Feed" onClick={() => navigate('/feed')} />
                    </div>
                </motion.div>

                {/* Emergency Calling */}
                <motion.div variants={cardVariant} className="mt-10">
                    <div className="flex justify-between items-end mb-4 ml-1">
                        <h3 className="text-sm font-bold text-[#D4AF37] font-heading uppercase tracking-tighter">Emergency Calling</h3>
                        {!isSOSActive && (
                            <span className="text-[9px] text-[#CF9E1B] font-bold bg-[#D4AF37]/10 px-2 py-0.5 rounded-full border border-[#D4AF37]/20">
                                ACTIVATE SOS TO ENABLE
                            </span>
                        )}
                    </div>

                    <div className="space-y-4">

                        {/* Wardens Section */}
                        <div
                            className={`glass-card rounded-3xl border border-[#D4AF37]/20 overflow-hidden transition-all duration-300 ${expandedSection === 'wardens' ? 'p-4' : 'p-3'}`}
                        >
                            <button
                                onClick={() => setExpandedSection(expandedSection === 'wardens' ? null : 'wardens')}
                                className="w-full flex items-center justify-between group"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-amber-500/20 rounded-xl flex items-center justify-center">
                                        <Home className="w-5 h-5 text-amber-400" />
                                    </div>
                                    <div className="text-left">
                                        <h4 className="text-sm font-black text-amber-400 uppercase tracking-widest">Wardens</h4>
                                        <p className="text-[10px] text-zinc-500 font-bold">{wardens.length} REGISTERED</p>
                                    </div>
                                </div>
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-500 ${expandedSection === 'wardens' ? 'rotate-180 bg-amber-500/20' : 'bg-white/5'}`}>
                                    <ChevronDown className={`w-4 h-4 ${expandedSection === 'wardens' ? 'text-amber-400' : 'text-zinc-500'}`} />
                                </div>
                            </button>

                            {expandedSection === 'wardens' && (
                                <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    className="pt-4 mt-3 border-t border-white/10"
                                >
                                    <div className="max-h-60 overflow-y-auto space-y-3 pr-1 scrollbar-thin scrollbar-thumb-zinc-700">
                                        {wardens.length === 0 ? (
                                            <div className="text-center py-6 text-zinc-500 text-xs font-bold uppercase tracking-widest">No wardens registered</div>
                                        ) : (
                                            wardens.map((warden) => (
                                                <div
                                                    key={warden.uid}
                                                    className="flex items-center justify-between p-3 bg-white/5 rounded-2xl border border-white/5 animate-in fade-in slide-in-from-right-4 duration-300"
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 bg-gradient-to-br from-amber-500/30 to-amber-600/30 rounded-xl flex items-center justify-center text-amber-400 font-black text-sm border border-amber-500/20">
                                                            {warden.name?.charAt(0)?.toUpperCase() || 'W'}
                                                        </div>
                                                        <div>
                                                            <p className="text-sm font-bold text-white">{warden.name || 'Unnamed Warden'}</p>
                                                            {warden.hostelId && (
                                                                <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-tight">{warden.hostelId}</p>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <button
                                                            disabled={!isSOSActive}
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                if (user && activeSOS?.id) {
                                                                    callService.startCall({
                                                                        uid: user.uid,
                                                                        name: profile?.name || user.displayName || 'Student',
                                                                        role: 'student',
                                                                        hostelId: profile?.hostelId || profile?.hostel,
                                                                        hostelName: profile?.hostelId || profile?.hostel
                                                                    }, { uid: 'broadcast', role: 'staff', name: warden.name }, activeSOS.id, 'sos', false);
                                                                }
                                                            }}
                                                            className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all active:scale-90 border ${!isSOSActive ? 'bg-zinc-800/50 border-zinc-700/30 opacity-40 grayscale pointer-events-none' : 'bg-emerald-500/20 hover:bg-emerald-500/40 border-emerald-500/30 group/btn'}`}
                                                            title={isSOSActive ? "Audio Call" : "Activate SOS to Call"}
                                                        >
                                                            <Phone className={`w-4 h-4 ${!isSOSActive ? 'text-zinc-500' : 'text-emerald-400'}`} />
                                                        </button>
                                                        <button
                                                            disabled={!isSOSActive}
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                if (user && activeSOS?.id) {
                                                                    callService.startCall({
                                                                        uid: user.uid,
                                                                        name: profile?.name || user.displayName || 'Student',
                                                                        role: 'student',
                                                                        hostelId: profile?.hostelId || profile?.hostel,
                                                                        hostelName: profile?.hostelId || profile?.hostel
                                                                    }, { uid: 'broadcast', role: 'staff', name: warden.name }, activeSOS.id, 'sos', true);
                                                                }
                                                            }}
                                                            className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all active:scale-90 border ${!isSOSActive ? 'bg-zinc-800/50 border-zinc-700/30 opacity-40 grayscale pointer-events-none' : 'bg-blue-500/20 hover:bg-blue-500/40 border-blue-500/30 group/btn'}`}
                                                            title={isSOSActive ? "Video Call" : "Activate SOS to Call"}
                                                        >
                                                            <Video className={`w-4 h-4 ${!isSOSActive ? 'text-zinc-500' : 'text-blue-400'}`} />
                                                        </button>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </motion.div>
                            )}
                        </div>

                        {/* Security Section */}
                        <div
                            className={`glass-card rounded-3xl border border-[#D4AF37]/20 overflow-hidden transition-all duration-300 ${expandedSection === 'security' ? 'p-4' : 'p-3'}`}
                        >
                            <button
                                onClick={() => setExpandedSection(expandedSection === 'security' ? null : 'security')}
                                className="w-full flex items-center justify-between group"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 bg-[#D4AF37]/20 rounded-xl flex items-center justify-center">
                                        <Shield className="w-4 h-4 text-[#D4AF37]" />
                                    </div>
                                    <div className="text-left">
                                        <h4 className="text-sm font-black text-[#D4AF37] uppercase tracking-widest">Security</h4>
                                        <p className="text-[10px] text-zinc-500 font-bold">{securityStaff.length} REGISTERED Staff</p>
                                    </div>
                                </div>
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-500 ${expandedSection === 'security' ? 'rotate-180 bg-[#D4AF37]/20' : 'bg-white/5'}`}>
                                    <ChevronDown className={`w-4 h-4 ${expandedSection === 'security' ? 'text-[#D4AF37]' : 'text-zinc-500'}`} />
                                </div>
                            </button>

                            {expandedSection === 'security' && (
                                <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    className="pt-4 mt-3 border-t border-white/10"
                                >
                                    <div className="max-h-60 overflow-y-auto space-y-3 pr-1 scrollbar-thin scrollbar-thumb-zinc-700">
                                        {securityStaff.length === 0 ? (
                                            <div className="text-center py-6 text-zinc-500 text-xs font-bold uppercase tracking-widest">No security staff registered</div>
                                        ) : (
                                            securityStaff.map((security) => (
                                                <div
                                                    key={security.uid}
                                                    className="flex items-center justify-between p-3 bg-white/5 rounded-2xl border border-white/5 animate-in fade-in slide-in-from-right-4 duration-300"
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 bg-gradient-to-br from-[#D4AF37]/30 to-[#8B6E13]/30 rounded-xl flex items-center justify-center text-[#D4AF37] font-black text-sm border border-[#D4AF37]/20">
                                                            {security.name?.charAt(0)?.toUpperCase() || 'S'}
                                                        </div>
                                                        <div>
                                                            <p className="text-sm font-bold text-white">{security.name || 'Unnamed Security'}</p>
                                                            {security.hostelId && (
                                                                <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-tight">{security.hostelId}</p>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <button
                                                            disabled={!isSOSActive}
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                if (user && activeSOS?.id) {
                                                                    callService.startCall({
                                                                        uid: user.uid,
                                                                        name: profile?.name || user.displayName || 'Student',
                                                                        role: 'student',
                                                                        hostelId: profile?.hostelId || profile?.hostel,
                                                                        hostelName: profile?.hostelId || profile?.hostel
                                                                    }, { uid: 'broadcast', role: 'staff', name: security.name }, activeSOS.id, 'sos', false);
                                                                }
                                                            }}
                                                            className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all active:scale-90 border ${!isSOSActive ? 'bg-zinc-800/50 border-zinc-700/30 opacity-40 grayscale pointer-events-none' : 'bg-emerald-500/20 hover:bg-emerald-500/40 border-emerald-500/30'}`}
                                                            title={isSOSActive ? "Audio Call" : "Activate SOS to Call"}
                                                        >
                                                            <Phone className={`w-4 h-4 ${!isSOSActive ? 'text-zinc-500' : 'text-emerald-400'}`} />
                                                        </button>
                                                        <button
                                                            disabled={!isSOSActive}
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                if (user && activeSOS?.id) {
                                                                    callService.startCall({
                                                                        uid: user.uid,
                                                                        name: profile?.name || user.displayName || 'Student',
                                                                        role: 'student',
                                                                        hostelId: profile?.hostelId || profile?.hostel,
                                                                        hostelName: profile?.hostelId || profile?.hostel
                                                                    }, { uid: 'broadcast', role: 'staff', name: security.name }, activeSOS.id, 'sos', true);
                                                                }
                                                            }}
                                                            className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all active:scale-90 border ${!isSOSActive ? 'bg-zinc-800/50 border-zinc-700/30 opacity-40 grayscale pointer-events-none' : 'bg-blue-500/20 hover:bg-blue-500/40 border-blue-500/30'}`}
                                                            title={isSOSActive ? "Video Call" : "Activate SOS to Call"}
                                                        >
                                                            <Video className={`w-4 h-4 ${!isSOSActive ? 'text-zinc-500' : 'text-blue-400'}`} />
                                                        </button>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </motion.div>
                            )}
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
            </motion.main>

            <BottomNav />
        </MobileWrapper >
    );
}
