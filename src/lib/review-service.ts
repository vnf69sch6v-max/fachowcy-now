/**
 * Review Service - Double-Blind Review System
 * 
 * Implementacja systemu "ślepej kurtyny" wzorowany na Airbnb:
 * 1. Recenzje są ukryte (published: false) dopóki obie strony nie napiszą swoich
 * 2. Alternatywnie: ujawniane automatycznie po 14 dniach
 * 3. Po publikacji recenzja jest immutable
 */

import {
    doc,
    getDoc,
    updateDoc,
    collection,
    query,
    where,
    getDocs,
    runTransaction,
    Timestamp,
    addDoc
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Review, Booking } from "@/types/firestore-v2";

// ===========================================
// TYPES
// ===========================================

export interface SubmitReviewInput {
    bookingId: string;
    authorId: string;
    rating: 1 | 2 | 3 | 4 | 5;
    content: string;
    categoryRatings?: {
        communication?: 1 | 2 | 3 | 4 | 5;
        quality?: 1 | 2 | 3 | 4 | 5;
        timeliness?: 1 | 2 | 3 | 4 | 5;
        value?: 1 | 2 | 3 | 4 | 5;
    };
}

export interface ReviewSubmitResult {
    success: boolean;
    reviewId?: string;
    pairPublished?: boolean; // true jeśli obie recenzje zostały ujawnione
    error?: string;
}

export interface ReviewPair {
    clientReview: Review | null;
    hostReview: Review | null;
    bothPublished: boolean;
}

// ===========================================
// VALIDATION
// ===========================================

/**
 * Sprawdza czy użytkownik może napisać recenzję dla danej rezerwacji
 */
export async function canSubmitReview(
    bookingId: string,
    authorId: string
): Promise<{ allowed: boolean; reason?: string }> {
    if (!db) {
        return { allowed: false, reason: 'Baza danych niedostępna' };
    }

    try {
        // Sprawdź czy rezerwacja istnieje i jest zakończona
        const bookingRef = doc(db, 'bookings', bookingId);
        const bookingSnap = await getDoc(bookingRef);

        if (!bookingSnap.exists()) {
            return { allowed: false, reason: 'Rezerwacja nie istnieje' };
        }

        const booking = bookingSnap.data() as Booking;

        // Sprawdź czy użytkownik jest uczestnikiem
        if (authorId !== booking.clientId && authorId !== booking.hostId) {
            return { allowed: false, reason: 'Nie jesteś uczestnikiem tej rezerwacji' };
        }

        // Sprawdź status rezerwacji
        if (booking.status !== 'COMPLETED') {
            return { allowed: false, reason: 'Rezerwacja musi być zakończona' };
        }

        // Sprawdź okno recenzji (14 dni)
        if (booking.reviewWindowEndsAt) {
            const now = new Date();
            const windowEnd = booking.reviewWindowEndsAt.toDate();
            if (now > windowEnd) {
                return { allowed: false, reason: 'Okno recenzji wygasło (14 dni)' };
            }
        }

        // Sprawdź czy już nie napisał recenzji
        const existingReview = await getExistingReview(bookingId, authorId);
        if (existingReview) {
            return { allowed: false, reason: 'Już napisałeś recenzję dla tej rezerwacji' };
        }

        return { allowed: true };

    } catch (error) {
        console.error('Error checking review permission:', error);
        return { allowed: false, reason: 'Błąd podczas sprawdzania uprawnień' };
    }
}

/**
 * Pobiera istniejącą recenzję użytkownika dla rezerwacji
 */
async function getExistingReview(
    bookingId: string,
    authorId: string
): Promise<Review | null> {
    if (!db) return null;

    const reviewsRef = collection(db, 'reviews');
    const q = query(
        reviewsRef,
        where('bookingId', '==', bookingId),
        where('authorId', '==', authorId)
    );

    const snapshot = await getDocs(q);

    if (snapshot.empty) {
        return null;
    }

    return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as Review;
}

// ===========================================
// CORE FUNCTIONS
// ===========================================

/**
 * Wysyła recenzję (początkowo ukryta - published: false)
 */
