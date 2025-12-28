"use client";

/**
 * ProposalModal - Modal for professionals to submit job proposals
 */

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Send, Calendar, DollarSign, MessageSquare, Loader2 } from "lucide-react";
import { Job } from "@/types/firestore-v2";
import { JobService } from "@/lib/job-service";
import { useAuth } from "@/context/AuthContext";
import { Timestamp } from "firebase/firestore";

interface ProposalModalProps {
    isOpen: boolean;
    onClose: () => void;
    job: Job;
    onSuccess?: (proposalId: string) => void;
}

export function ProposalModal({ isOpen, onClose, job, onSuccess }: ProposalModalProps) {
    const { user } = useAuth();
    const [price, setPrice] = useState(job.priceEstimate?.min || 100);
    const [message, setMessage] = useState("");
    const [availabilityDate, setAvailabilityDate] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async () => {
        if (!user) {
            setError("Musisz być zalogowany");
            return;
        }

        if (!message.trim()) {
            setError("Napisz wiadomość do klienta");
            return;
        }

        setIsSubmitting(true);
        setError(null);

        try {
            const proposalId = await JobService.submitProposal(job.id, {
                jobId: job.id,
                proId: user.uid,
                proName: user.displayName || "Fachowiec",
                proAvatarUrl: user.photoURL || "",
                proRating: 5.0, // TODO: Fetch from provider profile
                price: price,
                message: message.trim(),
                availability: availabilityDate
                    ? Timestamp.fromDate(new Date(availabilityDate))
                    : Timestamp.now()
            });

            if (proposalId) {
                onSuccess?.(proposalId);
                onClose();
            } else {
                setError("Nie udało się wysłać oferty");
            }
        } catch (err) {
            console.error("Proposal error:", err);
            setError("Wystąpił błąd podczas wysyłania");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
                    onClick={onClose}
                >
                    <motion.div
                        initial={{ scale: 0.95, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.95, opacity: 0 }}
                        onClick={(e) => e.stopPropagation()}
                        className="w-full max-w-lg bg-slate-900 rounded-3xl border border-white/10 overflow-hidden shadow-2xl"
                    >
                        {/* Header */}
                        <div className="p-6 border-b border-white/10 flex justify-between items-start">
                            <div>
                                <h2 className="text-xl font-bold text-white">Złóż ofertę</h2>
                                <p className="text-sm text-slate-400 mt-1">{job.title}</p>
                            </div>
                            <button
                                onClick={onClose}
                                className="p-2 hover:bg-white/5 rounded-xl transition-colors"
                            >
                                <X className="w-5 h-5 text-slate-400" />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="p-6 space-y-5">
                            {/* Price */}
                            <div>
                                <label className="flex items-center gap-2 text-sm font-medium text-slate-300 mb-2">
                                    <DollarSign className="w-4 h-4 text-emerald-400" />
                                    Twoja cena (PLN)
                                </label>
                                <div className="relative">
                                    <input
                                        type="number"
                                        value={price}
                                        onChange={(e) => setPrice(Number(e.target.value))}
                                        min={0}
                                        className="w-full px-4 py-3 bg-slate-800/50 border border-white/10 rounded-xl text-white text-lg font-bold focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50"
                                    />
                                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500">PLN</span>
                                </div>
                                <p className="text-xs text-slate-500 mt-1">
                                    Budżet klienta: {job.priceEstimate?.min} - {job.priceEstimate?.max} PLN
                                </p>
                            </div>

                            {/* Availability */}
                            <div>
                                <label className="flex items-center gap-2 text-sm font-medium text-slate-300 mb-2">
                                    <Calendar className="w-4 h-4 text-blue-400" />
                                    Kiedy możesz wykonać?
                                </label>
                                <input
                                    type="date"
                                    value={availabilityDate}
                                    onChange={(e) => setAvailabilityDate(e.target.value)}
                                    min={new Date().toISOString().split('T')[0]}
                                    className="w-full px-4 py-3 bg-slate-800/50 border border-white/10 rounded-xl text-white focus:outline-none focus:border-blue-500/50"
                                />
                            </div>

                            {/* Message */}
                            <div>
                                <label className="flex items-center gap-2 text-sm font-medium text-slate-300 mb-2">
                                    <MessageSquare className="w-4 h-4 text-violet-400" />
                                    Wiadomość do klienta
                                </label>
                                <textarea
                                    value={message}
                                    onChange={(e) => setMessage(e.target.value)}
                                    placeholder="Przedstaw się i opisz dlaczego jesteś najlepszym wyborem..."
                                    rows={4}
                                    className="w-full px-4 py-3 bg-slate-800/50 border border-white/10 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:border-violet-500/50 resize-none"
                                />
                            </div>

                            {/* Error */}
                            {error && (
                                <p className="text-sm text-red-400 text-center">{error}</p>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="p-6 pt-0">
                            <button
                                onClick={handleSubmit}
                                disabled={isSubmitting}
                                className="w-full flex items-center justify-center gap-2 py-4 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 rounded-xl text-white font-bold transition-all disabled:opacity-50 shadow-lg shadow-violet-900/30"
                            >
                                {isSubmitting ? (
                                    <>
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                        Wysyłanie...
                                    </>
                                ) : (
                                    <>
                                        <Send className="w-5 h-5" />
                                        Wyślij ofertę
                                    </>
                                )}
                            </button>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}

export default ProposalModal;
