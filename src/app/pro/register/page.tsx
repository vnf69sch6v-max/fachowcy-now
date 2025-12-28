"use client";

/**
 * Professional Registration Page
 * 
 * Entry point for new professional registration.
 * Requires authenticated user (redirect if not logged in).
 */

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { MapProvider } from "@/components/features/MapProvider";
import { RegistrationWizard } from "@/components/features/RegistrationWizard";
import { Loader2 } from "lucide-react";

export default function ProRegisterPage() {
    const { user, loading } = useAuth();
    const router = useRouter();

    // Redirect if not authenticated
    useEffect(() => {
        if (!loading && !user) {
            router.push('/');
        }
    }, [user, loading, router]);

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
            </div>
        );
    }

    if (!user) {
        return null; // Will redirect
    }

    return (
        <MapProvider>
            <RegistrationWizard />
        </MapProvider>
    );
}
