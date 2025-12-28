/**
 * FachowcyNow 2.0 - Enterprise Firestore Schema
 * 
 * Architektura: Trust & Safety Airbnb + Fintech Night
 * 
 * Kolekcje główne (Root-Level):
 * - users/{uid}
 * - users/{uid}/privateData/{docId}
 * - listings/{listingId}
 * - bookings/{bookingId}
 * - reviews/{reviewId}
 * - metrics/{hostId}
 * - chats/{chatId}
 * - chats/{chatId}/messages/{messageId}
 */

import { Timestamp, DocumentData, FirestoreDataConverter, QueryDocumentSnapshot } from "firebase/firestore";

// ===========================================
// ENUMS & TYPES
// ===========================================

/** Typy usług oferowanych przez fachowców */
export type ServiceType =
    | 'hydraulik'
    | 'elektryk'
    | 'sprzatanie'
    | 'zlota_raczka'
    | 'malarz'
    | 'stolarz'
    | 'klimatyzacja'
    | 'ogrodnik'
    | 'przeprowadzki'
    | 'other';

/** Status weryfikacji tożsamości */
export type VerificationBadge =
    | 'none'           // Brak weryfikacji
    | 'email_verified' // Email zweryfikowany
    | 'id_verified'    // Dokument tożsamości sprawdzony
    | 'business_verified'; // Działalność gospodarcza potwierdzona

/** 
 * Booking Status - Maszyna stanów rezerwacji
 * Wzorzec Airbnb: 8 stanów + przejścia
 */
export type BookingStatus =
    | 'INQUIRY'           // Zapytanie - brak blokady kalendarza
    | 'PENDING_APPROVAL'  // Request to Book - czeka na akceptację hosta (24h)
    | 'PENDING_PAYMENT'   // Autoryzacja płatności w toku
    | 'CONFIRMED'         // Potwierdzone - kalendarz zablokowany
    | 'ACTIVE'            // W trakcie realizacji (checkIn <= now <= checkOut)
    | 'COMPLETED'         // Zakończone - otwarte okno recenzji (14 dni)
    | 'CANCELED_BY_GUEST' // Anulowane przez klienta
    | 'CANCELED_BY_HOST'  // Anulowane przez fachowca
    | 'EXPIRED';          // Host nie odpowiedział w 24h

/** Polityka anulowania */
export type CancellationPolicy =
    | 'flexible'  // Pełny zwrot do 24h przed
    | 'moderate'  // 50% zwrot do 5 dni przed
    | 'strict';   // Brak zwrotu

/** Typ wiadomości w czacie */
export type MessageType =
    | 'text'
    | 'system'
    | 'action'
    | 'image'
    | 'location'
    | 'payment_request';

// ===========================================
// USERS COLLECTION (users/{uid})
// ===========================================

/**
 * Profil użytkownika - publiczne dane
 * Pola PII (Personally Identifiable Information) w podkolekcji privateData
 */
export interface User {
    uid: string;

    // Rola
    isFachowiec: boolean;

    // Identyfikacja publiczna
    displayName: string;
    avatarUrl: string | null;

    // Trust & Safety
    verificationBadge: VerificationBadge;

    // Dla fachowców - agregaty (denormalizacja)
    fachowiecProfile?: {
        headline: string;        // "Hydraulik z 10-letnim doświadczeniem"
        serviceTypes: ServiceType[];
        ratingAverage: number;   // 0.0 - 5.0
        reviewCount: number;
        completedBookings: number;
        responseTimeMinutes: number; // Średni czas odpowiedzi
        isSuperFachowiec: boolean;
    };

    // Metadata
    createdAt: Timestamp;
    updatedAt: Timestamp;
    lastActiveAt: Timestamp;
}

/**
 * Dane prywatne użytkownika (PII)
 * Dostęp: tylko właściciel LUB użytkownik z aktywną rezerwacją
 * Ścieżka: users/{uid}/privateData/sensitive
 */
export interface UserPrivateData {
    fullName: string;
    phone: string;
    email: string;

