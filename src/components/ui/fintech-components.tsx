/**
 * Fintech Night UI Components
 * 
 * Design System wzorowany na terminalach tradingowych:
 * - Dark mode (slate-950 background)
 * - Neon accents (sky-400, emerald-400)
 * - Monospace fonts for data
 * - Glassmorphism elements
 */

"use client";

import { motion } from "framer-motion";
import {
    Star,
    TrendingUp,
    TrendingDown,
    Clock,
    CheckCircle2,
    XCircle,
    AlertCircle,
    Zap,
    Award,
    ChevronRight
} from "lucide-react";

// ===========================================
// PRICE DISPLAY
// ===========================================

interface PriceDisplayProps {
    amount: number;
    currency?: string;
    size?: 'sm' | 'md' | 'lg' | 'xl';
    showCurrency?: boolean;
    trend?: 'up' | 'down' | 'neutral';
    animated?: boolean;
}

export function PriceDisplay({
    amount,
    currency = 'PLN',
    size = 'md',
    showCurrency = true,
    trend,
    animated = true
}: PriceDisplayProps) {
    const sizeClasses = {
        sm: 'text-sm',
        md: 'text-lg',
        lg: 'text-2xl',
        xl: 'text-4xl'
    };

    const trendColors = {
        up: 'text-emerald-400',
        down: 'text-red-400',
        neutral: 'text-slate-300'
    };

    const formattedAmount = new Intl.NumberFormat('pl-PL', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2
    }).format(amount);

    const content = (
        <span className={`font-mono font-bold ${sizeClasses[size]} ${trend ? trendColors[trend] : 'text-emerald-400'}`}>
            {formattedAmount}
            {showCurrency && (
                <span className="ml-1 text-slate-500 font-normal">{currency}</span>
            )}
            {trend === 'up' && <TrendingUp className="inline-block ml-1 w-4 h-4" />}
            {trend === 'down' && <TrendingDown className="inline-block ml-1 w-4 h-4" />}
        </span>
    );

    if (animated) {
        return (
            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3 }}
            >
                {content}
            </motion.div>
        );
    }

    return content;
}

// ===========================================
// STATUS BADGE
// ===========================================

type StatusType =
    | 'inquiry'
    | 'pending'
    | 'confirmed'
    | 'active'
    | 'completed'
    | 'canceled'
    | 'expired';

interface StatusBadgeProps {
    status: StatusType;
    size?: 'sm' | 'md';
    pulse?: boolean;
}

const STATUS_CONFIG: Record<StatusType, {
    label: string;
    color: string;
    bgColor: string;
    icon: React.ElementType;
}> = {
    inquiry: {
        label: 'Zapytanie',
        color: 'text-slate-300',
        bgColor: 'bg-slate-700/50',
        icon: AlertCircle
    },
    pending: {
        label: 'Oczekuje',
        color: 'text-amber-400',
        bgColor: 'bg-amber-500/20',
        icon: Clock
    },
    confirmed: {
        label: 'Potwierdzone',
        color: 'text-sky-400',
        bgColor: 'bg-sky-500/20',
        icon: CheckCircle2
    },
    active: {
        label: 'W realizacji',
        color: 'text-emerald-400',
        bgColor: 'bg-emerald-500/20',
        icon: Zap
    },
    completed: {
        label: 'Zakończone',
        color: 'text-slate-400',
        bgColor: 'bg-slate-700/50',
        icon: CheckCircle2
    },
    canceled: {
        label: 'Anulowane',
        color: 'text-red-400',
        bgColor: 'bg-red-500/20',
        icon: XCircle
    },
    expired: {
        label: 'Wygasło',
        color: 'text-slate-500',
        bgColor: 'bg-slate-800/50',
        icon: Clock
    }
};

