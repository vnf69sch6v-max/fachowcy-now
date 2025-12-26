"use client";

import { motion, useMotionValue, useTransform, PanInfo } from "framer-motion";
import { useState, useEffect } from "react";
import {
    Radar,
    TrendingUp,
    ChevronRight,
    MapPin,
    Clock,
    DollarSign,
    Briefcase
} from "lucide-react";

// ===========================================
// JOB RADAR (Scanning Animation)
// ===========================================

interface JobRadarProps {
    isScanning?: boolean;
    hasNewJob?: boolean;
    onJobFound?: () => void;
}

export function JobRadar({ isScanning = true, hasNewJob = false, onJobFound }: JobRadarProps) {
    return (
        <div className="relative w-full aspect-square max-w-[200px] mx-auto">
            {/* Background circles */}
            <div className="absolute inset-0 rounded-full border border-emerald-500/20" />
            <div className="absolute inset-[15%] rounded-full border border-emerald-500/20" />
            <div className="absolute inset-[30%] rounded-full border border-emerald-500/20" />
            <div className="absolute inset-[45%] rounded-full border border-emerald-500/20" />

            {/* Center dot */}
            <div className="absolute inset-[46%] rounded-full bg-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.5)]" />

            {/* Scanning line */}
            {isScanning && (
                <motion.div
                    className="absolute inset-0 origin-center"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                >
                    <div
                        className="absolute top-1/2 left-1/2 w-1/2 h-0.5"
                        style={{
                            background: 'linear-gradient(to right, rgba(16,185,129,0.8), transparent)',
                            transformOrigin: 'left center'
                        }}
                    />
                </motion.div>
            )}

            {/* Pulse when job found */}
            {hasNewJob && (
                <>
                    <motion.div
                        className="absolute inset-0 rounded-full bg-emerald-500/20"
                        animate={{ scale: [1, 1.5], opacity: [0.5, 0] }}
                        transition={{ duration: 1, repeat: Infinity }}
                    />
                    <motion.div
                        className="absolute top-[20%] right-[25%] w-4 h-4 rounded-full bg-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.8)]"
                        animate={{ scale: [1, 1.2, 1] }}
                        transition={{ duration: 0.5, repeat: Infinity }}
                        onClick={onJobFound}
                    />
                </>
            )}

            {/* Status text */}
            <div className="absolute -bottom-8 left-0 right-0 text-center">
                <span className={`text-xs font-medium ${hasNewJob ? 'text-emerald-400' : 'text-slate-500'}`}>
                    {hasNewJob ? '🎯 Nowe zlecenie!' : isScanning ? 'Skanowanie...' : 'Wstrzymano'}
                </span>
            </div>
        </div>
    );
}

// ===========================================
// SWIPE TO ACCEPT
// ===========================================

interface SwipeToAcceptProps {
    onAccept: () => void;
    label?: string;
    disabled?: boolean;
}

export function SwipeToAccept({ onAccept, label = "Przesuń aby przyjąć", disabled = false }: SwipeToAcceptProps) {
    const [isComplete, setIsComplete] = useState(false);
    const x = useMotionValue(0);
    const trackWidth = 280; // Track width
    const thumbWidth = 56;
    const maxDrag = trackWidth - thumbWidth - 8;

    const background = useTransform(
        x,
        [0, maxDrag],
        ['rgba(16,185,129,0.1)', 'rgba(16,185,129,0.3)']
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
                className="w-full h-14 bg-emerald-500/20 border border-emerald-400/30 rounded-full flex items-center justify-center gap-2"
            >
                <span className="text-emerald-400 font-bold text-sm">✓ Przyjęto!</span>
            </motion.div>
        );
    }

    return (
        <motion.div
            style={{ background }}
            className="relative w-full h-14 border border-emerald-500/30 rounded-full overflow-hidden"
        >
            {/* Track */}
            <motion.span
                style={{ opacity: textOpacity }}
                className="absolute inset-0 flex items-center justify-center text-emerald-400/70 text-sm font-medium pointer-events-none"
            >
                {label}
                <ChevronRight className="w-4 h-4 ml-1 animate-pulse" />
            </motion.span>

            {/* Draggable thumb */}
            <motion.div
                drag="x"
                dragConstraints={{ left: 0, right: maxDrag }}
                dragElastic={0}
                onDragEnd={handleDragEnd}
                style={{ x }}
                className={`absolute left-1 top-1 bottom-1 w-12 rounded-full bg-emerald-500 flex items-center justify-center cursor-grab active:cursor-grabbing shadow-lg ${disabled ? 'opacity-50' : ''}`}
            >
                <ChevronRight className="w-5 h-5 text-white" />
            </motion.div>
        </motion.div>
    );
}

