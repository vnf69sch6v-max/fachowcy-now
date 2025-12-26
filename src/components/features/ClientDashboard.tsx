"use client";

import { motion } from "framer-motion";
import { Clock, MapPin, MessageCircle, Star } from "lucide-react";

// Mock active order for demo
const MOCK_ACTIVE_ORDER = {
    id: "order-demo-1",
    providerId: "pro-demo-1",
    providerName: "Marek Kowalski",
    providerProfession: "Hydraulik",
    providerRating: 4.8,
    providerImageUrl: "https://randomuser.me/api/portraits/men/32.jpg",
    status: "en_route" as const,
    eta: "7 min",
    price: 150,
    unreadMessages: 2,
    location: { lat: 52.41, lng: 16.93 },
};

const STATUS_LABELS = {
    pending: "Oczekiwanie na fachowca",
    accepted: "Zlecenie przyjęte",
    en_route: "Fachowiec w drodze",
    in_progress: "Praca w toku",
    completed: "Zakończone",
};

const STATUS_COLORS = {
    pending: "bg-yellow-500",
    accepted: "bg-blue-500",
    en_route: "bg-cyan-500",
    in_progress: "bg-emerald-500",
    completed: "bg-slate-500",
};

interface OrderData {
    id: string;
    providerId: string;
    providerName: string;
    providerImageUrl: string;
}

interface ActiveOrderCardProps {
    order: typeof MOCK_ACTIVE_ORDER;
    onChatClick?: (orderData: OrderData) => void;
    onLocationClick?: () => void;
}

function ActiveOrderCard({ order, onChatClick, onLocationClick }: ActiveOrderCardProps) {
    return (
        <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed bottom-28 md:bottom-24 left-4 right-4 md:left-auto md:right-6 md:w-96 z-30"
        >
            <div className="bg-slate-900/80 backdrop-blur-xl border border-white/10 rounded-2xl p-4 shadow-2xl">
                {/* Status Bar */}
                <div className="flex items-center gap-2 mb-3">
                    <div className={`w-2 h-2 rounded-full ${STATUS_COLORS[order.status]} animate-pulse`} />
                    <span className="text-xs text-slate-400 font-medium">
                        {STATUS_LABELS[order.status]}
                    </span>
                    {order.status === "en_route" && (
                        <span className="ml-auto text-xs text-cyan-400 font-bold flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            ETA: {order.eta}
                        </span>
                    )}
                </div>

                {/* Provider Info */}
                <div className="flex items-center gap-3">
                    <img
                        src={order.providerImageUrl}
                        alt={order.providerName}
                        className="w-12 h-12 rounded-full object-cover border-2 border-white/10"
                    />
                    <div className="flex-1">
                        <h4 className="text-white font-semibold text-sm">{order.providerName}</h4>
                        <div className="flex items-center gap-2 text-xs text-slate-400">
                            <span>{order.providerProfession}</span>
                            <span className="flex items-center gap-0.5 text-yellow-400">
                                <Star className="w-3 h-3 fill-current" />
                                {order.providerRating}
                            </span>
                        </div>
                    </div>
                    <div className="text-right">
                        <span className="text-lg font-bold text-emerald-400">{order.price} zł</span>
                    </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 mt-4">
                    <button
                        onClick={() => onChatClick?.({
                            id: order.id,
                            providerId: order.providerId,
                            providerName: order.providerName,
                            providerImageUrl: order.providerImageUrl,
                        })}
                        className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-400/30 text-blue-100 rounded-xl text-sm font-semibold transition-all"
                    >
                        <MessageCircle className="w-4 h-4" />
                        Czat
                        {order.unreadMessages > 0 && (
                            <span className="w-5 h-5 flex items-center justify-center bg-red-500 rounded-full text-[10px] font-bold">
                                {order.unreadMessages}
                            </span>
                        )}
                    </button>
                    <button
                        onClick={onLocationClick}
                        className="flex items-center justify-center gap-2 px-4 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 rounded-xl text-sm font-semibold transition-all"
                    >
                        <MapPin className="w-4 h-4" />
                        Lokalizacja
                    </button>
                </div>
            </div>
        </motion.div>
    );
}

// Service categories for when no active order
const SERVICES = [
    { id: "hydraulik", name: "Hydraulik", icon: "🔧", color: "from-blue-500 to-cyan-500" },
    { id: "elektryk", name: "Elektryk", icon: "⚡", color: "from-yellow-500 to-orange-500" },
    { id: "sprzatanie", name: "Sprzątanie", icon: "🧹", color: "from-emerald-500 to-teal-500" },
    { id: "zlota-raczka", name: "Złota Rączka", icon: "🛠️", color: "from-purple-500 to-pink-500" },
];

function ServiceSlider() {
    return (
        <div className="fixed bottom-28 md:bottom-24 left-0 right-0 z-30 px-4">
            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                {SERVICES.map((service) => (
                    <button
                        key={service.id}
                        className={`flex-shrink-0 flex flex-col items-center gap-2 px-6 py-4 bg-gradient-to-br ${service.color} bg-opacity-20 backdrop-blur-md border border-white/10 rounded-2xl hover:scale-105 transition-transform`}
                    >
                        <span className="text-2xl">{service.icon}</span>
                        <span className="text-xs text-white font-semibold whitespace-nowrap">{service.name}</span>
                    </button>
                ))}
            </div>
        </div>
    );
}

interface ClientDashboardProps {
    onOpenChat?: (proId: string, proName: string, proImage: string) => void;
    onShowLocation?: (lat: number, lng: number) => void;
}

export function ClientDashboard({ onOpenChat, onShowLocation }: ClientDashboardProps) {
    // In real app, fetch active orders from Firestore
    const hasActiveOrder = true; // Demo: always show active order

    const handleChatClick = (orderData: OrderData) => {
        onOpenChat?.(orderData.providerId, orderData.providerName, orderData.providerImageUrl);
    };

    const handleLocationClick = () => {
        onShowLocation?.(MOCK_ACTIVE_ORDER.location.lat, MOCK_ACTIVE_ORDER.location.lng);
    };

    return (
        <>
            {hasActiveOrder ? (
                <ActiveOrderCard
                    order={MOCK_ACTIVE_ORDER}
                    onChatClick={handleChatClick}
                    onLocationClick={handleLocationClick}
                />
            ) : (
                <ServiceSlider />
            )}
        </>
    );
}

