import { db } from '../lib/firebase';
import {
    collection,
    addDoc,
    query,
    onSnapshot,
    serverTimestamp
} from 'firebase/firestore';

export interface Broadcast {
    id: string;
    title: string;
    message: string;
    priority: 'info' | 'warning' | 'emergency';
    hostelId?: string; // Optinal for campus-wide
    targetGroup?: 'student' | 'warden' | 'security' | 'all';
    senderRole: 'admin' | 'warden' | 'security';
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

    // 2. Subscribe to Broadcasts (All roles)
    // We subscribe to all and filter client-side to avoid complex index requirements for mixed queries
    subscribeToAllBroadcasts: (callback: (broadcasts: Broadcast[]) => void) => {
        const q = query(
            collection(db, 'broadcasts')
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
