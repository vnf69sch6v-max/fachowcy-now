"use client";

import { useState } from "react";
import { ChatList } from "./ChatList";
import { ChatWindow } from "./ChatWindow";
import { ChatRoom } from "@/types/chat";
import { useMediaQuery } from "@/hooks/use-media-query";
import { AnimatePresence, motion } from "framer-motion";
import { useAuth } from "@/context/AuthContext"; // Assuming we have this

export function MessagesTab() {
    const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
    const isDesktop = useMediaQuery("(min-width: 768px)");

    return (
        <div className="flex h-full w-full max-w-7xl mx-auto overflow-hidden">
            {/* Chat List Sidebar */}
            <div className={`
                flex-1 flex flex-col h-full bg-background border-r border-border
                ${selectedChatId && !isDesktop ? 'hidden' : 'block'}
                md:max-w-xs lg:max-w-sm
            `}>
                <div className="p-4 border-b border-border bg-card/50 backdrop-blur-sm">
                    <h2 className="text-xl font-bold bg-gradient-to-r from-primary to-purple-400 bg-clip-text text-transparent">
                        Wiadomości
                    </h2>
                </div>
                <div className="flex-1 overflow-y-auto p-2 scrollbar-hide">
                    <ChatList
                        onSelectChat={setSelectedChatId}
                        selectedChatId={selectedChatId}
                    />
                </div>
            </div>

            {/* Chat Window Area */}
            <div className={`
                flex-[2] h-full bg-slate-950/50 relative
                ${!selectedChatId && !isDesktop ? 'hidden' : 'block'}
            `}>
                {selectedChatId ? (
                    // We need to fetch chat details or pass them differently. 
                    // For now, simpler integration: ChatWindow fetches its own data or we just pass ID.
                    // IMPORTANT: The existing ChatWindow takes proId etc props. 
                    // We might need to refactor ChatWindow to accept chatId OR fetch by itself.
                    // For this MVP step, we will use a Wrapper or modify ChatWindow.
                    // Let's assume ChatWindow can handle being mounted with an ID.

                    // Since ChatWindow props are strict (proId, proName...), we need to fetch the chat details here
                    // safely before rendering ChatWindow, OR update ChatWindow to handle "Chat Mode".

                    <ChatWindowWrapper
                        chatId={selectedChatId}
                        onClose={() => setSelectedChatId(null)}
                    />
                ) : (
                    <div className="hidden md:flex flex-col items-center justify-center h-full text-muted-foreground p-8 text-center">
                        <div className="w-64 h-64 bg-slate-900/50 rounded-full flex items-center justify-center mb-6 border border-white/5">
                            <img src="/assets/illustrations/empty-chat.svg" alt="Select chat" className="w-32 h-32 opacity-20" />
                        </div>
                        <h3 className="text-xl font-semibold mb-2">Wybierz konwersację</h3>
                        <p>Wybierz czat z listy po lewej stronie, aby kontynuować rozmowę.</p>
                    </div>
                )}
            </div>
        </div>
    );
}

// Temporary Wrapper to bridge ChatList selection with ChatWindow props
// In a real refactor, ChatWindow should probably just take `chatId` and fetch the rest.
import { doc, getDoc, Firestore } from "firebase/firestore";
import { db } from "@/lib/firebase"; // Make sure to import properly

function ChatWindowWrapper({ chatId, onClose }: { chatId: string, onClose: () => void }) {
    const [chatData, setChatData] = useState<ChatRoom | null>(null);
    const { user, userRole } = useAuth();

    useState(() => {
        const fetchChat = async () => {
            if (!db) return;
            const snap = await getDoc(doc(db as Firestore, "chats", chatId));
            if (snap.exists()) {
                setChatData({ id: snap.id, ...snap.data() } as ChatRoom);
            }
        };
        fetchChat();
    });

    if (!chatData || !user) return <div className="h-full flex items-center justify-center">Ładowanie...</div>;

    const otherId = userRole === 'client' ? chatData.professionalId : chatData.clientId;
    const otherName = userRole === 'client' ? chatData.professionalName : chatData.clientName;
    const otherImage = (userRole === 'client' ? chatData.professionalImageUrl : chatData.clientImageUrl) || '';

    return (
        <ChatWindow
            proId={otherId} // ChatWindow expects proId. If we are Pro, this prop name is confusing but functional if used as "otherUserId"
            proName={otherName}
            proImage={otherImage}
            onClose={onClose}
        />
    );
}
