"use client";

/**
 * AI Job Assistant v2 - Premium Design
 * 
 * Psychology-based colors:
 * - Gradient blue-purple: Trust, innovation, creativity
 * - Green accents: Success, growth, money
 * - Warm gradients: Energy, urgency
 * 
 * Features:
 * - Larger, more immersive chat
 * - Professional profile cards with routes
 * - Real-time AI analysis
 * - Photo upload
 */

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    X,
    Send,
    MapPin,
    Camera,
    Loader2,
    Sparkles,
    Navigation,
    CheckCircle,
    Clock,
    User,
    Star,
    ChevronRight,
    Image as ImageIcon,
    Phone,
    MessageCircle,
    Shield,
    Zap,
    ArrowLeft
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";
import {
    analyzeJobDescription,
    findNearbyPros,
    AI_MESSAGES,
    AIAnalysisResult,
    NearbyPro
} from "@/lib/ai-assistant";
import { BookingModal } from "./BookingModal";
import { publishJobRequest, PublishJobInput } from "@/lib/marketplace-service";
import { ImageUploader } from "@/components/ui/ImageUploader";
import { useNearbyProviders } from "@/hooks/useNearbyProviders";


// ===========================================
// TYPES
// ===========================================

type MessageType = 'assistant' | 'user' | 'system';
type AssistantState =
    | 'greeting'
    | 'awaiting_description'
    | 'analyzing'
    | 'asking_location'
    | 'finding_pros'
    | 'showing_pros'
    | 'viewing_profile'
    | 'asking_photos'
    | 'confirming'
    | 'publishing'
    | 'done';

interface Message {
    id: string;
    type: MessageType;
    content: string;
    timestamp: Date;
    component?: React.ReactNode;
}

interface JobDraft {
    description: string;
    aiResult?: AIAnalysisResult;
    location?: { lat: number; lng: number; address: string };
    photoUrls?: string[];
    matchedPros?: NearbyPro[];
    selectedPro?: NearbyPro;
}

interface AIJobAssistantProps {
    isOpen: boolean;
    onClose: () => void;
    onJobCreated?: (jobId: string) => void;
    onViewProOnMap?: (pro: NearbyPro) => void;
    onOpenChat?: (pro: NearbyPro) => void;
    fullscreen?: boolean; // When true, renders as fullscreen view instead of modal
}

// ===========================================
// PROFESSIONAL PROFILE VIEW
// ===========================================

