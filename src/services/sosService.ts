import { db, rtdb } from '../lib/firebase'; // Added rtdb here
import { adminService } from './adminService';
import SOSPlugin from './nativeSOS';
import { Capacitor } from '@capacitor/core';
import {
    collection,
    updateDoc,
    doc,
    onSnapshot,
    query,
    where,
    getDoc,
    getDocs,
    setDoc,
    serverTimestamp,
    runTransaction,
    arrayUnion
} from 'firebase/firestore';
import { ref, set, serverTimestamp as rtdbTimestamp } from 'firebase/database';
import { v4 as uuidv4 } from 'uuid';

export interface SOSEvent {
    id: string;
    // Student information
    userId: string;
    userName: string;
    studentId: string;
    studentName: string;
    studentRealName?: string | null;
    studentUsername?: string | null;
    studentIdNumber?: string | null;
    studentEnrollmentNumber?: string | null;
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
        triggerMethod: 'manual_gesture' | 'shake' | 'voice' | 'button' = 'manual_gesture'
    ) => {
        try {
            // Check if user already has an active (unresolved) SOS
            const activeQuery = query(
                collection(db, 'sos_events'),
                where('userId', '==', user.uid),
                where('status.resolved', '==', false)
            );
            const activeSnapshot = await getDocs(activeQuery);
            if (!activeSnapshot.empty) {
                const activeId = activeSnapshot.docs[0].id;
                const savedToken = localStorage.getItem(`sos_token_${activeId}`);
                if (savedToken && Capacitor.isNativePlatform()) {
                    const idToken = await user.getIdToken();
                    await SOSPlugin.startSOSService({
                        sosId: activeId,
                        sosToken: savedToken,
                        idToken,
                        userId: user.uid
                    });
                }
                throw new Error("You already have an active SOS.");
            }

            // Fetch User Profile for Hostel/Room details
            let studentProfile: any = {};
            try {
                const userDoc = await getDoc(doc(db, 'users', user.uid));
                if (userDoc.exists()) {
                    studentProfile = userDoc.data();
                }
            } catch (err) {
                console.error("Error fetching student profile for SOS:", err);
            }

            // Create SOS ID and Token
            const sosId = uuidv4();
            const sosToken = uuidv4() + "-" + Date.now();

            // Anonymity: Use username for studentName/userName if student
            const studentDisplayName = studentProfile.role === 'student' ? (studentProfile.username || 'Anonymous') : (studentProfile.name || user.displayName || 'Unknown');

            // 1. Create SOS Event record
            const sosData = {
                id: sosId,
                userId: user.uid,
                userName: studentDisplayName,
                studentId: user.uid,
                studentName: studentDisplayName,
                studentRealName: studentProfile.name || null,
                studentUsername: studentProfile.username || null,
                studentIdNumber: studentProfile.idNumber || null,
                studentEnrollmentNumber: studentProfile.enrollmentNumber || null,
                userPhone: studentProfile.phoneNumber || studentProfile.phone || user.phoneNumber || '',
                role: 'student',
                hostelId: studentProfile.hostelId || studentProfile.hostel || null,
                hostel: studentProfile.hostelId || studentProfile.hostel || 'Unknown',
                roomNumber: studentProfile.roomNo || studentProfile.roomNumber || 'N/A',
                roomNo: studentProfile.roomNo || studentProfile.roomNumber || 'N/A',
                status: {
                    recognised: false,
                    resolved: false
                },
                recognisedBy: null,
                assignedTo: null,
                triggeredAt: Date.now(),
                createdAt: serverTimestamp(),
                resolvedAt: null,
                location: location,
                liveLocation: location,
                timeline: [{
                    time: Date.now(),
                    action: "SOS Triggered",
                    by: user.uid,
                    note: `Emergency: ${emergencyType} (${triggerMethod})`
                }],
                emergencyType: emergencyType || "other",
                triggerMethod: triggerMethod || "button",
                isDetailsAdded: true,
                sosToken: sosToken // Store token for recovery/unauthenticated cancel
            };

            await setDoc(doc(db, 'sos_events', sosId), sosData);

            // Audit Log
            await adminService.logAction(
                'SOS Triggered',
                sosId,
                `Triggered by ${studentDisplayName} from ${studentProfile.hostel || 'Unknown'}`,
                studentProfile
            );

            // 2. Create Session record for recovery
            await setDoc(doc(db, 'sos_sessions', sosId), {
                sosId,
                userId: user.uid,
                token: sosToken,
                createdAt: serverTimestamp(),
                isActive: true
            });

            // 3. Initial RTDB update for live map
            await set(ref(rtdb, `live_locations/${user.uid}`), {
                latitude: location.lat,
                longitude: location.lng,
                lastUpdated: rtdbTimestamp(),
                sosId: sosId
            });

            // Store token locally for recovery/logout resilience
            localStorage.setItem('active_sos_id', sosId);
            localStorage.setItem(`sos_token_${sosId}`, sosToken);

            // Start Native Service if on Android/iOS
            if (Capacitor.isNativePlatform()) {
                try {
                    // Pass the ID token and user ID for RTDB rest calls
                    const idToken = await user.getIdToken();
                    await SOSPlugin.startSOSService({
                        sosId,
                        sosToken,
                        idToken,
                        userId: user.uid
                    });
                } catch (nativeErr) {
                    console.error("Failed to start native SOS service:", nativeErr);
                }
            }

            return { sosId };
        } catch (error) {
            console.error("Error triggering SOS:", error);
            throw error;
        }
    },

    // 1.5 Update SOS Details (Post-Trigger)
    // 1.5 Update SOS Details (Post-Trigger)
    updateSOSDetails: async (sosId: string, details: { emergencyType: string; description?: string; voiceTranscript?: string }) => {
        const sosRef = doc(db, 'sos_events', sosId);

        await updateDoc(sosRef, {
            ...details,
            isDetailsAdded: true,
            timeline: arrayUnion({
                time: Date.now(),
                action: 'Details Added',
                by: 'student',
                note: `Type: ${details.emergencyType}`
            })
        });
    },

    // 2. Subscribe to Active SOS Events (Real-time)
    subscribeToActiveSOS: (callback: (events: SOSEvent[]) => void, hostelId?: string) => {
        let q;
        if (hostelId) {
            q = query(
                collection(db, 'sos_events'),
                where('status.resolved', '==', false),
                where('hostelId', '==', hostelId)
            );
        } else {
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
                    timeline: data.timeline || []
                };
            }) as SOSEvent[];

            events.sort((a, b) => b.triggeredAt - a.triggeredAt);
            callback(events);
        }, (error) => {
            console.error("sosService: [DEBUG] SOS Subscription Error:", error);
        });
    },

    // 3. Recognise SOS (Security Only)
    recogniseSOS: async (sosId: string, securityId: string, securityName: string, actorProfile?: any) => {
        const sosRef = doc(db, 'sos_events', sosId);

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

        // Audit Log
        await adminService.logAction('SOS Recognised', sosId, `Recognised by ${securityName} (${securityId})`, actorProfile);
    },

    // 3.5 Assign Guard
    assignGuard: async (sosId: string, guard: { id: string; name: string; role: string }) => {
        await sosService.recogniseSOS(sosId, guard.id, guard.name);
    },

    // 4. Resolve SOS (Security Only)
    // 4. Resolve SOS (Security Only)
    resolveSOS: async (sosId: string, summary: string, actorProfile?: any) => {
        try {
            const sosRef = doc(db, 'sos_events', sosId);
            const sessionRef = doc(db, 'sos_sessions', sosId);

            await runTransaction(db, async (transaction) => {
                transaction.update(sosRef, {
                    "status.resolved": true,
                    resolvedAt: serverTimestamp(),
                    resolutionSummary: summary || "Resolved",
                    timeline: arrayUnion({
                        time: Date.now(),
                        action: "Resolved",
                        by: 'Security',
                        note: summary || "Emergency Resolved"
                    })
                });
                transaction.update(sessionRef, {
                    isActive: false
                });
            });

            // Audit Log
            await adminService.logAction('SOS Resolved', sosId, `Resolved with summary: ${summary}`, actorProfile);

            // Stop Native Service
            if (Capacitor.isNativePlatform()) {
                try {
                    await SOSPlugin.stopSOSService();
                } catch (nativeErr) {
                    console.error("Failed to stop native SOS service:", nativeErr);
                }
            }

            localStorage.removeItem('active_sos_id');
            localStorage.removeItem(`sos_token_${sosId}`);

            return { success: true };
        } catch (error) {
            console.error("Error resolving SOS:", error);
            throw error;
        }
    },

    // 4.5 Cancel SOS (Student)
    cancelSOS: async (sosId: string) => {
        console.log("sosService: Attempting to cancel SOS:", sosId);
        try {
            const savedToken = localStorage.getItem(`sos_token_${sosId}`);
            const sosRef = doc(db, 'sos_events', sosId);

            // We use direct Firestore update here. 
            // If the user is logged in, the auth rules will pass.
            // If logged out, the token-based rule will pass.
            await updateDoc(sosRef, {
                "status.resolved": true,
                resolvedAt: serverTimestamp(),
                resolutionSummary: 'Cancelled by student',
                sosToken: savedToken, // Passing token to satisfy rules if unauthenticated
                timeline: arrayUnion({
                    time: Date.now(),
                    action: "Cancelled",
                    by: 'Student',
                    note: "SOS stopped via Client"
                })
            });

            // Also try to update session if possible (requires auth)
            try {
                const sessionRef = doc(db, 'sos_sessions', sosId);
                await updateDoc(sessionRef, { isActive: false });
            } catch (e) {
                console.warn("Could not update session record (might be unauthenticated)");
            }

            if (Capacitor.isNativePlatform()) {
                await SOSPlugin.stopSOSService();
            }

            localStorage.removeItem('active_sos_id');
            localStorage.removeItem(`sos_token_${sosId}`);

            return { success: true };
        } catch (error) {
            console.error("Error cancelling SOS:", error);
            throw error;
        }
    },

    acknowledgeSOS: async (sosId: string, userId: string) => {
        const sosRef = doc(db, 'sos_events', sosId);

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

            events.sort((a, b) => (b.resolvedAt || 0) - (a.resolvedAt || 0));
            callback(events);
        });
    }
};
