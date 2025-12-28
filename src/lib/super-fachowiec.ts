/**
 * Super-Fachowiec (Superhost) Algorithm
 * 
 * Implementacja algorytmu ewaluacji statusu Super-Fachowiec
 * wzorowanego na Airbnb Superhost.
 * 
 * Kryteria (sprawdzane kwartalnie):
 * 1. Średnia ocen ≥ 4.8
 * 2. Response rate ≥ 90%
 * 3. Cancellation rate < 1%
 * 4. Wolumen: ≥ 10 zleceń LUB ≥ 100 godzin
 */

import {
    doc,
    getDoc,
    setDoc,
    updateDoc,
    collection,
    query,
    where,
    getDocs,
    Timestamp
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
    HostMetrics,
    Review,
    Booking,
    BookingStatus
} from "@/types/firestore-v2";

// ===========================================
// CONFIGURATION
// ===========================================

/** Progi dla statusu Super-Fachowiec */
export const SUPER_FACHOWIEC_THRESHOLDS = {
    minRating: 4.8,
    minResponseRate: 0.90,        // 90%
    maxCancellationRate: 0.01,    // 1%
    minCompletedBookings: 10,
    minTotalHours: 100
} as const;

/** Okno ewaluacji (365 dni) */
const EVALUATION_WINDOW_DAYS = 365;

// ===========================================
// TYPES
// ===========================================

export interface EvaluationResult {
    hostId: string;
    qualifies: boolean;
    metrics: {
        averageRating: number;
        responseRate: number;
        cancellationRate: number;
        completedBookings: number;
        totalHours: number;
    };
    failedCriteria: string[];
    evaluatedAt: Date;
}

export interface SuperFachowiecStatus {
    isSuperFachowiec: boolean;
    since?: Date;
    streak: number;  // Consecutive quarters
    nextEvaluation: Date;
}

// ===========================================
// CORE EVALUATION LOGIC
// ===========================================

/**
 * Główna funkcja ewaluacji statusu Super-Fachowiec
 */
export async function evaluateSuperFachowiecStatus(
    hostId: string
): Promise<EvaluationResult> {
    if (!db) {
        throw new Error('Baza danych niedostępna');
    }

    const now = new Date();
    const windowStart = new Date(now.getTime() - EVALUATION_WINDOW_DAYS * 24 * 60 * 60 * 1000);

    // Pobierz metryki
    const [
        averageRating,
        responseRate,
        cancellationRate,
        bookingStats
    ] = await Promise.all([
        calculateAverageRating(hostId, windowStart),
        calculateResponseRate(hostId, windowStart),
        calculateCancellationRate(hostId, windowStart),
        getBookingStats(hostId, windowStart)
    ]);

    // Sprawdź kryteria
    const failedCriteria: string[] = [];

    if (averageRating < SUPER_FACHOWIEC_THRESHOLDS.minRating) {
        failedCriteria.push(`Średnia ocen: ${averageRating.toFixed(2)} (wymagane: ≥${SUPER_FACHOWIEC_THRESHOLDS.minRating})`);
    }

    if (responseRate < SUPER_FACHOWIEC_THRESHOLDS.minResponseRate) {
        failedCriteria.push(`Response rate: ${(responseRate * 100).toFixed(0)}% (wymagane: ≥${SUPER_FACHOWIEC_THRESHOLDS.minResponseRate * 100}%)`);
    }

    if (cancellationRate > SUPER_FACHOWIEC_THRESHOLDS.maxCancellationRate) {
        failedCriteria.push(`Cancellation rate: ${(cancellationRate * 100).toFixed(1)}% (wymagane: <${SUPER_FACHOWIEC_THRESHOLDS.maxCancellationRate * 100}%)`);
    }

    // Wolumen: spełniony jeśli ≥10 zleceń LUB ≥100 godzin
    const volumeOk =
        bookingStats.completedBookings >= SUPER_FACHOWIEC_THRESHOLDS.minCompletedBookings ||
        bookingStats.totalHours >= SUPER_FACHOWIEC_THRESHOLDS.minTotalHours;

    if (!volumeOk) {
        failedCriteria.push(
            `Wolumen: ${bookingStats.completedBookings} zleceń / ${bookingStats.totalHours.toFixed(0)}h ` +
            `(wymagane: ≥${SUPER_FACHOWIEC_THRESHOLDS.minCompletedBookings} zleceń LUB ≥${SUPER_FACHOWIEC_THRESHOLDS.minTotalHours}h)`
        );
    }

    const qualifies = failedCriteria.length === 0;

    return {
        hostId,
        qualifies,
        metrics: {
            averageRating,
            responseRate,
            cancellationRate,
            completedBookings: bookingStats.completedBookings,
            totalHours: bookingStats.totalHours
        },
        failedCriteria,
        evaluatedAt: now
    };
}