export function StatusBadge({ status, size = 'md', pulse = false }: StatusBadgeProps) {
    const config = STATUS_CONFIG[status];
    const Icon = config.icon;

    const sizeClasses = {
        sm: 'px-2 py-0.5 text-[10px]',
        md: 'px-3 py-1 text-xs'
    };

    return (
        <span className={`
            inline-flex items-center gap-1.5 rounded-full font-semibold uppercase tracking-wider
            ${config.color} ${config.bgColor} ${sizeClasses[size]}
            border border-white/5
        `}>
            {pulse && (
                <span className={`w-1.5 h-1.5 rounded-full ${config.color.replace('text', 'bg')} animate-pulse`} />
            )}
            <Icon className="w-3 h-3" />
            {config.label}
        </span>
    );
}

// ===========================================
// BOOKING CARD (Trade Ticket Style)
// ===========================================

interface BookingCardProps {
    id: string;
    hashCode: string;
    title: string;
    hostName: string;
    hostAvatar?: string;
    status: StatusType;
    scheduledDate: Date;
    price: number;
    isSuperFachowiec?: boolean;
    onClick?: () => void;
}

export function BookingCard({
    id: _id,
    hashCode,
    title,
    hostName,
    hostAvatar,
    status,
    scheduledDate,
    price,
    isSuperFachowiec,
    onClick
}: BookingCardProps) {
    const formattedDate = new Intl.DateTimeFormat('pl-PL', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit'
    }).format(scheduledDate);

    return (
        <motion.div
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            onClick={onClick}
            className={`
                relative bg-slate-900/50 backdrop-blur-md 
                border border-white/5 rounded-lg
                p-4 cursor-pointer
                hover:border-sky-500/30 hover:shadow-[0_0_20px_rgba(56,189,248,0.1)]
                transition-all duration-200
            `}
        >
            {/* Trade Ticket Header */}
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-white/5">
                <span className="font-mono text-[10px] text-slate-500 uppercase tracking-widest">
                    {hashCode}
                </span>
                <StatusBadge status={status} size="sm" pulse={status === 'active'} />
            </div>

            {/* Content */}
            <div className="flex items-start gap-3">
                {/* Avatar */}
                <div className="relative">
                    {hostAvatar ? (
                        <img
                            src={hostAvatar}
                            alt={hostName}
                            className="w-10 h-10 rounded-full object-cover border border-white/10"
                        />
                    ) : (
                        <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center">
                            <span className="text-sm text-slate-400">{hostName[0]}</span>
                        </div>
                    )}
                    {isSuperFachowiec && (
                        <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-amber-500 rounded-full flex items-center justify-center">
                            <Award className="w-3 h-3 text-slate-900" />
                        </div>
                    )}
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-semibold text-white truncate">{title}</h4>
                    <p className="text-xs text-slate-400">{hostName}</p>
                    <p className="text-[10px] text-slate-500 font-mono mt-1">{formattedDate}</p>
                </div>

                {/* Price */}
                <div className="text-right">
                    <PriceDisplay amount={price} size="md" animated={false} />
                </div>
            </div>

            {/* Action indicator */}
            <ChevronRight className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600" />
        </motion.div>
    );
}

// ===========================================
// GAUGE CHART (Performance Indicator)
// ===========================================

interface GaugeChartProps {
    value: number;
    max?: number;
    label: string;
    thresholds?: {
        danger: number;
        warning: number;
        success: number;
    };
    size?: 'sm' | 'md' | 'lg';
    showValue?: boolean;
    valueFormat?: (value: number) => string;
}

