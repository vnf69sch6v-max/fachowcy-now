import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { initializeApp, getApps } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { VertexAI } from "@google-cloud/vertexai";
import * as logger from "firebase-functions/logger";

// Initialize admin only if not already initialized
if (getApps().length === 0) {
    initializeApp();
}

const db = getFirestore();

// Vertex AI Client
// Note: Requires GCLOUD_PROJECT env var or default credentials
const vertexAI = new VertexAI({
    project: process.env.GCLOUD_PROJECT || process.env.FIREBASE_CONFIG && JSON.parse(process.env.FIREBASE_CONFIG).projectId,
    location: "us-central1"
});

const model = vertexAI.getGenerativeModel({
    model: "gemini-1.5-flash",
    // @ts-ignore - SDK types might be inconsistent, trusting updated package or forcing config
    generationConfig: {
        responseMimeType: "application/json",
        temperature: 0.2
    }
});

// Schema definition for AI response validation
interface MediatorResponse {
    sentiment: "positive" | "neutral" | "negative" | "hostile";
    intervention_required: boolean;
    message_to_users: string | null;
    risk_level: "low" | "medium" | "high";
    suggested_action: "none" | "remind_acceptance" | "flag_for_review" | "security_warning";
    detected_intent: "price_negotiation" | "scheduling" | "confirmation" | "complaint" | "other";
}

export const mediatorAgent = onDocumentCreated(
    "chats/{chatId}/messages/{messageId}",
    async (event) => {
        const snapshot = event.data;
        if (!snapshot) return;

        const newMessage = snapshot.data();
        const chatId = event.params.chatId;

        // 1. SAFETY: Ignore system, mediator, or non-text messages
        if (newMessage.senderId === "mediator" || newMessage.senderRole === "system" || newMessage.type === "system") {
            return;
        }

        try {
            // 2. CONTEXT RETRIEVAL
            const chatRef = db.doc(`chats/${chatId}`);
            const chatDoc = await chatRef.get();
            const chatData = chatDoc.data();

            // If no job linked, we have less context, but still can monitor sentiment
            let jobData: any = null;
            if (chatData?.jobId) {
                const jobDoc = await db.doc(`jobs/${chatData.jobId}`).get();
                jobData = jobDoc.data();
            }

            // Fetch History (last 10 messages)
            const historySnap = await chatRef.collection("messages")
                .orderBy("createdAt", "desc")
                .limit(10)
                .get();

            const history = historySnap.docs
                .map(d => {
                    const data = d.data();
                    return `[${data.senderRole || data.senderId}]: ${data.content || data.text}`;
                })
                .reverse()
                .join("\n");

            // 3. SYSTEM PROMPT
            const prompt = `
Jesteś automatycznym Mediatorem w systemie P2P FachowcyNow.

## Szczegóły Zlecenia:
- Tytuł: ${jobData?.title || "Brak"}
- Budżet: ${jobData?.budget || jobData?.priceEstimate?.min ? `${jobData.priceEstimate.min}-${jobData.priceEstimate.max}` : "Do uzgodnienia"} PLN
- Status: ${jobData?.status || "unknown"}
- Kategoria: ${jobData?.category || "Brak"}

## Historia Rozmowy:
${history || "(Brak historii)"}

## Nowa Wiadomość:
"${newMessage.content || newMessage.text}"

## Twoje Zadania:
1. Wykryj intencję wiadomości (negocjacja ceny, umawianie terminu, potwierdzenie, skarga, inne)
2. Oceń sentyment (pozytywny, neutralny, negatywny, wrogi)
3. Zdecyduj czy interweniować (interweniuj TYLKO gdy strony ustaliły szczegóły a nie ma formalnej akceptacji, LUB gdy wykryjesz ryzyko). Bądź oszczędny w słowach.
4. Wykryj próby oszustwa (podawanie numeru telefonu, omijanie płatności przez aplikację)
5. Oceń ryzyko transakcji

## Format Wyjściowy (TYLKO JSON):
{
  "sentiment": "positive" | "neutral" | "negative" | "hostile",
  "intervention_required": boolean,
  "message_to_users": "string lub null (treść Twojej wiadomości do użytkowników - po polsku)",
  "risk_level": "low" | "medium" | "high",
  "suggested_action": "none" | "remind_acceptance" | "flag_for_review" | "security_warning",
  "detected_intent": "price_negotiation" | "scheduling" | "confirmation" | "complaint" | "other"
}
      `;

            // 4. INFERENCE
            const result = await model.generateContent(prompt);
            const responseText = result.response.candidates?.[0]?.content?.parts?.[0]?.text;

            if (!responseText) {
                logger.warn("Empty Vertex AI response");
                return;
            }

            let aiOutput: MediatorResponse;
            try {
                aiOutput = JSON.parse(responseText);
            } catch (e) {
                logger.error("Failed to parse AI response", { responseText, error: e });
                return;
            }

            // 5. EXECUTION LOGIC

            // Path A: Intervention in Chat
            if (aiOutput.intervention_required && aiOutput.message_to_users) {
                await chatRef.collection("messages").add({
                    content: `🤖 ${aiOutput.message_to_users}`,
                    senderId: "mediator",
                    senderRole: "system",
                    type: "system", // Use system type for styling
                    aiMeta: {
                        sentiment: aiOutput.sentiment,
                        risk: aiOutput.risk_level,
                        intent: aiOutput.detected_intent
                    },
                    createdAt: FieldValue.serverTimestamp()
                });

                // Update last message
                await chatRef.update({
                    lastMessage: `🤖 ${aiOutput.message_to_users}`,
                    lastMessageAt: FieldValue.serverTimestamp()
                });
            }

            // Path B: Risk Escalation
            if (aiOutput.risk_level === "high" || aiOutput.sentiment === "hostile") {
                if (chatData?.jobId) {
                    await db.doc(`jobs/${chatData.jobId}`).update({
                        riskFlag: true,
                        mediatorNotes: FieldValue.arrayUnion({
                            timestamp: new Date().toISOString(),
                            reason: `${aiOutput.sentiment} interaction, risk: ${aiOutput.risk_level}`,
                            messageId: snapshot.id
                        })
                    });
                    logger.warn(`⚠️ Risk escalation for Job ${chatData.jobId}`);
                }
            }

            // Path C: UI Suggestions / Metadata
            await chatRef.update({
                "aiAnalysis.lastAnalysisAt": FieldValue.serverTimestamp(),
                "aiAnalysis.intent": aiOutput.detected_intent,
                "aiAnalysis.sentiment": aiOutput.sentiment,
                "aiAnalysis.suggestedAction": aiOutput.suggested_action
            });

        } catch (error) {
            logger.error("Vertex AI Mediator Error:", error);
            // Do not throw to prevent infinite retries loops
        }
    }
);
