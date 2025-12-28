import { db } from "./firebase";
import {
    collection,
    query,
    orderBy,
    onSnapshot,
    serverTimestamp,
    limit,
    Firestore,
    where,
    doc,
    updateDoc,
    increment,
    setDoc
} from "firebase/firestore";

// ===========================================
// TYPES
// ===========================================

export interface Chat {
    id: string;
    jobId?: string;
    jobTitle?: string;
    clientId: string;
    clientName: string;
    professionalId?: string;
    professionalName?: string;
    participantIds: string[];
    lastMessage: string;
    lastMessageAt: any;
    unreadCount: {
        client: number;
        professional: number;
    };
    status: 'open' | 'negotiating' | 'accepted' | 'completed';
    createdAt: any;
}

export interface Message {
    id: string;
    content: string;
    senderId: string;
    senderName: string;
    senderRole: 'client' | 'professional' | 'system';
    type: 'text' | 'proposal' | 'system';
    createdAt: any;
    proposalData?: {
        price: number;
        message: string;
        providerId: string;
    };
}

// ===========================================
// SIMPLIFIED CHAT SERVICE
// ===========================================

export const ChatService = {
    /**
     * Subscribe to user's chat list (real-time)
     */
    subscribeToUserChats: (userId: string, callback: (chats: Chat[]) => void) => {
        if (!db) {
            callback([]);
            return () => { };
        }

        const q = query(
            collection(db as Firestore, "chats"),
            where("participantIds", "array-contains", userId),
            orderBy("lastMessageAt", "desc"),
            limit(50)
        );

        return onSnapshot(q, (snapshot) => {
            const chats = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            } as Chat));
            callback(chats);
        }, (error) => {
            console.error("Error fetching chats:", error);
            callback([]);
        });
    },

    /**
     * Subscribe to messages in a specific chat (real-time)
     */
    subscribeToMessages: (chatId: string, callback: (messages: Message[]) => void) => {
        if (!db) {
            callback([]);
            return () => { };
        }

        const q = query(
            collection(db as Firestore, `chats/${chatId}/messages`),
            orderBy("createdAt", "asc"),
            limit(100)
        );

        return onSnapshot(q, (snapshot) => {
            const messages = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            } as Message));
            callback(messages);
        }, (error) => {
            console.error("Error fetching messages:", error);
            callback([]);
        });
    },

    /**
     * Send a message to a chat
     * Step 1: Add message (always succeeds if auth + senderId match)
     * Step 2: Try to update chat metadata (may fail if user not in participantIds yet)
     */
    sendMessage: async (
        chatId: string,
        message: {
            content: string;
            senderId: string;
            senderName: string;
            senderRole: 'client' | 'professional';
        }
    ) => {
        if (!db) return null;

        // Ensure senderRole has a valid value
        const role = message.senderRole === 'professional' ? 'professional' : 'client';

        try {
            // Step 1: Add message - this should always work with proper rules
            const msgRef = doc(collection(db as Firestore, `chats/${chatId}/messages`));
            await setDoc(msgRef, {
                id: msgRef.id,
                content: message.content,
                senderId: message.senderId,
                senderName: message.senderName,
                senderRole: role,
                type: 'text',
                createdAt: serverTimestamp()
            });

            // Step 2: Try to update chat metadata (may fail if user not in participantIds)
            try {
                const otherRole = role === 'client' ? 'professional' : 'client';
                await updateDoc(doc(db as Firestore, 'chats', chatId), {
                    lastMessage: message.content.substring(0, 100),
                    lastMessageAt: serverTimestamp(),
                    [`unreadCount.${otherRole}`]: increment(1)
                });
            } catch (updateError) {
                // Chat metadata update failed (user might not be in participantIds yet)
                // This is OK - message was still sent successfully
                console.warn("Could not update chat metadata (user may not be participant yet):", updateError);
            }

            return msgRef.id;
        } catch (error) {
            console.error("Error sending message:", error);
            return null;
        }
    },

    /**
     * Mark chat as read for a specific role
     */
    markAsRead: async (chatId: string, role: 'client' | 'professional') => {
        if (!db) return;

        try {
            await updateDoc(doc(db as Firestore, 'chats', chatId), {
                [`unreadCount.${role}`]: 0
            });
        } catch (error) {
            console.error("Error marking as read:", error);
        }
    },

    /**
     * Get chat metadata (one-time fetch)
     */
    getChatById: (chatId: string, callback: (chat: Chat | null) => void) => {
        if (!db) {
            callback(null);
            return () => { };
        }

        return onSnapshot(doc(db as Firestore, 'chats', chatId), (snapshot) => {
            if (snapshot.exists()) {
                callback({ id: snapshot.id, ...snapshot.data() } as Chat);
            } else {
                callback(null);
            }
        });
    }
};
