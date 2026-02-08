import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '../../context/authStore';
import { db } from '../../lib/firebase';
import { collection, query, where, onSnapshot, doc, getDoc, serverTimestamp, runTransaction } from 'firebase/firestore';
import { callService, type CallSession } from '../../services/callService';
import IncomingCallModal from './IncomingCallModal';
import InCallScreen from './InCallScreen';
import OutboundCallModal from './OutboundCallModal';
import { ShieldAlert, Shield } from 'lucide-react';


console.log("CallOverlay: Module Loading...");

export default function CallOverlay() {
    useEffect(() => {
        console.log("CallOverlay: Mounted");
        // Global debug helper
        (window as any).__debugCallOverlay = {
            forceState: (type: string, val: any) => {
                if (type === 'incoming') setIncomingCall(val);
                if (type === 'outbound') setOutboundCall(val);
                if (type === 'active') setActiveCall(val);
            }
        };
    }, []);

    const { user, role, profile } = useAuthStore();
    const [incomingCall, setIncomingCall] = useState<CallSession | null>(null);
    const [outboundCall, setOutboundCall] = useState<CallSession | null>(null);
    const [activeCall, setActiveCall] = useState<CallSession | null>(null);
    const [claimedCall, setClaimedCall] = useState<{ name: string; id: string } | null>(null);
    const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
    const [localStream, setLocalStream] = useState<MediaStream | null>(null);

    useEffect(() => {
        if (user) {
            console.log("CallOverlay: Active User UID:", user.uid);
            callService.sanitizeStaleCalls(user.uid);
        }
        if ((window as any).__debugCallOverlay) (window as any).__debugCallOverlay.user = user;
    }, [user]);


    const ringTimeoutRef = useRef<any>(null);

    useEffect(() => {
        callService.setRemoteStreamListener((stream) => {
            console.log("CallOverlay: Remote stream updated. Tracks:", stream.getTracks().length);
            // We create a new reference to ensure React re-renders even if it's the same stream object
            setRemoteStream(new MediaStream(stream));
        });
        callService.setLocalStreamListener((stream) => {
            console.log("CallOverlay: Local stream updated");
            setLocalStream(new MediaStream(stream));
        });
    }, []);

    // 1. Receiver Listener: Watch for calls where I am the receiver (Direct or Broadcast)
    useEffect(() => {
        if (!user || !role) return;

        console.log("CallOverlay: [RECEIVER] Starting listeners for Role:", role, "UID:", user.uid);

        // Listener A: Direct calls to me
        const qDirect = query(
            collection(db, 'calls'),
            where('receiverId', '==', user.uid)
        );

        // Listener B: Broadcast calls to my role or general staff
        const broadcastRoles = role === 'student' ? ['student'] : [role, 'staff'];
        const qBroadcast = query(
            collection(db, 'calls'),
            where('receiverId', '==', 'broadcast'),
            where('receiverRole', 'in', broadcastRoles)
        );

        const processSnapshot = (snapshot: any) => {
            const activeDocs = snapshot.docs.filter((d: any) => {
                const data = d.data();
                const isStatusValid = ['ringing', 'accepted'].includes(data.status);
                if (!isStatusValid) return false;

                // Role-specific filtering for broadcasting
                if (data.receiverId === 'broadcast') {
                    if (role === 'warden') {
                        // Warden only sees calls from their hostel
                        const myHostel = profile?.hostelId || profile?.hostel;
                        const callerHostel = data.hostelId || data.hostelName;
                        return myHostel && callerHostel && myHostel === callerHostel;
                    }
                    // Security or others see all matching Role broadcasts
                    return true;
                }
                return true;
            });

            return activeDocs;
        };

        const handleSync = async (directDocs: any[], broadcastDocs: any[]) => {
            const allDocs = [...directDocs, ...broadcastDocs];

            if (allDocs.length === 0) {
                // Check if current incoming broadcast call was claimed by someone else
                if (incomingCall && incomingCall.receiverId === 'broadcast') {
                    try {
                        const callDocRef = doc(db, 'calls', incomingCall.id);
                        const callSnap = await getDoc(callDocRef);
                        if (callSnap.exists()) {
                            const callData = callSnap.data();
                            if (callData.status === 'accepted' && callData.receiverId !== user.uid) {
                                setClaimedCall({
                                    name: callData.receiverName || 'Another staff member',
                                    id: incomingCall.id
                                });
                            }
                        }
                    } catch (e) {
                        console.error("CallOverlay: Error checking claimed status", e);
                    }
                }

                setIncomingCall(null);
                setActiveCall(prev => {
                    // Only clear active call if it was a call where I was the receiver
                    if (prev?.receiverId === user.uid || (prev?.receiverId === 'broadcast' && prev.status === 'ringing')) {
                        return null;
                    }
                    return prev;
                });
                return;
            }

            // Sort logic: Prioritize 'accepted' over 'ringing', then by date
            const sortedDocs = allDocs.sort((a, b) => {
                const aData = a.data();
                const bData = b.data();
                const aStatusScore = aData.status === 'accepted' ? 2 : 1;
                const bStatusScore = bData.status === 'accepted' ? 2 : 1;
                if (aStatusScore !== bStatusScore) return bStatusScore - aStatusScore;
                const aTime = aData.createdAt?.toMillis?.() || aData.createdAt?.seconds * 1000 || Date.now();
                const bTime = bData.createdAt?.toMillis?.() || bData.createdAt?.seconds * 1000 || Date.now();
                return bTime - aTime;
            });

            const callData = { id: sortedDocs[0].id, ...sortedDocs[0].data() } as CallSession;

            if (callData.status === 'ringing') {
                setIncomingCall(callData);
                setActiveCall(null);
            } else if (callData.status === 'accepted') {
                setIncomingCall(null);
                if (!activeCall || activeCall.id !== callData.id) {
                    setActiveCall(callData);
                }
            }
        };

        let directActiveDocs: any[] = [];
        let broadcastActiveDocs: any[] = [];

        const unsubDirect = onSnapshot(qDirect, (snap) => {
            directActiveDocs = processSnapshot(snap);
            handleSync(directActiveDocs, broadcastActiveDocs);
        });

        const unsubBroadcast = onSnapshot(qBroadcast, (snap) => {
            broadcastActiveDocs = processSnapshot(snap);
            handleSync(directActiveDocs, broadcastActiveDocs);
        });

        return () => {
            unsubDirect();
            unsubBroadcast();
        };
    }, [user, role, profile, activeCall?.id]);

    // 2. Caller Listener: Watch for calls where I am the caller
    useEffect(() => {
        if (!user) return;

        console.log("CallOverlay: [CALLER] Starting listener for", user.uid);

        const qAll = query(
            collection(db, 'calls'),
            where('callerId', '==', user.uid)
        );

        const unsubscribe = onSnapshot(qAll, (snapshot) => {
            console.log("CallOverlay: [CALLER] Snapshot updated. Docs:", snapshot.size);

            const activeDocs = snapshot.docs.filter(d =>
                ['ringing', 'accepted'].includes(d.data().status)
            );

            if (activeDocs.length === 0) {
                setOutboundCall(null);
                setActiveCall(prev => (prev?.callerId === user.uid ? null : prev));
                return;
            }

            const sortedDocs = activeDocs.sort((a, b) => {
                const aData = a.data();
                const bData = b.data();
                const aStatusScore = aData.status === 'accepted' ? 2 : 1;
                const bStatusScore = bData.status === 'accepted' ? 2 : 1;

                if (aStatusScore !== bStatusScore) return bStatusScore - aStatusScore;

                const aTime = aData.createdAt?.toMillis?.() || aData.createdAt?.seconds * 1000 || Date.now();
                const bTime = bData.createdAt?.toMillis?.() || bData.createdAt?.seconds * 1000 || Date.now();
                return bTime - aTime;
            });


            const callData = { id: sortedDocs[0].id, ...sortedDocs[0].data() } as CallSession;
            console.log("CallOverlay: [CALLER] Processing doc:", callData.id, "Status:", callData.status, "Type:", callData.callType);

            if (callData.status === 'ringing') {
                setOutboundCall(callData);
                if (!ringTimeoutRef.current) {
                    ringTimeoutRef.current = setTimeout(() => {
                        handleMissedCall(callData);
                    }, 45000);
                }
            } else if (callData.status === 'accepted') {
                if (ringTimeoutRef.current) {
                    clearTimeout(ringTimeoutRef.current);
                    ringTimeoutRef.current = null;
                }
                setOutboundCall(null);
                if (!activeCall || activeCall.id !== callData.id) {
                    setActiveCall(callData);
                }
            }
        }, (error) => {
            console.error("CallOverlay: [CALLER] Listener Error:", error);
        });

        return () => unsubscribe();
    }, [user, activeCall?.id]);

    // 3. Active Call Status Listener (for receiver who accepted)
    useEffect(() => {
        if (!user || !activeCall || activeCall.callerId === user.uid) return;

        const callDoc = doc(db, 'calls', activeCall.id);
        const unsubscribe = onSnapshot(callDoc, (snapshot) => {
            if (!snapshot.exists() || snapshot.data()?.status === 'ended' || snapshot.data()?.status === 'missed') {
                handleCleanup();
                unsubscribe();
            }
        }, (error) => {
            // Suppress "permission-denied" errors during deletion/cleanup
            if (error.code !== 'permission-denied') {
                console.error("CallOverlay: Active Status Listener Error:", error);
            } else {
                console.log("CallOverlay: [DEBUG] Cleanup race condition handled (permission-denied)");
                handleCleanup();
            }
        });

        return () => unsubscribe();
    }, [user, activeCall]);

    const handleAccept = async () => {
        if (!incomingCall) return;
        console.log("CallOverlay: [ACTION] Accept call", incomingCall.id);
        try {
            // Special handling for broadcast calls: claim the call using a transaction to prevent race conditions
            if (incomingCall.receiverId === 'broadcast') {
                const callDocRef = doc(db, 'calls', incomingCall.id);

                await runTransaction(db, async (transaction) => {
                    const callSnap = await transaction.get(callDocRef);
                    if (!callSnap.exists()) throw new Error("Call no longer exists.");

                    const callData = callSnap.data();
                    if (callData.receiverId !== 'broadcast') {
                        throw new Error("Call already accepted by another personnel.");
                    }

                    transaction.update(callDocRef, {
                        receiverId: user?.uid,
                        receiverName: profile?.name || user?.displayName || 'Staff',
                        updatedAt: serverTimestamp()
                    });
                });
            }

            await callService.joinCall(incomingCall.id);
            setActiveCall(incomingCall);
            setIncomingCall(null);
        } catch (error: any) {
            console.error("CallOverlay: Failed to accept call:", error);
            handleCleanup();
        }
    };

    const handleReject = async () => {
        if (!incomingCall) return;
        console.log("CallOverlay: [ACTION] Reject call", incomingCall.id);
        await callService.endCall(incomingCall.id, 'rejected');
        setIncomingCall(null);
    };

    const handleEndCall = async () => {
        const callToEnd = activeCall || outboundCall || incomingCall;
        if (callToEnd) {
            console.log("CallOverlay: [ACTION] End call", callToEnd.id);
            await callService.endCall(callToEnd.id, 'ended');
            handleCleanup();
        }
    };

    const handleMissedCall = async (call: CallSession) => {
        // Notification creation logic moved to callService.endCall
        if (ringTimeoutRef.current) {
            clearTimeout(ringTimeoutRef.current);
            ringTimeoutRef.current = null;
        }
        await callService.endCall(call.id, 'missed');
        handleCleanup();
    };

    const handleCleanup = () => {
        setActiveCall(null);
        setOutboundCall(null);
        setIncomingCall(null);
        setRemoteStream(null);
        setLocalStream(null);
    };

    return (
        <>
            <AnimatePresence>
                {incomingCall && !activeCall && (
                    <IncomingCallModal
                        callerName={incomingCall.callerName}
                        callerRole={incomingCall.callerRole}
                        callType={incomingCall.callType}
                        contextType={incomingCall.contextType}
                        onAccept={handleAccept}
                        onReject={handleReject}
                    />
                )}

                {activeCall && (
                    <InCallScreen
                        callId={activeCall.id}
                        partnerName={user?.uid === activeCall.callerId ? activeCall.receiverName : activeCall.callerName}
                        partnerRole={user?.uid === activeCall.callerId ? activeCall.receiverRole : activeCall.callerRole}
                        remoteStream={remoteStream}
                        localStream={localStream}
                        callType={activeCall.callType}
                        contextType={activeCall.contextType}
                        onEnd={handleEndCall}
                    />
                )}

                {outboundCall && !activeCall && (
                    <OutboundCallModal
                        receiverName={outboundCall.receiverName}
                        receiverRole={outboundCall.receiverRole}
                        callType={outboundCall.callType}
                        onCancel={handleEndCall}
                    />
                )}

                {claimedCall && (
                    <div className="fixed inset-0 z-[3000] flex items-center justify-center p-6 bg-black/60 backdrop-blur-xl">
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: 20 }}
                            className="w-full max-w-xs p-8 rounded-[40px] bg-zinc-900 border border-white/10 shadow-2xl text-center"
                        >
                            <div className="w-16 h-16 bg-blue-500/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
                                <Shield className="w-8 h-8 text-blue-400" strokeWidth={2.5} />
                            </div>
                            <h3 className="text-xl font-black text-white mb-2 uppercase tracking-tight">Call Received</h3>
                            <p className="text-xs text-zinc-400 font-bold mb-8 leading-relaxed">
                                This call has been picked up by <span className="text-blue-400">{claimedCall.name}</span>.
                            </p>
                            <button
                                onClick={() => setClaimedCall(null)}
                                className="w-full py-4 bg-white text-black font-black uppercase tracking-widest text-[10px] rounded-2xl active:scale-95 transition-all shadow-xl"
                            >
                                OK, DISMISS
                            </button>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {!window.isSecureContext && (
                <div className="fixed bottom-32 left-6 right-6 z-[9999] bg-zinc-900/90 backdrop-blur-xl text-white p-3 rounded-2xl border border-white/10 shadow-2xl flex items-center gap-3">
                    <ShieldAlert className="w-5 h-5 text-red-500 shrink-0" />
                    <div className="text-[10px] font-black uppercase tracking-widest leading-none">
                        <p className="text-red-500">Insecure Connection</p>
                        <p className="opacity-50 mt-0.5">Media may be blocked. Use HTTPS.</p>
                    </div>
                </div>
            )}
        </>
    );
}


