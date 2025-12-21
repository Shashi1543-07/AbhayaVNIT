import { useState, useEffect } from 'react';
import MobileWrapper from '../../components/layout/MobileWrapper';
import TopHeader from '../../components/layout/TopHeader';
import BottomNav from '../../components/layout/BottomNav';
import { sosService, type SOSEvent } from '../../services/sosService';
import { db } from '../../lib/firebase';
import { collection, query, where, onSnapshot, limit, deleteDoc, doc } from 'firebase/firestore';
import { Shield, Map as MapIcon, User, Bell, MessageCircle, PhoneMissed, X } from 'lucide-react';
import ActiveWalksList from '../../components/security/ActiveWalksList';
import WalkDetailPanel from '../../components/security/WalkDetailPanel';
import { type SafeWalkSession } from '../../services/safeWalkService';
import { motion } from 'framer-motion';
import { containerStagger, cardVariant } from '../../lib/animations';
import { securityNavItems } from '../../lib/navItems';

export default function SecurityDashboard() {
    const [activeEvents, setActiveEvents] = useState<SOSEvent[]>([]);
    const [selectedWalk, setSelectedWalk] = useState<SafeWalkSession | null>(null);

    useEffect(() => {
        const unsubscribe = sosService.subscribeToActiveSOS((events) => {
            setActiveEvents(events);
        });
        return () => unsubscribe();
    }, []);

    const [missedCalls, setMissedCalls] = useState<any[]>([]);
    useEffect(() => {
        const q = query(
            collection(db, 'missed_calls'),
            where('receiverId', '==', 'security'),
            limit(5)
        );
        const unsubscribe = onSnapshot(q, (snapshot) => {
            setMissedCalls(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });
        return () => unsubscribe();
    }, []);

    const dismissMissedCall = async (id: string) => {
        await deleteDoc(doc(db, 'missed_calls', id));
    };


    return (
        <MobileWrapper>
            <TopHeader title="Security Control" showBackButton={true} />

            <motion.main
                className="pb-20"
                variants={containerStagger}
                initial="hidden"
                animate="visible"
            >
                {/* Missed Calls Alerts */}
                {missedCalls.length > 0 && (
                    <div className="px-4 pt-4 space-y-2">
                        {missedCalls.map(call => (
                            <motion.div
                                key={call.id}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                className="glass-card-soft bg-red-50 border-red-200 p-3 rounded-xl flex items-center justify-between"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="bg-red-100 p-2 rounded-full">
                                        <PhoneMissed className="w-4 h-4 text-red-500" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-red-700">Missed Call: {call.callerName}</p>
                                        <p className="text-[10px] text-red-500">
                                            {call.createdAt?.seconds ? new Date(call.createdAt.seconds * 1000).toLocaleTimeString() : 'Just now'}
                                        </p>
                                    </div>
                                </div>
                                <button onClick={() => dismissMissedCall(call.id)} className="text-red-400 hover:text-red-600">
                                    <X size={16} />
                                </button>
                            </motion.div>
                        ))}
                    </div>
                )}

                {/* Active SOS Card */}
                {activeEvents.length > 0 ? (
                    <motion.div variants={cardVariant} className="p-4">
                        <div className="glass-card rounded-2xl border-l-4 border-emergency overflow-hidden">
                            <div className="p-4 bg-emergency-pulse border-b border-emergency/30 flex justify-between items-center">
                                <div className="flex items-center gap-2">
                                    <span className="relative flex h-3 w-3">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                                    </span>
                                    <h3 className="font-bold text-emergency">Active SOS</h3>
                                </div>
                                <span className="text-xs font-bold text-emergency bg-emergency-pulse/30 px-2 py-1 rounded-full">
                                    {activeEvents.length} Active
                                </span>
                            </div>
                            <div className="p-4">
                                <div className="flex justify-between items-start mb-2">
                                    <div>
                                        <p className="font-bold text-lg text-primary">{activeEvents[0].userName}</p>
                                        <p className="text-sm text-muted">H6-216 • Near Library</p>
                                    </div>
                                    <p className="text-xs text-muted font-mono">
                                        {new Date(activeEvents[0].triggeredAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </p>
                                </div>
                                <button
                                    onClick={() => window.location.href = `/security/sos/${activeEvents[0].id}`}
                                    className="w-full mt-2 bg-gradient-to-r from-[#FF99AC] via-[#C084FC] to-[#89CFF0] text-white font-bold py-2 rounded-lg shadow-lg hover:opacity-90 transition-all"
                                >
                                    View Details
                                </button>
                            </div>
                        </div>
                    </motion.div>
                ) : (
                    <motion.div variants={cardVariant} className="p-4">
                        <div className="glass-card bg-success/10 rounded-2xl p-4 border border-success/30 flex items-center gap-3">
                            <div className="bg-success/20 p-2 rounded-full">
                                <Shield className="text-success w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="font-bold text-primary">All Clear</h3>
                                <p className="text-xs text-muted">No active emergencies reported.</p>
                            </div>
                        </div>
                    </motion.div>
                )}

                {/* Active Safe Walks */}
                <motion.div variants={cardVariant} className="p-4 space-y-3">
                    <div className="flex justify-between items-center">
                        <h3 className="font-bold text-primary">Active Safe Walks</h3>
                        <button
                            onClick={() => window.location.href = '/security/safe-walks'}
                            className="text-muted hover:text-primary transition-colors"
                        >
                            View All
                        </button>
                    </div>
                    <ActiveWalksList
                        onSelectWalk={(walk) => setSelectedWalk(walk)}
                    />
                </motion.div>

                {/* Walk Detail Panel */}
                {selectedWalk && (
                    <WalkDetailPanel
                        walk={selectedWalk}
                        onClose={() => setSelectedWalk(null)}
                    />
                )}
            </motion.main>

            <BottomNav items={securityNavItems} />
        </MobileWrapper >
    );
}
