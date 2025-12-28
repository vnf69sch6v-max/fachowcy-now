"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import { useMapsLibrary } from "@vis.gl/react-google-maps";
import { Search, X, MapPin, Loader2 } from "lucide-react";
import { CATEGORIES, CategoryType } from "./SearchOverlay";

interface PlacesAutocompleteProps {
    onPlaceSelect: (location: { lat: number; lng: number; name: string }) => void;
    onCategoryChange?: (category: CategoryType) => void;
    placeholder?: string;
}

export function PlacesAutocomplete({ onPlaceSelect, onCategoryChange, placeholder = "Wyszukaj miasto..." }: PlacesAutocompleteProps) {
    const places = useMapsLibrary("places");
    const [inputValue, setInputValue] = useState("");
    const [predictions, setPredictions] = useState<google.maps.places.AutocompletePrediction[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [sessionToken, setSessionToken] = useState<google.maps.places.AutocompleteSessionToken | null>(null);

    // Filter categories to exclude "Wszyscy" for detection
    const detectableCategories = useMemo(() =>
        CATEGORIES.filter(c => c !== "Wszyscy") as string[],
        []);

    useEffect(() => {
        if (places) {
            setSessionToken(new places.AutocompleteSessionToken());
        }
    }, [places]);

    // Debounced search effect
    useEffect(() => {
        const timer = setTimeout(() => {
            if (!inputValue || inputValue.length < 2 || !places || !sessionToken) {
                setPredictions([]);
                return;
            }

            // Parse input for Category + City
            let searchQuery = inputValue;
            let detectedCategory: CategoryType | null = null;

            for (const category of detectableCategories) {
                // Escape special regex chars if any (though unlikely in categories)
                const escapedCategory = category.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                // Word boundary check (case insensitive)
                const regex = new RegExp(`\\b${escapedCategory}\\b`, 'i');

                if (regex.test(inputValue)) {
                    detectedCategory = category as CategoryType;
                    // Remove category from search query to find the city, clean up extra spaces
                    searchQuery = inputValue.replace(regex, '').replace(/\s+/g, ' ').trim();
                    break;
                }
            }

            // If we detected a category and have a callback, update it
            if (detectedCategory && onCategoryChange) {
                onCategoryChange(detectedCategory);
            }

            // If we have a query left (or just searching city), fetch predictions
            if (searchQuery.length > 1) {
                setIsLoading(true);
                const service = new places.AutocompleteService();

                service.getPlacePredictions({
                    input: searchQuery,
                    sessionToken,
                    types: ['(cities)'],
                    componentRestrictions: { country: 'pl' }
                }, (results, status) => {
                    setIsLoading(false);
                    if (status === google.maps.places.PlacesServiceStatus.OK && results) {
                        setPredictions(results);
                        setIsOpen(true);
                    } else {
                        setPredictions([]);
                    }
                });
            }
        }, 300);

        return () => clearTimeout(timer);
    }, [inputValue, places, sessionToken, detectableCategories, onCategoryChange]);

    const handleSelect = (prediction: google.maps.places.AutocompletePrediction) => {
        if (!places) return;

        const service = new places.PlacesService(document.createElement('div'));

        service.getDetails({
            placeId: prediction.place_id,
            fields: ['geometry', 'name', 'formatted_address']
        }, (place, status) => {
            if (status === google.maps.places.PlacesServiceStatus.OK && place?.geometry?.location) {
                onPlaceSelect({
                    lat: place.geometry.location.lat(),
                    lng: place.geometry.location.lng(),
                    name: place.name || prediction.description
                });

                // Keep the input value as user typed implies context
                setInputValue(place.formatted_address || prediction.description);
                setPredictions([]);
                setIsOpen(false);
                setSessionToken(new places.AutocompleteSessionToken());
            }
        });
    };

    const handleClear = () => {
        setInputValue("");
        setPredictions([]);
        setIsOpen(false);
    };

    return (
        <div className="relative w-full max-w-md pointer-events-auto">
            <div className="flex items-center gap-2 bg-white/10 backdrop-blur-md border border-white/20 rounded-full px-4 py-3 shadow-lg transition-all focus-within:bg-white/15 focus-within:border-white/30 hover:bg-white/15">
                <Search className="w-5 h-5 text-slate-300 flex-shrink-0" />
                <input
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    placeholder={placeholder}
                    className="bg-transparent border-none outline-none text-white placeholder:text-slate-400 w-full text-base font-medium"
                    onFocus={() => predictions.length > 0 && setIsOpen(true)}
                />

                {isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin text-white/50" />
                ) : inputValue ? (
                    <button
                        onClick={handleClear}
                        className="p-1 text-white/50 hover:text-white transition-colors flex-shrink-0"
                    >
                        <X className="w-4 h-4" />
                    </button>
                ) : null}
            </div>

            {/* Custom Predictions Dropdown */}
            {isOpen && predictions.length > 0 && (
                <div className="absolute top-full left-4 right-4 mt-2 bg-slate-900/90 backdrop-blur-xl border border-white/10 rounded-xl overflow-hidden shadow-2xl z-50">
                    {predictions.map((prediction) => (
                        <button
                            key={prediction.place_id}
                            onClick={() => handleSelect(prediction)}
                            className="w-full px-4 py-3 text-left hover:bg-white/10 transition-colors border-b border-white/5 last:border-b-0 flex items-start gap-3 group"
                        >
                            <MapPin className="w-4 h-4 text-slate-400 mt-1 group-hover:text-blue-400 transition-colors" />
                            <div>
                                <p className="text-white text-sm font-medium">
                                    {prediction.structured_formatting.main_text}
                                </p>
                                <p className="text-slate-400 text-xs">
                                    {prediction.structured_formatting.secondary_text}
                                </p>
                            </div>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
