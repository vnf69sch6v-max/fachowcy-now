"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Send,
    X,
    Clock,
    MapPin,
    CheckCircle,
    Play,
    Flag,
    CreditCard,
    Navigation,
    MessageCircle
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { ChatService } from "@/lib/chat-service";
import { OrderStatus } from "@/types/firestore";
import type { Message } from "@/lib/chat-service";

// ===========================================
// SYSTEM MESSAGE COMPONENT
// ===========================================

interface SystemMessageProps {
    text: string;
    icon?: React.ReactNode;
    timestamp?: string;
}

export function SystemMessage({ text, icon, timestamp }: SystemMessageProps) {
    return (
        <div className="flex justify-center my-4">
            <div className="px-4 py-2 bg-slate-800/50 border border-white/5 rounded-full flex items-center gap-2 max-w-[90%]">
                {icon || <Clock className="w-3.5 h-3.5 text-slate-400" />}
                <span className="text-xs text-slate-400 text-center">{text}</span>
                {timestamp && <span className="text-[10px] text-slate-500">{timestamp}</span>}
            </div>
        </div>
    );
}

// ===========================================
// ACTION CHIP COMPONENT
// ===========================================

interface ActionChipProps {
    label: string;
    icon: React.ReactNode;
    onClick: () => void;
    variant?: 'primary' | 'secondary' | 'danger';
    disabled?: boolean;
}

export function ActionChip({ label, icon, onClick, variant = 'secondary', disabled }: ActionChipProps) {
    const variantClasses = {
        primary: 'bg-blue-500/20 border-blue-400/30 text-blue-100 hover:bg-blue-500/30',
        secondary: 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10',
        danger: 'bg-red-500/20 border-red-400/30 text-red-100 hover:bg-red-500/30',
    };

    return (
        <button
            onClick={onClick}
            disabled={disabled}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium transition-all ${variantClasses[variant]} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
            {icon}
            {label}
        </button>
    );
}

// ===========================================
// PAYMENT REQUEST CARD
// ===========================================

interface PaymentRequestProps {
    amount: number;
    onPay: () => void;
}

function PaymentRequestCard({ amount, onPay }: PaymentRequestProps) {
    return (
        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 my-2">
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                    <CreditCard className="w-5 h-5 text-emerald-400" />
                    <span className="text-sm text-slate-300">Prośba o płatność</span>
                </div>
                <span className="text-lg font-bold text-emerald-400">{amount} zł</span>
            </div>
            <button
                onClick={onPay}
                className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-semibold text-sm transition-colors"
            >
                Zapłać teraz
            </button>
        </div>
    );
}

// ===========================================
// QUICK REPLIES
// ===========================================

interface QuickReply {
    id: string;
    text: string;
}

const CLIENT_QUICK_REPLIES: QuickReply[] = [
    { id: 'location', text: '📍 Wysyłam lokalizację' },
    { id: 'ok', text: '👍 Ok, czekam' },
    { id: 'details', text: '❓ Mogę prosić o szczegóły?' },
];

const PRO_QUICK_REPLIES: QuickReply[] = [
    { id: '5min', text: '🕐 Będę za 5 min' },
    { id: 'traffic', text: '🚗 Korki, spóźnię się' },
    { id: 'photo', text: '📸 Proszę o zdjęcie' },
    { id: 'arrived', text: '✅ Jestem na miejscu' },
];

// ===========================================
// SMART ACTION BAR (Context-Aware)
// ===========================================

interface SmartActionBarProps {
    userRole: 'client' | 'professional';
    orderStatus?: OrderStatus;
    onAction: (action: string) => void;
    onQuickReply: (text: string) => void;
}

function SmartActionBar({ userRole, orderStatus, onAction, onQuickReply }: SmartActionBarProps) {
    const quickReplies = userRole === 'client' ? CLIENT_QUICK_REPLIES : PRO_QUICK_REPLIES;

    // Context-aware action buttons based on order status
    const getActionButtons = () => {
        if (userRole === 'client') {
            switch (orderStatus) {
                case 'pending':
                    return [
                        { id: 'cancel', label: 'Anuluj', icon: <X className="w-3.5 h-3.5" />, variant: 'danger' as const },
                    ];
                case 'en_route':
                    return [
                        { id: 'share_location', label: 'Wyślij lokalizację', icon: <MapPin className="w-3.5 h-3.5" />, variant: 'primary' as const },
                    ];
                case 'completed':
                    return [
                        { id: 'pay', label: 'Zapłać', icon: <CreditCard className="w-3.5 h-3.5" />, variant: 'primary' as const },
                        { id: 'review', label: 'Oceń', icon: <CheckCircle className="w-3.5 h-3.5" />, variant: 'secondary' as const },
                    ];
                default:
                    return [];
            }
        } else {
            switch (orderStatus) {
                case 'pending':
                    return [
                        { id: 'accept', label: 'Przyjmij', icon: <CheckCircle className="w-3.5 h-3.5" />, variant: 'primary' as const },
                        { id: 'decline', label: 'Odrzuć', icon: <X className="w-3.5 h-3.5" />, variant: 'danger' as const },
                    ];
                case 'accepted':
                    return [
                        { id: 'on_my_way', label: 'Jadę!', icon: <Navigation className="w-3.5 h-3.5" />, variant: 'primary' as const },
                    ];
                case 'en_route':
                    return [
                        { id: 'arrived', label: 'Jestem', icon: <MapPin className="w-3.5 h-3.5" />, variant: 'primary' as const },
                    ];
                case 'in_progress':
                    return [
                        { id: 'complete', label: 'Zakończ', icon: <CheckCircle className="w-3.5 h-3.5" />, variant: 'primary' as const },
                        { id: 'problem', label: 'Problem', icon: <Flag className="w-3.5 h-3.5" />, variant: 'danger' as const },
                    ];
                default:
                    return [];
            }
        }
    };

    const actionButtons = getActionButtons();

    return (
        <div className="space-y-2 py-2">
            {/* Action buttons */}
            {actionButtons.length > 0 && (
                <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                    {actionButtons.map(btn => (
                        <ActionChip
                            key={btn.id}
                            label={btn.label}
                            icon={btn.icon}
                            variant={btn.variant}
                            onClick={() => onAction(btn.id)}
                        />
                    ))}
                </div>
            )}

            {/* Quick replies */}
            <div className="flex gap-2 overflow-x-auto scrollbar-hide">
                {quickReplies.map(reply => (
                    <button
                        key={reply.id}
                        onClick={() => onQuickReply(reply.text)}
                        className="flex-shrink-0 px-3 py-1.5 bg-slate-800/50 hover:bg-slate-700/50 border border-white/5 rounded-full text-xs text-slate-400 transition-colors"
                    >
                        {reply.text}
                    </button>
                ))}
            </div>
        </div>
    );
}

