import { useState, useRef, useEffect } from "react";
import { X, Volume2, VolumeX, ChevronDown, ChevronUp, Share2, BookmarkPlus, Mic, Sparkles, CheckCircle, CloudRain, Sun, AlertTriangle, UserCircle, Send, Square } from "lucide-react";
import { cn } from "@/lib/utils";
import { MicrophoneButton } from "./MicrophoneButton";
import { WaveformVisualizer } from "./WaveformVisualizer";
import { Button } from "./ui/button";
import { transcribeAndGetAdvice, getTextAdvice, ConversationMessage } from "@/lib/apiClient";
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

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  condition?: string;
}

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
  const [conversationHistory, setConversationHistory] = useState<ConversationMessage[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [ttsAudio, setTtsAudio] = useState<HTMLAudioElement | null>(null);
  const [textInput, setTextInput] = useState("");
  const [isMuted, setIsMuted] = useState(() => localStorage.getItem("agrovoice_muted") === "true");

  useEffect(() => {
    localStorage.setItem("agrovoice_muted", String(isMuted));
    if (isMuted) {
      window.speechSynthesis?.cancel();
      if (ttsAudio) {
        ttsAudio.pause();
      }
      setIsPlaying(false);
    }
  }, [isMuted, ttsAudio]);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordedMimeTypeRef = useRef<string>("audio/webm");
  const recognitionRef = useRef<any>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const accumulatedTranscriptRef = useRef("");

  const t = getTranslation('voice', language);
  const tCommon = getTranslation('common', language);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [chatMessages]);

  useEffect(() => {
    if (isOpen && weatherContext) {
      if (weatherContext.condition >= 50 && weatherContext.condition < 99) {
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

  const addMessage = (role: 'user' | 'assistant', content: string, condition?: string) => {
    const newMsg: ChatMessage = {
      id: Date.now().toString(),
      role,
      content,
      timestamp: new Date(),
      condition
    };
    setChatMessages(prev => [...prev, newMsg]);
  };

  const processResponse = async (text: string) => {
    // Add user message to chat
    addMessage('user', text);
    setState("processing");

    try {
      const result = await getTextAdvice(text, language, weatherContext, conversationHistory, true);

      if (result.success && result.advisory) {
        setTranscript(result.transcript || text);
        setAdvisory(result.advisory);
        setState("response");

        // Add assistant message to chat
        addMessage('assistant', result.advisory.recommendation, result.advisory.condition);

        // Update conversation history for context
        setConversationHistory(prev => [
          ...prev,
          { role: 'user' as const, content: text },
          { role: 'assistant' as const, content: result.advisory!.recommendation }
        ].slice(-6));

        // Play TTS
        setTimeout(() => {
          playResponse(result.advisory!.recommendation, result.audio);
        }, 300);
      } else {
        setErrorMessage(result.error || "Failed");
        setState("idle");
      }
    } catch (e) {
      setErrorMessage("Connection error");
      setState("idle");
    }
  };

  const handleMicClick = async () => {
    if (state === "idle" || state === "response") {
      setErrorMessage(null);
      setTranscript("");
      setTextInput("");
      setAdvisory(null);
      stopStreamTracks();

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
          recognition.continuous = true;
          recognition.interimResults = true;
          accumulatedTranscriptRef.current = "";

          recognition.onstart = () => setState("recording");

          recognition.onresult = (event: any) => {
            let interimTranscript = "";
            let finalChunk = "";

            for (let i = event.resultIndex; i < event.results.length; ++i) {
              if (event.results[i].isFinal) {
                finalChunk += event.results[i][0].transcript;
              } else {
                interimTranscript += event.results[i][0].transcript;
              }
            }

            if (finalChunk) {
              accumulatedTranscriptRef.current += finalChunk + " ";
            }

            // Show real-time feedback in the text input so user sees we are listening
            setTextInput(accumulatedTranscriptRef.current + interimTranscript);
          };

          recognition.onend = () => {
            console.log("🎙️ Speech recognition ended");
            setState(prev => {
              if (prev === "recording") {
                // If it ended while we thought we were still recording, 
                // it might mean the browser reached a silence timeout.
                // We'll process what we have if any.
                return "idle"; // handleMicClick will handle the rest if called, 
                // but here we just ensure we don't get stuck.
              }
              return prev;
            });
          };

          recognition.onerror = (e: any) => {
            console.warn("Browser Speech Error:", e);
            if (e.error === 'not-allowed') {
              setErrorMessage(t.micDenied);
            } else if (e.error === 'network') {
              setErrorMessage("Network error. Try checking connection.");
            } else if (e.error !== 'aborted') {
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

      // Fallback to MediaRecorder
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
          const result = await transcribeAndGetAdvice(audioBlob, language, weatherContext, conversationHistory, true);

          if (result.success && result.advisory) {
            setTranscript(result.transcript || "");
            setAdvisory(result.advisory);
            setState("response");
            setShowTranscript(false);

            addMessage('user', result.transcript || '');
            addMessage('assistant', result.advisory.recommendation, result.advisory.condition);

            setConversationHistory(prev => [
              ...prev,
              { role: 'user' as const, content: result.transcript || '' },
              { role: 'assistant' as const, content: result.advisory!.recommendation }
            ].slice(-6));

            playResponse(result.advisory.recommendation, result.audio);
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
      if (recognitionRef.current) {
        // For browser recognition (manual stop)
        const finalPayload = textInput.trim();
        recognitionRef.current.stop();
        stopStreamTracks();
        if (finalPayload) {
          await processResponse(finalPayload);
        } else {
          setState("idle");
        }
      } else if (mediaRecorderRef.current) {
        // For MediaRecorder fallback
        mediaRecorderRef.current.stop();
        // processing happens in mediaRecorder.onstop
      } else {
        stopStreamTracks();
        setState("idle");
      }
    }
  };

  const handleTextSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!textInput.trim()) return;

    const text = textInput.trim();
    setTextInput("");
    await processResponse(text);
  };

  const cleanMarkdown = (text: string) => {
    return text
      .replace(/\*\*(.*?)\*\*/g, '$1')
      .replace(/\*(.*?)\*/g, '$1')
      .replace(/\[(.*?)\]\(.*?\)/g, '$1')
      .replace(/#{1,6}\s+(.*)/g, '$1')
      .replace(/[-*]\s+/g, '')
      .replace(/[`](.*?)[`]/g, '$1')
      .trim();
  };

  const speakResponse = (text: string) => {
    if (isMuted) return;
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

      const voices = window.speechSynthesis.getVoices();
      const bestVoice = voices.find(v =>
        (v.lang.replace('_', '-').startsWith(targetLang)) &&
        (v.name.includes('Google') || v.name.includes('Natural') || v.name.includes('Neural') || v.name.includes('Online'))
      ) || voices.find(v => v.lang.startsWith(targetLang.split('-')[0]));

      if (bestVoice) {
        utterance.voice = bestVoice;
        console.log(`🎙️ Using Browser Voice: ${bestVoice.name}`);
      }

      utterance.pitch = 1.0;
      utterance.rate = 1.0;

      utterance.onend = () => setIsPlaying(false);
      utterance.onerror = () => setIsPlaying(false);
      setIsPlaying(true);
      window.speechSynthesis.speak(utterance);
    }
  };

  const playResponse = (text: string, audioBase64?: string) => {
    if (isMuted) {
      console.log('🔇 Muted: Skipping audio playback');
      return;
    }
    if (audioBase64) {
      console.log('🔊 Playing natural TTS audio');
      const audio = new Audio(`data:audio/mp3;base64,${audioBase64}`);
      audio.onended = () => setIsPlaying(false);
      audio.onerror = () => {
        console.warn('TTS audio failed, falling back to browser speech');
        speakResponse(text);
      };
      setTtsAudio(audio);
      setIsPlaying(true);
      audio.play().catch(() => speakResponse(text));
    } else {
      speakResponse(text);
    }
  };

  const handlePlayAudio = () => {
    if (!advisory?.recommendation) return;
    if (isPlaying) {
      window.speechSynthesis?.cancel();
      if (ttsAudio) {
        ttsAudio.pause();
        ttsAudio.currentTime = 0;
      }
      setIsPlaying(false);
    } else {
      if (ttsAudio) {
        ttsAudio.currentTime = 0;
        setIsPlaying(true);
        ttsAudio.play().catch(() => speakResponse(advisory.recommendation));
      } else {
        speakResponse(advisory.recommendation);
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className={cn(
      isIntegrated ? "flex flex-col h-full bg-background pb-24" : "fixed inset-0 z-50 bg-background animate-slide-in-right flex flex-col"
    )}>
      <header className="flex items-center justify-between px-5 py-4 border-b border-border bg-background/95 backdrop-blur-apple">
        <button onClick={onClose} className="w-10 h-10 flex items-center justify-center rounded-xl border border-border hover:bg-muted transition-colors active:scale-95">
          <X size={20} />
        </button>
        <h1 className="text-headline font-bold text-foreground">
          {t.title}
        </h1>
        <button
          onClick={() => setIsMuted(!isMuted)}
          className={cn(
            "w-10 h-10 flex items-center justify-center rounded-xl border transition-all active:scale-95",
            isMuted ? "border-destructive/30 bg-destructive/5 text-destructive" : "border-border hover:bg-muted text-primary"
          )}
          title={isMuted ? "Unmute AI" : "Mute AI"}
        >
          {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
        </button>
      </header>

      {/* Chat Messages Container */}
      <div
        ref={chatContainerRef}
        className="flex-1 overflow-y-auto px-4 py-4 space-y-4"
      >
        {weatherAlert && chatMessages.length === 0 && (
          <div className="w-full max-w-sm mx-auto mb-4 p-4 rounded-xl bg-amber-50 border border-amber-200 flex items-start gap-3 animate-fade-in shadow-sm">
            <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5" />
            <div>
              <h3 className="text-sm font-bold text-amber-800">AgroGuard Alert</h3>
              <p className="text-xs text-amber-700 mt-1 leading-relaxed">{weatherAlert}</p>
            </div>
          </div>
        )}

        {chatMessages.length === 0 && state === "idle" && (
          <div className="text-center py-12 animate-fade-in">
            <div className="relative w-32 h-32 mx-auto mb-6">
              <div className="absolute inset-0 rounded-full bg-green-wash/50 animate-breathing" />
              <div className="absolute inset-4 rounded-full bg-white shadow-apple-lg flex items-center justify-center border border-primary/10">
                <UserCircle className="w-16 h-16 text-primary opacity-90" />
              </div>
            </div>
            <p className="text-body text-muted-foreground max-w-xs mx-auto">{t.tapToSpeak}</p>
            {errorMessage && (
              <div className="bg-destructive/10 p-3 rounded-lg mt-4 max-w-xs mx-auto">
                <p className="text-footnote text-destructive font-medium" role="alert">{errorMessage}</p>
              </div>
            )}
          </div>
        )}

        {/* Chat Bubbles */}
        {chatMessages.map((msg) => (
          <div
            key={msg.id}
            className={cn(
              "max-w-[85%] animate-fade-in",
              msg.role === 'user' ? "ml-auto" : "mr-auto"
            )}
          >
            {msg.role === 'user' ? (
              <div className="bg-primary text-primary-foreground px-4 py-3 rounded-2xl rounded-br-md shadow-sm">
                <p className="text-body">{msg.content}</p>
              </div>
            ) : (
              <div className="bg-card border border-border px-4 py-3 rounded-2xl rounded-bl-md shadow-sm">
                {msg.condition && (
                  <div className="flex items-center gap-2 mb-2 pb-2 border-b border-border/50">
                    <UserCircle className="w-4 h-4 text-primary" />
                    <span className="text-caption font-bold uppercase tracking-widest text-primary">{msg.condition}</span>
                  </div>
                )}
                <div className="prose prose-sm text-foreground max-w-none leading-relaxed">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {msg.content}
                  </ReactMarkdown>
                </div>
              </div>
            )}
            <p className={cn(
              "text-[10px] text-muted-foreground mt-1",
              msg.role === 'user' ? "text-right" : "text-left"
            )}>
              {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>
        ))}

        {/* Processing Indicator */}
        {state === "processing" && (
          <div className="max-w-[85%] mr-auto animate-fade-in">
            <div className="bg-card border border-border px-4 py-3 rounded-2xl rounded-bl-md shadow-sm">
              <div className="flex items-center gap-2">
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
                <span className="text-sm text-muted-foreground">{t.thinking}</span>
              </div>
            </div>
          </div>
        )}

        {/* Recording Indicator */}
        {state === "recording" && (
          <div className="max-w-[85%] ml-auto animate-fade-in">
            <div className="bg-primary/10 border border-primary/20 px-4 py-3 rounded-2xl rounded-br-md shadow-sm">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                <span className="text-sm text-primary font-medium">{t.listening}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="border-t border-border bg-background p-4">
        <div className="flex items-center gap-3">
          {/* Voice Button */}
          <MicrophoneButton
            isRecording={state === "recording"}
            isProcessing={state === "processing"}
            onClick={handleMicClick}
            size="small"
          />

          {/* Text Input */}
          <form onSubmit={handleTextSubmit} className="flex-1 flex gap-2">
            <input
              type="text"
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              placeholder={language === 'hi' ? "संदेश टाइप करें..." : "Type a message..."}
              className="flex-1 h-12 px-4 rounded-full bg-muted border border-border text-body placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
              disabled={state === "recording" || state === "processing"}
            />
            {textInput.trim() && (
              <button
                type="submit"
                disabled={!textInput.trim() || state === "recording" || state === "processing"}
                className="w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primary/90 transition-colors active:scale-95 animate-fade-in"
              >
                <Send size={20} />
              </button>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}
