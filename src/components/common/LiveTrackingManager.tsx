import { useEffect, useState } from 'react';
import { useAuthStore } from '../../context/authStore';
import { useLiveLocationTracking } from '../../hooks/useLiveLocationTracking';
import { sosService } from '../../services/sosService';
import { safeWalkService } from '../../services/safeWalkService';

/**
 * Global Tracking Manager
 * This component remains mounted across the entire app for logged-in users.
 * It detects if the user has an active SOS or SafeWalk and starts GPS tracking automatically.
 */
export default function LiveTrackingManager() {
    const { user } = useAuthStore();
    const [isTracking, setIsTracking] = useState(false);

    useEffect(() => {
        if (!user) {
            setIsTracking(false);
            return;
        }

        let hasActiveSOS = false;
        let hasActiveWalk = false;

        const updateTrackingState = () => {
            setIsTracking(hasActiveSOS || hasActiveWalk);
        };

        // 1. Monitor SOS status
        const unsubSOS = sosService.subscribeToActiveSOS((events) => {
            hasActiveSOS = events.some(e => e.userId === user.uid && !e.status.resolved);
            updateTrackingState();
        });

        // 2. Monitor SafeWalk status
        const unsubWalk = safeWalkService.subscribeToUserActiveWalk(user.uid, (session) => {
            hasActiveWalk = !!(session && (session.status === 'active' || session.status === 'danger' || session.status === 'delayed'));
            updateTrackingState();
        });

        return () => {
            unsubSOS();
            unsubWalk();
        };
    }, [user]);

    // Hook does the actual RTDB pushing
    useLiveLocationTracking(isTracking, user?.uid);

    return null; // Side-effect only component
}
