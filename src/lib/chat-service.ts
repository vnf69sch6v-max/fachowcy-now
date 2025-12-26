import { db } from "./firebase";
import {
    collection,
    addDoc,
    query,
    orderBy,
    onSnapshot,
    serverTimestamp,
    limit,
    Firestore
} from "firebase/firestore";

export interface Message {
    id: string;
    text: string;
    senderId: string; // 'user' | 'pro'
    createdAt: object; // Using object to be flexible with serverTimestamp vs Date objects for demo
}

const RESPONSES = [
    "Dzień dobry! Tak, mam wolny termin w ten piątek.",
    "Oczywiście. Jaki jest dokładny adres zlecenia?",
    "Koszt wstępny to około 150zł, ale muszę zobaczyć usterkę na miejscu.",
    "Czy mogę prosić o zdjęcie problemu?",
    "Będę u Pana za około 15 minut."
];

export const ChatService = {
    // Subscribe to real-time messages for a specific conversation
    subscribeToChat: (chatId: string, callback: (messages: Message[]) => void) => {
        if (!db) {
            // Mock mode: return empty or cached
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

    // Send a message from the user
    sendMessage: async (chatId: string, text: string) => {
        if (!db) return; // Mock handling needed differently if strictly offline

        try {
            await addDoc(collection(db as Firestore, "chats", chatId, "messages"), {
                text,
                senderId: "user",
                createdAt: serverTimestamp()
            });

            // Trigger bot response
            ChatService.simulateProResponse(chatId);
        } catch (error) {
            console.error("Error sending message:", error);
        }
    },

    // Simulate a response from the professional (Demo Bot)
    simulateProResponse: (chatId: string) => {
        if (!db) return;

        const delay = 1500 + Math.random() * 2000; // 1.5s - 3.5s delay
        const randomResponse = RESPONSES[Math.floor(Math.random() * RESPONSES.length)];

        setTimeout(async () => {
            try {
                await addDoc(collection(db as Firestore, "chats", chatId, "messages"), {
                    text: randomResponse,
                    senderId: "pro", // ID of the professional (acting as bot)
                    createdAt: serverTimestamp()
                });
            } catch (error) {
                console.error("Bot failed to likely:", error);
            }
        }, delay);
    }
};
