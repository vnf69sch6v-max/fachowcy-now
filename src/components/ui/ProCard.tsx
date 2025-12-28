"use client";

/**
 * ProCard - Professional Card Component (Redesigned)
 * 
 * Features:
 * - Real-time distance & driving time
 * - Premium badge for sponsored
 * - Improved rating display
 * - Modern glassmorphism design
 */

import { motion } from "framer-motion";
import {
    ShieldCheck,
    MessageCircle,
    Clock,
    Star,
    MapPin,
    Navigation,
    Crown,
    Phone
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ProCardProps {
    name: string;
    profession: string;
    price: number;
    rating: number;
    reviewCount?: number;
    distance?: string;      // "5.2 km"
    duration?: string;      // "12 min"
    imageUrl: string;
    verified?: boolean;
    isPromoted?: boolean;   // Premium/Sponsor
    isLoading?: boolean;    // Loading directions
    onChat?: () => void;
    onBook?: () => void;
    onClose?: () => void;
    className?: string;
}

export function ProCard({
    name,
    profession,
    price,
    rating,
    reviewCount = 0,
    distance,
    duration,
    imageUrl,
    verified = true,
    isPromoted = false,
    isLoading = false,
    variant = "default", // 'default' (Client view) or 'job' (Pro view)
    onChat,
    onBook,
    onClose,
    className
}: ProCardProps & { variant?: 'default' | 'job' }) {
    // Format rating to 1 decimal place
    const formattedRating = typeof rating === 'number'
        ? rating.toFixed(1)
        : '5.0';

    return (
        <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.95 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className={cn(
                "relative w-full max-w-[380px]",
                // Premium styling
                isPromoted
                    ? "bg-gradient-to-br from-amber-900/40 via-slate-900/90 to-slate-900/90"
                    : "bg-slate-900/90",
                "backdrop-blur-xl border rounded-2xl overflow-hidden shadow-2xl",
                isPromoted
                    ? "border-amber-500/30 ring-1 ring-amber-500/20"
                    : "border-white/10",
                className
            )}
        >
            {/* Premium Badge */}
            {isPromoted && (
                <div className="absolute top-3 right-3 z-20 flex items-center gap-1.5 px-2.5 py-1 bg-gradient-to-r from-amber-500 to-yellow-500 rounded-full text-xs font-bold text-slate-900">
                    <Crown className="w-3 h-3" />
                    {variant === 'job' ? 'Priorytet' : 'Premium'}
                </div>
            )}

            {/* Close Button */}
            {onClose && (
                <button
                    onClick={onClose}
                    className="absolute top-3 left-3 z-20 w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
                >
                    <span className="text-white/70 text-sm">✕</span>
                </button>
            )}

            {/* Main Content */}
            <div className="p-5">
                {/* Header: Avatar + Info + Price */}
                <div className="flex items-start gap-4 mb-4">
                    {/* Avatar */}
                    <div className="relative flex-shrink-0">
                        <div className={cn(
                            "w-16 h-16 rounded-xl overflow-hidden border-2",
                            isPromoted ? "border-amber-500/50" : "border-white/20"
                        )}>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                                src={imageUrl}
                                alt={name}
                                className="w-full h-full object-cover"
                            />
                        </div>
                        {verified && (
                            <div className="absolute -bottom-1 -right-1 bg-blue-500 rounded-lg p-1 border-2 border-slate-900">
                                <ShieldCheck className="w-3 h-3 text-white" />
                            </div>
                        )}
                    </div>

                    {/* Name & Profession */}
                    <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-lg text-white truncate">{name}</h3>
                        <p className="text-slate-400 text-sm">{profession}</p>

                        {/* Rating */}
                        <div className="flex items-center gap-2 mt-1.5">
                            <div className="flex items-center gap-1 text-amber-400">
                                <Star className="w-4 h-4 fill-amber-400" />
                                <span className="font-bold text-sm">{formattedRating}</span>
                            </div>
                            {reviewCount > 0 && (
                                <span className="text-slate-500 text-xs">
                                    ({reviewCount} opinii)
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Price */}
                    <div className="text-right flex-shrink-0">
                        <div className={cn(
                            "text-2xl font-bold",
                            isPromoted ? "text-amber-400" : "text-emerald-400"
                        )}>
                            {price} zł
                        </div>
                        <div className="text-xs text-slate-500">
                            {variant === 'job' ? 'Budżet' : 'za usługę'}
                        </div>
                    </div>
                </div>

                {/* Distance & Time Bar */}
                <div className={cn(
                    "flex items-center justify-between py-3 px-4 rounded-xl mb-4",
                    isPromoted
                        ? "bg-amber-500/10 border border-amber-500/20"
                        : "bg-white/5 border border-white/10"
                )}>
                    {/* Distance */}
                    <div className="flex items-center gap-2">
                        <div className={cn(
                            "w-8 h-8 rounded-lg flex items-center justify-center",
                            isPromoted ? "bg-amber-500/20" : "bg-blue-500/20"
                        )}>
                            <MapPin className={cn(
                                "w-4 h-4",
                                isPromoted ? "text-amber-400" : "text-blue-400"
                            )} />
                        </div>
                        <div>
                            <div className="text-white text-sm font-medium">
                                {isLoading ? (
                                    <span className="animate-pulse">Obliczam...</span>
                                ) : distance || "—"}
                            </div>
                            <div className="text-slate-500 text-[10px] uppercase tracking-wider">
                                Odległość
                            </div>
                        </div>
                    </div>

                    {/* Divider */}
                    <div className="w-px h-10 bg-white/10" />

                    {/* Duration */}
                    <div className="flex items-center gap-2">
                        <div className={cn(
                            "w-8 h-8 rounded-lg flex items-center justify-center",
                            isPromoted ? "bg-amber-500/20" : "bg-emerald-500/20"
                        )}>
                            <Navigation className={cn(
                                "w-4 h-4",
                                isPromoted ? "text-amber-400" : "text-emerald-400"
                            )} />
                        </div>
                        <div>
                            <div className="text-white text-sm font-medium">
                                {isLoading ? (
                                    <span className="animate-pulse">...</span>
                                ) : duration ? `~${duration}` : "—"}
                            </div>
                            <div className="text-slate-500 text-[10px] uppercase tracking-wider">
                                Dojazd
                            </div>
                        </div>
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="grid grid-cols-2 gap-3">
                    <button
                        onClick={onChat}
                        className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 transition-all active:scale-[0.98] text-sm font-semibold text-white"
                    >
                        <MessageCircle className="w-4 h-4" />
                        {variant === 'job' ? 'Napisz' : 'Czat'}
                    </button>
                    <button
                        onClick={onBook}
                        className={cn(
                            "flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-semibold text-sm transition-all active:scale-[0.98] shadow-lg",
                            isPromoted
                                ? "bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-900 shadow-amber-500/20"
                                : "bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white shadow-blue-500/20"
                        )}
                    >
                        <Phone className="w-4 h-4" />
                        {variant === 'job' ? 'Szczegóły' : 'Rezerwuj'}
                    </button>
                </div>
            </div>

            {/* Subtle gradient overlay for premium */}
            {isPromoted && (
                <div className="absolute inset-0 bg-gradient-to-t from-amber-500/5 to-transparent pointer-events-none" />
            )}
        </motion.div>
    );
}
