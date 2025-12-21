import { db } from '../lib/firebase';
import {
    collection,
    doc,
    setDoc,
    addDoc,
    query,
    where,
    orderBy,
    onSnapshot,
    serverTimestamp,
    updateDoc,
    getDoc,
    limit,
    Timestamp
} from 'firebase/firestore';

export interface ChatMessage {
    id: string;
    senderId: string;
    senderRole: string;
    text: string;
    timestamp: any;
    readBy?: { [uid: string]: boolean };
}

export interface Conversation {
    id: string;
    type: 'sos' | 'safe_walk' | 'manual';
    participants: { [uid: string]: boolean };
    participantRoles: {
        student?: string;
        warden?: string;
        security?: string;
        [key: string]: string | undefined;
    };
    lastMessage: string;
    lastMessageAt: any;
    createdAt: any;
}

export const chatService = {
    /**
     * Create or Get existing conversation
     * @param type - Type of chat
     * @param participants - Map of UIDs to true
     * @param participantRoles - Roles map for UI display
     * @param customId - Optional deterministic ID (e.g. sos_123)
     */
    createConversation: async (
        type: 'sos' | 'safe_walk' | 'manual',
        participants: { [uid: string]: boolean },
        participantRoles: { [role: string]: string },
        customId?: string
    ) => {
        try {
            // Generate deterministic ID for manual chats if not provided
            let finalId = customId;
            if (!finalId && type === 'manual') {
                // Sort UIDs to ensure A->B and B->A produce the same ID
                const uids = Object.keys(participants).sort();
                finalId = `manual_${uids.join('_')}`;
            }

            // Use custom ID if provided (for SOS/Walk/Manual), otherwise auto-gen (fallback)
            const conversationId = finalId || doc(collection(db, 'conversations')).id;
            const conversationRef = doc(db, 'conversations', conversationId);

            const initialData: Omit<Conversation, 'id'> = {
                type,
                participants,
                participantRoles,
                lastMessage: 'Chat started',
                lastMessageAt: serverTimestamp(),
                createdAt: serverTimestamp()
            };

            if (!customId) {
                // Manual chat: Create directly.
                await setDoc(conversationRef, initialData);
                return conversationId;
            }

            // For Custom IDs (SOS/Walk), we must check if it exists to merge/update
            try {
                const docSnap = await getDoc(conversationRef);

                if (!docSnap.exists()) {
                    await setDoc(conversationRef, initialData);
                } else {
                    // Update existing
                    await updateDoc(conversationRef, {
                        participants: participants,
                        participantRoles: participantRoles
                    });
                }
            } catch (error: any) {
                // If getDoc fails (e.g. permission denied because we aren't in it yet), try to set/merge
                // If it doesn't exist, setDoc works (create)
                // If it does exist, we might be trying to join. 
                // However, without 'merge', setDoc overwrites. With 'merge', it updates.
                // Safest for 'Join' flow without read permission is setDoc with merge, BUT we don't want to overwrite createdAt.

                // For now, let's assume if we can't read it, we try to Create/Overwrite it if it's SOS (re-trigger)
                // Or use updateDoc to join?

                if (error.code === 'permission-denied') {
                    console.log("Permission denied reading chat, attempting to create/join blindly...");
                    // Try setting with merge = true to add ourselves without destroying data
                    await setDoc(conversationRef, {
                        ...initialData,
                        // Don't overwrite createdAt if it exists (merge handles this? No, setDoc merge overwrites provided fields)
                        // We only really want to update participants.
                        participants,
                        participantRoles
                    }, { merge: true });
                } else {
                    throw error;
                }
            }

            return conversationId;
        } catch (error) {
            console.error("Error creating conversation:", error);
            throw error;
        }
    },

    /**
     * Send a message to a sub-collection
     */
    sendMessage: async (conversationId: string, text: string, user: any) => {
        try {
            if (!text.trim()) return;

            const messageData = {
                senderId: user.uid,
                senderRole: user.role || 'student',
                text: text.trim(),
                timestamp: serverTimestamp(),
                readBy: { [user.uid]: true }
            };

            // 1. Add to sub-collection
            const messagesRef = collection(db, 'conversations', conversationId, 'messages');
            await addDoc(messagesRef, messageData);

            // 2. Update parent conversation
            const conversationRef = doc(db, 'conversations', conversationId);
            await updateDoc(conversationRef, {
                lastMessage: text.trim(),
                lastMessageAt: serverTimestamp()
            });

        } catch (error) {
            console.error("Error sending message:", error);
            throw error;
        }
    },

    /**
     * Listen to active conversations for a user
     */
    subscribeToConversations: (userId: string, callback: (chats: Conversation[]) => void) => {
        // Query must match security rules: request.auth.uid in resource.data.participants
        // So we MUST include this filter in the query.
        const q = query(
            collection(db, 'conversations'),
            where(`participants.${userId}`, '==', true),
            orderBy('lastMessageAt', 'desc'),
            limit(50)
        );

        return onSnapshot(q, (snapshot) => {
            const conversations = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            } as Conversation));

            callback(conversations);
        }, (error) => {
            console.error("Error subscribing to conversations:", error);
            // Fallback for index error or permission
            if (error.code === 'failed-precondition') {
                console.warn("Index might be missing. Try creating a composite index for participants.{uid} + lastMessageAt");
            }
        });
    },

    /**
     * Listen to messages in a conversation
     */
    subscribeToMessages: (conversationId: string, callback: (messages: ChatMessage[]) => void) => {
        const q = query(
            collection(db, 'conversations', conversationId, 'messages'),
            orderBy('timestamp', 'asc'),
            limit(100)
        );

        return onSnapshot(q, (snapshot) => {
            const messages = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as ChatMessage[];
            callback(messages);
        });
    },

    /**
     * Get single conversation details
     */
    subscribeToConversationDetails: (conversationId: string, callback: (chat: Conversation | null) => void) => {
        const ref = doc(db, 'conversations', conversationId);
        return onSnapshot(ref, (doc) => {
            if (doc.exists()) {
                callback({ id: doc.id, ...doc.data() } as Conversation);
            } else {
                callback(null);
            }
        });
    }
};
