"use client";

import { motion, useMotionValue, useTransform, PanInfo } from "framer-motion";
import { useState } from "react";
import {
    TrendingUp,
    ChevronRight,
    MapPin,
    Clock,
    DollarSign,
    Briefcase,
    MessageCircle,
    Check,
    X
} from "lucide-react";

// ===========================================
// NEW COLOR PALETTE (Indigo/Violet instead of Green)
// ===========================================

const COLORS = {
    primary: {
        base: 'rgb(99, 102, 241)',      // indigo-500
        light: 'rgb(129, 140, 248)',    // indigo-400
        dark: 'rgb(79, 70, 229)',       // indigo-600
        glow: 'rgba(99, 102, 241, 0.5)'
    },
    accent: {
        base: 'rgb(139, 92, 246)',      // violet-500
        light: 'rgb(167, 139, 250)',    // violet-400
    },
    success: {
        base: 'rgb(34, 197, 94)',       // green-500
        light: 'rgb(74, 222, 128)'      // green-400
    }
};

// ===========================================
// JOB RADAR (Redesigned - Indigo/Cyan)
// ===========================================

interface JobRadarProps {
    isScanning?: boolean;
    hasNewJob?: boolean;
    onJobFound?: () => void;
}

export function JobRadar({ isScanning = true, hasNewJob = false, onJobFound }: JobRadarProps) {
    return (
        <div className="relative w-full aspect-square max-w-[180px] mx-auto">
            {/* Background circles - indigo gradient */}
            <div className="absolute inset-0 rounded-full border border-indigo-500/30" />
            <div className="absolute inset-[15%] rounded-full border border-indigo-400/25" />
            <div className="absolute inset-[30%] rounded-full border border-indigo-300/20" />
            <div className="absolute inset-[45%] rounded-full border border-indigo-200/15" />

            {/* Outer glow */}
            <div className="absolute inset-0 rounded-full bg-gradient-to-br from-indigo-500/5 to-violet-500/10" />

            {/* Center dot with glow */}
            <div className="absolute inset-[44%] rounded-full bg-gradient-to-br from-indigo-400 to-violet-500 shadow-[0_0_30px_rgba(99,102,241,0.6)]" />

            {/* Scanning line - gradient sweep */}
            {isScanning && (
                <motion.div
                    className="absolute inset-0 origin-center"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 2.5, repeat: Infinity, ease: "linear" }}
                >
                    <div
                        className="absolute top-1/2 left-1/2 w-1/2 h-0.5"
                        style={{
                            background: 'linear-gradient(to right, rgba(129,140,248,0.9), rgba(139,92,246,0.3), transparent)',
                            transformOrigin: 'left center'
                        }}
                    />
                </motion.div>
            )}

            {/* Pulse when job found */}
            {hasNewJob && (
                <>
                    <motion.div
                        className="absolute inset-0 rounded-full bg-violet-500/20"
                        animate={{ scale: [1, 1.4], opacity: [0.6, 0] }}
                        transition={{ duration: 1.2, repeat: Infinity }}
                    />
                    <motion.div
                        className="absolute top-[18%] right-[22%] w-5 h-5 rounded-full bg-gradient-to-br from-violet-400 to-pink-500 shadow-[0_0_20px_rgba(139,92,246,0.8)] cursor-pointer"
                        animate={{ scale: [1, 1.15, 1] }}
                        transition={{ duration: 0.6, repeat: Infinity }}
                        onClick={onJobFound}
                    />
                </>
            )}

            {/* Status text */}
            <div className="absolute -bottom-6 left-0 right-0 text-center">
                <span className={`text-xs font-medium ${hasNewJob ? 'text-violet-400' : 'text-slate-500'}`}>
                    {hasNewJob ? '🎯 Nowe zlecenie!' : isScanning ? 'Skanowanie...' : 'Wstrzymano'}
                </span>
            </div>
        </div>
    );
}

// ===========================================
// SWIPE TO ACCEPT (Redesigned)
// ===========================================

interface SwipeToAcceptProps {
    onAccept: () => void;
    label?: string;
    disabled?: boolean;
}

