"use client";

import { useState, useRef, useEffect } from "react";
import { Mic, Loader2, X } from "lucide-react";
import { toast } from "sonner";

interface VoiceCommandButtonProps {
  onTranscript: (text: string) => void;
  className?: string;
}

type RecordingState = "idle" | "recording" | "processing" | "error";

/**
 * VoiceCommandButton - Records audio and sends to ElevenLabs STT API
 * 
 * Features:
 * - Records 3-5 seconds of audio from microphone
 * - Shows visual feedback for recording state
 * - Handles microphone permissions
 * - Sends audio to backend API route
 * - Calls onTranscript callback with result
 */
export function VoiceCommandButton({ 
  onTranscript, 
  className = "" 
}: VoiceCommandButtonProps) {
  const [state, setState] = useState<RecordingState>("idle");
  const [transcript, setTranscript] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [recordingTime, setRecordingTime] = useState<number>(0);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const recognitionRef = useRef<any>(null); // Web Speech API
  const maxRecordingTime = 20; // 20 seconds for kitchen environment
  
  // Check if Web Speech API is available
  const isWebSpeechAvailable = typeof window !== "undefined" && 
    ("webkitSpeechRecognition" in window || "SpeechRecognition" in window);
  
  // Force use of ElevenLabs if Web Speech API has poor accuracy
  // Set to true to always use ElevenLabs (better accuracy but requires API)
  // Default to true because Web Speech API has poor accuracy for Portuguese
  const [useElevenLabs, setUseElevenLabs] = useState(true);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Stop recording if component unmounts
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        mediaRecorderRef.current.stop();
      }
      // Stop all tracks
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
      // Clear timer
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
      // Stop Web Speech API
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {
          // Ignore
        }
      }
    };
  }, []);

  const stopRecording = () => {
    // Stop Web Speech API if active
    if (recognitionRef.current) {
      stopWebSpeechRecording();
      return;
    }
    
    // Stop MediaRecorder if active
    // Clear timer
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setRecordingTime(0);
  };

  const handleRecordingError = (err: unknown) => {
    let errorMessage = "Erro ao aceder ao microfone";
    
    if (err instanceof Error) {
      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        errorMessage = "Permissão de microfone negada. Por favor, permita o acesso ao microfone nas definições do navegador.";
      } else if (err.name === "NotFoundError" || err.name === "DevicesNotFoundError") {
        errorMessage = "Nenhum microfone encontrado.";
      } else {
        errorMessage = err.message;
      }
    }

    setError(errorMessage);
    setState("error");
    
    toast.error("Erro de microfone", {
      description: errorMessage,
      duration: 5000,
    });
  };

  const startRecording = async () => {
    try {
      setError("");
      setTranscript("");

      // Try Web Speech API first (free, works directly in browser)
      // But if user prefers ElevenLabs or Web Speech is not available, use MediaRecorder
      if (isWebSpeechAvailable && !useElevenLabs) {
        return startWebSpeechRecording();
      }

      // Fallback to MediaRecorder + ElevenLabs API (better accuracy)
      return startMediaRecorderRecording();
    } catch (err) {
      console.error("Error starting recording:", err);
      handleRecordingError(err);
    }
  };

  const startWebSpeechRecording = () => {
    try {
      // Use Web Speech API (free, works directly in browser)
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      
      // Improved settings for better accuracy
      recognition.continuous = true;
      recognition.interimResults = true; // Show interim results for better feedback
      recognition.lang = "en-US"; // English (better accuracy, will translate to Portuguese)
      recognition.maxAlternatives = 1; // Get best match only
      
      let finalTranscript = "";
      let interimTranscript = "";

      recognition.onstart = () => {
        setState("recording");
        setRecordingTime(0);
        
        // Start timer
        recordingTimerRef.current = setInterval(() => {
          setRecordingTime((prev) => {
            const newTime = prev + 1;
            if (newTime >= maxRecordingTime) {
              recognition.stop();
              return maxRecordingTime;
            }
            return newTime;
          });
        }, 1000);
      };

      recognition.onresult = (event: any) => {
        interimTranscript = "";
        
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript + " ";
          } else {
            interimTranscript += transcript;
          }
        }
        
        // Show both final and interim results
        const displayText = (finalTranscript + interimTranscript).trim();
        if (displayText) {
          setTranscript(displayText);
        }
      };

      recognition.onerror = (event: any) => {
        console.error("Speech recognition error:", event.error);
        let errorMessage = "Erro no reconhecimento de voz";
        
        if (event.error === "no-speech") {
          errorMessage = "Nenhuma fala detectada. Tente novamente.";
        } else if (event.error === "audio-capture") {
          errorMessage = "Erro ao capturar áudio. Verifique o microfone.";
        } else if (event.error === "not-allowed") {
          errorMessage = "Permissão de microfone negada.";
        }
        
        setError(errorMessage);
        setState("error");
        stopWebSpeechRecording();
        
        toast.error("Erro no reconhecimento", {
          description: errorMessage,
          duration: 5000,
        });
      };

      recognition.onend = async () => {
        stopWebSpeechRecording();
        
        const transcription = finalTranscript.trim();
        
        if (transcription) {
          // Translate from English to Portuguese
          try {
            setState("processing");
            const translateResponse = await fetch("/api/translate", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ text: transcription }),
            });

            if (translateResponse.ok) {
              const translateData = await translateResponse.json();
              const translated = translateData.translated || transcription;
              
              setTranscript(translated);
              setState("idle");
              
              onTranscript(translated);
              
              toast.success("Comando de voz reconhecido", {
                description: translated,
                duration: 3000,
              });
            } else {
              // If translation fails, use original English text
              console.warn("Translation failed, using original text");
              setTranscript(transcription);
              setState("idle");
              onTranscript(transcription);
              
              toast.success("Comando de voz reconhecido (inglês)", {
                description: transcription,
                duration: 3000,
              });
            }
          } catch (translateError) {
            console.error("Translation error:", translateError);
            // Use original English if translation fails
            setTranscript(transcription);
            setState("idle");
            onTranscript(transcription);
            
            toast.success("Comando de voz reconhecido (inglês)", {
              description: transcription,
              duration: 3000,
            });
          }
        } else {
          // No speech detected
          setState("idle");
          
          if (interimTranscript.trim()) {
            toast.warning("Reconhecimento incompleto", {
              description: "Tente falar mais claramente.",
              duration: 4000,
            });
          } else {
            toast.error("Nenhuma fala detectada", {
              description: "Tente falar mais perto do microfone ou verifique as permissões.",
              duration: 4000,
            });
          }
        }
      };

      recognitionRef.current = recognition;
      recognition.start();
      
    } catch (err) {
      console.error("Error starting Web Speech API:", err);
      // Fallback to MediaRecorder
      return startMediaRecorderRecording();
    }
  };

  const stopWebSpeechRecording = () => {
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    setRecordingTime(0);
    
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {
        // Ignore errors when stopping
      }
      recognitionRef.current = null;
    }
  };

  const startMediaRecorderRecording = async () => {
    // Request microphone access
    const stream = await navigator.mediaDevices.getUserMedia({ 
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      } 
    });

    streamRef.current = stream;

      // Check if MediaRecorder is supported
      if (!MediaRecorder.isTypeSupported("audio/webm")) {
        // Fallback to default MIME type
        console.warn("audio/webm not supported, using default");
      }

      // Create MediaRecorder
      const mimeType = MediaRecorder.isTypeSupported("audio/webm") 
        ? "audio/webm" 
        : MediaRecorder.isTypeSupported("audio/mp4")
        ? "audio/mp4"
        : ""; // Browser will choose default

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: mimeType || undefined,
      });

      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      // Handle data available
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      // Handle recording stop
      mediaRecorder.onstop = async () => {
        try {
          setState("processing");

          // Create audio blob
          const mimeType = mediaRecorder.mimeType || "audio/webm";
          const audioBlob = new Blob(audioChunksRef.current, { 
            type: mimeType
          });

          // Determine file extension based on MIME type
          let fileExtension = "webm";
          if (mimeType.includes("mp4") || mimeType.includes("m4a")) {
            fileExtension = "m4a";
          } else if (mimeType.includes("ogg")) {
            fileExtension = "ogg";
          } else if (mimeType.includes("wav")) {
            fileExtension = "wav";
          }

          // Send to backend API
          const formData = new FormData();
          formData.append("audio", audioBlob, `recording.${fileExtension}`);

          console.log("Sending audio to API:", {
            size: audioBlob.size,
            type: mimeType,
            extension: fileExtension,
            duration: recordingTime,
          });

          const response = await fetch("/api/speech-to-text", {
            method: "POST",
            body: formData,
          });

          console.log("API response status:", response.status);

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: `HTTP ${response.status}` }));
            console.error("API error:", errorData);
            throw new Error(errorData.error || errorData.details || `HTTP ${response.status}`);
          }

          const data = await response.json();
          console.log("API response data:", data);
          
          const transcription = data.text || "";

          if (!transcription) {
            console.warn("Empty transcription received, full response:", data);
            throw new Error("No transcription received from API");
          }

          // Translate from English to Portuguese
          try {
            const translateResponse = await fetch("/api/translate", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ text: transcription }),
            });

            if (translateResponse.ok) {
              const translateData = await translateResponse.json();
              const translated = translateData.translated || transcription;
              
              setTranscript(translated);
              setState("idle");
              
              onTranscript(translated);
              
              toast.success("Comando de voz reconhecido", {
                description: translated,
                duration: 3000,
              });
            } else {
              // If translation fails, use original English
              console.warn("Translation failed, using original text");
              setTranscript(transcription);
              setState("idle");
              onTranscript(transcription);
              
              toast.success("Comando de voz reconhecido (inglês)", {
                description: transcription,
                duration: 3000,
              });
            }
          } catch (translateError) {
            console.error("Translation error:", translateError);
            // Use original English if translation fails
            setTranscript(transcription);
            setState("idle");
            onTranscript(transcription);
            
            toast.success("Comando de voz reconhecido (inglês)", {
              description: transcription,
              duration: 3000,
            });
          }

        } catch (err) {
          console.error("Error processing audio:", err);
          const errorMessage = err instanceof Error ? err.message : "Erro ao processar áudio";
          setError(errorMessage);
          setState("error");
          
          toast.error("Erro ao processar áudio", {
            description: errorMessage,
            duration: 5000,
          });
        } finally {
          // Cleanup
          audioChunksRef.current = [];
          if (streamRef.current) {
            streamRef.current.getTracks().forEach((track) => track.stop());
            streamRef.current = null;
          }
        }
      };

      // Start recording
      mediaRecorder.start();
      setState("recording");
      setRecordingTime(0);

      // Start timer to show recording time
      recordingTimerRef.current = setInterval(() => {
        setRecordingTime((prev) => {
          const newTime = prev + 1;
          // Auto-stop after max time
          if (newTime >= maxRecordingTime) {
            if (mediaRecorder.state === "recording") {
              stopRecording();
            }
            return maxRecordingTime;
          }
          return newTime;
        });
      }, 1000);

      // Auto-stop after max time (backup)
      setTimeout(() => {
        if (mediaRecorder.state === "recording") {
          stopRecording();
        }
      }, maxRecordingTime * 1000);
  };

  const handleClick = () => {
    if (state === "recording") {
      // Stop recording early if clicked again
      stopRecording();
    } else if (state === "processing") {
      // Do nothing while processing
      return;
    } else {
      // Start recording
      startRecording();
    }
  };

  const handleClear = () => {
    setTranscript("");
    setError("");
    setState("idle");
  };

  // Button styles based on state
  const getButtonStyles = () => {
    // Increased z-index to ensure visibility on mobile (9999 to be above everything)
    // On mobile: bottom-16 to avoid conflict with nav, on desktop: bottom-6
    const baseStyles = "fixed bottom-16 right-4 md:bottom-6 md:right-6 bg-indigo-600 text-white rounded-full p-4 shadow-lg hover:bg-indigo-700 transition-all duration-200 z-[9999] disabled:opacity-50 disabled:cursor-not-allowed w-14 h-14 flex items-center justify-center touch-manipulation";
    
    if (state === "recording") {
      return `${baseStyles} animate-pulse bg-red-600 hover:bg-red-700`;
    }
    
    if (state === "processing") {
      return `${baseStyles} bg-yellow-600 hover:bg-yellow-700`;
    }
    
    return baseStyles;
  };

  return (
    <div className={className}>
      {/* Voice Button */}
      <button
        onClick={handleClick}
        disabled={state === "processing"}
        className={getButtonStyles()}
        aria-label={state === "recording" ? "Parar gravação" : "Iniciar gravação de voz"}
        title={state === "recording" ? "A gravar... (clique para parar)" : "Comando de voz"}
      >
        {state === "processing" ? (
          <Loader2 className="h-6 w-6 animate-spin" />
        ) : state === "recording" ? (
          <div className="relative">
            <Mic className="h-6 w-6" />
            <span className="absolute -top-1 -right-1 h-3 w-3 bg-white rounded-full animate-ping" />
          </div>
        ) : (
          <Mic className="h-6 w-6" />
        )}
      </button>

      {/* Transcript Display - Fixed position above button on mobile, or inline on desktop */}
      {(transcript || error) && (
        <div className="fixed bottom-32 right-4 md:bottom-28 md:right-6 max-w-sm bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 p-4 z-[9998] animate-in slide-in-from-bottom-2">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                {error ? "Erro" : "Comando de voz"}
              </p>
              {error ? (
                <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
              ) : (
                <p className="text-sm text-gray-900 dark:text-gray-100 break-words">
                  {transcript}
                </p>
              )}
            </div>
            <button
              onClick={handleClear}
              className="flex-shrink-0 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              aria-label="Fechar"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Recording indicator with timer */}
      {state === "recording" && (
        <div className="fixed bottom-32 right-4 md:bottom-28 md:right-6 bg-red-600 text-white rounded-lg px-4 py-3 shadow-lg z-[9998] animate-in slide-in-from-bottom-2">
          <div className="flex items-center gap-2">
            <div className="relative">
              <Mic className="h-5 w-5 animate-pulse" />
              <span className="absolute -top-1 -right-1 h-2 w-2 bg-white rounded-full animate-ping" />
            </div>
            <div>
              <p className="text-sm font-medium">A gravar...</p>
              <p className="text-xs opacity-90">
                {recordingTime}s / {maxRecordingTime}s
              </p>
            </div>
          </div>
          <p className="text-xs mt-2 opacity-75">Clique novamente para parar</p>
        </div>
      )}
    </div>
  );
}