export async function submitReview(
    input: SubmitReviewInput
): Promise<ReviewSubmitResult> {
    if (!db) {
        return { success: false, error: 'Baza danych niedostępna' };
    }

    try {
        // Walidacja
        const validation = await canSubmitReview(input.bookingId, input.authorId);
        if (!validation.allowed) {
            return { success: false, error: validation.reason };
        }

        // Pobierz dane rezerwacji
        const bookingRef = doc(db, 'bookings', input.bookingId);
        const bookingSnap = await getDoc(bookingRef);
        const booking = bookingSnap.data() as Booking;

        // Określ rolę autora i cel recenzji
        const isClient = input.authorId === booking.clientId;
        const authorRole: 'client' | 'host' = isClient ? 'client' : 'host';
        const targetId = isClient ? booking.hostId : booking.clientId;

        const now = Timestamp.now();

        const newReview: Omit<Review, 'id'> = {
            bookingId: input.bookingId,
            authorId: input.authorId,
            authorRole,
            targetId,
            rating: input.rating,
            categoryRatings: input.categoryRatings,
            content: input.content,
            published: false,  // 🔒 Ślepa kurtyna - ukryta do czasu pary
            pairComplete: false,
            flaggedForReview: false,
            createdAt: now,
            publishedAt: null
        };

        // Zapisz recenzję
        const reviewsRef = collection(db, 'reviews');
        const docRef = await addDoc(reviewsRef, newReview);

        // Sprawdź czy druga strona już napisała recenzję
        const pairPublished = await checkAndPublishPair(input.bookingId);

        return {
            success: true,
            reviewId: docRef.id,
            pairPublished
        };

    } catch (error) {
        console.error('Error submitting review:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Błąd podczas wysyłania recenzji'
        };
    }
}

/**
 * Sprawdza czy obie strony napisały recenzje i publikuje je atomowo
 * 
 * To jest serce mechanizmu Double-Blind:
 * - Jeśli tylko jedna strona napisała → recenzje pozostają ukryte
 * - Jeśli obie strony napisały → obie recenzje zostają opublikowane jednocześnie
 */
export async function checkAndPublishPair(bookingId: string): Promise<boolean> {
    if (!db) return false;

    try {
        const reviewsRef = collection(db, 'reviews');
        const q = query(reviewsRef, where('bookingId', '==', bookingId));
        const snapshot = await getDocs(q);

        if (snapshot.docs.length < 2) {
            // Tylko jedna recenzja - nie publikujemy jeszcze
            return false;
        }

        // Mamy dwie recenzje - sprawdź czy to para (klient + host)
        const reviews = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Review));

        const clientReview = reviews.find(r => r.authorRole === 'client');
        const hostReview = reviews.find(r => r.authorRole === 'host');

        if (!clientReview || !hostReview) {
            // Brak pełnej pary
            return false;
        }

        // Jeśli już opublikowane - nic nie rób
        if (clientReview.published && hostReview.published) {
            return true;
        }

        // 🎉 REVEAL - Publikujemy obie recenzje atomowo
        const now = Timestamp.now();

        await runTransaction(db, async (transaction) => {
            const clientReviewRef = doc(db!, 'reviews', clientReview.id);
            const hostReviewRef = doc(db!, 'reviews', hostReview.id);

            transaction.update(clientReviewRef, {
                published: true,
                pairComplete: true,
                publishedAt: now
            });

            transaction.update(hostReviewRef, {
                published: true,
                pairComplete: true,
                publishedAt: now
            });
        });

        console.log(`✅ Review pair published for booking ${bookingId}`);

        // Aktualizuj agregaty ocen (to powinno być w Cloud Function)
        await updateRatingAggregates(clientReview.targetId, hostReview.targetId);

        return true;

    } catch (error) {
        console.error('Error publishing review pair:', error);
        return false;
    }
}

/**
 * Pobiera parę recenzji dla rezerwacji (dla widoku)
 */
export async function getReviewPair(
    bookingId: string,
    viewerId: string
): Promise<ReviewPair> {
    if (!db) {
        return { clientReview: null, hostReview: null, bothPublished: false };
    }

    try {
        const reviewsRef = collection(db, 'reviews');
        const q = query(reviewsRef, where('bookingId', '==', bookingId));
        const snapshot = await getDocs(q);

        const reviews = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Review));

        let clientReview = reviews.find(r => r.authorRole === 'client') || null;
        let hostReview = reviews.find(r => r.authorRole === 'host') || null;

        // Filtruj według zasad Double-Blind
        // Użytkownik widzi swoją recenzję zawsze, ale cudzą tylko gdy published
        if (clientReview && !clientReview.published && clientReview.authorId !== viewerId) {
            clientReview = null; // Ukryj nieujawnioną recenzję drugiej strony
        }

        if (hostReview && !hostReview.published && hostReview.authorId !== viewerId) {
            hostReview = null; // Ukryj nieujawnioną recenzję drugiej strony
        }

        const bothPublished = !!(
            clientReview?.published && hostReview?.published
        );

        return { clientReview, hostReview, bothPublished };

    } catch (error) {
        console.error('Error getting review pair:', error);
        return { clientReview: null, hostReview: null, bothPublished: false };
    }
}

