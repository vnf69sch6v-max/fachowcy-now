/**
 * Neon Map Markers
 * 
 * Markery w stylu Fintech Night dla Google Maps.
 * - Neonowe kolory z pulsowaniem
 * - Różne style dla Instant Book / Request / Super-Fachowiec
 * - Animowane efekty
 */

"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Award, Zap, User } from "lucide-react";

// ===========================================
// MARKER TYPES
// ===========================================

export type MarkerVariant =
    | 'instant'      // Zielony neon - Instant Book
    | 'request'      // Bursztynowy - Request to Book
    | 'busy'         // Szary - Zajęty
    | 'selected';    // Niebieski - Wybrany

export interface MapMarkerProps {
    variant?: MarkerVariant;
    isSuperFachowiec?: boolean;
    isPopular?: boolean;
    rating?: number;
    size?: 'sm' | 'md' | 'lg';
    onClick?: () => void;
    animated?: boolean;
}

// ===========================================
// NEON MARKER COMPONENT
// ===========================================

export function NeonMarker({
    variant = 'instant',
    isSuperFachowiec = false,
    isPopular = false,
    rating,
    size = 'md',
    onClick,
    animated = true
}: MapMarkerProps) {
    const sizeConfig = {
        sm: { marker: 24, icon: 12, pulse: 32 },
        md: { marker: 32, icon: 16, pulse: 44 },
        lg: { marker: 40, icon: 20, pulse: 56 }
    };

    const variantColors = {
        instant: {
            bg: 'bg-emerald-500',
            glow: 'shadow-[0_0_15px_rgba(16,185,129,0.6)]',
            pulse: 'bg-emerald-400/30',
            border: 'border-emerald-400'
        },
        request: {
            bg: 'bg-amber-500',
            glow: 'shadow-[0_0_15px_rgba(245,158,11,0.6)]',
            pulse: 'bg-amber-400/30',
            border: 'border-amber-400'
        },
        busy: {
            bg: 'bg-slate-600',
            glow: '',
            pulse: 'bg-slate-500/20',
            border: 'border-slate-500'
        },
        selected: {
            bg: 'bg-sky-500',
            glow: 'shadow-[0_0_20px_rgba(56,189,248,0.8)]',
            pulse: 'bg-sky-400/30',
            border: 'border-sky-400'
        }
    };

    const config = sizeConfig[size];
    const colors = variantColors[variant];

    return (
        <div
            className="relative cursor-pointer"
            onClick={onClick}
            style={{ width: config.pulse, height: config.pulse }}
        >
            {/* Pulsing ring (for popular/available) */}
            {animated && (isPopular || variant === 'instant') && (
                <motion.div
                    initial={{ scale: 0.8, opacity: 0.8 }}
                    animate={{ scale: 1.2, opacity: 0 }}
                    transition={{
                        duration: 1.5,
                        repeat: Infinity,
                        ease: "easeOut"
                    }}
                    className={`absolute inset-0 rounded-full ${colors.pulse}`}
                />
            )}

            {/* Main marker */}
            <motion.div
                initial={animated ? { scale: 0 } : false}
                animate={{ scale: 1 }}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                className={`
                    absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2
                    rounded-full flex items-center justify-center
                    ${colors.bg} ${colors.glow}
                    border-2 ${colors.border}
                    transition-transform
                `}
                style={{
                    width: config.marker,
                    height: config.marker
                }}
            >
                {/* Icon */}
                {isSuperFachowiec ? (
                    <Award
                        className="text-white"
                        style={{ width: config.icon, height: config.icon }}
                    />
                ) : variant === 'instant' ? (
                    <Zap
                        className="text-white"
                        style={{ width: config.icon, height: config.icon }}
                    />
                ) : (
                    <User
                        className="text-white"
                        style={{ width: config.icon, height: config.icon }}
                    />
                )}
            </motion.div>

            {/* Super-Fachowiec badge */}
            {isSuperFachowiec && (
                <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute -top-1 -right-1 w-4 h-4 bg-amber-400 rounded-full 
                               flex items-center justify-center border border-amber-300
                               shadow-[0_0_8px_rgba(251,191,36,0.6)]"
                >
                    <span className="text-[8px] font-bold text-slate-900">★</span>
                </motion.div>
            )}

            {/* Rating badge */}
            {rating !== undefined && rating > 0 && (
                <motion.div
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`
                        absolute -bottom-5 left-1/2 -translate-x-1/2
                        px-1.5 py-0.5 rounded-full
                        bg-slate-900/90 backdrop-blur-sm
                        border border-white/10
                        text-[9px] font-mono font-bold text-white
                        whitespace-nowrap
                    `}
                >
                    ★ {rating.toFixed(1)}
                </motion.div>
            )}
        </div>
    );
}

// ===========================================
// CLUSTER MARKER
// ===========================================

interface ClusterMarkerProps {
    count: number;
    size?: 'sm' | 'md' | 'lg';
    onClick?: () => void;
}

export function ClusterMarker({ count, size = 'md', onClick }: ClusterMarkerProps) {
    const sizeConfig = {
        sm: { marker: 28, fontSize: 10 },
        md: { marker: 36, fontSize: 12 },
        lg: { marker: 44, fontSize: 14 }
    };

    const config = sizeConfig[size];

    // Color based on count
    let bgColor = 'bg-sky-500';
    if (count > 50) bgColor = 'bg-purple-500';
    else if (count > 20) bgColor = 'bg-pink-500';
    else if (count > 10) bgColor = 'bg-orange-500';

    return (
        <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            onClick={onClick}
            className={`
                ${bgColor} rounded-full flex items-center justify-center
                cursor-pointer border-2 border-white/30
                shadow-lg
            `}
            style={{
                width: config.marker,
                height: config.marker
            }}
        >
            <span
                className="font-bold text-white"
                style={{ fontSize: config.fontSize }}
            >
                {count > 99 ? '99+' : count}
            </span>
        </motion.div>
    );
}

