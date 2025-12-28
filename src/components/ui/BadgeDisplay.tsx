"use client";

/**
 * Badge Display Component
 * 
 * Wizualizacja odznak użytkownika w stylu Fintech Night.
 * - Różne rozmiary (sm, md, lg)
 * - Tiers z gradientami (bronze, silver, gold, platinum)
 * - Tooltip z opisem
 */

import { motion } from "framer-motion";
import * as LucideIcons from "lucide-react";
import { Badge, BadgeTier, getTierGradient, sortBadgesByImportance } from "@/lib/badges-service";

// ===========================================
// SINGLE BADGE
// ===========================================

interface BadgeIconProps {
    badge: Badge;
    size?: 'sm' | 'md' | 'lg';
    showTooltip?: boolean;
}

export function BadgeIcon({ badge, size = 'md', showTooltip = true }: BadgeIconProps) {
    const sizeConfig = {
        sm: { container: 24, icon: 12 },
        md: { container: 32, icon: 16 },
        lg: { container: 40, icon: 20 }
    };

    const config = sizeConfig[size];
    const gradient = getTierGradient(badge.tier);

    // Dynamically get icon from lucide-react
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const IconComponent = (LucideIcons as any)[badge.icon] as React.ComponentType<{ className?: string; style?: React.CSSProperties }>
        || LucideIcons.Award;

    return (
        <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            whileHover={{ scale: 1.1 }}
            className="relative group"
        >
            <div
                className={`
                    rounded-full flex items-center justify-center
                    bg-gradient-to-br ${gradient}
                    shadow-lg border border-white/20
                    cursor-pointer
                `}
                style={{
                    width: config.container,
                    height: config.container
                }}
            >
                <IconComponent
                    className="text-white drop-shadow-md"
                    style={{ width: config.icon, height: config.icon }}
                />
            </div>

            {/* Tooltip */}
            {showTooltip && (
                <div className="
                    absolute bottom-full left-1/2 -translate-x-1/2 mb-2
                    bg-slate-900/95 backdrop-blur-xl border border-white/10
                    rounded-lg px-3 py-2 shadow-xl
                    opacity-0 group-hover:opacity-100 transition-opacity
                    pointer-events-none z-50
                    min-w-[150px] max-w-[200px]
                ">
                    <p className="text-xs font-bold text-white">{badge.name}</p>
                    <p className="text-[10px] text-slate-400">{badge.description}</p>
                    {badge.tier && (
                        <span className={`
                            inline-block mt-1 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase
                            bg-gradient-to-r ${gradient} text-white
                        `}>
                            {badge.tier}
                        </span>
                    )}
                    {/* Arrow */}
                    <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1">
                        <div className="w-2 h-2 bg-slate-900 border-r border-b border-white/10 rotate-45" />
                    </div>
                </div>
            )}
        </motion.div>
    );
}

// ===========================================
// BADGE COLLECTION
// ===========================================

interface BadgeDisplayProps {
    badges: Badge[];
    maxVisible?: number;
    size?: 'sm' | 'md' | 'lg';
    showAll?: boolean;
}

export function BadgeDisplay({
    badges,
    maxVisible = 5,
    size = 'md',
    showAll = false
}: BadgeDisplayProps) {
    if (!badges || badges.length === 0) {
        return null;
    }

    // Sort by importance (platinum first)
    const sortedBadges = sortBadgesByImportance(badges);
    const displayBadges = showAll ? sortedBadges : sortedBadges.slice(0, maxVisible);
    const remainingCount = sortedBadges.length - maxVisible;

    return (
        <div className="flex items-center gap-1">
            {displayBadges.map((badge, index) => (
                <motion.div
                    key={badge.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                >
                    <BadgeIcon badge={badge} size={size} />
                </motion.div>
            ))}

            {!showAll && remainingCount > 0 && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className={`
                        rounded-full bg-slate-800 border border-white/10
                        flex items-center justify-center
                        text-[10px] font-bold text-slate-400
                    `}
                    style={{
                        width: size === 'sm' ? 24 : size === 'md' ? 32 : 40,
                        height: size === 'sm' ? 24 : size === 'md' ? 32 : 40
                    }}
                >
                    +{remainingCount}
                </motion.div>
            )}
        </div>
    );
}

// ===========================================
// BADGE GRID (For Profile Page)
// ===========================================

interface BadgeGridProps {
    badges: Badge[];
}

export function BadgeGrid({ badges }: BadgeGridProps) {
    if (!badges || badges.length === 0) {
        return (
            <div className="text-center py-8 text-slate-500">
                <LucideIcons.Award className="w-12 h-12 mx-auto mb-2 opacity-30" />
                <p className="text-sm">Brak odznak</p>
                <p className="text-xs">Zdobądź pierwsze odznaki wykonując zlecenia!</p>
            </div>
        );
    }

    const sortedBadges = sortBadgesByImportance(badges);

    return (
        <div className="grid grid-cols-4 gap-4">
            {sortedBadges.map((badge, index) => (
                <motion.div
                    key={badge.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="flex flex-col items-center text-center"
                >
                    <BadgeIcon badge={badge} size="lg" showTooltip={false} />
                    <p className="text-xs font-medium text-white mt-2">{badge.name}</p>
                    {badge.tier && (
                        <span className={`
                            text-[9px] font-bold uppercase
                            bg-gradient-to-r ${getTierGradient(badge.tier)} bg-clip-text text-transparent
                        `}>
                            {badge.tier}
                        </span>
                    )}
                </motion.div>
            ))}
        </div>
    );
}

// ===========================================
// FEATURED BADGE (Hero Display)
// ===========================================

interface FeaturedBadgeProps {
    badge: Badge;
}

export function FeaturedBadge({ badge }: FeaturedBadgeProps) {
    const gradient = getTierGradient(badge.tier);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const IconComponent = (LucideIcons as any)[badge.icon] as React.ComponentType<{ className?: string }>
        || LucideIcons.Award;

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className={`
                relative p-4 rounded-2xl
                bg-gradient-to-br ${gradient}
                shadow-xl border border-white/20
            `}
        >
            <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur flex items-center justify-center">
                    <IconComponent className="w-6 h-6 text-white" />
                </div>
                <div>
                    <h4 className="font-bold text-white">{badge.name}</h4>
                    <p className="text-xs text-white/80">{badge.description}</p>
                </div>
            </div>

            {badge.tier && (
                <div className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-black/20 text-[10px] font-bold text-white uppercase">
                    {badge.tier}
                </div>
            )}
        </motion.div>
    );
}
