"use client";

/**
 * useDirections Hook
 * 
 * Calculates driving directions between two points using Google Directions API.
 * Returns distance, duration, and route path for polyline drawing.
 */

import { useState, useEffect, useCallback } from "react";
import { useMapsLibrary } from "@vis.gl/react-google-maps";

// ===========================================
// TYPES
// ===========================================

export interface DirectionsResult {
    distance: {
        text: string;    // "5.2 km"
        value: number;   // meters
    };
    duration: {
        text: string;    // "12 min"
        value: number;   // seconds
    };
    path: google.maps.LatLng[];
    polyline: string;  // Encoded polyline for rendering
    isLoading: boolean;
    error: string | null;
}

export interface LatLng {
    lat: number;
    lng: number;
}

// ===========================================
// HOOK
// ===========================================

export function useDirections(
    origin: LatLng | null,
    destination: LatLng | null
): DirectionsResult {
    const [result, setResult] = useState<DirectionsResult>({
        distance: { text: "", value: 0 },
        duration: { text: "", value: 0 },
        path: [],
        polyline: "",
        isLoading: false,
        error: null
    });

    // Load Routes library
    const routes = useMapsLibrary("routes");

    useEffect(() => {
        if (!origin || !destination || !routes) {
            return;
        }

        const directionsService = new routes.DirectionsService();

        setResult(prev => ({ ...prev, isLoading: true, error: null }));

        directionsService.route(
            {
                origin: { lat: origin.lat, lng: origin.lng },
                destination: { lat: destination.lat, lng: destination.lng },
                travelMode: google.maps.TravelMode.DRIVING
            },
            (response, status) => {
                if (status === google.maps.DirectionsStatus.OK && response) {
                    const route = response.routes[0];
                    const leg = route.legs[0];

                    setResult({
                        distance: {
                            text: leg.distance?.text || "",
                            value: leg.distance?.value || 0
                        },
                        duration: {
                            text: leg.duration?.text || "",
                            value: leg.duration?.value || 0
                        },
                        path: route.overview_path || [],
                        polyline: route.overview_polyline || "",
                        isLoading: false,
                        error: null
                    });
                } else {
                    setResult(prev => ({
                        ...prev,
                        isLoading: false,
                        error: `Directions error: ${status}`
                    }));
                }
            }
        );
    }, [origin?.lat, origin?.lng, destination?.lat, destination?.lng, routes]);

    return result;
}

// ===========================================
// CLIENT LOCATION HOOK
// ===========================================

export interface ClientLocationResult {
    location: LatLng | null;
    isLoading: boolean;
    error: string | null;
    refresh: () => void;
}

export function useClientLocation(): ClientLocationResult {
    const [location, setLocation] = useState<LatLng | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const getLocation = useCallback(() => {
        if (!navigator.geolocation) {
            setError("Geolokalizacja niedostępna");
            setIsLoading(false);
            return;
        }

        setIsLoading(true);
        setError(null);

        navigator.geolocation.getCurrentPosition(
            (position) => {
                setLocation({
                    lat: position.coords.latitude,
                    lng: position.coords.longitude
                });
                setIsLoading(false);
            },
            (err) => {
                setError(err.message);
                setIsLoading(false);
                // Fallback to a default location (Warsaw center)
                setLocation({ lat: 52.2297, lng: 21.0122 });
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 60000 // Cache for 1 minute
            }
        );
    }, []);

    useEffect(() => {
        getLocation();
    }, [getLocation]);

    return { location, isLoading, error, refresh: getLocation };
}

// ===========================================
// DISTANCE CALCULATOR (Fallback without API)
// ===========================================

/**
 * Calculate straight-line distance (Haversine formula)
 * Used as fallback when Directions API is unavailable
 */
export function calculateStraightDistance(
    origin: LatLng,
    destination: LatLng
): { distanceKm: number; estimatedMinutes: number } {
    const R = 6371; // Earth's radius in km
    const dLat = (destination.lat - origin.lat) * Math.PI / 180;
    const dLng = (destination.lng - origin.lng) * Math.PI / 180;
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(origin.lat * Math.PI / 180) * Math.cos(destination.lat * Math.PI / 180) *
        Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distanceKm = R * c;

    // Estimate driving time: ~40 km/h average in city
    const estimatedMinutes = Math.round((distanceKm / 40) * 60);

    return { distanceKm, estimatedMinutes };
}

/**
 * Format distance for display
 */
export function formatDistance(km: number): string {
    if (km < 1) {
        return `${Math.round(km * 1000)} m`;
    }
    return `${km.toFixed(1)} km`;
}

/**
 * Format duration for display
 */
export function formatDuration(minutes: number): string {
    if (minutes < 60) {
        return `${minutes} min`;
    }
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours} godz. ${mins} min` : `${hours} godz.`;
}
