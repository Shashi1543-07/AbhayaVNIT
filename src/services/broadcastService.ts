import { db } from '../lib/firebase';
import {
    collection,
    addDoc,
    deleteDoc,
    doc,
    query,
    onSnapshot,
    serverTimestamp,
    Timestamp
} from 'firebase/firestore';

export interface Broadcast {
    id: string;
    title: string;
    message: string;
    priority: 'info' | 'warning' | 'emergency';
    hostelId?: string; // Optional for campus-wide
    targetGroup?: 'student' | 'warden' | 'security' | 'all';
    senderRole: 'admin' | 'warden' | 'security';
    createdBy: string;
    createdById: string; // User ID for delete permission
    createdAt: Timestamp;
    expiresAt: Timestamp; // When broadcast auto-expires
    durationHours: number; // Duration in hours (for display)
}

export interface CreateBroadcastData {
    title: string;
    message: string;
    priority: 'info' | 'warning' | 'emergency';
    targetGroup: 'student' | 'warden' | 'security' | 'all';
    senderRole: 'admin' | 'warden' | 'security';
    createdBy: string;
    createdById: string;
    durationHours: number; // 1, 6, 12, 24, 48, 72
    hostelId?: string;
}

export const broadcastService = {
    /**
     * Send a new broadcast with expiry
     */
    sendBroadcast: async (data: CreateBroadcastData) => {
        try {
            const now = new Date();
            const expiresAt = new Date(now.getTime() + data.durationHours * 60 * 60 * 1000);

            await addDoc(collection(db, 'broadcasts'), {
                title: data.title,
                message: data.message,
                priority: data.priority,
                targetGroup: data.targetGroup,
                senderRole: data.senderRole,
                createdBy: data.createdBy,
                createdById: data.createdById,
                hostelId: data.hostelId || null,
                durationHours: data.durationHours,
                createdAt: serverTimestamp(),
                expiresAt: Timestamp.fromDate(expiresAt)
            });
        } catch (error) {
            console.error("Error sending broadcast:", error);
            throw error;
        }
    },

    /**
     * Delete a broadcast (creator only - enforced by Firestore rules)
     */
    deleteBroadcast: async (broadcastId: string) => {
        try {
            await deleteDoc(doc(db, 'broadcasts', broadcastId));
        } catch (error) {
            console.error("Error deleting broadcast:", error);
            throw error;
        }
    },

    /**
     * Subscribe to active (non-expired) broadcasts
     * Filters out expired broadcasts client-side
     */
    subscribeToAllBroadcasts: (callback: (broadcasts: Broadcast[]) => void) => {
        const q = query(collection(db, 'broadcasts'));

        return onSnapshot(q, (snapshot) => {
            const now = new Date();
            const broadcasts = snapshot.docs
                .map(doc => ({
                    id: doc.id,
                    ...doc.data()
                } as Broadcast))
                .filter(broadcast => {
                    // Filter out expired broadcasts
                    if (!broadcast.expiresAt) return true; // Legacy broadcasts without expiry
                    const expiryDate = broadcast.expiresAt.toDate();
                    return expiryDate > now;
                })
                .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));

            callback(broadcasts);
        });
    },

    /**
     * Subscribe to ALL broadcasts including expired (for admin history view)
     */
    subscribeToAllBroadcastsWithExpired: (callback: (broadcasts: Broadcast[]) => void) => {
        const q = query(collection(db, 'broadcasts'));

        return onSnapshot(q, (snapshot) => {
            const broadcasts = snapshot.docs
                .map(doc => ({
                    id: doc.id,
                    ...doc.data()
                } as Broadcast))
                .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));

            callback(broadcasts);
        });
    },

    /**
     * Check if a broadcast is expired
     */
    isExpired: (broadcast: Broadcast): boolean => {
        if (!broadcast.expiresAt) return false;
        return broadcast.expiresAt.toDate() < new Date();
    },

    /**
     * Get time remaining for a broadcast
     */
    getTimeRemaining: (broadcast: Broadcast): string => {
        if (!broadcast.expiresAt) return 'No expiry';

        const now = new Date();
        const expiryDate = broadcast.expiresAt.toDate();
        const diffMs = expiryDate.getTime() - now.getTime();

        if (diffMs <= 0) return 'Expired';

        const hours = Math.floor(diffMs / (1000 * 60 * 60));
        const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

        if (hours > 24) {
            const days = Math.floor(hours / 24);
            return `${days}d ${hours % 24}h`;
        }
        if (hours > 0) {
            return `${hours}h ${minutes}m`;
        }
        return `${minutes}m`;
    }
};
