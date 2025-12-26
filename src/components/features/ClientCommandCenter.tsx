"use client";

import { motion } from "framer-motion";
import { MapPin, Clock, Navigation, Phone, MessageCircle } from "lucide-react";
import { OrderStatus } from "@/types/firestore";

// ===========================================
// DYNAMIC ISLAND STATUS BAR
// ===========================================

interface DynamicIslandProps {
    status: OrderStatus;
    providerName: string;
    eta?: string;
    onTap?: () => void;
}

const STATUS_CONFIG: Record<OrderStatus, { label: string; color: string; bgColor: string }> = {
    pending: { label: 'Szukamy fachowca...', color: 'text-yellow-400', bgColor: 'bg-yellow-500/20' },
    accepted: { label: 'Zlecenie przyjęte', color: 'text-blue-400', bgColor: 'bg-blue-500/20' },
    en_route: { label: 'w drodze', color: 'text-cyan-400', bgColor: 'bg-cyan-500/20' },
    in_progress: { label: 'pracuje', color: 'text-emerald-400', bgColor: 'bg-emerald-500/20' },
    completed: { label: 'Zakończone', color: 'text-slate-400', bgColor: 'bg-slate-500/20' },
    cancelled: { label: 'Anulowane', color: 'text-red-400', bgColor: 'bg-red-500/20' },
};

export function DynamicIsland({ status, providerName, eta, onTap }: DynamicIslandProps) {
    const config = STATUS_CONFIG[status];

    return (
        <motion.div
            initial={{ y: -100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -100, opacity: 0 }}
            onClick={onTap}
            className={`${config.bgColor} backdrop-blur-xl border border-white/10 rounded-full px-4 py-2 flex items-center gap-3 cursor-pointer hover:scale-[1.02] transition-transform shadow-lg`}
        >
            {/* Pulsing dot */}
            {(status === 'en_route' || status === 'pending') && (
                <div className="relative">
                    <div className={`w-2 h-2 rounded-full ${config.color.replace('text-', 'bg-')}`} />
                    <div className={`absolute inset-0 w-2 h-2 rounded-full ${config.color.replace('text-', 'bg-')} animate-ping`} />
                </div>
            )}

            {/* Status text */}
            <span className="text-white text-sm font-medium">
                {status === 'en_route' || status === 'in_progress' ? (
                    <><span className="font-bold">{providerName}</span> {config.label}</>
                ) : (
                    config.label
                )}
            </span>

            {/* ETA */}
            {eta && status === 'en_route' && (
                <span className={`${config.color} text-sm font-bold flex items-center gap-1`}>
                    <Clock className="w-3.5 h-3.5" />
                    {eta}
                </span>
            )}
        </motion.div>
    );
}

// ===========================================
// MINI ACTION BAR (Quick actions)
// ===========================================

interface MiniActionBarProps {
    onCall?: () => void;
    onChat?: () => void;
    onTrack?: () => void;
}

export function MiniActionBar({ onCall, onChat, onTrack }: MiniActionBarProps) {
    return (
        <div className="flex items-center gap-2">
            <button
                onClick={onCall}
                className="w-10 h-10 flex items-center justify-center bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-400/30 rounded-full text-emerald-400 transition-colors"
            >
                <Phone className="w-4 h-4" />
            </button>
            <button
                onClick={onChat}
                className="w-10 h-10 flex items-center justify-center bg-blue-500/20 hover:bg-blue-500/30 border border-blue-400/30 rounded-full text-blue-400 transition-colors"
            >
                <MessageCircle className="w-4 h-4" />
            </button>
            <button
                onClick={onTrack}
                className="w-10 h-10 flex items-center justify-center bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-400/30 rounded-full text-cyan-400 transition-colors"
            >
                <Navigation className="w-4 h-4" />
            </button>
        </div>
    );
}

// ===========================================
// CLIENT COMMAND CENTER (Main Component)
// ===========================================

interface ActiveOrder {
    id: string;
    status: OrderStatus;
    providerName: string;
    providerImage: string;
    providerProfession: string;
    eta?: string;
    price: number;
    location?: { lat: number; lng: number; address?: string };
}

interface ClientCommandCenterProps {
    activeOrder?: ActiveOrder | null;
    onOpenChat?: () => void;
    onTrackLocation?: () => void;
    onCall?: () => void;
    isChatOpen?: boolean;
}

export function ClientCommandCenter({
    activeOrder,
    onOpenChat,
    onTrackLocation,
    onCall,
    isChatOpen
}: ClientCommandCenterProps) {

    // Don't show if no active order or chat is open
    if (!activeOrder || isChatOpen) return null;

    const statusConfig = STATUS_CONFIG[activeOrder.status];

    return (
        <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed bottom-28 left-4 right-4 md:left-auto md:right-6 md:w-[380px] z-30"
        >
            <div className="bg-slate-900/90 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
                {/* Dynamic Island Header */}
                <div className={`${statusConfig.bgColor} px-4 py-3 flex items-center justify-between`}>
                    <div className="flex items-center gap-2">
                        {/* Pulsing indicator */}
                        {(activeOrder.status === 'en_route' || activeOrder.status === 'pending') && (
                            <div className="relative">
                                <div className={`w-2 h-2 rounded-full ${statusConfig.color.replace('text-', 'bg-')}`} />
                                <div className={`absolute inset-0 w-2 h-2 rounded-full ${statusConfig.color.replace('text-', 'bg-')} animate-ping`} />
                            </div>
                        )}
                        <span className={`text-sm font-medium ${statusConfig.color}`}>
                            {statusConfig.label}
                        </span>
                    </div>
                    {activeOrder.eta && activeOrder.status === 'en_route' && (
                        <span className="text-cyan-400 text-sm font-bold flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" />
                            ETA: {activeOrder.eta}
                        </span>
                    )}
                </div>

                {/* Provider info */}
                <div className="p-4">
                    <div className="flex items-center gap-3">
                        <img
                            src={activeOrder.providerImage}
                            alt={activeOrder.providerName}
                            className="w-12 h-12 rounded-full object-cover border-2 border-white/10"
                        />
                        <div className="flex-1 min-w-0">
                            <h4 className="text-white font-semibold text-sm truncate">
                                {activeOrder.providerName}
                            </h4>
                            <p className="text-slate-400 text-xs">{activeOrder.providerProfession}</p>
                        </div>
                        <div className="text-right">
                            <span className="text-lg font-bold text-emerald-400">
                                {activeOrder.price} zł
                            </span>
                        </div>
                    </div>

                    {/* Location (if available) */}
                    {activeOrder.location?.address && (
                        <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
                            <MapPin className="w-3.5 h-3.5" />
                            <span className="truncate">{activeOrder.location.address}</span>
                        </div>
                    )}

                    {/* Action buttons */}
                    <div className="mt-4 flex gap-2">
                        <button
                            onClick={onCall}
                            className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-400/30 text-emerald-100 rounded-xl text-sm font-semibold transition-all"
                        >
                            <Phone className="w-4 h-4" />
                            Zadzwoń
                        </button>
                        <button
                            onClick={onOpenChat}
                            className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-400/30 text-blue-100 rounded-xl text-sm font-semibold transition-all"
                        >
                            <MessageCircle className="w-4 h-4" />
                            Czat
                        </button>
                        <button
                            onClick={onTrackLocation}
                            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 rounded-xl text-sm font-semibold transition-all"
                        >
                            <Navigation className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>
        </motion.div>
    );
}
