/**
 * Vertex AI Chat API Route
 * 
 * Connects to Google Gemini for real-time AI conversation
 * Handles job analysis, questions, and booking flow
 */

import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize Gemini inside handler to prevent build errors
// const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY || '');

// System prompt for the assistant
const SYSTEM_PROMPT = `Jesteś przyjaznym asystentem aplikacji FachowcyNow - platformy łączącej klientów z fachowcami (hydraulik, elektryk, sprzątanie, złota rączka).

TWOJA OSOBOWOŚĆ:
- Miły, pomocny, profesjonalny
- Używasz emoji ale z umiarem
- Odpowiadasz po polsku
- Jesteś konkretny i rzeczowy

TWOJE MOŻLIWOŚCI:
1. Analizowanie opisów problemów i kategoryzowanie (Hydraulik, Elektryk, Sprzątanie, Złota Rączka)
2. Szacowanie kosztów usług
3. Odpowiadanie na pytania o fachowców w kontekście
4. Pomaganie w rezerwacji wizyt
5. Wyjaśnianie różnic między fachowcami na liście

⛔ OGRANICZENIA - BARDZO WAŻNE:
- NIE odpowiadasz na pytania niezwiązane z aplikacją FachowcyNow
- NIE prowadzisz rozmów na tematy osobiste, polityczne, religijne itp.
- NIE udzielasz porad medycznych, prawnych czy finansowych
- Jeśli użytkownik pyta o coś poza kontekstem aplikacji, grzecznie odpowiedz:
  "Przepraszam, jestem asystentem FachowcyNow i mogę pomóc tylko z usługami domowymi. 🏠 W czym mogę Ci pomóc - hydraulik, elektryk, sprzątanie?"

FORMAT ODPOWIEDZI:
- Używaj **pogrubienia** dla ważnych informacji
- Używaj emoji na początku sekcji (📋, 💰, 📅, etc.)
- Odpowiadaj zwięźle (max 3-4 zdania na punkt)`;

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
        let contextPrompt = '';

        if (context?.jobDescription) {
            contextPrompt += `\nOpis problemu klienta: "${context.jobDescription}"`;
        }

        if (context?.category) {
            contextPrompt += `\nKategoria: ${context.category}`;
        }

        if (context?.priceRange) {
            contextPrompt += `\nSzacowana cena: ${context.priceRange.min}-${context.priceRange.max} zł`;
        }

        if (context?.professionals && context.professionals.length > 0) {
            contextPrompt += `\n\nDostępni fachowcy w okolicy:`;
            context.professionals.forEach((pro: any, i: number) => {
                contextPrompt += `\n${i + 1}. ${pro.name} (${pro.profession}) - Ocena: ${pro.rating}/5, Cena: ${pro.price} zł, Odległość: ${pro.distance} km, Response rate: ${pro.responseRate || 95}%`;
                if (pro.description) {
                    contextPrompt += ` - "${pro.description}"`;
                }
            });
        }

        if (context?.selectedPro) {
            contextPrompt += `\n\nWybrany fachowiec: ${context.selectedPro.name}`;
        }

        if (context?.location) {
            contextPrompt += `\nLokalizacja klienta: ${context.location.address || 'Pobrana'}`;
        }

        // Create the model
        const model = genAI.getGenerativeModel({
            model: 'gemini-2.0-flash',
            generationConfig: {
                temperature: 0.7,
                maxOutputTokens: 500,
            }
        });

        // Generate response
        const prompt = `${SYSTEM_PROMPT}${contextPrompt}\n\nWiadomość użytkownika: "${message}"\n\nTwoja odpowiedź:`;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        return NextResponse.json({
            response: text,
            success: true
        });

    } catch (error) {
        console.error('Vertex AI Error:', error);

        // Fallback response
        return NextResponse.json({
            response: 'Przepraszam, mam chwilowe problemy z połączeniem. Spróbuj ponownie za chwilę! 🔄',
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
}
