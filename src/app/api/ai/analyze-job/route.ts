/**
 * AI Job Analysis API - Vertex AI Integration
 * 
 * Analyzes job descriptions and returns category, pricing estimates, and urgency.
 */

import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize Gemini inside handler to prevent build errors
// const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY || '');

interface AIAnalysisResult {
    category: 'Hydraulik' | 'Elektryk' | 'Sprzątanie' | 'Złota Rączka' | 'Inne';
    title: string;
    tags: string[];
    priceMin: number;
    priceMax: number;
    urgency: 'low' | 'medium' | 'high';
    confidence: number;
}

const SYSTEM_PROMPT = `Jesteś ekspertem od kategoryzacji usług domowych w Polsce.

Analiza opisu zlecenia - zwróć JSON z następującymi polami:
- category: jedna z kategorii: "Hydraulik", "Elektryk", "Sprzątanie", "Złota Rączka", "Inne"
- title: krótki tytuł zlecenia (max 50 znaków)
- tags: tablica 2-4 tagów opisujących problem
- priceMin: minimalna szacunkowa cena w PLN
- priceMax: maksymalna szacunkowa cena w PLN
- urgency: "low", "medium" lub "high"
- confidence: pewność od 0.0 do 1.0

Wskazówki cenowe:
- Hydraulik: 80-300 PLN (większe awarie do 500)
- Elektryk: 100-400 PLN
- Sprzątanie: 50-200 PLN
- Złota Rączka: 60-250 PLN

Odpowiedz TYLKO prawidłowym JSON-em, bez dodatkowego tekstu.`;

export async function POST(request: NextRequest) {
    try {
        const { description } = await request.json();

        if (!description) {
            return NextResponse.json(
                { error: 'Brak opisu zlecenia' },
                { status: 400 }
            );
        }

        // Check if API key is available
        if (!process.env.GOOGLE_AI_API_KEY) {
            return NextResponse.json(
                localAnalyzeJob(description),
                { status: 200 }
            );
        }

        const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY || '');
        const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

        const prompt = `${SYSTEM_PROMPT}\n\nOpis zlecenia: "${description}"`;

        const result = await model.generateContent(prompt);
        const text = result.response.text();

        // Parse JSON response
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]) as AIAnalysisResult;

            // Validate and ensure correct types
            return NextResponse.json({
                category: parsed.category || 'Złota Rączka',
                title: parsed.title || 'Usługa domowa',
                tags: Array.isArray(parsed.tags) ? parsed.tags : ['naprawa'],
                priceMin: Number(parsed.priceMin) || 60,
                priceMax: Number(parsed.priceMax) || 180,
                urgency: parsed.urgency || 'medium',
                confidence: Number(parsed.confidence) || 0.7
            });
        }

        // Fallback to local analysis if AI response is invalid
        return NextResponse.json(localAnalyzeJob(description));

    } catch (error) {
        console.error('AI Analysis Error:', error);
        // Fallback to local analysis on error
        const { description } = await request.json().catch(() => ({ description: '' }));
        return NextResponse.json(localAnalyzeJob(description || ''));
    }
}

/**
 * Local fallback analysis using keyword matching
 */
function localAnalyzeJob(description: string): AIAnalysisResult {
    const desc = description.toLowerCase();

    // Hydraulik keywords
    if (desc.match(/kran|rura|wod|ciek|hydraul|toalet|umywalk|prysznic|wanna|zlew|kanalizac|spłuczk/)) {
        return {
            category: 'Hydraulik',
            title: 'Naprawa instalacji wodnej',
            tags: ['hydraulika', 'naprawa', 'woda'],
            priceMin: 80,
            priceMax: 200,
            urgency: desc.includes('pilne') || desc.includes('zalew') ? 'high' : 'medium',
            confidence: 0.85
        };
    }

    // Elektryk keywords
    if (desc.match(/prąd|gniazdko|elektr|lampa|światło|kabel|bezpiecznik|kontakt|włącznik/)) {
        return {
            category: 'Elektryk',
            title: 'Usługa elektryczna',
            tags: ['elektryka', 'instalacja', 'prąd'],
            priceMin: 100,
            priceMax: 300,
            urgency: desc.includes('brak prądu') ? 'high' : 'medium',
            confidence: 0.82
        };
    }

    // Sprzątanie keywords
    if (desc.match(/sprząt|czysto|myci|odkurz|pranie|piorę|brud|porządek/)) {
        return {
            category: 'Sprzątanie',
            title: 'Usługa sprzątania',
            tags: ['sprzątanie', 'czystość', 'dom'],
            priceMin: 50,
            priceMax: 150,
            urgency: 'low',
            confidence: 0.80
        };
    }

    // Default: Złota Rączka
    return {
        category: 'Złota Rączka',
        title: 'Naprawa domowa',
        tags: ['naprawa', 'dom', 'złota rączka'],
        priceMin: 60,
        priceMax: 180,
        urgency: 'medium',
        confidence: 0.60
    };
}
