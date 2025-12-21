import { useState, useEffect, useRef } from 'react';
import { useAuthStore } from '../../context/authStore';
import { db } from '../../lib/firebase';
import { collection, query, where, onSnapshot, doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { callService, type CallSession } from '../../services/callService';
import IncomingCallModal from './IncomingCallModal';
import InCallScreen from './InCallScreen';
import OutboundCallModal from './OutboundCallModal';

export default function CallOverlay() {
    const { user } = useAuthStore();
    const [incomingCall, setIncomingCall] = useState<CallSession | null>(null);
    const [outboundCall, setOutboundCall] = useState<CallSession | null>(null);
    const [activeCall, setActiveCall] = useState<CallSession | null>(null);
    const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);

    const ringTimeoutRef = useRef<any>(null);

    useEffect(() => {
        callService.setRemoteStreamListener((stream) => {
            setRemoteStream(stream);
        });
    }, []);

    // 1. Receiver Listener: Watch for calls where I am the receiver and status is 'ringing'
    useEffect(() => {
        if (!user) return;

        const q = query(
            collection(db, 'calls'),
            where('receiverId', '==', user.uid),
            where('status', '==', 'ringing')
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            if (!snapshot.empty) {
                const callDoc = snapshot.docs[0];
                const callData = { id: callDoc.id, ...callDoc.data() } as CallSession;
                setIncomingCall(callData);
            } else {
                setIncomingCall(null);
            }
        });

        return () => unsubscribe();
    }, [user]);

    // 2. Caller Listener: Watch for calls where I am the caller
    useEffect(() => {
        if (!user) return;

        const q = query(
            collection(db, 'calls'),
            where('callerId', '==', user.uid)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            if (snapshot.empty) {
                setOutboundCall(null);
                setActiveCall(null);
                setRemoteStream(null);
                return;
            }

            const callDoc = snapshot.docs[0];
            const callData = { id: callDoc.id, ...callDoc.data() } as CallSession;

            if (callData.status === 'ringing') {
                setOutboundCall(callData);
                // Start timeout if not already started
                if (!ringTimeoutRef.current) {
                    ringTimeoutRef.current = setTimeout(() => {
                        handleMissedCall(callData);
                    }, 30000); // 30 seconds
                }
            } else if (callData.status === 'accepted') {
                clearTimeout(ringTimeoutRef.current);
                ringTimeoutRef.current = null;
                setOutboundCall(null);
                if (!activeCall) {
                    setActiveCall(callData);
                    // Remote stream handled via callService.join/start callbacks but
                    // if caller, startCall was already called. In callService, we'll
                    // manage stream via ref/callback.
                }
            } else if (callData.status === 'rejected' || callData.status === 'ended' || callData.status === 'missed') {
                clearTimeout(ringTimeoutRef.current);
                ringTimeoutRef.current = null;
                handleCleanup();
            }
        });

        return () => unsubscribe();
    }, [user, activeCall]);

    // 3. Active Call Status Listener (for receiver who accepted)
    useEffect(() => {
        if (!user || !activeCall || activeCall.callerId === user.uid) return;

        const callDoc = doc(db, 'calls', activeCall.id);
        const unsubscribe = onSnapshot(callDoc, (snapshot) => {
            if (!snapshot.exists() || snapshot.data()?.status === 'ended' || snapshot.data()?.status === 'missed') {
                handleCleanup();
                unsubscribe();
            }
        });

        return () => unsubscribe();
    }, [user, activeCall]);

    const handleAccept = async () => {
        if (!incomingCall) return;
        try {
            await callService.joinCall(incomingCall.id);
            setActiveCall(incomingCall);
            setIncomingCall(null);
        } catch (error) {
            console.error("Failed to accept call:", error);
            handleReject();
        }
    };

    const handleReject = async () => {
        if (!incomingCall) return;
        await callService.endCall(incomingCall.id, 'rejected');
        setIncomingCall(null);
    };

    const handleEndCall = async () => {
        const callToEnd = activeCall || outboundCall || incomingCall;
        if (callToEnd) {
            await callService.endCall(callToEnd.id, 'ended');
            handleCleanup();
        }
    };

    const handleMissedCall = async (call: CallSession) => {
        clearTimeout(ringTimeoutRef.current);
        ringTimeoutRef.current = null;

        await callService.endCall(call.id, 'missed');

        // Create formal notification
        const notificationId = `missed_${call.id} `;
        await setDoc(doc(db, 'notifications', notificationId), {
            toUserId: call.receiverId,
            toRole: call.receiverRole,
            fromUserId: call.callerId,
            fromName: call.callerName,
            type: 'missed_call',
            callId: call.id,
            message: `Missed call from ${call.callerName} `,
            createdAt: serverTimestamp(),
            seen: false
        });

        handleCleanup();
    };

    const handleCleanup = () => {
        setActiveCall(null);
        setOutboundCall(null);
        setIncomingCall(null);
        setRemoteStream(null);
    };

    // Callback for caller to set remote stream
    // Since startCall is called from Dashboard, we pass the callback there.
    // Dashboard needs access to callService.

    // We'll update Dashboard.tsx to pass the stream handler.

    return (
        <>
            {incomingCall && (
                <IncomingCallModal
                    callerName={incomingCall.callerName}
                    callerRole={incomingCall.callerRole}
                    onAccept={handleAccept}
                    onReject={handleReject}
                />
            )}

            {activeCall && (
                <InCallScreen
                    partnerName={user?.uid === activeCall.callerId ? activeCall.receiverName : activeCall.callerName}
                    partnerRole={user?.uid === activeCall.callerId ? activeCall.receiverRole : activeCall.callerRole}
                    remoteStream={remoteStream}
                    onEnd={handleEndCall}
                // For caller, we need to ensure their stream is set
                // They call startCall(..., (stream) => setRemoteStream(stream))
                />
            )}

            {outboundCall && (
                <OutboundCallModal
                    receiverName={outboundCall.receiverName}
                    receiverRole={outboundCall.receiverRole}
                    onCancel={handleEndCall}
                />
            )}
        </>
    );
}
