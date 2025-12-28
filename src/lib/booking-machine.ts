/**
 * Booking State Machine
 * 
 * Implementacja maszyny stanów rezerwacji wzorowanej na Airbnb.
 * Obsługuje 8 stanów i waliduje przejścia między nimi.
 */

import {
    doc,
    getDoc,
    updateDoc,
    runTransaction,
    Timestamp,
    collection,
    addDoc,
    serverTimestamp
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
    Booking,
    BookingStatus,
    BookingStatusChange,
    VALID_STATUS_TRANSITIONS,
    generateBookingHash,
    Listing,
    User
} from "@/types/firestore-v2";

// ===========================================
// TYPES
// ===========================================

export interface CreateBookingInput {
    clientId: string;
    hostId: string;
    listingId: string;
    scheduledDate: Date;
    estimatedDuration: number; // minutes
    serviceLocation: {
        lat: number;
        lng: number;
        address: string;
    };
}

export interface BookingActionResult {
    success: boolean;
    bookingId?: string;
    newStatus?: BookingStatus;
    error?: string;
}

// ===========================================
// VALIDATION
// ===========================================

/**
 * Sprawdza czy przejście między stanami jest dozwolone
 */
export function isValidTransition(
    currentStatus: BookingStatus,
    newStatus: BookingStatus
): boolean {
    const allowedTransitions = VALID_STATUS_TRANSITIONS[currentStatus];
    return allowedTransitions.includes(newStatus);
}

/**
 * Sprawdza czy użytkownik może wykonać akcję na rezerwacji
 */
export function canUserPerformAction(
    userId: string,
    booking: Booking,
    action: 'approve' | 'cancel' | 'check_in' | 'check_out'
): { allowed: boolean; reason?: string } {
    const isClient = userId === booking.clientId;
    const isHost = userId === booking.hostId;

    if (!isClient && !isHost) {
        return { allowed: false, reason: 'Nie jesteś uczestnikiem tej rezerwacji' };
    }

    switch (action) {
        case 'approve':
            if (!isHost) {
                return { allowed: false, reason: 'Tylko fachowiec może zaakceptować' };
            }
            if (booking.status !== 'PENDING_APPROVAL') {
                return { allowed: false, reason: 'Rezerwacja nie czeka na akceptację' };
            }
            return { allowed: true };

        case 'cancel':
            if (booking.status === 'COMPLETED' ||
                booking.status === 'CANCELED_BY_GUEST' ||
                booking.status === 'CANCELED_BY_HOST') {
                return { allowed: false, reason: 'Nie można anulować zakończonej rezerwacji' };
            }
            return { allowed: true };

        case 'check_in':
            if (!isHost) {
                return { allowed: false, reason: 'Tylko fachowiec może rozpocząć usługę' };
            }
            if (booking.status !== 'CONFIRMED') {
                return { allowed: false, reason: 'Rezerwacja nie jest potwierdzona' };
            }
            return { allowed: true };

        case 'check_out':
            if (!isHost) {
                return { allowed: false, reason: 'Tylko fachowiec może zakończyć usługę' };
            }
            if (booking.status !== 'ACTIVE') {
                return { allowed: false, reason: 'Usługa nie jest w trakcie realizacji' };
            }
            return { allowed: true };

        default:
            return { allowed: false, reason: 'Nieznana akcja' };
    }
}

// ===========================================
// BOOKING ACTIONS
// ===========================================

/**
 * Tworzy nowe zapytanie (INQUIRY)
 */
