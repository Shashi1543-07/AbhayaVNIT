import { db } from '../lib/firebase';
import {
    collection,
    doc,
    updateDoc,
    onSnapshot,
    deleteDoc,
    serverTimestamp,
    getDoc,
    setDoc,
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
    callType: 'audio';
    offer?: any;
    answer?: any;
    iceCandidates?: any[];
    createdAt: any;
    updatedAt: any;
}

const servers = {
    iceServers: [
        {
            urls: ['stun:stun.l.google.com:19302'],
        },
    ],
    iceCandidatePoolSize: 10,
};

export class CallService {
    private pc: RTCPeerConnection | null = null;
    private localStream: MediaStream | null = null;
    private remoteStream: MediaStream | null = null;

    private remoteStreamListener: ((stream: MediaStream) => void) | null = null;

    setRemoteStreamListener(callback: (stream: MediaStream) => void) {
        this.remoteStreamListener = callback;
    }

    async startCall(caller: any, receiver: any): Promise<string> {
        console.log("callService: Starting call to receiver UID:", receiver.uid);
        this.cleanup();

        this.pc = new RTCPeerConnection(servers);
        this.localStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        this.remoteStream = new MediaStream();

        this.localStream.getTracks().forEach((track) => {
            if (this.pc && this.localStream) {
                this.pc.addTrack(track, this.localStream);
            }
        });

        this.pc.ontrack = (event) => {
            event.streams[0].getTracks().forEach((track) => {
                this.remoteStream?.addTrack(track);
            });
            if (this.remoteStreamListener && this.remoteStream) {
                this.remoteStreamListener(this.remoteStream);
            }
        };

        const callDoc = doc(collection(db, 'calls'));

        this.pc.onicecandidate = (event) => {
            if (event.candidate) {
                updateDoc(callDoc, {
                    iceCandidates: arrayUnion(event.candidate.toJSON()),
                    updatedAt: serverTimestamp()
                }).catch(() => { });
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
            callType: 'audio',
            offer: {
                type: offerDescription.type,
                sdp: offerDescription.sdp,
            },
            iceCandidates: [],
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
        };

        await setDoc(callDoc, callData);

        // Listen for remote answer
        const unsubscribe = onSnapshot(callDoc, (snapshot) => {
            const data = snapshot.data();
            if (!this.pc) return;

            if (data?.answer) {
                const answerDescription = new RTCSessionDescription(data.answer);
                // If peer connection is recycled or refreshed, we might need to set it again
                if (this.pc.signalingState === 'have-local-offer') {
                    console.log("callService: Applying remote answer");
                    this.pc.setRemoteDescription(answerDescription).catch(console.error);
                }
            }

            if (data?.iceCandidates) {
                data.iceCandidates.forEach((candidateData: any) => {
                    this.pc?.addIceCandidate(new RTCIceCandidate(candidateData)).catch(() => { });
                });
            }

            if (data?.status === 'ended' || data?.status === 'rejected' || data?.status === 'missed') {
                this.cleanup();
                unsubscribe();
            }
        });

        return callDoc.id;
    }

    async joinCall(callId: string) {
        this.cleanup();

        this.pc = new RTCPeerConnection(servers);
        this.localStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        this.remoteStream = new MediaStream();

        this.localStream.getTracks().forEach((track) => {
            if (this.pc && this.localStream) {
                this.pc.addTrack(track, this.localStream);
            }
        });

        this.pc.ontrack = (event) => {
            event.streams[0].getTracks().forEach((track) => {
                this.remoteStream?.addTrack(track);
            });
            if (this.remoteStreamListener && this.remoteStream) {
                this.remoteStreamListener(this.remoteStream);
            }
        };

        const callDoc = doc(db, 'calls', callId);

        this.pc.onicecandidate = (event) => {
            if (event.candidate) {
                updateDoc(callDoc, {
                    iceCandidates: arrayUnion(event.candidate.toJSON()),
                    updatedAt: serverTimestamp()
                }).catch(() => { });
            }
        };

        const callSnapshot = await getDoc(callDoc);
        const data = callSnapshot.data();
        if (!data) return;

        await this.pc.setRemoteDescription(new RTCSessionDescription(data.offer));
        const answerDescription = await this.pc.createAnswer();
        await this.pc.setLocalDescription(answerDescription);

        await updateDoc(callDoc, {
            answer: { type: answerDescription.type, sdp: answerDescription.sdp },
            status: 'accepted',
            updatedAt: serverTimestamp()
        });

        const unsubscribe = onSnapshot(callDoc, (snapshot) => {
            const data = snapshot.data();
            if (!this.pc) return;

            if (data?.iceCandidates) {
                data.iceCandidates.forEach((candidateData: any) => {
                    this.pc?.addIceCandidate(new RTCIceCandidate(candidateData)).catch(() => { });
                });
            }

            if (data?.status === 'ended' || data?.status === 'rejected' || data?.status === 'missed') {
                this.cleanup();
                unsubscribe();
            }
        });
    }

    async endCall(callId: string, finalStatus: 'ended' | 'rejected' | 'missed' = 'ended') {
        const callDoc = doc(db, 'calls', callId);
        try {
            const snap = await getDoc(callDoc);
            const data = snap.data() as CallSession;

            // If a caller ends a ringing call, it's a "missed call" for the receiver
            if (data && data.status === 'ringing' && finalStatus === 'ended') {
                const notificationId = `missed_${callId}`;
                await setDoc(doc(db, 'notifications', notificationId), {
                    toUserId: data.receiverId,
                    toRole: data.receiverRole,
                    fromUserId: data.callerId,
                    fromName: data.callerName,
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
                await deleteDoc(callDoc).catch(() => { });
            }, 5000);
        } catch (e) {
            this.cleanup();
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
