import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase'; // Note: This uses client SDK. For true backend, use firebase-admin.
import { collection, query, orderBy, startAt, endAt, getDocs } from 'firebase/firestore';
import { geohashQueryBounds, distanceBetween } from 'geofire-common';

// This is a BACKEND API route. In a real production environment, 
// you would use 'firebase-admin' here to bypass security rules and access indexes safely.
// For now, we use the client SDK as a proxy for the logic.

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const lat = parseFloat(searchParams.get('lat') || '');
    const lng = parseFloat(searchParams.get('lng') || '');
    const radius = parseFloat(searchParams.get('radius') || '5000'); // meters

    if (isNaN(lat) || isNaN(lng)) {
        return NextResponse.json({ error: 'Invalid coordinates' }, { status: 400 });
    }

    try {
        const center = [lat, lng] as [number, number];
        const bounds = geohashQueryBounds(center, radius);
        const promises = [];

        for (const b of bounds) {
            const q = query(
                collection(db!, 'providers'), // Note: Using ! because we assume init in Next.js runtime
                orderBy('baseLocation.geohash'),
                startAt(b[0]),
                endAt(b[1])
            );
            promises.push(getDocs(q));
        }

        const snapshots = await Promise.all(promises);
        const hits: any[] = [];
        const seen = new Set<string>();

        for (const snap of snapshots) {
            for (const doc of snap.docs) {
                if (seen.has(doc.id)) continue;

                const data = doc.data();
                const dLat = data.baseLocation.lat;
                const dLng = data.baseLocation.lng;

                // Distance filter
                const distInKm = distanceBetween([dLat, dLng], center);
                const distInM = distInKm * 1000;

                if (distInM <= radius) {
                    seen.add(doc.id);
                    hits.push({ id: doc.id, ...data, _distance: distInM });
                }
            }
        }

        return NextResponse.json({
            count: hits.length,
            results: hits
        });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
