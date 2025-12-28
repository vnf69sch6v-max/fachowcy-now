"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ChatService } from "@/lib/chat-service";
import { ChatRoom } from "@/types/chat";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";
import { Loader2, MessageSquare, Briefcase } from "lucide-react";

interface ChatListProps {
    onSelectChat?: (chatId: string) => void;
    selectedChatId?: string | null;
}

// Simple formatter since date-fns might be missing
function formatTimeAgo(date: any) {
    if (!date) return '';
    try {
        const d = date instanceof Date ? date : date.toDate();
        const diff = (new Date().getTime() - d.getTime()) / 1000;

        if (diff < 60) return 'teraz';
        if (diff < 3600) return `${Math.floor(diff / 60)}m temu`;
        if (diff < 86400) return `${Math.floor(diff / 3600)}h temu`;
        return `${Math.floor(diff / 86400)}d temu`;
    } catch (e) {
        return '';
    }
}

export function ChatList({ onSelectChat, selectedChatId }: ChatListProps) {
    const { user, userRole } = useAuth();
    const [chats, setChats] = useState<ChatRoom[]>([]);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        if (!user) return;

        const unsubscribe = ChatService.getChatsForUser(user.uid, (updatedChats) => {
            setChats(updatedChats);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [user]);

    const handleChatClick = (chat: ChatRoom) => {
        if (onSelectChat) {
            onSelectChat(chat.id);
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (chats.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-64 text-muted-foreground p-4 text-center">
                <MessageSquare className="h-12 w-12 mb-3 opacity-20" />
                <p>Brak wiadomości.</p>
                <p className="text-sm">Twoje konwersacje pojawią się tutaj.</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-1 w-full max-w-md mx-auto">
            {chats.map((chat) => {
                const isSelected = selectedChatId === chat.id;

                // Determine other party details
                const otherName = userRole === 'client' ? chat.professionalName : chat.clientName;
                const otherImage = userRole === 'client' ? chat.professionalImageUrl : chat.clientImageUrl;

                // Get unread count for current user
                const unreadCount = userRole === 'client'
                    ? chat.unreadCount?.client
                    : chat.unreadCount?.professional;

                return (
                    <button
                        key={chat.id}
                        onClick={() => handleChatClick(chat)}
                        className={cn(
                            "flex items-center gap-4 p-4 rounded-xl transition-all duration-200 text-left border",
                            isSelected
                                ? "bg-white/5 border-white/10 shadow-sm"
                                : "bg-transparent border-transparent hover:bg-white/5 hover:border-white/5"
                        )}
                    >
                        <div className="relative">
                            {/* Avatar Fallback */}
                            <div className="h-12 w-12 rounded-full border border-white/10 overflow-hidden bg-slate-800 flex items-center justify-center">
                                {otherImage ? (
                                    <img src={otherImage} alt={otherName} className="h-full w-full object-cover" />
                                ) : (
                                    <span className="text-lg font-bold text-white/50">{otherName?.[0] || "?"}</span>
                                )}
                            </div>
                        </div>

                        <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-start mb-1">
                                <span className={cn(
                                    "font-medium truncate text-white",
                                    unreadCount > 0 ? "font-bold" : ""
                                )}>
                                    {otherName}
                                </span>
                                {chat.lastMessageAt && (
                                    <span className="text-xs text-slate-500 whitespace-nowrap ml-2">
                                        {formatTimeAgo(chat.lastMessageAt)}
                                    </span>
                                )}
                            </div>

                            <div className="flex justify-between items-center">
                                <p className={cn(
                                    "text-sm truncate pr-2 max-w-[200px] text-slate-400",
                                    unreadCount > 0 ? "text-white font-medium" : ""
                                )}>
                                    {chat.lastMessage || "Rozpocznij konwersację"}
                                </p>
                                {unreadCount > 0 && (
                                    <div className="bg-blue-600 text-white text-[10px] font-bold h-5 min-w-[20px] px-1.5 flex items-center justify-center rounded-full">
                                        {unreadCount}
                                    </div>
                                )}
                            </div>

                            {chat.status && chat.status !== 'inquiry' && (
                                <div className="mt-1 flex items-center gap-1.5">
                                    <div className="text-[10px] px-2 py-0.5 rounded-full border border-white/10 bg-white/5 text-slate-300">
                                        {/* Status Label Mapping */}
                                        {chat.status === 'quoted' && 'Wyceniono'}
                                        {chat.status === 'accepted' && 'Zaakceptowano'}
                                        {chat.status === 'in_progress' && 'W trakcie'}
                                        {chat.status === 'completed' && 'Zakończone'}
                                    </div>
                                </div>
                            )}
                        </div>
                    </button>
                );
            })}
        </div>
    );
}
