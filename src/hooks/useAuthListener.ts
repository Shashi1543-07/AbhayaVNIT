import { useEffect } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { useAuthStore } from '../context/authStore';
import { presenceService } from '../services/presenceService';

export const useAuthListener = () => {
    const { setUser, setRole, setProfile, setForcePasswordReset, setLoading } = useAuthStore();

    useEffect(() => {
        let stopPresence: (() => void) | null = null;

        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (user) {
                setUser(user);
                // Start RTDB presence tracking — handles crashes via onDisconnect()
                stopPresence = presenceService.startTracking(user.uid);
                try {
                    // Fetch role from Firestore
                    const userDoc = await getDoc(doc(db, 'users', user.uid));
                    if (userDoc.exists()) {
                        const userData = userDoc.data();

                        // Check for disabled status
                        if (userData.status === 'disabled') {
                            console.warn('Authenticated user is disabled in Firestore. Signing out.');
                            stopPresence?.();
                            await signOut(auth);
                            setRole(null);
                            setProfile(null);
                            setUser(null);
                            setLoading(false);
                            return;
                        }

                        setRole(userData.role);
                        setProfile(userData);
                        setForcePasswordReset(userData.forcePasswordReset || false);
                    } else {
                        console.error('User document not found');
                        setRole(null);
                        setProfile(null);
                        setForcePasswordReset(false);
                    }
                } catch (error) {
                    console.error('Error fetching user role:', error);
                    setRole(null);
                    setProfile(null);
                    setForcePasswordReset(false);
                }
            } else {
                // User logged out — stop presence tracking
                stopPresence?.();
                stopPresence = null;
                setUser(null);
                setRole(null);
                setProfile(null);
                setForcePasswordReset(false);
            }
            setLoading(false);
        });

        return () => {
            unsubscribe();
            stopPresence?.();
        };
    }, [setUser, setRole, setProfile, setForcePasswordReset, setLoading]);
};
