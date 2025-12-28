import { NextResponse } from "next/server";
import Stripe from "stripe";

// const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
//     apiVersion: "2024-12-18.acacia" as any
// });

export async function POST(req: Request) {
    try {
        const { amount, bookingId } = await req.json();

        const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
            apiVersion: "2024-12-18.acacia" as any
        });

        const paymentIntent = await stripe.paymentIntents.create({
            amount: Math.round(amount * 100), // Convert to grosze
            currency: "pln",
            metadata: { bookingId }
        });

        return NextResponse.json({
            clientSecret: paymentIntent.client_secret,
            amount
        });
    } catch (error: any) {
        console.error("Stripe Error:", error);
        return NextResponse.json({ error: error.message || "Payment failed" }, { status: 500 });
    }
}
