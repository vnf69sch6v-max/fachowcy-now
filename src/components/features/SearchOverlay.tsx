"use client";

import { Search, SlidersHorizontal } from "lucide-react";

const CATEGORIES = ["Wszyscy", "Hydraulik", "Elektryk", "Sprzątanie", "Złota Rączka"] as const;
export type CategoryType = typeof CATEGORIES[number];

interface SearchOverlayProps {
    activeCategory: CategoryType;
    onCategoryChange: (category: CategoryType) => void;
}

export function SearchOverlay({ activeCategory, onCategoryChange }: SearchOverlayProps) {
    return (
        <div className="absolute top-0 left-0 right-0 z-10 p-4 flex flex-col items-center gap-3 bg-gradient-to-b from-slate-900/80 to-transparent pb-12 pointer-events-none">
            {/* Search Input */}
            <div className="flex items-center gap-2 w-full max-w-md bg-white/10 backdrop-blur-md border border-white/20 rounded-full px-4 py-3 shadow-lg pointer-events-auto transition-all focus-within:bg-white/15 focus-within:border-white/30 hover:bg-white/15">
                <Search className="w-5 h-5 text-slate-300" />
                <input
                    type="text"
                    placeholder="Czego szukasz? (np. Hydraulik Poznań)"
                    className="bg-transparent border-none outline-none text-white placeholder:text-slate-400 w-full text-base font-medium"
                />
                <button className="p-2 -mr-2 text-white/50 hover:text-white transition-colors">
                    <SlidersHorizontal className="w-5 h-5" />
                </button>
            </div>

            {/* Category Pills */}
            <div className="flex gap-2 pointer-events-auto overflow-x-auto max-w-full pb-2 mask-linear">
                {CATEGORIES.map((cat) => (
                    <button
                        key={cat}
                        onClick={() => onCategoryChange(cat)}
                        className={`px-4 py-1.5 rounded-full text-xs font-semibold backdrop-blur-md transition-all duration-300 border
                    ${activeCategory === cat
                                ? 'bg-blue-500/20 border-blue-400/50 text-blue-100 shadow-[0_0_15px_rgba(59,130,246,0.5)]'
                                : 'bg-slate-800/40 border-white/5 text-slate-400 hover:bg-white/10 hover:text-slate-200 hover:border-white/20'
                            }`}
                    >
                        {cat}
                    </button>
                ))}
            </div>
        </div>
    );
}

