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
    status: 'ringing' | 'accepted' | 'ended' | 'rejected';
    offer?: any;
    answer?: any;
    iceCandidates?: any[];
    createdAt: any;
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

    async startCall(caller: any, receiver: any): Promise<string> {
        this.pc = new RTCPeerConnection(servers);
        this.localStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        this.remoteStream = new MediaStream();

        // Push local tracks to peer connection
        this.localStream.getTracks().forEach((track) => {
            this.pc?.addTrack(track, this.localStream!);
        });

        // Pull remote tracks
        this.pc.ontrack = (event) => {
            event.streams[0].getTracks().forEach((track) => {
                this.remoteStream?.addTrack(track);
            });
        };

        const callCollection = collection(db, 'calls');
        const callDoc = doc(callCollection);

        this.pc.onicecandidate = (event) => {
            if (event.candidate) {
                updateDoc(callDoc, {
                    iceCandidates: arrayUnion(event.candidate.toJSON())
                });
            }
        };

        const offerDescription = await this.pc.createOffer();
        await this.pc.setLocalDescription(offerDescription);

        const callData = {
            callerId: caller.uid,
            callerName: caller.name || caller.displayName || 'Student',
            callerRole: caller.role || 'student',
            receiverId: receiver.uid,
            receiverName: receiver.name || 'Staff',
            receiverRole: receiver.role || 'warden',
            status: 'ringing',
            offer: {
                type: offerDescription.type,
                sdp: offerDescription.sdp,
            },
            iceCandidates: [],
            createdAt: serverTimestamp(),
        };

        await setDoc(callDoc, callData);

        // Listen for updates (answer and remote candidates)
        onSnapshot(callDoc, (snapshot) => {
            const data = snapshot.data();
            if (!this.pc) return;

            // Handle Answer
            if (!this.pc.currentRemoteDescription && data?.answer) {
                const answerDescription = new RTCSessionDescription(data.answer);
                this.pc.setRemoteDescription(answerDescription).catch(console.error);
            }

            // Handle ICE Candidates from receiver
            if (data?.iceCandidates) {
                data.iceCandidates.forEach((candidateData: any) => {
                    // Only add candidate if it's not our own (or just let WebRTC handle it, it ignores duplicates usually)
                    this.pc?.addIceCandidate(new RTCIceCandidate(candidateData)).catch(() => { });
                });
            }
        });

        return callDoc.id;
    }

    async joinCall(callId: string) {
        this.pc = new RTCPeerConnection(servers);
        this.localStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        this.remoteStream = new MediaStream();

        this.localStream.getTracks().forEach((track) => {
            this.pc?.addTrack(track, this.localStream!);
        });

        this.pc.ontrack = (event) => {
            event.streams[0].getTracks().forEach((track) => {
                this.remoteStream?.addTrack(track);
            });
        };

        const callDoc = doc(db, 'calls', callId);

        this.pc.onicecandidate = (event) => {
            if (event.candidate) {
                updateDoc(callDoc, {
                    iceCandidates: arrayUnion(event.candidate.toJSON())
                });
            }
        };

        const callSnapshot = await getDoc(callDoc);
        const callData = callSnapshot.data();
        const offerDescription = callData?.offer;
        await this.pc.setRemoteDescription(new RTCSessionDescription(offerDescription));

        const answerDescription = await this.pc.createAnswer();
        await this.pc.setLocalDescription(answerDescription);

        const answer = {
            type: answerDescription.type,
            sdp: answerDescription.sdp,
        };

        await updateDoc(callDoc, { answer, status: 'accepted' });

        // Listen for candidates from caller
        onSnapshot(callDoc, (snapshot) => {
            const data = snapshot.data();
            if (data?.iceCandidates) {
                data.iceCandidates.forEach((candidateData: any) => {
                    this.pc?.addIceCandidate(new RTCIceCandidate(candidateData)).catch(() => { });
                });
            }
        });
    }

    async endCall(callId: string) {
        if (this.pc) {
            this.pc.close();
        }
        if (this.localStream) {
            this.localStream.getTracks().forEach((track) => track.stop());
        }
        try {
            const callDocRef = doc(db, 'calls', callId);
            const callSnap = await getDoc(callDocRef);

            if (callSnap.exists()) {
                const data = callSnap.data();
                // If the call was still ringing, record it as a missed call
                if (data.status === 'ringing') {
                    await setDoc(doc(db, 'missed_calls', callId), {
                        ...data,
                        endedAt: serverTimestamp(),
                        type: 'missed'
                    }).catch(console.error);
                }

                await updateDoc(callDocRef, { status: 'ended' });
                // Delay deletion to allow listeners to catch the 'ended' state
                setTimeout(async () => {
                    await deleteDoc(callDocRef).catch(() => { });
                }, 2000);
            }
        } catch (e) {
            console.error("Error ending call:", e);
        }
        this.pc = null;
        this.localStream = null;
        this.remoteStream = null;
    }

    getRemoteStream() {
        return this.remoteStream;
    }

    getLocalStream() {
        return this.localStream;
    }
}

export const callService = new CallService();
