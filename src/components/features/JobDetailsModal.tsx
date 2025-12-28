"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    X, MapPin, Clock, Star, MessageCircle, Send, Loader2,
    DollarSign, Calendar, CheckCircle, User
} from "lucide-react";
import { doc, collection, setDoc, updateDoc, addDoc, getDoc, serverTimestamp, increment } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";

interface Job {
    id: string;
    title: string;
    description: string;
    category: string;
    status: string;
    clientId: string;
    clientName: string;
    chatId?: string;
    priceEstimate?: { min: number; max: number };
    location?: { address: string; lat: number; lng: number };
    createdAt?: any;
}

interface JobDetailsModalProps {
    job: Job;
    isOpen: boolean;
    onClose: () => void;
    onStartChat?: (chatId: string) => void;
}

export function JobDetailsModal({ job, isOpen, onClose, onStartChat }: JobDetailsModalProps) {
    const { user } = useAuth();
    const [proposalPrice, setProposalPrice] = useState(job.priceEstimate?.max || 200);
    const [proposalMessage, setProposalMessage] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);

    const handleSubmitProposal = async () => {
        if (!user || !db || isSubmitting) return;
        setIsSubmitting(true);

        try {
            // 1. Add proposal to subcollection
            const proposalRef = doc(collection(db, `jobs/${job.id}/proposals`));
            await setDoc(proposalRef, {
                id: proposalRef.id,
                providerId: user.uid,
                providerName: user.displayName || 'Fachowiec',
                price: proposalPrice,
                message: proposalMessage,
                status: 'pending',
                createdAt: serverTimestamp()
            });

            // 2. Increment proposal count
            await updateDoc(doc(db, 'jobs', job.id), {
                proposalCount: increment(1)
            });

            // 3. Send notification to job chat
            if (job.chatId) {
                await addDoc(collection(db, `chats/${job.chatId}/messages`), {
                    content: `📨 **Nowa oferta od ${user.displayName || 'fachowca'}**\n\n💰 Cena: **${proposalPrice} zł**\n\n"${proposalMessage}"`,
                    senderId: 'system',
                    senderRole: 'system',
                    type: 'proposal_notification',
                    proposalId: proposalRef.id,
                    providerId: user.uid,
                    providerName: user.displayName,
                    createdAt: serverTimestamp()
                });

                // Update chat last message
                await updateDoc(doc(db, 'chats', job.chatId), {
                    lastMessage: `📨 Nowa oferta: ${proposalPrice} zł`,
                    lastMessageAt: serverTimestamp()
                });
            }

            setSubmitted(true);
            setTimeout(() => {
                onClose();
            }, 1500);

        } catch (error) {
            console.error('Error submitting proposal:', error);
            alert('Błąd przy wysyłaniu oferty. Spróbuj ponownie.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleStartChat = async () => {
        if (job.chatId) {
            onStartChat?.(job.chatId);
            onClose();
        }
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm"
                onClick={onClose}
            >
                <motion.div
                    initial={{ opacity: 0, y: 50, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 50, scale: 0.95 }}
                    onClick={(e) => e.stopPropagation()}
                    className="absolute inset-x-4 top-16 bottom-16 md:inset-x-auto md:left-1/2 md:-translate-x-1/2 md:w-[480px] bg-slate-900 rounded-2xl overflow-hidden border border-white/10 shadow-2xl flex flex-col"
                >
                    {/* Header */}
                    <div className="p-5 border-b border-white/10 bg-gradient-to-r from-violet-500/10 to-indigo-500/10">
                        <div className="flex justify-between items-start">
                            <div>
                                <span className="inline-block px-2 py-1 text-xs font-bold text-violet-400 bg-violet-500/20 rounded-lg mb-2">
                                    {job.category}
                                </span>
                                <h2 className="text-xl font-bold text-white">{job.title}</h2>
                                <div className="flex items-center gap-2 mt-1 text-sm text-slate-400">
                                    <User className="w-3.5 h-3.5" />
                                    <span>{job.clientName}</span>
                                </div>
                            </div>
                            <button
                                onClick={onClose}
                                className="w-10 h-10 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
                            >
                                <X className="w-5 h-5 text-white" />
                            </button>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto p-5 space-y-5">
                        {/* Description */}
                        <div>
                            <h3 className="text-sm text-slate-400 mb-2 font-medium">Opis problemu</h3>
                            <p className="text-white leading-relaxed">{job.description}</p>
                        </div>

                        {/* Location */}
                        {job.location && (
                            <div className="flex items-center gap-3 p-3 bg-blue-500/10 rounded-xl border border-blue-500/20">
                                <MapPin className="w-5 h-5 text-blue-400 flex-shrink-0" />
                                <span className="text-blue-300 text-sm">{job.location.address}</span>
                            </div>
                        )}

                        {/* Client Budget */}
                        <div className="p-4 bg-gradient-to-r from-emerald-500/10 to-green-500/10 rounded-xl border border-emerald-500/20">
                            <span className="text-sm text-slate-400">Budżet klienta</span>
                            <p className="text-3xl font-bold text-emerald-400 mt-1">
                                {job.priceEstimate?.min}-{job.priceEstimate?.max} zł
                            </p>
                        </div>

                        {/* Proposal Form */}
                        {!submitted ? (
                            <div className="space-y-4 pt-4 border-t border-white/10">
                                <h3 className="font-bold text-white flex items-center gap-2">
                                    <Send className="w-4 h-4 text-violet-400" />
                                    Złóż ofertę
                                </h3>

                                <div>
                                    <label className="text-sm text-slate-400 block mb-2">
                                        Twoja cena (zł)
                                    </label>
                                    <div className="relative">
                                        <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                                        <input
                                            type="number"
                                            value={proposalPrice}
                                            onChange={(e) => setProposalPrice(Number(e.target.value))}
                                            className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-lg font-bold focus:outline-none focus:border-violet-500/50"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="text-sm text-slate-400 block mb-2">
                                        Wiadomość do klienta
                                    </label>
                                    <textarea
                                        value={proposalMessage}
                                        onChange={(e) => setProposalMessage(e.target.value)}
                                        placeholder="Dzień dobry, mam wieloletnie doświadczenie w..."
                                        className="w-full p-4 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 h-28 resize-none focus:outline-none focus:border-violet-500/50"
                                    />
                                </div>
                            </div>
                        ) : (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="p-6 bg-emerald-500/20 rounded-xl border border-emerald-500/30 text-center"
                            >
                                <CheckCircle className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
                                <h3 className="text-lg font-bold text-white">Oferta wysłana!</h3>
                                <p className="text-sm text-slate-400 mt-1">Klient otrzymał powiadomienie</p>
                            </motion.div>
                        )}
                    </div>

                    {/* Actions */}
                    {!submitted && (
                        <div className="p-5 border-t border-white/10 bg-slate-900/50 flex gap-3">
                            <button
                                onClick={handleStartChat}
                                disabled={!job.chatId}
                                className="flex-1 py-4 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-white rounded-xl flex items-center justify-center gap-2 transition-colors font-medium"
                            >
                                <MessageCircle className="w-5 h-5" />
                                Napisz najpierw
                            </button>
                            <button
                                onClick={handleSubmitProposal}
                                disabled={isSubmitting || !proposalMessage.trim()}
                                className="flex-1 py-4 bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-400 hover:to-green-400 disabled:opacity-50 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-500/20"
                            >
                                {isSubmitting ? (
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                ) : (
                                    <Send className="w-5 h-5" />
                                )}
                                Wyślij ofertę
                            </button>
                        </div>
                    )}
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}
