"use client";

/**
 * useGeospatialRegistration Hook
 * 
 * ARCHITECTURAL DECISIONS (per specification):
 * 1. Session Tokens - managed by use-places-autocomplete for cost optimization
 * 2. Field Masking - only place_id, name, formatted_address, geometry, types
 * 3. Client-side Geohashing - using geofire-common (9 char precision)
 * 4. Atomic Batch Writes - WriteBatch for users + public_profiles
 * 5. Country Restriction - componentRestrictions: { country: 'pl' }
 */

import { useState, useCallback } from "react";
import {
    doc,
    writeBatch,
    serverTimestamp,
    Timestamp
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { geohashForLocation } from "geofire-common";
import { useAuth } from "@/context/AuthContext";

// ===========================================
// TYPES
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

export interface PlaceData {
    placeId: string;
    displayName: string;
    formattedAddress: string;
    lat: number;
    lng: number;
    types: string[];
}

export interface PrivateUserData {
    email: string;
    phoneNumber: string;
    taxId?: string; // NIP
    acceptedTerms: boolean;
    acceptedPrivacy: boolean;
}

export interface PublicProfileData {
    displayName: string;
    categories: ServiceCategory[];
    description: string;
    basePrice: number;
    avatarUrl?: string;
}

export interface RegistrationData {
    place: PlaceData;
    privateData: PrivateUserData;
    publicData: PublicProfileData;
}

export type RegistrationStep =
    | 'IDLE'
    | 'PLACES_LOADING'
    | 'SEARCHING'
    | 'PLACE_SELECTED'
    | 'ENRICHING'
    | 'SUBMITTING'
    | 'SUCCESS'
    | 'ERROR';

export interface RegistrationState {
    step: RegistrationStep;
    error: string | null;
    isSubmitting: boolean;
}

// ===========================================
// CONSTANTS
// ===========================================

export const GEOHASH_PRECISION = 9; // ~4.7 meters accuracy

export const CATEGORY_LABELS: Record<ServiceCategory, string> = {
    hydraulik: '🔧 Hydraulik',
    elektryk: '⚡ Elektryk',
    sprzatanie: '🧹 Sprzątanie',
    malarz: '🎨 Malarz',
    stolarz: '🪵 Stolarz',
    klimatyzacja: '❄️ Klimatyzacja',
    ogrodnik: '🌿 Ogrodnik',
    przeprowadzki: '📦 Przeprowadzki',
    zlota_raczka: '🛠️ Złota Rączka',
    other: '📋 Inne'
};

// ===========================================
// HOOK
// ===========================================

export function useGeospatialRegistration() {
    const { user } = useAuth();
    const [state, setState] = useState<RegistrationState>({
        step: 'IDLE',
        error: null,
        isSubmitting: false
    });

    /**
     * Generate geohash from coordinates
     * Client-side calculation using geofire-common (no Cloud Functions latency)
     */
    const generateGeohash = useCallback((lat: number, lng: number): string => {
        return geohashForLocation([lat, lng], GEOHASH_PRECISION);
    }, []);

    /**
     * Validate geographic coordinates
     * Per specification: lat -90 to 90, lng -180 to 180
     */
    const validateCoordinates = useCallback((lat: number, lng: number): boolean => {
        return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
    }, []);

    /**
     * Submit registration using Atomic Batch Write
     * 
     * CRITICAL: Uses WriteBatch to ensure both collections are updated atomically.
     * If write to `users` fails, `public_profiles` won't be created (no zombie profiles).
     */
    const submitRegistration = useCallback(async (data: RegistrationData): Promise<boolean> => {
        if (!user || !db) {
            setState(prev => ({ ...prev, error: 'Brak autoryzacji', step: 'ERROR' }));
            return false;
        }

        // Validate coordinates
        if (!validateCoordinates(data.place.lat, data.place.lng)) {
            setState(prev => ({
                ...prev,
                error: 'Nieprawidłowe współrzędne geograficzne',
                step: 'ERROR'
            }));
            return false;
        }

        setState(prev => ({ ...prev, step: 'SUBMITTING', isSubmitting: true }));

        try {
            // Generate geohash (client-side for performance)
            const geohash = generateGeohash(data.place.lat, data.place.lng);

            // Reference to both documents
            const userRef = doc(db, 'users', user.uid);
            const publicProfileRef = doc(db, 'public_profiles', user.uid);

            // Create atomic batch
            const batch = writeBatch(db);

            // ===== PRIVATE DATA (users collection) =====
            // Only accessible by the owner (enforced by Firestore rules)
            batch.set(userRef, {
                uid: user.uid,
                email: data.privateData.email,
                phoneNumber: data.privateData.phoneNumber,
                taxId: data.privateData.taxId || null,
                acceptedTerms: data.privateData.acceptedTerms,
                acceptedPrivacy: data.privateData.acceptedPrivacy,
                role: 'professional',
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp()
            });

            // ===== PUBLIC DATA (public_profiles collection) =====
            // Readable by all users (for map display)
            batch.set(publicProfileRef, {
                uid: user.uid,
                displayName: data.publicData.displayName,
                description: data.publicData.description,
                categories: data.publicData.categories,
                basePrice: data.publicData.basePrice,
                avatarUrl: data.publicData.avatarUrl || user.photoURL ||
                    `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(data.publicData.displayName)}`,

                // Geospatial data (for map queries)
                geohash,
                lat: data.place.lat,
                lng: data.place.lng,

                // Google Places reference
                placeId: data.place.placeId,
                formattedAddress: data.place.formattedAddress,

                // Metrics (initialized)
                rating: 5.0,
                reviewCount: 0,
                completedJobs: 0,

                // Status
                isActive: true,
                isVerified: false,
                isPromoted: false,

                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp()
            });

            // ===== LEGACY COMPATIBILITY =====
            // Also write to providers/provider_status for existing map system
            const providersRef = doc(db, 'providers', user.uid);
            const providerStatusRef = doc(db, 'provider_status', user.uid);

            batch.set(providersRef, {
                uid: user.uid,
                displayName: data.publicData.displayName,
                serviceType: data.publicData.categories[0] || 'other',
                basePrice: data.publicData.basePrice,
                rating: 5.0,
                isPromoted: false,
                location: {
                    latitude: data.place.lat,
                    longitude: data.place.lng
                },
                isOnline: true,
                isBusy: false,
                createdAt: serverTimestamp()
            });

            batch.set(providerStatusRef, {
                isOnline: true,
                isBusy: false,
                location: {
                    latitude: data.place.lat,
                    longitude: data.place.lng
                },
                lastSeenAt: serverTimestamp()
            });

            // Execute atomic batch
            await batch.commit();

            setState({ step: 'SUCCESS', error: null, isSubmitting: false });
            return true;

        } catch (error) {
            console.error('Registration error:', error);
            setState({
                step: 'ERROR',
                error: error instanceof Error ? error.message : 'Błąd rejestracji',
                isSubmitting: false
            });
            return false;
        }
    }, [user, generateGeohash, validateCoordinates]);

    /**
     * Reset registration state
     */
    const reset = useCallback(() => {
        setState({ step: 'IDLE', error: null, isSubmitting: false });
    }, []);

    /**
     * Set current step
     */
    const setStep = useCallback((step: RegistrationStep) => {
        setState(prev => ({ ...prev, step }));
    }, []);

    return {
        ...state,
        submitRegistration,
        generateGeohash,
        validateCoordinates,
        reset,
        setStep
    };
}

// ===========================================
// HELPER: Avatar URL generator
// ===========================================

export function generateAvatarUrl(name: string): string {
    return `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name)}&backgroundColor=6366f1`;
}
