import { useState, useRef, useEffect } from "react";
import { X, Volume2, VolumeX, ChevronDown, ChevronUp, Share2, BookmarkPlus, Mic, Sparkles, CheckCircle, CloudRain, Sun, AlertTriangle, UserCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { MicrophoneButton } from "./MicrophoneButton";
import { WaveformVisualizer } from "./WaveformVisualizer";
import { Button } from "./ui/button";
import { transcribeAndGetAdvice, getTextAdvice } from "@/lib/apiClient";
import type { AgriculturalAdvisory } from "@/lib/apiClient";
import { getTranslation } from "@/lib/translations";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

type VoiceState = "idle" | "recording" | "processing" | "response";

interface IWindow extends Window {
  webkitSpeechRecognition: any;
  SpeechRecognition: any;
}

const MIN_AUDIO_BYTES = 1000;
const RECORDER_TIMESLICE_MS = 250;

interface VoiceInteractionProps {
  isOpen: boolean;
  onClose: () => void;
  language: string;
  isIntegrated?: boolean;
  weatherContext?: {
    temp: number;
    condition: number;
    humidity: number;
  };
}

export function VoiceInteraction({ isOpen, onClose, language, isIntegrated, weatherContext }: VoiceInteractionProps) {
  const [state, setState] = useState<VoiceState>("idle");
  const [isPlaying, setIsPlaying] = useState(false);
  const [showTranscript, setShowTranscript] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [advisory, setAdvisory] = useState<AgriculturalAdvisory | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [weatherAlert, setWeatherAlert] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordedMimeTypeRef = useRef<string>("audio/webm");
  const recognitionRef = useRef<any>(null);

  const t = getTranslation('voice', language);
  const tCommon = getTranslation('common', language);

  useEffect(() => {
    if (isOpen && weatherContext) {
      if (weatherContext.condition >= 50 && weatherContext.condition <= 99) {
        setWeatherAlert(language === 'hi' ? "चेतावनी: बारिश की संभावना है। कीटनाशक छिड़काव स्थगित करें।" : "Warning: Rain detected. Postpone pesticide spraying.");
      } else if (weatherContext.temp > 35) {
        setWeatherAlert(language === 'hi' ? "गर्मी की चेतावनी: अतिरिक्त सिंचाई की आवश्यकता हो सकती है।" : "Heat Alert: Crops may need extra irrigation today.");
      } else {
        setWeatherAlert(null);
      }
    }
  }, [isOpen, weatherContext, language]);

  function stopStreamTracks() {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    mediaRecorderRef.current = null;
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch (e) { }
    }
  }

  const handleMicClick = async () => {
    if (state === "idle" || state === "response") {
      setErrorMessage(null);
      setTranscript("");
      setAdvisory(null);
      stopStreamTracks();

      // PRIMARY MODE: Browser Speech Recognition (Faster, Free, works Offline)
      // We prioritize this to avoid dependent backend STT services (like HF Whisper)
      const WindowObj = window as unknown as IWindow;
      const Recognition = WindowObj.webkitSpeechRecognition || WindowObj.SpeechRecognition;

      if (Recognition) {
        console.log("🎙️ Using Browser Speech Recognition (Primary)");

        try {
          const recognition = new Recognition();
          const langMap: Record<string, string> = {
            'hi': 'hi-IN',
            'ta': 'ta-IN',
            'te': 'te-IN',
            'mr': 'mr-IN',
            'en': 'en-US'
          };
          recognition.lang = langMap[language] || 'en-US';
          recognition.continuous = false;
          recognition.interimResults = false;

          recognition.onstart = () => setState("recording");

          recognition.onresult = async (event: any) => {
            const text = event.results[0][0].transcript;
            console.log("📝 Transcript:", text);
            setState("processing");

            // Send Text to Backend (Inference Service)
            const result = await getTextAdvice(text, language, weatherContext);

            if (result.success && result.advisory) {
              setTranscript(result.transcript || text);
              setAdvisory(result.advisory);
              setState("response");
              // Give a small delay for the UI to transition before speaking
              setTimeout(() => {
                speakResponse(result.advisory.recommendation);
              }, 300);
            } else {
              setErrorMessage(result.error || "Failed");
              setState("idle");
            }
          };

          recognition.onerror = (e: any) => {
            console.warn("Browser Speech Error:", e);
            if (e.error === 'not-allowed') {
              setErrorMessage(t.micDenied);
            } else if (e.error === 'network') {
              setErrorMessage("Network error. Try checking connection.");
            } else {
              setErrorMessage("Voice recognition failed. Try again.");
            }
            setState("idle");
          };

          recognition.start();
          recognitionRef.current = recognition;
        } catch (e) {
          console.error(e);
          setErrorMessage("Voice start failed");
          setState("idle");
        }
        return;
      }

      // FALLBACK MODE: MediaRecorder + Backend Whisper (Only if Browser Speech missing)
      console.log("📡 Browser Speech missing. Falling back to Backend Whisper...");
      if (!navigator.onLine) {
        setErrorMessage("Offline speech not supported in this browser.");
        return;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }
        });
        streamRef.current = stream;

        let mimeType = "audio/webm";
        if (MediaRecorder.isTypeSupported("audio/webm;codecs=opus")) mimeType = "audio/webm;codecs=opus";
        else if (MediaRecorder.isTypeSupported("audio/mp4")) mimeType = "audio/mp4";

        recordedMimeTypeRef.current = mimeType;
        const mediaRecorder = new MediaRecorder(stream, { mimeType });
        audioChunksRef.current = [];
        mediaRecorderRef.current = mediaRecorder;

        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) audioChunksRef.current.push(event.data);
        };

        mediaRecorder.onstop = async () => {
          const audioBlob = new Blob(audioChunksRef.current, { type: recordedMimeTypeRef.current });
          stopStreamTracks();

          if (audioBlob.size < MIN_AUDIO_BYTES) {
            setErrorMessage(t.noAudio);
            setState("idle");
            return;
          }

          setState("processing");
          const result = await transcribeAndGetAdvice(audioBlob, language, weatherContext);

          if (result.success && result.advisory) {
            setTranscript(result.transcript || "");
            setAdvisory(result.advisory);
            setState("response");
            setShowTranscript(false);
            speakResponse(result.advisory.recommendation);
          } else {
            setErrorMessage(result.error || t.serverError);
            setState("idle");
          }
        };

        mediaRecorder.start(RECORDER_TIMESLICE_MS);
        setState("recording");
      } catch (error) {
        console.error("Mic Error:", error);
        setErrorMessage(t.micDenied);
        setState("idle");
      }
      return;
    }

    if (state === "recording") {
      stopStreamTracks();
    }
  };

  const cleanMarkdown = (text: string) => {
    return text
      .replace(/\*\*(.*?)\*\*/g, '$1') // Remove Bold
      .replace(/\*(.*?)\*/g, '$1')     // Remove Italics
      .replace(/\[(.*?)\]\(.*?\)/g, '$1') // Remove Links
      .replace(/#{1,6}\s+(.*)/g, '$1')  // Remove Headers
      .replace(/[-*]\s+/g, '')          // Remove List Bullets
      .replace(/[`](.*?)[`]/g, '$1')    // Remove Code
      .trim();
  };

  const speakResponse = (text: string) => {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const cleanedText = cleanMarkdown(text);
      const utterance = new SpeechSynthesisUtterance(cleanedText);

      const langMap: Record<string, string> = {
        'hi': 'hi-IN',
        'ta': 'ta-IN',
        'te': 'te-IN',
        'mr': 'mr-IN',
        'en': 'en-IN'
      };

      const targetLang = langMap[language] || 'en-IN';
      utterance.lang = targetLang;

      // Find the most natural voice (Google or Neural)
      const voices = window.speechSynthesis.getVoices();
      const bestVoice = voices.find(v =>
        (v.lang.replace('_', '-').startsWith(targetLang)) &&
        (v.name.includes('Google') || v.name.includes('Natural') || v.name.includes('Neural') || v.name.includes('Online'))
      ) || voices.find(v => v.lang.startsWith(targetLang.split('-')[0]));

      if (bestVoice) {
        utterance.voice = bestVoice;
        console.log(`🎙️ Using AI Voice: ${bestVoice.name}`);
      }

      // Human-like settings
      utterance.pitch = 1.0;
      utterance.rate = 1.0;

      utterance.onend = () => setIsPlaying(false);
      utterance.onerror = () => setIsPlaying(false);
      setIsPlaying(true);
      window.speechSynthesis.speak(utterance);
    }
  };

  const handlePlayAudio = () => {
    if (!advisory?.recommendation) return;
    if (isPlaying) {
      window.speechSynthesis?.cancel();
      setIsPlaying(false);
    } else {
      speakResponse(advisory.recommendation);
    }
  };

  if (!isOpen) return null;

  return (
    <div className={cn(
      isIntegrated ? "flex flex-col h-full bg-background" : "fixed inset-0 z-50 bg-background animate-slide-in-right flex flex-col"
    )}>
      <header className="flex items-center justify-between px-5 py-4 border-b border-border bg-background/95 backdrop-blur-apple">
        {!isIntegrated ? (
          <button onClick={onClose} className="w-10 h-10 flex items-center justify-center rounded-xl border border-border hover:bg-muted transition-colors active:scale-95">
            <X size={20} />
          </button>
        ) : (
          <div className="w-10" />
        )}
        <h1 className="text-headline font-bold text-foreground">
          {t.title}
        </h1>
        <div className="w-10 h-10 flex items-center justify-center rounded-xl bg-green-wash">
          <Sparkles className="w-5 h-5 text-primary" />
        </div>
      </header>

      <div className="flex-1 flex flex-col items-center justify-center px-6 overflow-y-auto">

        {weatherAlert && state === "idle" && (
          <div className="w-full max-w-sm mb-6 p-4 rounded-xl bg-amber-50 border border-amber-200 flex items-start gap-3 animate-fade-in shadow-sm">
            <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5" />
            <div>
              <h3 className="text-sm font-bold text-amber-800">AgroGuard Alert</h3>
              <p className="text-xs text-amber-700 mt-1 leading-relaxed">{weatherAlert}</p>
            </div>
          </div>
        )}

        {state === "idle" && (
          <div className="text-center space-y-8 animate-fade-in">
            <div className="relative w-48 h-48 mx-auto">
              <div className="absolute inset-0 rounded-full bg-green-wash/50 animate-breathing" />
              <div className="absolute inset-6 rounded-full bg-white shadow-apple-lg flex items-center justify-center border border-primary/10">
                <UserCircle className="w-20 h-20 text-primary opacity-90" />
              </div>
            </div>
            <p className="text-body text-muted-foreground max-w-xs">{t.tapToSpeak}</p>
            {errorMessage && (
              <div className="bg-destructive/10 p-3 rounded-lg mt-2">
                <p className="text-footnote text-destructive max-w-xs mx-auto font-medium" role="alert">{errorMessage}</p>
                {errorMessage.includes('HF_TOKEN') && <p className="text-[10px] text-destructive/80 mt-1">Backend token missing. Using text mode.</p>}
              </div>
            )}
          </div>
        )}

        {(state === "recording" || state === "processing") && (
          <div className="text-center space-y-8 animate-fade-in">
            <div className="relative w-48 h-48 mx-auto">
              <div className="absolute inset-0 rounded-full bg-green-wash animate-pulse-ring-active" />
              <div className="absolute inset-4 rounded-full bg-white shadow-green-lg flex items-center justify-center overflow-hidden border-2 border-primary/20">
                <UserCircle className={cn("w-20 h-20 text-primary", state === "recording" && "animate-pulse")} />
                {state === "processing" && (
                  <div className="absolute inset-0 bg-white/60 flex items-center justify-center backdrop-blur-sm">
                    <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin-smooth" />
                  </div>
                )}
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-title font-bold text-primary">{state === "recording" ? t.listening : t.thinking}</p>
              <p className="text-subhead text-muted-foreground">{state === "recording" ? t.stopRecording : tCommon.loading}</p>
            </div>
          </div>
        )}

        {state === "response" && (
          <div className="w-full max-w-md space-y-5 animate-fade-in py-4">
            <div className="flex items-center justify-center gap-3 p-4 bg-primary/5 rounded-apple-lg border border-primary/10">
              <CheckCircle className="w-6 h-6 text-primary" />
              <span className="text-headline font-bold text-primary">{tCommon.success}</span>
            </div>
            <div className="bg-card rounded-apple-lg border border-border shadow-apple p-5">
              <div className="flex items-center justify-between mb-4 pb-4 border-b border-border/50">
                <div className={cn(
                  "inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold overflow-hidden transition-all duration-500",
                  isPlaying ? "bg-primary/20 text-primary w-40" : "bg-muted text-muted-foreground w-28"
                )}>
                  {isPlaying ? (
                    <div className="flex items-center gap-2">
                      <div className="flex gap-0.5 h-3">
                        <div className="w-1 bg-primary rounded-full animate-vocal-1" />
                        <div className="w-1 bg-primary rounded-full animate-vocal-2" />
                        <div className="w-1 bg-primary rounded-full animate-vocal-3" />
                      </div>
                      <span className="font-bold">AgroBot Speaking</span>
                    </div>
                  ) : <span>Tap to Replay</span>}
                </div>
                <button
                  onClick={handlePlayAudio}
                  className={cn(
                    "w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300",
                    isPlaying ? "bg-primary text-primary-foreground shadow-lg scale-110" : "bg-primary/10 text-primary hover:bg-primary/20"
                  )}
                >
                  {isPlaying ? <Volume2 size={22} className="animate-pulse" /> : <Volume2 size={22} />}
                </button>
              </div>

              {advisory && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <UserCircle className="w-4 h-4 text-primary" />
                    <span className="text-caption font-bold uppercase tracking-widest text-primary">{advisory.condition}</span>
                  </div>

                  <div className="prose prose-sm text-foreground max-w-none leading-relaxed">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {advisory.recommendation}
                    </ReactMarkdown>
                  </div>
                </div>
              )}
            </div>

            {transcript && (
              <div className="bg-muted/30 rounded-lg p-3">
                <button onClick={() => setShowTranscript(!showTranscript)} className="flex items-center gap-2 text-xs font-medium text-muted-foreground w-full">
                  {showTranscript ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  {t.youSaid}
                </button>
                {showTranscript && <p className="mt-2 text-sm text-muted-foreground italic">"{transcript}"</p>}
              </div>
            )}
          </div>
        )}
      </div>

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
