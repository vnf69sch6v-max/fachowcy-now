"use client";

import { useEffect, useRef, useState } from "react";
import { useMapsLibrary } from "@vis.gl/react-google-maps";
import { Search, X } from "lucide-react";

interface PlacesAutocompleteProps {
    onPlaceSelect: (location: { lat: number; lng: number; name: string }) => void;
    placeholder?: string;
}

export function PlacesAutocomplete({ onPlaceSelect, placeholder = "Wyszukaj miasto..." }: PlacesAutocompleteProps) {
    const placesLib = useMapsLibrary("places");
    const inputRef = useRef<HTMLInputElement>(null);
    const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
    const [inputValue, setInputValue] = useState("");

    useEffect(() => {
        if (!placesLib || !inputRef.current) return;

        // Initialize autocomplete
        autocompleteRef.current = new placesLib.Autocomplete(inputRef.current, {
            types: ["(cities)"], // Only suggest cities
            componentRestrictions: { country: "pl" }, // Poland only
            fields: ["geometry", "name", "formatted_address"]
        });

        // Listen for place selection
        autocompleteRef.current.addListener("place_changed", () => {
            const place = autocompleteRef.current?.getPlace();
            if (place?.geometry?.location) {
                const lat = place.geometry.location.lat();
                const lng = place.geometry.location.lng();
                const name = place.name || place.formatted_address || "Unknown";

                onPlaceSelect({ lat, lng, name });
                setInputValue(name);
            }
        });

        return () => {
            // Cleanup
            if (autocompleteRef.current) {
                google.maps.event.clearInstanceListeners(autocompleteRef.current);
            }
        };
    }, [placesLib, onPlaceSelect]);

    const handleClear = () => {
        setInputValue("");
        if (inputRef.current) {
            inputRef.current.value = "";
            inputRef.current.focus();
        }
    };

    return (
        <div className="flex items-center gap-2 w-full max-w-md bg-white/10 backdrop-blur-md border border-white/20 rounded-full px-4 py-3 shadow-lg pointer-events-auto transition-all focus-within:bg-white/15 focus-within:border-white/30 hover:bg-white/15">
            <Search className="w-5 h-5 text-slate-300 flex-shrink-0" />
            <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder={placeholder}
                className="bg-transparent border-none outline-none text-white placeholder:text-slate-400 w-full text-base font-medium"
            />
            {inputValue && (
                <button
                    onClick={handleClear}
                    className="p-1 text-white/50 hover:text-white transition-colors flex-shrink-0"
                >
                    <X className="w-4 h-4" />
                </button>
            )}
        </div>
    );
}
