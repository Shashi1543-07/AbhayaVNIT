import { db } from '../lib/firebase';
import {
    collection,
    addDoc,
    updateDoc,
    doc,
    query,
    where,
    onSnapshot,
    serverTimestamp,
    arrayUnion,
    getDoc
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
            console.log('IncidentService: Creating incident for user:', data.userId || data.reportedBy);
            await addDoc(collection(db, 'incidents'), {
                ...data,
                status: 'open',
                createdAt: serverTimestamp(),
                timeline: [{
                    time: Date.now(),
                    action: 'Incident Reported',
                    by: data.reportedBy || 'Student',
                    note: 'Initial report submitted.'
                }]
            });
        } catch (error) {
            console.error("Error creating incident:", error);
            throw error;
        }
    },

    // 2. Subscribe to Incidents (Warden)
    subscribeToIncidents: (hostelId: string, callback: (incidents: Incident[]) => void) => {
        // Fetch all incidents for now to handle potential field naming or case mismatches
        const q = query(collection(db, 'incidents'));

        return onSnapshot(q, (snapshot) => {
            const incidents = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as Incident[];

            // Filter client-side for robust matching
            const filtered = incidents.filter(i => {
                const item = i as any;
                return (item.hostelId?.toLowerCase() === hostelId.toLowerCase()) ||
                    (item.hostel?.toLowerCase() === hostelId.toLowerCase());
            });


            // Sort client-side
            filtered.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));

            callback(filtered);
        });
    },


    // 2.5 Subscribe to User Incidents (Student) - Ultra-Robust (No Index Required)
    subscribeToUserIncidents: (userId: string, callback: (incidents: Incident[]) => void) => {
        if (!userId) return () => { };

        console.log('IncidentService: Running parallel queries for userId:', userId);

        let reportsMap = new Map<string, Incident>();

        const handleSnapshot = (snapshot: any) => {
            snapshot.docs.forEach((doc: any) => {
                reportsMap.set(doc.id, { id: doc.id, ...doc.data() } as Incident);
            });

            const merged = Array.from(reportsMap.values());
            // Sort merged results
            merged.sort((a, b) => {
                const timeA = a.createdAt?.seconds || (typeof a.createdAt === 'number' ? a.createdAt / 1000 : 0);
                const timeB = b.createdAt?.seconds || (typeof b.createdAt === 'number' ? b.createdAt / 1000 : 0);
                return timeB - timeA;
            });

            console.log('IncidentService: Cumulative results:', merged.length);
            callback(merged);
        };

        // Query 1: Primary Ownership
        const q1 = query(collection(db, 'incidents'), where('userId', '==', userId));
        const unsub1 = onSnapshot(q1, handleSnapshot, (err) => console.error('Query 1 Failed:', err));

        // Query 2: Legacy/Anonymous Ownership
        const q2 = query(collection(db, 'incidents'), where('reportedBy', '==', userId));
        const unsub2 = onSnapshot(q2, handleSnapshot, (err) => console.error('Query 2 Failed:', err));

        return () => {
            unsub1();
            unsub2();
        };
    },

    // 3. Update Status (Warden)
    updateIncidentStatus: async (id: string, status: Incident['status'], userId: string, note?: string) => {
        const incidentRef = doc(db, 'incidents', id);

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

        await updateDoc(incidentRef, {
            timeline: arrayUnion({
                time: Date.now(),
                action: 'Comment Added',
                by: userId,
                note: comment
            })
        });
    },

    // 5. Get Incident By ID
    getIncidentById: async (id: string): Promise<Incident | null> => {
        const docRef = doc(db, 'incidents', id);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            return { id: docSnap.id, ...docSnap.data() } as Incident;
        } else {
            return null;
        }
    }
};
