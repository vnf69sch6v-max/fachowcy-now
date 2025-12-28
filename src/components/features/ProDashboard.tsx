"use client";

import { useState, useEffect, useRef } from "react";
import { motion, PanInfo, useMotionValue, useTransform, AnimatePresence } from "framer-motion";
import { DollarSign, ChevronRight, TrendingUp, Loader2, Clock, Crown } from "lucide-react";
import { collection, query, where, onSnapshot, orderBy, limit, doc, updateDoc, setDoc, Timestamp, Firestore } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
// V2 Imports
import { Booking, BookingStatus, bookingConverter } from "@/types/firestore-v2";
import { AvailabilityEditor } from "@/components/pro/AvailabilityEditor";
import { SubscriptionPlans } from "@/components/features/SubscriptionPlans";
import { ProposalModal } from "@/components/features/ProposalModal";

// Interface for job request display
interface JobRequest {
    id: string;
    clientName: string;
    clientImageUrl: string;
    serviceType: string;
    description: string;
    estimatedPrice: number;
    distance: string;
    eta: string;
    location: { lat: number; lng: number };
    isMarketplace: boolean;
}

interface JobRequestCardProps {
    job: JobRequest;
    onAccept: () => void;
    onReject: () => void;
}

function JobRequestCard({ job, onAccept, onReject }: JobRequestCardProps) {
    const x = useMotionValue(0);
    const [isDragging, setIsDragging] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const background = useTransform(x, [-100, 0, 150], ["rgba(239, 68, 68, 0.1)", "rgba(255,255,255,0)", "rgba(16, 185, 129, 0.1)"]);

    const handleDragEnd = (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
        setIsDragging(false);
        if (info.offset.x > 120) {
            onAccept();
        }
    };

    const staticMapUrl = `https://maps.googleapis.com/maps/api/staticmap?center=${job.location.lat},${job.location.lng}&zoom=14&size=600x300&maptype=roadmap&markers=color:violet%7C${job.location.lat},${job.location.lng}&key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&style=feature:all|element:labels.text.fill|color:0xffffff|weight:0.2&style=feature:all|element:labels.text.stroke|visibility:off&style=feature:landscape|element:geometry|color:0x2b2c41&style=feature:water|element:geometry|color:0x242838&style=feature:road|element:geometry.fill|color:0x50528c&style=feature:road|element:geometry.stroke|color:0x41436f`;

    return (
        <motion.div
            initial={{ y: 20, opacity: 0, scale: 0.95 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 20, opacity: 0, scale: 0.95 }}
            className="fixed bottom-24 left-4 right-4 md:left-auto md:right-6 md:w-[400px] z-50"
        >
            <motion.div
                style={{ background }}
                className="bg-[#0f111a]/95 backdrop-blur-xl border border-white/10 rounded-3xl overflow-hidden shadow-2xl relative"
            >
                {/* Header */}
                <div className="p-5 pb-3">
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                            <span className="text-xs text-emerald-400 font-bold uppercase tracking-wider">
                                Nowe zlecenie
                            </span>
                        </div>
                        <span className="text-xs font-mono text-slate-400">
                            {job.distance} • {job.eta}
                        </span>
                    </div>

                    <div className="flex items-start gap-3">
                        <div className="relative">
                            <img
                                src={job.clientImageUrl}
                                alt={job.clientName}
                                className="w-12 h-12 rounded-2xl object-cover border border-white/10"
                            />
                            <div className="absolute -bottom-1 -right-1 bg-white text-slate-900 text-[10px] font-bold px-1.5 rounded-full border border-slate-900">
                                5.0
                            </div>
                        </div>
                        <div className="flex-1 min-w-0">
                            <h4 className="text-white font-bold text-base mb-0.5">{job.serviceType}</h4>
                            <p className="text-sm text-slate-400 truncate">{job.clientName}</p>
                        </div>
                        <div className="text-right">
                            <div className="text-xl font-bold text-white leading-none">
                                {job.estimatedPrice} <span className="text-sm font-medium text-slate-500">PLN</span>
                            </div>
                            <p className="text-xs text-slate-500 mt-1">Estymacja</p>
                        </div>
                    </div>

                    <p className="text-sm text-slate-300 mt-3 line-clamp-2 leading-relaxed bg-white/5 p-3 rounded-xl border border-white/5">
                        {job.description}
                    </p>
                </div>

                {/* Map Preview */}
                <div className="h-32 w-full relative group cursor-pointer overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0f111a] to-transparent z-10" />
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                        src={staticMapUrl}
                        alt="Map"
                        className="w-full h-full object-cover opacity-80 group-hover:opacity-100 group-hover:scale-110 transition-all duration-700"
                    />
                    <div className="absolute bottom-3 left-3 z-20 flex items-center gap-1.5 px-2 py-1 bg-black/50 backdrop-blur-md rounded-lg border border-white/10">
                        <div className="w-1.5 h-1.5 rounded-full bg-violet-400" />
                        <span className="text-[10px] font-medium text-violet-200 uppercase tracking-wide">Pokaż trasę</span>
                    </div>
                </div>

                {/* Actions */}
                <div className="px-5 pb-5 pt-2">
                    {/* Slider */}
                    <div ref={containerRef} className="relative h-14 bg-white/5 rounded-2xl border border-white/5 p-1 mb-3">
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <span className="text-xs font-bold text-white/30 tracking-[0.2em] uppercase">
                                Przesuń aby przyjąć
                            </span>
                            <div className="ml-2 flex gap-0.5 opacity-30">
                                <ChevronRight className="w-3 h-3 text-white" />
                                <ChevronRight className="w-3 h-3 text-white" />
                                <ChevronRight className="w-3 h-3 text-white" />
                            </div>
                        </div>

                        <motion.div
                            className="absolute top-1 bottom-1 left-1 w-12 bg-gradient-to-r from-emerald-500 to-green-500 rounded-xl flex items-center justify-center cursor-grab active:cursor-grabbing hover:w-14 transition-all shadow-lg shadow-emerald-500/20 z-10"
                            style={{ x }}
                            drag="x"
                            dragConstraints={containerRef}
                            dragElastic={0.1}
                            dragSnapToOrigin // Snap back if not completed
                            onDragEnd={handleDragEnd}
                        >
                            <ChevronRight className="w-6 h-6 text-white" />
                        </motion.div>
                    </div>

                    <button
                        onClick={onReject}
                        className="w-full text-center py-2 text-xs font-medium text-slate-500 hover:text-red-400 transition-colors"
                    >
                        Odrzuć zlecenie
                    </button>
                </div>
            </motion.div>
        </motion.div>
    );
}

