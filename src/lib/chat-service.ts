import { db } from "./firebase";
import {
    collection,
    addDoc,
    query,
    orderBy,
    onSnapshot,
    serverTimestamp,
    limit,
    Firestore,
    where,
    doc,
    updateDoc,
    setDoc,
    getDoc,
    increment
} from "firebase/firestore";
import { ChatRoom, ChatStatus, ChatMessage } from "@/types/chat";

export type MessageType = 'text' | 'system' | 'image';

// Legacy Message interface kept for backward compatibility if needed, 
// but we should migrate provided code to use types/chat.ts
export interface Message {
    id: string;
    text?: string;
    content?: string; // New field
    senderId: string;
    type?: MessageType;
    createdAt: any;
}

export const ChatService = {
    // Generate deterministic Chat ID
    getChatId: (uid1: string, uid2: string) => {
        const sorted = [uid1, uid2].sort();
        return `chat_${sorted[0]}_${sorted[1]}`;
    },

    // Subscribe to real-time messages for a specific conversation
    subscribeToChat: (chatId: string, callback: (messages: Message[]) => void) => {
        if (!db) {
            callback([]);
            return () => { };
        }

        const q = query(
            collection(db as Firestore, "chats", chatId, "messages"),
            orderBy("createdAt", "asc"),
            limit(50)
        );

        return onSnapshot(q, (snapshot) => {
            const messages = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            } as Message));
            callback(messages);
        });
    },

    // Get all chats for a user (ordered by last message)
    getChatsForUser: (userId: string, callback: (chats: ChatRoom[]) => void) => {
        if (!db) return () => { };

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
            } as ChatRoom));
            callback(chats);
        });
    },

    // Mark messages in a chat as read for a specific user
    markAsRead: async (chatId: string, userId: string, userRole: 'client' | 'professional') => {
        if (!db) return;

        try {
            const chatRef = doc(db as Firestore, "chats", chatId);

            // Reset unread count for this user
            const updateField = userRole === 'client' ? 'unreadCount.client' : 'unreadCount.professional';

            await updateDoc(chatRef, {
                [updateField]: 0
            });
        } catch (error) {
            console.error("Error marking chat as read:", error);
        }
    },

    // Create a new chat or returning existing one
    createChat: async (clientId: string, professionalId: string, clientName: string, proName: string, bookingId?: string) => {
        if (!db) return null;

        const chatId = ChatService.getChatId(clientId, professionalId);
        const chatRef = doc(db as Firestore, "chats", chatId);

        try {
            const chatDoc = await getDoc(chatRef);

            if (chatDoc.exists()) {
                return chatId;
            }

            // Create new chat
            const newChat: Partial<ChatRoom> = {
                id: chatId,
                clientId,
                clientName,
                professionalId,
                professionalName: proName,
                participantIds: [clientId, professionalId],
                status: 'inquiry',
                createdAt: serverTimestamp() as any,
                updatedAt: serverTimestamp() as any,
                unreadCount: { client: 0, professional: 0 },
                isActive: true
            };

            if (bookingId) {
                newChat.bookingId = bookingId;
            }

            await setDoc(chatRef, newChat);
            return chatId;
        } catch (error) {
            console.error("Error creating chat:", error);
            return null;
        }
    },

    // Update chat status (e.g. from Deal Widget)
    updateChatStatus: async (chatId: string, status: ChatStatus, extraData?: { date?: Date, amount?: number }) => {
        if (!db) return;

        try {
            const chatRef = doc(db as Firestore, "chats", chatId);
            const update: any = {
                status,
                updatedAt: serverTimestamp()
            };

            if (extraData?.date) update.scheduledDate = extraData.date;
            if (extraData?.amount) update.quotedAmount = extraData.amount;

            await updateDoc(chatRef, update);
        } catch (error) {
            console.error("Error updating chat status:", error);
        }
    },

    // Send a system message (e.g. "Offer accepted")
    sendSystemMessage: async (chatId: string, text: string) => {
        if (!db) return;

        try {
            await addDoc(collection(db as Firestore, "chats", chatId, "messages"), {
                text,
                senderId: 'system',
                senderRole: 'system',
                type: 'system',
                createdAt: serverTimestamp(),
                isSystemMessage: true
            });

            // Update last message
            await updateDoc(doc(db as Firestore, "chats", chatId), {
                lastMessage: text,
                lastMessageAt: serverTimestamp()
            });

        } catch (error) {
            console.error("Error sending system message:", error);
        }
    },

    // Send a message (Updated to match new types)
    sendMessage: async (chatId: string, text: string, senderId: string, senderRole: 'client' | 'professional', type: MessageType = 'text') => {
        if (!db) return;

        try {
            // 1. Add message
            await addDoc(collection(db as Firestore, "chats", chatId, "messages"), {
                content: text, // Using content instead of text to match ChatMessage type
                senderId,
                senderRole,
                type,
                createdAt: serverTimestamp()
            });

            // 2. Update parent chat doc
            const chatRef = doc(db as Firestore, "chats", chatId);

            // Increment unread count for the OTHER party
            const incrementField = senderRole === 'client' ? 'unreadCount.professional' : 'unreadCount.client';

            await updateDoc(chatRef, {
                lastMessage: text,
                lastMessageAt: serverTimestamp(),
                [incrementField]: increment(1)
            });

        } catch (error) {
            console.error("Error sending message:", error);
        }
    }
};
