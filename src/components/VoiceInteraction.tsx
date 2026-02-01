import { useState } from "react";
import { X, Volume2, VolumeX, ChevronDown, ChevronUp, Share2, BookmarkPlus, Mic } from "lucide-react";
import { cn } from "@/lib/utils";
import { MicrophoneButton } from "./MicrophoneButton";
import { WaveformVisualizer } from "./WaveformVisualizer";
import { Button } from "./ui/button";

type VoiceState = "idle" | "recording" | "processing" | "response";

interface VoiceInteractionProps {
  isOpen: boolean;
  onClose: () => void;
  language: string;
}

const translations = {
  en: {
    listening: "Listening...",
    thinking: "Thinking...",
    tapToSpeak: "Tap to speak",
    stopRecording: "Tap to stop",
    askAnother: "Ask another question",
    save: "Save",
    share: "Share",
    showText: "Show text",
    hideText: "Hide text",
  },
  hi: {
    listening: "सुन रहा हूँ...",
    thinking: "सोच रहा हूँ...",
    tapToSpeak: "बोलने के लिए टैप करें",
    stopRecording: "रोकने के लिए टैप करें",
    askAnother: "एक और सवाल पूछें",
    save: "सहेजें",
    share: "साझा करें",
    showText: "टेक्स्ट दिखाएं",
    hideText: "टेक्स्ट छुपाएं",
  },
};

export function VoiceInteraction({ isOpen, onClose, language }: VoiceInteractionProps) {
  const [state, setState] = useState<VoiceState>("idle");
  const [isPlaying, setIsPlaying] = useState(false);
  const [showTranscript, setShowTranscript] = useState(false);

  const t = translations[language as keyof typeof translations] || translations.en;

  // Demo response
  const demoResponse = language === "hi" 
    ? "आपकी गेहूं की फसल में पीले पत्ते पोषक तत्वों की कमी का संकेत हो सकते हैं। नाइट्रोजन युक्त खाद डालने की सलाह दी जाती है। सुबह के समय पानी देना सबसे अच्छा रहेगा।"
    : "The yellow leaves on your wheat crop may indicate nutrient deficiency. I recommend applying nitrogen-rich fertilizer. Watering in the morning hours would be most beneficial for your crop.";

  const handleMicClick = () => {
    if (state === "idle" || state === "response") {
      setState("recording");
      // Simulate recording for 3 seconds
      setTimeout(() => {
        setState("processing");
        // Simulate processing for 2 seconds
        setTimeout(() => {
          setState("response");
          setIsPlaying(true);
          // Auto-stop playing after 4 seconds
          setTimeout(() => setIsPlaying(false), 4000);
        }, 2000);
      }, 3000);
    } else if (state === "recording") {
      setState("processing");
      setTimeout(() => {
        setState("response");
        setIsPlaying(true);
        setTimeout(() => setIsPlaying(false), 4000);
      }, 2000);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-background animate-slide-in-right">
      {/* Header */}
      <div className="flex items-center justify-between p-4">
        <button
          onClick={onClose}
          className="p-3 rounded-full hover:bg-muted transition-colors focus:outline-none focus:ring-2 focus:ring-primary/30"
          aria-label="Close"
        >
          <X size={24} />
        </button>
        <h1 className="text-xl font-semibold">AgroVoice</h1>
        <div className="w-12" /> {/* Spacer for centering */}
      </div>

      {/* Main Content */}
      <div className="flex flex-col items-center justify-center px-6 pt-8">
        {/* Recording State */}
        {state === "recording" && (
          <div className="text-center space-y-6 animate-fade-in">
            <WaveformVisualizer isActive={true} />
            <p className="text-2xl font-medium text-primary">{t.listening}</p>
            <p className="text-muted-foreground">{t.stopRecording}</p>
          </div>
        )}

        {/* Processing State */}
        {state === "processing" && (
          <div className="text-center space-y-6 animate-fade-in">
            <div className="w-24 h-24 mx-auto">
              <div className="animate-sprout">
                <svg
                  width="96"
                  height="96"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-primary"
                >
                  <path d="M12 22v-7" />
                  <path d="M9 12h6" />
                  <path d="M12 12V8" />
                  <path d="M9 8c0-2 1.5-4 3-4s3 2 3 4" />
                  <path d="M7 15c-1 1-2 3-2 5h14c0-2-1-4-2-5" />
                </svg>
              </div>
            </div>
            <p className="text-2xl font-medium text-primary">{t.thinking}</p>
          </div>
        )}

        {/* Idle State */}
        {state === "idle" && (
          <div className="text-center space-y-6 animate-fade-in">
            <p className="text-xl text-muted-foreground">{t.tapToSpeak}</p>
          </div>
        )}

        {/* Response State */}
        {state === "response" && (
          <div className="w-full max-w-sm space-y-6 animate-fade-in">
            {/* Speaker Button */}
            <div className="flex justify-center">
              <button
                onClick={() => setIsPlaying(!isPlaying)}
                className={cn(
                  "w-24 h-24 rounded-full flex items-center justify-center transition-all btn-shadow",
                  isPlaying
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-secondary-foreground"
                )}
                aria-label={isPlaying ? "Pause" : "Play response"}
              >
                {isPlaying ? <Volume2 size={40} /> : <VolumeX size={40} />}
              </button>
            </div>

            {/* Transcript Toggle */}
            <button
              onClick={() => setShowTranscript(!showTranscript)}
              className="w-full flex items-center justify-center gap-2 py-3 text-muted-foreground hover:text-foreground transition-colors"
            >
              {showTranscript ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
              <span>{showTranscript ? t.hideText : t.showText}</span>
            </button>

            {/* Transcript */}
            {showTranscript && (
              <div className="bg-muted rounded-xl p-4 animate-fade-in">
                <p className="text-foreground leading-relaxed">{demoResponse}</p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1 h-14 gap-2"
                onClick={() => {}}
              >
                <Share2 size={20} />
                {t.share}
              </Button>
              <Button
                variant="outline"
                className="flex-1 h-14 gap-2"
                onClick={() => {}}
              >
                <BookmarkPlus size={20} />
                {t.save}
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Microphone */}
      <div className="absolute bottom-8 left-0 right-0 flex flex-col items-center gap-4">
        <MicrophoneButton
          isRecording={state === "recording"}
          isProcessing={state === "processing"}
          onClick={handleMicClick}
          size={state === "response" ? "default" : "large"}
        />
        {state === "response" && (
          <p className="text-muted-foreground">{t.askAnother}</p>
        )}
      </div>
    </div>
  );
}
