"use client";

/**
 * RoutePolyline - Animated route display like Uber
 * 
 * Draws a dashed line from client to professional
 * with gradient animation.
 */

import { useEffect, useRef } from "react";
import { useMap, useMapsLibrary } from "@vis.gl/react-google-maps";
import { useDirections, LatLng } from "@/hooks/useDirections";

interface RoutePolylineProps {
    origin: LatLng | null;
    destination: LatLng | null;
    isVisible?: boolean;
}

export function RoutePolyline({ origin, destination, isVisible = true }: RoutePolylineProps) {
    const map = useMap();
    const geometry = useMapsLibrary("geometry");
    const directions = useDirections(origin, destination);

    const polylineRef = useRef<google.maps.Polyline | null>(null);
    const animationRef = useRef<number | null>(null);

    useEffect(() => {
        if (!map || !isVisible || !directions.path.length) {
            // Clean up existing polyline
            if (polylineRef.current) {
                polylineRef.current.setMap(null);
                polylineRef.current = null;
            }
            return;
        }

        // Create the main route polyline
        const polyline = new google.maps.Polyline({
            path: directions.path,
            strokeColor: "#3B82F6", // Blue
            strokeOpacity: 0.8,
            strokeWeight: 4,
            geodesic: true,
            map: map,
            zIndex: 5
        });

        // Create dashed overlay for animation effect
        const dashedPolyline = new google.maps.Polyline({
            path: directions.path,
            strokeColor: "#60A5FA", // Lighter blue
            strokeOpacity: 1,
            strokeWeight: 2,
            geodesic: true,
            icons: [{
                icon: {
                    path: 'M 0,-1 0,1',
                    strokeOpacity: 1,
                    scale: 3
                },
                offset: '0',
                repeat: '15px'
            }],
            map: map,
            zIndex: 6
        });

        // Animate the dashes
        let offset = 0;
        const animate = () => {
            offset = (offset + 0.5) % 200;
            const icons = dashedPolyline.get('icons');
            if (icons && icons[0]) {
                icons[0].offset = offset + 'px';
                dashedPolyline.set('icons', icons);
            }
            animationRef.current = requestAnimationFrame(animate);
        };
        animate();

        polylineRef.current = polyline;

        // Cleanup
        return () => {
            polyline.setMap(null);
            dashedPolyline.setMap(null);
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current);
            }
        };
    }, [map, directions.path, isVisible]);

    // Also add origin and destination markers
    useEffect(() => {
        if (!map || !origin || !destination || !isVisible) return;

        // Client location marker (blue dot)
        const clientMarker = new google.maps.Marker({
            position: origin,
            map: map,
            icon: {
                path: google.maps.SymbolPath.CIRCLE,
                scale: 8,
                fillColor: "#3B82F6",
                fillOpacity: 1,
                strokeColor: "#FFFFFF",
                strokeWeight: 3
            },
            title: "Twoja lokalizacja",
            zIndex: 10
        });

        // Professional location marker (destination - handled by PriceMarker)
        // Not adding here to avoid duplication

        return () => {
            clientMarker.setMap(null);
        };
    }, [map, origin, destination, isVisible]);

    return null; // This component renders directly to the map
}
