import { useState, useRef } from "react";
import { X, Volume2, VolumeX, ChevronDown, ChevronUp, Share2, BookmarkPlus, Mic } from "lucide-react";
import { cn } from "@/lib/utils";
import { MicrophoneButton } from "./MicrophoneButton";
import { WaveformVisualizer } from "./WaveformVisualizer";
import { Button } from "./ui/button";
import { transcribeAndGetAdvice } from "@/lib/apiClient";
import type { AgriculturalAdvisory } from "@/lib/apiClient";

type VoiceState = "idle" | "recording" | "processing" | "response";

const MIN_AUDIO_BYTES = 1000;
const RECORDER_TIMESLICE_MS = 250;

function getSupportedMimeType(): string | undefined {
  if (typeof MediaRecorder === "undefined") return undefined;
  if (MediaRecorder.isTypeSupported("audio/webm;codecs=opus")) return "audio/webm;codecs=opus";
  if (MediaRecorder.isTypeSupported("audio/webm")) return "audio/webm";
  return undefined;
}

interface VoiceInteractionProps {
  isOpen: boolean;
  onClose: () => void;
  language: string;
  weatherContext?: {
    temp: number;
    condition: number;
    humidity: number;
  };
}

const translations = {
  en: {
    title: "Voice Assistant",
    listening: "Listening...",
    thinking: "Processing...",
    tapToSpeak: "Tap the mic to ask a question",
    stopRecording: "Tap to stop",
    askAnother: "Ask another question",
    save: "Save",
    share: "Share",
    showText: "Show transcript",
    hideText: "Hide transcript",
    noAudio: "No audio captured. Try speaking closer to the mic.",
    micDenied: "Microphone access denied.",
    recordingFailed: "Recording failed. Please try again.",
    serverError: "Server error. Please try again.",
  },
  hi: {
    title: "वॉइस असिस्टेंट",
    listening: "सुन रहा हूँ...",
    thinking: "प्रोसेसिंग...",
    tapToSpeak: "सवाल पूछने के लिए माइक टैप करें",
    stopRecording: "रोकने के लिए टैप करें",
    askAnother: "एक और सवाल पूछें",
    save: "सहेजें",
    share: "साझा करें",
    showText: "टेक्स्ट दिखाएं",
    hideText: "टेक्स्ट छुपाएं",
    noAudio: "ऑडियो कैप्चर नहीं हुआ। माइक के पास बोलें।",
    micDenied: "माइक्रोफोन एक्सेस अस्वीकृत।",
    recordingFailed: "रिकॉर्डिंग विफल। पुनः प्रयास करें।",
    serverError: "सर्वर त्रुटि। पुनः प्रयास करें।",
  },
};