function ProProfileView({
    pro,
    onBack,
    onContact,
    onViewRoute,
    onBook
}: {
    pro: NearbyPro;
    onBack: () => void;
    onContact: () => void;
    onViewRoute: () => void;
    onBook: () => void;
}) {
    return (
        <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 50 }}
            className="absolute inset-0 bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 z-10 flex flex-col"
        >
            {/* Header with back button */}
            <div className="p-4 border-b border-white/10 flex items-center gap-3">
                <button
                    onClick={onBack}
                    className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
                >
                    <ArrowLeft className="w-5 h-5 text-white" />
                </button>
                <h2 className="text-white font-bold">Profil fachowca</h2>
            </div>

            {/* Profile Content */}
            <div className="flex-1 overflow-y-auto p-6">
                {/* Avatar & Basic Info */}
                <div className="text-center mb-6">
                    <div className="relative inline-block">
                        <div className="w-24 h-24 rounded-2xl overflow-hidden border-4 border-white/20 shadow-2xl mx-auto">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={pro.imageUrl} alt={pro.name} className="w-full h-full object-cover" />
                        </div>
                        {pro.isVerified && (
                            <div className="absolute -bottom-2 -right-2 bg-blue-500 rounded-full p-1.5 border-2 border-slate-900">
                                <Shield className="w-4 h-4 text-white" />
                            </div>
                        )}
                    </div>

                    <h3 className="text-2xl font-bold text-white mt-4">{pro.name}</h3>
                    <p className="text-slate-400">{pro.profession}</p>

                    {/* Rating */}
                    <div className="flex items-center justify-center gap-2 mt-2">
                        <div className="flex items-center gap-1 bg-amber-500/20 px-3 py-1 rounded-full">
                            <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                            <span className="text-amber-400 font-bold">{pro.rating}</span>
                        </div>
                        <span className="text-slate-500 text-sm">({pro.reviewCount} opinii)</span>
                    </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-3 gap-3 mb-6">
                    <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
                        <MapPin className="w-5 h-5 text-blue-400 mx-auto mb-1" />
                        <p className="text-white font-bold">{pro.distance} km</p>
                        <p className="text-slate-500 text-xs">Odległość</p>
                    </div>
                    <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
                        <Clock className="w-5 h-5 text-emerald-400 mx-auto mb-1" />
                        <p className="text-white font-bold">~{pro.estimatedArrival} min</p>
                        <p className="text-slate-500 text-xs">Dojazd</p>
                    </div>
                    <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
                        <Zap className="w-5 h-5 text-violet-400 mx-auto mb-1" />
                        <p className="text-white font-bold">{pro.responseRate || 95}%</p>
                        <p className="text-slate-500 text-xs">Odpowiedzi</p>
                    </div>
                </div>

                {/* Price */}
                <div className="bg-gradient-to-r from-emerald-500/10 to-green-500/10 border border-emerald-500/30 rounded-xl p-4 mb-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-slate-400 text-sm">Cena za usługę</p>
                            <p className="text-3xl font-bold text-emerald-400">{pro.price} zł</p>
                        </div>
                        <div className="text-right">
                            <p className="text-xs text-slate-500">lub wg. wyceny</p>
                        </div>
                    </div>
                </div>

                {/* Description */}
                {pro.description && (
                    <div className="mb-6">
                        <h4 className="text-white font-semibold mb-2">O fachowcu</h4>
                        <p className="text-slate-400 text-sm leading-relaxed">{pro.description}</p>
                    </div>
                )}
            </div>

            {/* Action Buttons */}
            <div className="p-4 border-t border-white/10 bg-slate-900/50 backdrop-blur-xl">
                <div className="grid grid-cols-2 gap-3 mb-3">
                    <button
                        onClick={onViewRoute}
                        className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 transition-all text-sm font-semibold text-white"
                    >
                        <Navigation className="w-4 h-4" />
                        Zobacz trasę
                    </button>
                    <button
                        onClick={onContact}
                        className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-400 hover:to-indigo-400 text-white font-semibold text-sm transition-all shadow-lg shadow-blue-500/20"
                    >
                        <MessageCircle className="w-4 h-4" />
                        Napisz
                    </button>
                </div>
                <button
                    onClick={onBook}
                    className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-400 hover:to-green-400 text-white font-bold text-sm transition-all shadow-lg shadow-emerald-500/20"
                >
                    <Phone className="w-4 h-4" />
                    Zatrudnij tego fachowca
                </button>
            </div>
        </motion.div>
    );
}

// ===========================================
// PROFESSIONAL CARD
// ===========================================

function ProCard({
    pro,
    index,
    onSelect,
    onBook
}: {
    pro: NearbyPro;
    index: number;
    onSelect: () => void;
    onBook?: () => void;
}) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="w-full p-4 bg-gradient-to-br from-slate-800/80 to-slate-900/80 border border-white/10 rounded-2xl hover:border-indigo-500/30 transition-all shadow-lg"
        >
            <button
                onClick={onSelect}
                className="w-full flex items-center gap-4 text-left group"
            >
                {/* Avatar with ranking */}
                <div className="relative flex-shrink-0">
                    <div className="w-16 h-16 rounded-xl overflow-hidden border-2 border-white/20 group-hover:border-indigo-400/50 transition-colors">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={pro.imageUrl} alt={pro.name} className="w-full h-full object-cover" />
                    </div>
                    {/* Rank badge */}
                    <div className={cn(
                        "absolute -top-2 -left-2 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold",
                        index === 0 ? "bg-gradient-to-r from-amber-400 to-yellow-400 text-slate-900" :
                            index === 1 ? "bg-gradient-to-r from-slate-300 to-slate-400 text-slate-900" :
                                index === 2 ? "bg-gradient-to-r from-amber-600 to-amber-700 text-white" :
                                    "bg-slate-700 text-slate-300"
                    )}>
                        {index + 1}
                    </div>
                    {pro.isVerified && (
                        <div className="absolute -bottom-1 -right-1 bg-blue-500 rounded-full p-0.5 border-2 border-slate-900">
                            <Shield className="w-2.5 h-2.5 text-white" />
                        </div>
                    )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                        <p className="text-white font-semibold truncate">{pro.name}</p>
                        {index === 0 && (
                            <span className="px-1.5 py-0.5 bg-amber-500/20 text-amber-400 text-[10px] font-bold rounded">TOP</span>
                        )}
                    </div>
                    <p className="text-slate-400 text-sm">{pro.profession}</p>

                    {/* Rating & Distance */}
                    <div className="flex items-center gap-3 mt-1">
                        <div className="flex items-center gap-1">
                            <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                            <span className="text-amber-400 text-sm font-medium">{pro.rating}</span>
                            <span className="text-slate-500 text-xs">({pro.reviewCount})</span>
                        </div>
                        <span className="text-slate-600">•</span>
                        <div className="flex items-center gap-1 text-slate-400 text-sm">
                            <MapPin className="w-3 h-3" />
                            {pro.distance} km
                        </div>
                        <span className="text-slate-600">•</span>
                        <div className="flex items-center gap-1 text-slate-400 text-sm">
                            <Clock className="w-3 h-3" />
                            ~{pro.estimatedArrival} min
                        </div>
                    </div>
                </div>

                {/* Price */}
                <div className="text-right flex-shrink-0">
                    <p className="text-emerald-400 font-bold text-lg">{pro.price} zł</p>
                    <ChevronRight className="w-5 h-5 text-slate-500 group-hover:text-indigo-400 transition-colors ml-auto" />
                </div>
            </button>

            {/* Book Button */}
            {onBook && (
                <motion.button
                    onClick={(e) => {
                        e.stopPropagation();
                        onBook();
                    }}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="w-full mt-3 py-2.5 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 text-white font-semibold rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20"
                >
                    <CheckCircle className="w-4 h-4" />
                    Rezerwuj teraz
                </motion.button>
            )}
        </motion.div>
    );
}

