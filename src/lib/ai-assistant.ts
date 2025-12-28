/**
 * AI Assistant Service - Vertex AI Integration
 * 
 * Connects to Google Vertex AI for intelligent job categorization
 * and professional matching.
 */

import { db } from './firebase';

// ===========================================
// TYPES
// ===========================================

export interface AIAnalysisResult {
    category: 'Hydraulik' | 'Elektryk' | 'Sprzątanie' | 'Złota Rączka' | 'Inne';
    title: string;
    tags: string[];
    priceMin: number;
    priceMax: number;
    urgency: 'low' | 'medium' | 'high';
    confidence: number;
}

export interface NearbyPro {
    id: string;
    name: string;
    profession: string;
    rating: number;
    reviewCount: number;
    distance: number;  // km
    estimatedArrival: number;  // minutes
    imageUrl: string;
    price: number;
    description?: string;
    location: { lat: number; lng: number };
    isVerified: boolean;
    responseRate?: number;
}

// ===========================================
// VERTEX AI ANALYSIS
// ===========================================

/**
 * Analyze job description using Vertex AI
 * Falls back to local analysis if API unavailable
 */
export async function analyzeJobDescription(description: string): Promise<AIAnalysisResult> {
    // Try Vertex AI first via Firebase Function
    try {
        const response = await fetch('/api/ai/analyze-job', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ description })
        });

        if (response.ok) {
            return await response.json();
        }
    } catch (error) {
        console.log('Vertex AI unavailable, using local analysis');
    }

    // Fallback: Local keyword-based analysis
    return localAnalyzeJob(description);
}

/**
 * Local fallback analysis using keyword matching
 */
function localAnalyzeJob(description: string): AIAnalysisResult {
    const desc = description.toLowerCase();

    // Hydraulik keywords
    if (desc.match(/kran|rura|wod|ciek|hydraul|toalet|umywalk|prysznic|wanna|zlew|kanalizac|spłuczk/)) {
        return {
            category: 'Hydraulik',
            title: 'Naprawa instalacji wodnej',
            tags: ['hydraulika', 'naprawa', 'woda'],
            priceMin: 80,
            priceMax: 200,
            urgency: desc.includes('pilne') || desc.includes('zalew') ? 'high' : 'medium',
            confidence: 0.85
        };
    }

    // Elektryk keywords
    if (desc.match(/prąd|gniazdko|elektr|lampa|światło|kabel|bezpiecznik|kontakt|włącznik/)) {
        return {
            category: 'Elektryk',
            title: 'Usługa elektryczna',
            tags: ['elektryka', 'instalacja', 'prąd'],
            priceMin: 100,
            priceMax: 300,
            urgency: desc.includes('brak prądu') ? 'high' : 'medium',
            confidence: 0.82
        };
    }

    // Sprzątanie keywords
    if (desc.match(/sprząt|czysto|myci|odkurz|pranie|piorę|brud|porządek/)) {
        return {
            category: 'Sprzątanie',
            title: 'Usługa sprzątania',
            tags: ['sprzątanie', 'czystość', 'dom'],
            priceMin: 50,
            priceMax: 150,
            urgency: 'low',
            confidence: 0.80
        };
    }

    // Default: Złota Rączka
    return {
        category: 'Złota Rączka',
        title: 'Naprawa domowa',
        tags: ['naprawa', 'dom', 'złota rączka'],
        priceMin: 60,
        priceMax: 180,
        urgency: 'medium',
        confidence: 0.60
    };
}

// ===========================================
// PROFESSIONAL MATCHING
// ===========================================

/**
 * Find nearby professionals matching the job category
 */
