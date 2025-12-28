"use client";

import { useEffect, useState } from "react";
import { getMessaging, getToken, onMessage } from "firebase/messaging";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";

export function usePushNotifications() {
    const { user } = useAuth();
    const [permission, setPermission] = useState<NotificationPermission>("default");

    useEffect(() => {
        if (typeof window === "undefined" || !user) return;

        const initMessaging = async () => {
            try {
                const perm = await Notification.requestPermission();
                setPermission(perm);

                if (perm === "granted") {
                    const messaging = getMessaging();
                    const token = await getToken(messaging, {
                        vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY
                    });

                    if (db && token) {
                        // Save token to Firestore
                        await setDoc(doc(db, "fcm_tokens", user.uid), {
                            token,
                            updatedAt: serverTimestamp(),
                            userId: user.uid,
                            // Device info could go here
                            userAgent: navigator.userAgent
                        }, { merge: true });
                    }

                    // Handle foreground messages
                    onMessage(messaging, (payload) => {
                        console.log("Foreground message received:", payload);
                        new Notification(payload.notification?.title || "FachowcyNow", {
                            body: payload.notification?.body,
                            icon: "/icon.png"
                        });
                    });
                }
            } catch (e) {
                console.error("Push notification error:", e);
            }
        };

        initMessaging();
    }, [user]);

    return { permission };
}
