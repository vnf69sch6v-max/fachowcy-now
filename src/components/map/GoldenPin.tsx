"use client";

/**
 * GoldenPin - Premium Marker Component
 * 
 * Visual differentiation for sponsored/promoted listings.
 * Features: Golden ring, pulsing animation, higher z-index.
 */

import { AdvancedMarker } from "@vis.gl/react-google-maps";
import { forwardRef } from "react";
import { motion } from "framer-motion";

interface GoldenPinProps {
    position: { lat: number; lng: number };
    price: number;
    isPromoted?: boolean;
    onClick?: () => void;
}

export const GoldenPin = forwardRef<google.maps.marker.AdvancedMarkerElement, GoldenPinProps>(
    ({ position, price, isPromoted = false, onClick }, ref) => {
        return (
            <AdvancedMarker
                position={position}
                onClick={onClick}
                ref={ref}
                zIndex={isPromoted ? 100 : 10}
            >
                <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="relative"
                >
                    {/* Pulse effect for promoted */}
                    {isPromoted && (
                        <motion.div
                            className="absolute -inset-2 rounded-full bg-yellow-400/30"
                            animate={{
                                scale: [1, 1.5, 1],
                                opacity: [0.6, 0, 0.6]
                            }}
                            transition={{
                                duration: 2,
                                repeat: Infinity,
                                ease: "easeInOut"
                            }}
                        />
                    )}

                    {/* Main pill */}
                    <div
                        className={`
                            relative px-3 py-1.5 rounded-full shadow-lg cursor-pointer
                            flex items-center gap-1.5 transition-all duration-200
                            hover:scale-110 hover:shadow-xl
                            ${isPromoted
                                ? 'bg-gradient-to-r from-yellow-400 to-amber-500 text-slate-900 ring-2 ring-yellow-300 ring-offset-2 ring-offset-transparent'
                                : 'bg-white text-slate-900 border border-slate-200'
                            }
                        `}
                    >
                        {/* Premium badge */}
                        {isPromoted && (
                            <span className="text-xs">⭐</span>
                        )}

                        {/* Price */}
                        <span className={`text-xs font-bold ${isPromoted ? 'text-slate-900' : 'text-slate-700'}`}>
                            {price} zł
                        </span>
                    </div>

                    {/* Pointer */}
                    <div
                        className={`
                            absolute -bottom-1.5 left-1/2 -translate-x-1/2 
                            w-2.5 h-2.5 rotate-45 
                            ${isPromoted
                                ? 'bg-amber-500'
                                : 'bg-white border-b border-r border-slate-200'
                            }
                        `}
                    />
                </motion.div>
            </AdvancedMarker>
        );
    }
);

GoldenPin.displayName = "GoldenPin";

// ===========================================
// CLUSTER RENDERER FOR PROMOTED
// ===========================================

/**
 * Custom cluster renderer that shows gold if any promoted listing inside
 */
export function createGoldenClusterRenderer() {
    return {
        render: ({ count, position, markers }: {
            count: number;
            position: google.maps.LatLng;
            markers: google.maps.marker.AdvancedMarkerElement[];
        }) => {
            // Check if any marker is promoted (has golden styling)
            const hasPromoted = markers?.some(m => {
                const content = m.content as HTMLElement;
                return content?.classList?.contains('promoted') ||
                    content?.innerHTML?.includes('⭐');
            }) || false;

            const div = document.createElement('div');
            div.className = `
                flex items-center justify-center rounded-full 
                font-bold text-sm shadow-lg cursor-pointer
                transition-transform hover:scale-110
                ${hasPromoted
                    ? 'bg-gradient-to-r from-yellow-400 to-amber-500 text-slate-900 ring-2 ring-yellow-300'
                    : 'bg-indigo-500 text-white'
                }
            `;
            div.style.width = count > 99 ? '50px' : '40px';
            div.style.height = count > 99 ? '50px' : '40px';
            div.innerHTML = `
                ${hasPromoted ? '⭐ ' : ''}${count}
            `;

            return new google.maps.marker.AdvancedMarkerElement({
                position,
                content: div
            });
        }
    };
}