// ===========================================
// MESSAGE BUBBLE
// ===========================================

function MessageBubble({ message }: { message: Message }) {
    const isAssistant = message.type === 'assistant';

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn(
                "flex gap-3 mb-4",
                !isAssistant && "flex-row-reverse"
            )}
        >
            {/* Avatar */}
            <div className={cn(
                "w-10 h-10 rounded-xl flex-shrink-0 flex items-center justify-center shadow-lg",
                isAssistant
                    ? "bg-gradient-to-br from-violet-500 via-purple-500 to-indigo-500"
                    : "bg-gradient-to-br from-slate-600 to-slate-700"
            )}>
                {isAssistant ? (
                    <Sparkles className="w-5 h-5 text-white" />
                ) : (
                    <User className="w-5 h-5 text-slate-300" />
                )}
            </div>

            {/* Content */}
            <div className={cn(
                "max-w-[85%] rounded-2xl px-5 py-4",
                isAssistant
                    ? "bg-gradient-to-br from-slate-800/90 to-slate-900/90 border border-white/10 shadow-xl"
                    : "bg-gradient-to-br from-indigo-500/20 to-violet-500/20 border border-indigo-500/30"
            )}>
                <p className="text-white text-[15px] leading-relaxed whitespace-pre-wrap">
                    {message.content.split('**').map((part, i) =>
                        i % 2 === 1 ? <strong key={i} className="text-indigo-300">{part}</strong> : part
                    )}
                </p>
                {message.component && (
                    <div className="mt-4">
                        {message.component}
                    </div>
                )}
            </div>
        </motion.div>
    );
}

// ===========================================
// LOCATION BUTTON
// ===========================================

function LocationButton({ onAllow }: { onAllow: (location: { lat: number; lng: number; address: string }) => void }) {
    const [isLoading, setIsLoading] = useState(false);

    const handleClick = async () => {
        setIsLoading(true);

        try {
            // Try real geolocation
            if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(
                    async (position) => {
                        // Reverse geocode to get address
                        let address = 'Poznań, Polska';

                        try {
                            const response = await fetch(
                                `https://maps.googleapis.com/maps/api/geocode/json?latlng=${position.coords.latitude},${position.coords.longitude}&key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}`
                            );
                            const data = await response.json();
                            if (data.results?.[0]) {
                                address = data.results[0].formatted_address;
                            }
                        } catch { }

                        setIsLoading(false);
                        onAllow({
                            lat: position.coords.latitude,
                            lng: position.coords.longitude,
                            address
                        });
                    },
                    () => {
                        // Fallback to Poznań
                        setIsLoading(false);
                        onAllow({ lat: 52.4064, lng: 16.9252, address: 'Poznań, Polska' });
                    },
                    { timeout: 5000 }
                );
            } else {
                setIsLoading(false);
                onAllow({ lat: 52.4064, lng: 16.9252, address: 'Poznań, Polska' });
            }
        } catch {
            setIsLoading(false);
            onAllow({ lat: 52.4064, lng: 16.9252, address: 'Poznań, Polska' });
        }
    };

    return (
        <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleClick}
            disabled={isLoading}
            className="flex items-center gap-3 px-5 py-3.5 bg-gradient-to-r from-blue-500/20 to-indigo-500/20 hover:from-blue-500/30 hover:to-indigo-500/30 border border-blue-500/30 rounded-xl text-white font-medium transition-all disabled:opacity-50 shadow-lg"
        >
            {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin text-blue-400" />
            ) : (
                <MapPin className="w-5 h-5 text-blue-400" />
            )}
            {isLoading ? "Pobieram lokalizację..." : "📍 Użyj mojej lokalizacji"}
        </motion.button>
    );
}

