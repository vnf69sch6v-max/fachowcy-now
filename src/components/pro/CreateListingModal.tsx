"use client";

/**
 * Create Listing Modal
 * 
 * Formularz dodawania ogłoszenia przez fachowca.
 * Zapisuje do providers i automatycznie synchronizuje z map_markers.
 */

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    X,
    MapPin,
    DollarSign,
    Clock,
    Briefcase,
    Image as ImageIcon,
    Loader2,
    Check,
    AlertCircle
} from "lucide-react";
import {
    doc,
    setDoc,
    serverTimestamp,
    GeoPoint
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { ServiceType } from "@/types/firestore-v2";

// ===========================================
// TYPES
// ===========================================

interface ListingFormData {
    serviceType: ServiceType;
    title: string;
    description: string;
    basePrice: number;
    radius: number; // km
    address: string;
    lat: number;
    lng: number;
}

const SERVICE_OPTIONS: { value: ServiceType; label: string; icon: string }[] = [
    { value: 'elektryk', label: 'Elektryk', icon: '⚡' },
    { value: 'hydraulik', label: 'Hydraulik', icon: '🔧' },
    { value: 'sprzatanie', label: 'Sprzątanie', icon: '🧹' },
    { value: 'malarz', label: 'Malarz', icon: '🎨' },
    { value: 'stolarz', label: 'Stolarz', icon: '🪑' },
    { value: 'klimatyzacja', label: 'Klimatyzacja', icon: '❄️' },
    { value: 'ogrodnik', label: 'Ogrodnik', icon: '🌿' },
    { value: 'przeprowadzki', label: 'Przeprowadzki', icon: '📦' },
    { value: 'zlota_raczka', label: 'Złota Rączka', icon: '🔨' },
    { value: 'other', label: 'Inne', icon: '⚙️' }
];

// ===========================================
// MAIN COMPONENT
// ===========================================

interface CreateListingModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess?: () => void;
}

