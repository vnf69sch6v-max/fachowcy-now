"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Clock, MapPin, MessageCircle, Star, Loader2 } from "lucide-react";
import { collection, query, where, onSnapshot, orderBy, limit } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
// V2 Imports
import { Booking, BookingStatus } from "@/types/firestore-v2";
import { bookingConverter } from "@/types/firestore-v2";
import { ReviewModal } from "./ReviewModal";
import { ProposalsListModal } from "./ProposalsListModal";

// Display Interface (simplified for UI)
interface ActiveBookingDisplay {
    id: string;
    hostId: string;
    hostName: string;
    hostProfession: string;
    hostRating: number;
    hostImageUrl: string;
    status: BookingStatus;
    eta: string;
    price: number;
    unreadMessages: number; // Placeholder for now
    location: { lat: number; lng: number };
}

// Status Mappings
const STATUS_LABELS: Partial<Record<BookingStatus, string>> = {
    'INQUIRY': "Zapytanie",
    'PENDING_APPROVAL': "Oczekiwanie na akceptację",
    'PENDING_PAYMENT': "Oczekiwanie na płatność",
    'CONFIRMED': "Zlecenie przyjęte",
    'ACTIVE': "W trakcie realizacji",
    'COMPLETED': "Zakończone - Otwórz aby ocenić",
    'CANCELED_BY_GUEST': "Anulowane (Ty)",
    'CANCELED_BY_HOST': "Anulowane (Fachowiec)",
    'EXPIRED': "Wygasło",
};

const STATUS_COLORS: Partial<Record<BookingStatus, string>> = {
    'INQUIRY': "bg-slate-500",
    'PENDING_APPROVAL': "bg-yellow-500",
    'PENDING_PAYMENT': "bg-orange-500",
    'CONFIRMED': "bg-blue-500",
    'ACTIVE': "bg-emerald-500",
    'COMPLETED': "bg-slate-600",
    'CANCELED_BY_GUEST': "bg-red-500",
    'CANCELED_BY_HOST': "bg-red-600",
    'EXPIRED': "bg-slate-700",
};

interface BookingData {
    id: string;
    hostId: string;
    hostName: string;
    hostImageUrl: string;
}

interface ActiveBookingCardProps {
    booking: ActiveBookingDisplay;
    onChatClick?: (data: BookingData) => void;
    onLocationClick?: () => void;
    onReviewClick?: (data: { bookingId: string; hostId: string; hostName: string }) => void;
    className?: string;
}

