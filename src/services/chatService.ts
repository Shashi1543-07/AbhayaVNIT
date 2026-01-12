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
    arrayUnion
} from 'firebase/firestore';

export interface ChatMessage {
    id: string;
    senderId: string;
    senderRole: string;
    senderName?: string;
    text: string;
    timestamp: any;
    status: 'sent' | 'delivered' | 'seen';
    readBy?: { [uid: string]: boolean };
    deletedFor?: string[];
    deletedGlobal?: boolean;
    type?: 'text' | 'image' | 'video' | 'audio' | 'document' | 'location';
    mediaUrl?: string;
    audioUrl?: string; // For backward compatibility
    mediaName?: string;
    duration?: number;
    location?: {
        latitude: number;
        longitude: number;
        address?: string;
    };
    isSystemMessage?: boolean;
    replyTo?: {
        id: string;
        text: string;
        senderName: string;
    };
    reactions?: { [uid: string]: string };
    isEdited?: boolean;
    editedAt?: any;
}

export interface Conversation {
    id: string;
    type: 'sos' | 'safe_walk' | 'manual';
    participants: { [uid: string]: boolean };
    participantIds: string[]; // For efficient array-contains indexing
    participantRoles: {
        [uid: string]: string;
    };
    participantNames: {
        [uid: string]: string;
    };
    lastMessage: string;
    lastMessageAt: any;
    createdAt: any;
    typing?: { [uid: string]: boolean };
    metadata?: any;
}

