import { useEffect, useRef, useState } from 'react';
import { rtdb } from '../lib/firebase';
import { ref, set, onDisconnect, serverTimestamp } from 'firebase/database';

export const useLiveLocationTracking = (isActive: boolean, userId?: string) => {
    const [error, setError] = useState<string | null>(null);
    const watchIdRef = useRef<number | null>(null);

    useEffect(() => {
        if (!isActive || !userId) {
            if (watchIdRef.current !== null) {
                navigator.geolocation.clearWatch(watchIdRef.current);
                watchIdRef.current = null;
            }
            return;
        }

        const locationRef = ref(rtdb, `live_locations/${userId}`);

        // Remove on disconnect
        onDisconnect(locationRef).remove().catch(err => console.error("OnDisconnect error:", err));

        const updatePosition = (position: GeolocationPosition) => {
            const { latitude, longitude, speed, heading, accuracy } = position.coords;

            set(locationRef, {
                latitude,
                longitude,
                speed: speed ?? 0,
                heading: heading ?? 0,
                accuracy: accuracy ?? 0,
                lastUpdated: serverTimestamp()
            }).catch(err => console.error("RTDB update error:", err));
        };

        const handleError = (error: GeolocationPositionError) => {
            console.error("GPS Error:", error);
            setError(error.message);
        };

        watchIdRef.current = navigator.geolocation.watchPosition(updatePosition, handleError, {
            enableHighAccuracy: true,
            timeout: 5000,
            maximumAge: 0
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
