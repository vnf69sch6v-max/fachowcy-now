"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, X, MapPin, CheckCircle, Play, Flag, Clock, Sparkles, Shield, AlertTriangle } from "lucide-react";
import { ChatService, Message } from "@/lib/chat-service";
import { useAuth } from "@/context/AuthContext";
import { TrustScoreRing } from "@/components/ui/TrustScoreRing";
import { cn } from "@/lib/utils";

interface ChatWindowProps {
    proId: string;
    proName: string;
    proImage: string;
    proTrustScore?: number; // Added trust score prop
    onClose: () => void;
}

// ===========================================
// DEAL WIDGET
// ===========================================

const DEAL_STAGES = [
    { id: 'inquiry', label: 'Zapytanie' },
    { id: 'quoted', label: 'Wycena' },
    { id: 'accepted', label: 'Akceptacja' },
    { id: 'in_progress', label: 'W drodze' },
    { id: 'completed', label: 'Gotowe' }
];

function DealWidget({ status = 'inquiry' }: { status?: string }) {
    const currentStageIndex = DEAL_STAGES.findIndex(s => s.id === status);

    return (
        <div className="bg-slate-900/50 p-3 border-b border-white/5">
            <div className="flex justify-between items-center relative">
                {/* Progress Line */}
                <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-slate-700 -z-10" />
                <div
                    className="absolute top-1/2 left-0 h-0.5 bg-blue-500 -z-10 transition-all duration-500"
                    style={{ width: `${(currentStageIndex / (DEAL_STAGES.length - 1)) * 100}%` }}
                />

                {DEAL_STAGES.map((stage, index) => {
                    const isActive = index <= currentStageIndex;
                    const isCurrent = index === currentStageIndex;

                    return (
                        <div key={stage.id} className="flex flex-col items-center gap-1">
                            <div className={cn(
                                "w-2.5 h-2.5 rounded-full border-2 transition-all duration-300",
                                isActive ? "bg-blue-500 border-blue-500" : "bg-slate-900 border-slate-600",
                                isCurrent && "ring-4 ring-blue-500/20 scale-125"
                            )} />
                            <span className={cn(
                                "text-[10px] font-medium transition-colors",
                                isActive ? "text-blue-400" : "text-slate-600"
                            )}>
                                {stage.label}
                            </span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

// ===========================================
// SMART ACTION BAR with AI Chips
// ===========================================

function SmartActionBar({
    userRole,
    onAction,
    suggestedReplies = []
}: {
    userRole: 'client' | 'professional';
    onAction: (action: string, label: string) => void;
    suggestedReplies?: string[];
}) {
    // Default actions
    const defaultActions = userRole === 'client' ? [
        { id: "share_location", label: "📍 Wyślij lokalizację" },
        { id: "approve", label: "✅ Zatwierdź" },
    ] : [
        { id: "quote", label: "💰 Szybka Wycena" },
        { id: "schedule", label: "📅 Zaproponuj Termin" },
    ];

    return (
        <div className="flex flex-col gap-2 py-2">
            {/* AI Smart Chips */}
            {suggestedReplies.length > 0 && (
                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide px-3">
                    <div className="flex items-center gap-1 text-xs font-bold text-indigo-400 shrink-0">
                        <Sparkles className="w-3 h-3" />
                        AI:
                    </div>
                    {suggestedReplies.map((reply, i) => (
                        <button
                            key={i}
                            onClick={() => onAction("ai_reply", reply)}
                            className="shrink-0 px-3 py-1 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 rounded-full text-xs text-indigo-200 transition-colors whitespace-nowrap"
                        >
                            {reply}
                        </button>
                    ))}
                </div>
            )}

            {/* Standard Actions */}
            <div className="flex gap-2 overflow-x-auto px-3 scrollbar-hide">
                {defaultActions.map((action) => (
                    <button
                        key={action.id}
                        onClick={() => onAction(action.id, action.label)}
                        className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full text-xs text-slate-300 font-medium transition-all"
                    >
                        {action.label}
                    </button>
                ))}
            </div>
        </div>
    );
}

// ===========================================
// SECURITY WARNING
// ===========================================

function SecurityWarning({ text }: { text: string }) {
    return (
        <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mx-4 my-2 p-2 bg-amber-500/10 border border-amber-500/20 rounded-lg flex items-start gap-2"
        >
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-200">{text}</p>
        </motion.div>
    );
}

// ===========================================
// MAIN CHAT WINDOW
// ===========================================

export function ChatWindow({ proId, proName, proImage, proTrustScore = 85, onClose }: ChatWindowProps) {
    const { user, userRole } = useAuth();
    const [messages, setMessages] = useState<Message[]>([]);
    const [inputText, setInputText] = useState("");
    const [securityWarning, setSecurityWarning] = useState<string | null>(null);
    const scrollRef = useRef<HTMLDivElement>(null);
    const [status, setStatus] = useState('inquiry');

    // Create a unique chat ID for this user-pro pair
    const chatId = user ? `${user.uid}_${proId}` : "demo";

    useEffect(() => {
        if (!chatId || chatId === 'demo') return;

        const unsubscribe = ChatService.subscribeToMessages(chatId, (msgs) => {
            setMessages(msgs);
            // Simulate AI checking for sensitive info (phone numbers)
            const lastMsg = msgs[msgs.length - 1];
            const msgContent = lastMsg?.content || "";
            if (msgContent && /\d{9}|\d{3}[-\s]\d{3}[-\s]\d{3}/.test(msgContent)) {
                setSecurityWarning("Wykryto numer telefonu. Dla bezpieczeństwa zalecamy płatność przez aplikację (Gwarancja Satysfakcji).");
            } else {
                setSecurityWarning(null);
            }
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

    const handleSend = async (e?: React.FormEvent, textOverride?: string) => {
        e?.preventDefault();
        const textToUse = textOverride || inputText;

        if (!textToUse.trim()) return;

        setInputText(""); // Optimistic clear
        if (user) {
            const role = (userRole || 'client') as 'client' | 'professional';
            await ChatService.sendMessage(chatId, {
                content: textToUse,
                senderId: user.uid,
                senderName: user.displayName || 'Użytkownik',
                senderRole: role
            });
        }
    };

    const handleAction = async (actionId: string, label: string) => {
        if (actionId === 'ai_reply') {
            handleSend(undefined, label);
            return;
        }

        // Send as system action message
        const systemMessage = label.replace(/[📍✅▶️⚠️💰📅]/g, '').trim().toUpperCase();
        if (user) {
            const role = (userRole || 'client') as 'client' | 'professional';
            await ChatService.sendMessage(chatId, {
                content: `--- ${systemMessage} ---`,
                senderId: user.uid,
                senderName: user.displayName || 'Użytkownik',
                senderRole: role
            });

            // Simulate status update based on action
            if (actionId === 'quote') setStatus('quoted');
            if (actionId === 'approve') setStatus('accepted');
            if (actionId === 'start_job') setStatus('in_progress');
            if (actionId === 'complete_job') setStatus('completed');
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.9 }}
            className="fixed inset-4 md:inset-auto md:bottom-24 md:right-8 md:w-96 md:h-[600px] bg-slate-900/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl flex flex-col overflow-hidden z-[100]"
        >
            {/* Header with Trust Score */}
            <div className="p-4 border-b border-white/10 flex items-center justify-between bg-slate-800/50">
                <div className="flex items-center gap-3">
                    <div className="relative">
                        <TrustScoreRing score={proTrustScore} size={42} imageUrl={proImage} showScore />
                        <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border border-slate-900 shadow-lg shadow-green-500/50" />
                    </div>
                    <div>
                        <div className="flex items-center gap-1.5">
                            <h3 className="font-bold text-white text-sm">{proName}</h3>
                            {proTrustScore >= 80 && <Shield className="w-3 h-3 text-cyan-400 fill-cyan-400/20" />}
                        </div>
                        <p className="text-xs text-green-400">Dostępny teraz</p>
                    </div>
                </div>
                <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors p-2">
                    <X className="w-5 h-5" />
                </button>
            </div>

            {/* Deal Progress Widget */}
            <DealWidget status={status} />

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 relative" ref={scrollRef}>
                {messages.length === 0 && (
                    <div className="text-center text-slate-500 text-sm mt-10">
                        Rozpocznij konwersację z {proName}.
                    </div>
                )}

                {messages.map((msg) => {
                    const isMe = msg.senderId === user?.uid;
                    const isSystem = msg.type === 'system';
                    const displayContent = msg.content || "";

                    if (isSystem) {
                        return (
                            <div key={msg.id} className="flex justify-center my-3">
                                <div className="px-4 py-1.5 bg-slate-800/50 border border-white/5 rounded-full text-xs text-slate-400 flex items-center gap-2">
                                    <Clock className="w-3 h-3" />
                                    {displayContent}
                                </div>
                            </div>
                        );
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
                                {displayContent}
                            </div>
                        </motion.div>
                    );
                })}

                {/* Security Warning Overlay */}
                <AnimatePresence>
                    {securityWarning && (
                        <div className="sticky bottom-0 left-0 right-0 pb-2">
                            <SecurityWarning text={securityWarning} />
                        </div>
                    )}
                </AnimatePresence>
            </div>

            {/* Smart Action Bar */}
            <div className="border-t border-white/5">
                <SmartActionBar
                    userRole={userRole}
                    onAction={handleAction}
                    suggestedReplies={userRole === 'professional' ? ["Będę za 15 min", "Potrzebuję zdjęcia", "Jaka lokalizacja?"] : []}
                />
            </div>

            {/* Input Area */}
            <form onSubmit={(e) => handleSend(e)} className="p-3 border-t border-white/10 bg-slate-800/30">
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
