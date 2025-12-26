"use client";

import { SlidersHorizontal } from "lucide-react";
import { PlacesAutocomplete } from "./PlacesAutocomplete";

const CATEGORIES = ["Wszyscy", "Hydraulik", "Elektryk", "Sprzątanie", "Złota Rączka"] as const;
export type CategoryType = typeof CATEGORIES[number];

export interface PlaceLocation {
    lat: number;
    lng: number;
    name: string;
}

interface SearchOverlayProps {
    activeCategory: CategoryType;
    onCategoryChange: (category: CategoryType) => void;
    onPlaceSelect?: (location: PlaceLocation) => void;
    isOnline?: boolean; // Only show autocomplete in online mode
}

export function SearchOverlay({ activeCategory, onCategoryChange, onPlaceSelect, isOnline = false }: SearchOverlayProps) {
    return (
        <div className="absolute top-0 left-0 right-0 z-10 p-4 flex flex-col items-center gap-3 bg-gradient-to-b from-slate-900/80 to-transparent pb-12 pointer-events-none">
            {/* Search Input - Autocomplete only works online */}
            {isOnline && onPlaceSelect ? (
                <PlacesAutocomplete
                    onPlaceSelect={onPlaceSelect}
                    placeholder="Czego szukasz? (np. Hydraulik Poznań)"
                />
            ) : (
                <div className="flex items-center gap-2 w-full max-w-md bg-white/10 backdrop-blur-md border border-white/20 rounded-full px-4 py-3 shadow-lg pointer-events-auto opacity-50 cursor-not-allowed">
                    <span className="text-slate-400 text-sm">Wyszukiwanie dostępne w trybie online</span>
                </div>
            )}

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


