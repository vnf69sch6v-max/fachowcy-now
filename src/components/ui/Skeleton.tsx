"use client";

import { motion } from "framer-motion";

// ===========================================
// SKELETON COMPONENTS
// ===========================================

interface SkeletonProps {
    className?: string;
}

export function Skeleton({ className = "" }: SkeletonProps) {
    return (
        <div
            className={`animate-pulse bg-white/10 rounded ${className}`}
        />
    );
}

export function SkeletonText({ className = "", lines = 1 }: SkeletonProps & { lines?: number }) {
    return (
        <div className={`space-y-2 ${className}`}>
            {Array.from({ length: lines }).map((_, i) => (
                <Skeleton
                    key={i}
                    className={`h-4 ${i === lines - 1 ? 'w-3/4' : 'w-full'}`}
                />
            ))}
        </div>
    );
}

export function SkeletonCircle({ className = "", size = "md" }: SkeletonProps & { size?: "sm" | "md" | "lg" }) {
    const sizes = {
        sm: "w-8 h-8",
        md: "w-12 h-12",
        lg: "w-16 h-16",
    };

    return <Skeleton className={`${sizes[size]} rounded-full ${className}`} />;
}

// ===========================================
// CARD SKELETONS
// ===========================================

export function SkeletonProCard() {
    return (
        <div className="bg-slate-800/50 rounded-xl p-4 border border-white/5">
            <div className="flex items-center gap-4">
                <SkeletonCircle size="lg" />
                <div className="flex-1 space-y-2">
                    <Skeleton className="h-5 w-32" />
                    <Skeleton className="h-4 w-24" />
                    <div className="flex gap-2">
                        <Skeleton className="h-3 w-16" />
                        <Skeleton className="h-3 w-16" />
                    </div>
                </div>
                <Skeleton className="h-8 w-16" />
            </div>
        </div>
    );
}

export function SkeletonBookingCard() {
    return (
        <div className="bg-slate-900/90 rounded-2xl p-4 border border-white/10">
            <div className="flex items-center gap-2 mb-3">
                <Skeleton className="w-2 h-2 rounded-full" />
                <Skeleton className="h-4 w-32" />
            </div>
            <div className="flex items-center gap-3">
                <SkeletonCircle />
                <div className="flex-1 space-y-1">
                    <Skeleton className="h-4 w-28" />
                    <Skeleton className="h-3 w-20" />
                </div>
                <Skeleton className="h-6 w-16" />
            </div>
            <div className="flex gap-2 mt-4">
                <Skeleton className="h-10 flex-1 rounded-xl" />
                <Skeleton className="h-10 flex-1 rounded-xl" />
            </div>
        </div>
    );
}

export function SkeletonDashboardItem() {
    return (
        <div className="bg-slate-800/30 rounded-xl p-4 border border-white/5">
            <div className="flex items-center gap-3 mb-3">
                <SkeletonCircle size="sm" />
                <div className="flex-1">
                    <Skeleton className="h-4 w-24" />
                </div>
                <Skeleton className="h-5 w-16 rounded-full" />
            </div>
            <Skeleton className="h-3 w-full mb-2" />
            <Skeleton className="h-3 w-3/4" />
        </div>
    );
}

// ===========================================
// PAGE LOADING STATES
// ===========================================

export function MapLoadingSkeleton() {
    return (
        <div className="w-full h-full bg-slate-900 flex items-center justify-center">
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center"
            >
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-blue-500/20 flex items-center justify-center">
                    <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                        className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full"
                    />
                </div>
                <p className="text-slate-400 text-sm">Ładowanie mapy...</p>
            </motion.div>
        </div>
    );
}

export function DashboardLoadingSkeleton() {
    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="space-y-2">
                    <Skeleton className="h-8 w-40" />
                    <Skeleton className="h-4 w-24" />
                </div>
                <SkeletonCircle size="lg" />
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-3">
                {[1, 2, 3].map(i => (
                    <div key={i} className="bg-slate-800/30 rounded-xl p-4 border border-white/5">
                        <Skeleton className="h-3 w-16 mb-2" />
                        <Skeleton className="h-8 w-12" />
                    </div>
                ))}
            </div>

            {/* List */}
            <div className="space-y-3">
                {[1, 2, 3, 4].map(i => (
                    <SkeletonDashboardItem key={i} />
                ))}
            </div>
        </div>
    );
}

export function ProListLoadingSkeleton() {
    return (
        <div className="space-y-3 p-4">
            {[1, 2, 3].map(i => (
                <SkeletonProCard key={i} />
            ))}
        </div>
    );
}

// ===========================================
// INLINE LOADING
// ===========================================

export function InlineLoader({ text = "Ładowanie..." }: { text?: string }) {
    return (
        <div className="flex items-center gap-2 text-slate-400">
            <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                className="w-4 h-4 border-2 border-current border-t-transparent rounded-full"
            />
            <span className="text-sm">{text}</span>
        </div>
    );
}

export function ButtonLoader() {
    return (
        <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            className="w-5 h-5 border-2 border-white border-t-transparent rounded-full"
        />
    );
}
