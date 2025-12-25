"use client";

import { APIProvider } from "@vis.gl/react-google-maps";
import { ReactNode } from "react";

const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";

export function MapProvider({ children }: { children: ReactNode }) {
    if (!API_KEY) {
        console.warn("Google Maps API Key missing. Using Mock Map Mode.");
        // Even without a key, we render children. Inner components will handle the missing API.
        return <>{children}</>;
    }

    return (
        <APIProvider apiKey={API_KEY} libraries={["places", "marker"]}>
            {children}
        </APIProvider>
    );
}