    // Adres (dla klientów - miejsce realizacji usług)
    address?: {
        street: string;
        city: string;
        postalCode: string;
        apartment?: string;
    };

    // Dla fachowców - dane firmy
    businessInfo?: {
        companyName: string;
        nip: string;
        regon?: string;
    };

    // Hash dokumentu tożsamości (do weryfikacji)
    identityHash?: string;
    identityVerifiedAt?: Timestamp;
}

// ===========================================
// LISTINGS COLLECTION (listings/{listingId})
// ===========================================

/**
 * Oferta usługowa fachowca
 * Odpowiednik "Rooms" w Airbnb
 */
export interface Listing {
    id: string;
    hostId: string; // Referencja do users/{uid}

    // Zawartość oferty
    title: string;
    description: string;
    serviceType: ServiceType;

    // Cennik
    basePrice: number;         // Cena bazowa (za godzinę lub wizytę)
    priceUnit: 'hour' | 'visit' | 'project';
    currency: 'PLN';           // ISO 4217

    // Lokalizacja (dla wyszukiwania geo)
    location: {
        lat: number;
        lng: number;
        city: string;
        district?: string;
    };
    geoHash: string;           // Precision 6 dla promienia ~1km
    geoHashNeighbors: string[]; // Sąsiednie komórki dla zapytań zakresowych
    serviceRadius: number;     // km - maksymalny zasięg dojazdu

    // Tryb rezerwacji (Airbnb pattern)
    instantBookEnabled: boolean;
    instantBookRequirements?: {
        minRating: number;          // Min ocena gościa
        verifiedIdentityRequired: boolean;
    };

    // Agregaty (denormalizacja - aktualizowane przez Cloud Functions)
    ratingAverage: number;
    reviewCount: number;

    // Dostępność
    isActive: boolean;

    // Media
    images: string[];          // URLs do Firebase Storage

    // Metadata
    createdAt: Timestamp;
    updatedAt: Timestamp;
}

// ===========================================
// BOOKINGS COLLECTION (bookings/{bookingId})
// ===========================================

/**
 * Rezerwacja / Zlecenie
 * Zawiera denormalizowane snapshoty dla audytowalności
 */
export interface Booking {
    id: string;

    // Uczestnicy
    clientId: string;
    hostId: string;
    listingId: string;

    // Status (State Machine)
    status: BookingStatus;
    statusHistory: BookingStatusChange[];

    // Denormalizowane snapshoty (IMMUTABLE - stan z momentu rezerwacji)
    listingSnapshot: {
        title: string;
        serviceType: ServiceType;
        priceAtBooking: number;
        priceUnit: 'hour' | 'visit' | 'project';
    };
    hostSnapshot: {
        displayName: string;
        avatarUrl: string | null;
        ratingAtBooking: number;
    };
    clientSnapshot: {
        displayName: string;
        avatarUrl: string | null;
    };

    // Harmonogram
    scheduledDate: Timestamp;      // Data usługi
    estimatedDuration: number;     // Minuty
    checkIn?: Timestamp;           // Faktyczny start (GPS/manual)
    checkOut?: Timestamp;          // Faktyczny koniec

    // Lokalizacja usługi
    serviceLocation: {
        lat: number;
        lng: number;
        address: string;
    };

    // Finanse
    pricing: {
        baseAmount: number;
        additionalCharges?: {
            description: string;
            amount: number;
        }[];
        totalAmount: number;
        currency: 'PLN';
    };
    paymentStatus: 'pending' | 'authorized' | 'captured' | 'refunded' | 'failed';

    // Polityka
    cancellationPolicy: CancellationPolicy;

    // Identyfikator potwierdzenia
    bookingHash: string;           // Np. "FN-2024-ABCD1234"

    // Chat
    chatId: string;                // Referencja do chats/{chatId}

    // Metadata
    createdAt: Timestamp;
    updatedAt: Timestamp;

    // Okno recenzji (otwiera się po COMPLETED)
    reviewWindowEndsAt?: Timestamp; // 14 dni po checkOut
}

