"use client";

/**
 * UserLocationMarker - Shows client's current location on map
 * 
 * Design: Pulsating blue dot (like Uber/Google Maps)
 */

import { AdvancedMarker } from "@vis.gl/react-google-maps";
import { motion } from "framer-motion";

interface UserLocationMarkerProps {
    position: { lat: number; lng: number };
}

export function UserLocationMarker({ position }: UserLocationMarkerProps) {
    return (
        <AdvancedMarker position={position}>
            <div className="relative">
                {/* Pulsating ring */}
                <motion.div
                    className="absolute inset-0 w-8 h-8 rounded-full bg-blue-500/30"
                    initial={{ scale: 1, opacity: 0.5 }}
                    animate={{
                        scale: [1, 1.5, 1],
                        opacity: [0.5, 0, 0.5]
                    }}
                    transition={{
                        duration: 2,
                        repeat: Infinity,
                        ease: "easeInOut"
                    }}
                    style={{ transform: 'translate(-50%, -50%)' }}
                />

                {/* Outer ring */}
                <div
                    className="absolute w-8 h-8 rounded-full bg-blue-500/20 border-2 border-blue-500/50"
                    style={{ transform: 'translate(-50%, -50%)' }}
                />

                {/* Core dot */}
                <div
                    className="absolute w-4 h-4 rounded-full bg-blue-500 border-2 border-white shadow-lg"
                    style={{ transform: 'translate(-50%, -50%)' }}
                >
                    {/* Inner highlight */}
                    <div className="absolute top-0.5 left-0.5 w-1.5 h-1.5 rounded-full bg-blue-300" />
                </div>
            </div>
        </AdvancedMarker>
    );
}
