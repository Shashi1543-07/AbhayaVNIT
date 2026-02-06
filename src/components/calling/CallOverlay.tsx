import { useState, useEffect, useRef } from 'react';
import { useAuthStore } from '../../context/authStore';
import { db } from '../../lib/firebase';
import { collection, query, where, onSnapshot, doc } from 'firebase/firestore';
import { callService, type CallSession } from '../../services/callService';
import IncomingCallModal from './IncomingCallModal';
import InCallScreen from './InCallScreen';
import OutboundCallModal from './OutboundCallModal';
import { ShieldAlert } from 'lucide-react';


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

    const { user } = useAuthStore();
    const [incomingCall, setIncomingCall] = useState<CallSession | null>(null);
    const [outboundCall, setOutboundCall] = useState<CallSession | null>(null);
    const [activeCall, setActiveCall] = useState<CallSession | null>(null);
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

    // 1. Receiver Listener: Watch for calls where I am the receiver
    useEffect(() => {
        if (!user) return;

        console.log("CallOverlay: [RECEIVER] Starting listener for", user.uid);

        // Simple query to avoid composite index requirements
        const qAll = query(
            collection(db, 'calls'),
            where('receiverId', '==', user.uid)
        );

        const unsubscribe = onSnapshot(qAll, (snapshot) => {
            console.log("CallOverlay: [RECEIVER] Snapshot updated. Docs:", snapshot.size);

            // Filter in memory to avoid index issues
            const activeDocs = snapshot.docs.filter(d =>
                ['ringing', 'accepted'].includes(d.data().status)
            );

            if (activeDocs.length === 0) {
                setIncomingCall(null);
                setActiveCall(prev => (prev?.receiverId === user.uid ? null : prev));
                return;
            }

            // Sort logic: Prioritize 'accepted' over 'ringing', then by date
            const sortedDocs = activeDocs.sort((a, b) => {
                const aData = a.data();
                const bData = b.data();
                // Status priority: accepted (2) > ringing (1)
                const aStatusScore = aData.status === 'accepted' ? 2 : 1;
                const bStatusScore = bData.status === 'accepted' ? 2 : 1;

                if (aStatusScore !== bStatusScore) return bStatusScore - aStatusScore;

                const aTime = aData.createdAt?.toMillis?.() || aData.createdAt?.seconds * 1000 || Date.now();
                const bTime = bData.createdAt?.toMillis?.() || bData.createdAt?.seconds * 1000 || Date.now();
                return bTime - aTime;
            });


            const callData = { id: sortedDocs[0].id, ...sortedDocs[0].data() } as CallSession;
            console.log("CallOverlay: [RECEIVER] Processing doc:", callData.id, "Status:", callData.status, "Type:", callData.callType);

            if (callData.status === 'ringing') {
                setIncomingCall(callData);
                setActiveCall(null);
            } else if (callData.status === 'accepted') {
                setIncomingCall(null);
                if (!activeCall || activeCall.id !== callData.id) {
                    setActiveCall(callData);
                }
            }
        }, (error) => {
            console.error("CallOverlay: [RECEIVER] Listener Error:", error);
        });

        return () => unsubscribe();
    }, [user, activeCall?.id]);

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
            await callService.joinCall(incomingCall.id);
            setActiveCall(incomingCall);
            setIncomingCall(null);
        } catch (error) {
            console.error("CallOverlay: Failed to accept call:", error);
            handleReject();
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


