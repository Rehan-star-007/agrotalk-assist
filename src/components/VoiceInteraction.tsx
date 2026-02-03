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
  },
};

export function VoiceInteraction({ isOpen, onClose, language }: VoiceInteractionProps) {
  const [state, setState] = useState<VoiceState>("idle");
  const [isPlaying, setIsPlaying] = useState(false);
  const [showTranscript, setShowTranscript] = useState(false);

  const t = translations[language as keyof typeof translations] || translations.en;

  const demoResponse = language === "hi" 
    ? "आपकी गेहूं की फसल में पीले पत्ते पोषक तत्वों की कमी का संकेत हो सकते हैं। नाइट्रोजन युक्त खाद डालने की सलाह दी जाती है। सुबह के समय पानी देना सबसे अच्छा रहेगा।"
    : "The yellow leaves on your wheat crop may indicate nutrient deficiency. I recommend applying nitrogen-rich fertilizer. Watering in the morning hours would be most beneficial for your crop.";

  const handleMicClick = () => {
    if (state === "idle" || state === "response") {
      setState("recording");
      setTimeout(() => {
        setState("processing");
        setTimeout(() => {
          setState("response");
          setIsPlaying(true);
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
            <p className="text-title font-bold text-primary">{t.thinking}</p>
          </div>
        )}

        {/* Response State */}
        {state === "response" && (
          <div className="w-full max-w-md space-y-6 animate-fade-in">
            {/* Speaker Button */}
            <div className="flex justify-center">
              <button
                onClick={() => setIsPlaying(!isPlaying)}
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

            {/* Transcript Toggle */}
            <button
              onClick={() => setShowTranscript(!showTranscript)}
              className="w-full flex items-center justify-center gap-2 py-3 text-subhead text-muted-foreground hover:text-foreground transition-colors active:scale-[0.98]"
            >
              {showTranscript ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
              <span>{showTranscript ? t.hideText : t.showText}</span>
            </button>

            {/* Transcript */}
            {showTranscript && (
              <div className="p-5 bg-green-wash rounded-apple-lg border-l-4 border-primary animate-fade-in">
                <p className="text-body text-foreground leading-relaxed">{demoResponse}</p>
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
