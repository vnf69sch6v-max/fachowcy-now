import { loadStripe } from "@stripe/stripe-js";

export const stripePromise = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
    ? loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY)
    : null;

export interface PaymentIntent {
    clientSecret: string;
    amount: number;
}

export async function createPaymentIntent(amount: number, bookingId: string): Promise<PaymentIntent> {
    const response = await fetch("/api/stripe/create-payment-intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount, bookingId })
    });
    return response.json();
}
