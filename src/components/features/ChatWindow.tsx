"use client";

import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Send, X, MapPin, CheckCircle, Play, Flag, Clock } from "lucide-react";
import { ChatService, Message } from "@/lib/chat-service";
import { useAuth } from "@/context/AuthContext";

interface ChatWindowProps {
    proId: string;
    proName: string;
    proImage: string;
    onClose: () => void;
}

// Smart Action Buttons based on role
function SmartActionBar({
    userRole,
    onAction
}: {
    userRole: 'client' | 'professional';
    onAction: (action: string, label: string) => void;
}) {
    const clientActions = [
        { id: "share_location", label: "📍 Wyślij lokalizację", icon: MapPin },
        { id: "approve", label: "✅ Zatwierdź", icon: CheckCircle },
    ];

    const proActions = [
        { id: "start_job", label: "▶️ Rozpocznij pracę", icon: Play },
        { id: "complete_job", label: "✅ Zakończ pracę", icon: CheckCircle },
        { id: "report_issue", label: "⚠️ Zgłoś problem", icon: Flag },
    ];

    const actions = userRole === 'client' ? clientActions : proActions;

    return (
        <div className="flex gap-2 overflow-x-auto py-2 px-1 scrollbar-hide">
            {actions.map((action) => (
                <button
                    key={action.id}
                    onClick={() => onAction(action.id, action.label)}
                    className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full text-xs text-slate-300 font-medium transition-all"
                >
                    {action.label}
                </button>
            ))}
        </div>
    );
}

// System message component
function SystemMessage({ text }: { text: string }) {
    return (
        <div className="flex justify-center my-3">
            <div className="px-4 py-1.5 bg-slate-800/50 border border-white/5 rounded-full text-xs text-slate-400 flex items-center gap-2">
                <Clock className="w-3 h-3" />
                {text}
            </div>
        </div>
    );
}

export function ChatWindow({ proId, proName, proImage, onClose }: ChatWindowProps) {
    const { userRole } = useAuth();
    const [messages, setMessages] = useState<Message[]>([]);
    const [inputText, setInputText] = useState("");
    const scrollRef = useRef<HTMLDivElement>(null);

    // Create a unique chat ID for this user-pro pair (simplified for demo)
    const chatId = `demo_chat_${proId}`;

    useEffect(() => {
        const unsubscribe = ChatService.subscribeToChat(chatId, (msgs) => {
            setMessages(msgs);
        });
        return () => unsubscribe();
    }, [chatId]);

    // Auto-scroll on new message
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTo({
                top: scrollRef.current.scrollHeight,
                behavior: 'smooth'
            });
        }
    }, [messages]);

    const handleSend = async (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!inputText.trim()) return;

        const text = inputText;
        setInputText(""); // Optimistic clear
        await ChatService.sendMessage(chatId, text);
    };

    const handleAction = async (actionId: string, label: string) => {
        // Send as system action message
        const systemMessage = label.replace(/[📍✅▶️⚠️]/g, '').trim().toUpperCase();
        await ChatService.sendMessage(chatId, `--- ${systemMessage} ---`, 'system');
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.9 }}
            className="fixed inset-4 md:inset-auto md:bottom-8 md:right-8 md:w-96 md:h-[550px] bg-slate-900/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl flex flex-col overflow-hidden z-50"
        >
            {/* Header */}
            <div className="p-4 border-b border-white/10 flex items-center justify-between bg-slate-800/50">
                <div className="flex items-center gap-3">
                    <div className="relative w-10 h-10">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            src={proImage}
                            alt={proName}
                            className="w-full h-full rounded-full object-cover border border-white/20"
                        />
                        <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border border-slate-900" />
                    </div>
                    <div>
                        <h3 className="font-bold text-white text-sm">{proName}</h3>
                        <p className="text-xs text-green-400">Dostępny teraz</p>
                    </div>
                </div>
                <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors p-2">
                    <X className="w-5 h-5" />
                </button>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3" ref={scrollRef}>
                {messages.length === 0 && (
                    <div className="text-center text-slate-500 text-sm mt-10">
                        Rozpocznij konwersację z {proName}.<br />
                        „Bot" postara się odpisać ;)
                    </div>
                )}

                {messages.map((msg) => {
                    const isMe = msg.senderId === "user";
                    const isSystem = msg.type === 'system';

                    if (isSystem) {
                        return <SystemMessage key={msg.id} text={msg.text} />;
                    }

                    return (
                        <motion.div
                            key={msg.id}
                            initial={{ opacity: 0, x: isMe ? 20 : -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            className={`flex ${isMe ? "justify-end" : "justify-start"}`}
                        >
                            <div className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed
                                ${isMe
                                    ? "bg-blue-600 text-white rounded-br-none"
                                    : "bg-slate-700 text-slate-100 rounded-bl-none"
                                }`}
                            >
                                {msg.text}
                            </div>
                        </motion.div>
                    );
                })}
            </div>

            {/* Smart Action Bar */}
            <div className="px-3 border-t border-white/5">
                <SmartActionBar userRole={userRole} onAction={handleAction} />
            </div>

            {/* Input Area */}
            <form onSubmit={handleSend} className="p-3 border-t border-white/10 bg-slate-800/30">
                <div className="flex items-center gap-2 bg-slate-950/50 rounded-full px-4 py-2.5 border border-white/5 focus-within:border-blue-500/50 transition-colors">
                    <input
                        type="text"
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                        placeholder="Napisz wiadomość..."
                        className="bg-transparent border-none outline-none text-sm text-white flex-1 placeholder:text-slate-500"
                    />
                    <button
                        type="submit"
                        disabled={!inputText.trim()}
                        className="text-blue-500 hover:text-blue-400 disabled:opacity-50 transition-colors p-1"
                    >
                        <Send className="w-4 h-4" />
                    </button>
                </div>
            </form>
        </motion.div>
    );
}

