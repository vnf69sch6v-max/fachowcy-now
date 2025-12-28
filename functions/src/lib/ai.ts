import { VertexAI } from '@google-cloud/vertexai';

// Initialize Vertex AI
// Ensure GCLOUD_PROJECT is available in environment variables
const vertexAI = new VertexAI({
    project: process.env.GCLOUD_PROJECT || process.env.GCP_PROJECT || 'fachowcy-now-demo',
    location: 'us-central1'
});

const model = vertexAI.getGenerativeModel({
    model: 'gemini-1.5-flash',
    generation_config: {
        response_mime_type: 'application/json'
    } as any
});

interface AIResponse {
    category: "Hydraulik" | "Elektryk" | "Złota Rączka" | "Sprzątanie" | "Inne";
    priority: "low" | "medium" | "high";
    estimatedDurationHours: number;
    tags: string[];
}

export async function categorizeRequest(description: string): Promise<AIResponse> {
    const prompt = `
    Jesteś dyspozytorem usług domowych. 
    Przeanalizuj zgłoszenie: '${description}'. 
    Zwróć TYLKO obiekt JSON (bez markdowna) w formacie: 
    { 
        "category": "Hydraulik" | "Elektryk" | "Złota Rączka" | "Sprzątanie" | "Inne", 
        "priority": "low" | "medium" | "high", 
        "estimatedDurationHours": number, 
        "tags": string[] 
    }
  `;

    try {
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.candidates?.[0].content.parts[0].text;

        if (!text) throw new Error("No response from AI");

        return JSON.parse(text) as AIResponse;
    } catch (error) {
        console.error("AI Categorization Error:", error);
        // Fallback response
        return {
            category: "Inne",
            priority: "medium",
            estimatedDurationHours: 1,
            tags: ["requires-verification"]
        };
    }
}
