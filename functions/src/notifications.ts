import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

// Ensure firebase-admin is initialized (it might be initialized in index.ts, but safe to check/init)
if (!admin.apps.length) {
    admin.initializeApp();
}

/**
 * Triggered when a new SOS event is created in Firestore.
 * This function handles the dispatch of notifications to Wardens and Security.
 */
export const onSOSCreated = functions.firestore
    .document('sos_events/{eventId}')
    .onCreate(async (snapshot, context) => {
        const sosData = snapshot.data();
        const eventId = context.params.eventId;

        if (!sosData) {
            console.error('No data found for SOS Event:', eventId);
            return;
        }

        console.log(`Processing SOS Event: ${eventId} for user: ${sosData.userId}`);

        const notificationPromises: Promise<any>[] = [];

        // 1. Prepare Notification Payload
        const payload = {
            notification: {
                title: '🚨 SOS ALERT! 🚨',
                body: `Emergency at ${sosData.location?.address || 'Unknown Location'}! Student: ${sosData.userName}`,
                sound: 'default', // In a real app, use a custom critical alert sound
            },
            data: {
                type: 'SOS_ALERT',
                eventId: eventId,
                lat: String(sosData.location?.lat),
                lng: String(sosData.location?.lng),
                studentName: sosData.userName,
            },
            android: {
                priority: 'high' as const,
                notification: {
                    channelId: 'emergency_alerts',
                    priority: 'max' as const,
                    visibility: 'public' as const,
                }
            },
            apns: {
                payload: {
                    aps: {
                        sound: 'default',
                        critical: true, // For iOS Critical Alerts (requires entitlement)
                    }
                }
            }
        };

        // 2. Identify Recipients

        // A. Security Guards (Notify ALL active security personnel)
        // We assume security guards have a topic subscription or we query their tokens
        // For simplicity, let's query users with role 'security'
        const securityQuery = await admin.firestore().collection('users')
            .where('role', '==', 'security')
            .get();

        const securityTokens: string[] = [];
        securityQuery.docs.forEach(doc => {
            const userData = doc.data();
            if (userData.fcmToken) {
                securityTokens.push(userData.fcmToken);
            }
        });

        if (securityTokens.length > 0) {
            console.log(`Notifying ${securityTokens.length} security guards.`);
            notificationPromises.push(
                admin.messaging().sendEachForMulticast({
                    tokens: securityTokens,
                    notification: payload.notification,
                    data: payload.data,
                    android: payload.android,
                    apns: payload.apns
                })
            );
        }

        // B. Warden (Notify only the warden of the student's hostel)
        if (sosData.hostelId) {
            const wardenQuery = await admin.firestore().collection('users')
                .where('role', '==', 'warden')
                .where('hostelId', '==', sosData.hostelId)
                .get();

            const wardenTokens: string[] = [];
            wardenQuery.docs.forEach(doc => {
                const userData = doc.data();
                if (userData.fcmToken) {
                    wardenTokens.push(userData.fcmToken);
                }
            });

            if (wardenTokens.length > 0) {
                console.log(`Notifying ${wardenTokens.length} wardens for hostel ${sosData.hostelId}.`);
                notificationPromises.push(
                    admin.messaging().sendEachForMulticast({
                        tokens: wardenTokens,
                        notification: payload.notification,
                        data: payload.data,
                        android: payload.android,
                        apns: payload.apns
                    })
                );
            }
        }

        // 3. Mark SOS as "Notification Sent" (Optional, for auditing)
        // We don't wait for this to finish to send notifications
        await snapshot.ref.update({
            notificationSent: true,
            notificationTimestamp: admin.firestore.FieldValue.serverTimestamp()
        });

        // 4. Execute all notification sends
        try {
            await Promise.all(notificationPromises);
            console.log('All notifications dispatched successfully.');
        } catch (error) {
            console.error('Error sending notifications:', error);
        }
    });
