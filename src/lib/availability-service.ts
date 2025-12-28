import { db } from "@/lib/firebase";
import { ProviderSchedule, Booking } from "@/types/firestore-v2";
import { doc, getDoc, setDoc, collection, query, where, getDocs, Timestamp } from "firebase/firestore";

export class AvailabilityService {

    /**
     * Creates or updates a provider's schedule
     */
    static async saveSchedule(userId: string, schedule: Partial<ProviderSchedule>): Promise<void> {
        if (!db) throw new Error("Database unavailable");

        const scheduleRef = doc(db, "provider_schedules", userId);
        const now = Timestamp.now();

        await setDoc(scheduleRef, {
            ...schedule,
            userId,
            updatedAt: now
        }, { merge: true });
    }

    /**
     * Gets a provider's schedule
     */
    static async getSchedule(userId: string): Promise<ProviderSchedule | null> {
        if (!db) return null;

        const scheduleRef = doc(db, "provider_schedules", userId);
        const snap = await getDoc(scheduleRef);

        if (snap.exists()) {
            return snap.data() as ProviderSchedule;
        }
        return null;
    }

    /**
     * Checks availability for a specific date
     */
    static async isAvailable(userId: string, date: Date, durationMinutes: number = 60): Promise<boolean> {
        if (!db) return false;

        const schedule = await this.getSchedule(userId);
        if (!schedule) return false; // Or true if default open?

        // 1. Check if date is blocked manually
        const dateStr = date.toISOString().split('T')[0];
        if (schedule.blockedDates?.includes(dateStr)) return false;

        // 2. Check weekly schedule
        const dayOfWeek = date.getDay(); // 0 = Sunday
        const daySchedule = schedule.weeklySchedule.find(d => d.dayOfWeek === dayOfWeek);

        if (!daySchedule || !daySchedule.isActive) return false;

        // 3. Check time slots
        const hours = date.getHours();
        const minutes = date.getMinutes();
        const timeStr = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;

        // Simple check: is start time within any slot?
        // TODO: Advanced check for full duration overlap
        const isInSlot = daySchedule.slots.some(slot =>
            timeStr >= slot.start && timeStr < slot.end
        );

        if (!isInSlot) return false;

        // 4. Check existing bookings overlap
        // This requires querying bookings collection
        // Optimization: In a real app, we might check an 'availability' subcollection
        // For now, let's query bookings for that day
        const startOfDay = new Date(date);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(date);
        endOfDay.setHours(23, 59, 59, 999);

        const bookingsQuery = query(
            collection(db, 'bookings'),
            where('hostId', '==', userId),
            where('scheduledDate', '>=', Timestamp.fromDate(startOfDay)),
            where('scheduledDate', '<=', Timestamp.fromDate(endOfDay)),
            where('status', 'in', ['CONFIRMED', 'ACTIVE', 'PENDING_PAYMENT'])
        );

        const bookingsSnap = await getDocs(bookingsQuery);
        const bookings = bookingsSnap.docs.map(d => d.data() as Booking);

        // Check overlap
        const reqStart = date.getTime();
        const reqEnd = reqStart + durationMinutes * 60 * 1000;

        const hasOverlap = bookings.some(b => {
            const bStart = b.scheduledDate.toDate().getTime();
            const bEnd = bStart + b.estimatedDuration * 60 * 1000;
            return (reqStart < bEnd && reqEnd > bStart);
        });

        return !hasOverlap;
    }

    /**
     * Gets next available slots for a provider (simple version)
     */
    static async getNextAvailableSlots(userId: string, daysToCheck: number = 7): Promise<Date[]> {
        const availableSlots: Date[] = [];
        const now = new Date();
        const schedule = await this.getSchedule(userId);

        if (!schedule) return [];

        for (let i = 0; i < daysToCheck; i++) {
            const currentDay = new Date(now);
            currentDay.setDate(now.getDate() + i);
            const dateStr = currentDay.toISOString().split('T')[0];

            if (schedule.blockedDates?.includes(dateStr)) continue;

            const dayOfWeek = currentDay.getDay();
            const daySchedule = schedule.weeklySchedule.find(d => d.dayOfWeek === dayOfWeek);

            if (!daySchedule || !daySchedule.isActive) continue;

            for (const slot of daySchedule.slots) {
                // Parse slot start
                const [h, m] = slot.start.split(':').map(Number);
                const slotDate = new Date(currentDay);
                slotDate.setHours(h, m, 0, 0);

                // If slot is in the past (today), skip
                if (slotDate < now) continue;

                // Check against bookings (can utilize isAvailable logic per slot)
                const isFree = await this.isAvailable(userId, slotDate);
                if (isFree) {
                    availableSlots.push(slotDate);
                    if (availableSlots.length > 5) return availableSlots; // Limit results
                }
            }
        }

        return availableSlots;
    }
}
