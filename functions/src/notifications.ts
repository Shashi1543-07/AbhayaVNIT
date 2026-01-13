import { onDocumentCreated } from "firebase-functions/v2/firestore";
import * as admin from "firebase-admin";
import * as logger from "firebase-functions/logger";

if (!admin.apps.length) {
    admin.initializeApp();
}

/**
 * Triggered when a new SOS event is created in Firestore.
 */
export const onSOSCreated = onDocumentCreated("sos_events/{eventId}", async (event) => {
    const snapshot = event.data;
    if (!snapshot) {
        logger.error("No data found for SOS Event");
        return;
    }

    const sosData = snapshot.data();
    const eventId = event.params.eventId;

    logger.info(`Processing SOS Event: ${eventId} for user: ${sosData.userId}`);

    const notificationPromises: any[] = [];

    // 1. Prepare Notification Payload
    const payload = {
        notification: {
            title: '🚨 SOS ALERT! 🚨',
            body: `Emergency at ${sosData.location?.address || 'Unknown Location'}! Student: ${sosData.userName}`,
        },
        data: {
            type: 'SOS_ALERT',
            eventId: eventId,
            lat: String(sosData.location?.lat || ''),
            lng: String(sosData.location?.lng || ''),
            studentName: String(sosData.userName || ''),
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
                    critical: true,
                }
            }
        }
    };

    // 2. Identify Recipients
    try {
        // A. Security Guards
        const securityQuery = await admin.firestore().collection('users')
            .where('role', 'in', ['security', 'Security'])
            .get();

        const securityTokens: string[] = [];
        securityQuery.docs.forEach(doc => {
            const userData = doc.data();
            if (userData.fcmToken) {
                securityTokens.push(userData.fcmToken);
            }
        });

        if (securityTokens.length > 0) {
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

        // B. Warden
        const hostelId = sosData.hostelId || sosData.hostel;
        if (hostelId) {
            const wardenQuery = await admin.firestore().collection('users')
                .where('role', 'in', ['warden', 'Warden'])
                .where('hostelId', '==', hostelId)
                .get();

            const wardenTokens: string[] = [];
            wardenQuery.docs.forEach(doc => {
                const userData = doc.data();
                if (userData.fcmToken) {
                    wardenTokens.push(userData.fcmToken);
                }
            });

            if (wardenTokens.length > 0) {
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

        // 3. Mark SOS as "Notification Sent"
        await snapshot.ref.update({
            notificationSent: true,
            notificationTimestamp: admin.firestore.FieldValue.serverTimestamp()
        });

        await Promise.all(notificationPromises);
        logger.info('All notifications dispatched successfully.');
    } catch (error: any) {
        logger.error('Error processing SOS notifications:', error);
    }
});
