import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import MobileWrapper from '../../components/layout/MobileWrapper';
import TopHeader from '../../components/layout/TopHeader';
import BottomNav from '../../components/layout/BottomNav';
import { safeWalkService, type SafeWalkSession } from '../../services/safeWalkService';
import { useAuthStore } from '../../context/authStore';
import { MapPin, Clock, Shield, Send } from 'lucide-react';
import { motion } from 'framer-motion';
import EventDetailMap from '../../components/map/EventDetailMap';
import { securityNavItems, wardenNavItems, adminNavItems } from '../../lib/navItems';
import { containerStagger, cardVariant } from '../../lib/animations';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import CustomModal from '../../components/common/CustomModal';

export default function SafeWalkDetails() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { profile, user } = useAuthStore();
    const [walk, setWalk] = useState<SafeWalkSession | null>(null);
    const [message, setMessage] = useState('');
    const [sending, setSending] = useState(false);
    const [liveLocation, setLiveLocation] = useState<any>(null);

    // Modal state
    const [modal, setModal] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        type: 'info' | 'success' | 'danger' | 'warning';
    }>({
        isOpen: false,
        title: '',
        message: '',
        type: 'info'
    });

    useEffect(() => {
        if (!id) return;

        // Subscribe to walk metadata
        const unsubscribeMetadata = onSnapshot(doc(db, 'safe_walk', id), (doc) => {
            if (doc.exists()) {
                const data = doc.data() as SafeWalkSession;
                setWalk({ ...data, id: doc.id });
            } else {
                console.error("Walk not found");
                navigate(-1);
            }
        });

        return () => {
            unsubscribeMetadata();
        };
    }, [id, navigate]);

    useEffect(() => {
        if (!walk?.userId) return;

        // Subscribe to live location from RTDB
        const unsubscribeLocation = safeWalkService.subscribeToWalkLocation(walk.userId, (location) => {
            setLiveLocation(location);
        });

        return () => {
            unsubscribeLocation();
        };
    }, [walk?.userId]);

    const handleSendMessage = async () => {
        if (!id || !message.trim() || !user) return;
        setSending(true);
        try {
            await safeWalkService.sendMessageToStudent(
                id,
                message.trim(),
                profile?.name || 'Security'
            );
            setMessage('');
            setModal({
                isOpen: true,
                title: 'TRANSMISSION SENT',
                message: 'Directive has been successfully transmitted to the student device.',
                type: 'success'
            });
        } catch (error) {
            console.error(error);
            setModal({
                isOpen: true,
                title: 'COMMS FAILURE',
                message: 'Failed to transmit message. Check network synchronization.',
                type: 'danger'
            });
        } finally {
            setSending(false);
        }
    };

    if (!walk) return null;

    const navItems = profile?.role === 'security' ? securityNavItems :
        profile?.role === 'warden' ? wardenNavItems :
            adminNavItems;

    const isSecurity = profile?.role === 'security';

    return (
        <MobileWrapper>
            <TopHeader title="Walk Intelligence" showBackButton={true} />

            <motion.main
                className="px-4 pt-nav-safe pb-nav-safe space-y-6"
                variants={containerStagger}
                initial="hidden"
                animate="visible"
            >
                {/* Status Card */}
                <motion.div variants={cardVariant} className="glass p-6 rounded-[2.5rem] border border-white/5 shadow-2xl flex items-center justify-between">
                    <div className="min-w-0 flex-1 mr-4">
                        <h2 className="text-xl font-black text-white tracking-tight font-heading truncate">{walk.userName}</h2>
                        <p className="text-[10px] text-[#D4AF37] font-black uppercase tracking-widest mt-1 opacity-80">{walk.hostelId || 'CAMPUS HUB'}</p>
                    </div>
                    <span className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-[0.2em] border shadow-2xl backdrop-blur-3xl shrink-0 ${walk.status === 'danger' ? 'bg-red-600/20 text-red-500 border-red-500/40' :
                        walk.status === 'delayed' ? 'bg-amber-500/20 text-amber-500 border-amber-500/40' :
                            'bg-emerald-500/20 text-emerald-500 border-emerald-500/40'
                        }`}>
                        {walk.status}
                    </span>
                </motion.div>

                {/* Map Section */}
                <motion.div variants={cardVariant} className="glass p-2 rounded-[3rem] border border-white/5 shadow-2xl overflow-hidden h-[300px] relative">
                    <div className="w-full h-full rounded-[2.8rem] overflow-hidden border border-white/10 shadow-inner">
                        <EventDetailMap
                            location={liveLocation}
                            center={walk.startLocation || { lat: 21.125, lng: 79.052, name: 'Campus' }}
                            destination={walk.destination}
                            userName={walk.userName}
                            eventType="SAFEWALK"
                        />
                    </div>
                </motion.div>

                {/* Info Grid */}
                <div className="grid grid-cols-2 gap-4">
                    <motion.div variants={cardVariant} className="glass p-5 rounded-[2.5rem] border border-white/5 shadow-2xl">
                        <Clock className="w-5 h-5 text-[#D4AF37] mb-3 opacity-80" strokeWidth={3} />
                        <p className="text-[9px] font-black text-zinc-500 uppercase tracking-[0.2em]">Expected Vol.</p>
                        <p className="text-lg font-black text-white font-heading">{walk.expectedDuration} Min</p>
                    </motion.div>
                    <motion.div variants={cardVariant} className="glass p-5 rounded-[2.5rem] border border-white/5 shadow-2xl">
                        <MapPin className="w-5 h-5 text-emerald-500 mb-3 opacity-80" strokeWidth={3} />
                        <p className="text-[9px] font-black text-zinc-500 uppercase tracking-[0.2em]">Objective</p>
                        <p className="text-sm font-black text-white truncate font-heading">{walk.destination.name}</p>
                    </motion.div>
                </div>

                {/* Action Section for Security */}
                {isSecurity ? (
                    <motion.div variants={cardVariant} className="space-y-6">
                        <div className="glass p-6 rounded-[2.5rem] border border-white/10 shadow-2xl bg-black/40">
                            <h3 className="text-[10px] font-black text-[#D4AF37] uppercase tracking-[0.2em] mb-6 flex items-center gap-2 font-heading">
                                <Shield className="w-4 h-4" strokeWidth={3} />
                                HQ Security Protocol
                            </h3>

                            <div className="space-y-4">
                                <div>
                                    <p className="text-[9px] font-black text-zinc-500 uppercase tracking-[0.2em] ml-2 mb-2">Official Comms</p>
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            value={message}
                                            onChange={(e) => setMessage(e.target.value)}
                                            placeholder="Transmit Directive..."
                                            className="flex-1 bg-black/40 backdrop-blur-3xl px-4 py-3.5 rounded-2xl border border-white/10 text-sm font-black text-white outline-none focus:ring-2 focus:ring-[#D4AF37]/30 transition-all placeholder:text-zinc-700"
                                        />
                                        <button
                                            onClick={handleSendMessage}
                                            disabled={!message.trim() || sending}
                                            className="px-5 py-3.5 bg-gradient-to-br from-[#CF9E1B] via-[#D4AF37] to-[#8B6E13] text-black rounded-2xl font-black active:scale-95 transition-all shadow-xl border border-white/10 disabled:opacity-50"
                                        >
                                            {sending ? <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" /> : <Send className="w-5 h-5" strokeWidth={3} />}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                ) : (
                    <motion.div variants={cardVariant} className="glass p-8 rounded-[2.5rem] border border-white/5 shadow-2xl bg-black/40 text-center">
                        <Shield className="w-12 h-12 text-[#D4AF37] opacity-20 mx-auto mb-4" strokeWidth={3} />
                        <h3 className="font-black text-[#D4AF37] uppercase tracking-[0.3em] text-[9px] mb-3">Tactical Oversight</h3>
                        <p className="text-[10px] text-zinc-500 font-bold leading-relaxed opacity-60">
                            HQ Monitoring Mode. Security response teams are primary for field operations.
                        </p>
                    </motion.div>
                )}

                {/* Timeline Section */}
                {walk.timeline && walk.timeline.length > 0 && (
                    <motion.div variants={cardVariant} className="glass p-6 rounded-[2.5rem] border border-white/5 shadow-2xl bg-black/40 pb-10">
                        <h3 className="text-[9px] font-black text-zinc-600 uppercase tracking-[0.2em] mb-8 ml-2">HQ Logistics Log</h3>
                        <div className="space-y-8 border-l border-white/5 ml-4 pl-8">
                            {walk.timeline.map((event, idx) => (
                                <div key={idx} className="relative">
                                    <div className="absolute -left-[37px] top-1 w-2.5 h-2.5 rounded-full bg-black border-2 border-[#D4AF37] shadow-[0_0_8px_rgba(212,175,55,0.4)]" />
                                    <p className="text-[8px] font-black text-[#D4AF37]/60 uppercase tracking-widest mb-1 font-mono">
                                        {event.timestamp ? (
                                            typeof event.timestamp === 'object' && 'toDate' in event.timestamp ? (event.timestamp as any).toDate().toLocaleTimeString() :
                                                typeof event.timestamp === 'object' && 'seconds' in event.timestamp ? new Date((event.timestamp as any).seconds * 1000).toLocaleTimeString() :
                                                    typeof event.timestamp === 'number' ? new Date(event.timestamp).toLocaleTimeString() :
                                                        String(event.timestamp)
                                        ) : 'Tactical Now'}
                                    </p>
                                    <p className="text-xs font-black text-white leading-tight font-heading drop-shadow-sm">
                                        {event.details}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </motion.div>
                )}

                <div className="h-20" /> {/* Extra spacing at bottom */}
            </motion.main>

            <BottomNav items={navItems} />

            <CustomModal
                isOpen={modal.isOpen}
                onClose={() => setModal({ ...modal, isOpen: false })}
                title={modal.title}
                message={modal.message}
                type={modal.type}
                cancelText="Acknowledge"
            />
        </MobileWrapper>
    );
}
