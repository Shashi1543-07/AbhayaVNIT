import admin from 'firebase-admin';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const serviceAccount = require('../service-account.json');

// Initialize Firebase Admin
if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const email = process.argv[2];
const newPassword = process.argv[3];

if (!email || !newPassword) {
    console.error('Usage: node scripts/resetAdminPassword.js <email> <newPassword>');
    process.exit(1);
}

async function resetPassword(email, newPassword) {
    try {
        const user = await admin.auth().getUserByEmail(email);
        await admin.auth().updateUser(user.uid, {
            password: newPassword
        });

        // Ensure admin role is set
        await admin.auth().setCustomUserClaims(user.uid, { role: 'admin' });
        await admin.firestore().collection('users').doc(user.uid).set({
            role: 'admin'
        }, { merge: true });

        console.log(`Successfully updated password and ensured admin role for user: ${email}`);
        process.exit(0);
    } catch (error) {
        console.error('Error updating password:', error);
        process.exit(1);
    }
}

resetPassword(email, newPassword);
