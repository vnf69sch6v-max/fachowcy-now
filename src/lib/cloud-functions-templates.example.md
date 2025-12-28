/**
 * Cloud Functions Templates for FachowcyNow
 * 
 * Ten plik zawiera szablony funkcji, które należy wdrożyć
 * w Firebase Cloud Functions (Node.js).
 * 
 * WAŻNE: Ten kod musi być przeniesiony do katalogu `functions/`
 * projektu Firebase i wymaga konfiguracji:
 * 1. firebase init functions
 * 2. Skopiuj odpowiednie funkcje do functions/src/index.ts
 * 3. npm install w functions/
 * 4. firebase deploy --only functions
 */

import { initializeApp } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
// import * as functions from 'firebase-functions';

// Inicjalizacja (uncomment w Cloud Functions)
// initializeApp();
// const db = getFirestore();

// ===========================================
// TYPY
// ===========================================

interface Review {
    id: string;
    bookingId: string;
    authorId: string;
    authorRole: 'client' | 'host';
    targetId: string;
    rating: number;
    published: boolean;
    pairComplete: boolean;
    createdAt: Timestamp;
    publishedAt: Timestamp | null;
}

interface Booking {
    id: string;
    clientId: string;
    hostId: string;
    status: string;
    reviewWindowEndsAt?: Timestamp;
}

interface HostMetrics {
    hostId: string;
    overallRating: number;
    reviewCount: number;
    // ... inne pola
}

// ===========================================
// TRIGGER: ON REVIEW CREATED
// ===========================================

/**
 * Trigger uruchamiany gdy nowa recenzja jest dodana.
 * Sprawdza czy można opublikować parę recenzji (Double-Blind).
 * 
 * Wdróż jako:
 * exports.onReviewCreated = functions.firestore
 *     .document('reviews/{reviewId}')
 *     .onCreate(async (snap, context) => { ... });
 */
async function onReviewCreatedHandler(
    reviewData: Review,
    reviewId: string,
    db: FirebaseFirestore.Firestore
): Promise<void> {
    console.log(`New review created: ${reviewId} for booking ${reviewData.bookingId}`);

    // Znajdź wszystkie recenzje dla tego bookingu
    const reviewsSnapshot = await db
        .collection('reviews')
        .where('bookingId', '==', reviewData.bookingId)
        .get();

    if (reviewsSnapshot.docs.length < 2) {
        // Tylko jedna recenzja - wyślij powiadomienie do drugiej strony
        console.log('Waiting for the other party to review');

        // Pobierz booking aby znaleźć drugą stronę
        const bookingDoc = await db.collection('bookings').doc(reviewData.bookingId).get();
        if (bookingDoc.exists) {
            const booking = bookingDoc.data() as Booking;
            const otherPartyId = reviewData.authorId === booking.clientId
                ? booking.hostId
                : booking.clientId;

            // TODO: Wyślij push notification
            console.log(`Should notify user ${otherPartyId} about pending review`);
        }
        return;
    }

    // Mamy dwie recenzje - sprawdź czy to para
    const reviews = reviewsSnapshot.docs.map(d => ({ id: d.id, ...d.data() } as Review));
    const clientReview = reviews.find(r => r.authorRole === 'client');
    const hostReview = reviews.find(r => r.authorRole === 'host');

    if (!clientReview || !hostReview) {
        console.log('Incomplete pair - missing client or host review');
        return;
    }

    // Jeśli obie istnieją i nie są opublikowane - publikuj!
    if (!clientReview.published || !hostReview.published) {
        const now = Timestamp.now();
        const batch = db.batch();

        batch.update(db.collection('reviews').doc(clientReview.id), {
            published: true,
            pairComplete: true,
            publishedAt: now
        });

        batch.update(db.collection('reviews').doc(hostReview.id), {
            published: true,
            pairComplete: true,
            publishedAt: now
        });

        await batch.commit();
        console.log(`✅ Published review pair for booking ${reviewData.bookingId}`);

        // Aktualizuj agregaty ocen
        await updateRatingAggregate(db, clientReview.targetId);
        await updateRatingAggregate(db, hostReview.targetId);
    }
}

// ===========================================
// SCHEDULED: PUBLISH EXPIRED REVIEWS
// ===========================================

/**
 * Funkcja uruchamiana codziennie o północy.
 * Publikuje recenzje starsze niż 14 dni.
 * 
 * Wdróż jako:
 * exports.publishExpiredReviews = functions.pubsub
 *     .schedule('0 0 * * *')
 *     .timeZone('Europe/Warsaw')
 *     .onRun(async (context) => { ... });
 */
