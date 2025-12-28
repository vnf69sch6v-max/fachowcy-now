/**
 * Geospatial Utilities
 * 
 * Biblioteka do geohashingu i zapytań geograficznych
 * dla wyszukiwania fachowców w określonym promieniu.
 * 
 * Algorytm:
 * 1. Oblicz geohash dla centrum mapy
 * 2. Wyznacz sąsiednie komórki siatki pokrywające promień
 * 3. Wykonaj zapytanie zakresowe w Firestore
 * 4. Filtruj client-side za pomocą formuły Haversine'a
 */

// ===========================================
// GEOHASH IMPLEMENTATION
// ===========================================

const BASE32 = '0123456789bcdefghjkmnpqrstuvwxyz';

/**
 * Koduje współrzędne do geohash
 * @param lat Szerokość geograficzna
 * @param lng Długość geograficzna
 * @param precision Precyzja (1-12, domyślnie 6 ≈ ±0.61km)
 */
export function encodeGeohash(lat: number, lng: number, precision: number = 6): string {
    let idx = 0;
    let bit = 0;
    let evenBit = true;
    let geohash = '';

    let latMin = -90, latMax = 90;
    let lngMin = -180, lngMax = 180;

    while (geohash.length < precision) {
        if (evenBit) {
            // Bisect longitude
            const lngMid = (lngMin + lngMax) / 2;
            if (lng >= lngMid) {
                idx = idx * 2 + 1;
                lngMin = lngMid;
            } else {
                idx = idx * 2;
                lngMax = lngMid;
            }
        } else {
            // Bisect latitude
            const latMid = (latMin + latMax) / 2;
            if (lat >= latMid) {
                idx = idx * 2 + 1;
                latMin = latMid;
            } else {
                idx = idx * 2;
                latMax = latMid;
            }
        }
        evenBit = !evenBit;

        if (++bit === 5) {
            geohash += BASE32[idx];
            bit = 0;
            idx = 0;
        }
    }

    return geohash;
}

/**
 * Dekoduje geohash do współrzędnych (środek komórki)
 */
export function decodeGeohash(geohash: string): { lat: number; lng: number; error: { lat: number; lng: number } } {
    let evenBit = true;
    let latMin = -90, latMax = 90;
    let lngMin = -180, lngMax = 180;

    for (let i = 0; i < geohash.length; i++) {
        const chr = geohash[i];
        const idx = BASE32.indexOf(chr);
        if (idx === -1) throw new Error('Invalid geohash character');

        for (let n = 4; n >= 0; n--) {
            const bitN = (idx >> n) & 1;
            if (evenBit) {
                const lngMid = (lngMin + lngMax) / 2;
                if (bitN === 1) {
                    lngMin = lngMid;
                } else {
                    lngMax = lngMid;
                }
            } else {
                const latMid = (latMin + latMax) / 2;
                if (bitN === 1) {
                    latMin = latMid;
                } else {
                    latMax = latMid;
                }
            }
            evenBit = !evenBit;
        }
    }

    return {
        lat: (latMin + latMax) / 2,
        lng: (lngMin + lngMax) / 2,
        error: {
            lat: (latMax - latMin) / 2,
            lng: (lngMax - lngMin) / 2
        }
    };
}

/**
 * Zwraca sąsiednie geohash (8 kierunków + środek)
 */
export function getGeohashNeighbors(geohash: string): string[] {
    const center = decodeGeohash(geohash);
    const precision = geohash.length;

    // Przybliżony rozmiar komórki
    const latDelta = center.error.lat * 2;
    const lngDelta = center.error.lng * 2;

    const neighbors: string[] = [geohash]; // Includesrodek

    const directions = [
        [-1, -1], [-1, 0], [-1, 1],
        [0, -1], [0, 1],
        [1, -1], [1, 0], [1, 1]
    ];

    for (const [dLat, dLng] of directions) {
        const newLat = center.lat + dLat * latDelta;
        const newLng = center.lng + dLng * lngDelta;

        // Sprawdź czy w granicach
        if (newLat >= -90 && newLat <= 90 && newLng >= -180 && newLng <= 180) {
            neighbors.push(encodeGeohash(newLat, newLng, precision));
        }
    }

    return [...new Set(neighbors)]; // Usuń duplikaty
}

// ===========================================
// HAVERSINE FORMULA
// ===========================================

const EARTH_RADIUS_KM = 6371;

/**
 * Oblicza dystans między dwoma punktami (w km) używając formuły Haversine'a
 */
export function calculateDistance(
    lat1: number,
    lng1: number,
    lat2: number,
    lng2: number
): number {
    const dLat = toRadians(lat2 - lat1);
    const dLng = toRadians(lng2 - lng1);

    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
        Math.sin(dLng / 2) * Math.sin(dLng / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return EARTH_RADIUS_KM * c;
}

function toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
}

// ===========================================
// BOUNDING BOX QUERIES
// ===========================================

/**
 * Generuje zakresy geohash pokrywające dany promień
 * Używane do zapytań zakresowych w Firestore
 */
