/**
 * Vertex AI Chat API Route with Action Execution
 * 
 * Connects to Google Gemini for real-time AI conversation
 * Supports structured actions (change price, publish, etc.)
 */

import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Action types the AI can trigger
export type AIAction =
    | { type: 'UPDATE_PRICE'; payload: { min: number; max: number } }
    | { type: 'UPDATE_CATEGORY'; payload: { category: string } }
    | { type: 'UPDATE_URGENCY'; payload: { urgency: 'asap' | 'today' | 'week' | 'flexible' } }
    | { type: 'PUBLISH_JOB'; payload: {} }
    | { type: 'SELECT_PROFESSIONAL'; payload: { proId: string; proName: string } }
    | { type: 'OPEN_BOOKING'; payload: { proId: string } }
    | { type: 'CANCEL_JOB'; payload: {} }
    | { type: 'NONE'; payload: {} };

// System prompt for the assistant with action capabilities
const SYSTEM_PROMPT = `Jesteś asystentem aplikacji FachowcyNow - platformy łączącej klientów z fachowcami.

TWOJA OSOBOWOŚĆ:
- Miły, pomocny, profesjonalny
- Używasz emoji z umiarem
- Odpowiadasz po polsku
- Jesteś konkretny i rzeczowy

TWOJE MOŻLIWOŚCI:
1. Analizowanie opisów problemów i kategoryzowanie
2. Szacowanie i MODYFIKOWANIE kosztów usług
3. Pomaganie w publikacji zleceń
4. Rezerwowanie fachowców

⚡ AKCJE - MOŻESZ WYKONYWAĆ NASTĘPUJĄCE CZYNNOŚCI:
- UPDATE_PRICE: Gdy użytkownik prosi o zmianę ceny (np. "zmień na 200 zł", "ustaw budżet 150-300")
- UPDATE_CATEGORY: Gdy użytkownik chce zmienić kategorię usługi
- UPDATE_URGENCY: Gdy użytkownik określa pilność (asap/today/week/flexible)
- PUBLISH_JOB: Gdy użytkownik potwierdza publikację zlecenia
- SELECT_PROFESSIONAL: Gdy użytkownik wybiera konkretnego fachowca
- OPEN_BOOKING: Gdy użytkownik chce zarezerwować wizytę
- CANCEL_JOB: Gdy użytkownik chce anulować

⛔ OGRANICZENIA:
- NIE odpowiadaj na tematy niezwiązane z aplikacją
- Grzecznie odmów pytań osobistych/politycznych/medycznych

📋 FORMAT ODPOWIEDZI (ZAWSZE JSON):
{
  "message": "Twoja odpowiedź tekstowa dla użytkownika",
  "action": {
    "type": "NAZWA_AKCJI lub NONE",
    "payload": { ...dane akcji }
  }
}

PRZYKŁADY:
User: "Zmień cenę na 200 zł"
Response: {"message": "✅ Zmieniam szacowaną cenę na **200 zł**.", "action": {"type": "UPDATE_PRICE", "payload": {"min": 180, "max": 220}}}

User: "Publikuj to zlecenie"
Response: {"message": "📤 Publikuję Twoje zlecenie! Fachowcy wkrótce zaczną składać oferty.", "action": {"type": "PUBLISH_JOB", "payload": {}}}

User: "Który fachowiec jest najlepszy?"
Response: {"message": "Na podstawie ocen i odległości, polecam **Jan Kowalski** - ma najwyższą ocenę 4.9/5 i jest najbliżej.", "action": {"type": "NONE", "payload": {}}}`;

export async function POST(request: NextRequest) {
    try {
        const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY || '');
        const { message, context } = await request.json();

        if (!message) {
            return NextResponse.json(
                { error: 'Message is required' },
                { status: 400 }
            );
        }

        // Build context for AI
        let contextPrompt = '\n\n## AKTUALNY KONTEKST ZLECENIA:';

        if (context?.jobDescription) {
            contextPrompt += `\nOpis problemu: "${context.jobDescription}"`;
        }

        if (context?.category) {
            contextPrompt += `\nKategoria: ${context.category}`;
        }

        if (context?.priceRange) {
            contextPrompt += `\nAktualna cena: ${context.priceRange.min}-${context.priceRange.max} zł`;
        }

        if (context?.professionals && context.professionals.length > 0) {
            contextPrompt += `\n\nDostępni fachowcy:`;
            context.professionals.forEach((pro: any, i: number) => {
                contextPrompt += `\n${i + 1}. ${pro.name} (ID: ${pro.id}) - ${pro.profession}, Ocena: ${pro.rating}/5, Cena: ${pro.price} zł, Odległość: ${pro.distance} km`;
            });
        }

        if (context?.selectedPro) {
            contextPrompt += `\nWybrany fachowiec: ${context.selectedPro.name}`;
        }

        if (context?.location?.address) {
            contextPrompt += `\nLokalizacja: ${context.location.address}`;
        }

        if (context?.currentState) {
            contextPrompt += `\nStan procesu: ${context.currentState}`;
        }

        // Create the model with JSON mode
        const model = genAI.getGenerativeModel({
            model: 'gemini-2.0-flash',
            generationConfig: {
                temperature: 0.3,
                maxOutputTokens: 500,
                responseMimeType: 'application/json'
            }
        });

        // Generate response
        const prompt = `${SYSTEM_PROMPT}${contextPrompt}\n\n## Wiadomość użytkownika:\n"${message}"\n\nOdpowiedz TYLKO poprawnym JSON:`;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        // Parse the JSON response
        let parsed: { message: string; action: AIAction };
        try {
            parsed = JSON.parse(text);
        } catch (e) {
            // If JSON parsing fails, wrap the text as a message
            parsed = {
                message: text,
                action: { type: 'NONE', payload: {} }
            };
        }

        return NextResponse.json({
            response: parsed.message,
            action: parsed.action,
            success: true
        });

    } catch (error) {
        console.error('Vertex AI Error:', error);

        return NextResponse.json({
            response: 'Przepraszam, mam chwilowe problemy z połączeniem. Spróbuj ponownie! 🔄',
            action: { type: 'NONE', payload: {} },
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
}
