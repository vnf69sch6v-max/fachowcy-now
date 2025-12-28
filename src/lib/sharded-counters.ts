/**
 * Sharded Counters for Firestore
 * 
 * Rozwiązanie problemu "hotspots" przy high-frequency writes.
 * Limit Firestore = ~1 zapis/sekundę na dokument.
 * 
 * Strategia: Rozproszenie zapisów na N shardów.
 * - Inkrementacja: losowy shard
 * - Odczyt: suma wszystkich shardów
 * 
 * @see https://firebase.google.com/docs/firestore/solutions/counters
 */

import {
    collection,
    doc,
    getDoc,
    getDocs,
    setDoc,
    increment,
    updateDoc,
    writeBatch,
    Timestamp,
    DocumentReference,
    Firestore
} from "firebase/firestore";
import { db } from "@/lib/firebase";

// ===========================================
// TYPES
// ===========================================

export interface CounterShard {
    count: number;
}

export interface CounterConfig {
    numShards: number;
    lastAggregatedAt?: Timestamp;
    cachedTotal?: number;
}

export type CounterType =
    | 'profile_views'      // Wyświetlenia profilu
    | 'listing_views'      // Wyświetlenia ogłoszenia
    | 'search_appearances' // Pojawienia się w wynikach
    | 'contact_clicks';    // Kliknięcia kontaktu

// ===========================================
// INITIALIZATION
// ===========================================

/**
 * Inicjalizuje distributed counter z określoną liczbą shardów.
 * 
 * Struktura:
 * counters/{entityId}_{counterType}/
 *   - config: { numShards: 10 }
 *   - shards/{0..9}: { count: 0 }
 * 
 * @param entityId - ID encji (np. providerId, listingId)
 * @param counterType - Typ licznika
 * @param numShards - Liczba shardów (domyślnie 10)
 */
export async function initializeCounter(
    entityId: string,
    counterType: CounterType,
    numShards: number = 10
): Promise<void> {
    if (!db) throw new Error("Firestore not initialized");

    const counterId = `${entityId}_${counterType}`;
    const counterRef = doc(db, "counters", counterId);

    // Batch write dla atomowości
    const batch = writeBatch(db);

    // Config document
    batch.set(counterRef, {
        numShards,
        lastAggregatedAt: undefined,
        cachedTotal: 0,
        createdAt: Timestamp.now()
    } as CounterConfig);

    // Shard documents
    for (let i = 0; i < numShards; i++) {
        const shardRef = doc(db, "counters", counterId, "shards", i.toString());
        batch.set(shardRef, { count: 0 } as CounterShard);
    }

    await batch.commit();
    console.log(`✅ Initialized counter: ${counterId} with ${numShards} shards`);
}

// ===========================================
// INCREMENT (Write)
// ===========================================

/**
 * Inkrementuje losowy shard licznika.
 * Rozproszenie zapisów zapobiega hotspotom.
 * 
 * @param entityId - ID encji
 * @param counterType - Typ licznika
 * @param delta - Wartość inkrementacji (domyślnie 1)
 */
export async function incrementCounter(
    entityId: string,
    counterType: CounterType,
    delta: number = 1
): Promise<void> {
    if (!db) throw new Error("Firestore not initialized");

    const counterId = `${entityId}_${counterType}`;
    const counterRef = doc(db, "counters", counterId);

    // Pobierz config aby znać liczbę shardów
    const configSnap = await getDoc(counterRef);

    if (!configSnap.exists()) {
        // Auto-inicjalizacja jeśli nie istnieje
        await initializeCounter(entityId, counterType);
    }

    const config = configSnap.data() as CounterConfig | undefined;
    const numShards = config?.numShards || 10;

    // Losuj shard ID
    const shardId = Math.floor(Math.random() * numShards);
    const shardRef = doc(db, "counters", counterId, "shards", shardId.toString());

    // Atomic increment
    await updateDoc(shardRef, {
        count: increment(delta)
    });
}

// ===========================================
// GET COUNT (Read)
// ===========================================

/**
 * Pobiera aktualną wartość licznika (suma wszystkich shardów).
 * 
 * UWAGA: Kosztuje N operacji odczytu (1 per shard).
 * Dla częstych odczytów użyj getCachedCount().
 * 
 * @param entityId - ID encji
 * @param counterType - Typ licznika
 * @returns Suma wszystkich shardów
 */
