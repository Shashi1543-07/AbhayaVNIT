import { onCall, HttpsError, onRequest } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import { v4 as uuidv4 } from "uuid";
import * as logger from "firebase-functions/logger";

if (!admin.apps.length) {
    admin.initializeApp();
}

const db = admin.firestore();
const rtdb = admin.database();

// Helper to throw errors correctly in v2 onCall
const handleCallError = (error: any, context: string) => {
    logger.error(`${context}: Failure`, { error: error.message, stack: error.stack });
    if (error instanceof HttpsError) {
        throw error;
    }
    throw new HttpsError("internal", error.message || "Internal server error");
};

export const startSOS = onCall({ cors: true }, async (request) => {
    logger.info("startSOS: Request started", { uid: request.auth?.uid });

    if (!request.auth) {
        throw new HttpsError("unauthenticated", "User must be logged in.");
    }

    const { location, emergencyType, triggerMethod } = request.data || {};
    const uid = request.auth.uid;

    if (!location || typeof location.lat !== 'number' || typeof location.lng !== 'number') {
        throw new HttpsError("invalid-argument", "Missing or invalid location coordinates.");
    }

    try {
        const userDoc = await db.collection("users").doc(uid).get();
        const userData = userDoc.data();

        if (!userData) {
            throw new HttpsError("not-found", "User profile not found.");
        }

        const sosId = uuidv4();
        const sosToken = uuidv4() + "-" + Date.now();

        const sosEvent = {
            id: sosId,
            userId: uid,
            userName: userData.name || "Unknown",
            studentId: uid,
            studentName: userData.name || "Unknown",
            userPhone: userData.phoneNumber || "",
            role: userData.role || "student",
            hostelId: userData.hostelId || null,
            hostel: userData.hostelId || "Unknown",
            roomNumber: userData.roomNo || "N/A",
            status: {
                recognised: false,
                resolved: false
            },
            recognisedBy: null,
            assignedTo: null,
            triggeredAt: admin.firestore.FieldValue.serverTimestamp(),
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            resolvedAt: null,
            location: location,
            liveLocation: location,
            timeline: [{
                time: Date.now(),
                action: "SOS Triggered via API",
                by: uid,
                note: `Emergency: ${emergencyType} (${triggerMethod})`
            }],
            emergencyType: emergencyType || "other",
            triggerMethod: triggerMethod || "button",
            isDetailsAdded: true
        };

        await db.collection("sos_events").doc(sosId).set(sosEvent);

        await db.collection("sos_sessions").doc(sosId).set({
            sosId,
            userId: uid,
            token: sosToken,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            expiresAt: admin.firestore.Timestamp.fromMillis(Date.now() + (48 * 60 * 60 * 1000)),
            isActive: true
        });

        await rtdb.ref(`live_locations/${uid}`).set({
            latitude: location.lat,
            longitude: location.lng,
            lastUpdated: admin.database.ServerValue.TIMESTAMP,
            sosId: sosId
        });

        logger.info("startSOS: Success", { sosId });
        return {
            success: true,
            sosId,
            sosToken
        };
    } catch (error: any) {
        throw handleCallError(error, "startSOS");
    }
});

export const updateSOSLocation = onRequest({ cors: true }, async (req, res) => {
    if (req.method === "OPTIONS") {
        res.status(204).send("");
        return;
    }

    if (req.method !== "POST") {
        res.status(405).send("Method Not Allowed");
        return;
    }

    const { sosToken, sosId, latitude, longitude } = req.body || {};

    if (!sosToken || !sosId || latitude === undefined || longitude === undefined) {
        res.status(400).send("Missing required parameters");
        return;
    }

    try {
        const sessionDoc = await db.collection("sos_sessions").doc(sosId).get();
        const sessionData = sessionDoc.data();

        if (!sessionData || !sessionData.isActive || sessionData.token !== sosToken) {
            res.status(401).send("Invalid or expired SOS token");
            return;
        }

        const userId = sessionData.userId;

        await db.collection("sos_events").doc(sosId).update({
            liveLocation: {
                lat: latitude,
                lng: longitude
            }
        });

        await rtdb.ref(`live_locations/${userId}`).update({
            latitude,
            longitude,
            lastUpdated: admin.database.ServerValue.TIMESTAMP
        });

        res.status(200).send({ success: true });
    } catch (error: any) {
        logger.error("updateSOSLocation: Failure", { error: error.message });
        res.status(500).send("Internal Server Error");
    }
});

