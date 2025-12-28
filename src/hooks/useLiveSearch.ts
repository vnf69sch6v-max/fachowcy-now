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
    getDocs,
    Unsubscribe,
    Firestore
} from "firebase/firestore";
import { geohashQueryBounds, distanceBetween } from "geofire-common";
import { db } from "@/lib/firebase";
import { useDebounce } from "./useDebounce";
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

/**
 * useLiveProviders - Fetches providers with debounced geohash queries
 * Performance optimized: uses getDocs instead of onSnapshot
 */
export function useLiveProviders(options: SearchOptions | null) {
    const [providers, setProviders] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Debounce the search options to prevent excessive queries
    const debouncedOptions = useDebounce(options, 500);

    useEffect(() => {
        if (!debouncedOptions || !db) {
            setProviders([]);
            setIsLoading(false);
            return;
        }

        let isMounted = true;
        setIsLoading(true);

        const fetchProviders = async () => {
            try {
                const center = [debouncedOptions.center.lat, debouncedOptions.center.lng] as [number, number];
                const radiusM = debouncedOptions.radiusKm * 1000;

                // Use geohash bounds for efficient querying
                const bounds = geohashQueryBounds(center, radiusM);
                const firestore = db as Firestore;
                const promises = bounds.map(b =>
                    getDocs(query(
                        collection(firestore, "providers"),
                        orderBy("geohash"),
                        startAt(b[0]),
                        endAt(b[1])
                    ))
                );

                const snapshots = await Promise.all(promises);
                const results: any[] = [];

                for (const snapshot of snapshots) {
                    snapshot.forEach(doc => {
                        const data = doc.data();

                        // Extract location
                        let lat = 52.4064, lng = 16.9252;
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
                            // Avoid duplicates
                            if (!results.find(r => r.id === doc.id)) {
                                results.push({
                                    id: doc.id,
                                    ...data,
                                    location: { lat, lng },
                                    isPromoted: data.isPromoted || false
                                });
                            }
                        }
                    });
                }

                // Sort with sponsor-first logic
                const sorted = results.sort((a, b) => {
                    if (a.isPromoted && !b.isPromoted) return -1;
                    if (!a.isPromoted && b.isPromoted) return 1;
                    return (b.rating || 0) - (a.rating || 0);
                });

                // Apply category filter if specified
                const filtered = debouncedOptions.category
                    ? sorted.filter(p => {
                        const providerCategory = (p.serviceType || p.category || '').toLowerCase();
                        return providerCategory === debouncedOptions.category;
                    })
                    : sorted;

                if (isMounted) {
                    setProviders(filtered);
                    setIsLoading(false);
                }
            } catch (error) {
                console.error("Provider fetch error:", error);
                if (isMounted) {
                    setProviders([]);
                    setIsLoading(false);
                }
            }
        };

        fetchProviders();

        return () => {
            isMounted = false;
        };
    }, [debouncedOptions]);

    return { providers, isLoading };
}
