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
    status: 'active' | 'paused' | 'delayed' | 'completed' | 'danger' | 'off-route';
    createdAt: Timestamp;
    updatedAt: Timestamp;
    escortRequested?: boolean;
    assignedEscort?: string;
    timeline?: { timestamp: any; details: string; type: string }[];
    userHostel?: string;
    message?: string; // Student note
}

const COLLECTION_NAME = "safe_walk";


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

            // Initialize location in RTDB (live_locations)
            // We use userId as the key for live tracking now
            const locationRef = ref(rtdb, `live_locations/${data.userId}`);
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

    // Update Walk Status (active | paused | delayed | completed | danger | off-route)
    updateWalkStatus: async (walkId: string, status: SafeWalkSession['status'], note?: string) => {
        try {
            const walkRef = doc(db, COLLECTION_NAME, walkId);
            const updateData: any = {
                status,
                updatedAt: serverTimestamp()
            };

            if (note) {
                updateData.timeline = arrayUnion({
                    timestamp: new Date().toISOString(),
                    details: note,
                    type: 'system'
                });
            }

            await updateDoc(walkRef, updateData);
        } catch (error) {
            console.error("Error updating walk status:", error);
            throw error;
        }
    },

    // Update Real-time Location to RTDB
    updateLocation: async (userId: string, location: SafeWalkLocation) => {
        try {
            const locationRef = ref(rtdb, `live_locations/${userId}`);
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

    // Subscribe to a specific walk's location (DEPRECATED - Use mapService)
    // Kept for backward compat if any, but pointing to live_locations
    subscribeToWalkLocation: (userId: string, callback: (location: SafeWalkLocation) => void) => {
        const locationRef = ref(rtdb, `live_locations/${userId}`);
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
    },

    // Check if user is off-route
    checkOffRoute: (
        currentLat: number,
        currentLng: number,
        destLat: number,
        destLng: number,
        previousDistance?: number
    ) => {
        // Simple Haversine for distance
        const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
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
        };

        const currentDistance = calculateDistance(currentLat, currentLng, destLat, destLng);

        // If distance increased by more than 10 meters compared to previous known distance, 
        // and we are still more than 20m away from destination
        const isOffRoute = previousDistance ? (currentDistance > previousDistance + 10 && currentDistance > 20) : false;

        return {
            currentDistance,
            isOffRoute
        };
    },

    // Request Escort (Student Only)
    requestEscort: async (walkId: string) => {
        try {
            const walkRef = doc(db, COLLECTION_NAME, walkId);
            await updateDoc(walkRef, {
                escortRequested: true,
                updatedAt: serverTimestamp(),
                timeline: arrayUnion({
                    timestamp: new Date().toISOString(),
                    details: "Student requested a security escort",
                    type: 'request'
                })
            });
        } catch (error) {
            console.error("Error requesting escort:", error);
            throw error;
        }
    }
};