export const stopSOS = onCall({ cors: true }, async (request) => {
    logger.info("stopSOS: Request started", { data: request.data, uid: request.auth?.uid });

    if (!request.auth) {
        throw new HttpsError("unauthenticated", "User must be logged in.");
    }

    const { sosId, summary } = request.data || {};
    if (!sosId) {
        throw new HttpsError("invalid-argument", "Missing sosId.");
    }

    const uid = request.auth.uid;

    try {
        const sosRef = db.collection("sos_events").doc(sosId);
        const sosDoc = await sosRef.get();
        const sosData = sosDoc.data();

        if (!sosData) {
            throw new HttpsError("not-found", "SOS event not found.");
        }

        const isOwner = sosData.userId === uid;
        const userRole = (request.auth.token.role as string || '').toLowerCase();
        const isSecurity = ['security', 'admin', 'warden'].includes(userRole);

        if (!isOwner && !isSecurity) {
            throw new HttpsError("permission-denied", "You do not have permission to stop this SOS.");
        }

        await db.runTransaction(async (transaction) => {
            transaction.update(sosRef, {
                "status.resolved": true,
                resolvedAt: admin.firestore.FieldValue.serverTimestamp(),
                resolutionSummary: summary || "Resolved",
                timeline: admin.firestore.FieldValue.arrayUnion({
                    time: Date.now(),
                    action: "Resolved",
                    by: uid,
                    note: summary || "SOS Session Stopped"
                })
            });

            const sessionRef = db.collection("sos_sessions").doc(sosId);
            const sessionDoc = await sessionRef.get();
            if (sessionDoc.exists) {
                transaction.update(sessionRef, {
                    isActive: false,
                    stoppedAt: admin.firestore.FieldValue.serverTimestamp()
                });
            }
        });

        logger.info("stopSOS: Success", { sosId });
        return { success: true };
    } catch (error: any) {
        throw handleCallError(error, "stopSOS");
    }
});

export const stopSOSWithToken = onRequest({ cors: true }, async (req, res) => {
    if (req.method === "OPTIONS") {
        res.status(204).send("");
        return;
    }

    if (req.method !== "POST") {
        res.status(405).send("Method Not Allowed");
        return;
    }

    const { sosId, sosToken, summary } = req.body || {};

    if (!sosId || !sosToken) {
        logger.warn("stopSOSWithToken: Missing parameters", { sosId, hasToken: !!sosToken });
        res.status(400).send("Missing required parameters");
        return;
    }

    try {
        const sessionRef = db.collection("sos_sessions").doc(sosId);
        const sessionDoc = await sessionRef.get();
        const sessionData = sessionDoc.data();

        if (!sessionData || !sessionData.isActive || sessionData.token !== sosToken) {
            res.status(401).send("Invalid or expired SOS token");
            return;
        }

        const sosRef = db.collection("sos_events").doc(sosId);
        await db.runTransaction(async (transaction) => {
            transaction.update(sosRef, {
                "status.resolved": true,
                resolvedAt: admin.firestore.FieldValue.serverTimestamp(),
                resolutionSummary: summary || "Cancelled by user (Token)",
                timeline: admin.firestore.FieldValue.arrayUnion({
                    time: Date.now(),
                    action: "Cancelled by User (Token)",
                    by: sessionData.userId,
                    note: "SOS stopped via local token (unauthenticated)"
                })
            });

            transaction.update(sessionRef, {
                isActive: false,
                stoppedAt: admin.firestore.FieldValue.serverTimestamp()
            });
        });

        logger.info("stopSOSWithToken: Success", { sosId });
        res.status(200).send({ success: true });
    } catch (error: any) {
        logger.error("stopSOSWithToken: Failure", { error: error.message });
        res.status(500).send("Internal Server Error");
    }
});
