/**
 * Badges (Odznaki) Service
 * 
 * System gamifikacji dla FachowcyNow.
 * Odznaki budują wiarygodność i działają jako dowód społeczny (Social Proof).
 * 
 * Wzorce z raportu architektonicznego:
 * - Szybka Strzała (Fast Responder) - odpowiada w <1h
 * - Zweryfikowana Tożsamość (ID Verified)
 * - Ulubieniec Klientów (Client Favorite)
 * - Mistrz Terminowości (On-Time Master)
 */

import {
    collection,
    doc,
    getDoc,
    getDocs,
    setDoc,
    updateDoc,
    query,
    where,
    Timestamp,
    arrayUnion
} from "firebase/firestore";
import { db } from "@/lib/firebase";

// ===========================================
// TYPES
// ===========================================

export type BadgeId =
    | 'fast_responder'       // Szybka Strzała - odpowiada w <1h
    | 'verified_identity'    // Zweryfikowana Tożsamość
    | 'client_favorite'      // Ulubieniec Klientów (>50 zapisów do ulubionych)
    | 'on_time_master'       // Mistrz Terminowości (>95% na czas)
    | 'five_star_streak'     // Seria 5 Gwiazdek (10 kolejnych ocen 5.0)
    | 'first_job'            // Pierwsze Zlecenie
    | 'veteran'              // Weteran (>100 zleceń)
    | 'quick_booker'         // Szybka Rezerwacja (akceptuje w <5min)
    | 'early_adopter'        // Early Adopter (dołączył w pierwszym roku)
    | 'community_hero';      // Bohater Społeczności (polecony przez 10+ osób)

export type BadgeTier = 'bronze' | 'silver' | 'gold' | 'platinum';

export interface Badge {
    id: BadgeId;
    name: string;
    description: string;
    icon: string;           // Lucide icon name
    tier?: BadgeTier;
    earnedAt: Timestamp;
    expiresAt?: Timestamp;  // Niektóre odznaki mogą wygasać
}

export interface BadgeDefinition {
    id: BadgeId;
    name: string;
    description: string;
    icon: string;
    criteria: string;
    tiers?: {
        bronze: number;
        silver: number;
        gold: number;
        platinum: number;
    };
    expirationDays?: number;
}

// ===========================================
// BADGE DEFINITIONS
// ===========================================

export const BADGE_DEFINITIONS: Record<BadgeId, BadgeDefinition> = {
    fast_responder: {
        id: 'fast_responder',
        name: 'Szybka Strzała',
        description: 'Odpowiada na wiadomości w mniej niż godzinę',
        icon: 'Zap',
        criteria: 'Średni czas odpowiedzi < 1h przez ostatnie 30 dni',
        tiers: {
            bronze: 60,    // < 60 min
            silver: 30,    // < 30 min
            gold: 15,      // < 15 min
            platinum: 5    // < 5 min
        }
    },
    verified_identity: {
        id: 'verified_identity',
        name: 'Zweryfikowana Tożsamość',
        description: 'Tożsamość potwierdzona dokumentem',
        icon: 'ShieldCheck',
        criteria: 'Przeszedł weryfikację ID'
    },
    client_favorite: {
        id: 'client_favorite',
        name: 'Ulubieniec Klientów',
        description: 'Dodany do ulubionych przez wielu klientów',
        icon: 'Heart',
        criteria: 'Dodany do ulubionych przez >50 użytkowników',
        tiers: {
            bronze: 10,
            silver: 25,
            gold: 50,
            platinum: 100
        }
    },
    on_time_master: {
        id: 'on_time_master',
        name: 'Mistrz Terminowości',
        description: 'Zawsze przyjeżdża na czas',
        icon: 'Clock',
        criteria: '>95% zleceń rozpoczętych punktualnie',
        tiers: {
            bronze: 80,
            silver: 90,
            gold: 95,
            platinum: 99
        }
    },
    five_star_streak: {
        id: 'five_star_streak',
        name: 'Seria 5 Gwiazdek',
        description: 'Otrzymał oceny 5.0 od wielu klientów z rzędu',
        icon: 'Star',
        criteria: '10+ kolejnych ocen 5.0',
        tiers: {
            bronze: 5,
            silver: 10,
            gold: 25,
            platinum: 50
        }
    },
    first_job: {
        id: 'first_job',
        name: 'Pierwsze Zlecenie',
        description: 'Ukończył pierwsze zlecenie na platformie',
        icon: 'Award',
        criteria: 'Ukończone 1 zlecenie'
    },
    veteran: {
        id: 'veteran',
        name: 'Weteran',
        description: 'Doświadczony fachowiec z setkami zleceń',
        icon: 'Medal',
        criteria: '>100 ukończonych zleceń',
        tiers: {
            bronze: 25,
            silver: 50,
            gold: 100,
            platinum: 500
        }
    },
    quick_booker: {
        id: 'quick_booker',
        name: 'Błyskawiczna Akceptacja',
        description: 'Akceptuje zlecenia w mgnieniu oka',
        icon: 'Timer',
        criteria: 'Średni czas akceptacji < 5 min',
        tiers: {
            bronze: 30,    // < 30 min
            silver: 15,    // < 15 min
            gold: 5,       // < 5 min
            platinum: 2    // < 2 min
        }
    },
    early_adopter: {
        id: 'early_adopter',
        name: 'Early Adopter',
        description: 'Dołączył do platformy w pierwszym roku',
        icon: 'Rocket',
        criteria: 'Konto utworzone przed 2026'
    },
    community_hero: {
        id: 'community_hero',
        name: 'Bohater Społeczności',
        description: 'Polecony przez wielu zadowolonych klientów',
        icon: 'Users',
        criteria: 'Polecony przez >10 osób',
        tiers: {
            bronze: 3,
            silver: 10,
            gold: 25,
            platinum: 50
        }
    }
};

