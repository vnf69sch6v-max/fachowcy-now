"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import {
    Menu,
    X,
    Radar,
    DollarSign,
    Briefcase,
    Settings,
    LogOut,
    MapPin,
    Bell,
    Map as MapIcon,
    LayoutDashboard,
    TrendingUp
} from "lucide-react";
import {
    collection,
    query,
    where,
    onSnapshot,
    orderBy,
    limit,
    doc,
    updateDoc,
    Timestamp
} from "firebase/firestore";
import { db } from "@/lib/firebase";

// V2 Imports
import { Booking, BookingStatus, bookingConverter } from "@/types/firestore-v2";

import {
    JobRadar,
    EarningsWidget,
    JobRequestCard,
    StatCard,
    QuickAction
} from "@/components/pro/ProDashboardComponents";
import { PerformanceDashboard } from "@/components/features/PerformanceDashboard";
import { ChatPanel } from "@/components/features/ChatPanel";
import { CreateListingModal } from "@/components/pro/CreateListingModal";
import { useEarnings } from "@/hooks/useEarnings";
import { MessageCircle, Plus, Target } from "lucide-react";

// Interface adaptation for UI components
interface JobRequestUI {
    id: string;
    clientName: string;
    serviceType: string;
    description: string;
    distance: string;
    estimatedEarnings: number;
    address: string;
}



