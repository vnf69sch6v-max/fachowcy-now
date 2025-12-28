"use client";

/**
 * RegistrationWizard - Professional Onboarding Flow
 * 
 * 3-Step Registration Process:
 * 1. Location (Google Places with Session Tokens)
 * 2. Business Info (Categories, Description, Price)
 * 3. Contact Details (Phone, Email, Terms)
 * 
 * Uses atomic batch writes for data consistency.
 */

import { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    MapPin,
    Briefcase,
    Phone,
    ChevronRight,
    ChevronLeft,
    Loader2,
    CheckCircle,
    AlertCircle,
    Building,
    Tag,
    FileText,
    DollarSign,
    Mail,
    Shield,
    Sparkles
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useMapsLibrary } from "@vis.gl/react-google-maps";
import { geohashForLocation } from "geofire-common";
import {
    useGeospatialRegistration,
    PlaceData,
    ServiceCategory,
    CATEGORY_LABELS,
    RegistrationData
} from "@/hooks/useGeospatialRegistration";
import { useAuth } from "@/context/AuthContext";

// ===========================================
// TYPES
// ===========================================

type WizardStep = 1 | 2 | 3;

interface FormData {
    // Step 1: Location
    place: PlaceData | null;
    searchQuery: string;

    // Step 2: Business
    displayName: string;
    categories: ServiceCategory[];
    description: string;
    basePrice: number;

    // Step 3: Contact
    phoneNumber: string;
    email: string;
    taxId: string;
    acceptedTerms: boolean;
    acceptedPrivacy: boolean;
}

// ===========================================
// INITIAL STATE
// ===========================================

const initialFormData: FormData = {
    place: null,
    searchQuery: '',
    displayName: '',
    categories: [],
    description: '',
    basePrice: 100,
    phoneNumber: '',
    email: '',
    taxId: '',
    acceptedTerms: false,
    acceptedPrivacy: false
};

// ===========================================
// PLACES AUTOCOMPLETE (with Session Tokens)
// ===========================================

interface PlacesInputProps {
    value: string;
    onChange: (value: string) => void;
    onPlaceSelect: (place: PlaceData) => void;
}

