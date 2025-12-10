import admin from 'firebase-admin';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const serviceAccount = require('../service-account.json');

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const email = process.argv[2];
const password = process.argv[3];

if (!email || !password) {
    console.error('Usage: node scripts/createAdmin.js <email> <password>');
    process.exit(1);
}

async function createAdmin(email, password) {
    try {
        // Check if user exists
        try {
            const user = await admin.auth().getUserByEmail(email);
            console.log(`User ${email} already exists. Updating password and role...`);
            await admin.auth().updateUser(user.uid, { password: password });
            await admin.auth().setCustomUserClaims(user.uid, { role: 'admin' });
            await admin.firestore().collection('users').doc(user.uid).set({
                role: 'admin',
                email: email
            }, { merge: true });
        } catch (error) {
            if (error.code === 'auth/user-not-found') {
                console.log(`Creating new admin user: ${email}`);
                const user = await admin.auth().createUser({
                    email: email,
                    password: password
                });
                await admin.auth().setCustomUserClaims(user.uid, { role: 'admin' });
                await admin.firestore().collection('users').doc(user.uid).set({
                    role: 'admin',
                    email: email,
                    createdAt: admin.firestore.FieldValue.serverTimestamp()
                });
            } else {
                throw error;
            }
        }

        console.log(`Successfully configured admin access for: ${email}`);
        process.exit(0);
    } catch (error) {
        console.error('Error creating/updating admin:', error);
        process.exit(1);
    }
}

createAdmin(email, password);
