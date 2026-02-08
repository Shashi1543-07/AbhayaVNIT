import {
    collection,
    doc,
    getDoc,
    setDoc,
    updateDoc,
    query,
    where,
    onSnapshot,
    serverTimestamp,
    limit,
    orderBy
} from "firebase/firestore";
import {
    ref,
    update,
    onValue,
    off
} from "firebase/database";
import { db, rtdb } from "../lib/firebase";
import { sosService } from "./sosService";
import { adminService } from './adminService';

export interface SafeWalkLocation {
    latitude: number;
    longitude: number;
}

export interface SafeWalkSession {
    id: string;
    userId: string;
    userName: string;
    phone?: string;
    hostelId?: string;
    userHostel?: string;
    studentRealName?: string | null;
    studentIdNumber?: string | null;
    studentEnrollmentNumber?: string | null;
    studentUsername?: string | null;
    roomNo?: string;
    message?: string;
    source?: SafeWalkLocation;
    destination: {
        lat: number;
        lng: number;
        name: string;
    };
    startLocation?: {
        lat: number;
        lng: number;
        name: string;
    };
    status: 'active' | 'completed' | 'sos' | 'cancelled' | 'escort_requested' | 'danger' | 'delayed' | 'paused' | 'off-route';
    startTime: any;
    updatedAt: any;
    currentLocation?: SafeWalkLocation;
    expectedDuration: number;
    note?: string | null;
    escortRequested?: boolean;
    assignedEscort?: string;
    timeline?: {
        type: 'status' | 'message';
        details: string;
        timestamp: number | { seconds: number; toDate?: () => Date };
    }[];
}

export interface SafeWalkRequest {
    userId: string;
    userName: string;
    phone: string;
    hostelId?: string;
    studentRealName?: string | null;
    studentIdNumber?: string | null;
    studentEnrollmentNumber?: string | null;
    studentUsername?: string | null;
    roomNo?: string;
    startLocation: {
        lat: number;
        lng: number;
        name: string;
    };
    destination: {
        lat: number;
        lng: number;
        name: string;
    };
    expectedDuration: number;
    note: string | null;
}

const COLLECTION_NAME = 'safe_walk';