export function VoiceInteraction({ isOpen, onClose, language, weatherContext }: VoiceInteractionProps) {
  const [state, setState] = useState<VoiceState>("idle");
  const [isPlaying, setIsPlaying] = useState(false);
  const [showTranscript, setShowTranscript] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [advisory, setAdvisory] = useState<AgriculturalAdvisory | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordedMimeTypeRef = useRef<string>("audio/webm");

  const t = translations[language as keyof typeof translations] || translations.en;

  function stopStreamTracks() {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    mediaRecorderRef.current = null;
  }

  const handleMicClick = async () => {
    if (state === "idle" || state === "response") {
      setErrorMessage(null);
      setTranscript("");
      setAdvisory(null);

      try {
        // Stop any existing tracks before starting a new one
        stopStreamTracks();

        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
          }
        });
        streamRef.current = stream;

        // Find best supported mime type
        const formats = [
          "audio/webm;codecs=opus",
          "audio/webm",
          "audio/ogg;codecs=opus",
          "audio/mp4",
          "audio/aac"
        ];

        let selectedMimeType = "audio/webm";
        for (const f of formats) {
          if (MediaRecorder.isTypeSupported(f)) {
            selectedMimeType = f;
            break;
          }
        }

        recordedMimeTypeRef.current = selectedMimeType;
        console.log("🎤 Recording with mimeType:", selectedMimeType);

        const mediaRecorder = new MediaRecorder(stream, { mimeType: selectedMimeType });
        audioChunksRef.current = [];
        mediaRecorderRef.current = mediaRecorder;

        mediaRecorder.ondataavailable = (event) => {
          if (event.data && event.data.size > 0) {
            audioChunksRef.current.push(event.data);
          }
        };

        mediaRecorder.onstop = async () => {
          const chunks = audioChunksRef.current;
          const mime = recordedMimeTypeRef.current;

          if (chunks.length === 0) {
            console.error("❌ No audio chunks captured");
            setErrorMessage(t.noAudio);
            setState("idle");
            return;
          }

          const audioBlob = new Blob(chunks, { type: mime });
          console.log("✅ Audio recording stopped. Size:", audioBlob.size, "bytes");

          stopStreamTracks();

          if (audioBlob.size < MIN_AUDIO_BYTES) {
            console.warn("⚠️ Audio blob too small:", audioBlob.size, "bytes");
            setErrorMessage(t.noAudio);
            setState("idle");
            return;
          }

          setState("processing");

          try {
            const result = await transcribeAndGetAdvice(audioBlob, language, weatherContext);

            if (!result.success) {
              setErrorMessage(result.error || t.serverError);
              setState("idle");
              return;
            }

            if (result.transcript != null) setTranscript(result.transcript);
            if (result.advisory != null) setAdvisory(result.advisory);
            setState("response");
            setShowTranscript(false);

            if (result.advisory?.recommendation && "speechSynthesis" in window) {
              setIsPlaying(true);
              const utterance = new SpeechSynthesisUtterance(result.advisory.recommendation);
              utterance.lang = language === "hi" ? "hi-IN" : "en-IN";
              utterance.onend = () => setIsPlaying(false);
              utterance.onerror = () => setIsPlaying(false);
              window.speechSynthesis.speak(utterance);
            }
          } catch (err) {
            console.error("❌ Error in transcription flow:", err);
            setErrorMessage(t.serverError);
            setState("idle");
          }
        };

        mediaRecorder.start(RECORDER_TIMESLICE_MS);
        setState("recording");
      } catch (error) {
        console.error("🎤 Microphone error:", error);
        stopStreamTracks();
        const name = error instanceof Error ? error.name : "";
        let msg = t.recordingFailed;

        if (name === "NotAllowedError" || name === "PermissionDeniedError") {
          msg = t.micDenied;
        } else if (name === "NotFoundError") {
          msg = "No microphone found. Please connect one.";
        }

        setErrorMessage(msg);
        setState("idle");
      }
      return;
    }

    if (state === "recording") {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        mediaRecorderRef.current.stop();
        // stopStreamTracks will be called inside onstop if needed, 
        // but it's safer to call it after a short delay or ensure onstop handles it.
        // Actually stopStreamTracks() stops the mic IMMEDIATELY, which might 
        // gracefully end the MediaRecorder or cut it off.
        // Better to let MediaRecorder.stop() trigger the clean onstop.
      }
    }
  };


  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-background animate-slide-in-right flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-5 py-4 border-b border-border bg-background/95 backdrop-blur-apple">
        <button
          onClick={onClose}
          className="w-10 h-10 flex items-center justify-center rounded-xl border border-border hover:bg-muted transition-colors active:scale-95"
          aria-label="Close"
        >
          <X size={20} />
        </button>
        <h1 className="text-headline font-bold text-foreground">{t.title}</h1>
        <div className="w-10" />
      </header>

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-6">
        {/* Idle State */}
        {state === "idle" && (
          <div className="text-center space-y-8 animate-fade-in">
            {/* Voice Orb */}
            <div className="relative w-48 h-48 mx-auto">
              <div className="absolute inset-0 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 animate-breathing" />
              <div className="absolute inset-4 rounded-full bg-gradient-to-br from-primary to-primary/80 shadow-green flex items-center justify-center">
                <Mic className="w-16 h-16 text-primary-foreground" />
              </div>
            </div>
            <p className="text-body text-muted-foreground max-w-xs">{t.tapToSpeak}</p>
            {errorMessage && (
              <p className="text-footnote text-destructive max-w-xs mx-auto" role="alert">{errorMessage}</p>
            )}
          </div>
        )}

        {/* Recording State */}
        {state === "recording" && (
          <div className="text-center space-y-8 animate-fade-in">
            {/* Animated Orb */}
            <div className="relative w-48 h-48 mx-auto">
              <div className="absolute inset-0 rounded-full bg-gradient-to-br from-primary/30 to-primary/10 animate-pulse-ring-active" />
              <div className="absolute inset-4 rounded-full bg-gradient-to-br from-primary to-primary/80 shadow-green-lg flex items-center justify-center overflow-hidden">
                <WaveformVisualizer isActive={true} barCount={24} />
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-title font-bold text-primary">{t.listening}</p>
              <p className="text-subhead text-muted-foreground">{t.stopRecording}</p>
            </div>
          </div>
        )}

        {/* Processing State */}
        {state === "processing" && (
          <div className="text-center space-y-8 animate-fade-in">
            <div className="relative w-48 h-48 mx-auto">
              <div className="absolute inset-0 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 animate-breathing" />
              <div className="absolute inset-4 rounded-full bg-gradient-to-br from-primary to-primary/80 shadow-green flex items-center justify-center">
                <div className="w-12 h-12 border-4 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin-smooth" />
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-title font-bold text-primary">{t.thinking}</p>
              <p className="text-subhead text-muted-foreground animate-pulse">Converting your voice to text...</p>
            </div>
          </div>
        )}

        {/* Response State */}
        {state === "response" && (
          <div className="w-full max-w-md space-y-6 animate-fade-in">
            {/* Speaker Button - speaks advisory recommendation */}
            <div className="flex justify-center">
              <button
                onClick={() => {
                  if (!advisory?.recommendation) return;
                  if (isPlaying) {
                    window.speechSynthesis?.cancel();
                    setIsPlaying(false);
                  } else {
                    const utterance = new SpeechSynthesisUtterance(advisory.recommendation);
                    utterance.lang = language === "hi" ? "hi-IN" : "en-IN";
                    utterance.onend = () => setIsPlaying(false);
                    utterance.onerror = () => setIsPlaying(false);
                    window.speechSynthesis?.speak(utterance);
                    setIsPlaying(true);
                  }
                }}
                className={cn(
                  "w-24 h-24 rounded-full flex items-center justify-center transition-all duration-200 active:scale-95",
                  isPlaying
                    ? "bg-primary text-primary-foreground shadow-green"
                    : "bg-green-wash text-primary border-2 border-primary/20 hover:bg-green-subtle"
                )}
                aria-label={isPlaying ? "Pause" : "Play response"}
              >
                {isPlaying ? <Volume2 size={40} /> : <VolumeX size={40} />}
              </button>
            </div>

            {/* Status */}
            <div className="flex justify-center">
              <div className={cn(
                "inline-flex items-center gap-2 px-4 py-2 rounded-full text-footnote font-semibold",
                isPlaying ? "bg-green-wash text-primary" : "bg-muted text-muted-foreground"
              )}>
                {isPlaying && (
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                  </span>
                )}
                <span>{isPlaying ? "Speaking..." : "Tap to play"}</span>
              </div>
            </div>

            {/* Advice always visible */}
            {advisory && (
              <div className="p-5 bg-green-wash rounded-apple-lg border-l-4 border-primary">
                <p className="text-footnote text-muted-foreground uppercase tracking-wide mb-1">{advisory.condition}</p>
                <p className="text-body text-foreground leading-relaxed">{advisory.recommendation}</p>
              </div>
            )}

            {/* Transcript Toggle */}
            <button
              onClick={() => setShowTranscript(!showTranscript)}
              className="w-full flex items-center justify-center gap-2 py-3 text-subhead text-muted-foreground hover:text-foreground transition-colors active:scale-[0.98]"
            >
              {showTranscript ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
              <span>{showTranscript ? t.hideText : t.showText}</span>
            </button>

            {/* Transcript (collapsible) */}
            {showTranscript && transcript && (
              <div className="p-5 bg-muted/50 rounded-apple-lg border border-border animate-fade-in">
                <p className="text-footnote text-muted-foreground uppercase tracking-wide mb-1">You said</p>
                <p className="text-body text-foreground leading-relaxed">{transcript}</p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3 pt-2">
              <Button variant="outline" className="flex-1 h-12 rounded-apple border-2 gap-2 active:scale-[0.98]">
                <Share2 size={18} />
                {t.share}
              </Button>
              <Button variant="outline" className="flex-1 h-12 rounded-apple border-2 gap-2 active:scale-[0.98]">
                <BookmarkPlus size={18} />
                {t.save}
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Microphone */}
      <div className="pb-10 pt-4 flex flex-col items-center gap-3 bg-gradient-to-t from-background via-background to-transparent">
        <MicrophoneButton
          isRecording={state === "recording"}
          isProcessing={state === "processing"}
          onClick={handleMicClick}
          size={state === "response" ? "default" : "large"}
        />
        {state === "response" && (
          <p className="text-subhead text-muted-foreground">{t.askAnother}</p>
        )}
      </div>
    </div>
  );
}
