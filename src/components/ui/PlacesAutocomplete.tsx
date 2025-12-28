"use client";

/**
 * PlacesAutocomplete Component
 * 
 * Google Places integration for address input.
 * Returns formatted_address and lat/lng coordinates.
 */

import { useState, useRef, useEffect } from "react";
import { useMapsLibrary } from "@vis.gl/react-google-maps";
import { MapPin, Loader2, X } from "lucide-react";
import { geohashForLocation } from "geofire-common";

// ===========================================
// TYPES
// ===========================================

export interface PlaceResult {
    address: string;
    lat: number;
    lng: number;
    geohash: string;
    city?: string;
}

interface PlacesAutocompleteProps {
    value: string;
    onChange: (value: string) => void;
    onPlaceSelect: (place: PlaceResult) => void;
    placeholder?: string;
    className?: string;
}

// ===========================================
// COMPONENT
// ===========================================

export function PlacesAutocomplete({
    value,
    onChange,
    onPlaceSelect,
    placeholder = "Wpisz adres...",
    className = ""
}: PlacesAutocompleteProps) {
    const [predictions, setPredictions] = useState<google.maps.places.AutocompletePrediction[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    // Load Places library
    const places = useMapsLibrary("places");

    // Autocomplete service ref
    const autocompleteServiceRef = useRef<google.maps.places.AutocompleteService | null>(null);
    const placesServiceRef = useRef<google.maps.places.PlacesService | null>(null);

    // Initialize services
    useEffect(() => {
        if (!places) return;

        autocompleteServiceRef.current = new places.AutocompleteService();

        // Create a dummy div for PlacesService (required)
        const div = document.createElement('div');
        placesServiceRef.current = new places.PlacesService(div);
    }, [places]);

    // Fetch predictions on input change
    useEffect(() => {
        if (!value || value.length < 3 || !autocompleteServiceRef.current) {
            setPredictions([]);
            return;
        }

        setIsLoading(true);

        autocompleteServiceRef.current.getPlacePredictions(
            {
                input: value,
                componentRestrictions: { country: 'pl' }, // Poland only
                types: ['geocode', 'establishment']
            },
            (results, status) => {
                setIsLoading(false);
                if (status === google.maps.places.PlacesServiceStatus.OK && results) {
                    setPredictions(results);
                    setIsOpen(true);
                } else {
                    setPredictions([]);
                }
            }
        );
    }, [value]);

    // Handle prediction selection
    const handleSelect = (prediction: google.maps.places.AutocompletePrediction) => {
        if (!placesServiceRef.current) return;

        setIsLoading(true);

        placesServiceRef.current.getDetails(
            {
                placeId: prediction.place_id,
                fields: ['formatted_address', 'geometry', 'address_components']
            },
            (place, status) => {
                setIsLoading(false);

                if (status === google.maps.places.PlacesServiceStatus.OK && place?.geometry?.location) {
                    const lat = place.geometry.location.lat();
                    const lng = place.geometry.location.lng();

                    // Generate geohash
                    const geohash = geohashForLocation([lat, lng], 10);

                    // Extract city from address components
                    const cityComponent = place.address_components?.find(
                        c => c.types.includes('locality') || c.types.includes('administrative_area_level_1')
                    );

                    const result: PlaceResult = {
                        address: place.formatted_address || prediction.description,
                        lat,
                        lng,
                        geohash,
                        city: cityComponent?.long_name
                    };

                    onChange(result.address);
                    onPlaceSelect(result);
                    setPredictions([]);
                    setIsOpen(false);
                }
            }
        );
    };

    // Close dropdown on outside click
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div ref={containerRef} className={`relative ${className}`}>
            <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                    ref={inputRef}
                    type="text"
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    onFocus={() => predictions.length > 0 && setIsOpen(true)}
                    placeholder={placeholder}
                    className="w-full bg-slate-800/50 border border-white/10 rounded-xl pl-10 pr-10 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500/50"
                />
                {isLoading && (
                    <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-indigo-400" />
                )}
                {value && !isLoading && (
                    <button
                        onClick={() => {
                            onChange('');
                            setPredictions([]);
                        }}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                    >
                        <X className="w-4 h-4" />
                    </button>
                )}
            </div>

            {/* Dropdown */}
            {isOpen && predictions.length > 0 && (
                <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-slate-800 border border-white/10 rounded-xl overflow-hidden shadow-2xl">
                    {predictions.map((prediction) => (
                        <button
                            key={prediction.place_id}
                            onClick={() => handleSelect(prediction)}
                            className="w-full px-4 py-3 text-left hover:bg-white/5 transition-colors border-b border-white/5 last:border-b-0"
                        >
                            <div className="flex items-start gap-3">
                                <MapPin className="w-4 h-4 text-indigo-400 mt-0.5 flex-shrink-0" />
                                <div>
                                    <p className="text-white text-sm">
                                        {prediction.structured_formatting.main_text}
                                    </p>
                                    <p className="text-slate-400 text-xs">
                                        {prediction.structured_formatting.secondary_text}
                                    </p>
                                </div>
                            </div>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}

// ===========================================
// FALLBACK (No Maps API)
// ===========================================

/**
 * Simple address input for when Google Maps API is not available
 */
export function SimpleAddressInput({
    value,
    onChange,
    onCoordsChange,
    placeholder = "Wpisz adres..."
}: {
    value: string;
    onChange: (value: string) => void;
    onCoordsChange?: (lat: number, lng: number) => void;
    placeholder?: string;
}) {
    const [isLocating, setIsLocating] = useState(false);

    const handleGetLocation = () => {
        if (!navigator.geolocation) return;

        setIsLocating(true);
        navigator.geolocation.getCurrentPosition(
            (position) => {
                onCoordsChange?.(position.coords.latitude, position.coords.longitude);
                setIsLocating(false);
            },
            () => setIsLocating(false),
            { enableHighAccuracy: true }
        );
    };

    return (
        <div className="relative">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
                type="text"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                className="w-full bg-slate-800/50 border border-white/10 rounded-xl pl-10 pr-20 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500/50"
            />
            <button
                onClick={handleGetLocation}
                disabled={isLocating}
                className="absolute right-2 top-1/2 -translate-y-1/2 px-2 py-1 text-xs bg-indigo-500/20 text-indigo-400 rounded-lg hover:bg-indigo-500/30 disabled:opacity-50"
            >
                {isLocating ? <Loader2 className="w-3 h-3 animate-spin" /> : 'GPS'}
            </button>
        </div>
    );
}
