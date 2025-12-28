/**
 * Stripe Connect API Routes
 * 
 * These routes handle Stripe Connect operations:
 * - Account creation
 * - Onboarding links
 * - Split payments
 */

import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

// Initialize Stripe with secret key
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: "2025-12-15.clover",
});

export const dynamic = 'force-dynamic';

const PLATFORM_FEE_PERCENT = 10;

/**
 * POST /api/stripe/connect/create-account
 * Creates a new Stripe Connect Express account for a provider
 */
export async function POST(req: NextRequest) {
    try {
        const { providerId } = await req.json();

        if (!providerId) {
            return NextResponse.json(
                { error: "Provider ID is required" },
                { status: 400 }
            );
        }

        // Create Express account
        const account = await stripe.accounts.create({
            type: "express",
            country: "PL",
            capabilities: {
                card_payments: { requested: true },
                transfers: { requested: true },
            },
            business_type: "individual",
            metadata: {
                providerId,
            },
        });

        // Create account onboarding link
        const accountLink = await stripe.accountLinks.create({
            account: account.id,
            refresh_url: `${process.env.NEXT_PUBLIC_APP_URL}/pro/dashboard?stripe=refresh`,
            return_url: `${process.env.NEXT_PUBLIC_APP_URL}/pro/dashboard?stripe=success`,
            type: "account_onboarding",
        });

        return NextResponse.json({
            accountId: account.id,
            onboardingUrl: accountLink.url,
        });
    } catch (error: unknown) {
        console.error("Error creating Connect account:", error);
        const message = error instanceof Error ? error.message : "Failed to create account";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