/** Historia zmian statusu rezerwacji */
export interface BookingStatusChange {
    status: BookingStatus;
    changedAt: Timestamp;
    changedBy: string;             // uid użytkownika lub 'system'
    reason?: string;               // Powód zmiany (np. przy anulowaniu)
}

// ===========================================
// REVIEWS COLLECTION (reviews/{reviewId})
// ===========================================

/**
 * Recenzja - System Double-Blind
 * 
 * Mechanizm "Ślepej Kurtyny":
 * 1. Autor widzi swoją recenzję (może edytować gdy published=false)
 * 2. Adresat NIE widzi recenzji dopóki:
 *    a) Obie strony napisały swoje recenzje, LUB
 *    b) Minęło 14 dni od zakończenia usługi
 */
export interface Review {
    id: string;

    // Kontekst
    bookingId: string;

    // Autor i cel
    authorId: string;              // Kto napisał
    authorRole: 'client' | 'host'; // Czy klient ocenia hosta czy odwrotnie
    targetId: string;              // Kogo dotyczy

    // Ocena
    rating: 1 | 2 | 3 | 4 | 5;

    // Kategorie ocen (opcjonalne, szczegółowe)
    categoryRatings?: {
        communication?: 1 | 2 | 3 | 4 | 5;
        quality?: 1 | 2 | 3 | 4 | 5;
        timeliness?: 1 | 2 | 3 | 4 | 5;
        value?: 1 | 2 | 3 | 4 | 5;
    };

    // Treść
    content: string;

    // Double-Blind Flag
    published: boolean;            // false = tylko autor widzi
    pairComplete: boolean;         // true = obie strony napisały

    // Moderacja
    flaggedForReview: boolean;
    moderationStatus?: 'pending' | 'approved' | 'rejected';

    // Metadata
    createdAt: Timestamp;
    publishedAt: Timestamp | null; // Kiedy ujawniono (null = jeszcze nie)
}

// ===========================================
// METRICS COLLECTION (metrics/{hostId})
// ===========================================

/**
 * Metryki fachowca - dla algorytmu Super-Fachowiec
 * Aktualizowane asynchronicznie przez Cloud Functions
 */
export interface HostMetrics {
    hostId: string;

    // Performance metrics (rolling 365 days)
    responseRate: number;          // 0.0 - 1.0 (odpowiedzi w <24h)
    cancellationRate: number;      // 0.0 - 1.0 (anulowania przez hosta)
    acceptanceRate: number;        // 0.0 - 1.0 (akceptacje Request to Book)

    // Volume metrics
    completedBookings: number;
    totalHoursWorked: number;
    totalEarnings: number;

    // Rating metrics
    overallRating: number;         // Średnia ważona
    ratingBreakdown: {
        communication: number;
        quality: number;
        timeliness: number;
        value: number;
    };

    // Super-Fachowiec status
    isSuperFachowiec: boolean;
    superFachowiecSince?: Timestamp;
    superFachowiecStreak: number;  // Ile kwartałów z rzędu

    // Evaluation
    lastEvaluatedAt: Timestamp;
    nextEvaluationAt: Timestamp;   // Następna data kwartalnej oceny

    // Trending
    last30DaysBookings: number;
    last30DaysRating: number;
}

// ===========================================
// CHATS COLLECTION (chats/{chatId})
// ===========================================

/**
 * Konwersacja powiązana z rezerwacją
 */
export interface Chat {
    id: string;

    // Kontekst
    bookingId: string;

    // Uczestnicy
    participantIds: string[];      // [clientId, hostId]

    // Podsumowanie (denormalizacja dla listy czatów)
    lastMessage: {
        text: string;
        senderId: string;
        sentAt: Timestamp;
    } | null;

    // Nieprzeczytane
    unreadCount: {
        [participantId: string]: number;
    };

    // Status
    isActive: boolean;             // false po zakończeniu okna recenzji

    // Metadata
    createdAt: Timestamp;
    updatedAt: Timestamp;
}

/**
 * Wiadomość w czacie
 * Ścieżka: chats/{chatId}/messages/{messageId}
 */
export interface ChatMessage {
    id: string;

