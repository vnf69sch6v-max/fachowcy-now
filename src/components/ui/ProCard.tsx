"use client";

import { motion } from "framer-motion";
import { ShieldCheck, MessageCircle, Clock, Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface ProCardProps {
    name: string;
    profession: string;
    price: number;
    rating: number;
    timeAway: string;
    imageUrl: string;
    verified?: boolean;
    onChat?: () => void;
    onBook?: () => void;
    className?: string;
}

export function ProCard({
    name, profession, price, rating, timeAway, imageUrl, verified = true, onChat, onBook, className
}: ProCardProps) {

    return (
        <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.3 }}
            className={cn(
                "bg-white/10 backdrop-blur-xl border border-white/20 shadow-2xl rounded-3xl p-5 w-full max-w-[340px]",
                "flex flex-col gap-4 text-white relative overflow-hidden",
                className
            )}
        >
            {/* Glass Reflection effect */}
            <div className="absolute top-0 left-0 w-full h-1/2 bg-gradient-to-b from-white/5 to-transparent pointer-events-none" />

            <div className="flex items-start justify-between z-10">
                <div className="flex items-center gap-3">
                    <div className="relative w-12 h-12">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            src={imageUrl}
                            alt={name}
                            className="w-full h-full rounded-full object-cover border-2 border-white/30"
                        />
                        {verified && (
                            <div className="absolute -bottom-1 -right-1 bg-blue-500 rounded-full p-0.5 border border-slate-900 z-10">
                                <ShieldCheck className="w-3 h-3 text-white" />
                            </div>
                        )}
                    </div>
                    <div>
                        <h3 className="font-bold text-lg leading-tight">{name}</h3>
                        <p className="text-slate-300 text-sm">{profession}</p>
                    </div>
                </div>
                <div className="flex flex-col items-end">
                    <div className="font-bold text-emerald-400 text-xl">{price} zł</div>
                    <div className="text-xs text-slate-400">za usługę</div>
                </div>
            </div>

            <div className="flex items-center justify-between text-sm py-2 border-t border-white/10 z-10">
                <div className="flex items-center gap-1.5 text-amber-400 font-medium">
                    <Star className="w-4 h-4 fill-amber-400" />
                    {rating}
                </div>
                <div className="flex items-center gap-1.5 text-blue-300 font-medium bg-blue-500/10 px-2 py-1 rounded-lg">
                    <Clock className="w-3.5 h-3.5" />
                    ~{timeAway} dojazd
                </div>
            </div>

            <div className="grid grid-cols-2 gap-3 z-10">
                <button
                    onClick={onChat}
                    className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-white/10 hover:bg-white/20 border border-white/10 transition-colors text-sm font-semibold"
                >
                    <MessageCircle className="w-4 h-4" />
                    Czat
                </button>
                <button
                    onClick={onBook}
                    className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white shadow-lg shadow-blue-500/20 transition-all active:scale-95 text-sm font-semibold"
                >
                    Rezerwuj
                </button>
            </div>

        </motion.div>
    );
}