// ===========================================
// PHOTO UPLOAD BUTTONS
// ===========================================

function PhotoUploadButton({ onUpload, onSkip }: { onUpload: () => void; onSkip: () => void }) {
    return (
        <div className="flex flex-col gap-2 mt-2">
            <div className="flex gap-2">
                <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={onUpload}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-violet-500/20 to-purple-500/20 hover:from-violet-500/30 hover:to-purple-500/30 border border-violet-500/30 rounded-xl text-white font-medium transition-all"
                >
                    <Camera className="w-5 h-5 text-violet-400" />
                    Zrób zdjęcie
                </motion.button>
                <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={onUpload}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-slate-700/50 to-slate-800/50 hover:from-slate-600/50 hover:to-slate-700/50 border border-white/10 rounded-xl text-white font-medium transition-all"
                >
                    <ImageIcon className="w-5 h-5 text-slate-400" />
                    Z galerii
                </motion.button>
            </div>
            <button
                onClick={onSkip}
                className="text-slate-500 hover:text-slate-300 text-sm transition-colors"
            >
                Pomiń na razie →
            </button>
        </div>
    );
}

// ===========================================
// JOB SUMMARY
// ===========================================

function JobSummaryCard({
    draft,
    onPublish,
    isPublishing
}: {
    draft: JobDraft;
    onPublish: () => void;
    isPublishing: boolean;
}) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-5 bg-gradient-to-br from-emerald-500/10 to-green-500/10 border border-emerald-500/30 rounded-2xl mt-2 shadow-xl"
        >
            <div className="flex items-center gap-2 text-emerald-400 mb-4">
                <CheckCircle className="w-6 h-6" />
                <span className="font-bold text-lg">Podsumowanie zlecenia</span>
            </div>

            <div className="space-y-3 text-sm">
                <div className="flex justify-between items-center py-2 border-b border-white/5">
                    <span className="text-slate-400">Kategoria</span>
                    <span className="text-white font-semibold">{draft.aiResult?.category}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-white/5">
                    <span className="text-slate-400">Szacunkowy koszt</span>
                    <span className="text-emerald-400 font-bold text-lg">
                        {draft.aiResult?.priceMin}-{draft.aiResult?.priceMax} zł
                    </span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-white/5">
                    <span className="text-slate-400">Ważność</span>
                    <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-blue-400" />
                        <span className="text-white">7 dni</span>
                    </div>
                </div>
                {draft.matchedPros && draft.matchedPros.length > 0 && (
                    <div className="flex justify-between items-center py-2">
                        <span className="text-slate-400">Fachowcy w zasięgu</span>
                        <span className="text-white font-semibold">{draft.matchedPros.length} osób</span>
                    </div>
                )}
            </div>

            <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={onPublish}
                disabled={isPublishing}
                className="w-full mt-5 py-4 bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-400 hover:to-green-400 rounded-xl text-white font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-50 shadow-xl shadow-emerald-500/20"
            >
                {isPublishing ? (
                    <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Publikuję...
                    </>
                ) : (
                    <>
                        <Send className="w-5 h-5" />
                        Opublikuj zlecenie
                    </>
                )}
            </motion.button>
        </motion.div>
    );
}

// ===========================================
// MAIN COMPONENT
// ===========================================

