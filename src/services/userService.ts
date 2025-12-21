import { db } from '../lib/firebase';
import { collection, query, where, getDocs, limit } from 'firebase/firestore';

export interface UserProfile {
    uid: string;
    name: string;
    role: 'student' | 'warden' | 'security';
    hostelId?: string;
    phoneNumber?: string;
}

export const userService = {
    getStaff: async (): Promise<UserProfile[]> => {
        try {
            // We need two queries because 'in' operator limits are strict and sometimes composite index issues arise.
            // But for simple roles, 'in' ["warden", "security"] works if no other inequalities.
            // However, to be safe and avoid index creation during demo, we can just fetch all users (if small DB) or do 2 queries.
            // Let's try the 'in' query.

            const q = query(
                collection(db, 'users'),
                where('role', 'in', ['warden', 'security']),
                limit(20)
            );

            const snapshot = await getDocs(q);
            return snapshot.docs.map(doc => ({
                uid: doc.id,
                ...doc.data()
            } as UserProfile));
        } catch (error) {
            console.error("Error fetching staff:", error);
            return [];
        }
    }
};
