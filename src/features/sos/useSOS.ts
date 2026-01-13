import { useState, useEffect } from 'react';
import { db } from '../../lib/firebase';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { useAuthStore } from '../../context/authStore';
import { sosService, type SOSEvent } from '../../services/sosService';

export const useSOS = () => {
    const { user } = useAuthStore();
    const [activeSOS, setActiveSOS] = useState<SOSEvent | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Listen for active SOS events for this user
    useEffect(() => {
        if (!user) return;

        try {
            const q = query(
                collection(db, 'sos_events'),
                where('userId', '==', user.uid)
            );

            const unsubscribe = onSnapshot(q,
                (snapshot) => {
                    if (!snapshot.empty) {
                        const events = snapshot.docs.map(doc => {
                            const data = doc.data();
                            return {
                                id: doc.id,
                                ...data,
                                timeline: data.timeline || [] // Ensure timeline exists
                            };
                        }) as SOSEvent[];

                        // Sort client-side to find the latest one
                        events.sort((a, b) => (b.triggeredAt || 0) - (a.triggeredAt || 0));

                        setActiveSOS(events[0]);
                    } else {
                        setActiveSOS(null);
                    }
                },
                (error) => {
                    console.error("useSOS: Error subscribing to SOS events:", error);
                    // If there's an index error, set activeSOS to null and continue
                    setActiveSOS(null);
                }
            );

            return () => unsubscribe();
        } catch (err) {
            console.error("useSOS: Error setting up SOS subscription:", err);
            setActiveSOS(null);
        }
    }, [user]);

    const triggerSOS = async () => {
        if (!user) return;
        setLoading(true);
        setError(null);

        try {
            // Get Location
            if (!navigator.geolocation) {
                throw new Error('Geolocation is not supported by your browser');
            }

            const position = await new Promise<GeolocationPosition>((resolve, reject) => {
                navigator.geolocation.getCurrentPosition(resolve, reject);
            });

            const { latitude, longitude } = position.coords;

            // Use sosService to ensure consistent data structure (timeline, hostelId, etc.)
            await sosService.triggerSOS(user, { lat: latitude, lng: longitude });

        } catch (err: any) {
            console.error('Error triggering SOS:', err);
            setError(err.message || 'Failed to trigger SOS');
        } finally {
            setLoading(false);
        }
    };

    const resolveSOS = async (eventId: string) => {
        setLoading(true);
        try {
            await sosService.cancelSOS(eventId);
            setActiveSOS(null);
        } catch (err: any) {
            console.error('Error cancelling SOS:', err);
            setError(err.message || 'Failed to cancel SOS');
        } finally {
            setLoading(false);
        }
    };

    return { activeSOS, triggerSOS, resolveSOS, loading, error };
};
