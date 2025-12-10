const admin = require('firebase-admin');
const serviceAccount = require('../service-account.json');

// Initialize Firebase Admin
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const uid = process.argv[2];

if (!uid) {
    console.error('Please provide a User UID as an argument.');
    process.exit(1);
}

async function setAdmin(uid) {
    try {
        await admin.auth().setCustomUserClaims(uid, { role: 'admin' });
        console.log(`Successfully set 'admin' role for user ${uid}`);

        // Also update Firestore for consistency
        await admin.firestore().collection('users').doc(uid).set({
            role: 'admin'
        }, { merge: true });
        console.log('Updated Firestore document.');

        process.exit(0);
    } catch (error) {
        console.error('Error setting admin role:', error);
        process.exit(1);
    }
}

setAdmin(uid);