async function publishExpiredReviewsHandler(
    db: FirebaseFirestore.Firestore
): Promise<{ publishedCount: number }> {
    const now = new Date();
    const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

    const unpublishedReviews = await db
        .collection('reviews')
        .where('published', '==', false)
        .get();

    let publishedCount = 0;
    const batch = db.batch();

    for (const doc of unpublishedReviews.docs) {
        const review = doc.data() as Review;
        const createdAt = review.createdAt.toDate();

        if (createdAt < fourteenDaysAgo) {
            batch.update(doc.ref, {
                published: true,
                publishedAt: Timestamp.now()
            });
            publishedCount++;
            console.log(`Publishing expired review: ${doc.id}`);
        }
    }

    if (publishedCount > 0) {
        await batch.commit();
        console.log(`✅ Published ${publishedCount} expired reviews`);
    }

    return { publishedCount };
}

// ===========================================
// SCHEDULED: EXPIRE PENDING BOOKINGS
// ===========================================

/**
 * Funkcja uruchamiana co godzinę.
 * Wygasza rezerwacje PENDING_APPROVAL starsze niż 24h.
 * 
 * Wdróż jako:
 * exports.expirePendingBookings = functions.pubsub
 *     .schedule('0 * * * *')
 *     .timeZone('Europe/Warsaw')
 *     .onRun(async (context) => { ... });
 */
async function expirePendingBookingsHandler(
    db: FirebaseFirestore.Firestore
): Promise<{ expiredCount: number }> {
    const now = new Date();
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const pendingBookings = await db
        .collection('bookings')
        .where('status', '==', 'PENDING_APPROVAL')
        .get();

    let expiredCount = 0;
    const batch = db.batch();

    for (const doc of pendingBookings.docs) {
        const booking = doc.data() as Booking;
        // Sprawdź createdAt - trzeba dodać to pole do interfejsu
        const createdAt = (booking as any).createdAt?.toDate?.() || new Date();

        if (createdAt < twentyFourHoursAgo) {
            batch.update(doc.ref, {
                status: 'EXPIRED',
                updatedAt: Timestamp.now()
            });
            expiredCount++;
            console.log(`Expiring booking: ${doc.id}`);
        }
    }

    if (expiredCount > 0) {
        await batch.commit();
        console.log(`✅ Expired ${expiredCount} pending bookings`);
    }

    return { expiredCount };
}

// ===========================================
// SCHEDULED: QUARTERLY SUPER-FACHOWIEC EVALUATION
// ===========================================

/**
 * Funkcja uruchamiana 1 dnia każdego kwartału.
 * Ewaluuje wszystkich fachowców i przyznaje/odbiera status.
 * 
 * Wdróż jako:
 * exports.evaluateSuperFachowiecQuarterly = functions.pubsub
 *     .schedule('0 0 1 1,4,7,10 *')
 *     .timeZone('Europe/Warsaw')
 *     .onRun(async (context) => { ... });
 */
async function evaluateSuperFachowiecQuarterlyHandler(
    db: FirebaseFirestore.Firestore
): Promise<{ total: number; qualified: number; disqualified: number }> {
    console.log('Starting quarterly Super-Fachowiec evaluation...');

    const fachowcySnapshot = await db
        .collection('users')
        .where('isFachowiec', '==', true)
        .get();

    let qualified = 0;
    let disqualified = 0;

    for (const userDoc of fachowcySnapshot.docs) {
        try {
            const result = await evaluateSingleHost(db, userDoc.id);
            if (result.qualifies) {
                qualified++;
            } else {
                disqualified++;
            }
        } catch (error) {
            console.error(`Error evaluating ${userDoc.id}:`, error);
        }
    }

    console.log(`✅ Evaluation complete: ${qualified} qualified, ${disqualified} disqualified`);

    return {
        total: fachowcySnapshot.docs.length,
        qualified,
        disqualified
    };
}

// ===========================================
// HELPER: UPDATE RATING AGGREGATE
// ===========================================