export function CreateListingModal({ isOpen, onClose, onSuccess }: CreateListingModalProps) {
    const { user } = useAuth();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const [isLocating, setIsLocating] = useState(false);

    const [formData, setFormData] = useState<ListingFormData>({
        serviceType: 'hydraulik',
        title: '',
        description: '',
        basePrice: 100,
        radius: 25,
        address: '',
        lat: 52.2297,  // Warsaw default
        lng: 21.0122
    });

    // Get user's location on open
    useEffect(() => {
        if (isOpen && navigator.geolocation) {
            setIsLocating(true);
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    setFormData(prev => ({
                        ...prev,
                        lat: position.coords.latitude,
                        lng: position.coords.longitude
                    }));
                    setIsLocating(false);
                },
                () => setIsLocating(false),
                { enableHighAccuracy: true }
            );
        }
    }, [isOpen]);

    const handleSubmit = async () => {
        if (!user || !db) return;

        // Validation
        if (!formData.title.trim()) {
            setError("Podaj tytuł ogłoszenia");
            return;
        }
        if (formData.basePrice <= 0) {
            setError("Podaj prawidłową cenę");
            return;
        }

        setIsSubmitting(true);
        setError(null);

        try {
            // Create/Update provider document
            const providerRef = doc(db, "providers", user.uid);

            await setDoc(providerRef, {
                uid: user.uid,
                displayName: user.displayName || "Fachowiec",
                email: user.email,
                photoURL: user.photoURL,
                serviceType: formData.serviceType,
                title: formData.title,
                description: formData.description,
                basePrice: formData.basePrice,
                radius: formData.radius,
                location: new GeoPoint(formData.lat, formData.lng),
                address: formData.address,
                rating: 5.0,
                reviewCount: 0,
                isOnline: true,
                isBusy: false,
                isSuperFachowiec: false,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp()
            }, { merge: true });

            // Also update provider_status for real-time map updates
            const statusRef = doc(db, "provider_status", user.uid);
            await setDoc(statusRef, {
                isOnline: true,
                isBusy: false,
                lastSeenAt: serverTimestamp(),
                location: new GeoPoint(formData.lat, formData.lng)
            }, { merge: true });

            setSuccess(true);

            setTimeout(() => {
                onSuccess?.();
                onClose();
                setSuccess(false);
                // Reset form
                setFormData({
                    serviceType: 'hydraulik',
                    title: '',
                    description: '',
                    basePrice: 100,
                    radius: 25,
                    address: '',
                    lat: 52.2297,
                    lng: 21.0122
                });
            }, 1500);

        } catch (err) {
            console.error("Error creating listing:", err);
            setError("Wystąpił błąd. Spróbuj ponownie.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
                    onClick={onClose}
                >
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.9, opacity: 0 }}
                        className="w-full max-w-lg bg-slate-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between p-4 border-b border-white/10">
                            <h2 className="text-lg font-bold text-white flex items-center gap-2">
                                <Briefcase className="w-5 h-5 text-indigo-400" />
                                Dodaj Ogłoszenie
                            </h2>
                            <button
                                onClick={onClose}
                                className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        {/* Success State */}
                        {success && (
                            <div className="p-8 text-center">
                                <motion.div
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4"
                                >
                                    <Check className="w-8 h-8 text-green-400" />
                                </motion.div>
                                <h3 className="text-xl font-bold text-white mb-2">Ogłoszenie dodane!</h3>
                                <p className="text-slate-400">Twój profil jest teraz widoczny na mapie</p>
                            </div>
                        )}

                        {/* Form */}
                        {!success && (
                            <div className="p-4 space-y-4 max-h-[70vh] overflow-y-auto">
                                {/* Service Type */}
                                <div>
                                    <label className="text-sm text-slate-400 mb-2 block">Rodzaj usługi</label>
                                    <div className="grid grid-cols-4 gap-2">
                                        {SERVICE_OPTIONS.map((option) => (
                                            <button
                                                key={option.value}
                                                onClick={() => setFormData(prev => ({ ...prev, serviceType: option.value }))}
                                                className={`p-3 rounded-xl border text-center transition-all ${formData.serviceType === option.value
                                                    ? 'bg-indigo-500/20 border-indigo-500/50 text-white'
                                                    : 'bg-slate-800/50 border-white/10 text-slate-400 hover:border-white/20'
                                                    }`}
                                            >
                                                <span className="text-xl">{option.icon}</span>
                                                <p className="text-[10px] mt-1">{option.label}</p>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Title */}
                                <div>
                                    <label className="text-sm text-slate-400 mb-2 block">Tytuł ogłoszenia</label>
                                    <input
                                        type="text"
                                        value={formData.title}
                                        onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                                        placeholder="np. Hydraulik z 10-letnim doświadczeniem"
                                        className="w-full bg-slate-800/50 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500/50"
                                    />
                                </div>

                                {/* Description */}
                                <div>
                                    <label className="text-sm text-slate-400 mb-2 block">Opis usług</label>
                                    <textarea
                                        value={formData.description}
                                        onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                                        placeholder="Opisz swoje usługi, doświadczenie..."
                                        rows={3}
                                        className="w-full bg-slate-800/50 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500/50 resize-none"
                                    />
                                </div>

                                {/* Price & Radius */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-sm text-slate-400 mb-2 block flex items-center gap-1">
                                            <DollarSign className="w-3.5 h-3.5" />
                                            Cena od (zł/h)
                                        </label>
                                        <input
                                            type="number"
                                            value={formData.basePrice}
                                            onChange={(e) => setFormData(prev => ({ ...prev, basePrice: parseInt(e.target.value) || 0 }))}
                                            min={0}
                                            className="w-full bg-slate-800/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500/50"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-sm text-slate-400 mb-2 block flex items-center gap-1">
                                            <MapPin className="w-3.5 h-3.5" />
                                            Zasięg (km)
                                        </label>
                                        <input
                                            type="number"
                                            value={formData.radius}
                                            onChange={(e) => setFormData(prev => ({ ...prev, radius: parseInt(e.target.value) || 0 }))}
                                            min={1}
                                            max={100}
                                            className="w-full bg-slate-800/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500/50"
                                        />
                                    </div>
                                </div>

                                {/* Address */}
                                <div>
                                    <label className="text-sm text-slate-400 mb-2 block flex items-center gap-1">
                                        <MapPin className="w-3.5 h-3.5" />
                                        Adres bazowy
                                    </label>
                                    <div className="relative">
                                        <input
                                            type="text"
                                            value={formData.address}
                                            onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                                            placeholder="np. Warszawa, Mokotów"
                                            className="w-full bg-slate-800/50 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500/50"
                                        />
                                        {isLocating && (
                                            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-indigo-400" />
                                        )}
                                    </div>
                                    <p className="text-[10px] text-slate-600 mt-1">
                                        Lokalizacja GPS: {formData.lat.toFixed(4)}, {formData.lng.toFixed(4)}
                                    </p>
                                </div>

                                {/* Error */}
                                {error && (
                                    <div className="flex items-center gap-2 text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
                                        <AlertCircle className="w-4 h-4" />
                                        {error}
                                    </div>
                                )}

                                {/* Submit */}
                                <button
                                    onClick={handleSubmit}
                                    disabled={isSubmitting}
                                    className="w-full py-4 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-500 text-white font-bold hover:from-indigo-600 hover:to-violet-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                >
                                    {isSubmitting ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            Zapisuję...
                                        </>
                                    ) : (
                                        <>
                                            <Check className="w-4 h-4" />
                                            Opublikuj Ogłoszenie
                                        </>
                                    )}
                                </button>
                            </div>
                        )}
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