// ===========================================
// INFO WINDOW (Popup)
// ===========================================

interface MarkerInfoWindowProps {
    isOpen: boolean;
    name: string;
    profession: string;
    rating: number;
    reviewCount: number;
    price: number;
    distance?: string;
    eta?: string;
    isSuperFachowiec?: boolean;
    instantBookAvailable?: boolean;
    avatarUrl?: string;
    onClose?: () => void;
    onBook?: () => void;
}

export function MarkerInfoWindow({
    isOpen,
    name,
    profession,
    rating,
    reviewCount,
    price,
    distance,
    eta,
    isSuperFachowiec,
    instantBookAvailable,
    avatarUrl,
    onClose,
    onBook
}: MarkerInfoWindowProps) {
    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                    className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50"
                >
                    <div className="bg-slate-900/95 backdrop-blur-xl border border-white/10 
                                    rounded-xl p-3 shadow-2xl min-w-[200px]">
                        {/* Super-Fachowiec banner */}
                        {isSuperFachowiec && (
                            <div className="flex items-center gap-1 text-amber-400 text-[10px] 
                                          font-bold mb-2 uppercase tracking-wider">
                                <Award className="w-3 h-3" />
                                Super-Fachowiec
                            </div>
                        )}

                        {/* Header */}
                        <div className="flex items-center gap-2 mb-2">
                            {avatarUrl ? (
                                <img
                                    src={avatarUrl}
                                    alt={name}
                                    className="w-10 h-10 rounded-full object-cover border border-white/10"
                                />
                            ) : (
                                <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center">
                                    <User className="w-5 h-5 text-slate-400" />
                                </div>
                            )}
                            <div className="flex-1 min-w-0">
                                <h4 className="text-sm font-semibold text-white truncate">{name}</h4>
                                <p className="text-xs text-slate-400">{profession}</p>
                            </div>
                        </div>

                        {/* Stats */}
                        <div className="flex items-center justify-between text-xs mb-3">
                            <div className="flex items-center gap-1 text-amber-400">
                                <span>★</span>
                                <span className="font-mono font-bold">{rating.toFixed(1)}</span>
                                <span className="text-slate-500">({reviewCount})</span>
                            </div>
                            {distance && (
                                <span className="text-slate-400">{distance}</span>
                            )}
                        </div>

                        {/* Price & ETA */}
                        <div className="flex items-center justify-between mb-3 py-2 
                                      border-t border-b border-white/5">
                            <div>
                                <span className="text-[10px] text-slate-500">Od</span>
                                <p className="text-lg font-mono font-bold text-emerald-400">
                                    {price} zł
                                </p>
                            </div>
                            {eta && (
                                <div className="text-right">
                                    <span className="text-[10px] text-slate-500">ETA</span>
                                    <p className="text-sm font-mono text-white">{eta}</p>
                                </div>
                            )}
                        </div>

                        {/* Action button */}
                        <button
                            onClick={onBook}
                            className={`w-full py-2 px-4 rounded-lg font-semibold text-sm
                                      flex items-center justify-center gap-2 transition-all
                                      ${instantBookAvailable
                                    ? 'bg-emerald-500 hover:bg-emerald-600 text-white'
                                    : 'bg-sky-500 hover:bg-sky-600 text-white'
                                }`}
                        >
                            {instantBookAvailable ? (
                                <>
                                    <Zap className="w-4 h-4" />
                                    Zarezerwuj teraz
                                </>
                            ) : (
                                'Wyślij zapytanie'
                            )}
                        </button>

                        {/* Arrow */}
                        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-full">
                            <div className="w-3 h-3 bg-slate-900 border-r border-b border-white/10 
                                          rotate-45 -mt-1.5" />
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}

// ===========================================
// HTML MARKER (for Google Maps AdvancedMarkerElement)
// ===========================================

/**
 * Creates HTML string for Google Maps AdvancedMarkerElement
 */
export function createMarkerHTML(options: {
    variant: MarkerVariant;
    isSuperFachowiec?: boolean;
    size?: 'sm' | 'md' | 'lg';
}): string {
    const { variant, isSuperFachowiec, size = 'md' } = options;

    const sizeConfig = {
        sm: 24,
        md: 32,
        lg: 40
    };

    const variantColors = {
        instant: '#10b981',  // emerald-500
        request: '#f59e0b',  // amber-500
        busy: '#475569',     // slate-600
        selected: '#0ea5e9'  // sky-500
    };

    const markerSize = sizeConfig[size];
    const color = variantColors[variant];

    return `
        <div style="
            width: ${markerSize}px;
            height: ${markerSize}px;
            background: ${color};
            border-radius: 50%;
            border: 2px solid rgba(255,255,255,0.3);
            box-shadow: 0 0 15px ${color}66;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            transition: transform 0.2s;
        ">
            ${isSuperFachowiec
            ? '<svg width="16" height="16" viewBox="0 0 24 24" fill="white"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>'
            : '<svg width="16" height="16" viewBox="0 0 24 24" fill="white"><circle cx="12" cy="8" r="4"/><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/></svg>'
        }
        </div>
        ${isSuperFachowiec ? `
            <div style="
                position: absolute;
                top: -4px;
                right: -4px;
                width: 14px;
                height: 14px;
                background: #fbbf24;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 8px;
                font-weight: bold;
                color: #0f172a;
            ">★</div>
        ` : ''}
    `;
}
