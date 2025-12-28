"use client";

/**
 * ProposalsListModal - Modal for clients to view proposals for their jobs
 */

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Loader2, MessageCircle, Inbox } from "lucide-react";
import { Job, JobProposal } from "@/types/firestore-v2";
import { JobService } from "@/lib/job-service";
import { ProposalCard } from "./ProposalCard";
import { ChatService } from "@/lib/chat-service";
import { useAuth } from "@/context/AuthContext";

interface ProposalsListModalProps {
    isOpen: boolean;
    onClose: () => void;
    job: Job;
    onChatOpen?: (chatId: string) => void;
}

export function ProposalsListModal({ isOpen, onClose, job, onChatOpen }: ProposalsListModalProps) {
    const { user } = useAuth();
    const [proposals, setProposals] = useState<JobProposal[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!isOpen || !job.id) return;

        setLoading(true);
        JobService.getJobProposals(job.id).then(fetchedProposals => {
            setProposals(fetchedProposals);
            setLoading(false);
        });
    }, [isOpen, job.id]);

    const handleAccept = async (proposal: JobProposal) => {
        const success = await JobService.acceptProposal(job.id, proposal.id);
        if (success) {
            // Refresh proposals
            const updated = await JobService.getJobProposals(job.id);
            setProposals(updated);
        }
    };

    const handleReject = async (proposal: JobProposal) => {
        // TODO: Add reject method to JobService
        console.log("Rejecting proposal:", proposal.id);
    };

    const handleMessage = async (proposal: JobProposal) => {
        if (!user) return;

        try {
            // Create or get existing chat
            const chatId = await ChatService.createChat(
                job.id,
                user.uid,
                user.displayName || "Klient",
                proposal.proId,
                proposal.proName
            );

            if (chatId) {
                onChatOpen?.(chatId);
                onClose();
            }
        } catch (error) {
            console.error("Error creating chat:", error);
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto"
                    onClick={onClose}
                >
                    <motion.div
                        initial={{ scale: 0.95, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.95, opacity: 0 }}
                        onClick={(e) => e.stopPropagation()}
                        className="w-full max-w-2xl max-h-[80vh] bg-slate-900 rounded-3xl border border-white/10 overflow-hidden shadow-2xl flex flex-col"
                    >
                        {/* Header */}
                        <div className="p-6 border-b border-white/10 flex justify-between items-start flex-shrink-0">
                            <div>
                                <h2 className="text-xl font-bold text-white">Oferty na: {job.title}</h2>
                                <p className="text-sm text-slate-400 mt-1">
                                    {proposals.length} {proposals.length === 1 ? 'propozycja' : 'propozycji'}
                                </p>
                            </div>
                            <button
                                onClick={onClose}
                                className="p-2 hover:bg-white/5 rounded-xl transition-colors"
                            >
                                <X className="w-5 h-5 text-slate-400" />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto p-6">
                            {loading ? (
                                <div className="flex justify-center py-20">
                                    <Loader2 className="w-8 h-8 text-violet-500 animate-spin" />
                                </div>
                            ) : proposals.length === 0 ? (
                                <div className="text-center py-16">
                                    <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center mx-auto mb-4">
                                        <Inbox className="w-8 h-8 text-slate-500" />
                                    </div>
                                    <p className="text-lg font-medium text-slate-400">Brak ofert</p>
                                    <p className="text-sm text-slate-500 mt-1">Poczekaj na odpowiedzi od fachowców</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {proposals.map(proposal => (
                                        <ProposalCard
                                            key={proposal.id}
                                            proposal={proposal}
                                            isClient={true}
                                            onAccept={() => handleAccept(proposal)}
                                            onReject={() => handleReject(proposal)}
                                            onMessage={() => handleMessage(proposal)}
                                        />
                                    ))}
                                </div>
                            )}
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}

export default ProposalsListModal;
