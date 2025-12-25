import { db } from "./firebase";
import { collection, getDocs, writeBatch, doc } from "firebase/firestore";
import { geohashForLocation } from "geofire-common";

// Global interval reference to allow stopping
let activeInterval: NodeJS.Timeout | null = null;

export function stopSimulation() {
    if (activeInterval) {
        clearInterval(activeInterval);
        activeInterval = null;
        console.log("🛑 Simulation stopped.");
    }
}

export async function startSimulation(): Promise<boolean> {
    if (!db) {
        alert("Błąd: Brak połączenia z bazą danych (db is null).");
        return false;
    }

    // 1. Reset
    stopSimulation();

    // 2. Fetch Initial Data to Simulate
    // We strictly use 'provider_status' as that's where the live location lives.
    console.log("🚀 Starting Simulation (Rebuilt)... fetching 'provider_status'...");
    const statusCollection = collection(db, "provider_status");
    const snapshot = await getDocs(statusCollection);

    if (snapshot.empty) {
        alert("⚠️ Błąd: Kolekcja 'provider_status' jest pusta!\n\nProszę najpierw kliknąć '[DEV] Załaduj dane do bazy (Seed)', aby utworzyć fachowców.");
        return false;
    }

    const agents = snapshot.docs.map(d => ({
        id: d.id,
        ...d.data()
    })) as unknown as { id: string; currentLocation: { lat: number; lng: number }; lastSeen: any }[];

    console.log(`✅ Loaded ${agents.length} agents for simulation.`);

    // 3. Start Loop
    activeInterval = setInterval(async () => {
        const firestore = db; // Capture strict reference
        if (!firestore) return;

        const batch = writeBatch(firestore);
        const MOVEMENT_SIZE = 5; // How many pros move per tick

        // Pick random agents
        const movingAgents = [];
        for (let i = 0; i < MOVEMENT_SIZE; i++) {
            const agent = agents[Math.floor(Math.random() * agents.length)];
            movingAgents.push(agent);
        }

        movingAgents.forEach(agent => {
            if (!agent.currentLocation) return; // Skip if broken data

            // Drift calculation (approx 100-200m)
            const deltaLat = (Math.random() - 0.5) * 0.002;
            const deltaLng = (Math.random() - 0.5) * 0.002;

            const newLat = agent.currentLocation.lat + deltaLat;
            const newLng = agent.currentLocation.lng + deltaLng;

            // Recalculate Geohash
            const newGeohash = geohashForLocation([newLat, newLng]);

            const newLocation = {
                lat: newLat,
                lng: newLng,
                geohash: newGeohash
            };

            // Update in-memory (so they don't snap back next tick)
            agent.currentLocation = newLocation;

            // Prepare DB Update
            const ref = doc(firestore, "provider_status", agent.id);
            batch.update(ref, {
                currentLocation: newLocation,
                lastSeen: new Date(),
                isBusy: Math.random() > 0.8 // Randomly toggle busy status key
            });
        });

        try {
            await batch.commit();
            console.log(`📡 Sim Tick: Moved ${MOVEMENT_SIZE} providers.`);
        } catch (e) {
            console.error("❌ Simulation Write Error:", e);
            stopSimulation();
        }

    }, 2500); // 2.5s interval

    return true;
}
