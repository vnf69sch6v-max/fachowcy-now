/**
 * Performance Dashboard Component
 * 
 * Panel wydajności dla fachowców w stylu Fintech.
 * Pokazuje metryki potrzebne do statusu Super-Fachowiec.
 */

"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Award,
    TrendingUp,
    MessageCircle,
    XCircle,
    Calendar,
    Clock,
    ChevronRight,
    Sparkles
} from "lucide-react";
import {
    GlassCard,
    GaugeChart,
    RatingDisplay,
    TrendLine,
    PriceDisplay,
    SuperFachowiecBadge
} from "@/components/ui/fintech-components";
import {
    SUPER_FACHOWIEC_THRESHOLDS,
    getProgressToSuperFachowiec,
    EvaluationResult
} from "@/lib/super-fachowiec";

// ===========================================
// TYPES
// ===========================================

interface PerformanceMetrics {
    averageRating: number;
    reviewCount: number;
    responseRate: number;
    cancellationRate: number;
    completedBookings: number;
    totalHours: number;
    totalEarnings: number;
    isSuperFachowiec: boolean;
    superFachowiecStreak: number;
    ratingHistory: number[]; // Last 12 weeks
    earningsHistory: number[]; // Last 12 weeks
}

interface PerformanceDashboardProps {
    metrics?: PerformanceMetrics;
    nextEvaluationDate?: Date;
}

// ===========================================
// MOCK DATA (for demo)
// ===========================================

const MOCK_METRICS: PerformanceMetrics = {
    averageRating: 4.92,
    reviewCount: 47,
    responseRate: 0.94,
    cancellationRate: 0.02,
    completedBookings: 42,
    totalHours: 186,
    totalEarnings: 15420,
    isSuperFachowiec: true,
    superFachowiecStreak: 3,
    ratingHistory: [4.7, 4.75, 4.8, 4.82, 4.85, 4.88, 4.9, 4.89, 4.91, 4.92, 4.91, 4.92],
    earningsHistory: [1200, 1350, 980, 1450, 1320, 1580, 1420, 1650, 1380, 1520, 1480, 1540]
};

// ===========================================
// MAIN COMPONENT
// ===========================================

