"use client";

import { AdvancedMarker } from "@vis.gl/react-google-maps";
import { cn } from "@/lib/utils";
import { forwardRef } from "react";

interface PriceMarkerProps {
    position: google.maps.LatLngLiteral;
    price: number;
    isSelected?: boolean;
    onClick?: () => void;
}

export const PriceMarker = forwardRef<google.maps.marker.AdvancedMarkerElement, PriceMarkerProps>(
    ({ position, price, isSelected, onClick }, ref) => {
        return (
            <AdvancedMarker position={position} onClick={onClick} ref={ref}>
                <div
                    className={cn(
                        "px-3 py-1.5 rounded-full shadow-lg border transition-all duration-300 transform cursor-pointer",
                        isSelected
                            ? "bg-slate-900 border-white text-white scale-110 z-20"
                            : "bg-white border-slate-200 text-slate-900 hover:scale-110 hover:bg-slate-50 z-10"
                    )}
                >
                    <div className="text-xs font-bold leading-none flex items-center gap-1">
                        {price} zł
                    </div>

                    {/* Triangle pointer */}
                    <div className={cn(
                        "absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 rotate-45 border-b border-r",
                        isSelected
                            ? "bg-slate-900 border-white"
                            : "bg-white border-slate-200"
                    )} />
                </div>
            </AdvancedMarker>
        );
    });

PriceMarker.displayName = "PriceMarker";
