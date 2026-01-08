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
    // Student information
    userId: string;
    userName: string;
    studentId: string;  // For clarity (same as userId)
    studentName: string; // For clarity (same as userName)
    userPhone: string;
    role: 'student' | 'warden' | 'staff';

    // Location details
    hostelId?: string;
    hostel: string;      // Hostel ID/name
    roomNo?: string;
    roomNumber: string;  // Student's room

    // New status structure for role-based management
    status: {
        recognised: boolean;  // Set by Security when they acknowledge
        resolved: boolean;    // Set by Security when incident is resolved
    };

    // Security assignment
    recognisedBy: string | null;  // Security userId who recognised
    assignedTo?: {
        id: string;
        name: string;
        role: string;
    };

    // Timestamps
    triggeredAt: number;
    createdAt: number;
    resolvedAt: number | null;

    // Location
    location: {
        lat: number;
        lng: number;
        address?: string;
    };
    liveLocation: {
        lat: number;
        lng: number;
    };

    // Timeline
    timeline: {
        time: number;
        action: string;
        by: string;
        note?: string;
    }[];

    // Emergency details
    emergencyType: 'medical' | 'harassment' | 'other' | 'general';
    triggerMethod: 'manual_gesture' | 'shake' | 'voice' | 'button';
    description?: string;
    optionalMessage?: string;
    voiceTranscript?: string;
    audioUrl?: string;
    isDetailsAdded?: boolean;
    resolutionSummary?: string;
}

export const sosService = {
    // 1. Trigger SOS
    triggerSOS: async (
        user: any,
        location: { lat: number; lng: number },
        emergencyType: 'medical' | 'harassment' | 'other' | 'general' = 'other',
        triggerMethod: 'manual_gesture' | 'shake' | 'voice' | 'button' = 'manual_gesture',
        audioUrl?: string
    ) => {
        try {
            // 1. Create SOS Event Doc first to get ID
            const sosData = {
                // Student information
                userId: user.uid,
                userName: user.name || user.displayName || 'Unknown Student',
                studentId: user.uid,
                studentName: user.name || user.displayName || 'Unknown Student',
                userPhone: user.phoneNumber || '',
                role: user.role || 'student',

                // Location details
                hostelId: user.hostelId || user.hostel || null,
                hostel: user.hostelId || user.hostel || 'Unknown',
                roomNo: user.roomNo || null,
                roomNumber: user.roomNo || user.roomNumber || 'N/A',

                // New status structure
                status: {
                    recognised: false,
                    resolved: false
                },

                // Security assignment (initially null)
                recognisedBy: null,
                assignedTo: null,

                // Timestamps
                triggeredAt: Date.now(),
                createdAt: serverTimestamp(),
                resolvedAt: null,

                // Location
                location,
                liveLocation: location,

                // Timeline
                timeline: [{
                    time: Date.now(),
                    action: 'SOS Triggered',
                    by: user.uid,
                    note: `Emergency: ${emergencyType} (${triggerMethod})`
                }],

                // Emergency details
                audioUrl: audioUrl || null,
                emergencyType,
                triggerMethod,
                isDetailsAdded: false,
                chatId: '' // Will update after
            };

            const docRef = await addDoc(collection(db, 'sos_events'), sosData);
            const sosId = docRef.id;

            // 2. Create Conversation with Deterministic ID: "sos_{sosId}"
            const { chatService } = await import('./chatService');

            // We use 'sos' as type, and sos_{sosId} as the custom conversation ID
            const chatId = await chatService.createConversation(
                'sos',
                [
                    { uid: user.uid, name: user.name || user.displayName || 'Student', role: user.role || 'student' }
                ],
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
        // Query for SOS events where status.resolved = false
        let q;
        if (hostelId) {
            console.log("sosService: Subscribing to SOS with hostelId:", hostelId);
            q = query(
                collection(db, 'sos_events'),
                where('status.resolved', '==', false),
                where('hostelId', '==', hostelId)
            );
        } else {
            console.log("sosService: Subscribing to ALL SOS events (Security/Admin view)");
            q = query(
                collection(db, 'sos_events'),
                where('status.resolved', '==', false)
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

    // 3. Recognise SOS (Security Only)
    recogniseSOS: async (sosId: string, securityId: string, securityName: string) => {
        const sosRef = doc(db, 'sos_events', sosId);
        const { arrayUnion } = await import('firebase/firestore');

        await updateDoc(sosRef, {
            'status.recognised': true,
            recognisedBy: securityId,
            assignedTo: {
                id: securityId,
                name: securityName,
                role: 'security'
            },
            timeline: arrayUnion({
                time: Date.now(),
                action: 'SOS Recognised by Security',
                by: securityId,
                note: `Recognised by ${securityName}`
            })
        });
    },

    // 3.5 Assign Guard (Deprecated - keeping for backward compatibility)
    assignGuard: async (sosId: string, guard: { id: string; name: string; role: string }) => {
        // This now calls recogniseSOS
        await sosService.recogniseSOS(sosId, guard.id, guard.name);
    },

    // 4. Resolve SOS (Security Only - must be recognised first)
    resolveSOS: async (sosId: string, securityId: string, summary: string) => {
        const sosRef = doc(db, 'sos_events', sosId);
        const { arrayUnion, getDoc } = await import('firebase/firestore');

        // Check if SOS is recognised first
        const sosDoc = await getDoc(sosRef);
        if (!sosDoc.exists()) {
            throw new Error('SOS event not found');
        }

        const sosData = sosDoc.data() as SOSEvent;
        if (!sosData.status.recognised) {
            throw new Error('SOS must be recognised before it can be resolved');
        }

        await updateDoc(sosRef, {
            'status.resolved': true,
            resolvedAt: Date.now(),
            resolutionSummary: summary,
            timeline: arrayUnion({
                time: Date.now(),
                action: 'Resolved',
                by: securityId,
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
            where('status.resolved', '==', true)
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