// ===========================================
// BADGE MANAGEMENT
// ===========================================

/**
 * Przyznaje odznakę użytkownikowi
 */
export async function awardBadge(
    userId: string,
    badgeId: BadgeId,
    tier?: BadgeTier
): Promise<void> {
    if (!db) throw new Error("Firestore not initialized");

    const definition = BADGE_DEFINITIONS[badgeId];
    if (!definition) throw new Error(`Unknown badge: ${badgeId}`);

    const badge: Badge = {
        id: badgeId,
        name: definition.name,
        description: definition.description,
        icon: definition.icon,
        tier,
        earnedAt: Timestamp.now(),
        ...(definition.expirationDays && {
            expiresAt: Timestamp.fromDate(
                new Date(Date.now() + definition.expirationDays * 24 * 60 * 60 * 1000)
            )
        })
    };

    // Zapisz do subkolekcji badges
    const badgeRef = doc(db, "users", userId, "badges", badgeId);
    await setDoc(badgeRef, badge);

    // Aktualizuj tablicę badgeIds w głównym dokumencie (dla szybkiego filtrowania)
    const userRef = doc(db, "users", userId);
    await updateDoc(userRef, {
        badgeIds: arrayUnion(badgeId)
    });

    console.log(`✅ Awarded badge "${definition.name}" (${tier || 'base'}) to user ${userId}`);
}

/**
 * Odbiera odznakę użytkownikowi
 */
export async function revokeBadge(
    userId: string,
    badgeId: BadgeId
): Promise<void> {
    if (!db) throw new Error("Firestore not initialized");

    const badgeRef = doc(db, "users", userId, "badges", badgeId);
    const badgeSnap = await getDoc(badgeRef);

    if (!badgeSnap.exists()) {
        console.log(`Badge ${badgeId} not found for user ${userId}`);
        return;
    }

    // Soft delete - mark as revoked instead of deleting
    await updateDoc(badgeRef, {
        revokedAt: Timestamp.now()
    });

    console.log(`❌ Revoked badge "${badgeId}" from user ${userId}`);
}

/**
 * Pobiera wszystkie aktywne odznaki użytkownika
 */
export async function getUserBadges(userId: string): Promise<Badge[]> {
    if (!db) throw new Error("Firestore not initialized");

    const badgesRef = collection(db, "users", userId, "badges");
    const snapshot = await getDocs(badgesRef);

    const badges: Badge[] = [];
    const now = Timestamp.now();

    snapshot.forEach(doc => {
        const badge = doc.data() as Badge & { revokedAt?: Timestamp };

        // Skip revoked badges
        if (badge.revokedAt) return;

        // Skip expired badges
        if (badge.expiresAt && badge.expiresAt.toMillis() < now.toMillis()) return;

        badges.push(badge);
    });

    return badges;
}

// ===========================================
// BADGE EVALUATION
// ===========================================

interface EvaluationMetrics {
    avgResponseTimeMinutes: number;
    favoriteCount: number;
    onTimePercentage: number;
    fiveStarStreak: number;
    completedJobs: number;
    avgAcceptanceTimeMinutes: number;
    referralCount: number;
    isVerified: boolean;
    accountCreatedAt: Timestamp;
}

/**
 * Ewaluuje i przyznaje odznaki na podstawie metryk
 */
