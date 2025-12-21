import { db } from '../lib/firebase';
import {
    collection,
    addDoc,
    updateDoc,
    doc,
    onSnapshot,
    query,
    where,
    serverTimestamp
} from 'firebase/firestore';

export interface SOSEvent {
    id: string;
    userId: string;
    userName: string;
    userPhone: string;
    role: 'student' | 'warden' | 'staff';
    hostelId?: string;
    roomNo?: string;
    status: 'active' | 'in_progress' | 'resolved';
    triggeredAt: number;
    location: {
        lat: number;
        lng: number;
        address?: string;
    };
    assignedTo?: {
        id: string;
        name: string;
        role: string;
    };
    timeline: {
        time: number;
        action: string;
        by: string;
        note?: string;
    }[];
    audioUrl?: string;
    // Enhanced SOS fields
    emergencyType: 'medical' | 'harassment' | 'general';
    triggerMethod: 'manual_gesture' | 'shake' | 'voice' | 'button';
    description?: string;
    voiceTranscript?: string;
    isDetailsAdded?: boolean;
    resolvedAt?: number;
    resolutionSummary?: string;
}

export const sosService = {
    // 1. Trigger SOS
    triggerSOS: async (
        user: any,
        location: { lat: number; lng: number },
        emergencyType: 'medical' | 'harassment' | 'general' = 'general',
        triggerMethod: 'manual_gesture' | 'shake' | 'voice' | 'button' = 'manual_gesture',
        audioUrl?: string
    ) => {
        try {
            // 1. Create SOS Event Doc first to get ID
            const sosData = {
                userId: user.uid,
                userName: user.name || user.displayName || 'Unknown Student',
                userPhone: user.phoneNumber || '',
                role: user.role || 'student',
                hostelId: user.hostelId || user.hostel || null,
                roomNo: user.roomNo || null,
                status: 'active',
                triggeredAt: Date.now(),
                location,
                timeline: [{
                    time: Date.now(),
                    action: 'SOS Triggered',
                    by: user.uid,
                    note: `Emergency: ${emergencyType} (${triggerMethod})`
                }],
                audioUrl: audioUrl || null,
                emergencyType,
                triggerMethod,
                createdAt: serverTimestamp(),
                isDetailsAdded: false,
                chatId: '' // Will update after
            };

            const docRef = await addDoc(collection(db, 'sos_events'), sosData);
            const sosId = docRef.id;

            // 2. Create Conversation with Deterministic ID: "sos_{sosId}"
            const { chatService } = await import('./chatService');

            // Participants: Student (creator)
            const participants = { [user.uid]: true };
            const participantRoles = { student: user.uid };

            // We use 'sos' as type, and sos_{sosId} as the custom conversation ID
            const chatId = await chatService.createConversation(
                'sos',
                participants,
                participantRoles,
                `sos_${sosId}`
            );

            // 3. Link back to SOS Event
            await updateDoc(docRef, { chatId: chatId });

            return { sosId, chatId };
        } catch (error) {
            console.error("Error triggering SOS:", error);
            throw error;
        }
    },

    // 1.5 Update SOS Details (Post-Trigger)
    updateSOSDetails: async (sosId: string, details: { emergencyType: string; description?: string; voiceTranscript?: string }) => {
        const sosRef = doc(db, 'sos_events', sosId);
        const { arrayUnion } = await import('firebase/firestore');

        await updateDoc(sosRef, {
            ...details,
            isDetailsAdded: true,
            timeline: arrayUnion({
                time: Date.now(),
                action: 'Details Added',
                by: 'student', // or userId if available
                note: `Type: ${details.emergencyType}`
            })
        });
    },

    // 2. Subscribe to Active SOS Events (Real-time)
    subscribeToActiveSOS: (callback: (events: SOSEvent[]) => void, hostelId?: string) => {
        // Query by status AND hostelId if provided to satisfy security rules
        let q;
        if (hostelId) {
            console.log("sosService: Subscribing to SOS with hostelId:", hostelId);
            q = query(
                collection(db, 'sos_events'),
                where('status', 'in', ['active', 'in_progress']),
                where('hostelId', '==', hostelId)
            );
        } else {
            console.log("sosService: Subscribing to ALL SOS events (Security/Admin view)");
            q = query(
                collection(db, 'sos_events'),
                where('status', 'in', ['active', 'in_progress'])
            );
        }

        return onSnapshot(q, (snapshot) => {
            let events = snapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    id: doc.id,
                    ...data,
                    timeline: data.timeline || [] // Ensure timeline exists
                };
            }) as SOSEvent[];

            // Sort client-side
            events.sort((a, b) => b.triggeredAt - a.triggeredAt);

            callback(events);
        }, (error) => {
            console.error("sosService: [DEBUG] SOS Subscription Error:", error);
        });
    },

    // 3. Assign Guard
    assignGuard: async (sosId: string, guard: { id: string; name: string; role: string }) => {
        const sosRef = doc(db, 'sos_events', sosId);
        const { arrayUnion } = await import('firebase/firestore');

        await updateDoc(sosRef, {
            status: 'in_progress',
            assignedTo: guard,
            timeline: arrayUnion({
                time: Date.now(),
                action: 'Security Assigned',
                by: guard.id,
                note: `Assigned to ${guard.name}`
            })
        });
    },

    // 4. Resolve SOS
    resolveSOS: async (sosId: string, userId: string, summary: string) => {
        const sosRef = doc(db, 'sos_events', sosId);
        const { arrayUnion } = await import('firebase/firestore');

        await updateDoc(sosRef, {
            status: 'resolved',
            resolvedAt: Date.now(),
            resolutionSummary: summary,
            timeline: arrayUnion({
                time: Date.now(),
                action: 'Resolved',
                by: userId,
                note: summary
            })
        });
    },

    acknowledgeSOS: async (sosId: string, userId: string) => {
        const sosRef = doc(db, 'sos_events', sosId);
        const { arrayUnion } = await import('firebase/firestore');

        await updateDoc(sosRef, {
            timeline: arrayUnion({
                time: Date.now(),
                action: 'Warden Acknowledged',
                by: userId
            })
        });
    },

    // 6. Get Resolved Events (History)
    getResolvedEvents: (callback: (events: SOSEvent[]) => void) => {
        const q = query(
            collection(db, 'sos_events'),
            where('status', '==', 'resolved')
            // orderBy('resolvedAt', 'desc'), // Removed to avoid index requirement
            // limit(50)
        );

        return onSnapshot(q, (snapshot) => {
            const events = snapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    id: doc.id,
                    ...data,
                    timeline: data.timeline || []
                };
            }) as SOSEvent[];

            // Sort client-side
            events.sort((a, b) => (b.resolvedAt || 0) - (a.resolvedAt || 0)); // Assuming resolvedAt is number (timestamp)

            callback(events);
        });
    }
};