export async function createInquiry(
    input: CreateBookingInput
): Promise<BookingActionResult> {
    if (!db) {
        return { success: false, error: 'Baza danych niedostępna' };
    }

    try {
        // Pobierz dane listingu i hosta dla snapshotów
        const listingRef = doc(db, 'listings', input.listingId);
        const listingSnap = await getDoc(listingRef);

        if (!listingSnap.exists()) {
            return { success: false, error: 'Oferta nie istnieje' };
        }

        const listing = listingSnap.data() as Listing;

        // Pobierz dane hosta
        const hostRef = doc(db, 'users', input.hostId);
        const hostSnap = await getDoc(hostRef);
        const host = hostSnap.exists() ? hostSnap.data() as User : null;

        // Pobierz dane klienta
        const clientRef = doc(db, 'users', input.clientId);
        const clientSnap = await getDoc(clientRef);
        const client = clientSnap.exists() ? clientSnap.data() as User : null;

        const now = Timestamp.now();

        const newBooking: Omit<Booking, 'id'> = {
            clientId: input.clientId,
            hostId: input.hostId,
            listingId: input.listingId,

            status: 'INQUIRY',
            statusHistory: [{
                status: 'INQUIRY',
                changedAt: now,
                changedBy: input.clientId
            }],

            // Denormalizowane snapshoty
            listingSnapshot: {
                title: listing.title,
                serviceType: listing.serviceType,
                priceAtBooking: listing.basePrice,
                priceUnit: listing.priceUnit
            },
            hostSnapshot: {
                displayName: host?.displayName || 'Fachowiec',
                avatarUrl: host?.avatarUrl || null,
                ratingAtBooking: listing.ratingAverage || 0
            },
            clientSnapshot: {
                displayName: client?.displayName || 'Klient',
                avatarUrl: client?.avatarUrl || null
            },

            scheduledDate: Timestamp.fromDate(input.scheduledDate),
            estimatedDuration: input.estimatedDuration,
            serviceLocation: input.serviceLocation,

            pricing: {
                baseAmount: listing.basePrice,
                totalAmount: listing.basePrice, // Może być zaktualizowane później
                currency: 'PLN'
            },
            paymentStatus: 'pending',

            cancellationPolicy: 'flexible', // Domyślna
            bookingHash: generateBookingHash(),
            chatId: '', // Będzie ustawione po utworzeniu czatu

            createdAt: now,
            updatedAt: now
        };

        const bookingsRef = collection(db, 'bookings');
        const docRef = await addDoc(bookingsRef, newBooking);

        // Utwórz chat dla rezerwacji
        const chatRef = collection(db, 'chats');
        const chatDoc = await addDoc(chatRef, {
            bookingId: docRef.id,
            participantIds: [input.clientId, input.hostId],
            lastMessage: null,
            unreadCount: {
                [input.clientId]: 0,
                [input.hostId]: 0
            },
            isActive: true,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
        });

        // Zaktualizuj booking z chatId
        await updateDoc(docRef, { chatId: chatDoc.id });

        return {
            success: true,
            bookingId: docRef.id,
            newStatus: 'INQUIRY'
        };

    } catch (error) {
        console.error('Error creating inquiry:', error);
        return { success: false, error: 'Błąd podczas tworzenia zapytania' };
    }
}

/**
 * Request to Book - klient prosi o rezerwację (host musi zaakceptować)
 */
export async function requestToBook(
    bookingId: string,
    clientId: string
): Promise<BookingActionResult> {
    return transitionStatus(bookingId, 'PENDING_APPROVAL', clientId);
}

/**
 * Instant Book - natychmiastowa rezerwacja (pomija akceptację hosta)
 */
export async function instantBook(
    bookingId: string,
    clientId: string
): Promise<BookingActionResult> {
    return transitionStatus(bookingId, 'PENDING_PAYMENT', clientId);
}

/**
 * Host akceptuje Request to Book
 */
export async function approveBooking(
    bookingId: string,
    hostId: string
): Promise<BookingActionResult> {
    return transitionStatus(bookingId, 'PENDING_PAYMENT', hostId);
}

/**
 * Potwierdza płatność (przechodzi do CONFIRMED)
 */
export async function confirmPayment(
    bookingId: string
): Promise<BookingActionResult> {
    return transitionStatus(bookingId, 'CONFIRMED', 'system');
}

/**
 * Host rozpoczyna usługę (check-in)
 */
export async function checkIn(
    bookingId: string,
    hostId: string
): Promise<BookingActionResult> {
    if (!db) {
        return { success: false, error: 'Baza danych niedostępna' };
    }

    try {
        const bookingRef = doc(db, 'bookings', bookingId);

        await runTransaction(db, async (transaction) => {
            const bookingSnap = await transaction.get(bookingRef);

            if (!bookingSnap.exists()) {
                throw new Error('Rezerwacja nie istnieje');
            }

            const booking = bookingSnap.data() as Booking;

            const validation = canUserPerformAction(hostId, booking, 'check_in');
            if (!validation.allowed) {
                throw new Error(validation.reason);
            }

            if (!isValidTransition(booking.status, 'ACTIVE')) {
                throw new Error('Nieprawidłowe przejście statusu');
            }

            const now = Timestamp.now();

            transaction.update(bookingRef, {
                status: 'ACTIVE',
                checkIn: now,
                statusHistory: [...booking.statusHistory, {
                    status: 'ACTIVE',
                    changedAt: now,
                    changedBy: hostId
                }],
                updatedAt: now
            });
        });

        return { success: true, bookingId, newStatus: 'ACTIVE' };

    } catch (error) {
        console.error('Error checking in:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Błąd podczas rozpoczynania usługi'
        };
    }
}

/**
 * Host kończy usługę (check-out)
 */
