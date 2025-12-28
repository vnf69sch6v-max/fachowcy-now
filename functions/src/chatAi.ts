import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

// Initialize admin if not already
if (!admin.apps.length) {
    admin.initializeApp();
}

const db = admin.firestore();

// MOCK VERTEX AI implementation since package install failed
// In production, this would use @google-cloud/vertex-ai

/**
 * AI Chat Mediator
 * Triggered on new message creation in Firestore
 */
export const onMessageCreated = functions.firestore
    .document("chats/{chatId}/messages/{messageId}")
    .onCreate(async (snap, context) => {
        const message = snap.data();
        const chatId = context.params.chatId;

        // Ignore system messages or AI messages to prevent loops
        if (message.isSystemMessage || message.senderRole === 'system') {
            return null;
        }

        try {
            // SIMULATED AI LATENCY
            await new Promise(resolve => setTimeout(resolve, 1500));

            // SIMULATED AI ANALYSIS LOGIC
            const content = message.content.toLowerCase();
            let analysis = {
                intent: 'other',
                sentiment: 'neutral',
                action: null as string | null,
                suggestedReplies: [] as string[],
                securityWarning: null as string | null
            };

            // Intent Detection Rule-based Mock
            if (content.match(/cena|ile|koszt|drogo|taniej/)) {
                analysis.intent = 'quote';
                analysis.action = 'quote';
                analysis.suggestedReplies = ["Ile to będzie kosztować?", "Proszę o wycenę", "Jaki jest cennik?"];
                if (message.senderRole === 'professional') {
                    analysis.suggestedReplies = ["Wycena zależy od...", "Około 200 zł", "Muszę zobaczyć na miejscu"];
                }
            } else if (content.match(/kiedy|termin|czas|godzina|jutro|dzisiaj/)) {
                analysis.intent = 'schedule';
                analysis.action = 'schedule';
                analysis.suggestedReplies = ["Pasuje mi jutro", "Kiedy masz czas?", "Może być rano?"];
                if (message.senderRole === 'professional') {
                    analysis.suggestedReplies = ["Mam wolny termin jutro", "Za godzinę będę", "Proszę o propozycję"];
                }
            } else if (content.match(/tak|ok|dobrze|pasuje|zrobione/)) {
                analysis.intent = 'confirmation';
                analysis.sentiment = 'positive';
                analysis.suggestedReplies = ["Ok, dziękuję", "Super", "Do zobaczenia"];
            }

            // Security Check Mock
            if (content.match(/\d{9}|\d{3}[-\s]\d{3}[-\s]\d{3}/)) {
                analysis.securityWarning = "Wykryto numer telefonu. Dla bezpieczeństwa zalecamy płatność przez aplikację (Gwarancja Satysfakcji).";
            }

            // 5. Update Chat Document with Suggestions
            await db.collection("chats").doc(chatId).update({
                "aiAnalysis.lastAnalysisAt": admin.firestore.FieldValue.serverTimestamp(),
                "aiAnalysis.intent": analysis.intent,
                "aiAnalysis.sentiment": analysis.sentiment,
                "suggestedReplies": analysis.suggestedReplies,
                "suggestedAction": analysis.action,
                // If security warning exists, add to warnings array
                ...(analysis.securityWarning ? {
                    "trustWarnings": admin.firestore.FieldValue.arrayUnion({
                        messageId: snap.id,
                        warning: analysis.securityWarning,
                        timestamp: new Date().toISOString()
                    })
                } : {})
            });

            return analysis;

        } catch (error) {
            console.error("Error in AI Chat Mediator:", error);
            // Fallback: Just mark as processed without analysis
            return null;
        }
    });
