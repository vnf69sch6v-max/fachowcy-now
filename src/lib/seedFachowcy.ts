import { db } from "./firebase";
import { collection, writeBatch, doc } from "firebase/firestore";
import { MOCK_PROFESSIONALS } from "./mock-data";
import { geohashForLocation } from "geofire-common";
import { ProviderProfile, ProviderStatus } from "@/types/firestore";

// Poznań center
const POZNAN_LAT = 52.4064;
const POZNAN_LNG = 16.9252;

function getRandomLocation() {
  // Random offset ~5km radius
  const r = 0.04 * Math.sqrt(Math.random());
  const theta = Math.random() * 2 * Math.PI;
  return {
    lat: POZNAN_LAT + r * Math.cos(theta),
    lng: POZNAN_LNG + r * Math.sin(theta) * 1.5 // stretch slightly for map aspect
  };
}

// Generate search terms for prefix search
function generateSearchTerms(text: string): string[] {
  const terms = new Set<string>();
  const normalized = text.toLowerCase().trim();
  // Words
  const words = normalized.split(/\s+/);

  words.forEach(word => {
    let term = "";
    for (const char of word) {
      term += char;
      terms.add(term);
    }
  });

  return Array.from(terms);
}

export async function seedFachowcy(): Promise<{ success: boolean; count?: number; error?: unknown }> {
  if (!db) {
    console.warn("Database not initialized. Skipping seed.");
    return { success: false, error: "Firebase DB not connected" };
  }

  try {
    const batch = writeBatch(db);

    console.log("Starting seeding with Architecture 2.0 (Dual Collections)...");

    // Generate 50 professionals
    for (let i = 0; i < 50; i++) {
      const template = MOCK_PROFESSIONALS[i % MOCK_PROFESSIONALS.length];
      const newDocRef = doc(collection(db, "providers")); // Changed from 'professionals' to 'providers'
      const statusDocRef = doc(db, "provider_status", newDocRef.id);

      const location = getRandomLocation();
      const geohash = geohashForLocation([location.lat, location.lng]);

      // Slight price variation
      const priceVariation = Math.floor(Math.random() * 40) - 20;

      // 1. Static Profile
      const profileData: ProviderProfile = {
        id: newDocRef.id,
        displayName: template.name,
        profession: template.profession,
        avatarUrl: template.imageUrl,
        services: {
          [template.profession.toLowerCase()]: true,
          "awaria": Math.random() > 0.7
        },
        searchTerms: generateSearchTerms(template.name + " " + template.profession),
        basePrice: template.price + priceVariation,
        currency: "PLN",
        rating: Math.max(3.5, Math.min(5, template.rating + (Math.random() - 0.5))),
        reviewsCount: Math.floor(Math.random() * 100) + 10,
        completedOrders: Math.floor(Math.random() * 50),
        city: "Poznań",
        baseLocation: {
          lat: location.lat,
          lng: location.lng,
          geohash: geohash
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      // 2. Dynamic Status (Live Data)
      const statusData: ProviderStatus = {
        providerId: newDocRef.id,
        isOnline: Math.random() > 0.3,
        isBusy: Math.random() > 0.8,
        currentLocation: {
          lat: location.lat,
          lng: location.lng,
          geohash: geohash
        },
        // @ts-expect-error - Timestamp created on server usually, but for seed we use Date
        lastSeen: new Date()
      };

      batch.set(newDocRef, profileData);
      batch.set(statusDocRef, statusData);
    }

    await batch.commit();
    console.log("Seeding complete! 50 providers added with Live Data structure.");
    return { success: true, count: 50 };
  } catch (error) {
    console.error("Seeding failed:", error);
    return { success: false, error };
  }
}