export const chatService = {
    /**
     * Create or Get existing conversation
     * @param type - Type of chat
     * @param participants - List of profile objects {uid, name, role}
     * @param customId - Optional deterministic ID (e.g. sos_123)
     */
    createConversation: async (
        type: 'sos' | 'safe_walk' | 'manual',
        participantProfiles: { uid: string; name: string; role: string }[],
        customId?: string
    ) => {
        try {
            const participants: { [uid: string]: boolean } = {};
            const participantIds: string[] = [];
            const participantRoles: { [uid: string]: string } = {};
            const participantNames: { [uid: string]: string } = {};

            participantProfiles.forEach(p => {
                participants[p.uid] = true;
                participantIds.push(p.uid);
                participantRoles[p.uid] = p.role;
                participantNames[p.uid] = p.name;
            });

            // Generate deterministic ID for manual chats if not provided
            let finalId = customId;
            if (!finalId && type === 'manual') {
                // Sort UIDs to ensure A->B and B->A produce the same ID
                const uids = Object.keys(participants).sort();
                finalId = `manual_${uids.join('_')}`;
            }

            const conversationId = finalId || doc(collection(db, 'conversations')).id;
            const conversationRef = doc(db, 'conversations', conversationId);

            const initialData: Omit<Conversation, 'id'> = {
                type,
                participants,
                participantIds,
                participantRoles,
                participantNames,
                lastMessage: 'Chat started',
                lastMessageAt: serverTimestamp(),
                createdAt: serverTimestamp()
            };

            const docSnap = await getDoc(conversationRef);

            if (!docSnap.exists()) {
                await setDoc(conversationRef, initialData);
            } else {
                // If it exists, update metadata in case names/roles changed
                await updateDoc(conversationRef, {
                    participantRoles,
                    participantNames,
                    participantIds,
                    participants // Ensure all participants are added
                });
            }

            return conversationId;
        } catch (error) {
            console.error("Error creating conversation:", error);
            throw error;
        }
    },

    sendMessage: async (
        conversationId: string,
        text: string,
        user: any,
        type: ChatMessage['type'] = 'text',
        mediaData?: { url?: string, name?: string, duration?: number, location?: ChatMessage['location'] },
        replyTo?: ChatMessage['replyTo']
    ) => {
        try {
            if (!text.trim() && !mediaData) return;

            const messageData: any = {
                senderId: user.uid,
                senderRole: user.role || 'student',
                senderName: user.name || user.displayName || 'Unknown',
                text: text.trim(),
                timestamp: serverTimestamp(),
                status: 'sent' as const,
                readBy: { [user.uid]: true },
                deletedFor: [],
                deletedGlobal: false,
                type
            };

            if (mediaData) {
                if (mediaData.url) messageData.mediaUrl = mediaData.url;
                if (mediaData.name) messageData.mediaName = mediaData.name;
                if (mediaData.duration) messageData.duration = mediaData.duration;
                if (mediaData.location) messageData.location = mediaData.location;
            }

            if (replyTo) {
                messageData.replyTo = replyTo;
            }

            // 1. Add to sub-collection
            const messagesRef = collection(db, 'conversations', conversationId, 'messages');
            await addDoc(messagesRef, messageData);

            // 2. Update parent conversation
            const conversationRef = doc(db, 'conversations', conversationId);
            let displayMsg = text.trim();
            if (!displayMsg) {
                if (type === 'image') displayMsg = '📷 Photo';
                else if (type === 'video') displayMsg = '🎥 Video';
                else if (type === 'audio') displayMsg = '🎤 Voice message';
                else if (type === 'document') displayMsg = '📄 Document';
                else if (type === 'location') displayMsg = '📍 Location';
            }

            await updateDoc(conversationRef, {
                lastMessage: displayMsg,
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
            where('participantIds', 'array-contains', userId),
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
    },

    /**
     * Delete message for me or for everyone
     */
    deleteMessage: async (
        conversationId: string,
        messageId: string,
        userId: string,
        type: 'me' | 'everyone'
    ) => {
        try {
            const messageRef = doc(db, 'conversations', conversationId, 'messages', messageId);

            if (type === 'me') {
                // Add user to deletedFor array using arrayUnion for safety
                await updateDoc(messageRef, {
                    deletedFor: arrayUnion(userId)
                });
            } else {
                // Delete for everyone
                await updateDoc(messageRef, {
                    deletedGlobal: true,
                    text: '' // Clear the text
                });
            }
        } catch (error) {
            console.error("Error deleting message:", error);
            throw error;
        }
    },

    /**
     * Mark messages as delivered or seen
     */
    updateMessageStatus: async (
        conversationId: string,
        messageIds: string[],
        status: 'delivered' | 'seen'
    ) => {
        try {
            const promises = messageIds.map(messageId => {
                const messageRef = doc(db, 'conversations', conversationId, 'messages', messageId);
                return updateDoc(messageRef, { status });
            });
            await Promise.all(promises);
        } catch (error) {
            console.error("Error updating message status:", error);
        }
    },

    /**
     * Mark messages as seen for a specific user
     */
    markMessagesAsSeen: async (
        conversationId: string,
        messages: ChatMessage[],
        userId: string
    ) => {
        try {
            const unseenMessages = messages.filter(
                msg => msg.senderId !== userId && !msg.readBy?.[userId]
            );

            const promises = unseenMessages.map(msg => {
                const messageRef = doc(db, 'conversations', conversationId, 'messages', msg.id);
                return updateDoc(messageRef, {
                    [`readBy.${userId}`]: true,
                    status: 'seen'
                });
            });

            await Promise.all(promises);
        } catch (error) {
            console.error("Error marking messages as seen:", error);
        }
    },

    /**
     * Set typing status
     */
    setTypingStatus: async (
        conversationId: string,
        userId: string,
        isTyping: boolean
    ) => {
        try {
            const typingRef = doc(db, 'conversations', conversationId, 'typing', userId);
            if (isTyping) {
                await setDoc(typingRef, {
                    isTyping: true,
                    timestamp: serverTimestamp()
                });
            } else {
                await setDoc(typingRef, {
                    isTyping: false,
                    timestamp: serverTimestamp()
                });
            }
        } catch (error) {
            console.error("Error setting typing status:", error);
        }
    },

    /**
     * Subscribe to typing status
     */
    subscribeToTypingStatus: (
        conversationId: string,
        currentUserId: string,
        callback: (isTyping: boolean, typerName?: string) => void
    ) => {
        const typingRef = collection(db, 'conversations', conversationId, 'typing');
        return onSnapshot(typingRef, (snapshot) => {
            const typingUsers = snapshot.docs
                .filter(doc => doc.id !== currentUserId && doc.data().isTyping === true)
                .map(doc => doc.id);

            callback(typingUsers.length > 0);
        });
    },

    /**
     * Upload voice note (placeholder - requires Firebase Storage setup)
     */
    /**
     * Send a voice note
     */
    sendVoiceNote: async (conversationId: string, audioBlob: Blob, duration: number, user: any) => {
        try {
            // For now, using DataURL placeholder
            const reader = new FileReader();
            const audioUrl = await new Promise<string>((resolve) => {
                reader.onloadend = () => resolve(reader.result as string);
                reader.readAsDataURL(audioBlob);
            });

            await chatService.sendMessage(conversationId, '', user, 'audio', {
                url: audioUrl,
                duration
            });
        } catch (error) {
            console.error("Error sending voice note:", error);
            throw error;
        }
    },

    /**
     * Add or update reaction to a message
     */
    addReaction: async (conversationId: string, messageId: string, userId: string, emoji: string) => {
        try {
            const messageRef = doc(db, 'conversations', conversationId, 'messages', messageId);
            await updateDoc(messageRef, {
                [`reactions.${userId}`]: emoji
            });
        } catch (error) {
            console.error("Error adding reaction:", error);
        }
    },

    /**
     * Edit a message's text
     */
    editMessage: async (conversationId: string, messageId: string, newText: string) => {
        try {
            const messageRef = doc(db, 'conversations', conversationId, 'messages', messageId);
            await updateDoc(messageRef, {
                text: newText,
                isEdited: true,
                editedAt: serverTimestamp()
            });
        } catch (error) {
            console.error("Error editing message:", error);
            throw error;
        }
    },

    /**
     * Presence Tracking: Update user's last seen / online status
     */
    updateUserPresence: async (userId: string) => {
        try {
            const userRef = doc(db, 'users', userId);
            await updateDoc(userRef, {
                lastSeen: serverTimestamp(),
                isOnline: true
            });
        } catch (error) {
            console.error("Error updating presence:", error);
        }
    },

    /**
     * Set user to offline
     */
    setUserOffline: async (userId: string) => {
        try {
            const userRef = doc(db, 'users', userId);
            await updateDoc(userRef, {
                isOnline: false,
                lastSeen: serverTimestamp()
            });
        } catch (error) {
            console.error("Error setting offline:", error);
        }
    },

    /**
     * Subscribe to user's presence
     */
    subscribeToPresence: (userId: string, callback: (presence: { isOnline: boolean, lastSeen: any }) => void) => {
        const userRef = doc(db, 'users', userId);
        return onSnapshot(userRef, (doc) => {
            if (doc.exists()) {
                const data = doc.data();
                callback({
                    isOnline: data.isOnline || false,
                    lastSeen: data.lastSeen
                });
            }
        });
    }
};
