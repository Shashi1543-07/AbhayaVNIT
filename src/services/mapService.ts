import { rtdb } from '../lib/firebase';
import { ref, onValue, off } from 'firebase/database';

export interface LocationData {
    latitude: number;
    longitude: number;
    lastUpdated: number;
    heading?: number;
    speed?: number;
    accuracy?: number;
}

export type LocationStatus = 'active' | 'stale' | 'offline';

export const mapService = {
    /**
     * Subscribe to all live locations (For Security Global Map)
     * @param callback Function to receive the map of user IDs to location data
     * @returns Unsubscribe function
     */
    subscribeToGlobalLocations: (callback: (locations: Record<string, LocationData>) => void) => {
        const locationsRef = ref(rtdb, 'live_locations');

        const handleSnapshot = (snapshot: any) => {
            if (snapshot.exists()) {
                callback(snapshot.val());
            } else {
                callback({});
            }
        };

        onValue(locationsRef, handleSnapshot);

        return () => off(locationsRef, 'value', handleSnapshot);
    },

    /**
     * Subscribe to a single user's live location (For Detail Map)
     * @param userId The ID of the student to track
     * @param callback Function to receive the location data inside an object or null
     * @returns Unsubscribe function
     */
    subscribeToSingleLocation: (userId: string, callback: (location: LocationData | null) => void) => {
        if (!userId) return () => { };

        const locationRef = ref(rtdb, `live_locations/${userId}`);

        const handleSnapshot = (snapshot: any) => {
            if (snapshot.exists()) {
                callback(snapshot.val());
            } else {
                callback(null);
            }
        };

        onValue(locationRef, handleSnapshot);

        return () => off(locationRef, 'value', handleSnapshot);
    },

    /**
     * Determine the status of a location based on freshness
     * @param lastUpdated Timestamp in milliseconds
     * @returns 'active' (<30s), 'stale' (30s-5m), or 'offline' (>5m)
     */
    calculateLocationStatus: (lastUpdated: number): LocationStatus => {
        const now = Date.now();
        const diff = now - lastUpdated;

        if (diff < 30000) return 'active'; // Less than 30 seconds
        if (diff < 300000) return 'stale'; // Less than 5 minutes
        return 'offline';
    }
};
