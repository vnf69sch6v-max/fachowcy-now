"use client";

/**
 * TrustScoreRing - Real-time Trust Score Visualizer
 * 
 * Design: Inspired by Apple Watch Fitness rings
 * - Animated SVG stroke
 * - Color tiers: Cyan (Top), Yellow (Verified), Gray (New)
 * - Pulse animation on high scores
 */

import { motion } from "framer-motion";
import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { getTrustTier, getTrustColor } from "@/types/chat";

interface TrustScoreRingProps {
    score: number; // 0-100
    size?: number; // px
    imageUrl?: string;
    showScore?: boolean;
    className?: string;
}

export function TrustScoreRing({
    score,
    size = 48,
    imageUrl,
    showScore = false,
    className
}: TrustScoreRingProps) {
    const tier = getTrustTier(score);
    const color = getTrustColor(tier);

    // Circle configuration
    const strokeWidth = 3;
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const progress = Math.min(Math.max(score, 0), 100);
    const strokeDashoffset = circumference - (progress / 100) * circumference;

    return (
        <div
            className={cn("relative flex items-center justify-center", className)}
            style={{ width: size, height: size }}
        >
            {/* Background Image (Avatar) */}
            {imageUrl ? (
                <div
                    className="absolute inset-[4px] rounded-full overflow-hidden bg-slate-800"
                    style={{ padding: strokeWidth }}
                >
                    <img
                        src={imageUrl}
                        alt="User Avatar"
                        className="w-full h-full object-cover rounded-full"
                    />
                </div>
            ) : (
                <div className="absolute inset-[4px] rounded-full bg-slate-800" />
            )}

            {/* SVG Ring */}
            <svg
                width={size}
                height={size}
                viewBox={`0 0 ${size} ${size}`}
                className="transform -rotate-90 drop-shadow-lg"
            >
                {/* Background Ring */}
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    stroke="rgba(255,255,255,0.1)"
                    strokeWidth={strokeWidth}
                    fill="none"
                />

                {/* Progress Ring */}
                <motion.circle
                    initial={{ strokeDashoffset: circumference }}
                    animate={{ strokeDashoffset }}
                    transition={{ duration: 1.5, ease: "easeOut" }}
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    stroke={color}
                    strokeWidth={strokeWidth}
                    strokeDasharray={circumference}
                    strokeLinecap="round"
                    fill="none"
                />
            </svg>

            {/* Pulsing Glow for Top Pros */}
            {tier === 'top_pro' && (
                <motion.div
                    animate={{
                        boxShadow: [
                            `0 0 0px ${color}00`,
                            `0 0 10px ${color}40`,
                            `0 0 0px ${color}00`
                        ]
                    }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="absolute inset-0 rounded-full"
                />
            )}

            {/* Score Badge (Optional) */}
            {showScore && (
                <div className="absolute -bottom-1 -right-1 bg-slate-900 rounded-full px-1.5 py-0.5 border border-slate-700 shadow-xl">
                    <span
                        className="text-[10px] font-bold"
                        style={{ color }}
                    >
                        {score}
                    </span>
                </div>
            )}
        </div>
    );
}