/**
 * Aktualizuje recenzję (tylko gdy niepublikowana)
 */
export async function updateReview(
    reviewId: string,
    authorId: string,
    updates: {
        rating?: 1 | 2 | 3 | 4 | 5;
        content?: string;
        categoryRatings?: Review['categoryRatings'];
    }
): Promise<{ success: boolean; error?: string }> {
    if (!db) {
        return { success: false, error: 'Baza danych niedostępna' };
    }

    try {
        const reviewRef = doc(db, 'reviews', reviewId);
        const reviewSnap = await getDoc(reviewRef);

        if (!reviewSnap.exists()) {
            return { success: false, error: 'Recenzja nie istnieje' };
        }

        const review = reviewSnap.data() as Review;

        // Sprawdź czy autor
        if (review.authorId !== authorId) {
            return { success: false, error: 'Nie jesteś autorem tej recenzji' };
        }

        // Sprawdź czy niepublikowana (immutability po publikacji)
        if (review.published) {
            return { success: false, error: 'Nie można edytować opublikowanej recenzji' };
        }

        await updateDoc(reviewRef, {
            ...updates,
            updatedAt: Timestamp.now()
        });

        return { success: true };

    } catch (error) {
        console.error('Error updating review:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Błąd podczas aktualizacji'
        };
    }
}

// ===========================================
// AGGREGATION (should be Cloud Function)
// ===========================================

/**
 * Aktualizuje agregaty ocen dla użytkowników
 * W produkcji: Cloud Function trigger
 */
async function updateRatingAggregates(
    userId1: string,
    userId2: string
): Promise<void> {
    // Ta logika powinna być w Cloud Function
    // Tutaj tylko sygnatura
    console.log(`TODO: Update rating aggregates for ${userId1} and ${userId2}`);

    // Pseudokod:
    // 1. Pobierz wszystkie opublikowane recenzje gdzie targetId == userId
    // 2. Oblicz średnią
    // 3. Zaktualizuj users/{userId}.fachowiecProfile.ratingAverage
    // 4. Zaktualizuj listings/{listingId}.ratingAverage
    // 5. Zaktualizuj metrics/{userId}.overallRating
}

/**
 * Publikuje niepublikowane recenzje starsze niż 14 dni
 * Powinno być wywoływane przez Cloud Scheduler codziennie
 */
export async function publishExpiredReviews(): Promise<number> {
    if (!db) return 0;

    try {
        const now = new Date();
        const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

        const reviewsRef = collection(db, 'reviews');
        const q = query(
            reviewsRef,
            where('published', '==', false)
        );

        const snapshot = await getDocs(q);
        let publishedCount = 0;

        for (const docSnap of snapshot.docs) {
            const review = docSnap.data() as Review;
            const createdAt = review.createdAt.toDate();

            if (createdAt < fourteenDaysAgo) {
                await updateDoc(doc(db, 'reviews', docSnap.id), {
                    published: true,
                    publishedAt: Timestamp.now()
                });
                publishedCount++;
                console.log(`Published expired review: ${docSnap.id}`);
            }
        }

        return publishedCount;

    } catch (error) {
        console.error('Error publishing expired reviews:', error);
        return 0;
    }
}

// ===========================================
// REVIEW PROMPT (The Nudge)
// ===========================================

/**
 * Generuje wiadomość zachęcającą do napisania recenzji
 * Wykorzystuje "Curiosity Gap" - użytkownik chce zobaczyć co napisała druga strona
 */
export function getReviewPromptMessage(
    hasOtherPartyReviewed: boolean,
    isClient: boolean
): string {
    const otherParty = isClient ? 'Fachowiec' : 'Klient';

    if (hasOtherPartyReviewed) {
        return `🔒 ${otherParty} zostawił opinię! Napisz swoją, aby ją przeczytać.`;
    }

    return `Jak oceniasz współpracę? Podziel się opinią, aby pomóc innym.`;
}

/**
 * Sprawdza czy druga strona napisała recenzję (dla nudge'a)
 */
export async function hasOtherPartyReviewed(
    bookingId: string,
    userId: string
): Promise<boolean> {
    if (!db) return false;

    try {
        const bookingRef = doc(db, 'bookings', bookingId);
        const bookingSnap = await getDoc(bookingRef);

        if (!bookingSnap.exists()) return false;

        const booking = bookingSnap.data() as Booking;
        const otherPartyId = userId === booking.clientId ? booking.hostId : booking.clientId;

        const existingReview = await getExistingReview(bookingId, otherPartyId);
        return existingReview !== null;

    } catch (error) {
        console.error('Error checking other party review:', error);
        return false;
    }
}