export async function findNearbyPros(
    category: string,
    location: { lat: number; lng: number },
    radiusKm: number = 15
): Promise<NearbyPro[]> {
    // Try to fetch from Firestore
    if (db) {
        try {
            const { collection, query, where, getDocs, orderBy, limit } = await import('firebase/firestore');

            // Query public profiles
            const prosRef = collection(db, 'public_profiles');
            const q = query(
                prosRef,
                where('categories', 'array-contains', category.toLowerCase()),
                where('isActive', '==', true),
                limit(10)
            );

            const snapshot = await getDocs(q);

            if (!snapshot.empty) {
                const pros: NearbyPro[] = [];

                snapshot.forEach(doc => {
                    const data = doc.data();
                    const proLat = data.location?.lat || data.g?.geopoint?.latitude;
                    const proLng = data.location?.lng || data.g?.geopoint?.longitude;

                    if (proLat && proLng) {
                        const distance = calculateDistance(location.lat, location.lng, proLat, proLng);

                        if (distance <= radiusKm) {
                            pros.push({
                                id: doc.id,
                                name: data.displayName || 'Fachowiec',
                                profession: data.categories?.[0] || category,
                                rating: data.averageRating || 4.5,
                                reviewCount: data.reviewCount || 0,
                                distance: Math.round(distance * 10) / 10,
                                estimatedArrival: Math.round(distance * 3 + 5), // ~3 min per km
                                imageUrl: data.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(data.displayName || 'F')}&background=6366f1&color=fff`,
                                price: data.basePrice || 100,
                                description: data.description,
                                location: { lat: proLat, lng: proLng },
                                isVerified: data.isVerified || false,
                                responseRate: data.responseRate
                            });
                        }
                    }
                });

                // Sort by distance
                pros.sort((a, b) => a.distance - b.distance);

                if (pros.length > 0) {
                    return pros;
                }
            }
        } catch (error) {
            console.error('Error fetching pros from Firestore:', error);
        }
    }

    // Fallback: Return mock data
    return getMockPros(category, location);
}

/**
 * Calculate distance between two points (Haversine formula)
 */
function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371; // Earth's radius in km
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
        Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

function toRad(deg: number): number {
    return deg * (Math.PI / 180);
}

/**
 * Mock professionals for demo
 */
function getMockPros(category: string, location: { lat: number; lng: number }): NearbyPro[] {
    const categoryPros: Record<string, NearbyPro[]> = {
        'Hydraulik': [
            {
                id: 'pro_1',
                name: 'Jan Kowalski',
                profession: 'Hydraulik',
                rating: 4.9,
                reviewCount: 127,
                distance: 2.3,
                estimatedArrival: 12,
                imageUrl: 'https://randomuser.me/api/portraits/men/32.jpg',
                price: 120,
                description: '15 lat doświadczenia. Specjalizacja: naprawy awaryjne.',
                location: { lat: location.lat + 0.02, lng: location.lng + 0.01 },
                isVerified: true,
                responseRate: 98
            },
            {
                id: 'pro_2',
                name: 'Piotr Nowak',
                profession: 'Hydraulik',
                rating: 4.7,
                reviewCount: 84,
                distance: 3.8,
                estimatedArrival: 18,
                imageUrl: 'https://randomuser.me/api/portraits/men/45.jpg',
                price: 100,
                description: 'Szybkie terminy. Darmowa wycena.',
                location: { lat: location.lat - 0.03, lng: location.lng + 0.02 },
                isVerified: true,
                responseRate: 95
            },
            {
                id: 'pro_3',
                name: 'Marek Wiśniewski',
                profession: 'Hydraulik',
                rating: 4.8,
                reviewCount: 56,
                distance: 5.2,
                estimatedArrival: 22,
                imageUrl: 'https://randomuser.me/api/portraits/men/67.jpg',
                price: 90,
                description: 'Najniższe ceny w okolicy!',
                location: { lat: location.lat + 0.04, lng: location.lng - 0.02 },
                isVerified: false,
                responseRate: 88
            },
            {
                id: 'pro_4',
                name: 'Adam Zieliński',
                profession: 'Hydraulik',
                rating: 5.0,
                reviewCount: 43,
                distance: 6.1,
                estimatedArrival: 25,
                imageUrl: 'https://randomuser.me/api/portraits/men/22.jpg',
                price: 150,
                description: 'Premium quality. Gwarancja na pracę.',
                location: { lat: location.lat - 0.05, lng: location.lng - 0.03 },
                isVerified: true,
                responseRate: 100
            }
        ],
        'Elektryk': [
            {
                id: 'pro_5',
                name: 'Tomasz Mazur',
                profession: 'Elektryk',
                rating: 4.8,
                reviewCount: 92,
                distance: 3.1,
                estimatedArrival: 15,
                imageUrl: 'https://randomuser.me/api/portraits/men/55.jpg',
                price: 130,
                description: 'Certyfikowany elektryk. SEP do 1kV.',
                location: { lat: location.lat + 0.025, lng: location.lng + 0.015 },
                isVerified: true,
                responseRate: 96
            },
            {
                id: 'pro_6',
                name: 'Krzysztof Dąbrowski',
                profession: 'Elektryk',
                rating: 4.6,
                reviewCount: 67,
                distance: 4.5,
                estimatedArrival: 20,
                imageUrl: 'https://randomuser.me/api/portraits/men/36.jpg',
                price: 110,
                description: 'Instalacje domowe i przemysłowe.',
                location: { lat: location.lat - 0.035, lng: location.lng + 0.025 },
                isVerified: true,
                responseRate: 91
            }
        ]
    };

    // Return pros for category or default Złota Rączka
    return categoryPros[category] || categoryPros['Hydraulik'].map(p => ({
        ...p,
        profession: 'Złota Rączka'
    }));
}

// ===========================================
// FRIENDLY AI MESSAGES
// ===========================================

export const AI_MESSAGES = {
    greeting: (name?: string) =>
        `Cześć${name ? ` ${name}` : ''}! 👋\n\nJestem Twoim osobistym asystentem. Powiedz mi, z czym potrzebujesz pomocy - znajdę dla Ciebie idealnego fachowca!\n\n💡 Możesz napisać np. "Cieknie kran w kuchni" lub "Potrzebuję elektryka"`,

    analyzing: '🔍 Analizuję Twoje zgłoszenie...',

    analyzed: (result: AIAnalysisResult) =>
        `✨ Rozumiem! To zadanie dla: **${result.category}**\n\n` +
        `📋 ${result.title}\n` +
        `💰 Szacunkowy koszt: **${result.priceMin}-${result.priceMax} zł**\n` +
        `${result.urgency === 'high' ? '🔴 Priorytet: Pilne' : result.urgency === 'medium' ? '🟡 Priorytet: Normalny' : '🟢 Priorytet: Elastyczny'}\n\n` +
        `Teraz potrzebuję Twojej lokalizacji, żeby znaleźć fachowców w pobliżu! 📍`,

    locationReceived: (address: string) =>
        `📍 Świetnie! Lokalizacja: **${address}**\n\nSzukam najlepszych fachowców w Twojej okolicy...`,

    prosFound: (count: number) =>
        `🎉 Znalazłem **${count} fachowców** gotowych do pomocy!\n\nOto najlepsi w Twojej okolicy:`,

    noProsFound:
        `😔 Niestety nie znalazłem fachowców w Twojej okolicy.\n\nMożesz spróbować:\n• Rozszerzyć obszar wyszukiwania\n• Zmienić kategorię usługi\n• Opublikować zlecenie, a fachowcy sami się zgłoszą`,

    askPhoto:
        `📸 Chcesz dodać zdjęcie problemu?\n\nTo pomoże fachowcom lepiej ocenić sytuację i przygotować narzędzia.`,

    photoAdded:
        `👍 Zdjęcie dodane! Fachowcy będą mogli lepiej zrozumieć problem.`,

    confirmPublish:
        `✅ Wszystko gotowe! Sprawdź podsumowanie i opublikuj zlecenie.`,

    published:
        `🚀 **Zlecenie opublikowane!**\n\n` +
        `Fachowcy w Twojej okolicy już widzą Twoje zgłoszenie.\n\n` +
        `⏱️ Zlecenie ważne przez **7 dni**\n` +
        `📱 Sprawdzaj powiadomienia - odpowiedzi przychodzą w ciągu minut!\n\n` +
        `💡 Możesz też kliknąć na wybranego fachowca, żeby od razu z nim porozmawiać.`
};
