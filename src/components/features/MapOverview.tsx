"use client";

import { Map as GoogleMap, useMap } from "@vis.gl/react-google-maps";
import { useEffect, useState, useRef, useMemo } from "react";
import { collection, query, onSnapshot, Firestore, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { MarkerClusterer } from "@googlemaps/markerclusterer";
import { clusterRenderer } from "@/components/map/ClusterRenderer";
import { FintechMarker, professionalToMarkerData } from "@/components/map/FintechMarker";
import { Loader2 } from "lucide-react";
import { MOCK_PROFESSIONALS } from "@/lib/mock-data";
import { CategoryType, PlaceLocation } from "./SearchOverlay";
import { UserLocationMarker } from "@/components/map/UserLocationMarker";
import { useAuth } from "@/context/AuthContext";
import { useLiveProviders } from "@/hooks/useLiveSearch";
import { ServiceCategory } from "@/types/listings";

// Types
interface Professional {
    id: string;
    name: string;
    profession: string;
    price: number;
    rating: number;
    location: { lat: number; lng: number };
    imageUrl: string;
    isPromoted?: boolean; // Golden pin for sponsors
    mockPosition?: { top: string; left: string }; // For offline map
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [key: string]: any;
}

const POZNAN_CENTER = { lat: 52.4064, lng: 16.9252 };
const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

// Fintech Night Map Style - imported from design system
// Darker slate theme matching the app's bg-slate-950 aesthetic
import MAP_STYLE from "@/styles/map-dark-theme.json";

// Offline / Mock Map Component
function MockMap({ onSelectPro, categoryFilter }: { onSelectPro?: (pro: Professional) => void; categoryFilter?: CategoryType }) {
    const filteredPros = MOCK_PROFESSIONALS.filter(pro =>
        !categoryFilter || categoryFilter === "Wszyscy" || pro.profession === categoryFilter
    );
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
            {filteredPros.map((pro) => (
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
function OnlineMap({ onSelectPro, categoryFilter, centerLocation, userRole, fitBoundsLocations, userLocation }: {
    onSelectPro?: (pro: Professional) => void;
    categoryFilter?: CategoryType;
    centerLocation?: PlaceLocation | null;
    userRole?: 'client' | 'professional' | null;
    fitBoundsLocations?: { user: { lat: number; lng: number }; pro: { lat: number; lng: number } } | null;
    userLocation?: { lat: number; lng: number } | null;
}) {
    const [displayItems, setDisplayItems] = useState<Professional[]>([]);
    const [loading, setLoading] = useState(true);
    const map = useMap();

    // Pan map when centerLocation changes AND update searchOptions
    useEffect(() => {
        if (map && centerLocation) {
            map.panTo({ lat: centerLocation.lat, lng: centerLocation.lng });
            map.setZoom(13);

            // IMPORTANT: Also update searchOptions to trigger provider fetch for new location
            setSearchOptions({
                center: { lat: centerLocation.lat, lng: centerLocation.lng },
                radiusKm: 10 // Use larger radius when searching a city
            });
        }
    }, [map, centerLocation]);

    // Fit bounds to show both user and professional locations
    useEffect(() => {
        if (map && fitBoundsLocations) {
            const bounds = new google.maps.LatLngBounds();
            bounds.extend(fitBoundsLocations.user);
            bounds.extend(fitBoundsLocations.pro);

            // Smooth animation to fit bounds
            map.fitBounds(bounds, { top: 150, bottom: 350, left: 50, right: 50 });
        }
    }, [map, fitBoundsLocations]);

    // Cache static profiles to avoid refetching: { [id]: Profile }
    const profilesCache = useRef<Map<string, any>>(new Map());

    // Clustering refs
    const clustererRef = useRef<MarkerClusterer | null>(null);
    const markersRef = useRef<{ [key: string]: google.maps.marker.AdvancedMarkerElement | null }>({});

    // Get current user for ID filtering
    const { user } = useAuth();

    // State for Search Options (Bound to Map View)
    const [searchOptions, setSearchOptions] = useState<{ center: { lat: number, lng: number }, radiusKm: number } | null>(null);

    // Initial load: Set default options based on user location or default center
    useEffect(() => {
        if (!searchOptions) {
            setSearchOptions({
                center: userLocation || POZNAN_CENTER,
                radiusKm: 5 // Start with 5km
            });
        }
    }, [userLocation]);

    // Map UI Category to Backend Category
    // UI: "Hydraulik" -> Backend: "hydraulik"
    const mapCategoryToBackend = (uiCategory?: CategoryType): ServiceCategory | undefined => {
        if (!uiCategory || uiCategory === "Wszyscy") return undefined;

        const mapping: Record<string, ServiceCategory> = {
            "Hydraulik": "hydraulik",
            "Elektryk": "elektryk",
            "Sprzątanie": "sprzatanie",
            "Malarz": "malarz",
            "Stolarz": "stolarz",
            "Klimatyzacja": "klimatyzacja",
            "Ogrodnik": "ogrodnik",
            "Przeprowadzki": "przeprowadzki",
            "Złota Rączka": "zlota_raczka"
        };

        return mapping[uiCategory] || "other";
    };

    // Let's use the hook
    const { providers: liveProviders, isLoading: providersLoading } = useLiveProviders({
        center: searchOptions?.center || POZNAN_CENTER,
        radiusKm: searchOptions?.radiusKm || 5,
        category: mapCategoryToBackend(categoryFilter)
    });

    // Debounce ref to prevent excessive queries
    const debounceRef = useRef<NodeJS.Timeout | null>(null);

    // Debounce map movement to update search options
    const onMapIdle = (map: google.maps.Map) => {
        const center = map.getCenter();
        const bounds = map.getBounds();
        if (!center || !bounds) return;

        const centerLat = center.lat();
        const centerLng = center.lng();

        // Calculate radius based on bounds (approximate)
        const ne = bounds.getNorthEast();
        const radiusInMeters = google.maps.geometry.spherical.computeDistanceBetween(center, ne);
        const radiusKm = Math.min(Math.max(radiusInMeters / 1000, 1), 50); // Min 1km, Max 50km

        // Debounce the update to avoid spamming Firestore
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => {
            setSearchOptions({
                center: { lat: centerLat, lng: centerLng },
                radiusKm: radiusKm
            });
        }, 500); // 500ms debounce
    };

    // Listen to map idle event
    useEffect(() => {
        if (!map) return;

        const listener = map.addListener('idle', () => onMapIdle(map));
        return () => {
            listener.remove();
            if (debounceRef.current) clearTimeout(debounceRef.current);
        };
    }, [map]);

    // Effect to update displayItems from liveProviders
    useEffect(() => {
        if (userRole === 'professional') {
            // PROFESSIONAL VIEW: Fetch OPEN JOBS from 'jobs' collection
            // Showing available jobs in the area
            // Memoize query to prevent re-subscribing on every render
            const jobsQuery = useMemo(() => query(
                collection(db as Firestore, "jobs"),
                where("status", "==", "open")
            ), []); // Empty dependency array as query is static for now

            const unsubscribe = onSnapshot(jobsQuery, (snapshot) => {
                const jobs: Professional[] = [];
                snapshot.forEach(doc => {
                    const data = doc.data();

                    // Filter relevant jobs (client side geo filtering matching useLiveProviders logic ideally)
                    // For now, simple fetch all open jobs

                    if (data.location) {
                        jobs.push({
                            id: doc.id,
                            name: data.category || "Zlecenie", // Use category as main title for marker
                            profession: data.title || data.description?.substring(0, 20) || "Szczegóły",
                            price: data.priceEstimate?.min || 0,
                            rating: 0,
                            imageUrl: data.photoUrls?.[0] || `https://api.dicebear.com/7.x/icons/svg?seed=${doc.id}`,
                            location: { lat: data.location.lat, lng: data.location.lng },
                            isPromoted: data.urgency === 'asap',
                            status: 'online',
                            isBusy: false,
                            type: 'job_marker', // Signal to FintechMarker
                            clientName: data.clientName // Extra data
                        } as Professional);
                    }
                });
                setDisplayItems(jobs);
                setLoading(false);
            });
            return () => unsubscribe();
        } else {
            // CLIENT VIEW: Use liveProviders from hook
            // Transform Provider data to Professional interface
            const mappedProviders: Professional[] = liveProviders.map(p => ({
                id: p.id,
                name: p.displayName || p.title || 'Fachowiec',
                profession: p.serviceType || 'other',
                price: p.basePrice || 100,
                rating: p.rating || 5.0,
                imageUrl: p.avatarUrl || p.photoURL,
                location: p.location,
                isPromoted: p.isPromoted,
                status: p.isOnline ? 'online' : 'offline',
                isBusy: p.isBusy
            }));

            setDisplayItems(mappedProviders);
            setLoading(providersLoading);
        }
    }, [userRole, user, liveProviders, providersLoading]);

    // Initialize Clusterer
    useEffect(() => {
        if (!map) return;
        if (!clustererRef.current) {
            clustererRef.current = new MarkerClusterer({ map, renderer: clusterRenderer });
        }
    }, [map]);

    // Update Clusterer
    useEffect(() => {
        const clusterer = clustererRef.current;
        if (!clusterer) return;
        clusterer.clearMarkers();
        const markers = Object.values(markersRef.current).filter((m): m is google.maps.marker.AdvancedMarkerElement => m !== null);
        clusterer.addMarkers(markers);
    }, [displayItems]);

    // Filter items
    const filteredItems = displayItems.filter(item =>
        !categoryFilter || categoryFilter === "Wszyscy" || item.profession === categoryFilter
    );

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
                {filteredItems.map(item => (
                    <FintechMarker
                        key={item.id}
                        data={professionalToMarkerData(item)}
                        onClick={(data) => onSelectPro?.(item)}
                        isSelected={false}
                    />
                ))}

                {/* User Location Marker */}
                {userLocation && (
                    <UserLocationMarker position={userLocation} />
                )}
            </GoogleMap>

            {loading && (
                <div className="absolute top-4 right-4 bg-white/10 backdrop-blur p-2 rounded-full">
                    <Loader2 className="w-5 h-5 animate-spin text-white" />
                </div>
            )}

            <div className="absolute bottom-6 right-6 bg-emerald-500/90 text-white text-[10px] px-2 py-1 rounded-full shadow-lg font-bold backdrop-blur animate-pulse">
                {userRole === 'professional' ? 'CLIENT ORDERS' : 'LIVE PROS'}
            </div>
        </div>
    );
}

export function MapOverview({ onSelectPro, categoryFilter, centerLocation, userRole, fitBoundsLocations, userLocation }: {
    onSelectPro?: (pro: Professional) => void;
    categoryFilter?: CategoryType;
    centerLocation?: PlaceLocation | null;
    userRole?: 'client' | 'professional' | null;
    fitBoundsLocations?: { user: { lat: number; lng: number }; pro: { lat: number; lng: number } } | null;
    userLocation?: { lat: number; lng: number } | null;
}) {
    if (!API_KEY) {
        return <div className="w-full h-full relative"><MockMap onSelectPro={onSelectPro} categoryFilter={categoryFilter} /></div>;
    }
    return <OnlineMap onSelectPro={onSelectPro} categoryFilter={categoryFilter} centerLocation={centerLocation} userRole={userRole} fitBoundsLocations={fitBoundsLocations} userLocation={userLocation} />;
}
