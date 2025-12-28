"use client";

import { AdvancedMarker } from "@vis.gl/react-google-maps";
import { cn } from "@/lib/utils";
import { forwardRef } from "react";
import { Award, Star } from "lucide-react";

// ... imports
interface PriceMarkerProps {
    position: google.maps.LatLngLiteral;
    price: number;
    isSelected?: boolean;
    onClick?: () => void;
    // Trust Signals (opcjonalne, dla kompatybilności wstecznej)
    isSuperFachowiec?: boolean;
    isPromoted?: boolean; // Sponsor golden pin
    rating?: number;
    reviewCount?: number;
    color?: 'default' | 'emerald' | 'blue'; // Changed from variant to color to match MapOverview usage
}

/**
 * PriceMarker z Trust Signals
 * 
 * Zgodny z audytem UX:
 * - Badge Super-Fachowiec (gwiazdka)
 * - Rating + liczba recenzji jako tooltip
 * - Color variant dla zleceń (emerald)
 */
export const PriceMarker = forwardRef<google.maps.marker.AdvancedMarkerElement, PriceMarkerProps>(
    ({ position, price, isSelected, onClick, isSuperFachowiec, isPromoted, rating, reviewCount, color = 'default' }, ref) => {
        // Przypisz cenę do markera dla agregatów klastrowych
        const handleRef = (el: google.maps.marker.AdvancedMarkerElement | null) => {
            if (el) {
                (el as any).price = price;
            }
            if (typeof ref === 'function') {
                ref(el);
            } else if (ref) {
                ref.current = el;
            }
        };

        const isOrder = color === 'emerald';

        return (
            <AdvancedMarker position={position} onClick={onClick} ref={handleRef}>
                <div
                    className={cn(
                        "relative px-3 py-1.5 rounded-full shadow-lg border transition-all duration-300 transform cursor-pointer group",
                        isPromoted
                            ? "bg-gradient-to-r from-yellow-400 to-amber-500 border-yellow-300 text-slate-900 ring-2 ring-yellow-300/50 scale-105 z-30"
                            : isOrder
                                ? isSelected
                                    ? "bg-emerald-600 border-emerald-400 text-white scale-110 z-20"
                                    : "bg-emerald-500/90 backdrop-blur-md border-emerald-400/50 text-white hover:bg-emerald-500 hover:scale-110 z-10"
                                : color === 'blue'
                                    ? isSelected
                                        ? "bg-blue-600 border-blue-400 text-white scale-110 z-20"
                                        : "bg-blue-500/90 backdrop-blur-md border-blue-400/50 text-white hover:bg-blue-500 hover:scale-110 z-10"
                                    : isSelected
                                        ? "bg-slate-900 border-white text-white scale-110 z-20"
                                        : "bg-white border-slate-200 text-slate-900 hover:scale-110 hover:bg-slate-50 z-10"
                    )}
                    title={rating ? `${rating.toFixed(1)} (${reviewCount || 0} opinii)` : undefined}
                >
                    {/* Super-Fachowiec Badge */}
                    {isSuperFachowiec && (
                        <div className={cn(
                            "absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full flex items-center justify-center shadow-md",
                            isSelected ? "bg-amber-400" : "bg-gradient-to-r from-amber-400 to-yellow-500"
                        )}>
                            <Award className="w-2.5 h-2.5 text-white" />
                        </div>
                    )}

                    {/* Price Display */}
                    <div className="text-xs font-bold leading-none flex items-center gap-1">
                        {isPromoted && <span>⭐</span>}
                        {price > 0 ? `${price} zł` : (isOrder ? 'Zlecenie' : 'Free')}
                        {/* Mini Rating Indicator */}
                        {rating !== undefined && rating >= 4.5 && (
                            <Star className={cn(
                                "w-2.5 h-2.5 fill-current",
                                isSelected ? "text-amber-400" : "text-amber-500"
                            )} />
                        )}
                    </div>

                    {/* Triangle pointer */}
                    <div className={cn(
                        "absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 rotate-45 border-b border-r",
                        isPromoted
                            ? "bg-amber-500 border-amber-600"
                            : isOrder
                                ? isSelected ? "bg-emerald-600 border-emerald-400" : "bg-emerald-500 border-emerald-400/50"
                                : color === 'blue'
                                    ? isSelected ? "bg-blue-600 border-blue-400" : "bg-blue-500 border-blue-400/50"
                                    : isSelected
                                        ? "bg-slate-900 border-white"
                                        : "bg-white border-slate-200"
                    )} />

                    {/* Hover Tooltip with Rating */}
                    {rating !== undefined && (
                        <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[10px] px-2 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-30">
                            <Star className="w-2.5 h-2.5 text-amber-400 fill-amber-400 inline mr-0.5" />
                            {rating.toFixed(1)} ({reviewCount || 0})
                        </div>
                    )}
                </div>
            </AdvancedMarker>
        );
    });

PriceMarker.displayName = "PriceMarker";