export async function evaluateBadges(
    userId: string,
    metrics: EvaluationMetrics
): Promise<BadgeId[]> {
    const awarded: BadgeId[] = [];

    // Fast Responder
    if (metrics.avgResponseTimeMinutes < 60) {
        const tier = determineTier(metrics.avgResponseTimeMinutes, BADGE_DEFINITIONS.fast_responder.tiers!, true);
        await awardBadge(userId, 'fast_responder', tier);
        awarded.push('fast_responder');
    }

    // Verified Identity
    if (metrics.isVerified) {
        await awardBadge(userId, 'verified_identity');
        awarded.push('verified_identity');
    }

    // Client Favorite
    if (metrics.favoriteCount >= 10) {
        const tier = determineTier(metrics.favoriteCount, BADGE_DEFINITIONS.client_favorite.tiers!);
        await awardBadge(userId, 'client_favorite', tier);
        awarded.push('client_favorite');
    }

    // On Time Master
    if (metrics.onTimePercentage >= 80) {
        const tier = determineTier(metrics.onTimePercentage, BADGE_DEFINITIONS.on_time_master.tiers!);
        await awardBadge(userId, 'on_time_master', tier);
        awarded.push('on_time_master');
    }

    // Five Star Streak
    if (metrics.fiveStarStreak >= 5) {
        const tier = determineTier(metrics.fiveStarStreak, BADGE_DEFINITIONS.five_star_streak.tiers!);
        await awardBadge(userId, 'five_star_streak', tier);
        awarded.push('five_star_streak');
    }

    // First Job
    if (metrics.completedJobs >= 1) {
        await awardBadge(userId, 'first_job');
        awarded.push('first_job');
    }

    // Veteran
    if (metrics.completedJobs >= 25) {
        const tier = determineTier(metrics.completedJobs, BADGE_DEFINITIONS.veteran.tiers!);
        await awardBadge(userId, 'veteran', tier);
        awarded.push('veteran');
    }

    // Quick Booker
    if (metrics.avgAcceptanceTimeMinutes < 30) {
        const tier = determineTier(metrics.avgAcceptanceTimeMinutes, BADGE_DEFINITIONS.quick_booker.tiers!, true);
        await awardBadge(userId, 'quick_booker', tier);
        awarded.push('quick_booker');
    }

    // Early Adopter
    const year2026 = new Date('2026-01-01');
    if (metrics.accountCreatedAt.toDate() < year2026) {
        await awardBadge(userId, 'early_adopter');
        awarded.push('early_adopter');
    }

    // Community Hero
    if (metrics.referralCount >= 3) {
        const tier = determineTier(metrics.referralCount, BADGE_DEFINITIONS.community_hero.tiers!);
        await awardBadge(userId, 'community_hero', tier);
        awarded.push('community_hero');
    }

    return awarded;
}

/**
 * Określa tier na podstawie wartości i progów
 */
function determineTier(
    value: number,
    tiers: { bronze: number; silver: number; gold: number; platinum: number },
    lowerIsBetter: boolean = false
): BadgeTier {
    if (lowerIsBetter) {
        if (value <= tiers.platinum) return 'platinum';
        if (value <= tiers.gold) return 'gold';
        if (value <= tiers.silver) return 'silver';
        return 'bronze';
    } else {
        if (value >= tiers.platinum) return 'platinum';
        if (value >= tiers.gold) return 'gold';
        if (value >= tiers.silver) return 'silver';
        return 'bronze';
    }
}

// ===========================================
// UI HELPERS
// ===========================================

/**
 * Mapowanie tier na kolor
 */
export function getTierColor(tier?: BadgeTier): string {
    switch (tier) {
        case 'platinum': return '#E5E4E2'; // Platinum gray
        case 'gold': return '#FFD700';
        case 'silver': return '#C0C0C0';
        case 'bronze': return '#CD7F32';
        default: return '#6366f1'; // Indigo for base badges
    }
}

/**
 * Mapowanie tier na gradient
 */
export function getTierGradient(tier?: BadgeTier): string {
    switch (tier) {
        case 'platinum': return 'from-slate-300 via-slate-100 to-slate-300';
        case 'gold': return 'from-yellow-400 via-amber-300 to-yellow-500';
        case 'silver': return 'from-gray-300 via-gray-100 to-gray-400';
        case 'bronze': return 'from-orange-400 via-amber-600 to-orange-500';
        default: return 'from-indigo-500 to-purple-500';
    }
}

/**
 * Sortuje odznaki wg ważności (platinum > gold > silver > bronze > base)
 */
export function sortBadgesByImportance(badges: Badge[]): Badge[] {
    const tierOrder: Record<string, number> = {
        platinum: 4,
        gold: 3,
        silver: 2,
        bronze: 1,
        undefined: 0
    };

    return [...badges].sort((a, b) => {
        return (tierOrder[b.tier || 'undefined'] || 0) - (tierOrder[a.tier || 'undefined'] || 0);
    });
}
