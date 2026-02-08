import { db } from '../lib/firebase';
import { adminService } from './adminService';
import { compressImageToBase64 } from '../lib/imageUtils';
import {
    collection,
    doc,
    getDoc,
    setDoc,
    updateDoc,
    deleteDoc,
    query,
    where,
    onSnapshot,
    serverTimestamp,
    arrayUnion,
    orderBy
} from 'firebase/firestore';

export interface Incident {
    id: string;
    userId: string;
    reportedBy: string;
    reporterName?: string;
    category: string;
    description: string;
    location: {
        latitude: number;
        longitude: number;
        address?: string;
    };
    status: 'open' | 'in_review' | 'resolved';
    createdAt: any;
    updatedAt?: any;
    photoURL?: string;
    imageData?: string; // Base64 encoded image data
    hostelId?: string;
    isAnonymous?: boolean;
    // Student identification fields (for audit/warden review)
    studentUsername?: string;
    studentRealName?: string;
    studentIdNumber?: string;
    studentEnrollmentNumber?: string;
    studentPhone?: string;
    studentHostel?: string;
    studentRoom?: string;
    timeline: {
        time: number;
        action: string;
        by: string;
        note: string;
    }[];
}

export const incidentService = {
    // 1. Create Incident
    createIncident: async (data: Omit<Incident, 'id' | 'createdAt' | 'timeline' | 'status'> & { imageFile?: File }) => {
        try {
            const { imageFile, ...incidentFields } = data;
            console.log('IncidentService: Creating incident for user:', incidentFields.userId);

            let imageData: string | undefined;
            if (imageFile) {
                try {
                    imageData = await compressImageToBase64(imageFile);
                } catch (imgError) {
                    console.error('Image compression failed:', imgError);
                    // Continue without image or throw error? 
                    // Let's throw to match postService behavior
                    throw new Error('Failed to process image. Please try a different image.');
                }
            }

            const newIncidentRef = doc(collection(db, 'incidents'));
            const incidentId = newIncidentRef.id;

            const incidentData = {
                ...incidentFields,
                imageData: imageData || null,
                status: 'open' as const,
                createdAt: serverTimestamp(),
                timeline: [{
                    time: Date.now(),
                    action: 'Report Submitted',
                    by: data.reporterName || 'Student',
                    note: 'Initial report submitted.'
                }]
            };

            await setDoc(newIncidentRef, incidentData);

            // Add Audit Log
            await adminService.logAction(
                'Report Submitted',
                incidentData.userId || 'unknown',
                `Category: ${incidentData.category} | Description: ${incidentData.description.substring(0, 50)}...`,
                incidentFields // For students, the fields passed include identification if non-anonymous
            );

            return incidentId;
        } catch (error) {
            console.error("Error creating incident:", error);
            throw error;
        }
    },

    // 2. Subscribe to User's Incidents
    subscribeToUserIncidents: (userId: string, callback: (incidents: Incident[]) => void) => {
        if (!userId) {
            console.warn("IncidentService: subscribeToUserIncidents called without userId");
            callback([]);
            return () => { };
        }

        const q = query(
            collection(db, 'incidents'),
            where('userId', '==', userId),
            orderBy('createdAt', 'desc')
        );

        return onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            } as Incident));
            callback(data);
        }, (error) => {
            console.error("IncidentService: Error in subscribeToUserIncidents (Checking permission/index):", error);
        });
    },

    // 3. Subscribe to All Incidents (for Warden/Admin)
    subscribeToIncidents: (hostelId: string | null, callback: (incidents: Incident[]) => void) => {
        let q = query(collection(db, 'incidents'));

        if (hostelId && hostelId !== 'Unknown' && hostelId !== 'all') {
            q = query(
                collection(db, 'incidents'),
                where('hostelId', '==', hostelId),
                orderBy('createdAt', 'desc')
            );
        } else {
            q = query(
                collection(db, 'incidents'),
                orderBy('createdAt', 'desc')
            );
        }

        return onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as Incident[];
            callback(data);
        }, (error) => {
            console.error("IncidentService: Error in subscribeToIncidents. Check for index requirements.", error);
        });
    },

    // 4. Update Status
    updateIncidentStatus: async (id: string, status: Incident['status'], userId: string, note?: string, actorProfile?: any) => {
        const incidentRef = doc(db, 'incidents', id);
        try {
            await updateDoc(incidentRef, {
                status,
                updatedAt: serverTimestamp(),
                timeline: arrayUnion({
                    time: Date.now(),
                    action: `Status updated to ${status}`,
                    by: userId,
                    note: note || ''
                })
            });

            if (status === 'resolved') {
                await adminService.logAction('Resolve Incident', id, `Details: ${note || 'No details provided'}`, actorProfile);
            }
        } catch (error) {
            console.error("IncidentService: Error updating incident status:", error);
            throw error;
        }
    },

    // 5. Delete Incident (Manual)
    deleteIncident: async (id: string, requesterUserId: string, requesterRole: string = 'student') => {
        const incidentRef = doc(db, 'incidents', id);
        try {
            const snap = await getDoc(incidentRef);
            if (!snap.exists()) throw new Error("Incident not found");
            const data = snap.data() as Incident;

            // Permission check: Owner or Admin/Warden/Security
            const isOwner = data.userId === requesterUserId;
            const isPrivileged = ['admin', 'warden', 'security'].includes(requesterRole.toLowerCase());

            if (!isOwner && !isPrivileged) {
                throw new Error("Unauthorized: You do not have permission to delete this report.");
            }

            // Consistency check: Only resolved incidents can be deleted manually from dashboard
            if (data.status !== 'resolved') {
                throw new Error("Report must be resolved before it can be removed from history.");
            }

            await deleteDoc(incidentRef);
            await adminService.logAction(
                'Report Deleted',
                requesterUserId,
                `${requesterRole} deleted resolved report: ${id}`,
                null // Profile will be fetched from current user if available, or we can pass it
            );
        } catch (error) {
            console.error("IncidentService: Error deleting incident:", error);
            throw error;
        }
    },

    // 6. Get Incident by ID
    getIncidentById: async (id: string) => {
        const docRef = doc(db, 'incidents', id);
        try {
            const snap = await getDoc(docRef);
            if (snap.exists()) {
                return { id: snap.id, ...snap.data() } as Incident;
            }
            return null;
        } catch (error) {
            console.error("IncidentService: Error getting incident:", error);
            return null;
        }
    },

    // Alias for getIncident
    getIncident: async (id: string) => {
        return incidentService.getIncidentById(id);
    },

    // 8. Add Comment
    addComment: async (id: string, userName: string, comment: string) => {
        const incidentRef = doc(db, 'incidents', id);
        try {
            await updateDoc(incidentRef, {
                timeline: arrayUnion({
                    time: Date.now(),
                    action: 'Update Logged',
                    by: userName,
                    note: comment
                })
            });
        } catch (error) {
            console.error("IncidentService: Error adding comment:", error);
            throw error;
        }
    }
};
