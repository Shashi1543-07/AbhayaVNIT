import { initializeApp, deleteApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signOut, sendPasswordResetEmail } from 'firebase/auth';
import { doc, setDoc, serverTimestamp, collection, addDoc, deleteDoc, writeBatch } from 'firebase/firestore';
import { db, firebaseConfig, auth as primaryAuth } from '../lib/firebase';

export interface CreateUserData {
    email: string;
    name: string;
    username: string;
    role: 'student' | 'warden' | 'security' | 'admin';
    phone: string;
    hostel?: string;
    roomNo?: string;
    idNumber?: string;
    enrollmentNumber?: string;
    subRole?: 'Security' | 'Hostel Affairs Section' | 'Ladies Representative';
}

export interface AuditLog {
    id: string;
    action: string;
    target: string;
    details: string;
    performedBy: string; // Usually email
    actorName?: string;
    actorIdNumber?: string;
    actorPhone?: string;
    actorEmail?: string;
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
    if (!user.name || !user.username || !user.email || !user.role || !user.phone) {
        return 'Missing required fields (Name, Username, Email, Role, Phone)';
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

        if (!user.hostel || !user.roomNo || !user.idNumber || !user.enrollmentNumber) {
            return 'Student requires Hostel, Room Number, ID Number, and Enrollment Number';
        }
    }

    const phoneRegex = /^\d{10}$/;
    if (!phoneRegex.test(user.phone)) {
        return `Invalid phone number: ${user.phone}. Must be 10 digits.`;
    }

    const validHostels = ['Kalpana Chawala Hostel', 'Anandi Gopal Joshi Hostel'];
    if ((user.role === 'warden' || user.role === 'student') && (!user.hostel || !validHostels.includes(user.hostel))) {
        return `Please select a valid hostel: ${validHostels.join(', ')}`;
    }

    if (user.role === 'security' && !user.subRole) {
        return 'Security personnel require a specific Section (Security, Hostel Affairs, or Ladies Rep)';
    }

    return null;
};

export const adminService = {
    /**
     * Logs an admin action to Firestore.
     */
    logAction: async (action: string, target: string, details: string, actorProfile?: any) => {
        try {
            const auth = getAuth();
            const currentUser = auth.currentUser;

            await addDoc(collection(db, 'audit_logs'), {
                action,
                target,
                details,
                performedBy: currentUser?.email || 'Unknown Actor',
                actorName: actorProfile?.name || actorProfile?.displayName || 'System/Staff',
                actorIdNumber: actorProfile?.idNumber || 'N/A',
                actorPhone: actorProfile?.phone || actorProfile?.phoneNumber || 'N/A',
                actorEmail: actorProfile?.email || currentUser?.email || 'N/A',
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
    createUser: async (userData: CreateUserData, actorProfile?: any) => {
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
                username: userData.username,
                email: userData.email,
                role: userData.role,
                phone: userData.phone,
                hostel: userData.hostel || null,
                roomNo: userData.roomNo || null,
                idNumber: userData.idNumber || null,
                enrollmentNumber: userData.enrollmentNumber || null,
                subRole: userData.subRole || null,
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
            await adminService.logAction('Create User', userData.email, `Created ${userData.role} account with password reset email`, actorProfile);

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
    bulkCreateUsers: async (usersData: CreateUserData[], actorProfile?: any) => {
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
                        username: userData.username,
                        email: userData.email,
                        role: userData.role,
                        phone: userData.phone,
                        hostel: userData.hostel || null,
                        roomNo: userData.roomNo || null,
                        idNumber: userData.idNumber || null,
                        enrollmentNumber: userData.enrollmentNumber || null,
                        subRole: userData.subRole || null,
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
                await adminService.logAction('Bulk Create', 'Multiple Users', `Created ${results.success} users, sent ${results.emailsSent.length} reset emails`, actorProfile);
            }

        } finally {
            await deleteApp(secondaryApp);
        }

        return results;
    },

    /**
     * Resend password reset email to a user.
     */
    resendPasswordResetEmail: async (email: string, actorProfile?: any) => {
        try {
            await sendPasswordResetEmail(primaryAuth, email);
            await adminService.logAction('Resend Reset Email', email, 'Password reset email resent', actorProfile);
            return { success: true };
        } catch (error: any) {
            console.error('Failed to send reset email:', error);
            throw new Error(error.message || 'Failed to send email');
        }
    },

    /**
     * Deletes a specific audit log.
     */
    deleteLog: async (logId: string) => {
        try {
            await deleteDoc(doc(db, 'audit_logs', logId));
            return { success: true };
        } catch (error: any) {
            console.error('Failed to delete log:', error);
            throw new Error(error.message || 'Failed to delete log');
        }
    },

    /**
     * Deletes multiple audit logs in chunks to handle Firestore limits.
     */
    bulkDeleteLogs: async (logIds: string[]) => {
        try {
            // Firestore batch limit is 500 writes
            const CHUNK_SIZE = 500;
            const chunks = [];

            for (let i = 0; i < logIds.length; i += CHUNK_SIZE) {
                chunks.push(logIds.slice(i, i + CHUNK_SIZE));
            }

            let totalDeleted = 0;
            for (const chunk of chunks) {
                const batch = writeBatch(db);
                chunk.forEach((id) => {
                    const logRef = doc(db, 'audit_logs', id);
                    batch.delete(logRef);
                });
                await batch.commit();
                totalDeleted += chunk.length;
            }

            return { success: true, count: totalDeleted };
        } catch (error: any) {
            console.error('Failed to bulk delete logs:', error);
            throw new Error(error.message || 'Failed to bulk delete logs');
        }
    }
};
