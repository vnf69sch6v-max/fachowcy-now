"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Star, Send, Loader2 } from "lucide-react";
import { addDoc, collection, Timestamp, updateDoc, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";

interface ReviewModalProps {
    isOpen: boolean;
    onClose: () => void;
    bookingId: string;
    hostId: string;
    hostName: string;
    onSuccess?: () => void;
}

export function ReviewModal({ isOpen, onClose, bookingId, hostId, hostName, onSuccess }: ReviewModalProps) {
    const { user } = useAuth();
    const [rating, setRating] = useState(5);
    const [comment, setComment] = useState("");
    const [loading, setLoading] = useState(false);
    const [hoverRating, setHoverRating] = useState(0);

    const handleSubmit = async () => {
        if (!user || !db || !comment.trim()) return;
        setLoading(true);

        try {
            // Save review
            await addDoc(collection(db, "reviews"), {
                bookingId,
                clientId: user.uid,
                hostId,
                rating,
                comment: comment.trim(),
                createdAt: Timestamp.now()
            });

            // Update booking status
            await updateDoc(doc(db, "bookings", bookingId), {
                status: "COMPLETED",
                hasReview: true,
                updatedAt: Timestamp.now()
            });

            // Update host's average rating (simplified - should be Cloud Function)
            // TODO: Move to Cloud Function for accuracy

            onSuccess?.();
            onClose();
        } catch (e) {
            console.error("Error submitting review:", e);
        }
        setLoading(false);
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
                onClick={onClose}
            >
                <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.9, opacity: 0 }}
                    onClick={(e) => e.stopPropagation()}
                    className="w-full max-w-md bg-slate-900 border border-white/10 rounded-2xl overflow-hidden shadow-2xl"
                >
                    <div className="p-6">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold text-white">Oceń {hostName}</h2>
                            <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Star Rating */}
                        <div className="flex justify-center gap-2 mb-6">
                            {[1, 2, 3, 4, 5].map((star) => (
                                <button
                                    key={star}
                                    onMouseEnter={() => setHoverRating(star)}
                                    onMouseLeave={() => setHoverRating(0)}
                                    onClick={() => setRating(star)}
                                    className="transition-transform hover:scale-110 focus:outline-none"
                                >
                                    <Star
                                        className={`w-10 h-10 ${star <= (hoverRating || rating)
                                                ? "text-amber-400 fill-amber-400"
                                                : "text-slate-600"
                                            }`}
                                    />
                                </button>
                            ))}
                        </div>

                        {/* Comment */}
                        <textarea
                            value={comment}
                            onChange={(e) => setComment(e.target.value)}
                            placeholder="Opisz swoje doświadczenie..."
                            className="w-full h-32 bg-white/5 border border-white/10 rounded-xl p-4 text-white placeholder-slate-500 resize-none focus:outline-none focus:border-blue-500 focus:bg-white/10 transition-colors"
                        />

                        {/* Submit */}
                        <button
                            onClick={handleSubmit}
                            disabled={loading || !comment.trim()}
                            className="w-full mt-4 py-3 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl font-semibold text-white flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
                        >
                            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                            Wyślij opinię
                        </button>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}