// Status Panel Component
function StatusPanel({
    isOnline,
    onToggle,
    loading,
    onOpenSchedule,
    onOpenPlans,
    onOpenJobBoard
}: {
    isOnline: boolean;
    onToggle: () => void;
    loading: boolean;
    onOpenSchedule: () => void;
    onOpenPlans: () => void;
    onOpenJobBoard: () => void;
}) {
    return (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 md:left-auto md:translate-x-0 md:right-4 z-40 flex items-center gap-3">
            <button
                onClick={onOpenJobBoard}
                className="bg-violet-600/90 hover:bg-violet-500 backdrop-blur-xl border border-white/10 rounded-full px-4 py-2 flex items-center gap-2 shadow-lg transition-all"
            >
                <TrendingUp className="w-4 h-4 text-white" />
                <span className="text-sm font-bold text-white hidden md:inline">Giełda</span>
            </button>

            <div className="bg-slate-900/90 backdrop-blur-xl border border-white/10 rounded-full px-5 py-2 flex items-center gap-3 shadow-lg">
                <div className={`w-3 h-3 rounded-full animate-pulse ${isOnline ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]' : 'bg-slate-500'}`} />
                <span className="text-sm font-medium text-white hidden md:inline">
                    {isOnline ? 'Active' : 'Offline'}
                </span>
                <div className="h-4 w-px bg-white/10 mx-1" />
                <button
                    onClick={onToggle}
                    disabled={loading}
                    className={`
                        relative w-10 h-5 rounded-full transition-colors duration-200 ease-in-out focus:outline-none
                        ${isOnline ? 'bg-emerald-500/20' : 'bg-slate-700'}
                    `}
                >
                    <div
                        className={`absolute left-0.5 top-0.5 w-4 h-4 rounded-full transition-transform duration-200 ease-in-out bg-white shadow-sm ${isOnline ? 'translate-x-5' : 'translate-x-0'}`}
                    />
                </button>
            </div>

            <button
                onClick={onOpenSchedule}
                className="bg-slate-900/90 backdrop-blur-xl border border-white/10 rounded-full p-2.5 shadow-lg hover:bg-slate-800 transition-colors group"
                title="Edytuj grafik"
            >
                <Clock className="w-5 h-5 text-slate-400 group-hover:text-blue-400" />
            </button>
        </div>
    );
}

