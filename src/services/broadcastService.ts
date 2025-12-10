import { db } from '../lib/firebase';
import {
    collection,
    addDoc,
    query,
    where,
    onSnapshot,
    serverTimestamp
} from 'firebase/firestore';

export interface Broadcast {
    id: string;
    title: string;
    message: string;
    priority: 'info' | 'warning' | 'urgent';
    hostelId: string;
    createdBy: string;
    createdAt: any;
}

export const broadcastService = {
    // 1. Send Broadcast (Warden)
    sendBroadcast: async (data: Omit<Broadcast, 'id' | 'createdAt'>) => {
        try {
            await addDoc(collection(db, 'broadcasts'), {
                ...data,
                createdAt: serverTimestamp()
            });
        } catch (error) {
            console.error("Error sending broadcast:", error);
            throw error;
        }
    },

    // 2. Subscribe to Broadcasts (Student/Warden)
    subscribeToBroadcasts: (hostelId: string, callback: (broadcasts: Broadcast[]) => void) => {
        const q = query(
            collection(db, 'broadcasts'),
            where('hostelId', 'in', [hostelId, 'all'])
            // orderBy('createdAt', 'desc'), // Removed to avoid index requirement
            // limit(20)
        );

        return onSnapshot(q, (snapshot) => {
            const broadcasts = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as Broadcast[];

            // Sort client-side
            broadcasts.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));

            callback(broadcasts);
        });
    }
};
