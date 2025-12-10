import admin from 'firebase-admin';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const serviceAccount = require('../service-account.json');

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

async function listUsers() {
    try {
        const listUsersResult = await admin.auth().listUsers(1000);
        console.log('--- USER LIST ---');
        listUsersResult.users.forEach((userRecord) => {
            const role = userRecord.customClaims ? JSON.stringify(userRecord.customClaims) : 'No Role';
            console.log(`Email: ${userRecord.email} | Role: ${role}`);
        });
        console.log('-----------------');
        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

listUsers();