export function GaugeChart({
    value,
    max = 100,
    label,
    thresholds = { danger: 30, warning: 60, success: 80 },
    size = 'md',
    showValue = true,
    valueFormat = (v) => `${Math.round(v)}%`
}: GaugeChartProps) {
    const percentage = Math.min(100, (value / max) * 100);

    // Determine color based on thresholds
    let color = 'text-red-400';

    if (percentage >= thresholds.success) {
        color = 'text-emerald-400';
    } else if (percentage >= thresholds.warning) {
        color = 'text-amber-400';
    }

    const sizeConfig = {
        sm: { width: 60, height: 60, strokeWidth: 6, fontSize: 'text-xs' },
        md: { width: 80, height: 80, strokeWidth: 8, fontSize: 'text-sm' },
        lg: { width: 120, height: 120, strokeWidth: 10, fontSize: 'text-lg' }
    };

    const config = sizeConfig[size];
    const radius = (config.width - config.strokeWidth) / 2;
    const circumference = radius * Math.PI; // Half circle
    const offset = circumference - (percentage / 100) * circumference;

    return (
        <div className="flex flex-col items-center">
            <div className="relative" style={{ width: config.width, height: config.height / 2 + 10 }}>
                <svg
                    width={config.width}
                    height={config.height / 2 + config.strokeWidth}
                    className="rotate-0"
                >
                    {/* Background arc */}
                    <path
                        d={`M ${config.strokeWidth / 2} ${config.height / 2} 
                            A ${radius} ${radius} 0 0 1 ${config.width - config.strokeWidth / 2} ${config.height / 2}`}
                        fill="none"
                        stroke="rgb(51 65 85)" // slate-700
                        strokeWidth={config.strokeWidth}
                        strokeLinecap="round"
                    />
                    {/* Value arc */}
                    <motion.path
                        d={`M ${config.strokeWidth / 2} ${config.height / 2} 
                            A ${radius} ${radius} 0 0 1 ${config.width - config.strokeWidth / 2} ${config.height / 2}`}
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={config.strokeWidth}
                        strokeLinecap="round"
                        strokeDasharray={circumference}
                        initial={{ strokeDashoffset: circumference }}
                        animate={{ strokeDashoffset: offset }}
                        transition={{ duration: 1, ease: "easeOut" }}
                        className={color}
                    />
                </svg>

                {showValue && (
                    <div className={`absolute inset-0 flex items-end justify-center pb-1 ${config.fontSize} font-mono font-bold ${color}`}>
                        {valueFormat(value)}
                    </div>
                )}
            </div>
            <span className="text-[10px] text-slate-500 uppercase tracking-wider mt-1">{label}</span>
        </div>
    );
}

// ===========================================
// RATING DISPLAY
// ===========================================

interface RatingDisplayProps {
    rating: number;
    reviewCount?: number;
    size?: 'sm' | 'md' | 'lg';
    showStars?: boolean;
}

export function RatingDisplay({
    rating,
    reviewCount,
    size = 'md',
    showStars = true
}: RatingDisplayProps) {
    const sizeClasses = {
        sm: 'text-sm',
        md: 'text-lg',
        lg: 'text-2xl'
    };

    const starSize = {
        sm: 'w-3 h-3',
        md: 'w-4 h-4',
        lg: 'w-5 h-5'
    };

    return (
        <div className="flex items-center gap-1.5">
            {showStars && (
                <Star className={`${starSize[size]} text-amber-400 fill-amber-400`} />
            )}
            <span className={`font-mono font-bold ${sizeClasses[size]} text-white`}>
                {rating.toFixed(1)}
            </span>
            {reviewCount !== undefined && (
                <span className="text-slate-500 text-xs">
                    ({reviewCount})
                </span>
            )}
        </div>
    );
}

// ===========================================
// SUPER-FACHOWIEC BADGE
// ===========================================

interface SuperFachowiecBadgeProps {
    streak?: number;
    size?: 'sm' | 'md' | 'lg';
}

export function SuperFachowiecBadge({ streak = 1, size = 'md' }: SuperFachowiecBadgeProps) {
    let tier = 'standard';
    let label = 'Super-Fachowiec';
    let color = 'from-sky-500 to-cyan-400';

    if (streak >= 8) {
        tier = 'legend';
        label = 'LEGEND';
        color = 'from-purple-500 to-pink-500';
    } else if (streak >= 4) {
        tier = 'gold';
        label = 'GOLD';
        color = 'from-amber-500 to-yellow-400';
    }

    const sizeClasses = {
        sm: 'px-2 py-0.5 text-[10px]',
        md: 'px-3 py-1 text-xs',
        lg: 'px-4 py-1.5 text-sm'
    };

    return (
        <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className={`
                inline-flex items-center gap-1.5 rounded-full font-bold uppercase tracking-wider
                bg-gradient-to-r ${color} text-white
                ${sizeClasses[size]}
                shadow-lg
            `}
        >
            <Award className={size === 'sm' ? 'w-3 h-3' : 'w-4 h-4'} />
            <span>{tier === 'standard' ? 'Super-Fachowiec' : `Super-Fachowiec ${label}`}</span>
        </motion.div>
    );
}