export async function getCount(
    entityId: string,
    counterType: CounterType
): Promise<number> {
    if (!db) throw new Error("Firestore not initialized");

    const counterId = `${entityId}_${counterType}`;
    const shardsRef = collection(db, "counters", counterId, "shards");

    const snapshot = await getDocs(shardsRef);

    let totalCount = 0;
    snapshot.forEach(doc => {
        const shard = doc.data() as CounterShard;
        totalCount += shard.count || 0;
    });

    return totalCount;
}

/**
 * Pobiera cached total z głównego dokumentu (1 odczyt).
 * Dane są "eventually consistent" - aktualizowane przez Cloud Function.
 * 
 * @param entityId - ID encji
 * @param counterType - Typ licznika
 * @returns Cached total lub 0 jeśli brak
 */
export async function getCachedCount(
    entityId: string,
    counterType: CounterType
): Promise<number> {
    if (!db) throw new Error("Firestore not initialized");

    const counterId = `${entityId}_${counterType}`;
    const counterRef = doc(db, "counters", counterId);

    const snap = await getDoc(counterRef);
    if (!snap.exists()) return 0;

    const config = snap.data() as CounterConfig;
    return config.cachedTotal || 0;
}

// ===========================================
// AGGREGATION (For Cloud Function)
// ===========================================

/**
 * Agreguje shardy i aktualizuje cachedTotal.
 * Wywoływane przez Cloud Function co 1 minutę.
 * 
 * @param entityId - ID encji
 * @param counterType - Typ licznika
 */
export async function aggregateCounter(
    entityId: string,
    counterType: CounterType
): Promise<number> {
    if (!db) throw new Error("Firestore not initialized");

    const counterId = `${entityId}_${counterType}`;
    const counterRef = doc(db, "counters", counterId);

    // Pobierz sumę
    const total = await getCount(entityId, counterType);

    // Zaktualizuj cache
    await updateDoc(counterRef, {
        cachedTotal: total,
        lastAggregatedAt: Timestamp.now()
    });

    return total;
}

/**
 * Batch agregacja wszystkich liczników danej encji.
 * Użyteczne w Cloud Function.
 */
export async function aggregateAllCountersForEntity(
    entityId: string,
    counterTypes: CounterType[] = ['profile_views', 'listing_views', 'search_appearances', 'contact_clicks']
): Promise<Record<CounterType, number>> {
    const results: Record<string, number> = {};

    for (const type of counterTypes) {
        try {
            results[type] = await aggregateCounter(entityId, type);
        } catch (e) {
            // Counter may not exist
            results[type] = 0;
        }
    }

    return results as Record<CounterType, number>;
}

// ===========================================
// CONVENIENCE WRAPPERS
// ===========================================

/**
 * Zwiększa licznik wyświetleń profilu fachowca.
 */
export async function trackProfileView(providerId: string): Promise<void> {
    await incrementCounter(providerId, 'profile_views');
}

/**
 * Zwiększa licznik wyświetleń ogłoszenia.
 */
export async function trackListingView(listingId: string): Promise<void> {
    await incrementCounter(listingId, 'listing_views');
}

/**
 * Zwiększa licznik pojawień w wynikach wyszukiwania.
 */
export async function trackSearchAppearance(providerId: string): Promise<void> {
    await incrementCounter(providerId, 'search_appearances');
}

/**
 * Zwiększa licznik kliknięć w dane kontaktowe.
 */
export async function trackContactClick(providerId: string): Promise<void> {
    await incrementCounter(providerId, 'contact_clicks');
}

// ===========================================
// STATS HELPER
// ===========================================

export interface ProviderStats {
    profileViews: number;
    searchAppearances: number;
    contactClicks: number;
    conversionRate: number; // contactClicks / profileViews
}

/**
 * Pobiera zagregowane statystyki dla fachowca.
 * Używa cached values dla wydajności.
 */
export async function getProviderStats(providerId: string): Promise<ProviderStats> {
    const [profileViews, searchAppearances, contactClicks] = await Promise.all([
        getCachedCount(providerId, 'profile_views'),
        getCachedCount(providerId, 'search_appearances'),
        getCachedCount(providerId, 'contact_clicks')
    ]);

    return {
        profileViews,
        searchAppearances,
        contactClicks,
        conversionRate: profileViews > 0 ? contactClicks / profileViews : 0
    };
}