// ===========================================
// SMART CHAT WINDOW (Main Component)
// ===========================================

interface SmartChatWindowProps {
    proId: string;
    proName: string;
    proImage: string;
    orderId?: string;
    orderStatus?: OrderStatus;
    onClose: () => void;
    onStatusChange?: (newStatus: OrderStatus) => void;
}

export function SmartChatWindow({
    proId,
    proName,
    proImage,
    orderId,
    orderStatus = 'pending',
    onClose,
    onStatusChange
}: SmartChatWindowProps) {
    const { userRole } = useAuth();
    const [messages, setMessages] = useState<Message[]>([]);
    const [inputText, setInputText] = useState("");
    const [currentStatus, setCurrentStatus] = useState<OrderStatus>(orderStatus);
    const scrollRef = useRef<HTMLDivElement>(null);

    const chatId = orderId ? `order_${orderId}` : `demo_chat_${proId}`;

    useEffect(() => {
        const unsubscribe = ChatService.subscribeToChat(chatId, (msgs) => {
            setMessages(msgs);
        });
        return () => unsubscribe();
    }, [chatId]);

    // Auto-scroll with smooth behavior
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
        setInputText("");
        await ChatService.sendMessage(chatId, text, 'text');
    };

    const handleQuickReply = async (text: string) => {
        await ChatService.sendMessage(chatId, text, 'text');
    };

    const handleAction = async (action: string) => {
        // Map actions to status changes and system messages
        const actionMap: Record<string, { status?: OrderStatus; message: string }> = {
            accept: { status: 'accepted', message: '✅ Zlecenie przyjęte' },
            decline: { status: 'cancelled', message: '❌ Zlecenie odrzucone' },
            on_my_way: { status: 'en_route', message: '🚗 Fachowiec jest w drodze' },
            arrived: { status: 'in_progress', message: '📍 Fachowiec dotarł na miejsce' },
            complete: { status: 'completed', message: '✅ Praca zakończona' },
            pay: { message: '💳 Płatność zainicjowana' },
            cancel: { status: 'cancelled', message: '❌ Zlecenie anulowane' },
            share_location: { message: '📍 Lokalizacja udostępniona' },
            problem: { message: '⚠️ Zgłoszono problem' },
            review: { message: '⭐ Dziękujemy za ocenę!' },
        };

        const actionInfo = actionMap[action];
        if (actionInfo) {
            // Send system message
            await ChatService.sendMessage(chatId, actionInfo.message, 'system');

            // Update status if needed
            if (actionInfo.status) {
                setCurrentStatus(actionInfo.status);
                onStatusChange?.(actionInfo.status);
            }
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.9 }}
            className="fixed inset-4 md:inset-auto md:bottom-24 md:right-8 md:w-[400px] md:h-[550px] bg-slate-900/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl flex flex-col overflow-hidden z-[100]"
        >
            {/* Header */}
            <div className="p-4 border-b border-white/10 flex items-center justify-between bg-slate-800/50">
                <div className="flex items-center gap-3">
                    <div className="relative w-10 h-10">
                        <img
                            src={proImage}
                            alt={proName}
                            className="w-full h-full rounded-full object-cover border border-white/20"
                        />
                        <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border border-slate-900" />
                    </div>
                    <div>
                        <h3 className="font-bold text-white text-sm">{proName}</h3>
                        <p className="text-xs text-slate-400 capitalize">{currentStatus.replace('_', ' ')}</p>
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
                        <MessageCircle className="w-10 h-10 mx-auto mb-2 opacity-30" />
                        Rozpocznij konwersację z {proName}
                    </div>
                )}

                {messages.map((msg) => {
                    const isMe = msg.senderId === "user";
                    const isSystem = msg.type === 'system';

                    if (isSystem) {
                        return <SystemMessage key={msg.id} text={msg.text} />;
                    }

                    // Check for payment request (detected by text pattern)
                    if (msg.text.includes('💳 Płatność') || msg.text.includes('Prośba o płatność')) {
                        return (
                            <PaymentRequestCard
                                key={msg.id}
                                amount={150}
                                onPay={() => handleAction('pay')}
                            />
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
                                {msg.text}
                            </div>
                        </motion.div>
                    );
                })}
            </div>

            {/* Smart Action Bar */}
            <div className="px-3 border-t border-white/5">
                <SmartActionBar
                    userRole={userRole}
                    orderStatus={currentStatus}
                    onAction={handleAction}
                    onQuickReply={handleQuickReply}
                />
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