    // Nadawca
    senderId: string;
    senderName: string;            // Denormalizacja

    // Treść
    type: MessageType;
    text: string;

    // Załączniki
    attachments?: {
        type: 'image' | 'location';
        url?: string;
        lat?: number;
        lng?: number;
    }[];

    // Akcje systemowe
    actionData?: {
        type: 'booking_confirmed' | 'booking_canceled' | 'check_in' | 'check_out' | 'payment_request';
        payload: Record<string, unknown>;
    };

    // Status
    isRead: boolean;
    readAt?: Timestamp;

    // Metadata
    createdAt: Timestamp;
}

// ===========================================
// FIRESTORE CONVERTERS (Type-Safe SDK)
// ===========================================

export const userConverter: FirestoreDataConverter<User> = {
    toFirestore(user: User): DocumentData {
        return { ...user };
    },
    fromFirestore(snapshot: QueryDocumentSnapshot): User {
        const data = snapshot.data();
        return { uid: snapshot.id, ...data } as User;
    }
};

export const listingConverter: FirestoreDataConverter<Listing> = {
    toFirestore(listing: Listing): DocumentData {
        return { ...listing };
    },
    fromFirestore(snapshot: QueryDocumentSnapshot): Listing {
        const data = snapshot.data();
        return { id: snapshot.id, ...data } as Listing;
    }
};

export const bookingConverter: FirestoreDataConverter<Booking> = {
    toFirestore(booking: Booking): DocumentData {
        return { ...booking };
    },
    fromFirestore(snapshot: QueryDocumentSnapshot): Booking {
        const data = snapshot.data();
        return { id: snapshot.id, ...data } as Booking;
    }
};

export const reviewConverter: FirestoreDataConverter<Review> = {
    toFirestore(review: Review): DocumentData {
        return { ...review };
    },
    fromFirestore(snapshot: QueryDocumentSnapshot): Review {
        const data = snapshot.data();
        return { id: snapshot.id, ...data } as Review;
    }
};

export const hostMetricsConverter: FirestoreDataConverter<HostMetrics> = {
    toFirestore(metrics: HostMetrics): DocumentData {
        return { ...metrics };
    },
    fromFirestore(snapshot: QueryDocumentSnapshot): HostMetrics {
        const data = snapshot.data();
        return { hostId: snapshot.id, ...data } as HostMetrics;
    }
};

export const chatConverter: FirestoreDataConverter<Chat> = {
    toFirestore(chat: Chat): DocumentData {
        return { ...chat };
    },
    fromFirestore(snapshot: QueryDocumentSnapshot): Chat {
        const data = snapshot.data();
        return { id: snapshot.id, ...data } as Chat;
    }
};

export const chatMessageConverter: FirestoreDataConverter<ChatMessage> = {
    toFirestore(message: ChatMessage): DocumentData {
        return { ...message };
    },
    fromFirestore(snapshot: QueryDocumentSnapshot): ChatMessage {
        const data = snapshot.data();
        return { id: snapshot.id, ...data } as ChatMessage;
    }
};

// ===========================================
// MAP MARKERS COLLECTION (map_markers/{hostId})
// ===========================================

/**
 * Zdenormalizowane dane dla markerów mapy
 * 
 * Optymalizacja Read-Heavy:
 * - Dokumenty ~200 bajtów vs ~50KB pełnego profilu
 * - Synchronizowane przez Cloud Function onWrite(providers)
 * - Idealne dla zapytań geo-przestrzennych
 */
export interface MapMarker {
    id: string;               // hostId

    // Geolokalizacja
    lat: number;
    lng: number;
    geoHash: string;          // Precision 6 dla zapytań zakresowych

    // Dane do markera
    price: number;            // Cena bazowa
    rating: number;           // 0.0 - 5.0
    reviewCount: number;

    // Trust Signals
    isSuperFachowiec: boolean;
    verificationBadge: VerificationBadge;

    // Thumbnail (Storage URL)
    thumbnail: string | null;

    // Status (z provider_status)
    isOnline: boolean;
    isBusy: boolean;