async function updateRatingAggregate(
    db: FirebaseFirestore.Firestore,
    targetId: string
): Promise<void> {
    const reviewsSnapshot = await db
        .collection('reviews')
        .where('targetId', '==', targetId)
        .where('published', '==', true)
        .get();

    if (reviewsSnapshot.empty) {
        console.log(`No published reviews for ${targetId}`);
        return;
    }

    const ratings = reviewsSnapshot.docs.map(d => (d.data() as Review).rating);
    const averageRating = ratings.reduce((a, b) => a + b, 0) / ratings.length;

    // Aktualizuj metrics
    await db.collection('metrics').doc(targetId).set({
        overallRating: averageRating,
        reviewCount: ratings.length,
        lastUpdated: Timestamp.now()
    }, { merge: true });

    // Aktualizuj profil użytkownika
    await db.collection('users').doc(targetId).update({
        'fachowiecProfile.ratingAverage': averageRating,
        'fachowiecProfile.reviewCount': ratings.length
    });

    console.log(`Updated rating for ${targetId}: ${averageRating.toFixed(2)} (${ratings.length} reviews)`);
}

// ===========================================
// HELPER: EVALUATE SINGLE HOST
// ===========================================

async function evaluateSingleHost(
    db: FirebaseFirestore.Firestore,
    hostId: string
): Promise<{ qualifies: boolean }> {
    const now = new Date();
    const yearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);

    // Pobierz recenzje
    const reviewsSnapshot = await db
        .collection('reviews')
        .where('targetId', '==', hostId)
        .where('published', '==', true)
        .get();

    const reviews = reviewsSnapshot.docs
        .map(d => d.data() as Review)
        .filter(r => r.createdAt.toDate() >= yearAgo);

    // Pobierz rezerwacje
    const bookingsSnapshot = await db
        .collection('bookings')
        .where('hostId', '==', hostId)
        .get();

    const bookings = bookingsSnapshot.docs.map(d => d.data());

    // Oblicz metryki
    const avgRating = reviews.length > 0
        ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
        : 0;

    const completedBookings = bookings.filter(b => b.status === 'COMPLETED').length;
    const canceledByHost = bookings.filter(b => b.status === 'CANCELED_BY_HOST').length;
    const cancellationRate = completedBookings > 0
        ? canceledByHost / (completedBookings + canceledByHost)
        : 0;

    // Sprawdź kryteria
    const qualifies =
        avgRating >= 4.8 &&
        cancellationRate < 0.01 &&
        completedBookings >= 10;

    // Pobierz obecne metrics
    const metricsDoc = await db.collection('metrics').doc(hostId).get();
    const currentMetrics = metricsDoc.exists ? metricsDoc.data() as HostMetrics : null;
    const wasSuper = (currentMetrics as any)?.isSuperFachowiec || false;

    // Oblicz streak
    let streak = 0;
    let superSince = null;

    if (qualifies) {
        if (wasSuper) {
            streak = ((currentMetrics as any)?.superFachowiecStreak || 0) + 1;
            superSince = (currentMetrics as any)?.superFachowiecSince;
        } else {
            streak = 1;
            superSince = Timestamp.now();
        }
    }

    // Zapisz wynik
    await db.collection('metrics').doc(hostId).set({
        hostId,
        overallRating: avgRating,
        cancellationRate,
        completedBookings,
        isSuperFachowiec: qualifies,
        superFachowiecStreak: streak,
        superFachowiecSince: superSince,
        lastEvaluatedAt: Timestamp.now()
    }, { merge: true });

    // Aktualizuj profil
    await db.collection('users').doc(hostId).update({
        'fachowiecProfile.isSuperFachowiec': qualifies
    });

    console.log(`${hostId}: ${qualifies ? '✅ SUPER' : '❌ NOT SUPER'} (rating: ${avgRating.toFixed(2)}, bookings: ${completedBookings})`);

    return { qualifies };
}

// ===========================================
// TRIGGER: SYNC MAP MARKERS (Read-Heavy Optimization)
// ===========================================

/**
 * Trigger uruchamiany gdy profil fachowca (providers) jest aktualizowany.
 * Synchronizuje zdenormalizowane dane do kolekcji map_markers.
 * 
 * Wdróż jako:
 * exports.syncMapMarkers = functions.firestore
 *     .document('providers/{providerId}')
 *     .onWrite(async (change, context) => { ... });
 */
interface ProviderProfile {
    displayName: string;
    profession: string;
    basePrice: number;
    rating: number;
    reviewCount: number;
    avatarUrl: string | null;
    baseLocation: { lat: number; lng: number };
    geoHash: string;
    isSuperFachowiec: boolean;
    verificationBadge: string;
}