export function SwipeToAccept({ onAccept, label = "Przesuń aby przyjąć", disabled = false }: SwipeToAcceptProps) {
    const [isComplete, setIsComplete] = useState(false);
    const x = useMotionValue(0);
    const trackWidth = 280;
    const thumbWidth = 56;
    const maxDrag = trackWidth - thumbWidth - 8;

    const background = useTransform(
        x,
        [0, maxDrag],
        ['rgba(99,102,241,0.1)', 'rgba(139,92,246,0.3)']
    );

    const textOpacity = useTransform(
        x,
        [0, maxDrag * 0.5, maxDrag],
        [1, 0.3, 0]
    );

    const handleDragEnd = (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
        if (info.offset.x >= maxDrag * 0.8 && !disabled) {
            setIsComplete(true);
            onAccept();
        }
    };

    if (isComplete) {
        return (
            <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="w-full h-14 bg-green-500/20 border border-green-400/30 rounded-full flex items-center justify-center gap-2"
            >
                <Check className="w-5 h-5 text-green-400" />
                <span className="text-green-400 font-bold text-sm">Przyjęto!</span>
            </motion.div>
        );
    }

    return (
        <motion.div
            style={{ background }}
            className="relative w-full h-14 border border-indigo-500/30 rounded-full overflow-hidden"
        >
            <motion.span
                style={{ opacity: textOpacity }}
                className="absolute inset-0 flex items-center justify-center text-indigo-400/70 text-sm font-medium pointer-events-none"
            >
                {label}
                <ChevronRight className="w-4 h-4 ml-1 animate-pulse" />
            </motion.span>

            <motion.div
                drag="x"
                dragConstraints={{ left: 0, right: maxDrag }}
                dragElastic={0}
                onDragEnd={handleDragEnd}
                style={{ x }}
                className={`absolute left-1 top-1 bottom-1 w-12 rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 flex items-center justify-center cursor-grab active:cursor-grabbing shadow-lg ${disabled ? 'opacity-50' : ''}`}
            >
                <ChevronRight className="w-5 h-5 text-white" />
            </motion.div>
        </motion.div>
    );
}

// ===========================================
// JOB REQUEST CARD (Redesigned - Better contrast)
// ===========================================

interface JobRequest {
    id: string;
    clientName: string;
    serviceType: string;
    description: string;
    distance: string;
    estimatedEarnings: number;
    address: string;
    clientAvatar?: string;
}

interface JobRequestCardProps {
    job: JobRequest;
    onAccept: (jobId: string) => void;
    onDecline: (jobId: string) => void;
    onChat?: (jobId: string) => void;
}

export function JobRequestCard({ job, onAccept, onDecline, onChat }: JobRequestCardProps) {
    return (
        <motion.div
            initial={{ y: 100, opacity: 0, scale: 0.9 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 100, opacity: 0, scale: 0.9 }}
            className="bg-slate-900/95 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden shadow-2xl"
        >
            {/* Header - Gradient */}
            <div className="bg-gradient-to-r from-indigo-500/20 to-violet-500/20 px-4 py-3 flex items-center justify-between border-b border-white/5">
                <div className="flex items-center gap-3">
                    {/* Client Avatar */}
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-400 to-violet-500 flex items-center justify-center text-white font-bold text-sm">
                        {job.clientName.charAt(0)}
                    </div>
                    <div>
                        <p className="text-white font-medium text-sm">{job.clientName}</p>
                        <p className="text-slate-400 text-xs">{job.serviceType}</p>
                    </div>
                </div>
                <div className="text-right">
                    <span className="text-xl font-bold bg-gradient-to-r from-green-400 to-emerald-500 bg-clip-text text-transparent">
                        +{job.estimatedEarnings} zł
                    </span>
                </div>
            </div>

            {/* Content */}
            <div className="p-4 space-y-4">
                <p className="text-slate-300 text-sm leading-relaxed">{job.description}</p>

                {/* Info chips */}
                <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-800/80 text-xs text-slate-300">
                        <MapPin className="w-3.5 h-3.5 text-indigo-400" />
                        {job.distance}
                    </span>
                    <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-800/80 text-xs text-slate-300">
                        <Clock className="w-3.5 h-3.5 text-violet-400" />
                        ~25 min dojazdu
                    </span>
                </div>

                {/* Action buttons */}
                <div className="flex items-center gap-2 pt-2">
                    <button
                        onClick={() => onDecline(job.id)}
                        className="flex-1 py-3 px-4 rounded-xl bg-slate-800/50 border border-slate-700/50 text-slate-400 hover:text-red-400 hover:border-red-500/30 transition-all flex items-center justify-center gap-2"
                    >
                        <X className="w-4 h-4" />
                        Odrzuć
                    </button>
                    {onChat && (
                        <button
                            onClick={() => onChat(job.id)}
                            className="py-3 px-4 rounded-xl bg-slate-800/50 border border-slate-700/50 text-slate-400 hover:text-indigo-400 hover:border-indigo-500/30 transition-all"
                        >
                            <MessageCircle className="w-4 h-4" />
                        </button>
                    )}
                    <button
                        onClick={() => onAccept(job.id)}
                        className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-500 text-white font-medium hover:from-indigo-600 hover:to-violet-600 transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/25"
                    >
                        <Check className="w-4 h-4" />
                        Przyjmij
                    </button>
                </div>
            </div>
        </motion.div>
    );
}

// ===========================================
// EARNINGS WIDGET (Redesigned)
// ===========================================

interface EarningsWidgetProps {
    todayEarnings: number;
    weeklyEarnings: number;
    weeklyChange: number;
    compact?: boolean;
    dailyData?: number[]; // Real data for chart
}

