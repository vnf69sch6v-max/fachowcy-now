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
    Bell
} from "lucide-react";

import {
    JobRadar,
    EarningsWidget,
    JobRequestCard,
    SwipeToAccept
} from "@/components/pro/ProDashboardComponents";

// Mock data for demo
const MOCK_EARNINGS = {
    today: 450,
    weekly: 2340,
    weeklyChange: 12
};

const MOCK_JOB = {
    id: "job-001",
    clientName: "Anna Nowak",
    serviceType: "Naprawa kranu",
    description: "Cieknący kran w kuchni, wymaga wymiany uszczelki lub całego zaworu.",
    distance: "2.3 km",
    estimatedEarnings: 180,
    address: "ul. Polna 15, Poznań"
};

export default function ProDashboardPage() {
    const { user, userRole, logout } = useAuth();
    const router = useRouter();
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [hasNewJob, setHasNewJob] = useState(false);
    const [currentJob, setCurrentJob] = useState<typeof MOCK_JOB | null>(null);
    const [isScanning, setIsScanning] = useState(true);

    // Redirect if not professional
    useEffect(() => {
        if (userRole !== 'professional') {
            router.push('/');
        }
    }, [userRole, router]);

    // Simulate incoming job after 3 seconds
    useEffect(() => {
        const timer = setTimeout(() => {
            setHasNewJob(true);
            setCurrentJob(MOCK_JOB);
        }, 3000);
        return () => clearTimeout(timer);
    }, []);

    const handleAcceptJob = (jobId: string) => {
        console.log("Accepted job:", jobId);
        setCurrentJob(null);
        setHasNewJob(false);
        // In real app: update Firestore order status
    };

    const handleDeclineJob = (jobId: string) => {
        console.log("Declined job:", jobId);
        setCurrentJob(null);
        setHasNewJob(false);
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

                    <h1 className="text-lg font-bold bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
                        Kokpit Fachowca
                    </h1>

                    <div className="flex items-center gap-2">
                        <EarningsWidget
                            todayEarnings={MOCK_EARNINGS.today}
                            weeklyEarnings={MOCK_EARNINGS.weekly}
                            weeklyChange={MOCK_EARNINGS.weeklyChange}
                            compact
                        />
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="pt-20 pb-24 px-4">
                {/* Status Card */}
                <div className="bg-slate-900/50 backdrop-blur-md border border-white/10 rounded-2xl p-6 mb-6">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <p className="text-slate-400 text-sm">Status</p>
                            <p className="text-emerald-400 font-semibold flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                                Online - Szukam zleceń
                            </p>
                        </div>
                        <button
                            onClick={() => setIsScanning(!isScanning)}
                            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${isScanning
                                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
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
                    todayEarnings={MOCK_EARNINGS.today}
                    weeklyEarnings={MOCK_EARNINGS.weekly}
                    weeklyChange={MOCK_EARNINGS.weeklyChange}
                />

                {/* Quick Stats */}
                <div className="grid grid-cols-3 gap-3 mt-6">
                    <div className="bg-slate-800/50 border border-white/5 rounded-xl p-3 text-center">
                        <Briefcase className="w-5 h-5 text-blue-400 mx-auto mb-1" />
                        <p className="text-lg font-bold text-white">12</p>
                        <p className="text-[10px] text-slate-500">Dzisiaj</p>
                    </div>
                    <div className="bg-slate-800/50 border border-white/5 rounded-xl p-3 text-center">
                        <MapPin className="w-5 h-5 text-cyan-400 mx-auto mb-1" />
                        <p className="text-lg font-bold text-white">45 km</p>
                        <p className="text-[10px] text-slate-500">Przejechane</p>
                    </div>
                    <div className="bg-slate-800/50 border border-white/5 rounded-xl p-3 text-center">
                        <Bell className="w-5 h-5 text-amber-400 mx-auto mb-1" />
                        <p className="text-lg font-bold text-white">3</p>
                        <p className="text-[10px] text-slate-500">Powiadomienia</p>
                    </div>
                </div>
            </main>

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
                                onAccept={handleAcceptJob}
                                onDecline={handleDeclineJob}
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
                                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-emerald-400 to-cyan-400 flex items-center justify-center text-white font-bold text-lg">
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

                            <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-white/10">
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
        </div>
    );
}
