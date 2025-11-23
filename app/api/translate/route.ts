import { NextRequest, NextResponse } from "next/server";

/**
 * API Route: /api/translate
 * 
 * Translates English text to Portuguese using a simple translation approach
 * Uses a free translation service or simple word mapping
 */
export async function POST(request: NextRequest) {
  try {
    const { text } = await request.json();

    if (!text || typeof text !== "string") {
      return NextResponse.json(
        { error: "No text provided" },
        { status: 400 }
      );
    }

    // Simple translation mapping for common kitchen/product terms
    // This is a basic approach - for production, use a proper translation API
    const translations: Record<string, string> = {
      // Quantities and units
      "kg": "kg",
      "kilogram": "quilograma",
      "kilograms": "quilogramas",
      "liter": "litro",
      "liters": "litros",
      "litre": "litro",
      "litres": "litros",
      "ml": "ml",
      "milliliter": "mililitro",
      "milliliters": "mililitros",
      "unit": "unidade",
      "units": "unidades",
      "piece": "peça",
      "pieces": "peças",
      
      // Common products
      "milk": "leite",
      "bread": "pão",
      "cheese": "queijo",
      "chicken": "frango",
      "meat": "carne",
      "fish": "peixe",
      "rice": "arroz",
      "pasta": "massa",
      "oil": "azeite",
      "olive oil": "azeite",
      "butter": "manteiga",
      "eggs": "ovos",
      "egg": "ovo",
      "tomato": "tomate",
      "tomatoes": "tomates",
      "onion": "cebola",
      "onions": "cebolas",
      "potato": "batata",
      "potatoes": "batatas",
      
      // Time expressions
      "today": "hoje",
      "tomorrow": "amanhã",
      "day": "dia",
      "days": "dias",
      "week": "semana",
      "weeks": "semanas",
      
      // Actions
      "add": "adicionar",
      "adding": "adicionar",
      "with": "com",
      "expires": "expira",
      "expiry": "validade",
      "valid": "válido",
      "validity": "validade",
      "in": "em",
      "for": "para",
    };

    // Translate common kitchen/product commands from English to Portuguese
    let translated = text.toLowerCase().trim();
    
    // Replace common phrases first (more specific patterns)
    const phraseReplacements: [RegExp, string][] = [
      // "add 5 kg of milk" -> "adicionar 5 kg de leite"
      [/add\s+(\d+(?:\.\d+)?)\s*(kg|kilogram|kilograms|liter|liters|litre|litres|ml|milliliter|milliliters|unit|units|piece|pieces)\s+of\s+([a-z\s]+)/gi, "adicionar $1 $2 de $3"],
      // "5 kg milk" -> "5 kg de leite"
      [/(\d+(?:\.\d+)?)\s*(kg|kilogram|kilograms|liter|liters|litre|litres|ml|milliliter|milliliters)\s+([a-z\s]+)/gi, "$1 $2 de $3"],
      // "expires today" -> "expira hoje"
      [/expires?\s+(today|tomorrow)/gi, "expira $1"],
      // "expires in 3 days" -> "expira em 3 dias"
      [/expires?\s+in\s+(\d+)\s+days?/gi, "expira em $1 dias"],
      // "valid for 3 days" -> "válido por 3 dias"
      [/valid\s+(for|until|in)\s+(\d+)\s+days?/gi, "válido $1 $2 dias"],
      // "validity in 3 days" -> "validade em 3 dias"
      [/validity\s+in\s+(\d+)\s+days?/gi, "validade em $1 dias"],
      // "with expiry in 3 days" -> "com validade em 3 dias"
      [/with\s+expiry\s+in\s+(\d+)\s+days?/gi, "com validade em $1 dias"],
    ];

    for (const [pattern, replacement] of phraseReplacements) {
      translated = translated.replace(pattern, replacement);
    }

    // Replace individual words
    const words = translated.split(/\s+/);
    const translatedWords = words.map(word => {
      const cleanWord = word.replace(/[.,!?;:]/g, "").toLowerCase();
      return translations[cleanWord] || word;
    });

    let result = translatedWords.join(" ");

    // Clean up common Portuguese patterns
    result = result
      .replace(/\s+/g, " ") // Multiple spaces to single
      .replace(/\s+de\s+de\s+/g, " de ") // Remove duplicate "de"
      .trim();

    // Preserve numbers and units
    result = result.replace(/(\d+(?:\.\d+)?)\s*(kg|ml|l|un|unidade|unidades|litro|litros|quilograma|quilogramas)/gi, "$1 $2");

    return NextResponse.json({ 
      translated: result,
      original: text 
    });

  } catch (error) {
    console.error("Error in translate API route:", error);
    return NextResponse.json(
      { 
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}

export const dynamic = "force-dynamic";

