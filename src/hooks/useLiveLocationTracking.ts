import { useEffect, useRef, useState } from 'react';
import { rtdb } from '../lib/firebase';
import { ref, set, onDisconnect, remove, serverTimestamp } from 'firebase/database';

export const useLiveLocationTracking = (isActive: boolean, userId?: string) => {
    const [error, setError] = useState<string | null>(null);
    const watchIdRef = useRef<number | null>(null);

    useEffect(() => {
        if (!isActive || !userId) {
            // Stop tracking if not active
            if (watchIdRef.current !== null) {
                navigator.geolocation.clearWatch(watchIdRef.current);
                watchIdRef.current = null;
                // Clean up location node
                const locationRef = ref(rtdb, `live_locations/${userId}`);
                remove(locationRef).catch(console.error);
            }
            return;
        }

        if (!navigator.geolocation) {
            setError("Geolocation is not supported by your browser.");
            return;
        }

        const locationRef = ref(rtdb, `live_locations/${userId}`);

        // Set up onDisconnect to remove location if app closes/crashes
        onDisconnect(locationRef).remove();

        const success = (position: GeolocationPosition) => {
            const { latitude, longitude, accuracy, heading, speed } = position.coords;

            set(locationRef, {
                latitude,
                longitude,
                accuracy,
                heading,
                speed,
                lastUpdated: serverTimestamp()
            }).catch(err => console.error("Error updating location:", err));
        };

        const errorCallback = (err: GeolocationPositionError) => {
            console.error("Geolocation error:", err);
            setError(err.message);
        };

        // Start watching
        watchIdRef.current = navigator.geolocation.watchPosition(success, errorCallback, {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 5000
        });

        return () => {
            if (watchIdRef.current !== null) {
                navigator.geolocation.clearWatch(watchIdRef.current);
                watchIdRef.current = null;
            }
        };
    }, [isActive, userId]);

    return { error };
};
