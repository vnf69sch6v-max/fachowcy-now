"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, X, ArrowLeft, Loader2 } from "lucide-react";
import { ChatService, Chat, Message } from "@/lib/chat-service";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";

interface SimpleChatWindowProps {
    chatId: string;
    onClose: () => void;
}

// Message Bubble Component
function MessageBubble({ message, isOwn }: { message: Message; isOwn: boolean }) {
    const isSystem = message.senderRole === 'system';

    if (isSystem) {
        return (
            <div className="flex justify-center my-4">
                <div className="px-4 py-2 bg-slate-800/50 rounded-full text-xs text-slate-400 max-w-[80%] text-center">
                    {message.content}
                </div>
            </div>
        );
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn("flex", isOwn ? "justify-end" : "justify-start")}
        >
            <div
                className={cn(
                    "max-w-[75%] px-4 py-3 rounded-2xl",
                    isOwn
                        ? "bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-br-md"
                        : "bg-slate-800 text-white rounded-bl-md"
                )}
            >
                {!isOwn && message.senderRole !== 'system' && (
                    <p className="text-xs text-violet-400 font-medium mb-1">
                        {message.senderName || 'Użytkownik'}
                    </p>
                )}
                <p className="text-sm leading-relaxed whitespace-pre-wrap">
                    {message.content}
                </p>
                <p className={cn(
                    "text-[10px] mt-1",
                    isOwn ? "text-white/60" : "text-slate-500"
                )}>
                    {message.createdAt?.toDate?.()?.toLocaleTimeString('pl-PL', {
                        hour: '2-digit',
                        minute: '2-digit'
                    }) || ''}
                </p>
            </div>
        </motion.div>
    );
}

export function SimpleChatWindow({ chatId, onClose }: SimpleChatWindowProps) {
    const { user, userRole } = useAuth();
    const [messages, setMessages] = useState<Message[]>([]);
    const [chat, setChat] = useState<Chat | null>(null);
    const [input, setInput] = useState('');
    const [isSending, setIsSending] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Scroll to bottom on new messages
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // Subscribe to chat metadata
    useEffect(() => {
        const unsubscribe = ChatService.getChatById(chatId, (chatData) => {
            setChat(chatData);
            // Mark as read when opening
            if (chatData && userRole) {
                ChatService.markAsRead(chatId, userRole as 'client' | 'professional');
            }
        });
        return unsubscribe;
    }, [chatId, userRole]);

    // Subscribe to messages
    useEffect(() => {
        const unsubscribe = ChatService.subscribeToMessages(chatId, setMessages);
        return unsubscribe;
    }, [chatId]);

    const handleSend = async () => {
        if (!input.trim() || !user || isSending) return;

        const messageContent = input.trim();
        setInput('');
        setIsSending(true);

        try {
            await ChatService.sendMessage(chatId, {
                content: messageContent,
                senderId: user.uid,
                senderName: user.displayName || 'Użytkownik',
                senderRole: userRole as 'client' | 'professional'
            });
        } catch (error) {
            console.error('Failed to send message:', error);
            setInput(messageContent); // Restore input on error
        } finally {
            setIsSending(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    // Determine other party name
    const otherPartyName = userRole === 'client'
        ? chat?.professionalName || 'Fachowiec'
        : chat?.clientName || 'Klient';

    return (
        <div className="flex flex-col h-full bg-slate-950">
            {/* Header */}
            <div className="flex items-center gap-3 p-4 border-b border-white/10 bg-slate-900/50">
                <button
                    onClick={onClose}
                    className="w-10 h-10 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
                >
                    <ArrowLeft className="w-5 h-5 text-white" />
                </button>

                <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-white truncate">
                        {otherPartyName}
                    </h3>
                    {chat?.jobTitle && (
                        <p className="text-xs text-slate-400 truncate">
                            {chat.jobTitle}
                        </p>
                    )}
                </div>

                <button
                    onClick={onClose}
                    className="w-10 h-10 rounded-xl hover:bg-white/10 flex items-center justify-center transition-colors md:hidden"
                >
                    <X className="w-5 h-5 text-white/70" />
                </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-slate-500">
                        <p className="text-sm">Brak wiadomości</p>
                        <p className="text-xs mt-1">Napisz pierwszą wiadomość!</p>
                    </div>
                ) : (
                    messages.map((msg) => (
                        <MessageBubble
                            key={msg.id}
                            message={msg}
                            isOwn={msg.senderId === user?.uid}
                        />
                    ))
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-4 border-t border-white/10 bg-slate-900/30">
                <div className="flex items-center gap-3">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Napisz wiadomość..."
                        disabled={isSending}
                        className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-violet-500/50 disabled:opacity-50 transition-all"
                    />
                    <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={handleSend}
                        disabled={!input.trim() || isSending}
                        className="w-12 h-12 rounded-xl bg-gradient-to-r from-violet-500 to-indigo-500 hover:from-violet-400 hover:to-indigo-400 disabled:from-slate-700 disabled:to-slate-700 disabled:opacity-50 flex items-center justify-center transition-all shadow-lg shadow-violet-500/20"
                    >
                        {isSending ? (
                            <Loader2 className="w-5 h-5 text-white animate-spin" />
                        ) : (
                            <Send className="w-5 h-5 text-white" />
                        )}
                    </motion.button>
                </div>
            </div>
        </div>
    );
}
