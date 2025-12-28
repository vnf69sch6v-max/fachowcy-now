import {
    collection,
    getDocs,
    doc,
    setDoc,
    getDoc,
    Timestamp,
    writeBatch,
    QueryDocumentSnapshot
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
    Booking,
    BookingStatus,
    generateBookingHash,
    ServiceType
} from "@/types/firestore-v2";
import { Order } from "@/types/firestore";

// Status mapping
const STATUS_MAP: Record<string, BookingStatus> = {
    'pending': 'PENDING_APPROVAL',
    'accepted': 'CONFIRMED',
    'en_route': 'ACTIVE',
    'in_progress': 'ACTIVE',
    'completed': 'COMPLETED',
    'cancelled': 'CANCELED_BY_GUEST',
    'rejected': 'CANCELED_BY_HOST' // if exists
};

export interface MigrationStats {
    total: number;
    migrated: number;
    errors: number;
    logs: string[];
}

export async function migrateOrdersToBookings(
    onProgress: (stats: MigrationStats) => void
): Promise<void> {
    const stats: MigrationStats = {
        total: 0,
        migrated: 0,
        errors: 0,
        logs: []
    };

    const addLog = (msg: string) => {
        stats.logs.push(`[${new Date().toLocaleTimeString()}] ${msg}`);
        onProgress({ ...stats });
    };

    if (!db) {
        addLog("❌ Database not initialized");
        return;
    }

    try {
        addLog("🚀 Starting migration...");

        // 1. Fetch legacy orders
        const ordersRef = collection(db, "orders");
        const ordersSnap = await getDocs(ordersRef);

        stats.total = ordersSnap.size;
        addLog(`Found ${stats.total} orders to migrate`);
        onProgress({ ...stats });

        if (stats.total === 0) {
            addLog("Nothing to migrate.");
            return;
        }

        // 2. Process each order
        for (const orderDoc of ordersSnap.docs) {
            try {
                const order = orderDoc.data() as Order;

                // Check if already migrated (check if booking with same ID exists)
                const bookingRef = doc(db, "bookings", order.id);
                const bookingSnap = await getDoc(bookingRef);

                if (bookingSnap.exists()) {
                    addLog(`⚠️ Booking ${order.id} already exists (skipping)`);
                    continue; // Skip existing
                }

                // 3. Prepare snapshots (fetch minimal user data if possible, or use defaults)
                // For simplicity/speed in migration, we'll use "Legacy User" placeholders if fetch fails
                // or try to fetch if we want to be thorough. Let's try to fetch user display names.

                const clientName = await getUserName(order.clientId) || "Klient (Legacy)";
                const providerName = await getUserName(order.providerId) || "Fachowiec (Legacy)";

                // 4. Map Status
                const newStatus = STATUS_MAP[order.status] || 'INQUIRY';

                // 5. Create Booking Object
                const booking: Booking = {
                    id: order.id, // Preserve ID
                    clientId: order.clientId,
                    hostId: order.providerId,
                    listingId: 'legacy-migration',

                    status: newStatus,
                    statusHistory: [{
                        status: newStatus,
                        changedAt: Timestamp.now(),
                        changedBy: 'system-migration',
                        reason: 'Migrated from legacy order'
                    }],

                    listingSnapshot: {
                        title: order.serviceType,
                        serviceType: mapServiceType(order.serviceType),
                        priceAtBooking: order.price?.estimated || 0,
                        priceUnit: 'visit'
                    },
                    hostSnapshot: {
                        displayName: providerName,
                        avatarUrl: null,
                        ratingAtBooking: 0
                    },
                    clientSnapshot: {
                        displayName: clientName,
                        avatarUrl: null
                    },

                    // Use scheduledFor if available, else createdAt + 24h default
                    scheduledDate: (order as any).scheduledFor || order.createdAt,
                    estimatedDuration: 60,

                    serviceLocation: {
                        lat: order.location?.lat || 52.4064,
                        lng: order.location?.lng || 16.9252,
                        address: order.location?.address || 'Adres nieznany'
                    },

                    pricing: {
                        baseAmount: order.price?.estimated || 0,
                        totalAmount: order.price?.estimated || 0,
                        currency: 'PLN'
                    },
                    paymentStatus: 'pending',
                    cancellationPolicy: 'flexible',

                    bookingHash: generateBookingHash(),
                    chatId: `legacy-chat-${order.id}`,

                    createdAt: order.createdAt,
                    updatedAt: Timestamp.now()
                };

                // 6. Write to Firestore
                await setDoc(bookingRef, booking);

                stats.migrated++;
                addLog(`✅ Migrated order: ${order.id} -> ${newStatus}`);
                onProgress({ ...stats });

            } catch (err) {
                console.error(err);
                stats.errors++;
                addLog(`❌ Error migrating ${orderDoc.id}: ${err}`);
                onProgress({ ...stats });
            }
        }

        addLog("🏁 Migration completed!");

    } catch (error) {
        addLog(`❌ Critical migration error: ${error}`);
        onProgress({ ...stats });
    }
}

// Helpers
async function getUserName(uid: string): Promise<string | null> {
    if (!uid) return null;
    try {
        const snap = await getDoc(doc(db!, "users", uid));
        if (snap.exists()) {
            return snap.data().displayName;
        }
    } catch (e) { /* ignore */ }
    return null;
}

function mapServiceType(oldType: string): ServiceType {
    const map: Record<string, ServiceType> = {
        'hydraulik': 'hydraulik',
        'elektryk': 'elektryk',
        'sprzątanie': 'sprzatanie',
        'złota rączka': 'zlota_raczka',
        // add more fuzzy matching if needed
    };
    // Normalize string
    const normalized = oldType.toLowerCase().replace('ą', 'a').replace('ć', 'c').replace('ę', 'e').replace('ł', 'l').replace('ń', 'n').replace('ó', 'o').replace('ś', 's').replace('ź', 'z').replace('ż', 'z');

    return map[oldType] || map[normalized] || 'other';
}