function ActiveBookingCard({ booking, onChatClick, onLocationClick, onReviewClick, className }: ActiveBookingCardProps) {
    // Determine active pulse
    const isActive = ['PENDING_APPROVAL', 'CONFIRMED', 'ACTIVE'].includes(booking.status);
    const isCompleted = booking.status === 'COMPLETED';
    const isMarketplace = booking.hostId === 'MARKETPLACE';

    return (
        <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 20, opacity: 0 }}
            className={`w-[90vw] md:w-96 flex-shrink-0 snap-center ${className || ''}`}
        >
            <div className="bg-slate-900/90 backdrop-blur-xl border border-white/10 rounded-2xl p-4 shadow-2xl relative overflow-hidden group">
                {/* Glow effect for marketplace */}
                {isMarketplace && (
                    <div className="absolute top-0 right-0 w-20 h-20 bg-violet-500/20 blur-3xl rounded-full -mt-10 -mr-10 pointer-events-none" />
                )}

                {/* Status Bar */}
                <div className="flex items-center gap-2 mb-3">
                    <div className={`w-2 h-2 rounded-full ${STATUS_COLORS[booking.status] || 'bg-slate-500'} ${isActive ? 'animate-pulse' : ''}`} />
                    <span className="text-xs text-slate-400 font-medium">
                        {isMarketplace ? 'Giełda Zleceń (Oczekiwanie)' : (STATUS_LABELS[booking.status] || booking.status)}
                    </span>
                    {booking.status === "ACTIVE" && (
                        <span className="ml-auto text-xs text-cyan-400 font-bold flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            ETA: {booking.eta}
                        </span>
                    )}
                    {isMarketplace && (
                        <span className="ml-auto flex items-center gap-1 bg-violet-500/10 px-2 py-0.5 rounded-full border border-violet-500/20">
                            <Star className="w-3 h-3 text-violet-400 animate-pulse" />
                            <span className="text-[10px] text-violet-300 font-bold">Publiczne</span>
                        </span>
                    )}
                </div>

                {/* Host Info */}
                <div className="flex items-center gap-3">
                    <div className="relative">
                        <img
                            src={booking.hostImageUrl || "https://randomuser.me/api/portraits/lego/1.jpg"}
                            alt={booking.hostName}
                            className={`w-12 h-12 rounded-full object-cover border ${isMarketplace ? 'border-violet-500/50' : 'border-white/10'}`}
                        />
                        {isMarketplace && (
                            <div className="absolute -bottom-1 -right-1 bg-violet-500 rounded-full p-0.5 border-2 border-slate-900">
                                <Clock className="w-3 h-3 text-white" />
                            </div>
                        )}
                    </div>
                    <div className="flex-1">
                        <h3 className="font-bold text-white text-sm">{booking.hostName}</h3>
                        <p className="text-xs text-emerald-400">{booking.hostProfession}</p>
                        {!isMarketplace && (
                            <div className="flex items-center gap-1 mt-0.5">
                                <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                                <span className="text-[10px] text-slate-400 font-bold">
                                    {booking.hostRating.toFixed(1)}
                                </span>
                            </div>
                        )}
                        {isMarketplace && (
                            <p className="text-[10px] text-slate-400 mt-0.5">Szukam fachowców...</p>
                        )}
                    </div>
                    <div className="text-right">
                        <p className="font-bold text-white font-mono">{booking.price} zł</p>
                        <p className="text-[10px] text-slate-500">Szacunek</p>
                    </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 mt-4">
                    <button
                        onClick={onLocationClick}
                        className="flex-1 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold py-2.5 rounded-xl border border-white/5 flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                        disabled={isMarketplace} // Can't track location yet
                    >
                        <MapPin className="w-3.5 h-3.5" />
                        {isMarketplace ? 'Oczekiwanie' : 'Śledź'}
                    </button>
                    {!isMarketplace && (
                        <button
                            onClick={() => onChatClick?.({
                                id: booking.id,
                                hostId: booking.hostId,
                                hostName: booking.hostName,
                                hostImageUrl: booking.hostImageUrl
                            })}
                            className="flex-1 bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-white text-xs font-bold py-2 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-900/20"
                        >
                            <MessageCircle className="w-3.5 h-3.5" />
                            Czat
                            {booking.unreadMessages > 0 && (
                                <span className="bg-red-500 text-white text-[9px] w-4 h-4 rounded-full flex items-center justify-center">
                                    {booking.unreadMessages}
                                </span>
                            )}
                        </button>
                    )}
                    {isMarketplace && (
                        <button className="flex-1 bg-slate-700/50 text-slate-400 text-xs font-bold py-2 rounded-xl flex items-center justify-center gap-2 cursor-not-allowed">
                            <Clock className="w-3.5 h-3.5" />
                            Czekam...
                        </button>
                    )}
                    {/* Review button for completed bookings */}
                    {isCompleted && (
                        <button
                            onClick={() => onReviewClick?.({
                                bookingId: booking.id,
                                hostId: booking.hostId,
                                hostName: booking.hostName
                            })}
                            className="flex-1 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white text-xs font-bold py-2.5 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-amber-900/20"
                        >
                            <Star className="w-3.5 h-3.5" />
                            Oceń
                        </button>
                    )}
                </div>
            </div>
        </motion.div>
    );
}