function PlacesInput({ value, onChange, onPlaceSelect }: PlacesInputProps) {
    const [predictions, setPredictions] = useState<google.maps.places.AutocompletePrediction[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const places = useMapsLibrary("places");

    // Session token for cost optimization (per specification)
    const [sessionToken, setSessionToken] = useState<google.maps.places.AutocompleteSessionToken | null>(null);

    // Initialize session token
    useEffect(() => {
        if (places) {
            setSessionToken(new places.AutocompleteSessionToken());
        }
    }, [places]);

    // Fetch predictions with session token
    useEffect(() => {
        if (!value || value.length < 3 || !places || !sessionToken) {
            setPredictions([]);
            return;
        }

        const service = new places.AutocompleteService();
        setIsLoading(true);

        service.getPlacePredictions(
            {
                input: value,
                sessionToken,
                // Country restriction (per specification)
                componentRestrictions: { country: 'pl' },
                types: ['establishment', 'geocode']
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
    }, [value, places, sessionToken]);

    // Handle place selection with Field Masking
    const handleSelect = useCallback((prediction: google.maps.places.AutocompletePrediction) => {
        if (!places) return;

        setIsLoading(true);

        const div = document.createElement('div');
        const placesService = new places.PlacesService(div);

        placesService.getDetails(
            {
                placeId: prediction.place_id,
                sessionToken: sessionToken!,
                // FIELD MASKING - only required fields (per specification)
                fields: ['place_id', 'name', 'formatted_address', 'geometry', 'types']
            },
            (place, status) => {
                setIsLoading(false);

                if (status === google.maps.places.PlacesServiceStatus.OK && place?.geometry?.location) {
                    const placeData: PlaceData = {
                        placeId: place.place_id || prediction.place_id,
                        displayName: place.name || prediction.structured_formatting.main_text,
                        formattedAddress: place.formatted_address || prediction.description,
                        lat: place.geometry.location.lat(),
                        lng: place.geometry.location.lng(),
                        types: place.types || []
                    };

                    onPlaceSelect(placeData);
                    onChange(place.formatted_address || prediction.description);
                    setPredictions([]);
                    setIsOpen(false);

                    // Generate new session token for next search
                    setSessionToken(new places.AutocompleteSessionToken());
                }
            }
        );
    }, [places, sessionToken, onPlaceSelect, onChange]);

    return (
        <div className="relative">
            <div className="relative">
                <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-indigo-400" />
                <input
                    type="text"
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    onFocus={() => predictions.length > 0 && setIsOpen(true)}
                    placeholder="Wpisz adres firmy lub lokalizację..."
                    className="w-full bg-slate-800/50 border border-white/10 rounded-xl pl-12 pr-12 py-4 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/20 transition-all"
                />
                {isLoading && (
                    <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 animate-spin text-indigo-400" />
                )}
            </div>

            {/* Predictions Dropdown */}
            <AnimatePresence>
                {isOpen && predictions.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="absolute top-full left-0 right-0 z-50 mt-2 bg-slate-800 border border-white/10 rounded-xl overflow-hidden shadow-2xl"
                    >
                        {predictions.map((prediction) => (
                            <button
                                key={prediction.place_id}
                                onClick={() => handleSelect(prediction)}
                                className="w-full px-4 py-3 text-left hover:bg-white/5 transition-colors border-b border-white/5 last:border-b-0"
                            >
                                <div className="flex items-start gap-3">
                                    <MapPin className="w-4 h-4 text-indigo-400 mt-0.5 flex-shrink-0" />
                                    <div>
                                        <p className="text-white text-sm font-medium">
                                            {prediction.structured_formatting.main_text}
                                        </p>
                                        <p className="text-slate-400 text-xs">
                                            {prediction.structured_formatting.secondary_text}
                                        </p>
                                    </div>
                                </div>
                            </button>
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

// ===========================================
// CATEGORY SELECTOR
// ===========================================

interface CategorySelectorProps {
    selected: ServiceCategory[];
    onChange: (categories: ServiceCategory[]) => void;
}

function CategorySelector({ selected, onChange }: CategorySelectorProps) {
    const toggleCategory = (category: ServiceCategory) => {
        if (selected.includes(category)) {
            onChange(selected.filter(c => c !== category));
        } else {
            onChange([...selected, category]);
        }
    };

    return (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {(Object.entries(CATEGORY_LABELS) as [ServiceCategory, string][]).map(([key, label]) => (
                <button
                    key={key}
                    type="button"
                    onClick={() => toggleCategory(key)}
                    className={`px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${selected.includes(key)
                        ? 'bg-indigo-500/30 border-indigo-500/50 text-indigo-300 ring-1 ring-indigo-500/30'
                        : 'bg-slate-800/50 border-white/10 text-slate-400 hover:bg-slate-700/50'
                        } border`}
                >
                    {label}
                </button>
            ))}
        </div>
    );
}

// ===========================================
// MAIN WIZARD COMPONENT
// ===========================================

export function RegistrationWizard() {
    const router = useRouter();
    const { user } = useAuth();
    const registration = useGeospatialRegistration();

    const [currentStep, setCurrentStep] = useState<WizardStep>(1);
    const [formData, setFormData] = useState<FormData>({
        ...initialFormData,
        email: user?.email || ''
    });

    // Update email when user changes
    useEffect(() => {
        if (user?.email) {
            setFormData(prev => ({ ...prev, email: user.email || '' }));
        }
    }, [user?.email]);

    // Navigate steps
    const nextStep = () => setCurrentStep(prev => Math.min(prev + 1, 3) as WizardStep);
    const prevStep = () => setCurrentStep(prev => Math.max(prev - 1, 1) as WizardStep);

    // Validate current step
    const isStepValid = useCallback(() => {
        switch (currentStep) {
            case 1:
                return formData.place !== null;
            case 2:
                return formData.displayName.length >= 3 &&
                    formData.categories.length > 0 &&
                    formData.basePrice > 0;
            case 3:
                return formData.phoneNumber.length >= 9 &&
                    formData.acceptedTerms &&
                    formData.acceptedPrivacy;
            default:
                return false;
        }
    }, [currentStep, formData]);

    // Submit registration
    const handleSubmit = async () => {
        if (!formData.place) return;

        const registrationData: RegistrationData = {
            place: formData.place,
            privateData: {
                email: formData.email,
                phoneNumber: formData.phoneNumber,
                taxId: formData.taxId || undefined,
                acceptedTerms: formData.acceptedTerms,
                acceptedPrivacy: formData.acceptedPrivacy
            },
            publicData: {
                displayName: formData.displayName,
                categories: formData.categories,
                description: formData.description,
                basePrice: formData.basePrice
            }
        };

        const success = await registration.submitRegistration(registrationData);

        if (success) {
            // Redirect to Pro Dashboard
            setTimeout(() => router.push('/pro/dashboard'), 1500);
        }
    };

    // Step configuration
    const steps = [
        { icon: MapPin, label: 'Lokalizacja' },
        { icon: Briefcase, label: 'Działalność' },
        { icon: Phone, label: 'Kontakt' }
    ];

    return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="w-full max-w-2xl bg-slate-900/50 border border-white/10 rounded-2xl overflow-hidden backdrop-blur-xl"
            >
                {/* Header */}
                <div className="p-6 border-b border-white/10 bg-gradient-to-r from-indigo-500/10 to-violet-500/10">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center">
                            <Sparkles className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-white">Rejestracja Fachowca</h1>
                            <p className="text-slate-400 text-sm">Krok {currentStep} z 3</p>
                        </div>
                    </div>

                    {/* Progress Steps */}
                    <div className="flex items-center justify-between">
                        {steps.map((step, idx) => (
                            <div key={idx} className="flex-1 flex items-center">
                                <div className={`
                                    w-10 h-10 rounded-full flex items-center justify-center transition-all
                                    ${idx + 1 <= currentStep
                                        ? 'bg-indigo-500 text-white'
                                        : 'bg-slate-800 text-slate-500'
                                    }
                                `}>
                                    {idx + 1 < currentStep ? (
                                        <CheckCircle className="w-5 h-5" />
                                    ) : (
                                        <step.icon className="w-5 h-5" />
                                    )}
                                </div>
                                {idx < steps.length - 1 && (
                                    <div className={`
                                        flex-1 h-0.5 mx-2 transition-all
                                        ${idx + 1 < currentStep ? 'bg-indigo-500' : 'bg-slate-700'}
                                    `} />
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Content */}
                <div className="p-6">
                    <AnimatePresence mode="wait">
                        {/* Step 1: Location */}
                        {currentStep === 1 && (
                            <motion.div
                                key="step1"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="space-y-4"
                            >
                                {!formData.place ? (
                                    <div>
                                        <label className="block text-sm font-medium text-slate-300 mb-2">
                                            <Building className="w-4 h-4 inline-block mr-2" />
                                            Adres Twojej firmy lub baza operacyjna
                                        </label>
                                        <PlacesInput
                                            value={formData.searchQuery}
                                            onChange={(value) => setFormData(prev => ({ ...prev, searchQuery: value }))}
                                            onPlaceSelect={(place) => setFormData(prev => ({
                                                ...prev,
                                                place,
                                                displayName: prev.displayName || place.displayName
                                            }))}
                                        />
                                    </div>
                                ) : (
                                    <motion.div
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl relative group"
                                    >
                                        <div className="flex items-start justify-between">
                                            <div>
                                                <div className="flex items-center gap-2 text-emerald-400 mb-2">
                                                    <CheckCircle className="w-5 h-5" />
                                                    <span className="font-medium">Lokalizacja potwierdzona</span>
                                                </div>
                                                <p className="text-slate-300 text-sm font-medium">{formData.place.displayName}</p>
                                                <p className="text-slate-400 text-sm">{formData.place.formattedAddress}</p>
                                                <p className="text-slate-500 text-xs mt-1">
                                                    Współrzędne: {formData.place.lat.toFixed(6)}, {formData.place.lng.toFixed(6)}
                                                </p>
                                            </div>
                                            <button
                                                onClick={() => setFormData(prev => ({ ...prev, place: null, searchQuery: '' }))}
                                                className="px-3 py-1.5 text-xs font-medium text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors border border-white/10"
                                            >
                                                Zmień
                                            </button>
                                        </div>
                                    </motion.div>
                                )}
                            </motion.div>
                        )}

                        {/* Step 2: Business Details */}
                        {currentStep === 2 && (
                            <motion.div
                                key="step2"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="space-y-5"
                            >
                                {/* Business Name */}
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-2">
                                        <Building className="w-4 h-4 inline-block mr-2" />
                                        Nazwa działalności
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.displayName}
                                        onChange={(e) => setFormData(prev => ({ ...prev, displayName: e.target.value }))}
                                        placeholder="np. Hydraulik Jan Kowalski"
                                        className="w-full bg-slate-800/50 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500/50"
                                    />
                                </div>

                                {/* Categories */}
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-2">
                                        <Tag className="w-4 h-4 inline-block mr-2" />
                                        Kategorie usług
                                    </label>
                                    <CategorySelector
                                        selected={formData.categories}
                                        onChange={(categories) => setFormData(prev => ({ ...prev, categories }))}
                                    />
                                </div>

                                {/* Description */}
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-2">
                                        <FileText className="w-4 h-4 inline-block mr-2" />
                                        Opis usług (opcjonalnie)
                                    </label>
                                    <textarea
                                        value={formData.description}
                                        onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                                        placeholder="Opisz swoje usługi, doświadczenie, specjalizacje..."
                                        rows={3}
                                        className="w-full bg-slate-800/50 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500/50 resize-none"
                                    />
                                </div>

                                {/* Base Price */}
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-2">
                                        <DollarSign className="w-4 h-4 inline-block mr-2" />
                                        Cena bazowa (zł)
                                    </label>
                                    <input
                                        type="number"
                                        value={formData.basePrice}
                                        onChange={(e) => setFormData(prev => ({ ...prev, basePrice: parseInt(e.target.value) || 0 }))}
                                        min={1}
                                        className="w-full bg-slate-800/50 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500/50"
                                    />
                                </div>
                            </motion.div>
                        )}

                        {/* Step 3: Contact Details */}
                        {currentStep === 3 && (
                            <motion.div
                                key="step3"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="space-y-5"
                            >
                                {/* Phone */}
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-2">
                                        <Phone className="w-4 h-4 inline-block mr-2" />
                                        Numer telefonu
                                    </label>
                                    <input
                                        type="tel"
                                        value={formData.phoneNumber}
                                        onChange={(e) => setFormData(prev => ({ ...prev, phoneNumber: e.target.value }))}
                                        placeholder="+48 123 456 789"
                                        className="w-full bg-slate-800/50 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500/50"
                                    />
                                </div>

                                {/* Email */}
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-2">
                                        <Mail className="w-4 h-4 inline-block mr-2" />
                                        Email
                                    </label>
                                    <input
                                        type="email"
                                        value={formData.email}
                                        onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                                        placeholder="jan@example.com"
                                        className="w-full bg-slate-800/50 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500/50"
                                    />
                                </div>

                                {/* NIP (optional) */}
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-2">
                                        <FileText className="w-4 h-4 inline-block mr-2" />
                                        NIP (opcjonalnie)
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.taxId}
                                        onChange={(e) => setFormData(prev => ({ ...prev, taxId: e.target.value }))}
                                        placeholder="1234567890"
                                        className="w-full bg-slate-800/50 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500/50"
                                    />
                                </div>

                                {/* Terms */}
                                <div className="space-y-3 pt-2">
                                    <label className="flex items-start gap-3 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={formData.acceptedTerms}
                                            onChange={(e) => setFormData(prev => ({ ...prev, acceptedTerms: e.target.checked }))}
                                            className="mt-1 w-4 h-4 rounded border-slate-600 bg-slate-800 text-indigo-500 focus:ring-indigo-500/30"
                                        />
                                        <span className="text-sm text-slate-400">
                                            Akceptuję <a href="#" className="text-indigo-400 hover:underline">Regulamin</a> serwisu
                                        </span>
                                    </label>
                                    <label className="flex items-start gap-3 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={formData.acceptedPrivacy}
                                            onChange={(e) => setFormData(prev => ({ ...prev, acceptedPrivacy: e.target.checked }))}
                                            className="mt-1 w-4 h-4 rounded border-slate-600 bg-slate-800 text-indigo-500 focus:ring-indigo-500/30"
                                        />
                                        <span className="text-sm text-slate-400">
                                            Akceptuję <a href="#" className="text-indigo-400 hover:underline">Politykę Prywatności</a> (RODO)
                                        </span>
                                    </label>
                                </div>
                            </motion.div>
                        )}

                        {/* Success State */}
                        {registration.step === 'SUCCESS' && (
                            <motion.div
                                key="success"
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="text-center py-8"
                            >
                                <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-4">
                                    <CheckCircle className="w-8 h-8 text-emerald-400" />
                                </div>
                                <h2 className="text-xl font-bold text-white mb-2">Rejestracja zakończona!</h2>
                                <p className="text-slate-400">Przekierowuję do Twojego kokpitu...</p>
                            </motion.div>
                        )}

                        {/* Error State */}
                        {registration.step === 'ERROR' && (
                            <motion.div
                                key="error"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl mb-4"
                            >
                                <div className="flex items-center gap-2 text-red-400">
                                    <AlertCircle className="w-5 h-5" />
                                    <span>{registration.error}</span>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Footer Actions */}
                {registration.step !== 'SUCCESS' && (
                    <div className="p-6 border-t border-white/10 flex items-center justify-between">
                        <button
                            onClick={prevStep}
                            disabled={currentStep === 1}
                            className="flex items-center gap-2 px-4 py-2 rounded-xl text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        >
                            <ChevronLeft className="w-4 h-4" />
                            Wstecz
                        </button>

                        {currentStep < 3 ? (
                            <button
                                onClick={nextStep}
                                disabled={!isStepValid()}
                                className="flex items-center gap-2 px-6 py-3 rounded-xl bg-indigo-500 hover:bg-indigo-400 text-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                            >
                                Dalej
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        ) : (
                            <button
                                onClick={handleSubmit}
                                disabled={!isStepValid() || registration.isSubmitting}
                                className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-emerald-500/20"
                            >
                                {registration.isSubmitting ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        Rejestruję...
                                    </>
                                ) : (
                                    <>
                                        <Shield className="w-4 h-4" />
                                        Zarejestruj się
                                    </>
                                )}
                            </button>
                        )}
                    </div>
                )}
            </motion.div>
        </div>
    );
}
