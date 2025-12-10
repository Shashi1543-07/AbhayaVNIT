// @ts-nocheck
import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

admin.initializeApp();

// Create a new user (Warden or Security)
export const createUser = functions.https.onCall(async (data, context) => {
    // Check if request is made by an admin
    if (!context.auth || context.auth.token.role !== 'admin') {
        throw new functions.https.HttpsError('permission-denied', 'Only admins can create users.');
    }

    const { email, password, role, name, phone, hostelId } = data;

    try {
        // Create Auth User
        const userRecord = await admin.auth().createUser({
            email,
            password,
            displayName: name,
        });

        // Set Custom Claims
        await admin.auth().setCustomUserClaims(userRecord.uid, { role });

        // Create Firestore Document
        await admin.firestore().collection('users').doc(userRecord.uid).set({
            uid: userRecord.uid,
            email,
            role,
            name,
            phone,
            hostelId: hostelId || null,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            status: 'active'
        });

        return { success: true, uid: userRecord.uid };
    } catch (error) {
        throw new functions.https.HttpsError('internal', 'Error creating user', error);
    }
});

// Import Students Batch
export const importStudents = functions.https.onCall(async (data, context) => {
    if (!context.auth || context.auth.token.role !== 'admin') {
        throw new functions.https.HttpsError('permission-denied', 'Only admins can import students.');
    }

    const { students } = data; // Array of student objects
    const batch = admin.firestore().batch();

    students.forEach((student: any) => {
        const ref = admin.firestore().collection('pre_registered_users').doc(student.rollNo);
        batch.set(ref, {
            ...student,
            isRegistered: false,
            importedAt: admin.firestore.FieldValue.serverTimestamp()
        });
    });

    await batch.commit();
    return { success: true, count: students.length };
});
