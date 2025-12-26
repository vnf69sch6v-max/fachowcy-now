"use client";

import { Timestamp } from "firebase/firestore";
import { Shield, Star, Clock, CheckCircle, Award, Zap } from "lucide-react";
import { BadgeType, ProfileStats } from "@/types/firestore";

// ===========================================
// TENURE CALCULATION (Polish Plurals)
// ===========================================

/**
 * Calculate tenure from joinedAt timestamp
 * Returns Polish text like "Z nami od 2 lat"
 */
export function calculateTenure(joinedAt: Timestamp | Date): string {
    const now = new Date();
    const joinedDate = joinedAt instanceof Timestamp ? joinedAt.toDate() : joinedAt;

    const diffMs = now.getTime() - joinedDate.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffMonths = Math.floor(diffDays / 30);
    const diffYears = Math.floor(diffDays / 365);

    if (diffYears >= 1) {
        return `Z nami od ${formatPolishYears(diffYears)}`;
    } else if (diffMonths >= 1) {
        return `Z nami od ${formatPolishMonths(diffMonths)}`;
    } else if (diffDays >= 7) {
        const weeks = Math.floor(diffDays / 7);
        return `Z nami od ${weeks} ${weeks === 1 ? 'tygodnia' : 'tygodni'}`;
    } else {
        return 'Nowy użytkownik';
    }
}

function formatPolishYears(years: number): string {
    if (years === 1) return '1 roku';
    if (years >= 2 && years <= 4) return `${years} lat`;
    return `${years} lat`;
}

function formatPolishMonths(months: number): string {
    if (months === 1) return '1 miesiąca';
    if (months >= 2 && months <= 4) return `${months} miesięcy`;
    return `${months} miesięcy`;
}

export function formatJoinYear(joinedAt: Timestamp | Date): string {
    const date = joinedAt instanceof Timestamp ? joinedAt.toDate() : joinedAt;
    return date.getFullYear().toString();
}

// ===========================================
// BADGE CONFIGURATION
// ===========================================

const BADGE_CONFIG: Record<BadgeType, { label: string; icon: React.ElementType; color: string }> = {
    VerifiedPro: { label: 'Zweryfikowany', icon: CheckCircle, color: 'text-blue-400' },
    TopRated: { label: 'Najwyżej oceniany', icon: Star, color: 'text-yellow-400' },
    '1YearClub': { label: '1 rok z nami', icon: Award, color: 'text-emerald-400' },
    '2YearClub': { label: '2+ lat z nami', icon: Award, color: 'text-purple-400' },
    FastResponder: { label: 'Szybkie odpowiedzi', icon: Zap, color: 'text-cyan-400' },
    TrustedPro: { label: 'Zaufany fachowiec', icon: Shield, color: 'text-amber-400' },
};

// ===========================================
// TRUST BADGE COMPONENT
// ===========================================

interface TrustBadgeProps {
    badge: BadgeType;
    size?: 'sm' | 'md';
    showLabel?: boolean;
}

export function TrustBadge({ badge, size = 'sm', showLabel = false }: TrustBadgeProps) {
    const config = BADGE_CONFIG[badge];
    if (!config) return null;

    const Icon = config.icon;
    const iconSize = size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4';

    return (
        <div className={`inline-flex items-center gap-1 ${size === 'md' ? 'px-2 py-1 bg-white/5 rounded-full' : ''}`}>
            <Icon className={`${iconSize} ${config.color} drop-shadow-[0_0_4px_currentColor]`} />
            {showLabel && (
                <span className={`text-xs ${config.color} font-medium`}>{config.label}</span>
            )}
        </div>
    );
}

// ===========================================
// TRUST CARD (Full Provider Trust Info)
// ===========================================

interface TrustCardProps {
    displayName: string;
    avatarUrl: string | null;
    profession?: string;
    stats: ProfileStats;
    badges: BadgeType[];
    compact?: boolean;
}

export function TrustCard({ displayName, avatarUrl, profession, stats, badges, compact = false }: TrustCardProps) {
    const tenure = calculateTenure(stats.joinedAt);
    const isVerified = badges.includes('VerifiedPro');

    if (compact) {
        return (
            <div className="flex items-center gap-3">
                {/* Avatar */}
                <div className="relative">
                    <img
                        src={avatarUrl || '/default-avatar.png'}
                        alt={displayName}
                        className="w-10 h-10 rounded-full object-cover border-2 border-white/10"
                    />
                    {isVerified && (
                        <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center border-2 border-slate-900">
                            <CheckCircle className="w-2.5 h-2.5 text-white" />
                        </div>
                    )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                        <h4 className="text-white font-semibold text-sm truncate">{displayName}</h4>
                        {badges.slice(0, 2).map(badge => (
                            <TrustBadge key={badge} badge={badge} size="sm" />
                        ))}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-400">
                        {profession && <span>{profession}</span>}
                        <span className="flex items-center gap-0.5 text-yellow-400">
                            <Star className="w-3 h-3 fill-current" />
                            {stats.rating.toFixed(1)}
                        </span>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-slate-800/50 backdrop-blur-md border border-white/10 rounded-2xl p-4 space-y-3">
            {/* Header */}
            <div className="flex items-center gap-3">
                <div className="relative">
                    <img
                        src={avatarUrl || '/default-avatar.png'}
                        alt={displayName}
                        className="w-14 h-14 rounded-full object-cover border-2 border-white/10"
                    />
                    {isVerified && (
                        <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center border-2 border-slate-900 shadow-[0_0_10px_rgba(59,130,246,0.5)]">
                            <CheckCircle className="w-3 h-3 text-white" />
                        </div>
                    )}
                </div>
                <div className="flex-1">
                    <h3 className="text-white font-bold text-base">{displayName}</h3>
                    {profession && <p className="text-slate-400 text-sm">{profession}</p>}
                </div>
            </div>

            {/* Badges Row */}
            {badges.length > 0 && (
                <div className="flex flex-wrap gap-2">
                    {badges.map(badge => (
                        <TrustBadge key={badge} badge={badge} size="md" showLabel />
                    ))}
                </div>
            )}

            {/* Stats Row */}
            <div className="flex items-center justify-between pt-2 border-t border-white/5">
                <div className="flex items-center gap-1 text-slate-400 text-xs">
                    <Shield className="w-3.5 h-3.5 text-emerald-400" />
                    <span>{tenure}</span>
                </div>
                <div className="flex items-center gap-1 text-slate-400 text-xs">
                    <CheckCircle className="w-3.5 h-3.5 text-blue-400" />
                    <span>{stats.jobsCompleted} zleceń</span>
                </div>
                <div className="flex items-center gap-1 text-slate-400 text-xs">
                    <Star className="w-3.5 h-3.5 text-yellow-400 fill-current" />
                    <span>{stats.rating.toFixed(1)}</span>
                </div>
                <div className="flex items-center gap-1 text-slate-400 text-xs">
                    <Clock className="w-3.5 h-3.5 text-cyan-400" />
                    <span>{stats.responseTime}m</span>
                </div>
            </div>
        </div>
    );
}
