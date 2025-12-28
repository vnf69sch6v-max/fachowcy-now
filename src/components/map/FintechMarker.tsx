"use client";

/**
 * FintechMarker - Premium Map Marker Component
 * 
 * Design: "Neon Glass" pill-shaped markers with:
 * - Dark glass background with blur
 * - Status-based glows and borders
 * - Premium shimmer effect
 * 
 * Uses AdvancedMarkerElement from @vis.gl/react-google-maps
 */

import React, { useCallback, useMemo, memo } from "react";
import { AdvancedMarker, useAdvancedMarkerRef, Pin } from "@vis.gl/react-google-maps";
import { motion } from "framer-motion";
import { MarkerStatus, MarkerData } from "@/types/chat";
import { cn } from "@/lib/utils";

// ===========================================
// STYLES
// ===========================================

const MARKER_STYLES = {
    base: `
        px-3 py-1.5 
        rounded-full 
        bg-[rgba(10,10,10,0.85)] 
        backdrop-blur-lg 
        border 
        font-bold text-sm
        flex items-center gap-2
        cursor-pointer
        transition-all duration-300
        shadow-xl
    `,
    default: "border-white/20 text-white hover:border-white/40",
    available: "border-emerald-400/50 text-emerald-400 animate-pulse-glow",
    premium: "border-amber-400/60 text-amber-400 shimmer-effect",
    busy: "border-slate-500/30 text-slate-400 opacity-60",
    job: "border-violet-500/60 text-violet-300 animate-pulse-glow bg-slate-900/90 shadow-[0_0_15px_rgba(139,92,246,0.5)]",
};

// ===========================================
// CSS ANIMATIONS (injected via style tag)
// ===========================================

const MarkerStyles = () => (
    <style jsx global>{`
        @keyframes pulse-glow {
            0%, 100% {
                box-shadow: 0 0 8px rgba(0, 255, 157, 0.4),
                            0 0 20px rgba(0, 255, 157, 0.2),
                            0 0 40px rgba(0, 255, 157, 0.1);
            }
            50% {
                box-shadow: 0 0 12px rgba(0, 255, 157, 0.6),
                            0 0 30px rgba(0, 255, 157, 0.4),
                            0 0 60px rgba(0, 255, 157, 0.2);
            }
        }

        .animate-pulse-glow {
            animation: pulse-glow 2s ease-in-out infinite;
        }

        @keyframes shimmer {
            0% {
                background-position: -200% center;
            }
            100% {
                background-position: 200% center;
            }
        }

        .shimmer-effect {
            position: relative;
            overflow: hidden;
        }

        .shimmer-effect::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: linear-gradient(
                90deg,
                transparent 0%,
                rgba(255, 215, 0, 0.15) 25%,
                rgba(255, 215, 0, 0.3) 50%,
                rgba(255, 215, 0, 0.15) 75%,
                transparent 100%
            );
            background-size: 200% 100%;
            animation: shimmer 2.5s linear infinite;
            pointer-events: none;
            border-radius: inherit;
        }

        .marker-avatar {
            width: 24px;
            height: 24px;
            border-radius: 50%;
            object-fit: cover;
            border: 2px solid rgba(255, 255, 255, 0.3);
        }

        .online-dot {
            position: absolute;
            bottom: -2px;
            right: -2px;
            width: 10px;
            height: 10px;
            background: #00ff9d;
            border-radius: 50%;
            border: 2px solid rgba(10, 10, 10, 0.9);
            box-shadow: 0 0 8px #00ff9d;
        }
    `}</style>
);

// ===========================================
// MARKER CONTENT COMPONENT
// ===========================================

interface MarkerContentProps {
    data: MarkerData;
    isSelected?: boolean;
}

const MarkerContent = memo(function MarkerContent({ data, isSelected }: MarkerContentProps) {
    const statusClass = MARKER_STYLES[data.status] || MARKER_STYLES.default;

    return (
        <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{
                scale: isSelected ? 1.15 : 1,
                opacity: 1
            }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            className={cn(MARKER_STYLES.base, statusClass)}
        >
            {/* Avatar (optional) */}
            {data.imageUrl && (
                <div className="relative flex-shrink-0">
                    <img
                        src={data.imageUrl}
                        alt={data.name || "Pro"}
                        className="marker-avatar"
                    />
                    {data.isOnline && <span className="online-dot" />}
                </div>
            )}

            {/* Price */}
            <span className="font-bold whitespace-nowrap">
                {data.price} zł
            </span>

            {/* Premium badge */}
            {data.status === 'premium' && (
                <span className="text-amber-400 text-xs">⭐</span>
            )}
        </motion.div>
    );
});
MarkerContent.displayName = 'MarkerContent';

// ===========================================
// MAIN FINTECH MARKER COMPONENT
// ===========================================

interface FintechMarkerProps {
    data: MarkerData;
    onClick?: (data: MarkerData) => void;
    isSelected?: boolean;
}

export function FintechMarker({ data, onClick, isSelected }: FintechMarkerProps) {
    const [markerRef, marker] = useAdvancedMarkerRef();

    const handleClick = useCallback(() => {
        onClick?.(data);
    }, [data, onClick]);

    return (
        <AdvancedMarker
            ref={markerRef}
            position={data.position}
            onClick={handleClick}
            zIndex={isSelected ? 100 : data.status === 'premium' ? 50 : 10}
        >
            <MarkerContent data={data} isSelected={isSelected} />
        </AdvancedMarker>
    );
}

// ===========================================
// CLUSTERED MARKER (for grouped markers)
// ===========================================

interface ClusterMarkerProps {
    position: { lat: number; lng: number };
    count: number;
    totalPrice: number;
    onClick?: () => void;
}

export function ClusterMarker({ position, count, totalPrice, onClick }: ClusterMarkerProps) {
    const [markerRef] = useAdvancedMarkerRef();

    const avgPrice = Math.round(totalPrice / count);

    return (
        <>
            <MarkerStyles />
            <AdvancedMarker
                ref={markerRef}
                position={position}
                onClick={onClick}
                zIndex={200}
            >
                <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    whileHover={{ scale: 1.1 }}
                    className={cn(
                        MARKER_STYLES.base,
                        "border-blue-400/50 text-blue-400",
                        "min-w-[60px] justify-center"
                    )}
                >
                    <span className="bg-blue-500/30 px-2 py-0.5 rounded-full text-xs font-bold">
                        {count}
                    </span>
                    <span className="font-bold">
                        {avgPrice} zł
                    </span>
                </motion.div>
            </AdvancedMarker>
        </>
    );
}

// ===========================================
// HELPER: Convert Professional to MarkerData
// ===========================================

export function professionalToMarkerData(pro: {
    id: string;
    location: { lat: number; lng: number };
    price: number;
    imageUrl?: string;
    name?: string;
    rating?: number;
    isPromoted?: boolean;
    isOnline?: boolean;
    type?: string;
}): MarkerData {
    let status: MarkerStatus = 'default';

    if (pro.type === 'job_marker') {
        status = 'job';
    } else if (pro.isPromoted) {
        status = 'premium';
    } else if (pro.isOnline) {
        status = 'available';
    }

    return {
        id: pro.id,
        position: pro.location,
        price: pro.price,
        imageUrl: pro.imageUrl,
        name: pro.name,
        status,
        rating: pro.rating,
        isOnline: pro.isOnline,
    };
}

export default FintechMarker;
