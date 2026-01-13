import { db } from '../lib/firebase';
import {
    collection,
    doc,
    updateDoc,
    onSnapshot,
    serverTimestamp,
    getDoc,
    setDoc,
    getDocs,
    deleteDoc as firestoreDeleteDoc,
    query,
    where,
    addDoc,
    arrayUnion
} from 'firebase/firestore';





export interface CallSession {
    id: string;
    callerId: string;
    receiverId: string;
    callerName: string;
    receiverName: string;
    callerRole: string;
    receiverRole: string;
    status: 'ringing' | 'accepted' | 'ended' | 'rejected' | 'missed';
    callType: 'audio' | 'video';
    contextId: string; // sosId or safeWalkId
    contextType: 'sos' | 'safe_walk'; // Type of emergency context
    offer?: any;
    answer?: any;
    iceCandidates?: any[];
    createdAt: any;
    updatedAt: any;
}

const servers = {
    iceServers: [
        {
            urls: [
                'stun:stun1.l.google.com:19302',
                'stun:stun2.l.google.com:19302',
                'stun:stun3.l.google.com:19302',
                'stun:stun4.l.google.com:19302',
                'stun:stun.l.google.com:19302',
                'stun:global.stun.twilio.com:3478',
            ],
        },
    ],
    iceCandidatePoolSize: 10,
};

export class CallService {
    private pc: RTCPeerConnection | null = null;
    private localStream: MediaStream | null = null;
    private remoteStream: MediaStream | null = null;
    private currentFacingMode: 'user' | 'environment' = 'user';

    private remoteStreamListener: ((stream: MediaStream) => void) | null = null;
    private localStreamListener: ((stream: MediaStream) => void) | null = null;

    setRemoteStreamListener(callback: (stream: MediaStream) => void) {
        this.remoteStreamListener = callback;
    }

    setLocalStreamListener(callback: (stream: MediaStream) => void) {
        this.localStreamListener = callback;
    }

    private async logToTimeline(contextId: string, contextType: 'sos' | 'safe_walk', action: string, note?: string) {
        try {
            const collectionName = contextType === 'sos' ? 'sos_events' : 'safe_walk';
            const docRef = doc(db, collectionName, contextId);

            await updateDoc(docRef, {
                timeline: arrayUnion({
                    time: Date.now(),
                    timestamp: new Date(), // For safe_walk which uses Date objects
                    action: action,
                    by: 'system',
                    note: note || ''
                })
            });
        } catch (error) {
            console.error(`callService: Error logging to ${contextType} timeline:`, error);
        }
    }

