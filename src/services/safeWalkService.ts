import {
    collection,
    addDoc,
    updateDoc,
    doc,
    query,
    where,
    onSnapshot,
    serverTimestamp,
    Timestamp,
    getDoc
} from "firebase/firestore";
import {
    ref,
    set,
    onValue
} from "firebase/database";
import { db, rtdb } from "../lib/firebase";

export interface SafeWalkLocation {
    latitude: number;
    longitude: number;
    speed: number | null;
    lastUpdated: number;
}

export interface SafeWalkRequest {
    userId: string;
    userName: string;
    userHostel?: string; // For warden filtering
    startLocation: { lat: number; lng: number; name?: string };
    destination: { lat: number; lng: number; name: string };
    expectedDuration: number; // in minutes
    note?: string;
}

export interface SafeWalkSession extends SafeWalkRequest {
    id: string;
    startTime: Timestamp;
    status: 'active' | 'delayed' | 'paused' | 'danger' | 'completed' | 'off-route';
    assignedEscort?: string | null;
    assignedEscortId?: string | null;
    escortRequested?: boolean;
    messages?: Array<{ from: string; fromId: string; text: string; timestamp: Date }>;
    timeline: any[];
}

const COLLECTION_NAME = "safe_walk";
const RTDB_NODE = "safe_walk_locations";

