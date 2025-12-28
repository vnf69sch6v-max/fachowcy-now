/**
 * Stripe Connect Split Payment API
 * Creates a payment intent with automatic split to provider
 */

import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: "2025-12-15.clover",
});

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
    try {
        const { amount, bookingId, providerAccountId, platformFeePercent = 10 } = await req.json();

        if (!amount || !bookingId || !providerAccountId) {
            return NextResponse.json(
                { error: "Missing required fields" },
                { status: 400 }
            );
        }

        // Convert PLN to grosze (cents equivalent)
        const amountInGrosze = Math.round(amount * 100);

        // Calculate platform fee
        const platformFeeAmount = Math.round(amountInGrosze * (platformFeePercent / 100));

        // Create payment intent with transfer to connected account
        const paymentIntent = await stripe.paymentIntents.create({
            amount: amountInGrosze,
            currency: "pln",
            // Transfer to provider minus platform fee
            application_fee_amount: platformFeeAmount,
            transfer_data: {
                destination: providerAccountId,
            },
            metadata: {
                bookingId,
                providerAccountId,
                platformFeePercent: platformFeePercent.toString(),
            },
            automatic_payment_methods: {
                enabled: true,
            },
        });

        return NextResponse.json({
            clientSecret: paymentIntent.client_secret,
            paymentIntentId: paymentIntent.id,
            platformFee: platformFeeAmount / 100, // Return in PLN
            providerPayout: (amountInGrosze - platformFeeAmount) / 100, // Return in PLN
        });
    } catch (error: unknown) {
        console.error("Error creating split payment:", error);
        const message = error instanceof Error ? error.message : "Failed to create payment";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
