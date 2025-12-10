import { db } from '../lib/firebase';
import {
    collection,
    addDoc,
    query,
    orderBy,
    limit,
    onSnapshot,
    serverTimestamp
} from 'firebase/firestore';

export interface PatrolLog {
    id: string;
    zone: string;
    guardName: string;
    notes: string;
    timestamp: any;
}

export const patrolService = {
    addLog: async (logData: { zone: string; guardName: string; notes: string }) => {
        try {
            await addDoc(collection(db, 'patrol_logs'), {
                ...logData,
                timestamp: serverTimestamp()
            });
        } catch (error) {
            console.error("Error adding patrol log:", error);
            throw error;
        }
    },

    subscribeToLogs: (callback: (logs: PatrolLog[]) => void) => {
        const q = query(
            collection(db, 'patrol_logs'),
            orderBy('timestamp', 'desc'),
            limit(50)
        );

        return onSnapshot(q, (snapshot) => {
            const logs = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as PatrolLog[];
            callback(logs);
        });
    }
};