// ===========================================
// JOB REQUEST CARD (Enhanced for Pro)
// ===========================================

interface JobRequest {
    id: string;
    clientName: string;
    serviceType: string;
    description: string;
    distance: string;
    estimatedEarnings: number;
    address: string;
}

interface JobRequestCardProps {
    job: JobRequest;
    onAccept: (jobId: string) => void;
    onDecline: (jobId: string) => void;
}

export function JobRequestCard({ job, onAccept, onDecline }: JobRequestCardProps) {
    return (
        <motion.div
            initial={{ y: 100, opacity: 0, scale: 0.9 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 100, opacity: 0, scale: 0.9 }}
            className="bg-slate-900/90 backdrop-blur-xl border border-emerald-500/20 rounded-2xl overflow-hidden shadow-2xl"
        >
            {/* Header */}
            <div className="bg-emerald-500/10 px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="relative">
                        <Briefcase className="w-4 h-4 text-emerald-400" />
                        <div className="absolute inset-0 w-4 h-4 text-emerald-400 animate-ping opacity-50">
                            <Briefcase className="w-4 h-4" />
                        </div>
                    </div>
                    <span className="text-emerald-400 text-sm font-medium">Nowe zlecenie!</span>
                </div>
                <span className="text-emerald-400 text-lg font-bold">
                    +{job.estimatedEarnings} zł
                </span>
            </div>

            {/* Content */}
            <div className="p-4 space-y-3">
                <div>
                    <h4 className="text-white font-semibold">{job.serviceType}</h4>
                    <p className="text-slate-400 text-sm line-clamp-2">{job.description}</p>
                </div>

                <div className="flex items-center gap-4 text-xs text-slate-500">
                    <span className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5" />
                        {job.distance}
                    </span>
                    <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        ~30 min
                    </span>
                </div>

                {/* Swipe to accept */}
                <div className="pt-2">
                    <SwipeToAccept onAccept={() => onAccept(job.id)} />
                </div>

                {/* Decline button */}
                <button
                    onClick={() => onDecline(job.id)}
                    className="w-full py-2 text-slate-500 hover:text-red-400 text-sm transition-colors"
                >
                    Odrzuć
                </button>
            </div>
        </motion.div>
    );
}

// ===========================================
// EARNINGS WIDGET (Simple version - no recharts)
// ===========================================

interface EarningsWidgetProps {
    todayEarnings: number;
    weeklyEarnings: number;
    weeklyChange: number; // percentage
    compact?: boolean;
}

export function EarningsWidget({ todayEarnings, weeklyEarnings, weeklyChange, compact = false }: EarningsWidgetProps) {
    if (compact) {
        return (
            <div className="bg-slate-800/50 backdrop-blur-md border border-white/10 rounded-xl px-3 py-2 flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-emerald-400" />
                <span className="text-white font-bold text-sm">{todayEarnings} zł</span>
                <span className={`text-xs ${weeklyChange >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {weeklyChange >= 0 ? '+' : ''}{weeklyChange}%
                </span>
            </div>
        );
    }

    return (
        <div className="bg-slate-900/80 backdrop-blur-xl border border-white/10 rounded-2xl p-4 space-y-4">
            <div className="flex items-center justify-between">
                <h3 className="text-slate-400 text-sm font-medium">Zarobki</h3>
                <TrendingUp className={`w-4 h-4 ${weeklyChange >= 0 ? 'text-emerald-400' : 'text-red-400'}`} />
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div>
                    <p className="text-slate-500 text-xs mb-1">Dzisiaj</p>
                    <p className="text-2xl font-bold text-white">{todayEarnings} <span className="text-sm text-slate-400">zł</span></p>
                </div>
                <div>
                    <p className="text-slate-500 text-xs mb-1">Ten tydzień</p>
                    <p className="text-2xl font-bold text-white">{weeklyEarnings} <span className="text-sm text-slate-400">zł</span></p>
                </div>
            </div>

            {/* Mini bar chart placeholder */}
            <div className="flex items-end gap-1 h-12">
                {[40, 60, 35, 80, 55, 90, 70].map((height, i) => (
                    <motion.div
                        key={i}
                        initial={{ height: 0 }}
                        animate={{ height: `${height}%` }}
                        transition={{ delay: i * 0.1 }}
                        className={`flex-1 rounded-t ${i === 6 ? 'bg-emerald-500' : 'bg-emerald-500/30'}`}
                    />
                ))}
            </div>
            <div className="flex justify-between text-[10px] text-slate-600">
                <span>Pon</span>
                <span>Wt</span>
                <span>Śr</span>
                <span>Czw</span>
                <span>Pt</span>
                <span>Sob</span>
                <span className="text-emerald-400 font-medium">Nd</span>
            </div>
        </div>
    );
}
