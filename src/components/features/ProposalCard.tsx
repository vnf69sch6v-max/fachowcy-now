"use client";

/**
 * ProposalCard - Card for displaying job proposals
 * 
 * Used by:
 * - Professionals: View their submitted proposals
 * - Clients: View received proposals for their jobs
 */

import { useState } from "react";
import { motion } from "framer-motion";
import { Star, Clock, MessageCircle, CheckCircle, X, User } from "lucide-react";
import { JobProposal } from "@/types/firestore-v2";
import { Timestamp } from "firebase/firestore";

interface ProposalCardProps {
    proposal: JobProposal;
    isClient?: boolean; // Client view shows accept/reject buttons
    onAccept?: () => void;
    onReject?: () => void;
    onMessage?: () => void;
}

export function ProposalCard({ proposal, isClient, onAccept, onReject, onMessage }: ProposalCardProps) {
    const [isExpanded, setIsExpanded] = useState(false);

    // Format date
    const formatDate = (timestamp: Timestamp | undefined) => {
        if (!timestamp) return "Do ustalenia";
        try {
            const date = timestamp.toDate();
            return date.toLocaleDateString('pl-PL', { weekday: 'short', day: 'numeric', month: 'short' });
        } catch {
            return "Do ustalenia";
        }
    };

    const statusColors = {
        pending: "bg-amber-500/20 text-amber-400 border-amber-500/30",
        accepted: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
        rejected: "bg-red-500/20 text-red-400 border-red-500/30",
        withdrawn: "bg-slate-500/20 text-slate-400 border-slate-500/30"
    };

    const statusLabels = {
        pending: "Oczekuje",
        accepted: "Zaakceptowana",
        rejected: "Odrzucona",
        withdrawn: "Wycofana"
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-slate-800/50 border border-white/5 rounded-2xl overflow-hidden hover:border-violet-500/30 transition-all"
        >
            {/* Header */}
            <div className="p-4">
                <div className="flex items-start gap-3">
                    {/* Avatar */}
                    <div className="relative flex-shrink-0">
                        {proposal.proAvatarUrl ? (
                            <img
                                src={proposal.proAvatarUrl}
                                alt={proposal.proName}
                                className="w-12 h-12 rounded-xl object-cover border border-white/10"
                            />
                        ) : (
                            <div className="w-12 h-12 rounded-xl bg-slate-700 flex items-center justify-center">
                                <User className="w-6 h-6 text-slate-400" />
                            </div>
                        )}
                        {proposal.proRating >= 4.5 && (
                            <div className="absolute -bottom-1 -right-1 bg-amber-500 rounded-full p-0.5 border border-slate-900">
                                <Star className="w-2.5 h-2.5 text-white fill-white" />
                            </div>
                        )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                            <h4 className="font-bold text-white truncate">{proposal.proName}</h4>
                            <span className={`text-[10px] px-2 py-0.5 rounded-full border ${statusColors[proposal.status]}`}>
                                {statusLabels[proposal.status]}
                            </span>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                            <div className="flex items-center gap-1">
                                <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                                <span className="text-xs text-slate-400">{proposal.proRating.toFixed(1)}</span>
                            </div>
                            <span className="text-slate-600">•</span>
                            <div className="flex items-center gap-1 text-slate-400">
                                <Clock className="w-3 h-3" />
                                <span className="text-xs">{formatDate(proposal.availability)}</span>
                            </div>
                        </div>
                    </div>

                    {/* Price */}
                    <div className="text-right flex-shrink-0">
                        <p className="text-xl font-bold text-emerald-400">{proposal.price} zł</p>
                    </div>
                </div>

                {/* Message */}
                {proposal.message && (
                    <div
                        className={`mt-3 p-3 bg-black/20 rounded-xl text-sm text-slate-300 cursor-pointer ${isExpanded ? '' : 'line-clamp-2'}`}
                        onClick={() => setIsExpanded(!isExpanded)}
                    >
                        {proposal.message}
                    </div>
                )}
            </div>

            {/* Actions (Client View Only) */}
            {isClient && proposal.status === 'pending' && (
                <div className="px-4 pb-4 pt-1 flex gap-2">
                    <button
                        onClick={onMessage}
                        className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-slate-700/50 hover:bg-slate-700 rounded-xl text-sm font-medium text-white transition-colors"
                    >
                        <MessageCircle className="w-4 h-4" />
                        Napisz
                    </button>
                    <button
                        onClick={onReject}
                        className="flex items-center justify-center gap-2 py-2.5 px-4 bg-red-500/10 hover:bg-red-500/20 rounded-xl text-sm font-medium text-red-400 transition-colors"
                    >
                        <X className="w-4 h-4" />
                    </button>
                    <button
                        onClick={onAccept}
                        className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-emerald-600 hover:bg-emerald-500 rounded-xl text-sm font-bold text-white transition-colors shadow-lg shadow-emerald-900/20"
                    >
                        <CheckCircle className="w-4 h-4" />
                        Akceptuj
                    </button>
                </div>
            )}
        </motion.div>
    );
}

export default ProposalCard;
