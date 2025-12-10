import { db } from '../lib/firebase';
import {
    collection,
    addDoc,
    updateDoc,
    doc,
    query,
    where,
    onSnapshot,
    serverTimestamp
} from 'firebase/firestore';

export interface Incident {
    id: string;
    userId?: string | null; // Added for filtering by user
    isAnonymous?: boolean;
    category: string;
    description: string;
    location: { lat: number; lng: number } | string;
    status: 'open' | 'in_review' | 'in_progress' | 'resolved' | 'escalated';
    hostelId: string;
    reportedBy: string; // User ID or 'Anonymous'
    reporterName?: string;
    createdAt: any;
    timeline: {
        time: number;
        action: string;
        by: string;
        note?: string;
    }[];
    photos?: string[];
    photoURL?: string; // Added to match usage in ReportIncident.tsx
}

export const incidentService = {
    // 1. Create Incident (Student)
    createIncident: async (data: Omit<Incident, 'id' | 'createdAt' | 'timeline' | 'status'>) => {
        try {
            await addDoc(collection(db, 'incidents'), {
                ...data,
                status: 'open',
                createdAt: serverTimestamp(),
                timeline: [{
                    time: Date.now(),
                    action: 'Reported',
                    by: data.reportedBy,
                    note: 'Incident reported'
                }]
            });
        } catch (error) {
            console.error("Error creating incident:", error);
            throw error;
        }
    },

    // 2. Subscribe to Incidents (Warden)
    subscribeToIncidents: (hostelId: string, callback: (incidents: Incident[]) => void) => {
        const q = query(
            collection(db, 'incidents'),
            where('hostelId', '==', hostelId)
            // orderBy('createdAt', 'desc') // Removed to avoid index requirement
        );

        return onSnapshot(q, (snapshot) => {
            const incidents = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as Incident[];

            // Sort client-side
            incidents.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));

            callback(incidents);
        });
    },

    // 2.5 Subscribe to User Incidents (Student)
    subscribeToUserIncidents: (userId: string, callback: (incidents: Incident[]) => void) => {
        const q = query(
            collection(db, 'incidents'),
            where('userId', '==', userId)
        );

        return onSnapshot(q, (snapshot) => {
            const incidents = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as Incident[];

            // Sort client-side
            incidents.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));

            callback(incidents);
        });
    },

    // 3. Update Status (Warden)
    updateIncidentStatus: async (id: string, status: Incident['status'], userId: string, note?: string) => {
        const incidentRef = doc(db, 'incidents', id);
        const { arrayUnion } = await import('firebase/firestore');

        await updateDoc(incidentRef, {
            status,
            timeline: arrayUnion({
                time: Date.now(),
                action: `Status updated to ${status}`,
                by: userId,
                note: note || ''
            })
        });
    },

    // 4. Add Comment (Warden/Student)
    addComment: async (id: string, userId: string, comment: string) => {
        const incidentRef = doc(db, 'incidents', id);
        const { arrayUnion } = await import('firebase/firestore');

        await updateDoc(incidentRef, {
            timeline: arrayUnion({
                time: Date.now(),
                action: 'Comment Added',
                by: userId,
                note: comment
            })
        });
    }
};