export function calculateBoundingBoxHashes(
    centerLat: number,
    centerLng: number,
    radiusKm: number,
    precision: number = 6
): { start: string; end: string }[] {
    // Oblicz bounding box
    const latDelta = radiusKm / 111; // ~111 km na stopień szerokości
    const lngDelta = radiusKm / (111 * Math.cos(toRadians(centerLat)));

    const minLat = centerLat - latDelta;
    const maxLat = centerLat + latDelta;
    const minLng = centerLng - lngDelta;
    const maxLng = centerLng + lngDelta;

    // Generuj geohashes dla rogów i środka
    const hashes = new Set<string>();

    // Sample grid of points
    const steps = 3;
    for (let i = 0; i <= steps; i++) {
        for (let j = 0; j <= steps; j++) {
            const lat = minLat + (maxLat - minLat) * (i / steps);
            const lng = minLng + (maxLng - minLng) * (j / steps);
            hashes.add(encodeGeohash(lat, lng, precision));
        }
    }

    // Znajdź unikalne prefiksy i utwórz zakresy
    const prefixLength = Math.max(1, precision - 1);
    const prefixes = new Set<string>();

    for (const hash of hashes) {
        prefixes.add(hash.substring(0, prefixLength));
    }

    return Array.from(prefixes).map(prefix => ({
        start: prefix,
        end: prefix + '~' // '~' jest większy niż wszystkie znaki BASE32
    }));
}

/**
 * Filtruje wyniki po stronie klienta używając dokładnego dystansu
 */
export function filterByRadius<T extends { lat: number; lng: number }>(
    items: T[],
    centerLat: number,
    centerLng: number,
    radiusKm: number
): (T & { distance: number })[] {
    return items
        .map(item => ({
            ...item,
            distance: calculateDistance(centerLat, centerLng, item.lat, item.lng)
        }))
        .filter(item => item.distance <= radiusKm)
        .sort((a, b) => a.distance - b.distance);
}

// ===========================================
// PRECISION HELPERS
// ===========================================

/**
 * Przybliżony rozmiar komórki geohash w km
 */
export const GEOHASH_PRECISION_KM: Record<number, number> = {
    1: 5000,    // ±2500 km
    2: 1250,    // ±625 km
    3: 156,     // ±78 km
    4: 40,      // ±20 km
    5: 5,       // ±2.5 km
    6: 1.2,     // ±0.6 km
    7: 0.15,    // ±75 m
    8: 0.04,    // ±19 m
};

/**
 * Wybiera optymalną precyzję geohash dla danego promienia
 */
export function getOptimalPrecision(radiusKm: number): number {
    for (let precision = 8; precision >= 1; precision--) {
        if (GEOHASH_PRECISION_KM[precision] <= radiusKm * 2) {
            return precision;
        }
    }
    return 6; // Domyślna
}

// ===========================================
// MARKER CLUSTERING
// ===========================================

interface MarkerData {
    id: string;
    lat: number;
    lng: number;
    [key: string]: unknown;
}

interface Cluster {
    center: { lat: number; lng: number };
    markers: MarkerData[];
    count: number;
}

/**
 * Grupuje markery w klastry dla lepszej wydajności mapy
 */
export function clusterMarkers(
    markers: MarkerData[],
    zoomLevel: number,
    _gridSize: number = 60 // pikseli - reserved for future use
): Cluster[] {
    if (markers.length === 0) return [];

    // Im większy zoom, tym mniejsze klastry
    const precision = Math.min(8, Math.max(1, Math.floor(zoomLevel / 2)));

    const clusters: Map<string, MarkerData[]> = new Map();

    for (const marker of markers) {
        const hash = encodeGeohash(marker.lat, marker.lng, precision);
        if (!clusters.has(hash)) {
            clusters.set(hash, []);
        }
        clusters.get(hash)!.push(marker);
    }

    return Array.from(clusters.entries()).map(([_hash, clusterMarkers]) => {
        // Znajdź środek klastra
        const avgLat = clusterMarkers.reduce((sum, m) => sum + m.lat, 0) / clusterMarkers.length;
        const avgLng = clusterMarkers.reduce((sum, m) => sum + m.lng, 0) / clusterMarkers.length;

        return {
            center: { lat: avgLat, lng: avgLng },
            markers: clusterMarkers,
            count: clusterMarkers.length
        };
    });
}

// ===========================================
// FORMATTERS
// ===========================================

/**
 * Formatuje dystans do czytelnej formy
 */
export function formatDistance(distanceKm: number): string {
    if (distanceKm < 1) {
        return `${Math.round(distanceKm * 1000)} m`;
    }
    if (distanceKm < 10) {
        return `${distanceKm.toFixed(1)} km`;
    }
    return `${Math.round(distanceKm)} km`;
}

/**
 * Oblicza przybliżony czas dojazdu
 */
export function estimateETA(distanceKm: number, speedKmh: number = 30): string {
    const minutes = Math.round((distanceKm / speedKmh) * 60);

    if (minutes < 1) return '<1 min';
    if (minutes < 60) return `${minutes} min`;

    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;

    if (remainingMinutes === 0) {
        return `${hours}h`;
    }
    return `${hours}h ${remainingMinutes}min`;
}