// ===========================================
// GLASSMORPHISM CARD
// ===========================================

interface GlassCardProps {
    children: React.ReactNode;
    className?: string;
    hover?: boolean;
    onClick?: () => void;
}

export function GlassCard({ children, className = '', hover = false, onClick }: GlassCardProps) {
    return (
        <motion.div
            whileHover={hover ? { scale: 1.02 } : undefined}
            whileTap={hover ? { scale: 0.98 } : undefined}
            onClick={onClick}
            className={`
                bg-slate-900/50 backdrop-blur-xl 
                border border-white/10 rounded-2xl
                shadow-2xl
                ${hover ? 'cursor-pointer hover:border-white/20' : ''}
                ${className}
            `}
        >
            {children}
        </motion.div>
    );
}

// ===========================================
// TREND LINE (Sparkline)
// ===========================================

interface TrendLineProps {
    data: number[];
    width?: number;
    height?: number;
    color?: 'emerald' | 'red' | 'sky' | 'amber';
    showDots?: boolean;
}

export function TrendLine({
    data,
    width = 100,
    height = 30,
    color = 'emerald',
    showDots = false
}: TrendLineProps) {
    if (data.length < 2) return null;

    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;

    const points = data.map((value, index) => {
        const x = (index / (data.length - 1)) * width;
        const y = height - ((value - min) / range) * height;
        return `${x},${y}`;
    }).join(' ');

    const colorClasses = {
        emerald: 'stroke-emerald-400',
        red: 'stroke-red-400',
        sky: 'stroke-sky-400',
        amber: 'stroke-amber-400'
    };

    // Determine trend direction for gradient
    const isUpward = data[data.length - 1] > data[0];
    const strokeColor = isUpward ? colorClasses.emerald : colorClasses.red;

    return (
        <svg width={width} height={height} className="overflow-visible">
            {/* Gradient fill under line */}
            <defs>
                <linearGradient id={`gradient-${color}`} x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor={isUpward ? 'rgb(52 211 153)' : 'rgb(248 113 113)'} stopOpacity="0.3" />
                    <stop offset="100%" stopColor={isUpward ? 'rgb(52 211 153)' : 'rgb(248 113 113)'} stopOpacity="0" />
                </linearGradient>
            </defs>

            {/* Fill area */}
            <polygon
                points={`0,${height} ${points} ${width},${height}`}
                fill={`url(#gradient-${color})`}
            />

            {/* Line */}
            <motion.polyline
                points={points}
                fill="none"
                className={strokeColor}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 1 }}
            />

            {/* End dot */}
            {showDots && (
                <circle
                    cx={width}
                    cy={height - ((data[data.length - 1] - min) / range) * height}
                    r="3"
                    className={`${strokeColor.replace('stroke', 'fill')}`}
                />
            )}
        </svg>
    );
}

// ===========================================
// TRANSACTION ROW (for history lists)
// ===========================================

interface TransactionRowProps {
    hashCode: string;
    title: string;
    date: Date;
    amount: number;
    status: StatusType;
}

export function TransactionRow({ hashCode, title, date, amount, status }: TransactionRowProps) {
    const formattedDate = new Intl.DateTimeFormat('pl-PL', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    }).format(date);

    return (
        <div className="flex items-center justify-between py-3 border-b border-white/5 last:border-0">
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-slate-800 flex items-center justify-center">
                    <span className="text-xs font-mono text-slate-500">
                        {hashCode.slice(-4)}
                    </span>
                </div>
                <div>
                    <p className="text-sm text-white font-medium">{title}</p>
                    <p className="text-xs text-slate-500 font-mono">{formattedDate}</p>
                </div>
            </div>

            <div className="flex items-center gap-3">
                <StatusBadge status={status} size="sm" />
                <PriceDisplay
                    amount={amount}
                    size="sm"
                    animated={false}
                    trend={status === 'completed' ? 'up' : 'neutral'}
                />
            </div>
        </div>
    );
}
