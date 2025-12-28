"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Calendar, Clock, MapPin, User, Briefcase, MessageCircle, CheckCircle, XCircle, AlertCircle, Loader2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { collection, query, where, orderBy, onSnapshot, Timestamp, doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Booking } from "@/types/firestore-v2";

import { ReviewModal } from "./ReviewModal";

interface DashboardViewProps {
    onChatOpen: (pro: any) => void;
}

export function DashboardView({ onChatOpen }: DashboardViewProps) {
    const { user, userRole } = useAuth();
    const [orders, setOrders] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [reviewBooking, setReviewBooking] = useState<(Booking & { hasReview?: boolean }) | null>(null);

    // Handlers for Professional Actions
    const handleAccept = async (jobId: string) => {
        if (!db) return;
        try {
            await updateDoc(doc(db, "bookings", jobId), {
                status: "CONFIRMED",
                updatedAt: Timestamp.now()
            });
        } catch (e) {
            console.error("Error accepting", e);
        }
    };

    const handleReject = async (jobId: string) => {
        if (!db) return;
        try {
            await updateDoc(doc(db, "bookings", jobId), {
                status: "CANCELED_BY_HOST",
                updatedAt: Timestamp.now()
            });
        } catch (e) {
            console.error("Error rejecting", e);
        }
    };

    useEffect(() => {
        if (!user || !db) return;

        // Query BOOKINGS (old system)
        const bookingsField = userRole === 'professional' ? 'hostId' : 'clientId';
        const bookingsQuery = query(
            collection(db, "bookings"),
            where(bookingsField, "==", user.uid)
        );

        // Query JOBS (new AI Assistant system) - only for clients
        let jobsUnsubscribe = () => { };

        if (userRole === 'client') {
            const jobsQuery = query(
                collection(db, "jobs"),
                where("clientId", "==", user.uid)
            );

            jobsUnsubscribe = onSnapshot(jobsQuery, (snapshot) => {
                const jobs = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data(),
                    // Map jobs fields to booking-like structure for unified display
                    status: doc.data().status === 'open' ? 'PENDING_APPROVAL' :
                        doc.data().status === 'accepted' ? 'CONFIRMED' :
                            doc.data().status,
                    clientSnapshot: { displayName: doc.data().clientName },
                    hostSnapshot: { displayName: doc.data().assignedProName || 'Giełda Zleceń' },
                    listingSnapshot: { title: doc.data().title, serviceType: doc.data().category },
                    pricing: { totalAmount: doc.data().priceEstimate?.max },
                    createdAt: doc.data().createdAt,
                    _isJob: true // Flag to identify jobs vs bookings
                })) as any[];

                setOrders(prev => {
                    // Merge with bookings, keeping jobs separate
                    const bookingsOnly = prev.filter(p => !p._isJob);
                    return [...jobs, ...bookingsOnly].sort((a, b) => {
                        const t1 = a.createdAt?.seconds || 0;
                        const t2 = b.createdAt?.seconds || 0;
                        return t2 - t1;
                    });
                });
            });
        }

        const bookingsUnsubscribe = onSnapshot(bookingsQuery, (snapshot) => {
            const bookings = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            } as Booking))
                .sort((a, b) => {
                    const t1 = a.createdAt?.seconds || 0;
                    const t2 = b.createdAt?.seconds || 0;
                    return t2 - t1;
                });

            setOrders(prev => {
                // Merge with jobs, keeping bookings separate
                const jobsOnly = prev.filter(p => p._isJob);
                return [...jobsOnly, ...bookings].sort((a, b) => {
                    const t1 = a.createdAt?.seconds || 0;
                    const t2 = b.createdAt?.seconds || 0;
                    return t2 - t1;
                });
            });
            setLoading(false);
        }, (err) => {
            console.error("Error fetching bookings:", err);
            setLoading(false);
        });

        return () => {
            bookingsUnsubscribe();
            jobsUnsubscribe();
        };
    }, [user, userRole]);

    const formatDate = (ts: Timestamp) => {
        if (!ts) return "";
        return ts.toDate().toLocaleDateString("pl-PL", {
            day: "numeric",
            month: "short",
            year: "numeric"
        });
    };

    const formatTime = (ts: Timestamp) => {
        if (!ts) return "";
        return ts.toDate().toLocaleTimeString("pl-PL", {
            hour: "2-digit",
            minute: "2-digit"
        });
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'PENDING_APPROVAL': return 'text-amber-400 bg-amber-400/10 border-amber-400/20';
            case 'CONFIRMED': return 'text-blue-400 bg-blue-400/10 border-blue-400/20';
            case 'ACTIVE': return 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20';
            case 'COMPLETED': return 'text-slate-400 bg-slate-400/10 border-slate-400/20';
            case 'CANCELED_BY_HOST':
            case 'CANCELED_BY_GUEST': return 'text-red-400 bg-red-400/10 border-red-400/20';
            default: return 'text-slate-400 bg-slate-400/10 border-slate-400/20';
        }
    };

    const getStatusLabel = (status: string) => {
        switch (status) {
            case 'PENDING_APPROVAL': return 'Oczekuje na akceptację';
            case 'CONFIRMED': return 'Potwierdzone';
            case 'ACTIVE': return 'W trakcie';
            case 'COMPLETED': return 'Zakończone';
            case 'CANCELED_BY_HOST': return 'Anulowane przez wykonawcę';
            case 'CANCELED_BY_GUEST': return 'Anulowane przez Ciebie';
            default: return status;
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[50vh]">
                <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
            </div>
        );
    }

    return (
        <div className="w-full h-full bg-slate-950 p-4 md:p-8 pt-24 overflow-y-auto">
            <div className="max-w-4xl mx-auto space-y-8">

                <h2 className="text-3xl font-bold text-white flex items-center gap-3">
                    <User className="text-blue-500" />
                    {userRole === 'professional' ? 'Historia Zleceń' : 'Moje Zlecenia'}
                </h2>

                {orders.length === 0 ? (
                    <div className="text-center py-20 bg-white/5 rounded-2xl border border-white/5">
                        <Briefcase className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                        <h3 className="text-xl font-semibold text-white">Brak zleceń</h3>
                        <p className="text-slate-400 mt-2">
                            {userRole === 'professional'
                                ? 'Nie masz jeszcze żadnych zleceń w historii.'
                                : 'Wyszukaj fachowca na mapie i złóż zlecenie.'}
                        </p>
                    </div>
                ) : (
                    <div className="grid gap-4">
                        {orders.map((booking) => (
                            <motion.div
                                key={booking.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="bg-white/5 border border-white/10 rounded-2xl p-6 hover:bg-white/10 transition-colors group"
                            >
                                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-4">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-xl font-bold text-white">
                                            {userRole === 'professional'
                                                ? (booking.clientSnapshot?.displayName?.[0] || 'K')
                                                : (booking.hostSnapshot?.displayName?.[0] || 'F')}
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-semibold text-white">
                                                {booking.listingSnapshot?.title || booking.listingSnapshot?.serviceType || 'Usługa'}
                                            </h3>
                                            <p className="text-slate-400 text-sm">
                                                {userRole === 'professional' ? 'Klient: ' : 'Wykonawca: '}
                                                <span className="text-white">
                                                    {userRole === 'professional'
                                                        ? (booking.clientSnapshot?.displayName || 'Gość')
                                                        : (booking.hostSnapshot?.displayName || 'Fachowiec')}
                                                </span>
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex flex-col items-end gap-2">
                                        <div className={`px-3 py-1 rounded-full text-xs font-bold border inline-flex items-center gap-2 ${getStatusColor(booking.status)}`}>
                                            {booking.status === 'PENDING_APPROVAL' && <Clock className="w-3 h-3" />}
                                            {booking.status === 'CONFIRMED' && <CheckCircle className="w-3 h-3" />}
                                            {getStatusLabel(booking.status)}
                                        </div>

                                        {/* ACTION BUTTONS FOR PRO */}
                                        {userRole === 'professional' && booking.status === 'PENDING_APPROVAL' && (
                                            <div className="flex gap-2 mt-1">
                                                <button
                                                    onClick={() => handleReject(booking.id)}
                                                    className="px-3 py-1 text-xs font-bold text-red-400 bg-red-400/10 hover:bg-red-400/20 rounded border border-red-400/20 transition-colors"
                                                >
                                                    Odrzuć
                                                </button>
                                                <button
                                                    onClick={() => handleAccept(booking.id)}
                                                    className="px-3 py-1 text-xs font-bold text-emerald-400 bg-emerald-400/10 hover:bg-emerald-400/20 rounded border border-emerald-400/20 transition-colors"
                                                >
                                                    Akceptuj
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-sm text-slate-400 border-t border-white/5 pt-4 mt-2">
                                    <div className="flex items-center gap-2">
                                        <Calendar className="w-4 h-4 text-slate-500" />
                                        {formatDate(booking.createdAt)}
                                    </div>
                                    {booking.pricing?.totalAmount && (
                                        <div className="flex items-center gap-2 font-medium text-white">
                                            {booking.pricing.totalAmount} PLN
                                        </div>
                                    )}
                                    <div className="flex items-center gap-2">
                                        <MapPin className="w-4 h-4 text-slate-500" />
                                        <span className="truncate max-w-[150px]">{booking.serviceLocation?.address || "Lokalizacja"}</span>
                                    </div>

                                    <button
                                        onClick={() => onChatOpen({
                                            id: userRole === 'professional' ? booking.clientId : booking.hostId, // Chat with opposite party
                                            name: userRole === 'professional' ? booking.clientSnapshot?.displayName : booking.hostSnapshot?.displayName,
                                            imageUrl: userRole === 'professional' ? booking.clientSnapshot?.avatarUrl : booking.hostSnapshot?.avatarUrl,
                                            profession: booking.listingSnapshot?.serviceType,
                                            price: 0, // Not needed for chat context
                                            rating: 5.0,
                                            location: { lat: 0, lng: 0 }
                                        })}
                                        className="flex items-center gap-2 text-blue-400 hover:text-blue-300 transition-colors justify-self-start md:justify-self-end w-full md:w-auto"
                                    >
                                        <MessageCircle className="w-4 h-4" />
                                        Napisz wiadomość
                                    </button>

                                    {/* Review Button for Clients */}
                                    {booking.status === 'CONFIRMED' && !booking.hasReview && userRole === 'client' && (
                                        <button
                                            onClick={() => setReviewBooking(booking)}
                                            className="px-3 py-2 text-xs font-bold text-amber-400 bg-amber-400/10 hover:bg-amber-400/20 rounded-lg border border-amber-400/20 flex items-center gap-2 transition-colors justify-self-start md:justify-self-end"
                                        >
                                            <div className="w-4 h-4 rounded-full bg-amber-400/20 flex items-center justify-center">⭐</div>
                                            Oceń usługę
                                        </button>
                                    )}
                                </div>
                            </motion.div>
                        ))}
                    </div>
                )}
            </div>

            {/* Review Modal */}
            <ReviewModal
                isOpen={!!reviewBooking}
                onClose={() => setReviewBooking(null)}
                bookingId={reviewBooking?.id || ""}
                hostId={reviewBooking?.hostId || ""}
                hostName={reviewBooking?.hostSnapshot?.displayName || "Fachowca"}
            />
        </div>
    );
}
