/**
 * Stripe Connect Service
 * 
 * Handles:
 * - Professional onboarding to Stripe Connect
 * - Split payments (platform fee + provider payout)
 * - Account status management
 */

import { doc, updateDoc, getDoc } from "firebase/firestore";
import { db } from "./firebase";

// Platform fee configuration
export const PLATFORM_FEE_PERCENT = 10; // 10% platform fee

export interface StripeConnectAccount {
    accountId: string;
    isOnboarded: boolean;
    chargesEnabled: boolean;
    payoutsEnabled: boolean;
    detailsSubmitted: boolean;
    onboardingUrl?: string;
}

/**
 * Create or retrieve Stripe Connect account for a professional
 */
export async function getOrCreateConnectAccount(providerId: string): Promise<StripeConnectAccount | null> {
    if (!db) return null;

    try {
        // Check if provider already has a Stripe account
        const providerRef = doc(db, "providers", providerId);
        const providerSnap = await getDoc(providerRef);

        if (!providerSnap.exists()) {
            console.error("Provider not found:", providerId);
            return null;
        }

        const providerData = providerSnap.data();

        // If already has Stripe account, return status
        if (providerData.stripeAccountId) {
            return {
                accountId: providerData.stripeAccountId,
                isOnboarded: providerData.stripeOnboarded || false,
                chargesEnabled: providerData.stripeChargesEnabled || false,
                payoutsEnabled: providerData.stripePayoutsEnabled || false,
                detailsSubmitted: providerData.stripeDetailsSubmitted || false
            };
        }

        // Create new Connect account via API
        const response = await fetch("/api/stripe/connect/create-account", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ providerId })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || "Failed to create Connect account");
        }

        const data = await response.json();

        // Update provider with Stripe account ID
        await updateDoc(providerRef, {
            stripeAccountId: data.accountId,
            stripeOnboarded: false,
            stripeChargesEnabled: false,
            stripePayoutsEnabled: false,
            stripeDetailsSubmitted: false
        });

        return {
            accountId: data.accountId,
            isOnboarded: false,
            chargesEnabled: false,
            payoutsEnabled: false,
            detailsSubmitted: false,
            onboardingUrl: data.onboardingUrl
        };
    } catch (error) {
        console.error("Error with Connect account:", error);
        return null;
    }
}

/**
 * Get onboarding link for provider to complete Stripe setup
 */
export async function getOnboardingLink(providerId: string): Promise<string | null> {
    try {
        const response = await fetch("/api/stripe/connect/onboarding-link", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ providerId })
        });

        if (!response.ok) {
            throw new Error("Failed to get onboarding link");
        }

        const data = await response.json();
        return data.url;
    } catch (error) {
        console.error("Error getting onboarding link:", error);
        return null;
    }
}

/**
 * Create payment with split to provider
 * Platform takes PLATFORM_FEE_PERCENT, rest goes to provider
 */
export async function createSplitPayment(
    amount: number, // Total amount in PLN
    bookingId: string,
    providerAccountId: string
): Promise<{ clientSecret: string; paymentIntentId: string } | null> {
    try {
        const response = await fetch("/api/stripe/connect/create-split-payment", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                amount,
                bookingId,
                providerAccountId,
                platformFeePercent: PLATFORM_FEE_PERCENT
            })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || "Failed to create split payment");
        }

        return response.json();
    } catch (error) {
        console.error("Error creating split payment:", error);
        return null;
    }
}

/**
 * Calculate split amounts
 */
export function calculateSplit(totalAmount: number): {
    platformFee: number;
    providerPayout: number;
} {
    const platformFee = Math.round(totalAmount * (PLATFORM_FEE_PERCENT / 100));
    const providerPayout = totalAmount - platformFee;

    return { platformFee, providerPayout };
}
