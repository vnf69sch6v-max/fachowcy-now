/**
 * Gamification Service
 * 
 * Handles:
 * - Experience points (XP)
 * - Levels
 * - Badges/Achievements
 * - Leaderboards
 */

import { doc, updateDoc, getDoc, collection, query, orderBy, limit, getDocs, increment, Timestamp } from "firebase/firestore";
import { db } from "./firebase";

// ===========================================
// CONFIGURATION
// ===========================================

export const XP_REWARDS = {
    firstBooking: 100,
    completedBooking: 50,
    leftReview: 25,
    receivedReview: 30,
    referral: 150,
    perfectRating: 75,       // 5-star review
    quickResponse: 20,       // Response within 30 min
    weekStreak: 100,         // Active 7 days in a row
    monthStreak: 500,        // Active 30 days in a row
};

export const LEVELS = [
    { level: 1, name: "Początkujący", xpRequired: 0, icon: "🌱" },
    { level: 2, name: "Aktywny", xpRequired: 100, icon: "⭐" },
    { level: 3, name: "Zaangażowany", xpRequired: 300, icon: "🔥" },
    { level: 4, name: "Ekspert", xpRequired: 600, icon: "💎" },
    { level: 5, name: "Mistrz", xpRequired: 1000, icon: "👑" },
    { level: 6, name: "Legenda", xpRequired: 2000, icon: "🏆" },
];

export interface Badge {
    id: string;
    name: string;
    description: string;
    icon: string;
    rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
}

export const BADGES: Badge[] = [
    // Common badges
    { id: "first_booking", name: "Pierwszy Krok", description: "Ukończ pierwsze zlecenie", icon: "🎯", rarity: "common" },
    { id: "first_review", name: "Głos Ludu", description: "Wystaw pierwszą opinię", icon: "📝", rarity: "common" },
    { id: "quick_responder", name: "Błyskawica", description: "Odpowiedz w 30 minut", icon: "⚡", rarity: "common" },

    // Uncommon badges
    { id: "five_bookings", name: "Regularny Klient", description: "Ukończ 5 zleceń", icon: "🔄", rarity: "uncommon" },
    { id: "referral_master", name: "Ambasador", description: "Poleć 3 osoby", icon: "🤝", rarity: "uncommon" },
    { id: "week_streak", name: "Tygodniowa Seria", description: "Aktywność przez 7 dni", icon: "📅", rarity: "uncommon" },

    // Rare badges
    { id: "twenty_bookings", name: "Weteran", description: "Ukończ 20 zleceń", icon: "🎖️", rarity: "rare" },
    { id: "perfect_ratings", name: "Perfekcjonista", description: "Otrzymaj 10 ocen 5/5", icon: "✨", rarity: "rare" },
    { id: "month_streak", name: "Miesięczna Seria", description: "Aktywność przez 30 dni", icon: "🗓️", rarity: "rare" },

    // Epic badges
    { id: "hundred_bookings", name: "Legenda", description: "Ukończ 100 zleceń", icon: "🌟", rarity: "epic" },
    { id: "top_rated", name: "Top 10", description: "Bądź w top 10 fachowców", icon: "🏅", rarity: "epic" },

    // Legendary badges
    { id: "platform_pioneer", name: "Pionier", description: "Jeden z pierwszych 100 użytkowników", icon: "🚀", rarity: "legendary" },
    { id: "thousand_helped", name: "Superbohater", description: "Pomóż 1000 klientom", icon: "🦸", rarity: "legendary" },
];

// ===========================================
// FUNCTIONS
// ===========================================

/**
 * Calculate level from XP
 */
export function calculateLevel(xp: number): typeof LEVELS[0] {
    let currentLevel = LEVELS[0];
    for (const level of LEVELS) {
        if (xp >= level.xpRequired) {
            currentLevel = level;
        } else {
            break;
        }
    }
    return currentLevel;
}

/**
 * Calculate XP needed for next level
 */
