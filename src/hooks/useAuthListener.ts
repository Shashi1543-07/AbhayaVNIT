import { useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { useAuthStore } from '../context/authStore';

export const useAuthListener = () => {
    const { setUser, setRole, setProfile, setForcePasswordReset, setLoading } = useAuthStore();

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (user) {
                setUser(user);
                try {
                    // Fetch role from Firestore
                    const userDoc = await getDoc(doc(db, 'users', user.uid));
                    if (userDoc.exists()) {
                        const userData = userDoc.data();
                        setRole(userData.role);
                        setProfile(userData);
                        setForcePasswordReset(userData.forcePasswordReset || false);
                    } else {
                        // If user exists in Auth but not Firestore (shouldn't happen in normal flow)
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
                setUser(null);
                setRole(null);
                setProfile(null);
                setForcePasswordReset(false);
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, [setUser, setRole, setProfile, setForcePasswordReset, setLoading]);
};
