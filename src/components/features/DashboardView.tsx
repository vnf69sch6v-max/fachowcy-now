"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Calendar, Clock, MapPin, User, Briefcase } from "lucide-react";

export function DashboardView() {
    const [role, setRole] = useState<"client" | "pro">("client");

    return (
        <div className="w-full h-full bg-slate-950 p-4 md:p-8 pt-24 overflow-y-auto">
            <div className="max-w-4xl mx-auto space-y-8">

                {/* Role Switcher (Demo Only) */}
                <div className="flex justify-center">
                    <div className="bg-slate-900/50 p-1 rounded-xl border border-white/10 flex gap-1">
                        <button
                            onClick={() => setRole("client")}
                            className={`px-6 py-2 rounded-lg text-sm font-medium transition-all ${role === 'client' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
                        >
                            Panel Klienta
                        </button>
                        <button
                            onClick={() => setRole("pro")}
                            className={`px-6 py-2 rounded-lg text-sm font-medium transition-all ${role === 'pro' ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
                        >
                            Panel Fachowca
                        </button>
                    </div>
                </div>

                {/* Content */}
                <motion.div
                    key={role}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-6"
                >
                    <h2 className="text-3xl font-bold text-white flex items-center gap-3">
                        {role === 'client' ? <User className="text-blue-500" /> : <Briefcase className="text-emerald-500" />}
                        {role === 'client' ? "Moje Zlecenia" : "Dostępne Zlecenia"}
                    </h2>

                    {/* List */}
                    <div className="grid gap-4">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="bg-white/5 border border-white/10 rounded-2xl p-6 hover:bg-white/10 transition-colors group cursor-pointer">
                                <div className="flex items-start justify-between mb-4">
                                    <div className="flex items-center gap-4">
                                        <div className={`w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold
                                    ${role === 'client' ? 'bg-blue-500/20 text-blue-400' : 'bg-emerald-500/20 text-emerald-400'}`}
                                        >
                                            {role === 'client' ? "M" : "K"}
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-semibold text-white">
                                                {role === 'client' ? "Naprawa hydrauliczna" : "Awaria instalacji"}
                                            </h3>
                                            <p className="text-slate-400 text-sm">
                                                {role === 'client' ? "Marek Nowak" : "Klient: Anna K."}
                                            </p>
                                        </div>
                                    </div>
                                    <div className={`px-3 py-1 rounded-full text-xs font-bold border
                                ${i === 1 ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' :
                                            i === 2 ? 'bg-green-500/10 border-green-500/20 text-green-400' :
                                                'bg-slate-700 border-slate-600 text-slate-300'}`}
                                    >
                                        {i === 1 ? "W trakcie" : i === 2 ? "Zakończone" : "Oczekuje"}
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-slate-400">
                                    <div className="flex items-center gap-2">
                                        <Calendar className="w-4 h-4" /> 25 Gru 2025
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Clock className="w-4 h-4" /> 14:30
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <MapPin className="w-4 h-4" /> Poznań, Centrum
                                    </div>
                                    <div className="flex items-center gap-2 text-white font-medium">
                                        {role === 'client' ? "- 150.00 PLN" : "+ 150.00 PLN"}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                </motion.div>
            </div>
        </div>
    );
}
