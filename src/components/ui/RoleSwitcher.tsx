"use client";

import { useAuth, UserRole } from "@/context/AuthContext";
import { User, Wrench } from "lucide-react";

export function RoleSwitcher() {
    const { userRole, toggleRole } = useAuth();

    return (
        <div className="flex items-center gap-2 bg-slate-800/50 backdrop-blur-md rounded-full p-1 border border-white/10">
            {/* Client Button */}
            <button
                onClick={() => userRole !== 'client' && toggleRole()}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-300
                    ${userRole === 'client'
                        ? 'bg-blue-500/30 text-blue-100 shadow-[0_0_10px_rgba(59,130,246,0.3)]'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
            >
                <User className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Klient</span>
            </button>

            {/* Professional Button */}
            <button
                onClick={() => userRole !== 'professional' && toggleRole()}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-300
                    ${userRole === 'professional'
                        ? 'bg-emerald-500/30 text-emerald-100 shadow-[0_0_10px_rgba(16,185,129,0.3)]'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
            >
                <Wrench className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Fachowiec</span>
            </button>
        </div>
    );
}
