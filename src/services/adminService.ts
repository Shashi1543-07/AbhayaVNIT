import { initializeApp, deleteApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { doc, setDoc, serverTimestamp, collection, addDoc } from 'firebase/firestore';
import { db, firebaseConfig } from '../lib/firebase';

export interface CreateUserData {
    email: string;
    name: string;
    role: 'student' | 'warden' | 'security' | 'admin';
    phone: string;
    hostel?: string;
    roomNo?: string;
}

export interface AuditLog {
    action: string;
    target: string;
    details: string;
    performedBy: string; // Email of admin
    timestamp: any;
}

// Helper to generate secure random password
const generateSecurePassword = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < 12; i++) {
        password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
};

// Validation Helper
export const validateUser = (user: CreateUserData): string | null => {
    // 1. Required Fields
    if (!user.name || !user.email || !user.role || !user.phone) {
        return 'Missing required fields (Name, Email, Role, Phone)';
    }

    // 2. Email Validation
    // Allow both @vnit.ac.in (staff/admin) and @students.vnit.ac.in (students)
    const emailRegex = /^[a-zA-Z0-9._-]+@(students\.)?vnit\.ac\.in$/;
    if (!emailRegex.test(user.email)) {
        return `Invalid email: ${user.email}. Must be an official VNIT address (@vnit.ac.in or @students.vnit.ac.in).`;
    }

    // Student specific email check (Enrollment No format)
    if (user.role === 'student') {
        const enrollmentPattern = /^[a-z]{2}\d{2}[a-z]{3}\d{3}@students\.vnit\.ac\.in$/i;
        if (!enrollmentPattern.test(user.email)) {
            return `Invalid student email: ${user.email}. Must follow format: enrollmentno@students.vnit.ac.in (e.g., bt21cse001@students.vnit.ac.in)`;
        }

        if (!user.hostel || !user.roomNo) {
            return 'Student requires Hostel and Room Number';
        }
    }

    // 3. Phone Validation (10 digits)
    const phoneRegex = /^\d{10}$/;
    if (!phoneRegex.test(user.phone)) {
        return `Invalid phone number: ${user.phone}. Must be 10 digits.`;
    }

    // 4. Warden specific checks
    if (user.role === 'warden' && !user.hostel) {
        return 'Warden requires an assigned Hostel';
    }

    return null;
};

export const adminService = {
    /**
     * Logs an admin action to Firestore.
     */
    logAction: async (action: string, target: string, details: string) => {
        try {
            const auth = getAuth();
            const currentUser = auth.currentUser;

            await addDoc(collection(db, 'audit_logs'), {
                action,
                target,
                details,
                performedBy: currentUser?.email || 'Unknown Admin',
                timestamp: serverTimestamp()
            });
        } catch (error) {
            console.error('Failed to log action:', error);
        }
    },

    /**
     * Creates a new user in Firebase Auth and Firestore.
     * Uses a secondary Firebase App instance to avoid logging out the current admin.
     */
    createUser: async (userData: CreateUserData) => {
        // Validate first
        const validationError = validateUser(userData);
        if (validationError) {
            throw new Error(validationError);
        }

        // 1. Initialize a secondary app
        const secondaryApp = initializeApp(firebaseConfig, 'SecondaryApp');
        const secondaryAuth = getAuth(secondaryApp);

        try {
            // 2. Create user in Auth (this automatically signs them in on the secondary app)
            const password = generateSecurePassword();
            const userCredential = await createUserWithEmailAndPassword(secondaryAuth, userData.email, password);
            const { user } = userCredential;

            // 3. Create user document in Firestore (using the PRIMARY app's db connection which has Admin privileges)
            await setDoc(doc(db, 'users', user.uid), {
                uid: user.uid,
                name: userData.name,
                email: userData.email,
                role: userData.role,
                phone: userData.phone,
                hostel: userData.hostel || null,
                roomNo: userData.roomNo || null,
                status: 'active',
                forcePasswordReset: true,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp()
            });

            // 4. Log the action
            await adminService.logAction('Create User', userData.email, `Created ${userData.role} account`);

            // 5. Sign out from secondary app to clean up
            await signOut(secondaryAuth);

            return { success: true, uid: user.uid, password };

        } catch (error: any) {
            console.error('Error creating user:', error);
            throw new Error(error.message || 'Failed to create user');
        } finally {
            // 6. Delete the secondary app instance
            await deleteApp(secondaryApp);
        }
    },

    /**
     * Bulk creates users from a list of user data.
     * Processes sequentially to avoid rate limits and manage secondary app lifecycle efficiently.
     */
    bulkCreateUsers: async (usersData: CreateUserData[]) => {
        const results = {
            success: 0,
            failed: 0,
            errors: [] as string[],
            credentials: [] as { email: string, password: string, role: string }[]
        };

        // Initialize app once for the batch (optimization)
        const secondaryApp = initializeApp(firebaseConfig, 'SecondaryAppBulk');
        const secondaryAuth = getAuth(secondaryApp);

        try {
            for (const userData of usersData) {
                // Validate first
                const validationError = validateUser(userData);
                if (validationError) {
                    results.failed++;
                    results.errors.push(`${userData.email}: ${validationError}`);
                    continue;
                }

                try {
                    const password = generateSecurePassword();
                    const userCredential = await createUserWithEmailAndPassword(secondaryAuth, userData.email, password);
                    const { user } = userCredential;

                    await setDoc(doc(db, 'users', user.uid), {
                        uid: user.uid,
                        name: userData.name,
                        email: userData.email,
                        role: userData.role,
                        phone: userData.phone,
                        hostel: userData.hostel || null,
                        roomNo: userData.roomNo || null,
                        status: 'active',
                        forcePasswordReset: true,
                        createdAt: serverTimestamp(),
                        updatedAt: serverTimestamp()
                    });

                    results.credentials.push({
                        email: userData.email,
                        password,
                        role: userData.role
                    });

                    await signOut(secondaryAuth);

                    results.success++;
                } catch (error: any) {
                    console.error(`Failed to create user ${userData.email}:`, error);
                    results.failed++;
                    results.errors.push(`${userData.email}: ${error.message}`);

                    try { await signOut(secondaryAuth); } catch (e) { /* ignore */ }
                }
            }

            // Log the bulk action
            if (results.success > 0) {
                await adminService.logAction('Bulk Create', 'Multiple Users', `Created ${results.success} users via CSV`);
            }

        } finally {
            await deleteApp(secondaryApp);
        }

        return results;
    }
};