export function ProDashboard() {
    const { user } = useAuth();
    const [incomingJob, setIncomingJob] = useState<JobRequest | null>(null);
    const [isOnline, setIsOnline] = useState(false);
    const [statusLoading, setStatusLoading] = useState(true);



    // Sync Status
    useEffect(() => {
        if (!user || !db) return;
        const statusRef = doc(db as Firestore, 'provider_status', user.uid);
        const unsub = onSnapshot(statusRef, (docSnap) => {
            if (docSnap.exists()) {
                setIsOnline(docSnap.data().isOnline);
            } else {
                setIsOnline(false);
            }
            setStatusLoading(false);
        });
        return () => unsub();
    }, [user]);

    // Handle Availability Toggle
    const toggleAvailability = async () => {
        if (!user || !db) return;
        setStatusLoading(true);
        try {
            const statusRef = doc(db as Firestore, 'provider_status', user.uid);
            await setDoc(statusRef, {
                isOnline: !isOnline,
                lastSeenAt: Timestamp.now(),
                // If turning on, update location (mock for now, ideally geolocation)
                ...(!isOnline ? {
                    location: {
                        latitude: 52.2297, // Default Warsaw if no GPS
                        longitude: 21.0122
                    }
                } : {})
            }, { merge: true });

            // Also ensure 'providers' doc exists and is consistent
            const providerRef = doc(db as Firestore, 'providers', user.uid);
            await setDoc(providerRef, {
                isOnline: !isOnline,
                updatedAt: Timestamp.now()
            }, { merge: true });

        } catch (error) {
            console.error("Error toggling status:", error);
        }
        setStatusLoading(false);
    };

    // Listen for Jobs (Existing Logic)
    useEffect(() => {
        if (!user || !db || !isOnline) { // Only listen if online
            if (!isOnline) setIncomingJob(null);
            return;
        }

        // 1. Direct requests (Priority)
        const qDirect = query(
            collection(db, "bookings").withConverter(bookingConverter),
            where("hostId", "==", user.uid),
            where("status", "==", "PENDING_APPROVAL"),
            orderBy("createdAt", "desc"),
            limit(1)
        );

        const unsubDirect = onSnapshot(qDirect, (snapshot) => {
            if (!snapshot.empty) {
                const doc = snapshot.docs[0];
                const booking = doc.data();
                setIncomingJob({
                    id: booking.id,
                    clientName: booking.clientSnapshot.displayName || "Klient",
                    clientImageUrl: booking.clientSnapshot.avatarUrl || "https://randomuser.me/api/portraits/lego/8.jpg",
                    serviceType: booking.listingSnapshot.title || "Usługa",
                    description: "Nowe zgłoszenie bezpośrednie",
                    estimatedPrice: booking.pricing.totalAmount,
                    distance: "2.5 km",
                    eta: "10 min",
                    location: booking.serviceLocation,
                    isMarketplace: false
                });
            } else {
                setIncomingJob(null);
            }
        });

        // 2. Marketplace requests (Secondary)
        const qMarket = query(
            collection(db, "bookings"),
            where("hostId", "==", "MARKETPLACE"),
            where("status", "==", "INQUIRY"),
            orderBy("createdAt", "desc"),
            limit(1)
        );

        const unsubMarket = onSnapshot(qMarket, (snapshot) => {
            if (!snapshot.empty) {
                const doc = snapshot.docs[0];
                const data = doc.data();
                setIncomingJob(prev => {
                    if (prev && !prev.isMarketplace) return prev;

                    // Helper to calculate distance
                    const proLat = 52.4064; // Mock
                    const proLng = 16.9252;
                    let distanceStr = "W pobliżu";
                    let etaStr = "-";

                    if (data.serviceLocation) {
                        const dist = calculateDistance(proLat, proLng, data.serviceLocation.lat, data.serviceLocation.lng);
                        distanceStr = `${dist.toFixed(1)} km`;
                        etaStr = `${Math.round(dist * 3 + 5)} min`;
                    }

                    return {
                        id: doc.id,
                        clientName: data.clientSnapshot?.displayName || "Klient z Giełdy",
                        clientImageUrl: data.clientSnapshot?.avatarUrl || "https://randomuser.me/api/portraits/lego/1.jpg",
                        serviceType: data.listingSnapshot?.title || data.category || "Zlecenie",
                        description: data.description || "Zlecenie z giełdy",
                        estimatedPrice: data.pricing?.totalAmount || 0,
                        distance: distanceStr,
                        eta: etaStr,
                        location: data.serviceLocation || { lat: 52, lng: 21 },
                        isMarketplace: true
                    };
                });
            }
        });

        return () => {
            unsubDirect();
            unsubMarket();
        };
    }, [user, isOnline]); // Added isOnline dependency

    const handleAccept = async () => {
        if (!incomingJob || !db || !user) return;
        try {
            const updates: any = {
                status: "CONFIRMED",
                updatedAt: Timestamp.now()
            };

            if (incomingJob.isMarketplace) {
                updates.hostId = user.uid;
                updates.hostSnapshot = {
                    displayName: user.displayName || 'Fachowiec',
                    avatarUrl: user.photoURL,
                    ratingAtBooking: 5.0
                };
            }

            await updateDoc(doc(db, "bookings", incomingJob.id), updates);
            setIncomingJob(null);
        } catch (e) {
            console.error("Error accepting", e);
        }
    };

    const handleReject = async () => {
        if (!incomingJob || !db) return;
        try {
            if (incomingJob.isMarketplace) {
                setIncomingJob(null);
            } else {
                await updateDoc(doc(db, "bookings", incomingJob.id), {
                    status: "CANCELED_BY_HOST" as BookingStatus,
                    updatedAt: Timestamp.now()
                });
            }
        } catch (e) {
            console.error("Error rejecting", e);
        }
    };

    const [isScheduleOpen, setIsScheduleOpen] = useState(false);
    const [isPlansOpen, setIsPlansOpen] = useState(false);


    const [isJobBoardOpen, setIsJobBoardOpen] = useState(false);

    return (
        <>
            <StatusPanel
                isOnline={isOnline}
                onToggle={toggleAvailability}
                loading={statusLoading}
                onOpenSchedule={() => setIsScheduleOpen(!isScheduleOpen)}
                onOpenPlans={() => setIsPlansOpen(!isPlansOpen)}
                onOpenJobBoard={() => setIsJobBoardOpen(!isJobBoardOpen)}
            />

            <AnimatePresence>
                {/* Job Board Overlay */}
                {isJobBoardOpen && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto"
                        onClick={() => setIsJobBoardOpen(false)}
                    >
                        <div onClick={e => e.stopPropagation()} className="w-full max-w-4xl h-[80vh] bg-slate-900 rounded-3xl border border-white/10 flex flex-col overflow-hidden shadow-2xl">
                            <div className="p-6 border-b border-white/10 flex justify-between items-center bg-slate-800/50">
                                <div>
                                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                        <div className="bg-violet-500/20 p-2 rounded-lg">
                                            <TrendingUp className="w-5 h-5 text-violet-400" />
                                        </div>
                                        Giełda Zleceń
                                    </h2>
                                    <p className="text-sm text-slate-400 mt-1">Przeglądaj dostępne zlecenia w Twojej okolicy</p>
                                </div>
                                <button onClick={() => setIsJobBoardOpen(false)} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-xl text-sm font-bold text-white transition-colors">
                                    Zamknij
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto p-6">
                                <JobBoardList />
                            </div>
                        </div>
                    </motion.div>
                )}

                {/* Subscription Plans Overlay */}
                {isPlansOpen && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto"
                        onClick={() => setIsPlansOpen(false)}
                    >
                        <div onClick={e => e.stopPropagation()} className="w-full max-w-5xl my-8">
                            <div className="flex justify-end mb-2">
                                <button
                                    onClick={() => setIsPlansOpen(false)}
                                    className="text-white hover:text-slate-300 bg-black/50 rounded-full p-2"
                                >
                                    Zamknij
                                </button>
                            </div>
                            <SubscriptionPlans />
                        </div>
                    </motion.div>
                )}

                {/* Schedule Editor Overlay */}
                {isScheduleOpen && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
                        onClick={() => setIsScheduleOpen(false)}
                    >
                        <div onClick={e => e.stopPropagation()} className="w-full max-w-lg">
                            <AvailabilityEditor />
                            <button
                                onClick={() => setIsScheduleOpen(false)}
                                className="mt-4 w-full py-2 text-sm text-slate-400 hover:text-white"
                            >
                                Zamknij
                            </button>
                        </div>
                    </motion.div>
                )}

                {incomingJob && (
                    <JobRequestCard
                        job={incomingJob}
                        onAccept={handleAccept}
                        onReject={handleReject}
                    />
                )}
            </AnimatePresence>
        </>
    );
}

