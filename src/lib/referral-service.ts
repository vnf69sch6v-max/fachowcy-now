/**
 * Referral Service
 * 
 * Handles:
 * - Generating unique referral codes
 * - Tracking referrals
 * - Calculating and applying bonuses
 */

import { doc, updateDoc, getDoc, collection, addDoc, query, where, getDocs, increment, Timestamp } from "firebase/firestore";
import { db } from "./firebase";

// Referral configuration
export const REFERRAL_CONFIG = {
    referrerBonus: 50,       // PLN bonus for person who referred
    refereeBonus: 25,        // PLN bonus for new user
    proReferrerBonus: 100,   // PLN bonus for referring a professional
    minBookingsForBonus: 1,  // Minimum bookings referee must complete
};

export interface Referral {
    id: string;
    referrerId: string;
    refereeId: string;
    refereeEmail: string;
    referralCode: string;
    status: 'pending' | 'completed' | 'bonus_paid';
    refereeType: 'client' | 'professional';
    createdAt: Date;
    completedAt?: Date;
    bonusPaidAt?: Date;
}

/**
 * Generate unique referral code for a user
 */
export function generateReferralCode(userId: string): string {
    const prefix = userId.substring(0, 4).toUpperCase();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `FN-${prefix}-${random}`;
}

/**
 * Get or create referral code for user
 */
export async function getUserReferralCode(userId: string): Promise<string | null> {
    if (!db) return null;

    try {
        // Check users collection first
        const userRef = doc(db, "users", userId);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists() && userSnap.data().referralCode) {
            return userSnap.data().referralCode;
        }

        // Generate new code
        const newCode = generateReferralCode(userId);

        // Save to user document
        await updateDoc(userRef, {
            referralCode: newCode,
            referralStats: {
                totalReferrals: 0,
                completedReferrals: 0,
                totalEarnings: 0
            }
        });

        return newCode;
    } catch (error) {
        console.error("Error with referral code:", error);
        return null;
    }
}

/**
 * Track a new referral when someone signs up with a code
 */
export async function trackReferral(
    referralCode: string,
    newUserId: string,
    newUserEmail: string,
    userType: 'client' | 'professional'
): Promise<boolean> {
    if (!db) return false;

    try {
        // Find referrer by code
        const usersRef = collection(db, "users");
        const q = query(usersRef, where("referralCode", "==", referralCode));
        const snapshot = await getDocs(q);

        if (snapshot.empty) {
            console.error("Invalid referral code:", referralCode);
            return false;
        }

        const referrerDoc = snapshot.docs[0];
        const referrerId = referrerDoc.id;

        // Don't allow self-referral
        if (referrerId === newUserId) {
            return false;
        }

        // Create referral record
        await addDoc(collection(db, "referrals"), {
            referrerId,
            refereeId: newUserId,
            refereeEmail: newUserEmail,
            referralCode,
            status: 'pending',
            refereeType: userType,
            createdAt: Timestamp.now()
        });

        // Update referrer stats
        await updateDoc(doc(db, "users", referrerId), {
            "referralStats.totalReferrals": increment(1)
        });

        return true;
    } catch (error) {
        console.error("Error tracking referral:", error);
        return false;
    }
}

/**
 * Complete referral and apply bonuses after referee completes first booking
 */
export async function completeReferral(refereeId: string): Promise<boolean> {
    if (!db) return false;

    try {
        // Find pending referral for this user
        const referralsRef = collection(db, "referrals");
        const q = query(
            referralsRef,
            where("refereeId", "==", refereeId),
            where("status", "==", "pending")
        );
        const snapshot = await getDocs(q);

        if (snapshot.empty) {
            return false; // No pending referral
        }

        const referralDoc = snapshot.docs[0];
        const referral = referralDoc.data();

        // Determine bonus amounts
        const referrerBonus = referral.refereeType === 'professional'
            ? REFERRAL_CONFIG.proReferrerBonus
            : REFERRAL_CONFIG.referrerBonus;
        const refereeBonus = REFERRAL_CONFIG.refereeBonus;

        // Update referral status
        await updateDoc(referralDoc.ref, {
            status: 'completed',
            completedAt: Timestamp.now()
        });

        // Update referrer stats and add credit
        await updateDoc(doc(db, "users", referral.referrerId), {
            "referralStats.completedReferrals": increment(1),
            "referralStats.totalEarnings": increment(referrerBonus),
            "walletBalance": increment(referrerBonus)
        });

        // Add credit to referee
        await updateDoc(doc(db, "users", refereeId), {
            "walletBalance": increment(refereeBonus)
        });

        return true;
    } catch (error) {
        console.error("Error completing referral:", error);
        return false;
    }
}

/**
 * Get referral statistics for a user
 */
export async function getReferralStats(userId: string): Promise<{
    code: string;
    totalReferrals: number;
    completedReferrals: number;
    totalEarnings: number;
} | null> {
    if (!db) return null;

    try {
        const userRef = doc(db, "users", userId);
        const userSnap = await getDoc(userRef);

        if (!userSnap.exists()) {
            return null;
        }

        const data = userSnap.data();
        return {
            code: data.referralCode || await getUserReferralCode(userId) || '',
            totalReferrals: data.referralStats?.totalReferrals || 0,
            completedReferrals: data.referralStats?.completedReferrals || 0,
            totalEarnings: data.referralStats?.totalEarnings || 0
        };
    } catch (error) {
        console.error("Error getting referral stats:", error);
        return null;
    }
}