export const safeWalkService = {
    // Start a new Safe Walk
    startSafeWalk: async (data: SafeWalkRequest) => {
        try {
            const walkRef = doc(collection(db, COLLECTION_NAME));
            const walkId = walkRef.id;

            const sessionData = {
                id: walkId,
                ...data,
                startTime: serverTimestamp(),
                createdAt: serverTimestamp(),
                status: 'active'
            };

            // Ensure the data has the correct anonymity applied if it's a student request
            // (The UI should handle this, but as a safeguard we can check here if we had profile access)

            await setDoc(walkRef, sessionData);

            // Initialize location in RTDB (live_locations)
            const locationRef = ref(rtdb, `live_locations/${data.userId}`);
            await update(locationRef, {
                latitude: data.startLocation.lat,
                longitude: data.startLocation.lng,
                userId: data.userId,
                userName: data.userName,
                type: 'safewalk',
                lastUpdated: Date.now()
            });

            // Audit Log
            await adminService.logAction('SafeWalk Started', data.userId, `Safe Walk initiated to ${data.destination.name}`, data);

            return walkId;
        } catch (error) {
            console.error("Error starting Safe Walk:", error);
            throw error;
        }
    },

    // Update Status
    updateWalkStatus: async (walkId: string, status: SafeWalkSession['status'], note?: string, actorProfile?: any) => {
        try {
            const walkRef = doc(db, COLLECTION_NAME, walkId);
            const updateData: any = {
                status,
                updatedAt: serverTimestamp()
            };

            await updateDoc(walkRef, updateData);

            // Audit Log if completed
            if (status === 'completed') {
                const snap = await getDoc(walkRef);
                const userId = snap.data()?.userId || 'unknown';
                await adminService.logAction('SafeWalk Completed', userId, `Safe Walk reached destination safely. Note: ${note || 'No note'}`, actorProfile);
            }
        } catch (error) {
            console.error("Error updating walk status:", error);
            throw error;
        }
    },

    // Update Location (Signature fixed for UI)
    updateLocation: async (userId: string, location: { latitude: number; longitude: number; speed?: number | null; lastUpdated?: number }) => {
        try {
            const locationRef = ref(rtdb, `live_locations/${userId}`);
            await update(locationRef, {
                ...location,
                lastUpdated: location.lastUpdated || Date.now()
            });
        } catch (error) {
            console.error("Error updating location:", error);
        }
    },

    // Subscribe to active walks (for Security/Admin)
    subscribeToActiveWalks: (callback: (walks: SafeWalkSession[]) => void) => {
        const q = query(
            collection(db, COLLECTION_NAME),
            where('status', 'in', ['active', 'escort_requested', 'paused', 'delayed', 'off-route'])
        );

        return onSnapshot(q, (snapshot) => {
            const walks = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as SafeWalkSession[];
            callback(walks);
        });
    },

    // Subscribe to User's Active Walk (REFACTORED for Live Refresh)
    subscribeToUserActiveWalk: (userId: string, callback: (session: SafeWalkSession | null) => void) => {
        // We fetch the most recent walk for this user, regardless of status.
        // This ensures the subscription persists through status transitions (e.g. to 'completed').
        const q = query(
            collection(db, COLLECTION_NAME),
            where('userId', '==', userId),
            orderBy('startTime', 'desc'),
            limit(1)
        );

        return onSnapshot(q, (snapshot) => {
            if (snapshot.empty) {
                callback(null);
            } else {
                const data = snapshot.docs[0].data() as SafeWalkSession;
                const id = snapshot.docs[0].id;

                // Return null if the latest session is in a terminal state
                const { id: _unusedId, ...rest } = data;
                const terminalStatuses = ['completed', 'cancelled', 'sos'];
                if (terminalStatuses.includes(data.status)) {
                    callback(null);
                } else {
                    callback({ id, ...rest } as SafeWalkSession);
                }
            }
        }, (error) => {
            console.error("SafeWalkService: Error subscribing to active walk:", error);
        });
    },

    // Check if user is off route (RESTORED)
    checkOffRoute: (lat: number, lng: number, destLat: number, destLng: number, prevDistance?: number) => {
        const R = 6371e3; // metres
        const φ1 = lat * Math.PI / 180;
        const φ2 = destLat * Math.PI / 180;
        const Δφ = (destLat - lat) * Math.PI / 180;
        const Δλ = (destLng - lng) * Math.PI / 180;

        const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const currentDistance = R * c;

        // If distance increased from previous check by more than 20m, consider potentially off-route
        const isOffRoute = prevDistance !== undefined && currentDistance > prevDistance + 20;

        return { currentDistance, isOffRoute };
    },

    // Convert Safe Walk to SOS (Signature fixed for Student UI)
    convertToSOS: async (walkId: string, userData: any, location: { lat: number; lng: number }) => {
        try {
            // 1. Update walk status to 'sos' (end the SafeWalk)
            await safeWalkService.updateWalkStatus(walkId, 'sos');

            // 2. Try to trigger SOS (may fail if already has active SOS)
            try {
                await sosService.triggerSOS(userData, location, 'general', 'button');
                console.log("SafeWalk converted to SOS for user:", userData.uid || userData.id);
            } catch (sosError: any) {
                // If user already has active SOS, that's okay - SafeWalk is still ended
                if (sosError?.message?.includes('already have an active SOS')) {
                    console.log("User already has active SOS, SafeWalk ended.");
                } else {
                    throw sosError; // Re-throw other errors
                }
            }
        } catch (error) {
            console.error("Error converting to SOS:", error);
            throw error;
        }
    },

    // Request Escort
    requestEscort: async (walkId: string) => {
        try {
            const walkRef = doc(db, COLLECTION_NAME, walkId);
            await updateDoc(walkRef, {
                status: 'escort_requested',
                escortRequested: true,
                updatedAt: serverTimestamp()
            });
        } catch (error) {
            console.error("Error requesting escort:", error);
        }
    },

    // Assign Escort (for security personnel)
    assignEscort: async (walkId: string, escortName: string) => {
        try {
            const walkRef = doc(db, COLLECTION_NAME, walkId);
            await updateDoc(walkRef, {
                assignedEscort: escortName,
                status: 'active',
                updatedAt: serverTimestamp()
            });
            await adminService.logAction('Escort Assigned', walkId, `Escort ${escortName} assigned to SafeWalk`);
        } catch (error) {
            console.error("Error assigning escort:", error);
            throw error;
        }
    },

    // Send Message to Student (for security/warden communication)
    sendMessageToStudent: async (walkId: string, message: string, senderName: string) => {
        try {
            const walkRef = doc(db, COLLECTION_NAME, walkId);
            const walkSnap = await getDoc(walkRef);
            const currentTimeline = walkSnap.data()?.timeline || [];

            await updateDoc(walkRef, {
                timeline: [
                    ...currentTimeline,
                    {
                        type: 'message',
                        details: `${senderName}: ${message}`,
                        timestamp: Date.now()
                    }
                ],
                updatedAt: serverTimestamp()
            });
        } catch (error) {
            console.error("Error sending message:", error);
            throw error;
        }
    },

    // Subscribe to Walk Location (real-time location tracking via RTDB)
    subscribeToWalkLocation: (userId: string, callback: (location: any) => void) => {
        const locationRef = ref(rtdb, `live_locations/${userId}`);
        onValue(locationRef, (snapshot) => {
            if (snapshot.exists()) {
                callback(snapshot.val());
            } else {
                callback(null);
            }
        });

        // Return unsubscribe function
        return () => off(locationRef);
    }
};
