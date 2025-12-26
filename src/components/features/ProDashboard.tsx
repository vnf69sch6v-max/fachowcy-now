"use client";

import { useState, useRef } from "react";
import { motion, PanInfo, useMotionValue, useTransform } from "framer-motion";
import { MapPin, DollarSign, Clock, ChevronRight, TrendingUp } from "lucide-react";

// Mock incoming job for demo
const MOCK_JOB_REQUEST = {
    id: "job-demo-1",
    clientName: "Anna Nowak",
    clientImageUrl: "https://randomuser.me/api/portraits/women/44.jpg",
    serviceType: "Hydraulik",
    description: "Cieknący kran w łazience",
    estimatedPrice: 180,
    distance: "2.3 km",
    eta: "8 min",
    location: { lat: 52.41, lng: 16.93 },
};

interface JobRequestCardProps {
    job: typeof MOCK_JOB_REQUEST;
    onAccept: () => void;
    onReject: () => void;
}

function JobRequestCard({ job, onAccept, onReject }: JobRequestCardProps) {
    const x = useMotionValue(0);
    const [isDragging, setIsDragging] = useState(false);

    // Transform x position to background color and text
    const background = useTransform(
        x,
        [-100, 0, 150],
        ["rgba(239, 68, 68, 0.2)", "rgba(255,255,255,0)", "rgba(16, 185, 129, 0.3)"]
    );

    const acceptOpacity = useTransform(x, [0, 150], [0.3, 1]);
    const acceptScale = useTransform(x, [0, 150], [0.8, 1]);

    const handleDragEnd = (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
        setIsDragging(false);
        if (info.offset.x > 120) {
            onAccept();
        } else if (info.offset.x < -80) {
            onReject();
        }
    };

    return (
        <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-20 md:bottom-6 left-4 right-4 md:left-auto md:right-6 md:w-96 z-40"
        >
            <motion.div
                style={{ background }}
                className="bg-slate-900/90 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden shadow-2xl"
            >
                {/* Header */}
                <div className="px-4 pt-4 pb-2">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-xs text-emerald-400 font-semibold uppercase tracking-wider animate-pulse">
                            Nowe zlecenie
                        </span>
                        <span className="text-xs text-slate-400">
                            {job.distance} • {job.eta}
                        </span>
                    </div>

                    {/* Client Info */}
                    <div className="flex items-center gap-3 mb-3">
                        <img
                            src={job.clientImageUrl}
                            alt={job.clientName}
                            className="w-10 h-10 rounded-full object-cover border-2 border-white/10"
                        />
                        <div>
                            <h4 className="text-white font-semibold text-sm">{job.clientName}</h4>
                            <p className="text-xs text-slate-400">{job.description}</p>
                        </div>
                    </div>

                    {/* Price */}
                    <div className="flex items-center justify-between py-3 border-t border-white/5">
                        <span className="text-slate-400 text-sm">Szacowany zarobek</span>
                        <span className="text-2xl font-bold text-emerald-400">{job.estimatedPrice} zł</span>
                    </div>
                </div>

                {/* Swipe to Accept */}
                <div className="relative h-14 bg-slate-800/50 overflow-hidden">
                    {/* Background hint */}
                    <motion.div
                        style={{ opacity: acceptOpacity, scale: acceptScale }}
                        className="absolute inset-0 flex items-center justify-center"
                    >
                        <span className="text-emerald-400 font-semibold text-sm">PRZYJMIJ</span>
                    </motion.div>

                    {/* Draggable handle */}
                    <motion.div
                        drag="x"
                        dragConstraints={{ left: 0, right: 0 }}
                        dragElastic={0.1}
                        onDragStart={() => setIsDragging(true)}
                        onDragEnd={handleDragEnd}
                        style={{ x }}
                        className="absolute inset-y-0 left-0 right-0 flex items-center justify-center cursor-grab active:cursor-grabbing"
                    >
                        <div className={`flex items-center gap-2 px-6 py-2 rounded-full transition-all ${isDragging
                                ? 'bg-emerald-500/30 text-emerald-100'
                                : 'bg-white/10 text-slate-300'
                            }`}>
                            <ChevronRight className="w-4 h-4" />
                            <span className="text-sm font-semibold">Przesuń, aby przyjąć</span>
                            <ChevronRight className="w-4 h-4" />
                        </div>
                    </motion.div>
                </div>
            </motion.div>
        </motion.div>
    );
}

function EarningsWidget() {
    const todayEarnings = 450;
    const weeklyChange = 12; // percentage

    return (
        <div className="fixed top-20 md:top-24 right-4 z-40">
            <div className="bg-slate-900/80 backdrop-blur-xl border border-white/10 rounded-2xl px-4 py-3 shadow-lg">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center">
                        <DollarSign className="w-5 h-5 text-emerald-400" />
                    </div>
                    <div>
                        <p className="text-xs text-slate-400">Dzisiaj</p>
                        <p className="text-lg font-bold text-white">{todayEarnings} zł</p>
                    </div>
                    <div className="flex items-center gap-1 text-emerald-400 text-xs font-semibold">
                        <TrendingUp className="w-3 h-3" />
                        +{weeklyChange}%
                    </div>
                </div>
            </div>
        </div>
    );
}

export function ProDashboard({ onAcceptJob }: { onAcceptJob?: () => void }) {
    const [hasIncomingJob, setHasIncomingJob] = useState(true);

    const handleAccept = () => {
        console.log("Job accepted!");
        setHasIncomingJob(false);
        onAcceptJob?.();
    };

    const handleReject = () => {
        console.log("Job rejected");
        setHasIncomingJob(false);
    };

    return (
        <>
            <EarningsWidget />
            {hasIncomingJob && (
                <JobRequestCard
                    job={MOCK_JOB_REQUEST}
                    onAccept={handleAccept}
                    onReject={handleReject}
                />
            )}
        </>
    );
}