    // Profesja (dla filtrowania)
    serviceType: ServiceType;
    displayName: string;

    // Sync metadata
    lastSyncedAt: Timestamp;
}

export const mapMarkerConverter: FirestoreDataConverter<MapMarker> = {
    toFirestore(marker: MapMarker): DocumentData {
        return { ...marker };
    },
    fromFirestore(snapshot: QueryDocumentSnapshot): MapMarker {
        const data = snapshot.data();
        return { id: snapshot.id, ...data } as MapMarker;
    }
};

// ===========================================
// UTILITY TYPES
// ===========================================

/** Generator unikalnego Booking Hash */
export function generateBookingHash(): string {
    const year = new Date().getFullYear();
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Bez podobnych znaków (0/O, 1/I)
    let code = '';
    for (let i = 0; i < 8; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return `FN-${year}-${code}`;
}

/** Sprawdza czy status pozwala na przejście */
export const VALID_STATUS_TRANSITIONS: Record<BookingStatus, BookingStatus[]> = {
    'INQUIRY': ['PENDING_APPROVAL', 'PENDING_PAYMENT', 'CANCELED_BY_GUEST'],
    'PENDING_APPROVAL': ['PENDING_PAYMENT', 'EXPIRED', 'CANCELED_BY_HOST', 'CANCELED_BY_GUEST'],
    'PENDING_PAYMENT': ['CONFIRMED', 'CANCELED_BY_GUEST'],
    'CONFIRMED': ['ACTIVE', 'CANCELED_BY_GUEST', 'CANCELED_BY_HOST'],
    'ACTIVE': ['COMPLETED'],
    'COMPLETED': [], // Terminal state
    'CANCELED_BY_GUEST': [], // Terminal state
    'CANCELED_BY_HOST': [], // Terminal state
    'EXPIRED': [], // Terminal state
};

// ===========================================
// AVAILABILITY CALENDAR
// ===========================================

export interface TimeSlot {
    start: string; // "09:00"
    end: string;   // "17:00"
}

export interface DaySchedule {
    dayOfWeek: number; // 0-6 (Sunday-Saturday)
    slots: TimeSlot[];
    isActive: boolean;
}

export interface ProviderSchedule {
    userId: string;
    weeklySchedule: DaySchedule[];
    blockedDates: string[]; // "2024-01-15" - completely blocked days
    instantBooking: boolean;
    maxBookingsPerDay: number;
    updatedAt: Timestamp;
}

export type JobStatus =
    | 'draft'        // Szkic (w AI Chat)
    | 'open'         // Opublikowane na giełdzie
    | 'in_negotiation' // Fachowiec odpowiedział
    | 'accepted'     // Klient zaakceptował propozycję
    | 'in_progress'  // W realizacji
    | 'completed'    // Zakończone
    | 'canceled'     // Anulowane
    | 'expired';     // Wygasło bez odpowiedzi

export interface Job {
    id: string;
    clientId: string;
    clientName: string;
    clientImageUrl?: string;

    title: string;
    description: string;
    category: ServiceType;

    location: {
        lat: number;
        lng: number;
        address: string;
    };
    geoHash: string;

    photoUrls: string[];
    priceEstimate: { min: number; max: number };
    urgency: 'asap' | 'today' | 'week' | 'flexible';
    preferredDate?: Timestamp;

    status: JobStatus;
    source: 'ai_chat' | 'map' | 'marketplace';

    // Assignment
    assignedProId?: string;
    assignedProName?: string;
    proposalIds: string[];
    bookingId?: string;
    chatId?: string;

    // Meta
    createdAt: Timestamp;
    updatedAt: Timestamp;
    expiresAt: Timestamp;
}

export interface JobProposal {
    id: string; // docId in jobs/{jobId}/proposals
    jobId: string;
    proId: string;
    proName: string;
    proAvatarUrl: string;
    proRating: number;

    price: number;
    message: string;
    availability: Timestamp;

    status: 'pending' | 'accepted' | 'rejected' | 'withdrawn';
    createdAt: Timestamp;
}