export function xpToNextLevel(xp: number): { current: number; required: number; percent: number } {
    const currentLevel = calculateLevel(xp);
    const currentLevelIndex = LEVELS.findIndex(l => l.level === currentLevel.level);
    const nextLevel = LEVELS[currentLevelIndex + 1];

    if (!nextLevel) {
        return { current: xp, required: xp, percent: 100 }; // Max level
    }

    const xpInCurrentLevel = xp - currentLevel.xpRequired;
    const xpNeededForLevel = nextLevel.xpRequired - currentLevel.xpRequired;
    const percent = Math.round((xpInCurrentLevel / xpNeededForLevel) * 100);

    return {
        current: xpInCurrentLevel,
        required: xpNeededForLevel,
        percent
    };
}

/**
 * Award XP to a user
 */
export async function awardXP(
    userId: string,
    amount: number,
    reason: keyof typeof XP_REWARDS
): Promise<{ newXP: number; leveledUp: boolean; newLevel?: typeof LEVELS[0] } | null> {
    if (!db) return null;

    try {
        const userRef = doc(db, "users", userId);
        const userSnap = await getDoc(userRef);

        if (!userSnap.exists()) return null;

        const currentXP = userSnap.data().xp || 0;
        const currentLevel = calculateLevel(currentXP);
        const newXP = currentXP + amount;
        const newLevel = calculateLevel(newXP);
        const leveledUp = newLevel.level > currentLevel.level;

        await updateDoc(userRef, {
            xp: increment(amount),
            level: newLevel.level,
            levelName: newLevel.name,
            lastXPAt: Timestamp.now(),
            xpHistory: [...(userSnap.data().xpHistory || []).slice(-49), {
                amount,
                reason,
                timestamp: new Date().toISOString()
            }]
        });

        return { newXP, leveledUp, newLevel: leveledUp ? newLevel : undefined };
    } catch (error) {
        console.error("Error awarding XP:", error);
        return null;
    }
}

/**
 * Award badge to user
 */
export async function awardBadge(userId: string, badgeId: string): Promise<boolean> {
    if (!db) return false;

    try {
        const badge = BADGES.find(b => b.id === badgeId);
        if (!badge) return false;

        const userRef = doc(db, "users", userId);
        const userSnap = await getDoc(userRef);

        if (!userSnap.exists()) return false;

        const currentBadges = userSnap.data().badges || [];

        // Don't award duplicates
        if (currentBadges.some((b: { id: string }) => b.id === badgeId)) {
            return false;
        }

        await updateDoc(userRef, {
            badges: [...currentBadges, {
                ...badge,
                awardedAt: new Date().toISOString()
            }]
        });

        return true;
    } catch (error) {
        console.error("Error awarding badge:", error);
        return false;
    }
}

/**
 * Get user gamification stats
 */
export async function getGamificationStats(userId: string): Promise<{
    xp: number;
    level: typeof LEVELS[0];
    progress: { current: number; required: number; percent: number };
    badges: Badge[];
} | null> {
    if (!db) return null;

    try {
        const userRef = doc(db, "users", userId);
        const userSnap = await getDoc(userRef);

        if (!userSnap.exists()) return null;

        const data = userSnap.data();
        const xp = data.xp || 0;

        return {
            xp,
            level: calculateLevel(xp),
            progress: xpToNextLevel(xp),
            badges: data.badges || []
        };
    } catch (error) {
        console.error("Error getting gamification stats:", error);
        return null;
    }
}

/**
 * Get leaderboard
 */
export async function getLeaderboard(limitCount: number = 10): Promise<{
    rank: number;
    userId: string;
    displayName: string;
    xp: number;
    level: typeof LEVELS[0];
}[]> {
    if (!db) return [];

    try {
        const usersRef = collection(db, "users");
        const q = query(usersRef, orderBy("xp", "desc"), limit(limitCount));
        const snapshot = await getDocs(q);

        return snapshot.docs.map((doc, index) => ({
            rank: index + 1,
            userId: doc.id,
            displayName: doc.data().displayName || "Użytkownik",
            xp: doc.data().xp || 0,
            level: calculateLevel(doc.data().xp || 0)
        }));
    } catch (error) {
        console.error("Error getting leaderboard:", error);
        return [];
    }
}