export function ClientDashboard({ onLocationSelect, onChatOpen }: {
    onLocationSelect?: (loc: { lat: number; lng: number }) => void;
    onChatOpen?: (data: BookingData) => void;
}) {
    const { user } = useAuth();
    const [activeBookings, setActiveBookings] = useState<ActiveBookingDisplay[]>([]);
    const [loading, setLoading] = useState(true);

    // State for Review Modal
    const [reviewTarget, setReviewTarget] = useState<{
        bookingId: string;
        hostId: string;
        hostName: string;
    } | null>(null);

    // State for Proposals Modal
    const [selectedJobForProposals, setSelectedJobForProposals] = useState<any | null>(null);

    useEffect(() => {
        if (!user || !db) return;

        // Query new 'bookings' collection
        // Filter by clientId and active statuses (including INQUIRY for marketplace, COMPLETED for review)
        const activeStatuses: BookingStatus[] = ['INQUIRY', 'PENDING_APPROVAL', 'PENDING_PAYMENT', 'CONFIRMED', 'ACTIVE', 'COMPLETED'];

        const q = query(
            collection(db, "bookings").withConverter(bookingConverter),
            where("clientId", "==", user.uid),
            where("status", "in", activeStatuses),
            orderBy("createdAt", "desc"),
            limit(10) // Allow multiple
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const bookings: ActiveBookingDisplay[] = [];

            snapshot.forEach(doc => {
                const booking = doc.data();

                // Safe extraction of host data from snapshot
                const isMarketplace = booking.hostId === 'MARKETPLACE';
                const hostName = isMarketplace ? "Giełda Zleceń" : (booking.hostSnapshot?.displayName || "Fachowiec");
                const hostProfession = booking.listingSnapshot?.title || "Usługa";
                const hostRating = booking.hostSnapshot?.ratingAtBooking || 4.5;
                const hostImage = isMarketplace
                    ? "https://cdn-icons-png.flaticon.com/512/3063/3063822.png" // Generic Icon
                    : (booking.hostSnapshot?.avatarUrl || "");

                bookings.push({
                    id: booking.id,
                    hostId: booking.hostId,
                    hostName: hostName,
                    hostProfession: hostProfession,
                    hostRating: hostRating,
                    hostImageUrl: hostImage,
                    status: booking.status,
                    eta: "15 min", // Mock ETA for now
                    price: booking.pricing.totalAmount,
                    unreadMessages: 0,
                    location: booking.serviceLocation
                });
            });

            setActiveBookings(bookings);
            setLoading(false);

        }, (error) => {
            console.error("Error fetching bookings:", error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [user]);

    // Fetch My Jobs (Unified Jobs Collection)
    const [myJobs, setMyJobs] = useState<any[]>([]);
    useEffect(() => {
        if (!user) return;

        // Import dynamically to avoid SSR issues if any, or just standard import
        import("@/lib/job-service").then(({ JobService }) => {
            JobService.getClientJobs(user.uid).then(jobs => {
                setMyJobs(jobs);
            });
        });
    }, [user]);

    if (loading) return (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-slate-900/80 p-3 rounded-full backdrop-blur z-20">
            <Loader2 className="w-5 h-5 text-emerald-400 animate-spin" />
        </div>
    );

    if (activeBookings.length === 0 && myJobs.length === 0) return null;

    return (
        <>
            <div className="fixed bottom-28 md:bottom-24 left-0 right-0 z-30 overflow-x-auto pb-4 pt-4 px-4 scrollbar-hide flex flex-col gap-4 pointer-events-none">

                {/* Active Bookings */}
                {activeBookings.length > 0 && (
                    <div className="pointer-events-auto">
                        <div className="flex gap-4 w-max mx-auto md:mx-0">
                            {activeBookings.map(booking => (
                                <ActiveBookingCard
                                    key={booking.id}
                                    booking={booking}
                                    onChatClick={onChatOpen}
                                    onLocationClick={() => onLocationSelect?.(booking.location)}
                                    onReviewClick={(data) => setReviewTarget(data)}
                                />
                            ))}
                        </div>
                    </div>
                )}

                {/* My Open Jobs */}
                {myJobs.length > 0 && (
                    <div className="pointer-events-auto">
                        <div className="flex items-center gap-2 mb-2 px-1">
                            <span className="w-2 h-2 rounded-full bg-violet-500 animate-pulse" />
                            <span className="text-xs text-violet-300 font-bold uppercase tracking-wider shadow-black drop-shadow-md">
                                Twoje Ogłoszenia ({myJobs.length})
                            </span>
                        </div>
                        <div className="flex gap-4 w-max mx-auto md:mx-0">
                            {myJobs.map(job => (
                                <motion.div
                                    key={job.id}
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className="w-[85vw] md:w-80 bg-slate-900/90 backdrop-blur-xl border border-violet-500/30 rounded-2xl p-4 shadow-xl relative overflow-hidden"
                                >
                                    <div className="flex items-start justify-between mb-3">
                                        <div>
                                            <h4 className="font-bold text-white text-sm">{job.title}</h4>
                                            <p className="text-xs text-violet-400">{job.category}</p>
                                        </div>
                                        <div className="bg-violet-500/20 px-2 py-1 rounded-lg border border-violet-500/20">
                                            <p className="text-xs font-bold text-violet-300">
                                                {job.proposalIds?.length || 0} ofert
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2 text-xs text-slate-400 mb-3">
                                        <Clock className="w-3.5 h-3.5" />
                                        <span>Wygasa za 7 dni</span>
                                    </div>

                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => setSelectedJobForProposals(job)}
                                            className="flex-1 py-2 bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold rounded-xl transition-colors"
                                        >
                                            Zobacz oferty ({job.proposalIds?.length || 0})
                                        </button>
                                        <button className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-xl transition-colors">
                                            Edytuj
                                        </button>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    </div>
                )}
            </div>


            {/* Review Modal */}
            {reviewTarget && (
                <ReviewModal
                    isOpen={!!reviewTarget}
                    onClose={() => setReviewTarget(null)}
                    bookingId={reviewTarget.bookingId}
                    hostId={reviewTarget.hostId}
                    hostName={reviewTarget.hostName}
                    onSuccess={() => setReviewTarget(null)}
                />
            )}

            {/* Proposals List Modal */}
            {selectedJobForProposals && (
                <ProposalsListModal
                    isOpen={!!selectedJobForProposals}
                    onClose={() => setSelectedJobForProposals(null)}
                    job={selectedJobForProposals}
                />
            )}
        </>
    );
}

