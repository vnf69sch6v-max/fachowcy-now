"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import {
    Menu,
    X,
    DollarSign,
    Briefcase,
    Settings,
    LogOut,
    MapPin,
    Map as MapIcon,
    LayoutDashboard,
    TrendingUp,
    Star,
    Clock,
    CheckCircle,
    ChevronRight,
    Zap,
    Plus,
    MessageCircle,
    Calendar
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

import { Booking, BookingStatus, bookingConverter } from "@/types/firestore-v2";
import { JobRequestCard } from "@/components/pro/ProDashboardComponents";
import { PerformanceDashboard } from "@/components/features/PerformanceDashboard";
import { ChatPanel } from "@/components/features/ChatPanel";
import { CreateListingModal } from "@/components/pro/CreateListingModal";
import { useEarnings } from "@/hooks/useEarnings";

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

    const [hasNewJob, setHasNewJob] = useState(false);
    const [currentJob, setCurrentJob] = useState<JobRequestUI | null>(null);
    const [isOnline, setIsOnline] = useState(true);
    const [activeTab, setActiveTab] = useState<'jobs' | 'performance'>('jobs');
    const [isChatOpen, setIsChatOpen] = useState(false);
    const [isListingModalOpen, setIsListingModalOpen] = useState(false);

    const earningsData = useEarnings();

    useEffect(() => {
        if (userRole !== 'professional') {
            router.push('/');
        }
    }, [userRole, router]);

    useEffect(() => {
        if (!user || !db || !isOnline) return;

        const q = query(
            collection(db, "bookings").withConverter(bookingConverter),
            where("hostId", "==", user.uid),
            where("status", "==", "PENDING_APPROVAL"),
            orderBy("createdAt", "desc"),
            limit(1)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            if (snapshot.empty) {
                setHasNewJob(false);
                setCurrentJob(null);
                return;
            }

            const docSnap = snapshot.docs[0];
            const booking = docSnap.data();

            setHasNewJob(true);
            setCurrentJob({
                id: booking.id,
                clientName: booking.clientSnapshot.displayName || "Klient",
                serviceType: booking.listingSnapshot.title || "Usługa",
                description: "Nowe zgłoszenie",
                distance: "2.5 km",
                estimatedEarnings: booking.pricing.totalAmount,
                address: booking.serviceLocation.address
            });
        }, (error) => {
            console.error("Error listening for jobs:", error);
        });

        return () => unsubscribe();
    }, [user, isOnline]);

    const handleAcceptJob = async (jobId: string) => {
        if (!db) return;
        try {
            const bookingRef = doc(db, "bookings", jobId);
            await updateDoc(bookingRef, {
                status: "CONFIRMED" as BookingStatus,
                updatedAt: Timestamp.now(),
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
        <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white">
            {/* Compact Header */}
            <header className="fixed top-0 left-0 right-0 z-50 bg-slate-900/80 backdrop-blur-xl border-b border-white/5">
                <div className="flex items-center justify-between px-4 py-3">
                    <button
                        onClick={() => setIsMenuOpen(true)}
                        className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/5"
                    >
                        <Menu className="w-5 h-5" />
                    </button>

                    <h1 className="text-lg font-bold">Kokpit</h1>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setIsChatOpen(true)}
                            className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/5 relative"
                        >
                            <MessageCircle className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="pt-20 pb-28 px-4">
                {/* 🔥 HERO PROFILE CARD - New! */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-gradient-to-br from-emerald-600/20 via-slate-900 to-slate-900 border border-emerald-500/20 rounded-3xl p-5 mb-5 relative overflow-hidden"
                >
                    <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 blur-3xl rounded-full -mr-16 -mt-16" />

                    <div className="flex items-center gap-4 relative z-10">
                        {/* Avatar */}
                        <div className="relative">
                            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-400 to-cyan-400 flex items-center justify-center text-white font-bold text-2xl shadow-lg shadow-emerald-500/20">
                                {user?.photoURL ? (
                                    <img src={user.photoURL} alt="" className="w-full h-full rounded-2xl object-cover" />
                                ) : (
                                    user?.displayName?.[0] || 'F'
                                )}
                            </div>
                            {/* Online indicator */}
                            <div className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-2 border-slate-900 ${isOnline ? 'bg-emerald-500' : 'bg-slate-500'}`} />
                        </div>

                        {/* Info */}
                        <div className="flex-1">
                            <h2 className="text-xl font-bold text-white">{user?.displayName || 'Fachowiec'}</h2>
                            <div className="flex items-center gap-2 mt-1">
                                <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                                <span className="text-sm text-slate-300 font-medium">4.9</span>
                                <span className="text-slate-600">•</span>
                                <span className="text-sm text-slate-400">127 zleceń</span>
                            </div>
                        </div>

                        {/* Online Toggle */}
                        <button
                            onClick={() => setIsOnline(!isOnline)}
                            className={`px-4 py-2 rounded-xl font-bold text-sm transition-all ${isOnline
                                    ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30'
                                    : 'bg-slate-700 text-slate-400'
                                }`}
                        >
                            {isOnline ? 'Online' : 'Offline'}
                        </button>
                    </div>

                    {/* Quick Stats Row */}
                    <div className="grid grid-cols-3 gap-3 mt-5">
                        <div className="bg-black/20 backdrop-blur rounded-xl p-3 text-center">
                            <p className="text-lg font-bold text-white">{earningsData.todayEarnings} zł</p>
                            <p className="text-[10px] text-slate-400 uppercase tracking-wide">Dziś</p>
                        </div>
                        <div className="bg-black/20 backdrop-blur rounded-xl p-3 text-center">
                            <p className="text-lg font-bold text-white">{earningsData.pendingCount}</p>
                            <p className="text-[10px] text-slate-400 uppercase tracking-wide">Oczekuje</p>
                        </div>
                        <div className="bg-black/20 backdrop-blur rounded-xl p-3 text-center">
                            <p className="text-lg font-bold text-white">{earningsData.completedThisWeek}</p>
                            <p className="text-[10px] text-slate-400 uppercase tracking-wide">Ten tydzień</p>
                        </div>
                    </div>
                </motion.div>

                {/* Tab Switcher - Simplified */}
                <div className="flex gap-2 mb-5">
                    <button
                        onClick={() => setActiveTab('jobs')}
                        className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 ${activeTab === 'jobs'
                                ? 'bg-white text-slate-900'
                                : 'bg-slate-800/50 text-slate-400 hover:bg-slate-800'
                            }`}
                    >
                        <Briefcase className="w-4 h-4" />
                        Zlecenia
                    </button>
                    <button
                        onClick={() => setActiveTab('performance')}
                        className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 ${activeTab === 'performance'
                                ? 'bg-white text-slate-900'
                                : 'bg-slate-800/50 text-slate-400 hover:bg-slate-800'
                            }`}
                    >
                        <TrendingUp className="w-4 h-4" />
                        Statystyki
                    </button>
                </div>

                {/* Jobs Tab Content */}
                {activeTab === 'jobs' && (
                    <AnimatePresence mode="wait">
                        <motion.div
                            key="jobs"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                        >
                            {/* Status Card - Minimal */}
                            {isOnline && !hasNewJob && (
                                <div className="bg-slate-800/50 border border-white/5 rounded-2xl p-5 mb-4 text-center">
                                    <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-3">
                                        <Zap className="w-6 h-6 text-emerald-400" />
                                    </div>
                                    <p className="text-slate-300 font-medium">Szukam zleceń w Twojej okolicy...</p>
                                    <p className="text-sm text-slate-500 mt-1">Dostaniesz powiadomienie gdy pojawi się nowe</p>
                                </div>
                            )}

                            {!isOnline && (
                                <div className="bg-slate-800/50 border border-white/5 rounded-2xl p-5 mb-4 text-center">
                                    <div className="w-12 h-12 rounded-full bg-slate-600/20 flex items-center justify-center mx-auto mb-3">
                                        <Clock className="w-6 h-6 text-slate-400" />
                                    </div>
                                    <p className="text-slate-300 font-medium">Jesteś offline</p>
                                    <p className="text-sm text-slate-500 mt-1">Włącz status online aby otrzymywać zlecenia</p>
                                </div>
                            )}

                            {/* Weekly Earnings Summary */}
                            <div className="bg-slate-800/50 border border-white/5 rounded-2xl p-5 mb-4">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="font-bold text-white">Zarobki w tym tygodniu</h3>
                                    <span className="text-2xl font-bold text-emerald-400">{earningsData.weeklyEarnings} zł</span>
                                </div>

                                {/* Simple bar chart */}
                                <div className="flex items-end gap-1 h-20">
                                    {['Pn', 'Wt', 'Śr', 'Cz', 'Pt', 'So', 'Nd'].map((day, i) => (
                                        <div key={day} className="flex-1 flex flex-col items-center">
                                            <div
                                                className="w-full bg-emerald-500/20 rounded-t"
                                                style={{ height: `${Math.random() * 100}%`, minHeight: 4 }}
                                            />
                                            <span className="text-[10px] text-slate-500 mt-2">{day}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Quick Actions */}
                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    onClick={() => setIsListingModalOpen(true)}
                                    className="bg-emerald-600 hover:bg-emerald-500 rounded-2xl p-4 flex items-center gap-3 transition-colors shadow-lg shadow-emerald-900/20"
                                >
                                    <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                                        <Plus className="w-5 h-5 text-white" />
                                    </div>
                                    <div className="text-left">
                                        <p className="font-bold text-white text-sm">Dodaj usługę</p>
                                        <p className="text-[10px] text-emerald-200">Nowe ogłoszenie</p>
                                    </div>
                                </button>

                                <button
                                    onClick={() => router.push('/')}
                                    className="bg-slate-800 hover:bg-slate-700 rounded-2xl p-4 flex items-center gap-3 transition-colors border border-white/5"
                                >
                                    <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
                                        <Calendar className="w-5 h-5 text-slate-300" />
                                    </div>
                                    <div className="text-left">
                                        <p className="font-bold text-white text-sm">Giełda zleceń</p>
                                        <p className="text-[10px] text-slate-400">Przeglądaj</p>
                                    </div>
                                </button>
                            </div>
                        </motion.div>
                    </AnimatePresence>
                )}

                {/* Performance Tab Content */}
                {activeTab === 'performance' && (
                    <PerformanceDashboard />
                )}
            </main>

            {/* Bottom Navigation */}
            <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-slate-900/90 backdrop-blur-xl border border-white/10 rounded-full px-6 py-3 flex items-center gap-6 shadow-2xl">
                <button
                    onClick={() => router.push('/')}
                    className="flex flex-col items-center gap-1 text-slate-500 hover:text-slate-300 transition-colors"
                >
                    <MapIcon className="w-6 h-6" />
                    <span className="text-[10px] font-bold uppercase">Mapa</span>
                </button>
                <div className="w-px h-8 bg-white/10" />
                <button className="flex flex-col items-center gap-1 text-emerald-400">
                    <LayoutDashboard className="w-6 h-6" />
                    <span className="text-[10px] font-bold uppercase">Kokpit</span>
                </button>
                <div className="w-px h-8 bg-white/10" />
                <button
                    onClick={() => { logout(); router.push('/'); }}
                    className="flex flex-col items-center gap-1 text-slate-500 hover:text-red-400 transition-colors"
                >
                    <LogOut className="w-6 h-6" />
                    <span className="text-[10px] font-bold uppercase">Wyjdź</span>
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
                                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-400 to-cyan-400 flex items-center justify-center text-white font-bold text-lg">
                                        {user?.displayName?.[0] || 'F'}
                                    </div>
                                    <div>
                                        <p className="font-semibold text-white">{user?.displayName || 'Fachowiec'}</p>
                                        <p className="text-xs text-emerald-400">Profesjonalista</p>
                                    </div>
                                </div>
                            </div>

                            <nav className="p-2">
                                <button
                                    onClick={() => router.push('/')}
                                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-white/5 text-left"
                                >
                                    <MapPin className="w-5 h-5 text-slate-400" />
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
                                    onClick={() => { setRole('client'); router.push('/'); }}
                                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-white/5 text-blue-400"
                                >
                                    <LogOut className="w-5 h-5 rotate-180" />
                                    <span>Panel Klienta</span>
                                </button>
                                <button
                                    onClick={() => { logout(); router.push('/'); }}
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