export default function ProDashboardPage() {
    const { user, userRole, logout, setRole } = useAuth();
    const router = useRouter();
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    // Logic state
    const [hasNewJob, setHasNewJob] = useState(false);
    const [currentJob, setCurrentJob] = useState<JobRequestUI | null>(null);
    const [isScanning, setIsScanning] = useState(true);
    const [activeTab, setActiveTab] = useState<'jobs' | 'performance'>('jobs');
    const [isChatOpen, setIsChatOpen] = useState(false);
    const [isListingModalOpen, setIsListingModalOpen] = useState(false);

    // Live earnings data from Firestore
    const earningsData = useEarnings();

    // Redirect if not professional
    useEffect(() => {
        if (userRole !== 'professional') {
            router.push('/');
        }
    }, [userRole, router]);

    // LISTEN FOR NEW JOBS (Bookings with status PENDING_APPROVAL)
    useEffect(() => {
        if (!user || !db || !isScanning) return;

        // We listen for PENDING_APPROVAL assigned to this host
        const q = query(
            collection(db, "bookings").withConverter(bookingConverter),
            where("hostId", "==", user.uid),
            where("status", "==", "PENDING_APPROVAL"), // Only pending requests
            orderBy("createdAt", "desc"),
            limit(1)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            if (snapshot.empty) {
                setHasNewJob(false);
                setCurrentJob(null);
                return;
            }

            const doc = snapshot.docs[0];
            const booking = doc.data();

            setHasNewJob(true);
            setCurrentJob({
                id: booking.id,
                clientName: booking.clientSnapshot.displayName || "Klient",
                serviceType: booking.listingSnapshot.title || "Usługa",
                description: "Nowe zgłoszenie (szczegóły po akceptacji)",
                distance: "2.5 km", // Mock distance or calc from lat/lng
                estimatedEarnings: booking.pricing.totalAmount,
                address: booking.serviceLocation.address
            });

            // Auto open if tab is not jobs? Maybe notification?
        }, (error) => {
            console.error("Error listening for jobs:", error);
            // Ignore index errors silently in demo
        });

        return () => unsubscribe();
    }, [user, isScanning]);

    const handleAcceptJob = async (jobId: string) => {
        if (!db) return;
        try {
            console.log("Accepting job:", jobId);

            const bookingRef = doc(db, "bookings", jobId);
            await updateDoc(bookingRef, {
                status: "CONFIRMED" as BookingStatus, // Type assertion for string literal
                updatedAt: Timestamp.now(),
                // Add status history entry optimally? 
                // Creating denormalized updates here is tricky without transactions, but simple update is fine for MVP
            });

            setHasNewJob(false);
            setCurrentJob(null);
        } catch (e) {
            console.error("Error accepting job:", e);
        }
    };

    const handleDeclineJob = async (jobId: string) => {
        if (!db) return;
        try {
            console.log("Declining job:", jobId);

            const bookingRef = doc(db, "bookings", jobId);
            await updateDoc(bookingRef, {
                status: "CANCELED_BY_HOST" as BookingStatus,
                updatedAt: Timestamp.now()
            });

            setHasNewJob(false);
            setCurrentJob(null);
        } catch (e) {
            console.error("Error declining job:", e);
        }
    };

    return (
        <div className="min-h-screen bg-slate-950 text-white">
            {/* Header */}
            <header className="fixed top-0 left-0 right-0 z-50 bg-slate-900/80 backdrop-blur-xl border-b border-white/5">
                <div className="flex items-center justify-between px-4 py-3">
                    <button
                        onClick={() => setIsMenuOpen(true)}
                        className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/5"
                    >
                        <Menu className="w-5 h-5" />
                    </button>

                    <h1 className="text-lg font-bold bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">
                        Kokpit Fachowca
                    </h1>

                    <div className="flex items-center gap-2">
                        <EarningsWidget
                            todayEarnings={earningsData.todayEarnings}
                            weeklyEarnings={earningsData.weeklyEarnings}
                            weeklyChange={earningsData.weeklyChange}
                            compact
                        />
                    </div>
                </div>
            </header>

            {/* Tab Switcher */}
            <div className="fixed top-16 left-0 right-0 z-40 bg-slate-950/80 backdrop-blur-xl border-b border-white/5">
                <div className="flex gap-1 p-2">
                    <button
                        onClick={() => setActiveTab('jobs')}
                        className={`flex-1 py-2 px-4 rounded-lg text-sm font-semibold transition-all flex items-center justify-center gap-2 ${activeTab === 'jobs'
                            ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30'
                            : 'text-slate-500 hover:text-slate-300'
                            }`}
                    >
                        <Radar className="w-4 h-4" />
                        Zlecenia
                    </button>
                    <button
                        onClick={() => setActiveTab('performance')}
                        className={`flex-1 py-2 px-4 rounded-lg text-sm font-semibold transition-all flex items-center justify-center gap-2 ${activeTab === 'performance'
                            ? 'bg-violet-500/20 text-violet-400 border border-violet-500/30'
                            : 'text-slate-500 hover:text-slate-300'
                            }`}
                    >
                        <TrendingUp className="w-4 h-4" />
                        Performance
                    </button>
                </div>
            </div>

            {/* Main Content */}
            <main className="pt-32 pb-24 px-4">
                {/* Jobs Tab Content */}
                {activeTab === 'jobs' && (
                    <>
                        {/* Status Card */}
                        <div className="bg-slate-900/50 backdrop-blur-md border border-white/10 rounded-2xl p-6 mb-6">
                            <div className="flex items-center justify-between mb-4">
                                <div>
                                    <p className="text-slate-400 text-sm">Status</p>
                                    <p className="text-indigo-400 font-semibold flex items-center gap-2">
                                        <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
                                        Online - Szukam zleceń
                                    </p>
                                </div>
                                <button
                                    onClick={() => setIsScanning(!isScanning)}
                                    className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${isScanning
                                        ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30'
                                        : 'bg-slate-700 text-slate-400 border border-white/10'
                                        }`}
                                >
                                    {isScanning ? 'Aktywny' : 'Wstrzymany'}
                                </button>
                            </div>

                            {/* Job Radar */}
                            <div className="py-8">
                                <JobRadar
                                    isScanning={isScanning}
                                    hasNewJob={hasNewJob}
                                    onJobFound={() => { }}
                                />
                            </div>
                        </div>

                        {/* Earnings Full Widget */}
                        <EarningsWidget
                            todayEarnings={earningsData.todayEarnings}
                            weeklyEarnings={earningsData.weeklyEarnings}
                            weeklyChange={earningsData.weeklyChange}
                        />

                        {/* Quick Stats */}
                        <div className="grid grid-cols-3 gap-3 mt-6">
                            <StatCard
                                icon={<Briefcase className="w-5 h-5" />}
                                label="Dzisiaj"
                                value={earningsData.completedToday}
                                color="indigo"
                            />
                            <StatCard
                                icon={<MapPin className="w-5 h-5" />}
                                label="Oczekujące"
                                value={earningsData.pendingCount}
                                color="cyan"
                            />
                            <StatCard
                                icon={<Bell className="w-5 h-5" />}
                                label="Ten tydzień"
                                value={earningsData.completedThisWeek}
                                color="violet"
                            />
                        </div>

                        {/* Quick Actions */}
                        <div className="flex gap-2 mt-6">
                            <QuickAction
                                icon={<Plus className="w-4 h-4" />}
                                label="Dodaj ogłoszenie"
                                onClick={() => setIsListingModalOpen(true)}
                                variant="primary"
                            />
                            <QuickAction
                                icon={<MessageCircle className="w-4 h-4" />}
                                label="Wiadomości"
                                onClick={() => setIsChatOpen(true)}
                            />
                        </div>
                    </>
                )}

                {/* Performance Tab Content */}
                {activeTab === 'performance' && (
                    <PerformanceDashboard />
                )}
            </main>

            {/* Bottom Navigation Bar */}
            <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-slate-900/80 backdrop-blur-xl border border-white/10 rounded-full px-4 md:px-6 py-3 flex items-center gap-4 md:gap-6 shadow-2xl">
                <button
                    onClick={() => router.push('/')}
                    className="flex flex-col items-center gap-1 transition-colors text-slate-500 hover:text-slate-300"
                >
                    <MapIcon className="w-5 h-5 md:w-6 md:h-6" />
                    <span className="text-[9px] md:text-[10px] font-bold uppercase tracking-wider">Mapa</span>
                </button>
                <div className="w-px h-8 bg-white/10" />
                <button
                    className="flex flex-col items-center gap-1 transition-colors text-indigo-400"
                >
                    <LayoutDashboard className="w-5 h-5 md:w-6 md:h-6" />
                    <span className="text-[9px] md:text-[10px] font-bold uppercase tracking-wider">Kokpit</span>
                </button>
                <div className="w-px h-8 bg-white/10" />
                <button
                    onClick={() => {
                        logout();
                        router.push('/');
                    }}
                    className="flex flex-col items-center gap-1 transition-colors text-slate-500 hover:text-red-400"
                >
                    <LogOut className="w-5 h-5 md:w-6 md:h-6" />
                    <span className="text-[9px] md:text-[10px] font-bold uppercase tracking-wider">Wyjdź</span>
                </button>
            </div>

            {/* Job Request Overlay */}
            <AnimatePresence>
                {currentJob && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end justify-center p-4"
                    >
                        <div className="w-full max-w-md">
                            <JobRequestCard
                                job={currentJob}
                                onAccept={() => handleAcceptJob(currentJob.id)}
                                onDecline={() => handleDeclineJob(currentJob.id)}
                            />
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Side Menu */}
            <AnimatePresence>
                {isMenuOpen && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsMenuOpen(false)}
                            className="fixed inset-0 z-50 bg-black/50"
                        />
                        <motion.div
                            initial={{ x: -300 }}
                            animate={{ x: 0 }}
                            exit={{ x: -300 }}
                            className="fixed left-0 top-0 bottom-0 w-72 z-50 bg-slate-900 border-r border-white/10"
                        >
                            <div className="p-4 border-b border-white/10 flex items-center justify-between">
                                <h2 className="font-bold text-lg">Menu</h2>
                                <button onClick={() => setIsMenuOpen(false)}>
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <div className="p-4 border-b border-white/10">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-400 to-violet-400 flex items-center justify-center text-white font-bold text-lg">
                                        {user?.displayName?.[0] || 'F'}
                                    </div>
                                    <div>
                                        <p className="font-semibold text-white">{user?.displayName || 'Fachowiec'}</p>
                                        <p className="text-xs text-slate-400">Profesjonalista</p>
                                    </div>
                                </div>
                            </div>

                            <nav className="p-2">
                                <button
                                    onClick={() => router.push('/')}
                                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-white/5 text-left"
                                >
                                    <Radar className="w-5 h-5 text-slate-400" />
                                    <span>Mapa</span>
                                </button>
                                <button className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-white/5 text-left">
                                    <Briefcase className="w-5 h-5 text-slate-400" />
                                    <span>Historia zleceń</span>
                                </button>
                                <button className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-white/5 text-left">
                                    <DollarSign className="w-5 h-5 text-slate-400" />
                                    <span>Finanse</span>
                                </button>
                                <button className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-white/5 text-left">
                                    <Settings className="w-5 h-5 text-slate-400" />
                                    <span>Ustawienia</span>
                                </button>
                            </nav>

                            <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-white/10 space-y-2">
                                <button
                                    onClick={() => {
                                        setRole('client');
                                        router.push('/');
                                    }}
                                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-white/5 text-blue-400"
                                >
                                    <LogOut className="w-5 h-5 rotate-180" />
                                    <span>Panel Klienta</span>
                                </button>
                                <button
                                    onClick={() => {
                                        logout();
                                        router.push('/');
                                    }}
                                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-red-500/10 text-red-400"
                                >
                                    <LogOut className="w-5 h-5" />
                                    <span>Wyloguj</span>
                                </button>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            {/* Chat Panel */}
            <ChatPanel isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} />

            {/* Create Listing Modal */}
            <CreateListingModal
                isOpen={isListingModalOpen}
                onClose={() => setIsListingModalOpen(false)}
            />
        </div>
    );
}