export function EarningsWidget({
    todayEarnings,
    weeklyEarnings,
    weeklyChange,
    compact = false,
    dailyData = [40, 60, 35, 80, 55, 90, 70]
}: EarningsWidgetProps) {
    if (compact) {
        return (
            <div className="bg-slate-800/60 backdrop-blur-md border border-white/10 rounded-xl px-3 py-2 flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center">
                    <DollarSign className="w-3.5 h-3.5 text-white" />
                </div>
                <span className="text-white font-bold text-sm">{todayEarnings} zł</span>
                <span className={`text-xs font-medium ${weeklyChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {weeklyChange >= 0 ? '↑' : '↓'}{Math.abs(weeklyChange)}%
                </span>
            </div>
        );
    }

    const maxValue = Math.max(...dailyData, 1);

    return (
        <div className="bg-slate-900/80 backdrop-blur-xl border border-white/10 rounded-2xl p-5 space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <h3 className="text-white font-semibold">Zarobki</h3>
                <div className={`flex items-center gap-1 text-xs font-medium ${weeklyChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    <TrendingUp className="w-4 h-4" />
                    {weeklyChange >= 0 ? '+' : ''}{weeklyChange}%
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-6">
                <div>
                    <p className="text-slate-500 text-xs mb-1">Dzisiaj</p>
                    <p className="text-3xl font-bold text-white">
                        {todayEarnings}
                        <span className="text-base text-slate-500 ml-1">zł</span>
                    </p>
                </div>
                <div>
                    <p className="text-slate-500 text-xs mb-1">Ten tydzień</p>
                    <p className="text-3xl font-bold text-white">
                        {weeklyEarnings}
                        <span className="text-base text-slate-500 ml-1">zł</span>
                    </p>
                </div>
            </div>

            {/* Chart */}
            <div className="flex items-end gap-1.5 h-16 pt-2">
                {dailyData.map((value, i) => (
                    <motion.div
                        key={i}
                        initial={{ height: 0 }}
                        animate={{ height: `${(value / maxValue) * 100}%` }}
                        transition={{ delay: i * 0.08, type: "spring", stiffness: 200 }}
                        className={`flex-1 rounded-t-md ${i === dailyData.length - 1
                                ? 'bg-gradient-to-t from-indigo-500 to-violet-400'
                                : 'bg-slate-700/50'
                            }`}
                    />
                ))}
            </div>
            <div className="flex justify-between text-[10px] text-slate-600">
                {['Pn', 'Wt', 'Śr', 'Cz', 'Pt', 'So', 'Nd'].map((day, i) => (
                    <span key={day} className={i === 6 ? 'text-indigo-400 font-medium' : ''}>
                        {day}
                    </span>
                ))}
            </div>
        </div>
    );
}

// ===========================================
// STAT CARD (New component)
// ===========================================

interface StatCardProps {
    icon: React.ReactNode;
    label: string;
    value: string | number;
    subValue?: string;
    color?: 'indigo' | 'violet' | 'cyan' | 'green';
}

export function StatCard({ icon, label, value, subValue, color = 'indigo' }: StatCardProps) {
    const colorClasses = {
        indigo: 'from-indigo-500/20 to-indigo-600/10 border-indigo-500/20',
        violet: 'from-violet-500/20 to-violet-600/10 border-violet-500/20',
        cyan: 'from-cyan-500/20 to-cyan-600/10 border-cyan-500/20',
        green: 'from-green-500/20 to-green-600/10 border-green-500/20'
    };

    const iconColors = {
        indigo: 'text-indigo-400',
        violet: 'text-violet-400',
        cyan: 'text-cyan-400',
        green: 'text-green-400'
    };

    return (
        <div className={`bg-gradient-to-br ${colorClasses[color]} backdrop-blur-sm border rounded-xl p-4 flex flex-col items-center text-center`}>
            <div className={`${iconColors[color]} mb-2`}>
                {icon}
            </div>
            <p className="text-2xl font-bold text-white">{value}</p>
            {subValue && <p className="text-xs text-slate-500">{subValue}</p>}
            <p className="text-xs text-slate-400 mt-1">{label}</p>
        </div>
    );
}

// ===========================================
// QUICK ACTION BUTTON
// ===========================================

interface QuickActionProps {
    icon: React.ReactNode;
    label: string;
    onClick: () => void;
    variant?: 'primary' | 'secondary';
}

export function QuickAction({ icon, label, onClick, variant = 'secondary' }: QuickActionProps) {
    return (
        <button
            onClick={onClick}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm transition-all ${variant === 'primary'
                    ? 'bg-gradient-to-r from-indigo-500 to-violet-500 text-white hover:from-indigo-600 hover:to-violet-600 shadow-lg shadow-indigo-500/20'
                    : 'bg-slate-800/60 border border-white/10 text-slate-300 hover:bg-slate-700/60 hover:text-white'
                }`}
        >
            {icon}
            {label}
        </button>
    );
}