export function PerformanceDashboard({
    metrics = MOCK_METRICS,
    nextEvaluationDate = new Date(2025, 3, 1) // 1 April 2025
}: PerformanceDashboardProps) {
    const [activeTab, setActiveTab] = useState<'overview' | 'details'>('overview');

    // Calculate progress to Super-Fachowiec
    const evaluationResult: EvaluationResult = {
        hostId: 'current',
        qualifies: metrics.isSuperFachowiec,
        metrics: {
            averageRating: metrics.averageRating,
            responseRate: metrics.responseRate,
            cancellationRate: metrics.cancellationRate,
            completedBookings: metrics.completedBookings,
            totalHours: metrics.totalHours
        },
        failedCriteria: [],
        evaluatedAt: new Date()
    };

    const progressItems = getProgressToSuperFachowiec(evaluationResult);

    return (
        <div className="space-y-4 p-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-bold text-white">Performance</h2>
                    <p className="text-xs text-slate-500">Ostatnie 365 dni</p>
                </div>
                {metrics.isSuperFachowiec && (
                    <SuperFachowiecBadge streak={metrics.superFachowiecStreak} size="md" />
                )}
            </div>

            {/* Quick Stats Row */}
            <div className="grid grid-cols-3 gap-3">
                <GlassCard className="p-3 text-center">
                    <RatingDisplay rating={metrics.averageRating} reviewCount={metrics.reviewCount} size="lg" />
                    <p className="text-[10px] text-slate-500 mt-1">Średnia ocena</p>
                </GlassCard>

                <GlassCard className="p-3 text-center">
                    <p className="text-2xl font-bold font-mono text-white">{metrics.completedBookings}</p>
                    <p className="text-[10px] text-slate-500">Zleceń</p>
                </GlassCard>

                <GlassCard className="p-3 text-center">
                    <PriceDisplay amount={metrics.totalEarnings} size="md" showCurrency={false} />
                    <p className="text-[10px] text-slate-500">Zarobki (PLN)</p>
                </GlassCard>
            </div>

            {/* Earnings Trend */}
            <GlassCard className="p-4">
                <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-white">Trend zarobków</h3>
                    <div className="flex items-center gap-1 text-emerald-400">
                        <TrendingUp className="w-3 h-3" />
                        <span className="text-xs font-mono">+12%</span>
                    </div>
                </div>
                <TrendLine
                    data={metrics.earningsHistory}
                    width={320}
                    height={50}
                    color="emerald"
                    showDots
                />
            </GlassCard>

            {/* Super-Fachowiec Criteria */}
            <GlassCard className="p-4">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-amber-400" />
                        <h3 className="text-sm font-semibold text-white">Kryteria Super-Fachowiec</h3>
                    </div>
                    <span className="text-[10px] text-slate-500 font-mono">
                        Ewaluacja: {nextEvaluationDate.toLocaleDateString('pl-PL')}
                    </span>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    {/* Rating Gauge */}
                    <div className="flex flex-col items-center">
                        <GaugeChart
                            value={metrics.averageRating}
                            max={5}
                            label="Ocena"
                            thresholds={{ danger: 4.5, warning: 4.7, success: 4.8 }}
                            valueFormat={(v) => v.toFixed(2)}
                            size="md"
                        />
                        <span className="text-[10px] text-slate-500 mt-1">
                            Wymagane: ≥{SUPER_FACHOWIEC_THRESHOLDS.minRating}
                        </span>
                    </div>

                    {/* Response Rate Gauge */}
                    <div className="flex flex-col items-center">
                        <GaugeChart
                            value={metrics.responseRate * 100}
                            max={100}
                            label="Odpowiedzi"
                            thresholds={{ danger: 70, warning: 85, success: 90 }}
                            valueFormat={(v) => `${Math.round(v)}%`}
                            size="md"
                        />
                        <span className="text-[10px] text-slate-500 mt-1">
                            Wymagane: ≥{SUPER_FACHOWIEC_THRESHOLDS.minResponseRate * 100}%
                        </span>
                    </div>
                </div>

                {/* Progress Bars */}
                <div className="mt-4 space-y-3">
                    {progressItems.map((item, index) => (
                        <div key={index}>
                            <div className="flex items-center justify-between mb-1">
                                <span className="text-xs text-slate-400">{item.criteria}</span>
                                {item.met ? (
                                    <span className="text-emerald-400 text-[10px] font-bold">✓</span>
                                ) : (
                                    <span className="text-red-400 text-[10px] font-bold">✗</span>
                                )}
                            </div>
                            <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                                <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${Math.min(100, item.progress)}%` }}
                                    transition={{ duration: 1, delay: index * 0.1 }}
                                    className={`h-full rounded-full ${item.met ? 'bg-emerald-500' : 'bg-amber-500'
                                        }`}
                                />
                            </div>
                        </div>
                    ))}
                </div>
            </GlassCard>

            {/* Detailed Metrics */}
            <GlassCard className="p-4">
                <h3 className="text-sm font-semibold text-white mb-3">Szczegółowe metryki</h3>

                <div className="space-y-3">
                    <MetricRow
                        icon={<MessageCircle className="w-4 h-4 text-sky-400" />}
                        label="Wskaźnik odpowiedzi"
                        value={`${(metrics.responseRate * 100).toFixed(0)}%`}
                        status={metrics.responseRate >= 0.9 ? 'good' : 'warning'}
                    />
                    <MetricRow
                        icon={<XCircle className="w-4 h-4 text-red-400" />}
                        label="Wskaźnik anulowań"
                        value={`${(metrics.cancellationRate * 100).toFixed(1)}%`}
                        status={metrics.cancellationRate < 0.01 ? 'good' : 'warning'}
                    />
                    <MetricRow
                        icon={<Calendar className="w-4 h-4 text-emerald-400" />}
                        label="Zakończone zlecenia"
                        value={metrics.completedBookings.toString()}
                        status={metrics.completedBookings >= 10 ? 'good' : 'warning'}
                    />
                    <MetricRow
                        icon={<Clock className="w-4 h-4 text-amber-400" />}
                        label="Łączny czas pracy"
                        value={`${metrics.totalHours.toFixed(0)}h`}
                        status={metrics.totalHours >= 100 ? 'good' : 'warning'}
                    />
                </div>
            </GlassCard>

            {/* Rating Trend */}
            <GlassCard className="p-4">
                <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-white">Trend ocen (12 tyg.)</h3>
                    <span className="text-xs text-slate-500 font-mono">
                        {metrics.ratingHistory[0].toFixed(2)} → {metrics.ratingHistory[metrics.ratingHistory.length - 1].toFixed(2)}
                    </span>
                </div>
                <TrendLine
                    data={metrics.ratingHistory}
                    width={320}
                    height={40}
                    color="amber"
                    showDots
                />
            </GlassCard>
        </div>
    );
}

// ===========================================
// HELPER COMPONENTS
// ===========================================

interface MetricRowProps {
    icon: React.ReactNode;
    label: string;
    value: string;
    status: 'good' | 'warning' | 'bad';
}

function MetricRow({ icon, label, value, status }: MetricRowProps) {
    const statusColors = {
        good: 'text-emerald-400',
        warning: 'text-amber-400',
        bad: 'text-red-400'
    };

    return (
        <div className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
            <div className="flex items-center gap-2">
                {icon}
                <span className="text-sm text-slate-300">{label}</span>
            </div>
            <span className={`font-mono font-bold ${statusColors[status]}`}>
                {value}
            </span>
        </div>
    );
}

// ===========================================
// COMPACT WIDGET (for sidebar)
// ===========================================

interface PerformanceWidgetProps {
    rating: number;
    responseRate: number;
    isSuperFachowiec: boolean;
    onClick?: () => void;
}

export function PerformanceWidget({
    rating,
    responseRate,
    isSuperFachowiec,
    onClick
}: PerformanceWidgetProps) {
    return (
        <GlassCard
            className="p-3"
            hover
            onClick={onClick}
        >
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    {isSuperFachowiec ? (
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-500 to-yellow-400 flex items-center justify-center">
                            <Award className="w-5 h-5 text-white" />
                        </div>
                    ) : (
                        <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center">
                            <TrendingUp className="w-5 h-5 text-slate-400" />
                        </div>
                    )}
                    <div>
                        <div className="flex items-center gap-2">
                            <RatingDisplay rating={rating} size="sm" />
                            {isSuperFachowiec && (
                                <span className="text-[10px] text-amber-400 font-bold">SUPER</span>
                            )}
                        </div>
                        <p className="text-[10px] text-slate-500">
                            Response: {(responseRate * 100).toFixed(0)}%
                        </p>
                    </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-600" />
            </div>
        </GlassCard>
    );
}
