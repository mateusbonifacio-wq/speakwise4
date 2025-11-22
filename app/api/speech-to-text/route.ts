import { NextRequest, NextResponse } from "next/server";

/**
 * API Route: /api/speech-to-text
 * 
 * Accepts audio file (FormData) and sends it to ElevenLabs Speech-to-Text API
 * Returns transcription text in JSON format
 */
export async function POST(request: NextRequest) {
  try {
    // Get API key from environment variable
    const apiKey = process.env.ELEVENLABS_API_KEY;

    if (!apiKey) {
      console.error("ELEVENLABS_API_KEY is not set in environment variables");
      return NextResponse.json(
        { error: "API key not configured" },
        { status: 500 }
      );
    }

    // Get FormData from request
    const formData = await request.formData();
    const audioFile = formData.get("audio") as File;

    if (!audioFile) {
      return NextResponse.json(
        { error: "No audio file provided" },
        { status: 400 }
      );
    }

    // Validate file type
    if (!audioFile.type.startsWith("audio/")) {
      return NextResponse.json(
        { error: "Invalid file type. Expected audio file." },
        { status: 400 }
      );
    }

    // Convert File to Blob for ElevenLabs API
    const audioBlob = await audioFile.arrayBuffer();

    // Prepare FormData for ElevenLabs API
    const elevenLabsFormData = new FormData();
    elevenLabsFormData.append("file", new Blob([audioBlob], { type: audioFile.type }), audioFile.name);

    // Optional: Add model and language parameters if needed
    // For Portuguese (Portugal), we can specify language
    // Note: Some ElevenLabs STT endpoints may use query params or different field names
    // Adjust based on actual API documentation
    elevenLabsFormData.append("language", "pt-PT");

    // Call ElevenLabs Speech-to-Text API
    // Endpoint: https://api.elevenlabs.io/v1/speech-to-text
    const response = await fetch("https://api.elevenlabs.io/v1/speech-to-text", {
      method: "POST",
      headers: {
        "xi-api-key": apiKey,
      },
      body: elevenLabsFormData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("ElevenLabs API error:", response.status, errorText);
      
      return NextResponse.json(
        { 
          error: "Failed to transcribe audio",
          details: errorText || `HTTP ${response.status}` 
        },
        { status: response.status }
      );
    }

    // Parse response from ElevenLabs
    const data = await response.json();

    // Extract transcription text
    // ElevenLabs STT API typically returns: { text: "..." }
    // Adjust based on actual API response structure
    const transcription = data.text || data.transcription || "";

    if (!transcription) {
      console.warn("No transcription found in ElevenLabs response:", data);
      return NextResponse.json(
        { error: "No transcription received from API" },
        { status: 500 }
      );
    }

    // Return transcription
    return NextResponse.json({ text: transcription });

  } catch (error) {
    console.error("Error in speech-to-text API route:", error);
    return NextResponse.json(
      { 
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}

// Disable caching for this route
export const dynamic = "force-dynamic";