/**
 * Zapisuje wynik ewaluacji do Firestore
 */
export async function saveEvaluationResult(
    result: EvaluationResult
): Promise<void> {
    if (!db) {
        throw new Error('Baza danych niedostępna');
    }

    // Pobierz obecny stan
    const metricsRef = doc(db, 'metrics', result.hostId);
    const metricsSnap = await getDoc(metricsRef);
    const existingMetrics = metricsSnap.exists() ? metricsSnap.data() as HostMetrics : null;

    // Oblicz streak
    let streak = 0;
    let superFachowiecSince: Timestamp | undefined;

    if (result.qualifies) {
        if (existingMetrics?.isSuperFachowiec) {
            // Kontynuacja statusu
            streak = (existingMetrics.superFachowiecStreak || 0) + 1;
            superFachowiecSince = existingMetrics.superFachowiecSince;
        } else {
            // Nowy Super-Fachowiec
            streak = 1;
            superFachowiecSince = Timestamp.now();
        }
    }

    // Oblicz datę następnej ewaluacji (początek następnego kwartału)
    const nextEvaluation = getNextQuarterStart();

    const metricsData: HostMetrics = {
        hostId: result.hostId,
        responseRate: result.metrics.responseRate,
        cancellationRate: result.metrics.cancellationRate,
        acceptanceRate: 0, // TODO: Implement
        completedBookings: result.metrics.completedBookings,
        totalHoursWorked: result.metrics.totalHours,
        totalEarnings: 0, // TODO: Implement
        overallRating: result.metrics.averageRating,
        ratingBreakdown: {
            communication: 0,
            quality: 0,
            timeliness: 0,
            value: 0
        },
        isSuperFachowiec: result.qualifies,
        superFachowiecSince,
        superFachowiecStreak: streak,
        lastEvaluatedAt: Timestamp.fromDate(result.evaluatedAt),
        nextEvaluationAt: Timestamp.fromDate(nextEvaluation),
        last30DaysBookings: 0, // TODO: Implement
        last30DaysRating: 0 // TODO: Implement
    };

    await setDoc(metricsRef, metricsData, { merge: true });

    // Aktualizuj flagę w profilu użytkownika
    const userRef = doc(db, 'users', result.hostId);
    await updateDoc(userRef, {
        'fachowiecProfile.isSuperFachowiec': result.qualifies,
        updatedAt: Timestamp.now()
    });

    console.log(
        `✅ Ewaluacja ${result.hostId}: ${result.qualifies ? 'SUPER-FACHOWIEC' : 'Nie kwalifikuje się'} ` +
        `(streak: ${streak})`
    );
}

// ===========================================
// METRIC CALCULATIONS
// ===========================================

/**
 * Oblicza średnią ocenę z opublikowanych recenzji
 */
async function calculateAverageRating(
    hostId: string,
    since: Date
): Promise<number> {
    if (!db) return 0;

    try {
        const reviewsRef = collection(db, 'reviews');
        const q = query(
            reviewsRef,
            where('targetId', '==', hostId),
            where('published', '==', true)
        );

        const snapshot = await getDocs(q);

        if (snapshot.empty) {
            return 0;
        }

        const reviews = snapshot.docs
            .map(d => d.data() as Review)
            .filter(r => r.createdAt.toDate() >= since);

        if (reviews.length === 0) {
            return 0;
        }

        const totalRating = reviews.reduce((sum, r) => sum + r.rating, 0);
        return totalRating / reviews.length;

    } catch (error) {
        console.error('Error calculating average rating:', error);
        return 0;
    }
}

/**
 * Oblicza response rate (% odpowiedzi w <24h)
 */
