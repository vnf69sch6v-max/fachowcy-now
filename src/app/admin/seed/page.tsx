"use client";

/**
 * Admin Seed Generator
 * 
 * Demo Mode: "Zaludnij moją okolicę"
 * Generates realistic fake listings for investor demos.
 */

import { useState } from "react";
import { motion } from "framer-motion";
import {
    MapPin,
    Loader2,
    Sparkles,
    Trash2,
    CheckCircle,
    AlertCircle,
    Users
} from "lucide-react";
import {
    collection,
    doc,
    setDoc,
    deleteDoc,
    getDocs,
    query,
    where,
    serverTimestamp,
    Timestamp
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { faker } from "@faker-js/faker/locale/pl";
import { geohashForLocation } from "geofire-common";
import {
    ServiceCategory,
    SERVICE_CATEGORY_LABELS,
    SERVICE_CATEGORY_ICONS,
    ServiceListing,
    generateAvatarUrl
} from "@/types/listings";

// ===========================================
// CONFIG
// ===========================================

const SEED_COUNT = 30;
const PROMOTED_COUNT = 5;
const RADIUS_KM = 5;

const CATEGORIES: ServiceCategory[] = [
    'hydraulik', 'elektryk', 'sprzatanie', 'malarz',
    'stolarz', 'klimatyzacja', 'ogrodnik', 'przeprowadzki', 'zlota_raczka'
];

const TITLE_TEMPLATES: Record<ServiceCategory, string[]> = {
    hydraulik: [
        'Hydraulik {city} - Awaria 24h',
        'Usługi hydrauliczne - {name}',
        'Naprawa instalacji wodno-kanalizacyjnej'
    ],
    elektryk: [
        'Elektryk {city} - Uprawnienia SEP',
        'Instalacje elektryczne - Certyfikat',
        'Pogotowie elektryczne 24/7'
    ],
    sprzatanie: [
        'Profesjonalne sprzątanie {city}',
        'Firma sprzątająca - {name}',
        'Sprzątanie mieszkań i biur'
    ],
    malarz: [
        'Malowanie mieszkań {city}',
        'Usługi malarskie - {name}',
        'Remonty i malowanie wnętrz'
    ],
    stolarz: [
        'Stolarz meblowy {city}',
        'Meble na wymiar - {name}',
        'Montaż mebli IKEA i innych'
    ],
    klimatyzacja: [
        'Montaż klimatyzacji {city}',
        'Serwis klimatyzacji - {name}',
        'Instalacja i czyszczenie klimatyzatorów'
    ],
    ogrodnik: [
        'Usługi ogrodnicze {city}',
        'Pielęgnacja ogrodów - {name}',
        'Koszenie trawników i przycinanie żywopłotów'
    ],
    przeprowadzki: [
        'Przeprowadzki {city} i okolice',
        'Transport mebli - {name}',
        'Przeprowadzki lokalne i międzymiastowe'
    ],
    zlota_raczka: [
        'Złota Rączka {city}',
        'Drobne naprawy domowe - {name}',
        'Wieszanie obrazów, montaż mebli, naprawy'
    ],
    other: [
        'Usługi {city} - {name}',
        'Fachowiec - {name}'
    ]
};

// ===========================================
// GENERATOR
// ===========================================

function generateRandomListing(
    center: { lat: number; lng: number },
    isPromoted: boolean,
    index: number
): Omit<ServiceListing, 'id'> {
    const category = CATEGORIES[Math.floor(Math.random() * CATEGORIES.length)];
    const firstName = faker.person.firstName();
    const lastName = faker.person.lastName();
    const fullName = `${firstName} ${lastName}`;
    const city = "Okolica"; // Will be replaced with actual city if available

    // Random position within radius
    const angle = Math.random() * 2 * Math.PI;
    const distance = Math.random() * RADIUS_KM;
    const latOffset = (distance / 111) * Math.cos(angle);
    const lngOffset = (distance / (111 * Math.cos(center.lat * Math.PI / 180))) * Math.sin(angle);
    const lat = center.lat + latOffset;
    const lng = center.lng + lngOffset;

    // Random price based on category
    const basePrices: Record<ServiceCategory, [number, number]> = {
        hydraulik: [100, 250],
        elektryk: [120, 280],
        sprzatanie: [50, 150],
        malarz: [80, 200],
        stolarz: [100, 300],
        klimatyzacja: [150, 400],
        ogrodnik: [60, 180],
        przeprowadzki: [200, 500],
        zlota_raczka: [70, 180],
        other: [80, 200]
    };
    const [minPrice, maxPrice] = basePrices[category];
    const price = Math.floor(minPrice + Math.random() * (maxPrice - minPrice));

    // Generate title
    const templates = TITLE_TEMPLATES[category];
    const template = templates[Math.floor(Math.random() * templates.length)];
    const title = template.replace('{city}', city).replace('{name}', fullName);

    return {
        providerId: `seed_provider_${index}`,
        providerName: fullName,
        providerAvatar: generateAvatarUrl(fullName),
        title,
        description: faker.lorem.paragraph(),
        category,
        basePrice: price,
        priceUnit: 'hour',
        currency: 'PLN',
        isPromoted,
        location: {
            geohash: geohashForLocation([lat, lng], 10),
            lat,
            lng,
            address: `ul. ${faker.location.street()}, ${city}`,
            city
        },
        serviceRadius: 10 + Math.floor(Math.random() * 20),
        media: {
            thumbnailUrl: generateAvatarUrl(fullName),
            gallery: []
        },
        stats: {
            rating: 3.5 + Math.random() * 1.5,
            reviewCount: Math.floor(Math.random() * 150),
            completedJobs: Math.floor(Math.random() * 200),
            responseTimeMinutes: 5 + Math.floor(Math.random() * 55)
        },
        isActive: true,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
    };
}

// ===========================================
// PAGE COMPONENT
// ===========================================

export default function SeedPage() {
    const [isGenerating, setIsGenerating] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
    const [isLocating, setIsLocating] = useState(false);
    const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);
    const [generatedCount, setGeneratedCount] = useState(0);

    const handleGetLocation = () => {
        if (!navigator.geolocation) {
            setResult({ success: false, message: "Geolokalizacja niedostępna" });
            return;
        }

        setIsLocating(true);
        navigator.geolocation.getCurrentPosition(
            (position) => {
                setLocation({
                    lat: position.coords.latitude,
                    lng: position.coords.longitude
                });
                setIsLocating(false);
                setResult(null);
            },
            (error) => {
                setResult({ success: false, message: `Błąd GPS: ${error.message}` });
                setIsLocating(false);
            },
            { enableHighAccuracy: true }
        );
    };

    const handleGenerate = async () => {
        if (!location || !db) return;

        setIsGenerating(true);
        setResult(null);
        setGeneratedCount(0);

        try {
            // Generate promoted indices
            const promotedIndices = new Set<number>();
            while (promotedIndices.size < PROMOTED_COUNT) {
                promotedIndices.add(Math.floor(Math.random() * SEED_COUNT));
            }

            // Generate listings
            for (let i = 0; i < SEED_COUNT; i++) {
                const isPromoted = promotedIndices.has(i);
                const listing = generateRandomListing(location, isPromoted, i);

                const docRef = doc(collection(db, "listings"));
                await setDoc(docRef, listing);

                // Also add to providers for backwards compatibility
                await setDoc(doc(db, "providers", listing.providerId), {
                    uid: listing.providerId,
                    displayName: listing.providerName,
                    serviceType: listing.category,
                    basePrice: listing.basePrice,
                    rating: listing.stats.rating,
                    isPromoted: listing.isPromoted,
                    location: {
                        latitude: listing.location.lat,
                        longitude: listing.location.lng
                    },
                    isOnline: true,
                    isBusy: false,
                    createdAt: serverTimestamp()
                });

                // Add to provider_status
                await setDoc(doc(db, "provider_status", listing.providerId), {
                    isOnline: true,
                    isBusy: false,
                    location: {
                        latitude: listing.location.lat,
                        longitude: listing.location.lng
                    },
                    lastSeenAt: serverTimestamp()
                });

                setGeneratedCount(i + 1);
            }

            setResult({
                success: true,
                message: `Wygenerowano ${SEED_COUNT} ogłoszeń (${PROMOTED_COUNT} Premium)`
            });
        } catch (error) {
            console.error("Seed error:", error);
            setResult({
                success: false,
                message: `Błąd: ${error instanceof Error ? error.message : 'Nieznany błąd'}`
            });
        } finally {
            setIsGenerating(false);
        }
    };

    const handleClearSeeded = async () => {
        if (!db) return;

        setIsDeleting(true);
        setResult(null);

        try {
            // Delete seeded listings
            const listingsQuery = query(
                collection(db, "listings"),
                where("providerId", ">=", "seed_provider_"),
                where("providerId", "<=", "seed_provider_\uf8ff")
            );
            const listingsSnap = await getDocs(listingsQuery);

            for (const doc of listingsSnap.docs) {
                await deleteDoc(doc.ref);
            }

            // Delete seeded providers
            for (let i = 0; i < SEED_COUNT; i++) {
                const providerId = `seed_provider_${i}`;
                await deleteDoc(doc(db, "providers", providerId));
                await deleteDoc(doc(db, "provider_status", providerId));
            }

            setResult({
                success: true,
                message: `Usunięto ${listingsSnap.size} wygenerowanych ogłoszeń`
            });
        } catch (error) {
            console.error("Clear error:", error);
            setResult({
                success: false,
                message: `Błąd: ${error instanceof Error ? error.message : 'Nieznany błąd'}`
            });
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-950 text-white p-6">
            <div className="max-w-lg mx-auto">
                {/* Header */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-yellow-500 to-amber-600 mb-4">
                        <Sparkles className="w-8 h-8 text-white" />
                    </div>
                    <h1 className="text-2xl font-bold mb-2">Demo Mode</h1>
                    <p className="text-slate-400">Generator danych dla prezentacji inwestorom</p>
                </div>

                {/* Main Card */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-slate-900/50 border border-white/10 rounded-2xl p-6"
                >
                    {/* Location Section */}
                    <div className="mb-6">
                        <h3 className="text-sm font-semibold text-slate-400 mb-3 flex items-center gap-2">
                            <MapPin className="w-4 h-4" />
                            Twoja lokalizacja
                        </h3>

                        {location ? (
                            <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4">
                                <div className="flex items-center gap-2 text-emerald-400 mb-1">
                                    <CheckCircle className="w-4 h-4" />
                                    <span className="font-medium">Lokalizacja pobrana</span>
                                </div>
                                <p className="text-slate-400 text-sm">
                                    {location.lat.toFixed(6)}, {location.lng.toFixed(6)}
                                </p>
                            </div>
                        ) : (
                            <button
                                onClick={handleGetLocation}
                                disabled={isLocating}
                                className="w-full py-3 rounded-xl bg-indigo-500/20 border border-indigo-500/30 text-indigo-400 font-medium hover:bg-indigo-500/30 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {isLocating ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        Pobieram lokalizację...
                                    </>
                                ) : (
                                    <>
                                        <MapPin className="w-4 h-4" />
                                        Pobierz moją lokalizację
                                    </>
                                )}
                            </button>
                        )}
                    </div>

                    {/* Generate Section */}
                    <div className="space-y-3">
                        <button
                            onClick={handleGenerate}
                            disabled={!location || isGenerating}
                            className="w-full py-4 rounded-xl bg-gradient-to-r from-yellow-500 to-amber-600 text-slate-900 font-bold hover:from-yellow-400 hover:to-amber-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {isGenerating ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    Generuję ({generatedCount}/{SEED_COUNT})...
                                </>
                            ) : (
                                <>
                                    <Users className="w-5 h-5" />
                                    🎯 Zaludnij moją okolicę
                                </>
                            )}
                        </button>

                        <button
                            onClick={handleClearSeeded}
                            disabled={isDeleting}
                            className="w-full py-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 font-medium hover:bg-red-500/20 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {isDeleting ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Usuwam...
                                </>
                            ) : (
                                <>
                                    <Trash2 className="w-4 h-4" />
                                    Usuń wygenerowane dane
                                </>
                            )}
                        </button>
                    </div>

                    {/* Result Message */}
                    {result && (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className={`mt-4 p-4 rounded-xl flex items-center gap-3 ${result.success
                                    ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400'
                                    : 'bg-red-500/10 border border-red-500/30 text-red-400'
                                }`}
                        >
                            {result.success ? (
                                <CheckCircle className="w-5 h-5 flex-shrink-0" />
                            ) : (
                                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                            )}
                            <span className="text-sm">{result.message}</span>
                        </motion.div>
                    )}

                    {/* Info */}
                    <div className="mt-6 p-4 bg-slate-800/50 rounded-xl">
                        <h4 className="font-medium text-white mb-2">ℹ️ Jak to działa?</h4>
                        <ul className="text-sm text-slate-400 space-y-1">
                            <li>• Generuje {SEED_COUNT} realistycznych ogłoszeń</li>
                            <li>• {PROMOTED_COUNT} z nich to Premium (złote pinezki)</li>
                            <li>• Wszystkie w promieniu {RADIUS_KM} km od Ciebie</li>
                            <li>• Idealne do prezentacji inwestorom</li>
                        </ul>
                    </div>
                </motion.div>

                {/* Back Link */}
                <div className="text-center mt-6">
                    <a
                        href="/"
                        className="text-slate-400 hover:text-white transition-colors text-sm"
                    >
                        ← Wróć do mapy
                    </a>
                </div>
            </div>
        </div>
    );
}
