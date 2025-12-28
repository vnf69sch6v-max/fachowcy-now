"use client";

import { useState, useEffect } from "react";
import {
    collection,
    query,
    where,
    onSnapshot,
    doc,
    Timestamp
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { Booking, bookingConverter, HostMetrics, hostMetricsConverter } from "@/types/firestore-v2";

interface EarningsData {
    todayEarnings: number;
    weeklyEarnings: number;
    weeklyChange: number; // Percentage change from previous week
    monthlyEarnings: number;
    totalEarnings: number;
    completedToday: number;
    completedThisWeek: number;
    pendingCount: number;
    isLoading: boolean;
}

/**
 * Hook do pobierania danych o zarobkach z Firestore
 * @returns EarningsData - dane o zarobkach na żywo
 */
export function useEarnings(): EarningsData {
    const { user } = useAuth();
    const [data, setData] = useState<EarningsData>({
        todayEarnings: 0,
        weeklyEarnings: 0,
        weeklyChange: 0,
        monthlyEarnings: 0,
        totalEarnings: 0,
        completedToday: 0,
        completedThisWeek: 0,
        pendingCount: 0,
        isLoading: true
    });

    useEffect(() => {
        if (!user || !db) {
            setData(prev => ({ ...prev, isLoading: false }));
            return;
        }

        // Calculate date boundaries
        const now = new Date();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const weekStart = new Date(todayStart);
        weekStart.setDate(weekStart.getDate() - weekStart.getDay()); // Start of week (Sunday)
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

        // Previous week boundaries for comparison
        const prevWeekStart = new Date(weekStart);
        prevWeekStart.setDate(prevWeekStart.getDate() - 7);
        const prevWeekEnd = new Date(weekStart);
        prevWeekEnd.setTime(prevWeekEnd.getTime() - 1);

        // Query completed bookings for this host
        const completedQuery = query(
            collection(db, "bookings").withConverter(bookingConverter),
            where("hostId", "==", user.uid),
            where("status", "==", "COMPLETED")
        );

        // Query pending bookings
        const pendingQuery = query(
            collection(db, "bookings").withConverter(bookingConverter),
            where("hostId", "==", user.uid),
            where("status", "in", ["PENDING_APPROVAL", "PENDING_PAYMENT", "CONFIRMED"])
        );

        let completedBookings: Booking[] = [];
        let pendingBookings: Booking[] = [];

        const calculateEarnings = () => {
            let todayEarnings = 0;
            let weeklyEarnings = 0;
            let prevWeekEarnings = 0;
            let monthlyEarnings = 0;
            let totalEarnings = 0;
            let completedToday = 0;
            let completedThisWeek = 0;

            completedBookings.forEach((booking) => {
                const amount = booking.pricing?.totalAmount || 0;
                totalEarnings += amount;

                // Get the completion date from status history or updatedAt
                const completedEntry = booking.statusHistory?.find(s => s.status === 'COMPLETED');
                const completionDate = completedEntry?.changedAt?.toDate() || booking.updatedAt?.toDate();

                if (completionDate) {
                    // Today's earnings
                    if (completionDate >= todayStart) {
                        todayEarnings += amount;
                        completedToday++;
                    }

                    // This week's earnings
                    if (completionDate >= weekStart) {
                        weeklyEarnings += amount;
                        completedThisWeek++;
                    }

                    // Previous week's earnings (for comparison)
                    if (completionDate >= prevWeekStart && completionDate <= prevWeekEnd) {
                        prevWeekEarnings += amount;
                    }

                    // This month's earnings
                    if (completionDate >= monthStart) {
                        monthlyEarnings += amount;
                    }
                }
            });

            // Calculate weekly change percentage
            const weeklyChange = prevWeekEarnings > 0
                ? Math.round(((weeklyEarnings - prevWeekEarnings) / prevWeekEarnings) * 100)
                : weeklyEarnings > 0 ? 100 : 0;

            setData({
                todayEarnings,
                weeklyEarnings,
                weeklyChange,
                monthlyEarnings,
                totalEarnings,
                completedToday,
                completedThisWeek,
                pendingCount: pendingBookings.length,
                isLoading: false
            });
        };

        // Listen for completed bookings
        const unsubCompleted = onSnapshot(completedQuery, (snapshot) => {
            completedBookings = snapshot.docs.map(doc => doc.data());
            calculateEarnings();
        }, (error) => {
            console.error("Error listening for completed bookings:", error);
            setData(prev => ({ ...prev, isLoading: false }));
        });

        // Listen for pending bookings
        const unsubPending = onSnapshot(pendingQuery, (snapshot) => {
            pendingBookings = snapshot.docs.map(doc => doc.data());
            calculateEarnings();
        }, (error) => {
            console.error("Error listening for pending bookings:", error);
        });

        return () => {
            unsubCompleted();
            unsubPending();
        };
    }, [user]);

    return data;
}

/**
 * Hook do pobierania metryk fachowca z kolekcji metrics
 */
export function useHostMetrics(): HostMetrics | null {
    const { user } = useAuth();
    const [metrics, setMetrics] = useState<HostMetrics | null>(null);

    useEffect(() => {
        if (!user || !db) return;

        const metricsRef = doc(db, "metrics", user.uid).withConverter(hostMetricsConverter);

        const unsubscribe = onSnapshot(metricsRef, (snapshot) => {
            if (snapshot.exists()) {
                setMetrics(snapshot.data());
            }
        }, (error) => {
            console.error("Error listening for host metrics:", error);
        });

        return () => unsubscribe();
    }, [user]);

    return metrics;
}
