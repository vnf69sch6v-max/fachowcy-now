"use client";

import { useState } from "react";
import { Check, Shield, Zap, Crown, Loader2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { doc, setDoc, Timestamp, Firestore } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useSubscription } from "@/hooks/useSubscription";

const PLANS = [
    {
        id: "free",
        name: "Start",
        price: 0,
        features: ["Podstawowy profil", "3 zlecenia miesięcznie", "Prowizja 10%"],
        icon: Shield,
        color: "text-slate-400"
    },
    {
        id: "pro",
        name: "Profesjonalista",
        price: 49,
        features: ["Wyróżniony profil", "Nielimitowane zlecenia", "Prowizja 5%", "Odznaka Zweryfikowany"],
        icon: Zap,
        color: "text-blue-400"
    },
    {
        id: "premium",
        name: "Biznes",
        price: 99,
        features: ["Top pozycje w wyszukiwarce", "0% prowizji", "Priorytetowe wsparcie", "Analityka biznesowa"],
        icon: Crown,
        color: "text-amber-400"
    }
];

export function SubscriptionPlans() {
    const { user } = useAuth();
    const { subscription } = useSubscription();
    const [processing, setProcessing] = useState<string | null>(null);

    const handleSubscribe = async (planId: string) => {
        if (!user || !db) return;
        setProcessing(planId);

        // Mock payment delay
        await new Promise(resolve => setTimeout(resolve, 1500));

        try {
            const tier = planId as "free" | "pro" | "premium";
            const now = Timestamp.now();
            const expiresAt = new Timestamp(now.seconds + 30 * 24 * 60 * 60, 0); // +30 days

            await setDoc(doc(db as Firestore, "subscriptions", user.uid), {
                userId: user.uid,
                tier: tier,
                expiresAt: expiresAt,
                features: {
                    priorityListing: tier !== "free",
                    unlimitedBookings: tier !== "free",
                    analytics: tier === "premium"
                }
            }, { merge: true });

        } catch (e) {
            console.error("Subscription error:", e);
        }
        setProcessing(null);
    };

    return (
        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto p-4">
            {PLANS.map((plan) => {
                const Icon = plan.icon;
                const isCurrent = subscription?.tier === plan.id || (!subscription && plan.id === 'free');
                const isProcessing = processing === plan.id;

                return (
                    <div
                        key={plan.id}
                        className={`
                relative bg-slate-900/50 rounded-2xl p-6 border transition-all duration-300
                ${isCurrent ? 'border-emerald-500/50 shadow-lg shadow-emerald-500/10' : 'border-white/10 hover:border-blue-500/30'}
            `}
                    >
                        {isCurrent && (
                            <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-emerald-500 text-white text-xs font-bold rounded-full uppercase tracking-wider">
                                Twój plan
                            </div>
                        )}

                        <div className="text-center mb-6">
                            <div className={`mx-auto w-12 h-12 rounded-xl bg-slate-800 flex items-center justify-center mb-4 ${plan.color}`}>
                                <Icon className="w-6 h-6" />
                            </div>
                            <h3 className="text-xl font-bold text-white mb-2">{plan.name}</h3>
                            <div className="flex items-baseline justify-center gap-1">
                                <span className="text-3xl font-bold text-white">{plan.price}</span>
                                <span className="text-slate-400">zł / mies</span>
                            </div>
                        </div>

                        <ul className="space-y-3 mb-8">
                            {plan.features.map((feat, i) => (
                                <li key={i} className="flex items-start gap-3 text-sm text-slate-300">
                                    <Check className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                                    {feat}
                                </li>
                            ))}
                        </ul>

                        <button
                            onClick={() => handleSubscribe(plan.id)}
                            disabled={isCurrent || !!processing}
                            className={`
                    w-full py-3 rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2
                    ${isCurrent
                                    ? 'bg-slate-800 text-slate-500 cursor-default'
                                    : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-lg shadow-blue-500/20'}
                `}
                        >
                            {isProcessing ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : isCurrent ? (
                                "Aktywny"
                            ) : (
                                "Wybierz plan"
                            )}
                        </button>
                    </div>
                );
            })}
        </div>
    );
}
