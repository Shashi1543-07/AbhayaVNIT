import { initializeApp, deleteApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signOut, sendPasswordResetEmail } from 'firebase/auth';
import { doc, setDoc, serverTimestamp, collection, addDoc } from 'firebase/firestore';
import { db, firebaseConfig, auth as primaryAuth } from '../lib/firebase';

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
    performedBy: string;
    timestamp: any;
}

// Helper to generate a temporary password (will be reset via email)
const generateTempPassword = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < 16; i++) {
        password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
};

// Validation Helper
export const validateUser = (user: CreateUserData): string | null => {
    if (!user.name || !user.email || !user.role || !user.phone) {
        return 'Missing required fields (Name, Email, Role, Phone)';
    }

    const emailRegex = /^[a-zA-Z0-9._-]+@(students\.)?vnit\.ac\.in$/;
    if (!emailRegex.test(user.email)) {
        return `Invalid email: ${user.email}. Must be an official VNIT address (@vnit.ac.in or @students.vnit.ac.in).`;
    }

    if (user.role === 'student') {
        const enrollmentPattern = /^[a-z]{2}\d{2}[a-z]{3}\d{3}@students\.vnit\.ac\.in$/i;
        if (!enrollmentPattern.test(user.email)) {
            return `Invalid student email: ${user.email}. Must follow format: enrollmentno@students.vnit.ac.in`;
        }

        if (!user.hostel || !user.roomNo) {
            return 'Student requires Hostel and Room Number';
        }
    }

    const phoneRegex = /^\d{10}$/;
    if (!phoneRegex.test(user.phone)) {
        return `Invalid phone number: ${user.phone}. Must be 10 digits.`;
    }

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
     * Creates a new user and sends password reset email.
     * User receives email to set their own password - more secure than auto-generated.
     */
    createUser: async (userData: CreateUserData) => {
        const validationError = validateUser(userData);
        if (validationError) {
            throw new Error(validationError);
        }

        // Initialize a secondary app to avoid logging out admin
        const secondaryApp = initializeApp(firebaseConfig, 'SecondaryApp');
        const secondaryAuth = getAuth(secondaryApp);

        try {
            // Create user with temporary password (will be reset via email)
            const tempPassword = generateTempPassword();
            const userCredential = await createUserWithEmailAndPassword(secondaryAuth, userData.email, tempPassword);
            const { user } = userCredential;

            // Create user document in Firestore
            await setDoc(doc(db, 'users', user.uid), {
                uid: user.uid,
                name: userData.name,
                email: userData.email,
                role: userData.role,
                phone: userData.phone,
                hostel: userData.hostel || null,
                roomNo: userData.roomNo || null,
                status: 'active',
                passwordResetSent: true,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp()
            });

            // Sign out from secondary app
            await signOut(secondaryAuth);

            // Send password reset email using primary auth
            await sendPasswordResetEmail(primaryAuth, userData.email);

            // Log the action
            await adminService.logAction('Create User', userData.email, `Created ${userData.role} account with password reset email`);

            return { success: true, uid: user.uid, emailSent: true };

        } catch (error: any) {
            console.error('Error creating user:', error);
            throw new Error(error.message || 'Failed to create user');
        } finally {
            await deleteApp(secondaryApp);
        }
    },

    /**
     * Bulk creates users and sends password reset emails.
     */
    bulkCreateUsers: async (usersData: CreateUserData[]) => {
        const results = {
            success: 0,
            failed: 0,
            errors: [] as string[],
            emailsSent: [] as string[]
        };

        const secondaryApp = initializeApp(firebaseConfig, 'SecondaryAppBulk');
        const secondaryAuth = getAuth(secondaryApp);

        try {
            for (const userData of usersData) {
                const validationError = validateUser(userData);
                if (validationError) {
                    results.failed++;
                    results.errors.push(`${userData.email}: ${validationError}`);
                    continue;
                }

                try {
                    const tempPassword = generateTempPassword();
                    const userCredential = await createUserWithEmailAndPassword(secondaryAuth, userData.email, tempPassword);
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
                        passwordResetSent: true,
                        createdAt: serverTimestamp(),
                        updatedAt: serverTimestamp()
                    });

                    await signOut(secondaryAuth);

                    // Send password reset email
                    try {
                        await sendPasswordResetEmail(primaryAuth, userData.email);
                        results.emailsSent.push(userData.email);
                    } catch (emailError) {
                        console.warn(`Failed to send reset email to ${userData.email}:`, emailError);
                        // Still count as success - account created, can resend email later
                    }

                    results.success++;
                } catch (error: any) {
                    console.error(`Failed to create user ${userData.email}:`, error);
                    results.failed++;
                    results.errors.push(`${userData.email}: ${error.message}`);

                    try { await signOut(secondaryAuth); } catch (e) { /* ignore */ }
                }
            }

            if (results.success > 0) {
                await adminService.logAction('Bulk Create', 'Multiple Users', `Created ${results.success} users, sent ${results.emailsSent.length} reset emails`);
            }

        } finally {
            await deleteApp(secondaryApp);
        }

        return results;
    },

    /**
     * Resend password reset email to a user.
     */
    resendPasswordResetEmail: async (email: string) => {
        try {
            await sendPasswordResetEmail(primaryAuth, email);
            await adminService.logAction('Resend Reset Email', email, 'Password reset email resent');
            return { success: true };
        } catch (error: any) {
            console.error('Failed to send reset email:', error);
            throw new Error(error.message || 'Failed to send email');
        }
    }
};
