/**
 * Stripe Connect Onboarding Link API
 */

import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

export const dynamic = 'force-dynamic';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: "2025-12-15.clover",
});

export async function POST(req: NextRequest) {
    try {
        const { providerId } = await req.json();

        if (!providerId) {
            return NextResponse.json(
                { error: "Provider ID is required" },
                { status: 400 }
            );
        }

        if (!db) {
            console.error("Firebase not initialized");
            return NextResponse.json({ error: "Database unavailable" }, { status: 503 });
        }

        // Get Stripe account ID from Firestore (using Client SDK)
        const providerRef = doc(db, "providers", providerId);
        const providerDoc = await getDoc(providerRef);

        if (!providerDoc.exists()) {
            return NextResponse.json(
                { error: "Provider not found" },
                { status: 404 }
            );
        }

        const providerData = providerDoc.data();
        const stripeAccountId = providerData?.stripeAccountId;

        if (!stripeAccountId) {
            return NextResponse.json(
                { error: "Provider does not have a Stripe account" },
                { status: 400 }
            );
        }

        // Create new onboarding link
        const accountLink = await stripe.accountLinks.create({
            account: stripeAccountId,
            refresh_url: `${process.env.NEXT_PUBLIC_APP_URL}/pro/dashboard?stripe=refresh`,
            return_url: `${process.env.NEXT_PUBLIC_APP_URL}/pro/dashboard?stripe=success`,
            type: "account_onboarding",
        });

        return NextResponse.json({ url: accountLink.url });
    } catch (error: unknown) {
        console.error("Error creating onboarding link:", error);
        const message = error instanceof Error ? error.message : "Failed to create link";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