function JobBoardList() {
    const [jobs, setJobs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedJob, setSelectedJob] = useState<any | null>(null);

    useEffect(() => {
        import("@/lib/job-service").then(({ JobService }) => {
            JobService.getOpenJobs().then(fetchedJobs => {
                setJobs(fetchedJobs);
                setLoading(false);
            });
        });
    }, []);

    if (loading) return (
        <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 text-violet-500 animate-spin" />
        </div>
    );

    if (jobs.length === 0) return (
        <div className="text-center py-20 text-slate-500">
            <p className="text-lg font-medium">Brak dostępnych zleceń</p>
            <p className="text-sm">Zajrzyj ponownie później</p>
        </div>
    );

    return (
        <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {jobs.map(job => (
                    <div key={job.id} className="bg-slate-800/50 border border-white/5 rounded-2xl p-5 hover:border-violet-500/30 transition-all group">
                        <div className="flex justify-between items-start mb-3">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center text-lg">
                                    👤
                                </div>
                                <div>
                                    <h3 className="font-bold text-white">{job.title}</h3>
                                    <p className="text-xs text-violet-400 font-medium">{job.category}</p>
                                </div>
                            </div>
                            <span className="text-xs text-slate-500 font-mono bg-black/20 px-2 py-1 rounded">
                                {job.location?.address?.split(',')[0]}
                            </span>
                        </div>

                        <p className="text-slate-400 text-sm line-clamp-2 mb-4 bg-black/20 p-3 rounded-xl">
                            {job.description}
                        </p>

                        <div className="flex items-center justify-between mt-auto">
                            <div>
                                <p className="text-xs text-slate-500">Budżet</p>
                                <p className="font-bold text-white">{job.priceEstimate?.min} - {job.priceEstimate?.max} PLN</p>
                            </div>
                            <button
                                onClick={() => setSelectedJob(job)}
                                className="px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold rounded-xl transition-colors shadow-lg shadow-violet-900/20"
                            >
                                Złóż ofertę
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {/* Proposal Modal */}
            {selectedJob && (
                <ProposalModal
                    isOpen={!!selectedJob}
                    onClose={() => setSelectedJob(null)}
                    job={selectedJob}
                    onSuccess={(proposalId) => {
                        console.log('Proposal submitted:', proposalId);
                        setSelectedJob(null);
                        // Could show a toast or refresh jobs list
                    }}
                />
            )}
        </>
    );
}

function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371; // km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}