export const safeWalkService = {
    // Start a new Safe Walk
    startSafeWalk: async (data: SafeWalkRequest) => {
        try {
            const docRef = await addDoc(collection(db, COLLECTION_NAME), {
                ...data,
                startTime: serverTimestamp(),
                status: 'active',
                assignedEscort: null,
                timeline: [{
                    status: 'started',
                    timestamp: new Date(),
                    details: 'Safe Walk started'
                }]
            });

            // Initialize location in RTDB
            const locationRef = ref(rtdb, `${RTDB_NODE}/${docRef.id}`);
            await set(locationRef, {
                latitude: data.startLocation.lat,
                longitude: data.startLocation.lng,
                speed: 0,
                lastUpdated: Date.now()
            });

            return docRef.id;
        } catch (error) {
            console.error("Error starting Safe Walk:", error);
            throw error;
        }
    },

    // Update Walk Status (e.g., complete, danger)
    updateWalkStatus: async (walkId: string, status: SafeWalkSession['status'], details?: string) => {
        try {
            const walkRef = doc(db, COLLECTION_NAME, walkId);
            const walkDoc = await getDoc(walkRef);

            if (!walkDoc.exists()) throw new Error("Walk not found");

            const currentTimeline = walkDoc.data().timeline || [];

            await updateDoc(walkRef, {
                status,
                timeline: [...currentTimeline, {
                    status,
                    timestamp: new Date(),
                    details: details || `Status changed to ${status}`
                }]
            });
        } catch (error) {
            console.error("Error updating walk status:", error);
            throw error;
        }
    },

    // Update Real-time Location
    updateLocation: async (walkId: string, location: SafeWalkLocation) => {
        try {
            const locationRef = ref(rtdb, `${RTDB_NODE}/${walkId}`);
            await set(locationRef, location);
        } catch (error) {
            console.error("Error updating location:", error);
            // Don't throw here to avoid disrupting the user flow for minor network blips
        }
    },

    // Subscribe to Active Walks (for Security/Warden)
    subscribeToActiveWalks: (callback: (walks: SafeWalkSession[]) => void, hostelFilter?: string) => {
        let q = query(
            collection(db, COLLECTION_NAME),
            where("status", "in", ["active", "delayed", "paused", "danger"])
        );

        if (hostelFilter) {
            q = query(q, where("userHostel", "==", hostelFilter));
        }

        return onSnapshot(q, (snapshot) => {
            const walks = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            } as SafeWalkSession));
            callback(walks);
        });
    },

    // Subscribe to a specific walk's location (for Map)
    subscribeToWalkLocation: (walkId: string, callback: (location: SafeWalkLocation) => void) => {
        const locationRef = ref(rtdb, `${RTDB_NODE}/${walkId}`);
        return onValue(locationRef, (snapshot) => {
            const data = snapshot.val();
            if (data) {
                callback(data);
            }
        });
    },

    subscribeToUserActiveWalk: (userId: string, callback: (walk: SafeWalkSession | null) => void) => {
        const q = query(
            collection(db, COLLECTION_NAME),
            where("userId", "==", userId),
            where("status", "in", ["active", "delayed", "paused", "danger"])
        );

        return onSnapshot(q, (snapshot) => {
            if (!snapshot.empty) {
                callback({ id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as SafeWalkSession);
            } else {
                callback(null);
            }
        });
    },

    // Request Escort
    requestEscort: async (walkId: string) => {
        try {
            const walkRef = doc(db, COLLECTION_NAME, walkId);
            const walkDoc = await getDoc(walkRef);

            if (!walkDoc.exists()) throw new Error("Walk not found");

            const currentTimeline = walkDoc.data().timeline || [];

            await updateDoc(walkRef, {
                escortRequested: true,
                timeline: [...currentTimeline, {
                    status: 'escort_requested',
                    timestamp: new Date(),
                    details: 'Student requested escort'
                }]
            });
        } catch (error) {
            console.error("Error requesting escort:", error);
            throw error;
        }
    },

    // Assign Escort (Security action)
    assignEscort: async (walkId: string, escortName: string, securityId: string) => {
        try {
            const walkRef = doc(db, COLLECTION_NAME, walkId);
            const walkDoc = await getDoc(walkRef);

            if (!walkDoc.exists()) throw new Error("Walk not found");

            const currentTimeline = walkDoc.data().timeline || [];

            await updateDoc(walkRef, {
                assignedEscort: escortName,
                assignedEscortId: securityId,
                timeline: [...currentTimeline, {
                    status: 'escort_assigned',
                    timestamp: new Date(),
                    details: `Escort assigned: ${escortName}`,
                    by: securityId
                }]
            });
        } catch (error) {
            console.error("Error assigning escort:", error);
            throw error;
        }
    },

    // Send Message to Student
    sendMessageToStudent: async (walkId: string, message: string, senderId: string, senderName: string) => {
        try {
            const walkRef = doc(db, COLLECTION_NAME, walkId);
            const walkDoc = await getDoc(walkRef);

            if (!walkDoc.exists()) throw new Error("Walk not found");

            const currentTimeline = walkDoc.data().timeline || [];
            const currentMessages = walkDoc.data().messages || [];

            await updateDoc(walkRef, {
                messages: [...currentMessages, {
                    from: senderName,
                    fromId: senderId,
                    text: message,
                    timestamp: new Date()
                }],
                timeline: [...currentTimeline, {
                    status: 'message_sent',
                    timestamp: new Date(),
                    details: `Message from ${senderName}: ${message}`,
                    by: senderId
                }]
            });
        } catch (error) {
            console.error("Error sending message:", error);
            throw error;
        }
    },

    // Check if walk is delayed
    isWalkDelayed: (walk: SafeWalkSession): boolean => {
        if (!walk.startTime) return false;

        const startTime = walk.startTime.toDate ? walk.startTime.toDate() : new Date(walk.startTime as any);
        const expectedEndTime = new Date(startTime.getTime() + walk.expectedDuration * 60000);
        const bufferTime = 5 * 60000; // 5 minutes buffer
        const now = new Date();

        return now.getTime() > expectedEndTime.getTime() + bufferTime;
    },

    // Check if walk appears off-route (distance to destination increasing)
    checkOffRoute: (currentLat: number, currentLng: number, destLat: number, destLng: number, previousDistance?: number): { isOffRoute: boolean; currentDistance: number } => {
        const distance = calculateDistance(currentLat, currentLng, destLat, destLng);

        if (previousDistance !== undefined && distance > previousDistance + 50) {
            // Moving away from destination by more than 50 meters
            return { isOffRoute: true, currentDistance: distance };
        }

        return { isOffRoute: false, currentDistance: distance };
    },

    // Get walk history for a user
    getWalkHistory: async (userId: string, limit: number = 10) => {
        const q = query(
            collection(db, COLLECTION_NAME),
            where("userId", "==", userId),
            where("status", "==", "completed")
        );

        return new Promise<SafeWalkSession[]>((resolve) => {
            const unsubscribe = onSnapshot(q, (snapshot) => {
                const walks = snapshot.docs
                    .map(doc => ({ id: doc.id, ...doc.data() } as SafeWalkSession))
                    .slice(0, limit);
                resolve(walks);
                unsubscribe();
            });
        });
    },

    // Convert Safe Walk to SOS Event
    convertToSOS: async (walkId: string) => {
        try {
            const walkRef = doc(db, COLLECTION_NAME, walkId);
            const walkDoc = await getDoc(walkRef);

            if (!walkDoc.exists()) throw new Error("Walk not found");

            const currentTimeline = walkDoc.data().timeline || [];

            // Update status to danger
            await updateDoc(walkRef, {
                status: 'danger',
                timeline: [...currentTimeline, {
                    status: 'sos_triggered',
                    timestamp: new Date(),
                    details: 'SOS triggered during Safe Walk - escalated to emergency'
                }]
            });

            return walkDoc.data();
        } catch (error) {
            console.error("Error converting to SOS:", error);
            throw error;
        }
    }
};

// Helper function for distance calculation
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371e3; // metres
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
        Math.cos(φ1) * Math.cos(φ2) *
        Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
}
