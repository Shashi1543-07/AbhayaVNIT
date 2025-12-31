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
    arrayUnion
} from "firebase/firestore";
import {
    ref,
    set,
    onValue
} from "firebase/database";
import { db, rtdb } from "../lib/firebase";
import { sosService } from "./sosService";

export interface SafeWalkLocation {
    latitude: number;
    longitude: number;
    speed: number | null;
    lastUpdated: number;
}

export interface SafeWalkRequest {
    userId: string;
    userName: string;
    hostelId: string;
    startLocation: { lat: number; lng: number; name?: string };
    destination: { lat: number; lng: number; name: string };
    expectedDuration: number; // in minutes
    note?: string | null;
}

export interface SafeWalkSession extends SafeWalkRequest {
    id: string;
    startTime: Timestamp;
    status: 'active' | 'paused' | 'delayed' | 'completed' | 'danger';
    createdAt: Timestamp;
    updatedAt: Timestamp;
    escortRequested?: boolean;
    assignedEscort?: string;
    timeline?: { timestamp: any; details: string; type: string }[];
    userHostel?: string;
    message?: string; // Student note
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
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
                status: 'active'
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

    // Update Walk Status (active | paused | delayed | completed | danger)
    updateWalkStatus: async (walkId: string, status: SafeWalkSession['status']) => {
        try {
            const walkRef = doc(db, COLLECTION_NAME, walkId);
            await updateDoc(walkRef, {
                status,
                updatedAt: serverTimestamp()
            });
        } catch (error) {
            console.error("Error updating walk status:", error);
            throw error;
        }
    },

    // Update Real-time Location to RTDB
    updateLocation: async (walkId: string, location: SafeWalkLocation) => {
        try {
            const locationRef = ref(rtdb, `${RTDB_NODE}/${walkId}`);
            await set(locationRef, location);
        } catch (error) {
            console.error("Error updating location:", error);
        }
    },

    // Subscribe to Active Walks (for Security/Warden)
    subscribeToActiveWalks: (callback: (walks: SafeWalkSession[]) => void, hostelFilter?: string) => {
        let q = query(
            collection(db, COLLECTION_NAME),
            where("status", "in", ["active", "delayed", "paused", "danger"])
        );

        if (hostelFilter) {
            q = query(q, where("hostelId", "==", hostelFilter));
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

    // Subscribe to current user's active session
    subscribeToUserActiveWalk: (userId: string, callback: (walk: SafeWalkSession | null) => void) => {
        const q = query(
            collection(db, COLLECTION_NAME),
            where("userId", "==", userId),
            where("status", "in", ["active", "delayed", "paused"])
        );

        return onSnapshot(q, (snapshot) => {
            if (!snapshot.empty) {
                callback({ id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as SafeWalkSession);
            } else {
                callback(null);
            }
        });
    },

    // Escalation to SOS
    convertToSOS: async (walkId: string, user: any, location: { lat: number; lng: number }) => {
        try {
            const walkRef = doc(db, COLLECTION_NAME, walkId);

            // 1. Mark walk as danger/escalated
            await updateDoc(walkRef, {
                status: 'danger',
                updatedAt: serverTimestamp()
            });

            // 2. Trigger SOS using sosService
            // This will create the SOS event and notify everyone properly
            const sosResult = await sosService.triggerSOS(
                user,
                location,
                'other',
                'button'
            );

            return sosResult;
        } catch (error) {
            console.error("Error escalating Safe Walk to SOS:", error);
            throw error;
        }
    },

    // Check if walk is delayed (used for client-side monitoring)
    isWalkDelayed: (walk: SafeWalkSession): boolean => {
        if (!walk.startTime) return false;

        const startTime = walk.startTime.toDate ? walk.startTime.toDate() : new Date(walk.startTime as any);
        const expectedEndTime = new Date(startTime.getTime() + walk.expectedDuration * 60000);
        const now = new Date();

        return now.getTime() > expectedEndTime.getTime();
    },

    // Assign Escort (Security Only)
    assignEscort: async (walkId: string, escortName: string) => {
        try {
            const walkRef = doc(db, COLLECTION_NAME, walkId);
            await updateDoc(walkRef, {
                assignedEscort: escortName,
                updatedAt: serverTimestamp(),
                timeline: arrayUnion({
                    timestamp: new Date().toISOString(),
                    details: `Escort ${escortName} assigned by security`,
                    type: 'system'
                })
            });
        } catch (error) {
            console.error("Error assigning escort:", error);
            throw error;
        }
    },

    // Send Message to Student (Security Only)
    sendMessageToStudent: async (walkId: string, message: string, senderName: string) => {
        try {
            const walkRef = doc(db, COLLECTION_NAME, walkId);
            await updateDoc(walkRef, {
                updatedAt: serverTimestamp(),
                timeline: arrayUnion({
                    timestamp: new Date().toISOString(),
                    details: `Message from ${senderName}: ${message}`,
                    type: 'message'
                })
            });
        } catch (error) {
            console.error("Error sending message:", error);
            throw error;
        }
    }
};