async function calculateResponseRate(
    hostId: string,
    since: Date
): Promise<number> {
    if (!db) return 0;

    try {
        // Pobierz wszystkie rezerwacje gdzie host jest odbiorcą
        const bookingsRef = collection(db, 'bookings');
        const q = query(
            bookingsRef,
            where('hostId', '==', hostId)
        );

        const snapshot = await getDocs(q);

        if (snapshot.empty) {
            return 1; // Brak rezerwacji = 100% (nie można obliczyć)
        }

        const bookings = snapshot.docs
            .map(d => d.data() as Booking)
            .filter(b => b.createdAt.toDate() >= since);

        if (bookings.length === 0) {
            return 1;
        }

        // Zlicz rezerwacje gdzie host odpowiedział (przeszły poza INQUIRY/PENDING_APPROVAL/EXPIRED)
        const respondedStatuses: BookingStatus[] = [
            'PENDING_PAYMENT', 'CONFIRMED', 'ACTIVE', 'COMPLETED',
            'CANCELED_BY_HOST' // Anulowanie też jest formą odpowiedzi
        ];

        const respondedBookings = bookings.filter(b =>
            respondedStatuses.includes(b.status) || b.status === 'CANCELED_BY_GUEST'
        );

        // Wyklucz te, które wygasły (host nie odpowiedział)
        const expiredBookings = bookings.filter(b => b.status === 'EXPIRED');

        const totalRequiringResponse = respondedBookings.length + expiredBookings.length;

        if (totalRequiringResponse === 0) {
            return 1;
        }

        return respondedBookings.length / totalRequiringResponse;

    } catch (error) {
        console.error('Error calculating response rate:', error);
        return 0;
    }
}

/**
 * Oblicza cancellation rate (% anulowań przez hosta)
 */
async function calculateCancellationRate(
    hostId: string,
    since: Date
): Promise<number> {
    if (!db) return 0;

    try {
        const bookingsRef = collection(db, 'bookings');
        const q = query(
            bookingsRef,
            where('hostId', '==', hostId)
        );

        const snapshot = await getDocs(q);

        if (snapshot.empty) {
            return 0;
        }

        const bookings = snapshot.docs
            .map(d => d.data() as Booking)
            .filter(b => b.createdAt.toDate() >= since);

        // Tylko rezerwacje, które były potwierdzone
        const confirmedStatuses: BookingStatus[] = [
            'CONFIRMED', 'ACTIVE', 'COMPLETED',
            'CANCELED_BY_GUEST', 'CANCELED_BY_HOST'
        ];

        const confirmedBookings = bookings.filter(b =>
            confirmedStatuses.includes(b.status) ||
            b.statusHistory?.some(h => h.status === 'CONFIRMED')
        );

        if (confirmedBookings.length === 0) {
            return 0;
        }

        const canceledByHost = confirmedBookings.filter(b =>
            b.status === 'CANCELED_BY_HOST'
        );

        return canceledByHost.length / confirmedBookings.length;

    } catch (error) {
        console.error('Error calculating cancellation rate:', error);
        return 0;
    }
}

/**
 * Pobiera statystyki rezerwacji (liczba i godziny)
 */
async function getBookingStats(
    hostId: string,
    since: Date
): Promise<{ completedBookings: number; totalHours: number }> {
    if (!db) return { completedBookings: 0, totalHours: 0 };

    try {
        const bookingsRef = collection(db, 'bookings');
        const q = query(
            bookingsRef,
            where('hostId', '==', hostId),
            where('status', '==', 'COMPLETED')
        );

        const snapshot = await getDocs(q);

        const completedBookings = snapshot.docs
            .map(d => d.data() as Booking)
            .filter(b => b.createdAt.toDate() >= since);

        const totalMinutes = completedBookings.reduce((sum, b) => {
            // Jeśli mamy checkIn i checkOut, oblicz rzeczywisty czas
            if (b.checkIn && b.checkOut) {
                const duration = b.checkOut.toDate().getTime() - b.checkIn.toDate().getTime();
                return sum + (duration / (1000 * 60));
            }
            // W przeciwnym razie użyj estimatedDuration
            return sum + (b.estimatedDuration || 60);
        }, 0);

        return {
            completedBookings: completedBookings.length,
            totalHours: totalMinutes / 60
        };

    } catch (error) {
        console.error('Error getting booking stats:', error);
        return { completedBookings: 0, totalHours: 0 };
    }
}

// ===========================================
// SCHEDULING HELPERS
// ===========================================

/**
 * Zwraca datę początku następnego kwartału
 */
function getNextQuarterStart(): Date {
    const now = new Date();
    const month = now.getMonth();
    const year = now.getFullYear();

    // Kwartały: Q1 (sty-mar), Q2 (kwi-cze), Q3 (lip-wrz), Q4 (paź-gru)
    let nextQuarterMonth: number;
    let nextYear = year;

    if (month < 3) {
        nextQuarterMonth = 3; // April
    } else if (month < 6) {
        nextQuarterMonth = 6; // July
    } else if (month < 9) {
        nextQuarterMonth = 9; // October
    } else {
        nextQuarterMonth = 0; // January next year
        nextYear++;
    }

    return new Date(nextYear, nextQuarterMonth, 1, 0, 0, 0);
}

