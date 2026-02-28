/**
 * presenceService.ts
 *
 * Tracks user online/offline status using Firebase Realtime Database.
 * RTDB is the correct tool for presence because:
 *  - It has built-in onDisconnect() that fires even if the browser crashes
 *  - No extra Firestore read/write cost per status change
 *  - ~1ms latency vs Firestore's ~100ms
 *
 * Previously this was done via chatService.updateUserPresence() which wrote
 * to Firestore — that never handled crashes/kills correctly.
 */
import { ref, set, onDisconnect, onValue, off } from 'firebase/database';
import { rtdb } from '../lib/firebase';

export interface UserPresence {
    online: boolean;
    lastSeen: number | null;
}

export const presenceService = {
    /**
     * Start tracking this user's presence.
     * Call once on login / app start.
     * RTDB's onDisconnect ensures "offline" is set even if app crashes or
     * the phone loses connection without a clean logout.
     */
    startTracking: (userId: string) => {
        const presenceRef = ref(rtdb, `presence/${userId}`);
        const connectedRef = ref(rtdb, '.info/connected');

        onValue(connectedRef, (snap) => {
            if (!snap.val()) return; // Not connected yet

            // When we connect, mark as online
            set(presenceRef, {
                online: true,
                lastSeen: Date.now(),
            });

            // When we disconnect (even on crash), RTDB server sets this automatically
            onDisconnect(presenceRef).set({
                online: false,
                lastSeen: Date.now(),
            });
        });

        // Return cleanup function
        return () => {
            off(connectedRef);
            // Mark offline immediately on intentional logout
            set(presenceRef, {
                online: false,
                lastSeen: Date.now(),
            });
        };
    },

    /**
     * Subscribe to a single user's presence.
     * Use this in chat to show online/offline indicators.
     */
    subscribeToPresence: (
        userId: string,
        callback: (presence: UserPresence) => void
    ) => {
        const presenceRef = ref(rtdb, `presence/${userId}`);

        onValue(presenceRef, (snap) => {
            if (snap.exists()) {
                callback(snap.val() as UserPresence);
            } else {
                callback({ online: false, lastSeen: null });
            }
        });

        return () => off(presenceRef);
    },

    /**
     * Manually mark a user as offline (call on intentional logout).
     */
    setOffline: (userId: string) => {
        const presenceRef = ref(rtdb, `presence/${userId}`);
        return set(presenceRef, {
            online: false,
            lastSeen: Date.now(),
        });
    },
};