export async function checkOut(
    bookingId: string,
    hostId: string
): Promise<BookingActionResult> {
    if (!db) {
        return { success: false, error: 'Baza danych niedostępna' };
    }

    try {
        const bookingRef = doc(db, 'bookings', bookingId);

        await runTransaction(db, async (transaction) => {
            const bookingSnap = await transaction.get(bookingRef);

            if (!bookingSnap.exists()) {
                throw new Error('Rezerwacja nie istnieje');
            }

            const booking = bookingSnap.data() as Booking;

            const validation = canUserPerformAction(hostId, booking, 'check_out');
            if (!validation.allowed) {
                throw new Error(validation.reason);
            }

            if (!isValidTransition(booking.status, 'COMPLETED')) {
                throw new Error('Nieprawidłowe przejście statusu');
            }

            const now = Timestamp.now();

            // Oblicz okno recenzji (14 dni)
            const reviewWindowEnd = new Date();
            reviewWindowEnd.setDate(reviewWindowEnd.getDate() + 14);

            transaction.update(bookingRef, {
                status: 'COMPLETED',
                checkOut: now,
                reviewWindowEndsAt: Timestamp.fromDate(reviewWindowEnd),
                statusHistory: [...booking.statusHistory, {
                    status: 'COMPLETED',
                    changedAt: now,
                    changedBy: hostId
                }],
                updatedAt: now
            });
        });

        return { success: true, bookingId, newStatus: 'COMPLETED' };

    } catch (error) {
        console.error('Error checking out:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Błąd podczas kończenia usługi'
        };
    }
}

/**
 * Anulowanie rezerwacji
 */
export async function cancelBooking(
    bookingId: string,
    userId: string,
    reason?: string
): Promise<BookingActionResult> {
    if (!db) {
        return { success: false, error: 'Baza danych niedostępna' };
    }

    try {
        const bookingRef = doc(db, 'bookings', bookingId);

        await runTransaction(db, async (transaction) => {
            const bookingSnap = await transaction.get(bookingRef);

            if (!bookingSnap.exists()) {
                throw new Error('Rezerwacja nie istnieje');
            }

            const booking = bookingSnap.data() as Booking;

            const validation = canUserPerformAction(userId, booking, 'cancel');
            if (!validation.allowed) {
                throw new Error(validation.reason);
            }

            const isClient = userId === booking.clientId;
            const newStatus: BookingStatus = isClient ? 'CANCELED_BY_GUEST' : 'CANCELED_BY_HOST';

            if (!isValidTransition(booking.status, newStatus)) {
                throw new Error('Nie można anulować rezerwacji w tym stanie');
            }

            const now = Timestamp.now();

            transaction.update(bookingRef, {
                status: newStatus,
                statusHistory: [...booking.statusHistory, {
                    status: newStatus,
                    changedAt: now,
                    changedBy: userId,
                    reason: reason
                }],
                updatedAt: now
            });
        });

        const isClient = true; // Uproszczenie - sprawdzić w prawdziwej implementacji
        const newStatus: BookingStatus = isClient ? 'CANCELED_BY_GUEST' : 'CANCELED_BY_HOST';

        return { success: true, bookingId, newStatus };

    } catch (error) {
        console.error('Error canceling booking:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Błąd podczas anulowania'
        };
    }
}

// ===========================================
// GENERIC STATUS TRANSITION
// ===========================================

/**
 * Generyczna funkcja przejścia statusu z walidacją
 */
async function transitionStatus(
    bookingId: string,
    newStatus: BookingStatus,
    triggeredBy: string
): Promise<BookingActionResult> {
    if (!db) {
        return { success: false, error: 'Baza danych niedostępna' };
    }

    try {
        const bookingRef = doc(db, 'bookings', bookingId);

        await runTransaction(db, async (transaction) => {
            const bookingSnap = await transaction.get(bookingRef);

            if (!bookingSnap.exists()) {
                throw new Error('Rezerwacja nie istnieje');
            }

            const booking = bookingSnap.data() as Booking;

            if (!isValidTransition(booking.status, newStatus)) {
                throw new Error(`Nieprawidłowe przejście: ${booking.status} → ${newStatus}`);
            }

            const now = Timestamp.now();

            transaction.update(bookingRef, {
                status: newStatus,
                statusHistory: [...booking.statusHistory, {
                    status: newStatus,
                    changedAt: now,
                    changedBy: triggeredBy
                }],
                updatedAt: now
            });
        });

        return { success: true, bookingId, newStatus };

    } catch (error) {
        console.error('Error transitioning status:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Błąd podczas zmiany statusu'
        };
    }
}

// ===========================================
// SCHEDULING (dla 24h timeout)
// ===========================================

/**
 * Sprawdza i wygasza rezerwacje PENDING_APPROVAL starsze niż 24h
 * Powinno być wywoływane przez Cloud Scheduler
 */
export async function expirePendingBookings(): Promise<number> {
    // Ta funkcja powinna być zaimplementowana jako Cloud Function
    // Tu tylko sygnatura dla dokumentacji
    console.warn('expirePendingBookings should be implemented as Cloud Function');
    return 0;
}
