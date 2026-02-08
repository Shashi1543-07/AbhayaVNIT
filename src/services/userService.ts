import { db } from '../lib/firebase';
import { collection, query, where, getDocs, limit, doc, getDoc } from 'firebase/firestore';

export interface UserProfile {
    uid: string;
    name: string;
    role: 'student' | 'warden' | 'security';
    hostelId?: string;
    phoneNumber?: string;
    roomNo?: string;
}

export interface StudentProfile {
    id: string;
    displayName: string;
    username?: string;
    email: string;
    role: 'student';
    hostelId: string;
    roomNo?: string;
    phone?: string;
    idNumber?: string;
    enrollmentNumber?: string;
    emergencyContact?: string;
    course?: string;
    year?: string;
    bloodGroup?: string;
}

export const userService = {
    getStaff: async (): Promise<UserProfile[]> => {
        try {
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
    },

    getUserProfile: async (uid: string): Promise<any | null> => {
        try {
            const docRef = doc(db, 'users', uid);
            const snap = await getDoc(docRef);
            if (snap.exists()) {
                return { id: snap.id, ...snap.data() };
            }
            return null;
        } catch (error) {
            console.error("Error fetching user profile:", error);
            return null;
        }
    },

    getStudentsByHostel: async (hostelId: string): Promise<StudentProfile[]> => {
        try {
            console.log("userService: Fetching students for hostel:", hostelId);
            const q = query(
                collection(db, 'users'),
                where('role', '==', 'student')
            );

            const snapshot = await getDocs(q);
            const allStudents = snapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    id: doc.id,
                    displayName: data.name || data.displayName || 'Unnamed',
                    username: data.username,
                    email: data.email || '',
                    role: 'student',
                    hostelId: data.hostelId || data.hostel || '',
                    roomNo: data.roomNo,
                    phone: data.phoneNumber || data.phone,
                    idNumber: data.idNumber,
                    enrollmentNumber: data.enrollmentNumber,
                    emergencyContact: data.emergencyContact || data.emergencyPhone,
                    course: data.course,
                    year: data.year,
                    bloodGroup: data.bloodGroup
                } as StudentProfile;
            });

            // Filter client-side to handle both 'hostelId' and 'hostel' fields and different casing
            const filtered = allStudents.filter(s =>
                s.hostelId?.toLowerCase() === hostelId.toLowerCase()
            );

            console.log(`userService: Found ${filtered.length} students for ${hostelId}`);
            return filtered;
        } catch (error) {
            console.error("Error fetching students:", error);
            return [];
        }
    },

    getAllStudents: async (): Promise<StudentProfile[]> => {
        try {
            const q = query(
                collection(db, 'users'),
                where('role', '==', 'student')
            );

            const snapshot = await getDocs(q);
            return snapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    id: doc.id,
                    displayName: data.name || data.displayName || 'Unnamed',
                    username: data.username,
                    email: data.email || '',
                    role: 'student',
                    hostelId: data.hostelId || data.hostel || '',
                    roomNo: data.roomNo,
                    phone: data.phoneNumber || data.phone,
                    idNumber: data.idNumber,
                    enrollmentNumber: data.enrollmentNumber,
                    emergencyContact: data.emergencyContact || data.emergencyPhone,
                    course: data.course,
                    year: data.year,
                    bloodGroup: data.bloodGroup
                } as StudentProfile;
            });
        } catch (error) {
            console.error("Error fetching all students:", error);
            return [];
        }
    },

    getWardens: async (): Promise<UserProfile[]> => {
        try {
            const q = query(
                collection(db, 'users'),
                where('role', '==', 'warden')
            );
            const snapshot = await getDocs(q);
            return snapshot.docs.map(doc => ({
                uid: doc.id,
                ...doc.data()
            } as UserProfile));
        } catch (error) {
            console.error("Error fetching wardens:", error);
            return [];
        }
    },

    getSecurityStaff: async (): Promise<UserProfile[]> => {
        try {
            const q = query(
                collection(db, 'users'),
                where('role', '==', 'security')
            );
            const snapshot = await getDocs(q);
            return snapshot.docs.map(doc => ({
                uid: doc.id,
                ...doc.data()
            } as UserProfile));
        } catch (error) {
            console.error("Error fetching security staff:", error);
            return [];
        }
    }
};

