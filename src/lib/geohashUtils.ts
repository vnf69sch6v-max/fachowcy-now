import { geohashQueryBounds, distanceBetween } from "geofire-common";
import { query, collection, orderBy, startAt, endAt, getDocs, QueryConstraint, where } from "firebase/firestore";
import { db } from "./firebase";
import { ProviderProfile } from "@/types/firestore";

export interface GeoSearchOptions {
    center: { lat: number; lng: number };
    radiusInM: number; // meters
}

export async function searchProvidersInRadius(options: GeoSearchOptions) {
    if (!db) throw new Error("DB not initialized");

    const center = [options.center.lat, options.center.lng] as [number, number];
    const radiusInM = options.radiusInM;

    // 1. Get geohash bounds
    const bounds = geohashQueryBounds(center, radiusInM);
    const promises = [];

    // 2. Create queries for each bound
    for (const b of bounds) {
        const q = query(
            collection(db, "providers"),
            orderBy("baseLocation.geohash"),
            startAt(b[0]),
            endAt(b[1])
        );
        promises.push(getDocs(q));
    }

    // 3. Execute queries
    const snapshots = await Promise.all(promises);

    // 4. Merge & Filter
    const hits: ProviderProfile[] = [];
    const seenIds = new Set<string>();

    for (const snap of snapshots) {
        for (const doc of snap.docs) {
            if (seenIds.has(doc.id)) continue;

            const data = doc.data() as ProviderProfile;
            const lat = data.baseLocation.lat;
            const lng = data.baseLocation.lng;

            // Accurate Distance Filter (False positives cleanup)
            const distanceInKm = distanceBetween([lat, lng], center);
            const distanceInM = distanceInKm * 1000;

            if (distanceInM <= radiusInM) {
                hits.push(data);
                seenIds.add(doc.id);
            }
        }
    }

    return hits;
}
