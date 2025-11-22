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

    console.log("Received audio file:", {
      name: audioFile.name,
      type: audioFile.type,
      size: audioFile.size,
    });

    // Prepare FormData for ElevenLabs API
    const elevenLabsFormData = new FormData();
    
    // Create a File object for ElevenLabs
    // Use the original audio type, or default to webm
    const audioType = audioFile.type || "audio/webm";
    const fileBlob = new Blob([audioBlob], { type: audioType });
    const fileName = audioFile.name || `audio.${audioType.includes("webm") ? "webm" : "mp4"}`;
    
    elevenLabsFormData.append("file", fileBlob, fileName);

    // ElevenLabs STT API parameters
    // Try different parameter names - some APIs use different field names
    elevenLabsFormData.append("language_code", "pt");
    // Also try model_id if needed
    // elevenLabsFormData.append("model_id", "scribe_v1");

    console.log("Sending to ElevenLabs API...", {
      fileName,
      audioType,
      size: fileBlob.size,
    });

    // Call ElevenLabs Speech-to-Text API
    // Try multiple endpoints - the correct one may vary
    const endpoints = [
      "https://api.elevenlabs.io/v1/speech-to-text",
      "https://api.elevenlabs.io/v1/speech-to-text/transcribe",
      "https://api.elevenlabs.io/v1/speech-to-text/convert",
    ];

    let response: Response | null = null;
    let lastError: string = "";

    for (const endpoint of endpoints) {
      try {
        console.log(`Trying endpoint: ${endpoint}`);
        response = await fetch(endpoint, {
          method: "POST",
          headers: {
            "xi-api-key": apiKey,
            // Don't set Content-Type - let browser set it with boundary for FormData
          },
          body: elevenLabsFormData,
        });

        console.log(`Endpoint ${endpoint} response:`, response.status, response.statusText);

        // If successful (2xx), use this response
        if (response.ok) {
          console.log(`Success with endpoint: ${endpoint}`);
          break;
        }

        // If 404, try next endpoint
        if (response.status === 404) {
          console.log(`Endpoint ${endpoint} returned 404, trying next...`);
          const errorText = await response.text().catch(() => "");
          lastError = errorText;
          response = null;
          continue;
        }

        // For other errors, break and handle
        break;
      } catch (err) {
        console.error(`Error with endpoint ${endpoint}:`, err);
        lastError = err instanceof Error ? err.message : String(err);
        response = null;
        continue;
      }
    }

    if (!response) {
      return NextResponse.json(
        {
          error: "All endpoints failed",
          details: lastError || "Could not connect to ElevenLabs API",
        },
        { status: 500 }
      );
    }

    console.log("ElevenLabs API response status:", response.status, response.statusText);

    if (!response.ok) {
      let errorText: string;
      try {
        const errorJson = await response.json();
        errorText = JSON.stringify(errorJson);
        console.error("ElevenLabs API error (JSON):", response.status, errorJson);
      } catch {
        errorText = await response.text();
        console.error("ElevenLabs API error (text):", response.status, errorText);
      }
      
      return NextResponse.json(
        { 
          error: "Failed to transcribe audio",
          details: errorText || `HTTP ${response.status}` 
        },
        { status: response.status }
      );
    }

    // Parse response from ElevenLabs
    let data: any;
    try {
      data = await response.json();
      console.log("ElevenLabs API response data:", data);
    } catch (parseError) {
      const textResponse = await response.text();
      console.error("Failed to parse JSON response, got text:", textResponse);
      return NextResponse.json(
        { error: "Invalid response from API", details: textResponse },
        { status: 500 }
      );
    }

    // Extract transcription text
    // ElevenLabs STT API may return different structures:
    // - { text: "..." }
    // - { transcription: "..." }
    // - { result: { text: "..." } }
    const transcription = data.text || data.transcription || data.result?.text || data.data?.text || "";

    if (!transcription) {
      console.warn("No transcription found in ElevenLabs response. Full response:", JSON.stringify(data, null, 2));
      return NextResponse.json(
        { 
          error: "No transcription received from API",
          details: "API returned success but no transcription text. Check API response structure.",
          debug: data
        },
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

