import { useState, useEffect } from 'react';
import {
    collection,
    query,
    where,
    orderBy,
    startAt,
    endAt,
    getDocs,
    QueryDocumentSnapshot
} from 'firebase/firestore';
import * as geofire from 'geofire-common';
import { db } from '@/lib/firebase';
import { MapMarker } from '@/types/firestore-v2';

export interface NearbyProvider extends MapMarker {
    distance: number; // km
}

interface UseNearbyProvidersOptions {
    center: { lat: number; lng: number } | null;
    radiusKm: number;
    category?: string; // Optional filter
}

export function useNearbyProviders({ center, radiusKm, category }: UseNearbyProvidersOptions) {
    const [providers, setProviders] = useState<NearbyProvider[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const firestore = db;
        if (!center || !firestore) return;

        let isMounted = true;
        setLoading(true);

        const fetchProviders = async () => {
            try {
                const centerLat = center.lat;
                const centerLng = center.lng;

                // 1. Calculate geohash bounds
                const bounds = geofire.geohashQueryBounds([centerLat, centerLng], radiusKm * 1000);
                const promises = [];

                for (const b of bounds) {
                    let q = query(
                        collection(firestore, 'map_markers'),
                        orderBy('geoHash'),
                        startAt(b[0]),
                        endAt(b[1])
                    );

                    if (category && category !== 'Wszyscy') {
                        // Creating composite index might be needed: geoHash + serviceType
                        // For now we filter client-side to avoid complex index requirements immediately
                        // q = query(q, where('serviceType', '==', category));
                    }

                    promises.push(getDocs(q));
                }

                const snapshots = await Promise.all(promises);
                const results: NearbyProvider[] = [];

                for (const snap of snapshots) {
                    for (const doc of snap.docs) {
                        const data = doc.data() as MapMarker;

                        // Client-side filtering
                        if (category && category !== 'Wszyscy' && data.serviceType !== category) {
                            continue;
                        }

                        // Calculate distance
                        const distanceInKm = geofire.distanceBetween(
                            [data.lat, data.lng],
                            [centerLat, centerLng]
                        );

                        if (distanceInKm <= radiusKm) {
                            results.push({
                                ...data,
                                distance: distanceInKm
                            });
                        }
                    }
                }

                // Sort by distance
                results.sort((a, b) => a.distance - b.distance);

                if (isMounted) {
                    setProviders(results);
                    setLoading(false);
                }
            } catch (err) {
                console.error("Error fetching providers:", err);
                if (isMounted) {
                    setError("Failed to fetch providers");
                    setLoading(false);
                }
            }
        };

        fetchProviders();

        return () => {
            isMounted = false;
        };
    }, [center?.lat, center?.lng, radiusKm, category]);

    return { providers, loading, error };
}
