"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageSquare, Loader2 } from "lucide-react";
import { ChatService, Chat } from "@/lib/chat-service";
import { SimpleChatWindow } from "./SimpleChatWindow";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";

// Format relative time
function formatTimeAgo(timestamp: any): string {
    if (!timestamp) return '';
    try {
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        const diffMs = Date.now() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);

        if (diffMins < 1) return 'teraz';
        if (diffMins < 60) return `${diffMins}m`;
        if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h`;
        return `${Math.floor(diffMins / 1440)}d`;
    } catch {
        return '';
    }
}

// Chat List Item Component
function ChatListItem({
    chat,
    isActive,
    onClick,
    userRole
}: {
    chat: Chat;
    isActive: boolean;
    onClick: () => void;
    userRole: string;
}) {
    const otherName = userRole === 'client'
        ? chat.professionalName || 'Fachowiec'
        : chat.clientName || 'Klient';

    const unreadCount = userRole === 'client'
        ? chat.unreadCount?.client || 0
        : chat.unreadCount?.professional || 0;

    const initial = otherName?.[0]?.toUpperCase() || '?';

    return (
        <motion.button
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            onClick={onClick}
            className={cn(
                "w-full flex items-center gap-3 p-4 transition-all rounded-xl text-left",
                isActive
                    ? "bg-violet-500/20 border border-violet-500/30"
                    : "hover:bg-white/5 border border-transparent"
            )}
        >
            {/* Avatar */}
            <div className={cn(
                "w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold flex-shrink-0",
                isActive
                    ? "bg-gradient-to-br from-violet-500 to-indigo-500 text-white"
                    : "bg-slate-800 text-white/70"
            )}>
                {initial}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                    <h4 className={cn(
                        "font-semibold truncate",
                        unreadCount > 0 ? "text-white" : "text-slate-200"
                    )}>
                        {otherName}
                    </h4>
                    <span className="text-xs text-slate-500 flex-shrink-0">
                        {formatTimeAgo(chat.lastMessageAt)}
                    </span>
                </div>

                {chat.jobTitle && (
                    <p className="text-xs text-violet-400 truncate mb-0.5">
                        {chat.jobTitle}
                    </p>
                )}

                <div className="flex items-center justify-between gap-2">
                    <p className={cn(
                        "text-sm truncate",
                        unreadCount > 0 ? "text-slate-300 font-medium" : "text-slate-500"
                    )}>
                        {chat.lastMessage || 'Brak wiadomości'}
                    </p>

                    {unreadCount > 0 && (
                        <span className="w-5 h-5 rounded-full bg-violet-500 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">
                            {unreadCount > 9 ? '9+' : unreadCount}
                        </span>
                    )}
                </div>
            </div>
        </motion.button>
    );
}

// Empty State Component
function EmptyState() {
    return (
        <div className="flex flex-col items-center justify-center h-full text-slate-500 p-8">
            <div className="w-24 h-24 rounded-full bg-slate-800/50 flex items-center justify-center mb-4">
                <MessageSquare className="w-10 h-10 text-slate-600" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">
                Wybierz konwersację
            </h3>
            <p className="text-sm text-center">
                Wybierz czat z listy po lewej stronie, aby kontynuować rozmowę.
            </p>
        </div>
    );
}

// No Chats State
function NoChatsState() {
    return (
        <div className="flex flex-col items-center justify-center h-64 text-slate-500 p-4">
            <MessageSquare className="w-12 h-12 mb-3 opacity-30" />
            <p className="text-sm font-medium">Brak wiadomości</p>
            <p className="text-xs mt-1 text-center">
                Twoje konwersacje ze zleceniami pojawią się tutaj.
            </p>
        </div>
    );
}

export function MessagesTab() {
    const { user, userRole } = useAuth();
    const [chats, setChats] = useState<Chat[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
    const [isMobileView, setIsMobileView] = useState(false);

    // Check for mobile view
    useEffect(() => {
        const checkMobile = () => setIsMobileView(window.innerWidth < 768);
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    // Subscribe to user's chats
    useEffect(() => {
        if (!user) {
            setLoading(false);
            return;
        }

        setLoading(true);
        const unsubscribe = ChatService.subscribeToUserChats(user.uid, (updatedChats) => {
            setChats(updatedChats);
            setLoading(false);
        });

        return unsubscribe;
    }, [user]);

    // If mobile and chat selected, show only chat
    if (isMobileView && selectedChatId) {
        return (
            <SimpleChatWindow
                chatId={selectedChatId}
                onClose={() => setSelectedChatId(null)}
            />
        );
    }

    return (
        <div className="flex h-full w-full max-w-6xl mx-auto">
            {/* Chat List */}
            <div className={cn(
                "flex flex-col h-full bg-slate-950 border-r border-white/10",
                isMobileView ? "w-full" : "w-80 lg:w-96"
            )}>
                {/* Header */}
                <div className="p-4 border-b border-white/10">
                    <h2 className="text-xl font-bold bg-gradient-to-r from-violet-400 to-indigo-400 bg-clip-text text-transparent">
                        Wiadomości
                    </h2>
                </div>

                {/* Chat List */}
                <div className="flex-1 overflow-y-auto p-2 space-y-1">
                    {loading ? (
                        <div className="flex justify-center items-center h-64">
                            <Loader2 className="w-8 h-8 text-violet-500 animate-spin" />
                        </div>
                    ) : chats.length === 0 ? (
                        <NoChatsState />
                    ) : (
                        chats.map((chat) => (
                            <ChatListItem
                                key={chat.id}
                                chat={chat}
                                isActive={selectedChatId === chat.id}
                                onClick={() => setSelectedChatId(chat.id)}
                                userRole={userRole || 'client'}
                            />
                        ))
                    )}
                </div>
            </div>

            {/* Chat Window (Desktop) */}
            {!isMobileView && (
                <div className="flex-1 h-full">
                    {selectedChatId ? (
                        <SimpleChatWindow
                            chatId={selectedChatId}
                            onClose={() => setSelectedChatId(null)}
                        />
                    ) : (
                        <EmptyState />
                    )}
                </div>
            )}
        </div>
    );
}