/**
 * Sprawdza czy teraz jest czas ewaluacji kwartalnej
 */
export function isEvaluationTime(): boolean {
    const now = new Date();
    const day = now.getDate();
    const month = now.getMonth();

    // Ewaluacja pierwszego dnia kwartału
    const quarterStarts = [0, 3, 6, 9]; // sty, kwi, lip, paź
    return day === 1 && quarterStarts.includes(month);
}

// ===========================================
// BATCH EVALUATION (dla wszystkich fachowców)
// ===========================================

/**
 * Ewaluuje wszystkich fachowców
 * Powinno być wywoływane przez Cloud Scheduler
 */
export async function evaluateAllHosts(): Promise<{
    total: number;
    qualified: number;
    disqualified: number;
}> {
    if (!db) {
        throw new Error('Baza danych niedostępna');
    }

    try {
        // Pobierz wszystkich fachowców
        const usersRef = collection(db, 'users');
        const q = query(usersRef, where('isFachowiec', '==', true));
        const snapshot = await getDocs(q);

        console.log(`🔄 Rozpoczynam ewaluację ${snapshot.docs.length} fachowców...`);

        let qualified = 0;
        let disqualified = 0;

        for (const userDoc of snapshot.docs) {
            try {
                const result = await evaluateSuperFachowiecStatus(userDoc.id);
                await saveEvaluationResult(result);

                if (result.qualifies) {
                    qualified++;
                } else {
                    disqualified++;
                }

                // Delay między ewaluacjami (rate limiting)
                await new Promise(resolve => setTimeout(resolve, 100));

            } catch (error) {
                console.error(`Error evaluating ${userDoc.id}:`, error);
            }
        }

        console.log(`✅ Ewaluacja zakończona: ${qualified} Super-Fachowców, ${disqualified} nie kwalifikuje się`);

        return {
            total: snapshot.docs.length,
            qualified,
            disqualified
        };

    } catch (error) {
        console.error('Error in batch evaluation:', error);
        throw error;
    }
}

// ===========================================
// UI HELPERS
// ===========================================

/**
 * Generuje opis statusu dla widoku profilu
 */
export function getSuperFachowiecBadgeText(metrics: HostMetrics): string {
    if (!metrics.isSuperFachowiec) {
        return '';
    }

    if (metrics.superFachowiecStreak >= 8) {
        return '🏆 Super-Fachowiec LEGEND (2+ lata)';
    } else if (metrics.superFachowiecStreak >= 4) {
        return '⭐ Super-Fachowiec GOLD (1+ rok)';
    } else {
        return '✨ Super-Fachowiec';
    }
}

/**
 * Generuje opis postępu do statusu Super-Fachowiec
 */
export function getProgressToSuperFachowiec(
    result: EvaluationResult
): { criteria: string; progress: number; met: boolean }[] {
    const { metrics } = result;
    const t = SUPER_FACHOWIEC_THRESHOLDS;

    return [
        {
            criteria: `Średnia ocen ≥ ${t.minRating}`,
            progress: Math.min(100, (metrics.averageRating / t.minRating) * 100),
            met: metrics.averageRating >= t.minRating
        },
        {
            criteria: `Response rate ≥ ${t.minResponseRate * 100}%`,
            progress: Math.min(100, (metrics.responseRate / t.minResponseRate) * 100),
            met: metrics.responseRate >= t.minResponseRate
        },
        {
            criteria: `Cancellation rate < ${t.maxCancellationRate * 100}%`,
            progress: metrics.cancellationRate <= t.maxCancellationRate ? 100 :
                Math.max(0, 100 - (metrics.cancellationRate - t.maxCancellationRate) * 1000),
            met: metrics.cancellationRate < t.maxCancellationRate
        },
        {
            criteria: `Wolumen: ${t.minCompletedBookings}+ zleceń lub ${t.minTotalHours}+h`,
            progress: Math.min(100, Math.max(
                (metrics.completedBookings / t.minCompletedBookings) * 100,
                (metrics.totalHours / t.minTotalHours) * 100
            )),
            met: metrics.completedBookings >= t.minCompletedBookings ||
                metrics.totalHours >= t.minTotalHours
        }
    ];
}
