/**
 * Standalone seed script for FachowcyNow
 * Run with: npx tsx scripts/seed-professionals.ts
 */

import { config } from 'dotenv';
import { resolve } from 'path';

// Load .env.local first
config({ path: resolve(process.cwd(), '.env.local') });

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, doc, setDoc } from 'firebase/firestore';
import { geohashForLocation } from 'geofire-common';

// Firebase config from env
const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

console.log("🔧 Firebase Project:", firebaseConfig.projectId);

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Poznań coordinates
const POZNAN_LAT = 52.4064;
const POZNAN_LNG = 16.9252;

// Professional templates
const PROFESSIONALS = [
    { name: "Marek Nowak", profession: "Hydraulik", price: 150, rating: 4.8 },
    { name: "Jan Kowalski", profession: "Elektryk", price: 200, rating: 4.9 },
    { name: "Anna Wiśniewska", profession: "Sprzątanie", price: 80, rating: 4.7 },
    { name: "Piotr Zieliński", profession: "Złota Rączka", price: 120, rating: 4.5 },
    { name: "Krzysztof Krawczyk", profession: "Serwis AGD", price: 180, rating: 5.0 },
    { name: "Tomasz Maj", profession: "Hydraulik", price: 140, rating: 4.6 },
    { name: "Michał Wiśniewski", profession: "Elektryk", price: 220, rating: 4.8 },
    { name: "Katarzyna Lewandowska", profession: "Sprzątanie", price: 90, rating: 4.9 },
    { name: "Adam Nowicki", profession: "Malarz", price: 100, rating: 4.4 },
    { name: "Robert Kamiński", profession: "Złota Rączka", price: 130, rating: 4.7 },
    { name: "Ewa Wójcik", profession: "Ogrodnik", price: 110, rating: 4.5 },
    { name: "Paweł Kowalczyk", profession: "Serwis AGD", price: 170, rating: 4.8 },
    { name: "Magdalena Dąbrowska", profession: "Sprzątanie", price: 85, rating: 4.6 },
    { name: "Grzegorz Mazur", profession: "Hydraulik", price: 160, rating: 4.9 },
    { name: "Joanna Krawiec", profession: "Elektryk", price: 190, rating: 4.7 },
];

function getRandomLocation() {
    const r = 0.04 * Math.sqrt(Math.random());
    const theta = Math.random() * 2 * Math.PI;
    return {
        lat: POZNAN_LAT + r * Math.cos(theta),
        lng: POZNAN_LNG + r * Math.sin(theta) * 1.5
    };
}

function generateSearchTerms(text: string): string[] {
    const terms = new Set<string>();
    const normalized = text.toLowerCase().trim();
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

async function seed() {
    console.log("🚀 Starting to seed professionals...");

    for (let i = 0; i < PROFESSIONALS.length; i++) {
        const template = PROFESSIONALS[i];
        const providerRef = doc(collection(db, "providers"));
        const statusRef = doc(db, "provider_status", providerRef.id);

        const location = getRandomLocation();
        const geohash = geohashForLocation([location.lat, location.lng]);
        const priceVariation = Math.floor(Math.random() * 40) - 20;

        // Provider profile
        const profileData = {
            id: providerRef.id,
            displayName: template.name,
            profession: template.profession,
            avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${template.name.replace(' ', '')}`,
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

        // Provider status (live data)
        const statusData = {
            providerId: providerRef.id,
            isOnline: Math.random() > 0.3,
            isBusy: Math.random() > 0.8,
            currentLocation: {
                lat: location.lat,
                lng: location.lng,
                geohash: geohash
            },
            lastSeen: new Date()
        };

        // Write individually instead of batch
        await setDoc(providerRef, profileData);
        await setDoc(statusRef, statusData);

        console.log(`✅ Added: ${template.name} (${template.profession})`);
    }

    console.log(`\n🎉 Successfully seeded ${PROFESSIONALS.length} professionals!`);
    console.log("📍 Location: Poznań area");
    process.exit(0);
}

seed().catch(error => {
    console.error("❌ Seeding failed:", error);
    process.exit(1);
});
