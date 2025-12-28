/**
 * Service Listing Types
 * 
 * Core data model for the marketplace.
 * Sponsor-Ready: isPromoted flag controls visual hierarchy.
 */

import { Timestamp, DocumentData, FirestoreDataConverter, QueryDocumentSnapshot } from "firebase/firestore";

// ===========================================
// SERVICE CATEGORIES
// ===========================================

export type ServiceCategory =
    | 'hydraulik'
    | 'elektryk'
    | 'sprzatanie'
    | 'malarz'
    | 'stolarz'
    | 'klimatyzacja'
    | 'ogrodnik'
    | 'przeprowadzki'
    | 'zlota_raczka'
    | 'other';

export const SERVICE_CATEGORY_LABELS: Record<ServiceCategory, string> = {
    hydraulik: 'Hydraulik',
    elektryk: 'Elektryk',
    sprzatanie: 'Sprzątanie',
    malarz: 'Malarz',
    stolarz: 'Stolarz',
    klimatyzacja: 'Klimatyzacja',
    ogrodnik: 'Ogrodnik',
    przeprowadzki: 'Przeprowadzki',
    zlota_raczka: 'Złota Rączka',
    other: 'Inne'
};

export const SERVICE_CATEGORY_ICONS: Record<ServiceCategory, string> = {
    hydraulik: '🔧',
    elektryk: '⚡',
    sprzatanie: '🧹',
    malarz: '🎨',
    stolarz: '🪑',
    klimatyzacja: '❄️',
    ogrodnik: '🌿',
    przeprowadzki: '📦',
    zlota_raczka: '🔨',
    other: '⚙️'
};

// ===========================================
// SERVICE LISTING (listings/{listingId})
// ===========================================

/**
 * Main listing document - the heart of the marketplace
 */
export interface ServiceListing {
    id: string;

    // Owner
    providerId: string;      // Link to users/{uid}
    providerName: string;    // Denormalized for display
    providerAvatar: string | null;

    // Content
    title: string;           // "Hydraulik Warszawa Centrum - Awaria 24h"
    description: string;
    category: ServiceCategory;

    // Pricing
    basePrice: number;
    priceUnit: 'hour' | 'visit' | 'project';
    currency: 'PLN';

    // Sponsorship (Monetization Flag)
    isPromoted: boolean;     // Golden pin, priority ranking
    promotedUntil?: Timestamp;

    // Geo (for map and search)
    location: {
        geohash: string;     // For radius queries (geofire-common)
        lat: number;
        lng: number;
        address: string;     // Human readable
        city?: string;
    };
    serviceRadius: number;   // km - how far provider travels

    // Media
    media: {
        thumbnailUrl: string | null;
        gallery: string[];
    };

    // Stats (denormalized aggregates)
    stats: {
        rating: number;      // 0.0 - 5.0
        reviewCount: number;
        completedJobs: number;
        responseTimeMinutes: number;
    };

    // Status
    isActive: boolean;

    // Metadata
    createdAt: Timestamp;
    updatedAt: Timestamp;
}

// ===========================================
// FIRESTORE CONVERTER
// ===========================================

export const serviceListingConverter: FirestoreDataConverter<ServiceListing> = {
    toFirestore(listing: ServiceListing): DocumentData {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { id, ...data } = listing;
        return data;
    },
    fromFirestore(snapshot: QueryDocumentSnapshot): ServiceListing {
        const data = snapshot.data();
        return { id: snapshot.id, ...data } as ServiceListing;
    }
};

// ===========================================
// HELPER FUNCTIONS
// ===========================================

/**
 * Generate avatar URL from name (DiceBear)
 */
export function generateAvatarUrl(name: string): string {
    return `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(name)}`;
}

/**
 * Calculate distance between two points (Haversine formula)
 */
export function calculateDistance(
    point1: { lat: number; lng: number },
    point2: { lat: number; lng: number }
): number {
    const R = 6371; // Earth's radius in km
    const dLat = (point2.lat - point1.lat) * Math.PI / 180;
    const dLng = (point2.lng - point1.lng) * Math.PI / 180;
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(point1.lat * Math.PI / 180) * Math.cos(point2.lat * Math.PI / 180) *
        Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distance in km
}

/**
 * Sort listings with Sponsor-First algorithm
 */
export function sortListingsSponsorFirst(
    listings: ServiceListing[],
    userLocation?: { lat: number; lng: number }
): ServiceListing[] {
    return [...listings].sort((a, b) => {
        // 1. Promoted ALWAYS first
        if (a.isPromoted && !b.isPromoted) return -1;
        if (!a.isPromoted && b.isPromoted) return 1;

        // 2. If user location provided, sort by distance
        if (userLocation) {
            const distA = calculateDistance(userLocation, a.location);
            const distB = calculateDistance(userLocation, b.location);
            return distA - distB;
        }

        // 3. Fallback: sort by rating
        return b.stats.rating - a.stats.rating;
    });
}
