"use client";

/**
 * useLiveSearch Hook
 * 
 * Real-time search with geohash queries and sponsor-first ranking.
 * Core of the Discovery Engine.
 */

import { useState, useEffect, useCallback } from "react";
import {
    collection,
    query,
    where,
    orderBy,
    startAt,
    endAt,
    onSnapshot,
    Unsubscribe
} from "firebase/firestore";
import { geohashQueryBounds, distanceBetween } from "geofire-common";
import { db } from "@/lib/firebase";
import {
    ServiceListing,
    ServiceCategory,
    serviceListingConverter,
    sortListingsSponsorFirst
} from "@/types/listings";

// ===========================================
// TYPES
// ===========================================

export interface SearchOptions {
    center: { lat: number; lng: number };
    radiusKm: number;
    category?: ServiceCategory;
    minRating?: number;
    maxPrice?: number;
}

export interface SearchResults {
    listings: ServiceListing[];
    promotedCount: number;
    totalCount: number;
    isLoading: boolean;
    error: string | null;
}

// ===========================================
// HOOK
// ===========================================

export function useLiveSearch(options: SearchOptions | null): SearchResults {
    const [listings, setListings] = useState<ServiceListing[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!options || !db) {
            setListings([]);
            setIsLoading(false);
            return;
        }

        setIsLoading(true);
        setError(null);

        const center = [options.center.lat, options.center.lng] as [number, number];
        const radiusM = options.radiusKm * 1000;

        // Get geohash query bounds
        const bounds = geohashQueryBounds(center, radiusM);
        const unsubscribes: Unsubscribe[] = [];

        // Accumulator for results from all bound queries
        const allResults = new Map<string, ServiceListing>();

        const processResults = () => {
            // Convert to array and filter by actual distance
            let results = Array.from(allResults.values()).filter(listing => {
                const distance = distanceBetween(
                    [listing.location.lat, listing.location.lng],
                    center
                );
                return distance * 1000 <= radiusM;
            });

            // Apply additional filters
            if (options.category) {
                results = results.filter(l => l.category === options.category);
            }
            if (options.minRating) {
                results = results.filter(l => l.stats.rating >= options.minRating!);
            }
            if (options.maxPrice) {
                results = results.filter(l => l.basePrice <= options.maxPrice!);
            }

            // Filter only active listings
            results = results.filter(l => l.isActive);

            // Sort with Sponsor-First algorithm
            const sorted = sortListingsSponsorFirst(results, options.center);

            setListings(sorted);
            setIsLoading(false);
        };

        // Create a listener for each geohash bound
        for (const b of bounds) {
            const q = query(
                collection(db, "listings").withConverter(serviceListingConverter),
                orderBy("location.geohash"),
                startAt(b[0]),
                endAt(b[1])
            );

            const unsubscribe = onSnapshot(
                q,
                (snapshot) => {
                    // Update accumulator
                    snapshot.docChanges().forEach(change => {
                        if (change.type === 'removed') {
                            allResults.delete(change.doc.id);
                        } else {
                            allResults.set(change.doc.id, change.doc.data());
                        }
                    });
                    processResults();
                },
                (err) => {
                    console.error("Search error:", err);
                    setError("Błąd wyszukiwania");
                    setIsLoading(false);
                }
            );

            unsubscribes.push(unsubscribe);
        }

        return () => {
            unsubscribes.forEach(unsub => unsub());
        };
    }, [
        options?.center.lat,
        options?.center.lng,
        options?.radiusKm,
        options?.category,
        options?.minRating,
        options?.maxPrice
    ]);

    const promotedCount = listings.filter(l => l.isPromoted).length;

    return {
        listings,
        promotedCount,
        totalCount: listings.length,
        isLoading,
        error
    };
}

// ===========================================
// FALLBACK HOOK (For providers collection)
// ===========================================

/**
 * useLiveProviders - listens to existing providers/provider_status
 * for backwards compatibility with current map implementation
 */
export function useLiveProviders(options: SearchOptions | null) {
    const [providers, setProviders] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!options || !db) {
            setProviders([]);
            setIsLoading(false);
            return;
        }

        // Listen to providers collection
        const q = query(collection(db, "providers"));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const center = [options.center.lat, options.center.lng] as [number, number];
            const radiusM = options.radiusKm * 1000;

            const results: any[] = [];

            snapshot.forEach(doc => {
                const data = doc.data();

                // Extract location
                let lat = 52.4064, lng = 16.9252; // Default Poznań
                if (data.location?.latitude !== undefined) {
                    lat = data.location.latitude;
                    lng = data.location.longitude;
                } else if (data.location?.lat !== undefined) {
                    lat = data.location.lat;
                    lng = data.location.lng;
                }

                // Check distance
                const distance = distanceBetween([lat, lng], center);
                if (distance * 1000 <= radiusM) {
                    results.push({
                        id: doc.id,
                        ...data,
                        location: { lat, lng },
                        // Add isPromoted flag if missing
                        isPromoted: data.isPromoted || false
                    });
                }
            });

            // Sort with sponsor-first logic
            const sorted = results.sort((a, b) => {
                if (a.isPromoted && !b.isPromoted) return -1;
                if (!a.isPromoted && b.isPromoted) return 1;
                return (b.rating || 0) - (a.rating || 0);
            });

            // Apply category filter if specified
            const filtered = options.category
                ? sorted.filter(p => {
                    const providerCategory = (p.serviceType || p.category || '').toLowerCase();
                    return providerCategory === options.category;
                })
                : sorted;

            setProviders(filtered);
            setIsLoading(false);
        });

        return () => unsubscribe();
    }, [options?.center.lat, options?.center.lng, options?.radiusKm, options?.category]);

    return { providers, isLoading };
}
