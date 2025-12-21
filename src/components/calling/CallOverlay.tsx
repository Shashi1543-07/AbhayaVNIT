import { useState, useEffect } from 'react';
import { useAuthStore } from '../../context/authStore';
import { db } from '../../lib/firebase';
import { collection, query, where, onSnapshot, doc, updateDoc, deleteDoc } from 'firebase/firestore';
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

    useEffect(() => {
        if (!user) return;

        // Listen for incoming calls
        const q = query(
            collection(db, 'calls'),
            where('receiverId', '==', user.uid),
            where('status', '==', 'ringing')
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            if (!snapshot.empty) {
                const doc = snapshot.docs[0];
                setIncomingCall({ id: doc.id, ...doc.data() } as CallSession);
            } else {
                setIncomingCall(null);
            }
        });

        return () => unsubscribe();
    }, [user]);

    useEffect(() => {
        if (!user || !activeCall) return;

        // Listen for active call status (e.g., if other side ends)
        const callDoc = doc(db, 'calls', activeCall.id);
        const unsubscribe = onSnapshot(callDoc, (snapshot) => {
            if (!snapshot.exists() || snapshot.data()?.status === 'ended') {
                handleEndCall();
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
            setRemoteStream(callService.getRemoteStream());
        } catch (error) {
            console.error("Failed to accept call:", error);
            handleReject();
        }
    };

    const handleReject = async () => {
        if (!incomingCall) return;
        try {
            const callDoc = doc(db, 'calls', incomingCall.id);
            await updateDoc(callDoc, { status: 'rejected' });
            // Cleanup candidates
            // deleteDoc handled by service or auto-cleaned? Let's just delete the doc.
            await deleteDoc(callDoc);
            setIncomingCall(null);
        } catch (error) {
            console.error("Error rejecting call:", error);
        }
    };

    const handleEndCall = async () => {
        const callToEnd = activeCall || outboundCall;
        if (callToEnd) {
            await callService.endCall(callToEnd.id);
            setActiveCall(null);
            setOutboundCall(null);
            setRemoteStream(null);
        }
    };

    // For the caller, we need to listen if they started a call
    // The startCall is triggered manually from dashboards.
    // We should probably have a global way to know IF the current user is a caller.
    // Let's add a listener for calls where user is caller and status is 'connected' or 'ringing'
    useEffect(() => {
        if (!user) return;

        const q = query(
            collection(db, 'calls'),
            where('callerId', '==', user.uid)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            if (snapshot.empty) {
                if (activeCall && activeCall.callerId === user.uid) {
                    handleEndCall();
                }
                return;
            }

            const docData = snapshot.docs[0].data();
            const callData = { id: snapshot.docs[0].id, ...docData } as CallSession;

            if (callData.status === 'ringing') {
                setOutboundCall(callData);
            } else if (callData.status === 'accepted') {
                setOutboundCall(null);
                if (!activeCall) {
                    setActiveCall(callData);
                    setRemoteStream(callService.getRemoteStream());
                }
            } else if (callData.status === 'rejected') {
                setOutboundCall(null);
                handleEndCall();
            }
        });

        return () => unsubscribe();
    }, [user, activeCall]);

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
                />
            )}

            {outboundCall && (
                <OutboundCallModal
                    receiverName={outboundCall.receiverName}
                    receiverRole={outboundCall.receiverRole}
                    onCancel={() => handleEndCall()}
                />
            )}
        </>
    );
}