async function syncMapMarkersHandler(
    providerId: string,
    before: ProviderProfile | null,
    after: ProviderProfile | null,
    db: FirebaseFirestore.Firestore
): Promise<void> {
    const mapMarkerRef = db.collection('map_markers').doc(providerId);

    // Dokument usunięty - usuń marker
    if (!after) {
        console.log(`Deleting map marker for ${providerId}`);
        await mapMarkerRef.delete();
        return;
    }

    // Pobierz status online (z provider_status)
    const statusDoc = await db.collection('provider_status').doc(providerId).get();
    const statusData = statusDoc.exists ? statusDoc.data() : { isOnline: false, isBusy: false };

    // Aktualizuj lub utwórz marker
    const mapMarker = {
        id: providerId,
        lat: after.baseLocation.lat,
        lng: after.baseLocation.lng,
        geoHash: after.geoHash || '',
        price: after.basePrice,
        rating: after.rating || 0,
        reviewCount: after.reviewCount || 0,
        isSuperFachowiec: after.isSuperFachowiec || false,
        verificationBadge: after.verificationBadge || 'none',
        thumbnail: after.avatarUrl,
        isOnline: statusData?.isOnline || false,
        isBusy: statusData?.isBusy || false,
        serviceType: after.profession,
        displayName: after.displayName,
        lastSyncedAt: Timestamp.now()
    };

    await mapMarkerRef.set(mapMarker, { merge: true });
    console.log(`✅ Synced map marker for ${providerId}`);
}

/**
 * Trigger dla statusu online - synchronizuje isOnline/isBusy do map_markers
 * 
 * Wdróż jako:
 * exports.syncMapMarkerStatus = functions.firestore
 *     .document('provider_status/{providerId}')
 *     .onWrite(async (change, context) => { ... });
 */
async function syncMapMarkerStatusHandler(
    providerId: string,
    statusData: { isOnline: boolean; isBusy: boolean; currentLocation?: { lat: number; lng: number } } | null,
    db: FirebaseFirestore.Firestore
): Promise<void> {
    if (!statusData) return;

    const mapMarkerRef = db.collection('map_markers').doc(providerId);
    const markerDoc = await mapMarkerRef.get();

    if (!markerDoc.exists) {
        console.log(`Map marker for ${providerId} doesn't exist, skipping status sync`);
        return;
    }

    const update: any = {
        isOnline: statusData.isOnline,
        isBusy: statusData.isBusy,
        lastSyncedAt: Timestamp.now()
    };

    // Jeśli jest live location, zaktualizuj koordynaty
    if (statusData.currentLocation) {
        update.lat = statusData.currentLocation.lat;
        update.lng = statusData.currentLocation.lng;
    }

    await mapMarkerRef.update(update);
    console.log(`✅ Synced status for ${providerId}: online=${statusData.isOnline}, busy=${statusData.isBusy}`);
}

// ===========================================
// EXPORT TEMPLATE
// ===========================================

/**
 * INSTRUKCJA WDROŻENIA:
 * 
 * 1. Utwórz projekt Cloud Functions:
 *    firebase init functions
 * 
 * 2. Skopiuj ten kod do functions/src/index.ts
 * 
 * 3. Uncomment importy i exports:
 * 
 * import * as functions from 'firebase-functions';
 * import { initializeApp } from 'firebase-admin/app';
 * import { getFirestore } from 'firebase-admin/firestore';
 * 
 * initializeApp();
 * const db = getFirestore();
 * 
 * export const onReviewCreated = functions.firestore
 *     .document('reviews/{reviewId}')
 *     .onCreate(async (snap, context) => {
 *         await onReviewCreatedHandler(snap.data() as Review, context.params.reviewId, db);
 *     });
 * 
 * export const publishExpiredReviews = functions.pubsub
 *     .schedule('0 0 * * *')
 *     .timeZone('Europe/Warsaw')
 *     .onRun(async () => {
 *         await publishExpiredReviewsHandler(db);
 *     });
 * 
 * export const expirePendingBookings = functions.pubsub
 *     .schedule('0 * * * *')
 *     .timeZone('Europe/Warsaw')
 *     .onRun(async () => {
 *         await expirePendingBookingsHandler(db);
 *     });
 * 
 * export const evaluateSuperFachowiecQuarterly = functions.pubsub
 *     .schedule('0 0 1 1,4,7,10 *')
 *     .timeZone('Europe/Warsaw')
 *     .onRun(async () => {
 *         await evaluateSuperFachowiecQuarterlyHandler(db);
 *     });
 * 
 * 4. Deploy:
 *    firebase deploy --only functions
 */

export {
    onReviewCreatedHandler,
    publishExpiredReviewsHandler,
    expirePendingBookingsHandler,
    evaluateSuperFachowiecQuarterlyHandler,
    updateRatingAggregate,
    evaluateSingleHost
};
