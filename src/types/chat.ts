/**
 * Chat & Message Types for FachowcyNow
 * Includes AI analysis, intent detection, and trust scoring
 */

// ===========================================
// MESSAGE TYPES
// ===========================================

export type MessageIntent = 'quote' | 'schedule' | 'question' | 'confirmation' | 'greeting' | 'other';
export type MessageSentiment = 'positive' | 'neutral' | 'negative' | 'aggressive';
export type SuggestedAction = 'show_calendar' | 'show_quote_form' | 'flag_admin' | 'update_status' | null;

export interface AIAnalysis {
    intent: MessageIntent;
    sentiment: MessageSentiment;
    suggestedReplies?: string[];
    suggestedAction?: SuggestedAction;
    confidenceScore: number; // 0-1
    analyzedAt: Date;
}

export interface ChatMessage {
    id: string;
    chatId: string;
    senderId: string;
    senderName: string;
    senderRole: 'client' | 'professional';
    content: string;
    timestamp: Date;
    readAt?: Date;
    aiAnalysis?: AIAnalysis;
    // Media attachments
    images?: string[];
    // System generated
    isSystemMessage?: boolean;
}

// ===========================================
// CHAT ROOM TYPES
// ===========================================

export type ChatStatus =
    | 'inquiry'       // Zapytanie
    | 'quoted'        // Wycena wysłana
    | 'accepted'      // Zaakceptowano
    | 'in_progress'   // W drodze
    | 'completed';    // Gotowe

export interface ChatRoom {
    id: string;
    clientId: string;
    clientName: string;
    clientImageUrl?: string;
    professionalId: string;
    professionalName: string;
    professionalImageUrl?: string;
    participantIds?: string[]; // Array of UIDs for easy querying
    isActive?: boolean; // If true, shows in list
    bookingId?: string;
    status: ChatStatus;
    createdAt: Date;
    updatedAt: Date;
    lastMessage?: string;
    lastMessageAt?: Date;
    unreadCount: {
        client: number;
        professional: number;
    };
    // AI Features
    suggestedReplies?: string[];
    trustWarnings?: string[];
    // Deal tracking
    quotedAmount?: number;
    scheduledDate?: Date;
}

// ===========================================
// TRUST SCORE TYPES
// ===========================================

export type TrustTier = 'top_pro' | 'verified' | 'new';

export interface TrustScore {
    score: number;           // 0-100
    tier: TrustTier;
    completedBookings: number;
    averageRating: number;
    isVerified: boolean;
    calculatedAt: Date;
}

export function getTrustTier(score: number): TrustTier {
    if (score >= 80) return 'top_pro';
    if (score >= 50) return 'verified';
    return 'new';
}

export function getTrustColor(tier: TrustTier): string {
    switch (tier) {
        case 'top_pro': return '#00e5ff';  // Neon Cyan
        case 'verified': return '#ffc107'; // Yellow
        case 'new': return '#64748b';      // Slate Gray
    }
}

// ===========================================
// MARKER TYPES
// ===========================================

export type MarkerStatus = 'default' | 'available' | 'premium' | 'busy' | 'job';

export interface MarkerData {
    id: string;
    position: { lat: number; lng: number };
    price: number;
    imageUrl?: string;
    name?: string;
    status: MarkerStatus;
    rating?: number;
    isOnline?: boolean;
}

// ===========================================
// VERTEX AI RESPONSE TYPES
// ===========================================

export interface VertexAIChatResponse {
    intent: MessageIntent;
    sentiment: MessageSentiment;
    suggestedReplies: string[];
    action: SuggestedAction;
    securityWarning?: string; // e.g., "Phone number detected"
}
