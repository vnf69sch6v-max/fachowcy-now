"use client";

import { motion } from "framer-motion";
import { Map, Bot, ClipboardList, User, MessageSquare } from "lucide-react";

export type TabType = "map" | "assistant" | "messages" | "orders" | "profile";

interface BottomTabBarProps {
    activeTab: TabType;
    onTabChange: (tab: TabType) => void;
    userRole?: "client" | "professional" | null;
}

const TABS = [
    { id: "map" as TabType, label: "Odkrywaj", icon: Map },
    { id: "assistant" as TabType, label: "Asystent", icon: Bot },
    { id: "messages" as TabType, label: "Czaty", icon: MessageSquare },
    { id: "orders" as TabType, label: "Zlecenia", icon: ClipboardList },
    { id: "profile" as TabType, label: "Profil", icon: User },
];

export function BottomTabBar({ activeTab, onTabChange, userRole }: BottomTabBarProps) {
    return (
        <div className="fixed bottom-0 left-0 right-0 z-50 pb-safe">
            {/* Gradient fade at top */}
            <div className="absolute inset-x-0 -top-6 h-6 bg-gradient-to-t from-slate-950 to-transparent pointer-events-none" />

            <nav className="bg-slate-900/95 backdrop-blur-xl border-t border-white/10 px-2 py-2 safe-bottom">
                <div className="flex items-center justify-around max-w-lg mx-auto">
                    {TABS.map((tab) => {
                        const isActive = activeTab === tab.id;
                        const Icon = tab.icon;

                        return (
                            <button
                                key={tab.id}
                                onClick={() => onTabChange(tab.id)}
                                className="relative flex flex-col items-center gap-1 py-2 px-4 rounded-xl transition-all"
                            >
                                {/* Active indicator */}
                                {isActive && (
                                    <motion.div
                                        layoutId="activeTab"
                                        className="absolute inset-0 bg-blue-500/10 rounded-xl border border-blue-500/30"
                                        transition={{ type: "spring", stiffness: 400, damping: 30 }}
                                    />
                                )}

                                <Icon
                                    className={`w-6 h-6 relative z-10 transition-colors ${isActive
                                        ? "text-blue-400"
                                        : "text-slate-500"
                                        }`}
                                />
                                <span
                                    className={`text-[10px] font-bold uppercase tracking-wider relative z-10 transition-colors ${isActive
                                        ? "text-blue-400"
                                        : "text-slate-500"
                                        }`}
                                >
                                    {tab.label}
                                </span>

                                {/* Notification badge for orders (example) */}
                                {tab.id === "orders" && (
                                    <span className="absolute top-1 right-2 w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                                )}
                            </button>
                        );
                    })}
                </div>
            </nav>
        </div>
    );
}
