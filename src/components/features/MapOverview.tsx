"use client";

import { Map as GoogleMap, useMap } from "@vis.gl/react-google-maps";
import { useEffect, useState, useRef } from "react";
import { collection, query, onSnapshot, Firestore } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { MarkerClusterer } from "@googlemaps/markerclusterer";
import { PriceMarker } from "@/components/ui/PriceMarker";
import { Loader2 } from "lucide-react";
import { MOCK_PROFESSIONALS } from "@/lib/mock-data";

// Types
interface Professional {
    id: string;
    name: string;
    profession: string;
    price: number;
    rating: number;
    location: { lat: number; lng: number };
    imageUrl: string;
    mockPosition?: { top: string; left: string }; // For offline map
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [key: string]: any;
}

const POZNAN_CENTER = { lat: 52.4064, lng: 16.9252 };
const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

// Dark Fintech Map Style used for Online Mode
const MAP_STYLE = [
    { elementType: "geometry", stylers: [{ color: "#242f3e" }] },
    { elementType: "labels.text.stroke", stylers: [{ color: "#242f3e" }] },
    { elementType: "labels.text.fill", stylers: [{ color: "#746855" }] },
    { featureType: "administrative.locality", elementType: "labels.text.fill", stylers: [{ color: "#d59563" }] },
    { featureType: "poi", elementType: "labels.text.fill", stylers: [{ color: "#d59563" }] },
    { featureType: "poi.park", elementType: "geometry", stylers: [{ color: "#263c3f" }] },
    { featureType: "poi.park", elementType: "labels.text.fill", stylers: [{ color: "#6b9a76" }] },
    { featureType: "road", elementType: "geometry", stylers: [{ color: "#38414e" }] },
    { featureType: "road", elementType: "geometry.stroke", stylers: [{ color: "#212a37" }] },
    { featureType: "road", elementType: "labels.text.fill", stylers: [{ color: "#9ca5b3" }] },
    { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#746855" }] },
    { featureType: "road.highway", elementType: "geometry.stroke", stylers: [{ color: "#1f2835" }] },
    { featureType: "road.highway", elementType: "labels.text.fill", stylers: [{ color: "#f3d19c" }] },
    { featureType: "water", elementType: "geometry", stylers: [{ color: "#17263c" }] },
    { featureType: "water", elementType: "labels.text.fill", stylers: [{ color: "#515c6d" }] },
    { featureType: "water", elementType: "labels.text.stroke", stylers: [{ color: "#17263c" }] }
];

// Offline / Mock Map Component
function MockMap({ onSelectPro }: { onSelectPro?: (pro: Professional) => void }) {
    return (
        <div className="w-full h-full bg-[#1a202c] relative overflow-hidden flex items-center justify-center">
            {/* Background Grid Pattern */}
            <div className="absolute inset-0 opacity-10"
                style={{ backgroundImage: 'radial-gradient(circle, #4a5568 1px, transparent 1px)', backgroundSize: '30px 30px' }}
            />

            {/* Fake Streets / Geography */}
            <div className="absolute top-0 bottom-0 left-1/2 w-4 bg-[#2d3748] -rotate-12 transform blur-sm" />
            <div className="absolute left-0 right-0 top-1/3 h-4 bg-[#2d3748] rotate-3 transform blur-sm" />
            <div className="absolute bottom-1/4 left-1/4 w-32 h-32 bg-[#17263c] rounded-full blur-xl opacity-50" /> {/* Fake Lake */}

            <div className="absolute bottom-6 left-6 z-0 text-slate-500 text-xs opacity-50 pointer-events-none">
                Offline Mode (Demo Data)
            </div>

            {/* Interactive Markers */}
            {MOCK_PROFESSIONALS.map((pro) => (
                <div
                    key={pro.id}
                    className="absolute z-20 transition-transform hover:scale-110"
                    style={{ top: pro.mockPosition?.top, left: pro.mockPosition?.left }}
                    onClick={(e) => {
                        e.stopPropagation();
                        onSelectPro?.(pro as unknown as Professional);
                    }}
                >
                    <div className="px-3 py-1.5 rounded-full shadow-lg border bg-white border-slate-200 text-slate-900 cursor-pointer hover:bg-slate-50 flex items-center gap-1 group">
                        <span className="text-xs font-bold">{pro.price} zł</span>
                        {/* Optional icon */}
                        <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 rotate-45 border-b border-r bg-white border-slate-200" />
                    </div>
                </div>
            ))}
        </div>
    );
}

// Online Map Component (Architecture 2.0: Dual Collection)
function OnlineMap({ onSelectPro }: { onSelectPro?: (pro: Professional) => void }) {
    const [displayPros, setDisplayPros] = useState<Professional[]>([]);
    const [loading, setLoading] = useState(true);
    const map = useMap();

    // Cache static profiles to avoid refetching: { [id]: Profile }
    const profilesCache = useRef<Map<string, any>>(new Map());

    // Clustering refs
    const clustererRef = useRef<MarkerClusterer | null>(null);
    const markersRef = useRef<{ [key: string]: google.maps.marker.AdvancedMarkerElement | null }>({});

    useEffect(() => {
        if (!db) return;

        let profilesUnsubscribe: (() => void) | undefined;
        let statusUnsubscribe: (() => void) | undefined;

        setLoading(true);

        try {
            // 1. Listen to Styles (Profiles)
            const profilesQuery = query(collection(db as Firestore, "providers"));
            profilesUnsubscribe = onSnapshot(profilesQuery, (snapshot) => {
                snapshot.forEach(doc => {
                    profilesCache.current.set(doc.id, doc.data());
                });
            });

            // 2. Listen to Live Statuses
            const statusQuery = query(collection(db as Firestore, "provider_status"));
            statusUnsubscribe = onSnapshot(statusQuery, (snapshot) => {
                // Merge Status + Profile
                const merged: Professional[] = [];

                snapshot.forEach(statusDoc => {
                    const statusData = statusDoc.data();
                    const profileData = profilesCache.current.get(statusDoc.id);

                    if (profileData) {
                        merged.push({
                            id: statusDoc.id,
                            name: profileData.displayName,
                            profession: profileData.profession,
                            price: profileData.basePrice,
                            rating: profileData.rating,
                            imageUrl: profileData.avatarUrl,
                            // Use LIVE location if available, otherwise base
                            location: statusData.currentLocation || profileData.baseLocation,
                            status: statusData.isOnline ? 'online' : 'offline', // extra field
                            isBusy: statusData.isBusy
                        } as Professional);
                    }
                });

                console.log(`[Map] Updated: ${merged.length} pros`);
                setDisplayPros(merged);
                setLoading(false);
            });

        } catch (e) {
            console.error("Map initialization error", e);
            setLoading(false);
        }

        return () => {
            if (profilesUnsubscribe) profilesUnsubscribe();
            if (statusUnsubscribe) statusUnsubscribe();
        };
    }, []);

    // Initialize Clusterer
    useEffect(() => {
        if (!map) return;
        if (!clustererRef.current) {
            clustererRef.current = new MarkerClusterer({ map });
        }
    }, [map]);

    // Update Clusterer when professionals change
    useEffect(() => {
        const clusterer = clustererRef.current;
        if (!clusterer) return;

        clusterer.clearMarkers();

        // Add current markers
        const markers = Object.values(markersRef.current).filter((m): m is google.maps.marker.AdvancedMarkerElement => m !== null);
        clusterer.addMarkers(markers);
    }, [displayPros]);

    return (
        <div className="w-full h-full relative bg-slate-900">
            <GoogleMap
                mapId="DEMO_MAP_ID"
                defaultCenter={POZNAN_CENTER}
                defaultZoom={13}
                gestureHandling={"greedy"}
                disableDefaultUI={true}
                styles={MAP_STYLE}
                className="w-full h-full outline-none"
            >
                {displayPros.map(pro => (
                    <PriceMarker
                        key={pro.id}
                        position={pro.location}
                        price={pro.price}
                        onClick={() => onSelectPro?.(pro)}
                        ref={(el) => { markersRef.current[pro.id] = el; }}
                    />
                ))}
            </GoogleMap>

            {loading && (
                <div className="absolute top-4 right-4 bg-white/10 backdrop-blur p-2 rounded-full">
                    <Loader2 className="w-5 h-5 animate-spin text-white" />
                </div>
            )}

            {/* Live Indicator */}
            <div className="absolute bottom-6 right-6 bg-emerald-500/90 text-white text-[10px] px-2 py-1 rounded-full shadow-lg font-bold backdrop-blur animate-pulse">
                LIVE DATA
            </div>
        </div>
    );
}

export function MapOverview({ onSelectPro }: { onSelectPro?: (pro: Professional) => void }) {
    // OFFLINE MODE
    if (!API_KEY) {
        return <div className="w-full h-full relative"><MockMap onSelectPro={onSelectPro} /></div>;
    }

    // ONLINE MODE
    return <OnlineMap onSelectPro={onSelectPro} />;
}
