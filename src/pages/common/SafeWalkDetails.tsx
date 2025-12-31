import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import MobileWrapper from '../../components/layout/MobileWrapper';
import TopHeader from '../../components/layout/TopHeader';
import BottomNav from '../../components/layout/BottomNav';
import { safeWalkService, type SafeWalkSession, type SafeWalkLocation } from '../../services/safeWalkService';
import { useAuthStore } from '../../context/authStore';
import { MapPin, Clock, Shield, Send, CheckCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import SafeWalkMap from '../../components/security/SafeWalkMap';
import { securityNavItems, wardenNavItems, adminNavItems } from '../../lib/navItems';
import { containerStagger, cardVariant } from '../../lib/animations';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../../lib/firebase';

const SECURITY_PERSONNEL = [
    { id: 'sec_001', name: 'Ramesh Kumar' },
    { id: 'sec_002', name: 'Suresh Patil' },
    { id: 'sec_003', name: 'Mahesh Singh' },
    { id: 'sec_004', name: 'Rajesh Sharma' },
];

export default function SafeWalkDetails() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { profile, user } = useAuthStore();
    const [walk, setWalk] = useState<SafeWalkSession | null>(null);
    const [liveLocation, setLiveLocation] = useState<SafeWalkLocation | null>(null);
    const [message, setMessage] = useState('');
    const [sending, setSending] = useState(false);
    const [selectedEscort, setSelectedEscort] = useState('');
    const [assigning, setAssigning] = useState(false);

    useEffect(() => {
        if (!id) return;

        // Subscribe to walk metadata
        const unsubscribe = onSnapshot(doc(db, 'safe_walk', id), (doc) => {
            if (doc.exists()) {
                setWalk({ id: doc.id, ...doc.data() } as SafeWalkSession);
            } else {
                console.error("Walk not found");
                navigate(-1);
            }
        });

        // Subscribe to live location
        const unsubLocation = safeWalkService.subscribeToWalkLocation(id, (loc) => {
            setLiveLocation(loc);
        });

        return () => {
            unsubscribe();
            unsubLocation();
        };
    }, [id, navigate]);

    const handleAssignEscort = async () => {
        if (!id || !selectedEscort || !user) return;
        setAssigning(true);
        try {
            const escort = SECURITY_PERSONNEL.find(p => p.id === selectedEscort);
            if (escort) {
                await safeWalkService.assignEscort(id, escort.name);
                alert(`Escort ${escort.name} assigned!`);
                setSelectedEscort('');
            }
        } catch (error) {
            console.error(error);
            alert("Failed to assign escort");
        } finally {
            setAssigning(false);
        }
    };

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
            alert("Sent!");
        } catch (error) {
            console.error(error);
            alert("Failed to send");
        } finally {
            setSending(false);
        }
    };

    const handleMarkCompleted = async () => {
        if (!id || !confirm("Complete this walk?")) return;
        try {
            await safeWalkService.updateWalkStatus(id, 'completed');
            navigate(-1);
        } catch (error) {
            console.error(error);
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
                className="px-6 py-8 pb-32 pt-28 space-y-8 max-w-lg mx-auto"
                variants={containerStagger}
                initial="hidden"
                animate="visible"
            >
                {/* Status Card */}
                <motion.div variants={cardVariant} className="glass-card p-6 rounded-[2rem] border border-white/50 shadow-2xl flex items-center justify-between">
                    <div>
                        <h2 className="text-2xl font-black text-slate-800 tracking-tight">{walk.userName}</h2>
                        <p className="text-sm text-slate-500 font-medium opacity-80">{walk.hostelId || 'Campus'}</p>
                    </div>
                    <span className={`px-4 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest border shadow-sm ${walk.status === 'danger' ? 'bg-red-500/10 text-red-600 border-red-500/20' :
                        walk.status === 'delayed' ? 'bg-orange-500/10 text-orange-600 border-orange-500/20' :
                            'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                        }`}>
                        {walk.status}
                    </span>
                </motion.div>

                {/* Map Section */}
                <motion.div variants={cardVariant} className="glass-card p-2 rounded-[2.5rem] border border-white/50 shadow-2xl overflow-hidden h-[300px] relative">
                    <div className="w-full h-full rounded-[2.2rem] overflow-hidden border border-white/40">
                        <SafeWalkMap walks={[walk]} />
                    </div>
                    {liveLocation && (
                        <div className="absolute top-6 right-6 bg-white/60 backdrop-blur-md px-4 py-2 rounded-xl border border-white/60 shadow-lg z-[1000]">
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                                <span className="text-[10px] font-black text-slate-700 uppercase tracking-tighter">Live GPS</span>
                            </div>
                        </div>
                    )}
                </motion.div>

                {/* Info Grid */}
                <div className="grid grid-cols-2 gap-4">
                    <motion.div variants={cardVariant} className="glass-card p-5 rounded-3xl border border-white/40 shadow-xl">
                        <Clock className="w-5 h-5 text-primary mb-2 opacity-60" />
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Duration</p>
                        <p className="text-lg font-black text-slate-800">{walk.expectedDuration}m</p>
                    </motion.div>
                    <motion.div variants={cardVariant} className="glass-card p-5 rounded-3xl border border-white/40 shadow-xl">
                        <MapPin className="w-5 h-5 text-emerald-500 mb-2 opacity-60" />
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Destination</p>
                        <p className="text-xs font-bold text-slate-800 truncate">{walk.destination.name}</p>
                    </motion.div>
                </div>

                {/* Action Section for Security */}
                {isSecurity ? (
                    <motion.div variants={cardVariant} className="space-y-6">
                        <div className="glass-card p-6 rounded-[2.5rem] border border-white/50 shadow-2xl">
                            <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-6 flex items-center gap-2">
                                <Shield className="w-5 h-5 text-primary" />
                                Security Protocol
                            </h3>

                            <div className="space-y-4">
                                <div>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4 mb-2">Deploy Escort</p>
                                    <div className="flex gap-2">
                                        <select
                                            value={selectedEscort}
                                            onChange={(e) => setSelectedEscort(e.target.value)}
                                            className="flex-1 bg-white/40 backdrop-blur-md p-4 rounded-2xl border border-white/60 text-sm font-bold text-slate-700 outline-none"
                                        >
                                            <option value="">Select Personnel...</option>
                                            {SECURITY_PERSONNEL.map(p => (
                                                <option key={p.id} value={p.id}>{p.name}</option>
                                            ))}
                                        </select>
                                        <button
                                            onClick={handleAssignEscort}
                                            disabled={!selectedEscort || assigning}
                                            className="p-4 bg-slate-800 text-white rounded-2xl font-black text-xs uppercase tracking-widest disabled:opacity-50"
                                        >
                                            {assigning ? '...' : 'Deploy'}
                                        </button>
                                    </div>
                                </div>

                                <div>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4 mb-2">Comms</p>
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            value={message}
                                            onChange={(e) => setMessage(e.target.value)}
                                            placeholder="Message Student..."
                                            className="flex-1 bg-white/40 backdrop-blur-md p-4 rounded-2xl border border-white/60 text-sm font-bold text-slate-700 outline-none placeholder:text-slate-400"
                                        />
                                        <button
                                            onClick={handleSendMessage}
                                            disabled={!message.trim() || sending}
                                            className="p-4 bg-primary text-white rounded-2xl font-black text-xs uppercase tracking-widest disabled:opacity-50"
                                        >
                                            <Send className="w-5 h-5" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <button
                            onClick={handleMarkCompleted}
                            className="w-full py-5 bg-emerald-500 text-white font-black rounded-[2rem] shadow-xl active:scale-95 transition-all text-xs tracking-[0.2em] flex items-center justify-center gap-3"
                        >
                            <CheckCircle className="w-5 h-5" />
                            MARK COMPLETED
                        </button>
                    </motion.div>
                ) : (
                    <motion.div variants={cardVariant} className="glass-card p-8 rounded-[2.5rem] border border-white/50 shadow-2xl bg-primary/5">
                        <Shield className="w-12 h-12 text-primary opacity-20 mx-auto mb-4" />
                        <h3 className="text-center font-black text-slate-800 uppercase tracking-[0.2em] text-xs mb-3">Monitoring Mode</h3>
                        <p className="text-center text-xs text-slate-500 font-bold leading-relaxed opacity-70">
                            Warden and Admin views are read-only. Security is the designated response team for all Safe Walk protocols.
                        </p>
                    </motion.div>
                )}

                {/* Timeline Section */}
                {walk.timeline && walk.timeline.length > 0 && (
                    <motion.div variants={cardVariant} className="glass-card p-6 rounded-[2.5rem] border border-white/50 shadow-2xl">
                        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6 ml-2">Operation Log</h3>
                        <div className="space-y-6 border-l-2 border-slate-100 ml-4 pl-6">
                            {walk.timeline.map((event, idx) => (
                                <div key={idx} className="relative">
                                    <div className="absolute -left-[33px] top-0 w-4 h-4 rounded-full bg-white border-4 border-primary shadow-sm" />
                                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">
                                        {event.timestamp ? (typeof event.timestamp === 'string' ? event.timestamp : new Date(event.timestamp.seconds * 1000).toLocaleTimeString()) : 'Now'}
                                    </p>
                                    <p className="text-sm font-bold text-slate-700 leading-tight">
                                        {event.details}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </motion.div>
                )}

            </motion.main>

            <BottomNav items={navItems} />
        </MobileWrapper>
    );
}