    async startCall(
        caller: any,
        receiver: any,
        contextId: string,
        contextType: 'sos' | 'safe_walk',
        isVideo: boolean = false
    ): Promise<string> {
        console.log(`callService: Starting ${isVideo ? 'video' : 'audio'} call to receiver UID:`, receiver.uid, "Context:", contextId);

        // Safety guard: Don't allow calling if SOS is already resolved
        if (contextType === 'sos') {
            try {
                const sosRef = doc(db, 'sos_events', contextId);
                const sosSnap = await getDoc(sosRef);
                if (sosSnap.exists()) {
                    const sosData = sosSnap.data();
                    if (sosData.status?.resolved) {
                        throw new Error("Cannot start call for a resolved SOS.");
                    }
                }
            } catch (error: any) {
                console.error("callService: SOS resolution check failed:", error);
                if (error.message.includes("resolved")) throw error;
            }
        }

        this.cleanup();

        this.pc = new RTCPeerConnection(servers);
        this.currentFacingMode = 'user';

        try {
            this.localStream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true
                },
                video: isVideo ? {
                    facingMode: this.currentFacingMode,
                    width: { ideal: 640 },
                    height: { ideal: 480 }
                } : false
            });

            if (this.localStreamListener) {
                this.localStreamListener(this.localStream);
            }
        } catch (error) {
            console.error("callService: Error accessing media devices:", error);
            throw error;
        }

        this.remoteStream = new MediaStream();

        this.localStream.getTracks().forEach((track) => {
            if (this.pc && this.localStream) {
                this.pc.addTrack(track, this.localStream);
            }
        });

        this.pc.ontrack = (event) => {
            console.log("callService: Remote track received");
            event.streams[0].getTracks().forEach((track) => {
                this.remoteStream?.addTrack(track);
            });
            if (this.remoteStreamListener && this.remoteStream) {
                this.remoteStreamListener(this.remoteStream);
            }
        };

        const callDoc = doc(collection(db, 'calls'));
        const callerCandidates = collection(callDoc, 'callerCandidates');
        const calleeCandidates = collection(callDoc, 'calleeCandidates');

        this.pc.onicecandidate = (event) => {
            if (event.candidate) {
                addDoc(callerCandidates, event.candidate.toJSON()).catch(() => { });
            }
        };

        const offerDescription = await this.pc.createOffer();
        await this.pc.setLocalDescription(offerDescription);

        const callData = {
            callerId: caller.uid,
            callerName: caller.name || caller.displayName || 'User',
            callerRole: caller.role || 'student',
            receiverId: receiver.uid,
            receiverName: receiver.name || 'Staff',
            receiverRole: receiver.role || 'warden',
            status: 'ringing',
            callType: isVideo ? 'video' : 'audio',
            contextId,
            contextType,
            offer: {
                type: offerDescription.type,
                sdp: offerDescription.sdp,
            },
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
        };

        await setDoc(callDoc, callData);

        // Log call start to timeline
        this.logToTimeline(contextId, contextType, `Call Started (${callData.callType})`, `To: ${callData.receiverName}`);

        // Listen for remote answer
        const unsubscribe = onSnapshot(callDoc, (snapshot) => {
            const data = snapshot.data();
            if (!this.pc) return;

            if (data?.answer && this.pc.signalingState === 'have-local-offer') {
                console.log("callService: Applying remote answer");
                const answerDescription = new RTCSessionDescription(data.answer);
                this.pc.setRemoteDescription(answerDescription).catch(console.error);
            }

            if (data?.status === 'ended' || data?.status === 'rejected' || data?.status === 'missed') {
                this.cleanup();
                unsubscribe();
            }
        });

        // Listen for callee candidates
        onSnapshot(calleeCandidates, (snapshot) => {
            snapshot.docChanges().forEach((change) => {
                if (change.type === 'added') {
                    const data = change.doc.data();
                    const candidate = new RTCIceCandidate(data);
                    this.pc?.addIceCandidate(candidate).catch(() => { });
                }
            });
        });

        return callDoc.id;
    }

    async joinCall(callId: string) {
        console.log("callService: Joining call:", callId);
        this.cleanup();

        const callDoc = doc(db, 'calls', callId);
        const callSnapshot = await getDoc(callDoc);
        const data = callSnapshot.data() as CallSession;
        if (!data) return;

        const isVideo = data.callType === 'video';
        this.pc = new RTCPeerConnection(servers);
        this.currentFacingMode = 'user';

        try {
            this.localStream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true
                },
                video: isVideo ? {
                    facingMode: this.currentFacingMode,
                    width: { ideal: 640 },
                    height: { ideal: 480 }
                } : false
            });

            if (this.localStreamListener) {
                this.localStreamListener(this.localStream);
            }
        } catch (error) {
            console.error("callService: Error accessing media devices:", error);
            throw error;
        }

        this.remoteStream = new MediaStream();

        this.localStream.getTracks().forEach((track) => {
            if (this.pc && this.localStream) {
                this.pc.addTrack(track, this.localStream);
            }
        });

        this.pc.ontrack = (event) => {
            console.log("callService: Remote track received");
            event.streams[0].getTracks().forEach((track) => {
                this.remoteStream?.addTrack(track);
            });
            if (this.remoteStreamListener && this.remoteStream) {
                this.remoteStreamListener(this.remoteStream);
            }
        };

        const callerCandidates = collection(callDoc, 'callerCandidates');
        const calleeCandidates = collection(callDoc, 'calleeCandidates');

        this.pc.onicecandidate = (event) => {
            if (event.candidate) {
                addDoc(calleeCandidates, event.candidate.toJSON()).catch(() => { });
            }
        };

        await this.pc.setRemoteDescription(new RTCSessionDescription(data.offer));
        const answerDescription = await this.pc.createAnswer();
        await this.pc.setLocalDescription(answerDescription);

        await updateDoc(callDoc, {
            answer: { type: answerDescription.type, sdp: answerDescription.sdp },
            status: 'accepted',
            updatedAt: serverTimestamp()
        });

        onSnapshot(callDoc, (snapshot) => {
            const data = snapshot.data();
            if (data?.status === 'ended' || data?.status === 'rejected' || data?.status === 'missed') {
                this.cleanup();
            }
        });

        // Listen for caller candidates
        onSnapshot(callerCandidates, (snapshot) => {
            snapshot.docChanges().forEach((change) => {
                if (change.type === 'added') {
                    const data = change.doc.data();
                    const candidate = new RTCIceCandidate(data);
                    this.pc?.addIceCandidate(candidate).catch(() => { });
                }
            });
        });
    }

    toggleMute(muted: boolean) {
        if (this.localStream) {
            this.localStream.getAudioTracks().forEach(track => {
                track.enabled = !muted;
            });
        }
    }

    toggleVideo(enabled: boolean) {
        if (this.localStream) {
            this.localStream.getVideoTracks().forEach(track => {
                track.enabled = enabled;
            });
        }
    }

    async switchCamera() {
        if (!this.localStream || !this.pc) return;

        const videoTrack = this.localStream.getVideoTracks()[0];
        if (!videoTrack) return;

        this.currentFacingMode = this.currentFacingMode === 'user' ? 'environment' : 'user';

        try {
            const newStream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: this.currentFacingMode }
            });

            const newTrack = newStream.getVideoTracks()[0];

            // Replace track in peer connection
            const sender = this.pc.getSenders().find(s => s.track?.kind === 'video');
            if (sender) {
                await sender.replaceTrack(newTrack);
            }

            // Stop old track and update local stream
            videoTrack.stop();
            this.localStream.removeTrack(videoTrack);
            this.localStream.addTrack(newTrack);

            if (this.localStreamListener) {
                this.localStreamListener(this.localStream);
            }
        } catch (error) {
            console.error("callService: Error switching camera:", error);
        }
    }

    async setSpeakerMode(enabled: boolean) {
        // speakerphone switching is not largely supported in browsers directly via an API like setSinkId in all cases
        // but we can try to use setSinkId on the audio element if available.
        // For mobile browsers, this often relies on the user's OS defaults.
        console.log("callService: Speaker mode requested:", enabled);
    }


    async endCall(callId: string, finalStatus: 'ended' | 'rejected' | 'missed' = 'ended') {
        const callDoc = doc(db, 'calls', callId);
        try {
            const snap = await getDoc(callDoc);
            if (!snap.exists()) {
                this.cleanup();
                return;
            }
            const data = snap.data() as CallSession;

            // Log termination to timeline
            if (data.contextId && data.contextType) {
                this.logToTimeline(data.contextId, data.contextType, `Call Finished (${data.callType})`, `Status: ${finalStatus}`);
            }

            // If a caller ends a ringing call, it's a "missed call" for the receiver
            if (data && data.status === 'ringing' && finalStatus === 'ended') {
                const notificationId = `missed_${callId}`;
                await setDoc(doc(db, 'notifications', notificationId), {
                    toUserId: data.receiverId,
                    toRole: data.receiverRole,
                    fromUserId: data.callerId,
                    fromName: data.callerName,
                    fromRole: data.callerRole || 'student',
                    type: 'missed_call',
                    callId: callId,
                    message: `Missed call from ${data.callerName}`,
                    createdAt: serverTimestamp(),
                    seen: false
                }).catch(() => { });
            }

            await updateDoc(callDoc, {
                status: finalStatus,
                updatedAt: serverTimestamp()
            });
            // Small delay to ensure signaling reaches other side before local cleanup
            setTimeout(() => this.cleanup(), 500);

            // Auto cleanup after 5 seconds
            setTimeout(async () => {
                await firestoreDeleteDoc(callDoc).catch(() => { });
            }, 5000);
        } catch (e) {
            this.cleanup();
        }
    }

    async sanitizeStaleCalls(userId: string) {
        console.log("callService: Sanitizing stale calls for user:", userId);
        try {
            // Find calls where user is caller or receiver and status is NOT ended
            const q1 = query(collection(db, 'calls'), where('callerId', '==', userId));
            const q2 = query(collection(db, 'calls'), where('receiverId', '==', userId));

            const [snap1, snap2] = await Promise.all([getDocs(q1), getDocs(q2)]);
            const docs = [...snap1.docs, ...snap2.docs];

            const now = Date.now();
            for (const d of docs) {
                const data = d.data() as any;
                const createdAt = data.createdAt?.toMillis?.() || data.createdAt?.seconds * 1000 || 0;
                // If more than 5 minutes old or exists, mark as ended/delete
                if (now - createdAt > 300000 || ['ended', 'rejected', 'missed'].includes(data.status)) {
                    await firestoreDeleteDoc(d.ref).catch(() => { });
                }
            }

        } catch (error) {
            console.error("callService: Error sanitizing calls:", error);
        }
    }


    private cleanup() {
        if (this.pc) {
            this.pc.close();
            this.pc = null;
        }
        if (this.localStream) {
            this.localStream.getTracks().forEach(track => track.stop());
            this.localStream = null;
        }
        this.remoteStream = null;
    }
}

export const callService = new CallService();

