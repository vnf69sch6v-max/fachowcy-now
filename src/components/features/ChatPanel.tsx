"use client";

/**
 * Chat Panel Component
 * 
 * Real-time messaging panel for FachowcyNow.
 * - Lista konwersacji
 * - Podgląd wiadomości
 * - Wysyłanie wiadomości
 */

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    X,
    Send,
    MessageCircle,
    ChevronLeft,
    User,
    Check,
    CheckCheck,
    Loader2
} from "lucide-react";
import {
    collection,
    query,
    where,
    orderBy,
    limit,
    onSnapshot,
    addDoc,
    updateDoc,
    doc,
    serverTimestamp,
    Timestamp
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";

// ===========================================
// TYPES
// ===========================================

interface ChatMessage {
    id: string;
    senderId: string;
    content: string;
    createdAt: Timestamp;
    isRead: boolean;
}

interface ChatConversation {
    id: string;
    participantIds: string[];
    participantNames: Record<string, string>;
    lastMessage: string;
    lastMessageAt: Timestamp;
    unreadCount: number;
}

// ===========================================
// CHAT PANEL
// ===========================================

interface ChatPanelProps {
    isOpen: boolean;
    onClose: () => void;
}

export function ChatPanel({ isOpen, onClose }: ChatPanelProps) {
    const { user } = useAuth();
    const [conversations, setConversations] = useState<ChatConversation[]>([]);
    const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [newMessage, setNewMessage] = useState("");
    const [isLoading, setIsLoading] = useState(true);
    const [isSending, setIsSending] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Fetch conversations
    useEffect(() => {
        if (!user || !db || !isOpen) return;

        const q = query(
            collection(db, "chats"),
            where("participantIds", "array-contains", user.uid),
            orderBy("lastMessageAt", "desc"),
            limit(20)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const convos: ChatConversation[] = [];
            snapshot.forEach((doc) => {
                convos.push({ id: doc.id, ...doc.data() } as ChatConversation);
            });
            setConversations(convos);
            setIsLoading(false);
        }, (error) => {
            console.error("Error fetching chats:", error);
            setIsLoading(false);
        });

        return () => unsubscribe();
    }, [user, isOpen]);

    // Fetch messages for selected chat
    useEffect(() => {
        if (!selectedChatId || !db) return;

        const q = query(
            collection(db, "chats", selectedChatId, "messages"),
            orderBy("createdAt", "asc"),
            limit(100)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const msgs: ChatMessage[] = [];
            snapshot.forEach((doc) => {
                msgs.push({ id: doc.id, ...doc.data() } as ChatMessage);
            });
            setMessages(msgs);
            scrollToBottom();
        });

        return () => unsubscribe();
    }, [selectedChatId]);

    const scrollToBottom = () => {
        setTimeout(() => {
            messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
        }, 100);
    };

    const handleSendMessage = async () => {
        if (!newMessage.trim() || !selectedChatId || !user || !db || isSending) return;

        setIsSending(true);
        const messageContent = newMessage.trim();
        setNewMessage("");

        try {
            // Add message to subcollection
            await addDoc(collection(db, "chats", selectedChatId, "messages"), {
                senderId: user.uid,
                content: messageContent,
                createdAt: serverTimestamp(),
                isRead: false
            });

            // Update last message in chat
            await updateDoc(doc(db, "chats", selectedChatId), {
                lastMessage: messageContent,
                lastMessageAt: serverTimestamp()
            });
        } catch (error) {
            console.error("Error sending message:", error);
            setNewMessage(messageContent); // Restore message on error
        } finally {
            setIsSending(false);
        }
    };

    const getOtherParticipantName = (convo: ChatConversation): string => {
        if (!user) return "Użytkownik";
        const otherId = convo.participantIds.find(id => id !== user.uid);
        return convo.participantNames?.[otherId || ""] || "Użytkownik";
    };

    const formatTime = (timestamp: Timestamp | null): string => {
        if (!timestamp) return "";
        const date = timestamp.toDate();
        const now = new Date();
        const diff = now.getTime() - date.getTime();

        if (diff < 60000) return "teraz";
        if (diff < 3600000) return `${Math.floor(diff / 60000)} min`;
        if (diff < 86400000) return date.toLocaleTimeString("pl-PL", { hour: "2-digit", minute: "2-digit" });
        return date.toLocaleDateString("pl-PL", { day: "numeric", month: "short" });
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
                    onClick={onClose}
                >
                    <motion.div
                        initial={{ x: "100%" }}
                        animate={{ x: 0 }}
                        exit={{ x: "100%" }}
                        transition={{ type: "spring", damping: 25, stiffness: 200 }}
                        className="absolute right-0 top-0 bottom-0 w-full max-w-md bg-slate-900 border-l border-white/10 shadow-2xl"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between p-4 border-b border-white/10">
                            {selectedChatId ? (
                                <button
                                    onClick={() => setSelectedChatId(null)}
                                    className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
                                >
                                    <ChevronLeft className="w-5 h-5" />
                                    <span>Wróć</span>
                                </button>
                            ) : (
                                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                                    <MessageCircle className="w-5 h-5 text-indigo-400" />
                                    Wiadomości
                                </h2>
                            )}
                            <button
                                onClick={onClose}
                                className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-hidden h-[calc(100%-60px)]">
                            {!selectedChatId ? (
                                // Conversation List
                                <div className="h-full overflow-y-auto">
                                    {isLoading ? (
                                        <div className="flex items-center justify-center h-32">
                                            <Loader2 className="w-6 h-6 animate-spin text-indigo-400" />
                                        </div>
                                    ) : conversations.length === 0 ? (
                                        <div className="text-center py-12 px-4">
                                            <MessageCircle className="w-12 h-12 mx-auto text-slate-600 mb-3" />
                                            <p className="text-slate-500">Brak wiadomości</p>
                                            <p className="text-xs text-slate-600 mt-1">
                                                Zaakceptuj zlecenie, aby rozpocząć rozmowę
                                            </p>
                                        </div>
                                    ) : (
                                        conversations.map((convo) => (
                                            <button
                                                key={convo.id}
                                                onClick={() => setSelectedChatId(convo.id)}
                                                className="w-full p-4 flex items-center gap-3 hover:bg-white/5 transition-colors border-b border-white/5"
                                            >
                                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center text-white font-bold text-sm">
                                                    {getOtherParticipantName(convo).charAt(0)}
                                                </div>
                                                <div className="flex-1 text-left min-w-0">
                                                    <p className="text-white font-medium truncate">
                                                        {getOtherParticipantName(convo)}
                                                    </p>
                                                    <p className="text-slate-500 text-sm truncate">
                                                        {convo.lastMessage}
                                                    </p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-xs text-slate-600">
                                                        {formatTime(convo.lastMessageAt)}
                                                    </p>
                                                    {convo.unreadCount > 0 && (
                                                        <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-indigo-500 text-[10px] font-bold text-white mt-1">
                                                            {convo.unreadCount}
                                                        </span>
                                                    )}
                                                </div>
                                            </button>
                                        ))
                                    )}
                                </div>
                            ) : (
                                // Chat Messages
                                <div className="flex flex-col h-full">
                                    <div className="flex-1 overflow-y-auto p-4 space-y-3">
                                        {messages.map((msg) => {
                                            const isOwn = msg.senderId === user?.uid;
                                            return (
                                                <div
                                                    key={msg.id}
                                                    className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
                                                >
                                                    <div
                                                        className={`max-w-[80%] rounded-2xl px-4 py-2 ${isOwn
                                                                ? 'bg-gradient-to-r from-indigo-500 to-violet-500 text-white'
                                                                : 'bg-slate-800 text-slate-200'
                                                            }`}
                                                    >
                                                        <p className="text-sm">{msg.content}</p>
                                                        <div className={`flex items-center gap-1 mt-1 ${isOwn ? 'justify-end' : ''}`}>
                                                            <span className="text-[10px] opacity-60">
                                                                {formatTime(msg.createdAt)}
                                                            </span>
                                                            {isOwn && (
                                                                msg.isRead
                                                                    ? <CheckCheck className="w-3 h-3 opacity-60" />
                                                                    : <Check className="w-3 h-3 opacity-60" />
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                        <div ref={messagesEndRef} />
                                    </div>

                                    {/* Input */}
                                    <div className="p-4 border-t border-white/10">
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="text"
                                                value={newMessage}
                                                onChange={(e) => setNewMessage(e.target.value)}
                                                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                                                placeholder="Napisz wiadomość..."
                                                className="flex-1 bg-slate-800/50 border border-white/10 rounded-full px-4 py-3 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-indigo-500/50"
                                            />
                                            <button
                                                onClick={handleSendMessage}
                                                disabled={!newMessage.trim() || isSending}
                                                className="w-10 h-10 rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 flex items-center justify-center text-white disabled:opacity-50 disabled:cursor-not-allowed hover:from-indigo-600 hover:to-violet-600 transition-all"
                                            >
                                                {isSending ? (
                                                    <Loader2 className="w-4 h-4 animate-spin" />
                                                ) : (
                                                    <Send className="w-4 h-4" />
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}

// ===========================================
// CHAT TRIGGER BUTTON
// ===========================================

interface ChatTriggerProps {
    onClick: () => void;
    unreadCount?: number;
}

export function ChatTrigger({ onClick, unreadCount = 0 }: ChatTriggerProps) {
    return (
        <button
            onClick={onClick}
            className="relative w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center text-white shadow-lg shadow-indigo-500/30 hover:scale-105 transition-transform"
        >
            <MessageCircle className="w-5 h-5" />
            {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 text-[10px] font-bold flex items-center justify-center">
                    {unreadCount > 9 ? '9+' : unreadCount}
                </span>
            )}
        </button>
    );
}
