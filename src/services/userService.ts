import { db } from '../lib/firebase';
import {
    collection,
    query,
    where,
    getDocs
} from 'firebase/firestore';

export interface StudentProfile {
    id: string;
    displayName: string;
    email: string;
    phone?: string;
    hostelId?: string;
    roomNo?: string;
    emergencyContact?: string;
    role: string;
}

export const userService = {
    // 1. Get Students by Hostel (Warden)
    getStudentsByHostel: async (hostelId: string): Promise<StudentProfile[]> => {
        try {
            const q = query(
                collection(db, 'users'),
                where('role', '==', 'student'),
                where('hostelId', '==', hostelId)
            );

            const snapshot = await getDocs(q);
            const students = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as StudentProfile[];

            // Sort client-side to avoid composite index requirement
            return students.sort((a, b) => a.displayName.localeCompare(b.displayName));
        } catch (error) {
            console.error("Error fetching students:", error);
            // Return empty array or throw based on preference. 
            // For now, returning empty to avoid breaking UI.
            return [];
        }
    }
};