export function AIJobAssistant({ isOpen, onClose, onJobCreated, onViewProOnMap, onOpenChat, fullscreen }: AIJobAssistantProps) {
    const { user } = useAuth();
    const [messages, setMessages] = useState<Message[]>([]);
    const [inputText, setInputText] = useState("");
    const [state, setState] = useState<AssistantState>('greeting');
    const [draft, setDraft] = useState<JobDraft>({ description: '' });
    const [isProcessing, setIsProcessing] = useState(false);
    const [viewingPro, setViewingPro] = useState<NearbyPro | null>(null);
    const [bookingPro, setBookingPro] = useState<NearbyPro | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const hasInitializedRef = useRef(false);

    // Ref to hold latest draft state to avoid stale closures in async callbacks/message components
    const draftRef = useRef<JobDraft>(draft);
    useEffect(() => {
        draftRef.current = draft;
    }, [draft]);

    // Auto-scroll to bottom
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // Real-time Provider Search
    const [nearbyQuery, setNearbyQuery] = useState<{ center: { lat: number; lng: number } | null; category?: string }>({
        center: null,
        category: undefined
    });

    // Import the hook dynamically or assume it's imported at top
    // Note: ensure useNearbyProviders is imported from '@/hooks/useNearbyProviders'
    const { providers: realTimePros, loading: isLoadingPros } = useNearbyProviders({
        center: nearbyQuery.center,
        radiusKm: 15,
        category: nearbyQuery.category
    });

    const addMessage = useCallback((type: MessageType, content: string, component?: React.ReactNode) => {
        const newMessage: Message = {
            id: Date.now().toString() + Math.random(),
            type,
            content,
            timestamp: new Date(),
            component
        };
        setMessages(prev => [...prev, newMessage]);
    }, []);

    // Handle Real-time data arrival
    useEffect(() => {
        if (!isLoadingPros && realTimePros.length > 0 && state === 'finding_pros') {
            // Map real data to UI format
            const mappedPros: NearbyPro[] = realTimePros.map(p => ({
                id: p.id,
                name: p.displayName,
                profession: p.serviceType,
                rating: p.rating,
                reviewCount: p.reviewCount,
                distance: parseFloat(p.distance.toFixed(1)),
                estimatedArrival: Math.round(p.distance * 3 + 5), // Approx logic
                imageUrl: p.thumbnail || `https://ui-avatars.com/api/?name=${encodeURIComponent(p.displayName)}&background=random`,
                price: p.price,
                description: p.isSuperFachowiec ? 'Super Fachowiec! Wyróżnia się jakością.' : 'Zweryfikowany wykonawca.',
                location: { lat: p.lat, lng: p.lng },
                isVerified: p.verificationBadge !== 'none',
                responseRate: 95 // Default or add to MapMarker
            })).slice(0, 4); // Limit to top 4

            setDraft(prev => ({ ...prev, matchedPros: mappedPros }));

            // Show results in chat
            addMessage('assistant', AI_MESSAGES.prosFound(mappedPros.length),
                <div className="space-y-3 mt-2">
                    {mappedPros.map((pro, index) => (
                        <ProCard
                            key={pro.id}
                            pro={pro}
                            index={index}
                            onSelect={() => setViewingPro(pro)}
                            onBook={() => setBookingPro(pro)}
                        />
                    ))}

                    <div className="pt-2 border-t border-white/5 mt-2">
                        <div className="text-xs text-slate-500 mb-2 text-center flex items-center gap-2 justify-center">
                            <span className="h-px w-8 bg-white/10"></span>
                            lub
                            <span className="h-px w-8 bg-white/10"></span>
                        </div>
                        <button
                            onClick={showConfirmation}
                            className="w-full py-2.5 bg-slate-800/50 hover:bg-slate-800 border border-white/10 hover:border-violet-500/30 rounded-xl text-slate-300 hover:text-white text-sm font-medium transition-all flex items-center justify-center gap-2 group"
                        >
                            <Sparkles className="w-4 h-4 text-violet-400 group-hover:text-violet-300 transition-colors" />
                            Opublikuj zlecenie na giełdzie
                        </button>
                    </div>
                </div>
            );
            setState('showing_pros');
        } else if (!isLoadingPros && realTimePros.length === 0 && state === 'finding_pros') {
            // Fallback to mock data if no real data found (for demo continuity)
            // In production: Show noProsFound message
            // For now: let the existing logic allow fallback or manual logic

            // If completely empty, we might want to trigger the mock fallback manually 
            // or handle "No Pros" state
            addMessage('assistant', AI_MESSAGES.noProsFound);
            setState('showing_pros'); // Stop loading state
        }
    }, [realTimePros, isLoadingPros, state, addMessage]); // Removed showConfirmation dependency to avoid circularity if possible. Define showConfirmation above or ignore linter if useCallback.

    // Initial greeting - only once per session
    useEffect(() => {
        if (isOpen && messages.length === 0 && !hasInitializedRef.current) {
            hasInitializedRef.current = true;
            setTimeout(() => {
                addMessage('assistant', AI_MESSAGES.greeting(user?.displayName?.split(' ')[0]));
                setState('awaiting_description');
            }, 300);
        }
    }, [isOpen, messages.length, user?.displayName, addMessage]);


    // Generate AI response using real Vertex AI
    const generateAIResponse = async (text: string): Promise<string> => {
        try {
            const response = await fetch('/api/ai/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: text,
                    context: {
                        jobDescription: draft.description,
                        category: draft.aiResult?.category,
                        priceRange: draft.aiResult ? {
                            min: draft.aiResult.priceMin,
                            max: draft.aiResult.priceMax
                        } : null,
                        professionals: draft.matchedPros?.map(pro => ({
                            name: pro.name,
                            profession: pro.profession,
                            rating: pro.rating,
                            price: pro.price,
                            distance: pro.distance,
                            responseRate: pro.responseRate,
                            description: pro.description
                        })),
                        selectedPro: draft.selectedPro ? {
                            name: draft.selectedPro.name,
                            price: draft.selectedPro.price
                        } : null,
                        location: draft.location ? {
                            address: draft.location.address
                        } : null,
                        currentState: state
                    }
                })
            });

            const data = await response.json();

            if (data.success && data.response) {
                // Check if AI wants to trigger booking
                const lower = text.toLowerCase();
                if (lower.match(/rezerwu|zarezerwu|umów|zamów|chcę go|wybieram|biorę/) && draft.matchedPros) {
                    // Find which pro they want
                    let selectedPro = draft.matchedPros[0];
                    for (const pro of draft.matchedPros) {
                        if (lower.includes(pro.name.toLowerCase().split(' ')[0].toLowerCase())) {
                            selectedPro = pro;
                            break;
                        }
                    }
                    setDraft(prev => ({ ...prev, selectedPro }));
                    setState('confirming');
                }

                // Check if booking confirmed
                if (state === 'confirming' && lower.match(/dziś|dzisiaj|teraz|14|jutro|10|15|pojutrze/)) {
                    setState('done');
                }

                return data.response;
            }

            return data.response || 'Przepraszam, spróbuj ponownie.';
        } catch (error) {
            console.error('AI API Error:', error);
            return 'Przepraszam, mam chwilowe problemy z połączeniem. Spróbuj ponownie! 🔄';
        }
    };

    const handleSend = async () => {
        if (!inputText.trim() || isProcessing) return;

        const text = inputText;
        setInputText("");
        addMessage('user', text);

        // FIRST MESSAGE - Job description
        if (state === 'awaiting_description') {
            setDraft(prev => ({ ...prev, description: text }));
            setState('analyzing');
            setIsProcessing(true);

            // Show analyzing message
            addMessage('assistant', AI_MESSAGES.analyzing);

            // AI Analysis
            const aiResult = await analyzeJobDescription(text);

            setDraft(prev => ({ ...prev, aiResult }));

            // Show result
            addMessage('assistant', AI_MESSAGES.analyzed(aiResult));

            // Ask for location
            setTimeout(() => {
                setMessages(prev => [...prev, {
                    id: Date.now().toString(),
                    type: 'assistant',
                    content: '',
                    timestamp: new Date(),
                    component: <LocationButton onAllow={handleLocationAllowed} />
                }]);
                setState('asking_location');
                setIsProcessing(false);
            }, 500);
            return;
        }

        // Check if user is providing location in text (e.g., "Poznań, ul. Polna 10")
        const locationKeywords = /poznań|warszawa|kraków|wrocław|gdańsk|łódź|katowice|lublin|szczecin|bydgoszcz|białystok|ul\.|ulica|aleja|al\.|osiedle/i;
        const isProvidingLocation = locationKeywords.test(text) && state === 'asking_location';

        if (isProvidingLocation && draft.aiResult) {
            setIsProcessing(true);

            // Use geocoding to get coordinates from address
            let location = { lat: 52.4064, lng: 16.9252, address: text }; // Default Poznań

            try {
                const geoResponse = await fetch(
                    `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(text)}&key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}`
                );
                const geoData = await geoResponse.json();
                if (geoData.results?.[0]) {
                    location = {
                        lat: geoData.results[0].geometry.location.lat,
                        lng: geoData.results[0].geometry.location.lng,
                        address: geoData.results[0].formatted_address
                    };
                }
            } catch { }

            // Trigger location flow with extracted location
            await handleLocationAllowed(location);
            return;
        }

        // Check if user wants professionals (e.g., "zaproponuj fachowców", "pokaż hydraulików")
        const wantsPros = /zaproponuj|pokaż|znajdź|szukaj|fachowc|hydraulik|elektryk|sprzątanie/i.test(text);

        if (wantsPros && draft.aiResult && draft.location) {
            setIsProcessing(true);

            // Trigger hook by setting state
            setNearbyQuery({
                center: draft.location,
                category: draft.aiResult.category
            });

            setState('finding_pros');

            // The useEffect will handle the results when they arrive
            return;

            /* 
               OLD LEGACY LOGIC REMOVED - replaced by real-time hook
               const category = draft.aiResult.category;
               const pros = await findNearbyPros(category, draft.location);
               ... 
            */
        }



        // ALL OTHER MESSAGES - Real Conversational AI
        setIsProcessing(true);

        // Generate response via Vertex AI
        const response = await generateAIResponse(text);

        addMessage('assistant', response);
        setIsProcessing(false);
    };



    const handleLocationAllowed = async (location: { lat: number; lng: number; address: string }) => {
        setIsProcessing(true);
        setState('finding_pros');

        setDraft(prev => ({ ...prev, location }));
        addMessage('assistant', AI_MESSAGES.locationReceived(location.address));

        // Find nearby pros using REF for reliable state
        const category = draftRef.current.aiResult?.category || 'Złota Rączka';
        const pros = await findNearbyPros(category, location);

        setDraft(prev => ({ ...prev, matchedPros: pros }));

        // Ask about photos - logic moved here to ensure sequence
        setTimeout(() => {
            addMessage('assistant', AI_MESSAGES.askPhoto,
                <div className="flex flex-col gap-3">
                    <ImageUploader
                        folder={`job-photos/${user?.uid}`}
                        onUpload={handlePhotoUpload}
                    />
                    <button
                        onClick={handlePhotoSkip}
                        className="text-slate-500 hover:text-slate-300 text-sm transition-colors text-center w-full"
                    >
                        Pomiń dodawanie zdjęcia →
                    </button>
                </div>
            );
            setState('asking_photos');
            setIsProcessing(false);
        }, 800);
    };

    const handlePhotoUpload = (url: string) => {
        addMessage('user', '📸 [Zdjęcie dodane]');
        setDraft(prev => ({
            ...prev,
            photoUrls: [...(prev.photoUrls || []), url]
        }));

        // After upload, we can either allow more or proceed. 
        // For simplicity, let's proceed after one photo or show a "Done" button?
        // Let's just proceed for now or maybe add a slight delay.

        setTimeout(() => {
            showConfirmation();
        }, 1000);
    };

    const handlePhotoSkip = () => {
        addMessage('user', 'Pominę dodawanie zdjęcia');
        showConfirmation();
    };

    const showConfirmation = () => {
        setTimeout(() => {
            // Use REF to ensure we pass the LATEST draft to the card
            addMessage('assistant', AI_MESSAGES.confirmPublish,
                <JobSummaryCard
                    draft={draftRef.current}
                    onPublish={handlePublish}
                    isPublishing={isProcessing}
                />
            );
            setState('confirming');
        }, 300);
    };

    const handlePublish = async () => {
        if (isProcessing) return;
        setIsProcessing(true);
        setState('publishing');

        const finalDraft = draftRef.current; // Use REF

        if (!user || !finalDraft.location || !finalDraft.aiResult) {
            addMessage('assistant', '⚠️ Brak wymaganych danych do publikacji.');
            setIsProcessing(false);
            return;
        }

        const input: PublishJobInput = {
            clientId: user.uid,
            clientName: user.displayName || 'Klient',
            description: finalDraft.description,
            category: finalDraft.aiResult.category,
            priceRange: {
                min: finalDraft.aiResult.priceMin,
                max: finalDraft.aiResult.priceMax
            },
            location: {
                lat: finalDraft.location.lat,
                lng: finalDraft.location.lng,
                address: finalDraft.location.address
            },
            urgency: finalDraft.aiResult.urgency,
            photoUrls: finalDraft.photoUrls
        };

        const result = await publishJobRequest(input);

        if (result.success) {
            // Simulate AI thinking for better UX
            await new Promise(resolve => setTimeout(resolve, 1500));
            addMessage('assistant', AI_MESSAGES.published);
            if (onJobCreated && result.jobId) {
                onJobCreated(result.jobId);
            }
            setState('done');
        } else {
            addMessage('assistant', '⚠️ Nie udało się opublikować zlecenia. Spróbuj ponownie.');
        }

        setIsProcessing(false);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const handleViewRoute = (pro: NearbyPro) => {
        setViewingPro(null);
        onClose();
        if (onViewProOnMap) {
            onViewProOnMap(pro);
        }
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-end md:items-center justify-center p-0 md:p-4"
                onClick={(e) => e.target === e.currentTarget && onClose()}
            >
                <motion.div
                    initial={{ y: "100%", opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: "100%", opacity: 0 }}
                    transition={{ type: "spring", damping: 25, stiffness: 300 }}
                    className="relative w-full md:max-w-xl h-[92vh] md:h-[700px] bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 md:rounded-3xl overflow-hidden flex flex-col border-t md:border border-white/10 shadow-2xl"
                >
                    {/* Header - Gradient */}
                    <div className="p-5 border-b border-white/10 bg-gradient-to-r from-violet-600/20 via-purple-600/20 to-indigo-600/20 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-500 via-purple-500 to-indigo-500 flex items-center justify-center shadow-lg shadow-violet-500/30">
                                <Sparkles className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <h2 className="text-white font-bold text-lg">Asystent FachowcyNow</h2>
                                <p className="text-slate-400 text-sm flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                                    Gotowy do pomocy
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="w-10 h-10 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
                        >
                            <X className="w-5 h-5 text-white" />
                        </button>
                    </div>

                    {/* Messages - Scrollable */}
                    <div className="flex-1 overflow-y-auto p-5 space-y-2">
                        {messages.map(msg => (
                            <MessageBubble key={msg.id} message={msg} />
                        ))}
                        {isProcessing && state === 'analyzing' && (
                            <div className="flex items-center gap-3 text-slate-400 text-sm p-3">
                                <div className="flex gap-1">
                                    <span className="w-2 h-2 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                    <span className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                    <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                                </div>
                                AI analizuje...
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input - Fixed at bottom */}
                    <div className="p-5 border-t border-white/10 bg-gradient-to-t from-slate-950 to-slate-900/50">
                        <div className="flex items-center gap-3">
                            <input
                                type="text"
                                value={inputText}
                                onChange={(e) => setInputText(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder={
                                    state === 'awaiting_description'
                                        ? "Opisz problem np. 'Cieknie kran w kuchni'"
                                        : "Napisz wiadomość..."
                                }
                                disabled={isProcessing || state === 'done'}
                                className="flex-1 bg-white/5 border border-white/10 rounded-xl px-5 py-4 text-white placeholder-slate-500 focus:outline-none focus:border-violet-500/50 focus:bg-white/10 disabled:opacity-50 transition-all text-[15px]"
                            />
                            <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={handleSend}
                                disabled={!inputText.trim() || isProcessing || state === 'done'}
                                className="w-14 h-14 rounded-xl bg-gradient-to-r from-violet-500 to-indigo-500 hover:from-violet-400 hover:to-indigo-400 disabled:from-slate-700 disabled:to-slate-700 disabled:opacity-50 flex items-center justify-center transition-all shadow-lg shadow-violet-500/20"
                            >
                                <Send className="w-6 h-6 text-white" />
                            </motion.button>
                        </div>
                    </div>

                    {/* Profile View Overlay */}
                    <AnimatePresence>
                        {viewingPro && (
                            <ProProfileView
                                pro={viewingPro}
                                onBack={() => setViewingPro(null)}
                                onContact={() => onOpenChat?.(viewingPro)}
                                onViewRoute={() => handleViewRoute(viewingPro)}
                                onBook={() => setBookingPro(viewingPro)}
                            />
                        )}
                    </AnimatePresence>

                    {/* Booking Modal */}
                    {bookingPro && draft.location && (
                        <BookingModal
                            isOpen={!!bookingPro}
                            onClose={() => setBookingPro(null)}
                            professional={bookingPro}
                            jobDescription={draft.description}
                            category={draft.aiResult?.category || 'Usługa'}
                            location={draft.location}
                            onSuccess={(bookingId) => {
                                setBookingPro(null);
                                addMessage('assistant', `✅ Twoja rezerwacja (ID: ${bookingId}) została potwierdzona! Fachowiec wkrótce się z Tobą skontaktuje.`);
                                setIsProcessing(false);
                            }}
                        />
                    )}
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}
