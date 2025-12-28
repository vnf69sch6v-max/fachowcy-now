"use client";

import { useState, useEffect } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";

export interface Subscription {
    id: string;
    userId: string;
    tier: 'free' | 'pro' | 'enterprise' | 'premium';
    status: 'active' | 'canceled' | 'expired';
    expiresAt: any; // Using any for Timestamp compatibility or importing Timestamp
}

export function useSubscription() {
    const { user } = useAuth();
    const [subscription, setSubscription] = useState<Subscription | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user || !db) {
            setLoading(false);
            return;
        }

        const unsub = onSnapshot(doc(db, "subscriptions", user.uid), (docSnapshot) => {
            if (docSnapshot.exists()) {
                setSubscription(docSnapshot.data() as Subscription);
            } else {
                setSubscription(null);
            }
            setLoading(false);
        });

        return () => unsub();
    }, [user]);

    const isPro = subscription?.tier === "pro" || subscription?.tier === "premium";
    const isPremium = subscription?.tier === "premium";

    return { subscription, loading, isPro, isPremium };
}
