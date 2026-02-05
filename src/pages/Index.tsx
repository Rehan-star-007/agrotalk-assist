import { useState, useEffect, useRef } from "react";
import { Camera, X, Volume2, VolumeX, Send, Sparkles, Bot, User, Play, Pause, RotateCcw, Mic, ChevronDown, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { MicrophoneButton } from "@/components/MicrophoneButton";
import { ConnectionStatus } from "@/components/ConnectionStatus";
import { LanguageSelector } from "@/components/LanguageSelector";
import { RecentQueryCard } from "@/components/RecentQueryCard";
import { BottomNavigation, type NavTab } from "@/components/BottomNavigation";
import { VoiceInteraction } from "@/components/VoiceInteraction";
import { ImageAnalysis } from "@/components/ImageAnalysis";
import { LibraryScreen } from "@/components/LibraryScreen";
import { SettingsScreen } from "@/components/SettingsScreen";
import { MarketPriceScreen } from "@/components/MarketPriceScreen";
import { OfflineBanner } from "@/components/OfflineBanner";

import { useLibrary } from "@/hooks/useLibrary";
import { useChat } from "@/hooks/useChat";
import { WeatherDashboard } from "@/components/WeatherDashboard";
import { getTranslation } from "@/lib/translations";
import { getTextAdvice, ConversationMessage } from "@/lib/apiClient";
import { toast } from "sonner";
import { ScrollArea } from "@/components/ui/scroll-area";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  condition?: string;
}

interface IWindow {
  webkitSpeechRecognition: any;
  SpeechRecognition: any;
}

export default function Index() {
  const [activeTab, setActiveTab] = useState<NavTab>("home");
  const [language, setLanguage] = useState("en");
  const [voiceSpeed, setVoiceSpeed] = useState<"slow" | "normal" | "fast">("normal");
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isImageOpen, setIsImageOpen] = useState(false);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [weatherData, setWeatherData] = useState<any>(null);
  const [isWeatherLoading, setIsWeatherLoading] = useState(true);
  const [weatherError, setWeatherError] = useState<string | null>(null);

  // Chat state
  const [isCameraActive, setIsCameraActive] = useState(false);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const isHindi = language === "hi";
  const [isChatMode, setIsChatMode] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [textInput, setTextInput] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isMuted, setIsMuted] = useState(() => localStorage.getItem("agrovoice_muted") === "true");
  const [conversationHistory, setConversationHistory] = useState<ConversationMessage[]>([]);
  const [conversationId, setConversationId] = useState<string>("");
  const [currentPlayingId, setCurrentPlayingId] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [ttsAudio, setTtsAudio] = useState<HTMLAudioElement | null>(null);

  const chatContainerRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const accumulatedTranscriptRef = useRef("");
  const voiceMenuRef = useRef<HTMLDivElement>(null);

  const [selectedVoice, setSelectedVoice] = useState(() => localStorage.getItem("agrovoice_voice") || "mia");
  const [showVoiceMenu, setShowVoiceMenu] = useState(false);



  // Available NVIDIA voices
  const voiceOptions = [
    { id: "mia", name: "Mia", label: language === 'hi' ? 'मिया (महिला)' : 'Mia (Female)' },
    { id: "aria", name: "Aria", label: language === 'hi' ? 'आरिया (महिला)' : 'Aria (Female)' },
    { id: "sofia", name: "Sofia", label: language === 'hi' ? 'सोफिया (महिला)' : 'Sofia (Female)' },
  ];

  const t = getTranslation('home', language);
  const tVoice = getTranslation('voice', language);

  const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

  const fetchWeather = async (lat: number, lon: number) => {
    try {
      setIsWeatherLoading(true);
      const response = await fetch(`${API_BASE_URL}/weather?lat=${lat}&lon=${lon}`);
      const result = await response.json();
      if (result.success) {
        setWeatherData(result.data);
      } else {
        setWeatherError(result.error || 'Failed to fetch weather');
      }
    } catch (err) {
      setWeatherError('Connection to weather service failed');
    } finally {
      setIsWeatherLoading(false);
    }
  };

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => fetchWeather(position.coords.latitude, position.coords.longitude),
        () => fetchWeather(28.6139, 77.2090) // Fallback to Delhi
      );
    } else {
      setWeatherError('Geolocation not supported');
      setIsWeatherLoading(false);
    }
  }, []);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  useEffect(() => {
    localStorage.setItem("agrovoice_muted", String(isMuted));
    if (isMuted) {
      window.speechSynthesis?.cancel();
      if (ttsAudio) {
        ttsAudio.pause();
        ttsAudio.currentTime = 0;
      }
      setIsPlaying(false);
      setCurrentPlayingId(null);
    }
  }, [isMuted, ttsAudio]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (voiceMenuRef.current && !voiceMenuRef.current.contains(event.target as Node)) {
        setShowVoiceMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [chatMessages]);

  const handleTabChange = (tab: NavTab) => {
    if (tab === "analyze") {
      setIsImageOpen(true);
    } else {
      setActiveTab(tab);
    }
  };

  const { items: libraryItems, refresh: refreshLibrary } = useLibrary();
  const { history: chatHistory, fetchHistory: fetchChatHistory } = useChat();

  useEffect(() => {
    if (activeTab === 'home' && !isChatMode) {
      fetchChatHistory();
    }
  }, [activeTab, isChatMode]);

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

  const cleanMarkdown = (text: string) => {
    return text
      .replace(/\*\*(.*?)\*\*/g, '$1')
      .replace(/\*(.*?)\*/g, '$1')
      .replace(/\[(.+?)\]\(.+?\)/g, '$1')
      .replace(/#{1,6}\s+(.*)/g, '$1')
      .replace(/[-*]\s+/g, '')
      .replace(/[`](.*?)[`]/g, '$1')
      .trim();
  };

  const speakText = (text: string, messageId?: string) => {
    if (isMuted) return;
    window.speechSynthesis?.cancel();
    if (ttsAudio) {
      ttsAudio.pause();
      ttsAudio.currentTime = 0;
    }

    if ("speechSynthesis" in window) {
      const cleanedText = cleanMarkdown(text);
      const utterance = new SpeechSynthesisUtterance(cleanedText);
      const langMap: Record<string, string> = {
        'en': 'en-IN', 'hi': 'hi-IN', 'ta': 'ta-IN', 'te': 'te-IN', 'mr': 'mr-IN'
      };
      utterance.lang = langMap[language] || 'en-IN';

      const voices = window.speechSynthesis.getVoices();
      const langCode = utterance.lang.split('-')[0];
      const bestVoice = voices.find(v => v.lang.replace('_', '-').toLowerCase().startsWith(langCode));
      if (bestVoice) utterance.voice = bestVoice;

      utterance.onstart = () => { setIsPlaying(true); if (messageId) setCurrentPlayingId(messageId); };
      utterance.onend = () => { setIsPlaying(false); setCurrentPlayingId(null); };
      utterance.onerror = () => { setIsPlaying(false); setCurrentPlayingId(null); };

      setIsPlaying(true);
      if (messageId) setCurrentPlayingId(messageId);
      window.speechSynthesis.speak(utterance);
    }
  };

  const playResponse = (text: string, audioBase64?: string) => {
    if (isMuted) return;
    if (audioBase64) {
      const audio = new Audio(`data:audio/mp3;base64,${audioBase64}`);
      audio.onended = () => { setIsPlaying(false); setCurrentPlayingId(null); };
      audio.onerror = () => speakText(text);
      setTtsAudio(audio);
      setIsPlaying(true);
      audio.play().catch(() => speakText(text));
    } else {
      speakText(text);
    }
  };

  const processResponse = async (text: string) => {
    if (!conversationId) {
      const newId = `chat_${Math.random().toString(36).substring(2, 9)}_${Date.now()}`;
      setConversationId(newId);
    }

    addMessage('user', text);
    setIsProcessing(true);

    try {
      const weatherContext = weatherData ? {
        temp: weatherData.current.temperature_2m,
        condition: weatherData.current.weather_code,
        humidity: weatherData.current.relative_humidity_2m
      } : undefined;

      const result = await getTextAdvice(text, language, weatherContext, conversationHistory, true, conversationId, selectedVoice);

      if (result.success && result.advisory) {
        addMessage('assistant', result.advisory.recommendation, result.advisory.condition);
        setConversationHistory(prev => [
          ...prev,
          { role: 'user' as const, content: text },
          { role: 'assistant' as const, content: result.advisory!.recommendation }
        ].slice(-6));
        setTimeout(() => playResponse(result.advisory!.recommendation, result.audio), 300);
      }
    } catch (e) {
      console.error("Chat error:", e);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleTextSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!textInput.trim()) return;
    setIsChatMode(true);
    const text = textInput.trim();
    setTextInput("");
    await processResponse(text);
  };

  const handleMicClick = async () => {
    if (isRecording) {
      if (recognitionRef.current) {
        const finalPayload = textInput.trim();
        recognitionRef.current.stop();
        recognitionRef.current = null;
        setIsRecording(false);
        if (finalPayload) {
          setIsChatMode(true);
          setTextInput("");
          await processResponse(finalPayload);
        }
      }
      return;
    }

    const WindowObj = window as unknown as IWindow;
    const Recognition = WindowObj.webkitSpeechRecognition || WindowObj.SpeechRecognition;

    if (Recognition) {
      try {
        const recognition = new Recognition();
        const langMap: Record<string, string> = {
          'hi': 'hi-IN', 'ta': 'ta-IN', 'te': 'te-IN', 'mr': 'mr-IN', 'en': 'en-US'
        };
        recognition.lang = langMap[language] || 'en-US';
        recognition.continuous = true;
        recognition.interimResults = true;
        accumulatedTranscriptRef.current = "";

        recognition.onstart = () => setIsRecording(true);

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
          setTextInput(accumulatedTranscriptRef.current + interimTranscript);
        };

        recognition.onend = () => setIsRecording(false);
        recognition.onerror = () => setIsRecording(false);

        recognition.start();
        recognitionRef.current = recognition;
      } catch (e) {
        console.error("Speech recognition error:", e);
      }
    }
  };

  const handlePlayMessage = (msgId: string, content: string) => {
    if (currentPlayingId === msgId && isPlaying) {
      window.speechSynthesis?.cancel();
      if (ttsAudio) { ttsAudio.pause(); ttsAudio.currentTime = 0; }
      setIsPlaying(false);
      setCurrentPlayingId(null);
    } else {
      speakText(content, msgId);
    }
  };

  const exitChat = () => {
    setIsChatMode(false);
    setChatMessages([]);
    setConversationHistory([]);
    setConversationId("");
    setTextInput("");
    window.speechSynthesis?.cancel();
  };

  const getPlaceholderText = () => {
    const ph: Record<string, string> = {
      en: "Ask about your crops...",
      hi: "अपनी फसल के बारे में पूछें...",
      ta: "உங்கள் பயிர்களைப் பற்றி கேளுங்கள்...",
      te: "మీ పంటల గురించి అడగండి...",
      mr: "तुमच्या पिकांबद्दल विचारा..."
    };
    return ph[language] || ph.en;
  };

  // Home Screen with integrated chat
  const renderHomeScreen = () => {
    const allItems = [
      ...libraryItems.map(item => ({
        id: item.id,
        query: language === "hi" ? item.diseaseNameHi : item.diseaseName,
        response: language === "hi" ? item.summaryHi : item.summary,
        timestamp: new Date(item.timestamp),
        cropType: (item.cropType.toLowerCase() || 'general') as any,
        type: 'scan'
      })),
      ...chatHistory.map(item => ({
        id: item.id,
        query: item.query,
        response: item.response,
        timestamp: new Date(item.timestamp),
        cropType: 'general' as const,
        type: 'chat'
      }))
    ].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    const recentQueries = allItems.slice(0, 3);

    if (isChatMode) {
      // DM-style chat interface
      return (
        <div className="flex flex-col h-full bg-background pb-24">
          {/* Chat Header with mute and exit */}
          <header className="relative z-50 flex items-center justify-between px-5 py-4 bg-white/80 backdrop-blur-xl border-b border-border/50 shadow-sm">
            <button onClick={exitChat} className="w-10 h-10 flex items-center justify-center rounded-xl bg-white/80 border border-border/50 shadow-sm hover:bg-muted transition-all active:scale-95">
              <X size={18} className="text-muted-foreground" />
            </button>

            <div className="flex items-center gap-2">
              <img src="/logo.svg" alt="AgroTalk" className="w-8 h-8 rounded-full" />
              <h1 className="text-headline font-bold text-primary">
                AgroTalk
              </h1>
            </div>

            {/* Voice Model Selector */}
            <div className="relative mx-2" ref={voiceMenuRef}>
              <button
                onClick={() => setShowVoiceMenu(!showVoiceMenu)}
                className={cn(
                  "flex items-center gap-1.5 px-3 h-10 rounded-xl border shadow-sm transition-all active:scale-95",
                  showVoiceMenu
                    ? "bg-primary/10 border-primary/30 text-primary"
                    : "bg-white/80 border-border/50 hover:bg-muted hover:border-primary/30"
                )}
              >
                <Volume2 size={14} className={showVoiceMenu ? "text-primary" : "text-primary"} />
                <span className={cn("text-xs font-medium capitalize", showVoiceMenu ? "text-primary" : "text-foreground")}>
                  {selectedVoice}
                </span>
                <ChevronDown size={14} className={cn("text-muted-foreground transition-transform duration-200", showVoiceMenu && "rotate-180 text-primary")} />
              </button>

              {showVoiceMenu && (
                <div className="absolute right-0 top-full mt-2 z-50 w-48 bg-white rounded-xl border border-border/50 shadow-xl py-1 animate-in fade-in zoom-in-95 duration-200">
                  <div className="px-3 py-2 border-b border-border/30 bg-muted/30">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/80">
                      {language === 'hi' ? 'आवाज़ चुनें' : 'Select Voice'}
                    </span>
                  </div>
                  <div className="p-1">
                    {voiceOptions.map((voice) => (
                      <button
                        key={voice.id}
                        onClick={() => {
                          setSelectedVoice(voice.id);
                          localStorage.setItem("agrovoice_voice", voice.id);
                          setShowVoiceMenu(false);
                        }}
                        className={cn(
                          "w-full px-3 py-2.5 text-left text-sm flex items-center gap-2.5 rounded-lg transition-colors",
                          selectedVoice === voice.id
                            ? "bg-primary/10 text-primary font-medium"
                            : "text-foreground/80 hover:bg-muted"
                        )}
                      >
                        <div className={cn(
                          "w-2 h-2 rounded-full ring-2 ring-offset-1",
                          selectedVoice === voice.id ? "bg-primary ring-primary/30" : "bg-border ring-transparent"
                        )} />
                        {voice.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={() => setIsMuted(!isMuted)}
              className={cn(
                "w-10 h-10 flex items-center justify-center rounded-xl transition-all active:scale-95",
                isMuted ? "bg-destructive/10 border border-destructive/30 text-destructive" : "bg-primary/10 border border-primary/30 text-primary"
              )}
            >
              {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
            </button>
          </header>

          {/* Chat Messages */}
          <ScrollArea ref={chatContainerRef} className="flex-1 overflow-y-auto">
            <div className="px-4 py-6 space-y-4 max-w-2xl mx-auto">
              {chatMessages.map((msg, index) => (
                <div
                  key={msg.id}
                  className={cn("animate-fade-in", msg.role === 'user' ? "flex justify-end" : "flex justify-start")}
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  {msg.role === 'user' ? (
                    <div className="max-w-[85%] group">
                      <div className="bg-primary text-white px-5 py-3.5 rounded-2xl rounded-br-md shadow-lg">
                        <p className="text-body leading-relaxed">{msg.content}</p>
                      </div>
                      <div className="flex items-center justify-end gap-2 mt-1.5 px-1">
                        <User className="w-3 h-3 text-muted-foreground/50" />
                        <span className="text-[10px] text-muted-foreground/70">
                          {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="max-w-[90%] group">
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 w-9 h-9 rounded-full bg-white flex items-center justify-center border border-border/50 shadow-sm overflow-hidden p-1">
                          <img src="/logo.svg" alt="AgroTalk" className="w-full h-full object-cover" />
                        </div>
                        <div className="flex-1 min-w-0">
                          {msg.condition && (
                            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 mb-2 rounded-full bg-primary/10 border border-primary/20">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-primary">{msg.condition}</span>
                            </div>
                          )}
                          <div className="relative bg-white rounded-2xl rounded-tl-md shadow-sm border border-border/50 overflow-hidden">
                            <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-primary/50 via-primary to-primary/50" />
                            <div className="px-5 py-4">
                              <div className="prose prose-sm text-foreground max-w-none leading-relaxed">
                                <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                              </div>
                            </div>
                            <div className="flex items-center justify-between px-4 py-2.5 bg-muted/30 border-t border-border/30">
                              <span className="text-[10px] text-muted-foreground">
                                {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                              <button
                                onClick={() => handlePlayMessage(msg.id, msg.content)}
                                disabled={isMuted}
                                className={cn(
                                  "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all active:scale-95",
                                  currentPlayingId === msg.id && isPlaying
                                    ? "bg-primary text-white shadow-md"
                                    : "bg-white text-primary border border-primary/30 hover:bg-primary/10",
                                  isMuted && "opacity-50 cursor-not-allowed"
                                )}
                              >
                                {currentPlayingId === msg.id && isPlaying ? <><Pause className="w-3 h-3" /><span>Stop</span></> : <><Play className="w-3 h-3" /><span>Listen</span></>}
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {isProcessing && (
                <div className="flex justify-start animate-fade-in">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-9 h-9 rounded-full bg-white flex items-center justify-center border border-border/50 shadow-sm overflow-hidden p-1 animate-pulse">
                      <img src="/logo.svg" alt="AgroTalk" className="w-full h-full object-cover" />
                    </div>
                    <div className="bg-white rounded-2xl rounded-tl-md shadow-sm border border-border/50 px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex gap-1.5">
                          <div className="w-2.5 h-2.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                          <div className="w-2.5 h-2.5 bg-primary/70 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                          <div className="w-2.5 h-2.5 bg-primary/50 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                        </div>
                        <span className="text-sm text-muted-foreground font-medium">{tVoice.thinking}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Chat Input */}
          <div className="border-t border-border/50 bg-white/80 backdrop-blur-xl p-3 pb-4">
            <div className="max-w-2xl mx-auto flex items-center gap-3">
              <button
                onClick={handleMicClick}
                className={cn(
                  "w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-all active:scale-95",
                  isRecording
                    ? "bg-red-500 text-white animate-pulse"
                    : "bg-primary text-white shadow-green"
                )}
              >
                <Mic size={24} />
              </button>
              <form onSubmit={handleTextSubmit} className="flex-1 flex gap-2">
                <div className="relative flex-1">
                  <input
                    type="text"
                    value={textInput}
                    onChange={(e) => setTextInput(e.target.value)}
                    placeholder={getPlaceholderText()}
                    className={cn(
                      "w-full h-14 pl-5 pr-14 rounded-full",
                      "bg-white border-2 border-border",
                      "text-body placeholder:text-muted-foreground/60",
                      "focus:outline-none focus:border-primary/50 focus:ring-4 focus:ring-primary/10",
                      "transition-all duration-200 shadow-apple-sm",
                      "disabled:opacity-50 disabled:cursor-not-allowed"
                    )}
                    disabled={isProcessing}
                  />
                  {textInput.trim() && (
                    <button
                      type="submit"
                      disabled={isProcessing}
                      className={cn(
                        "absolute right-2 top-1/2 -translate-y-1/2",
                        "w-10 h-10 rounded-full",
                        "bg-[#76b900] text-white",
                        "flex items-center justify-center",
                        "hover:bg-[#5da600]",
                        "active:scale-95 transition-all duration-200",
                        "disabled:opacity-50 disabled:cursor-not-allowed"
                      )}
                    >
                      <ArrowRight size={20} strokeWidth={2.5} />
                    </button>
                  )}
                </div>
              </form>
            </div>
          </div>
        </div>
      );
    }

    // Default home screen with input box
    return (
      <div className="flex flex-col flex-1 pb-32 bg-background">
        <header className="px-5 pt-8 pb-4 max-w-lg mx-auto w-full">
          <div className="flex items-center justify-between mb-8">
            <ConnectionStatus isOnline={isOnline} />
            <LanguageSelector selectedLanguage={language} onLanguageChange={setLanguage} />
          </div>

          {/* Hero Section with Logo */}
          <div className="text-center mb-8">
            <div className="mb-4 flex justify-center">
              <img src="/logo.svg" alt="AgroTalk" className="w-32 h-32" />
            </div>
            <h1 className="text-title-lg font-bold text-foreground">{t.greeting}</h1>
            <p className="text-body text-muted-foreground mt-2">{t.greetingSubtext}</p>
          </div>

          <WeatherDashboard
            data={weatherData}
            loading={isWeatherLoading}
            error={weatherError}
            language={language}
          />
        </header>

        {/* Chat Input Box */}
        <div className="px-5 py-6 max-w-lg mx-auto w-full">
          <form onSubmit={handleTextSubmit} className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleMicClick}
              className={cn(
                "w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-all active:scale-95",
                isRecording
                  ? "bg-red-500 text-white animate-pulse"
                  : "bg-primary text-white shadow-green"
              )}
            >
              <Mic size={24} />
            </button>
            <div className="relative flex-1">
              <input
                type="text"
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                placeholder={getPlaceholderText()}
                className="w-full h-14 pl-5 pr-14 rounded-full bg-card border-2 border-border shadow-apple-sm text-body focus:outline-none focus:border-primary/50 focus:ring-4 focus:ring-primary/10 transition-all"
              />
              {textInput.trim() && (
                <button
                  type="submit"
                  className={cn(
                    "absolute right-2 top-1/2 -translate-y-1/2",
                    "w-10 h-10 rounded-full",
                    "bg-[#76b900] text-white",
                    "flex items-center justify-center",
                    "hover:bg-[#5da600]",
                    "active:scale-95 transition-all duration-200",
                    "disabled:opacity-50 disabled:cursor-not-allowed"
                  )}
                >
                  <ArrowRight size={20} strokeWidth={2.5} />
                </button>
              )}
            </div>
          </form>
          <p className="text-center text-muted-foreground mt-4 text-subhead">{t.tapToSpeak}</p>

          {/* Camera Button */}
          <button
            onClick={() => setIsImageOpen(true)}
            className="mt-6 w-full inline-flex items-center justify-center gap-3 px-6 py-4 rounded-full bg-card border border-border shadow-apple-sm hover:shadow-apple hover:-translate-y-0.5 transition-all active:scale-95"
          >
            <Camera size={22} className="text-primary" />
            <span className="font-semibold text-foreground">{t.scanCrop}</span>
          </button>
        </div>

        {/* Recent Queries */}
        <section className="px-5 mt-4 max-w-lg mx-auto w-full">
          <h2 className="text-headline font-bold text-foreground mb-4">{t.recentQueries}</h2>
          <div className="space-y-3">
            {recentQueries.length > 0 ? (
              recentQueries.map((item) => (
                <RecentQueryCard
                  key={item.id}
                  id={item.id}
                  query={item.query}
                  response={item.response}
                  timestamp={item.timestamp}
                  cropType={item.cropType}
                  onPlay={() => { }}
                  isPlaying={false}
                />
              ))
            ) : (
              <div className="p-8 text-center bg-muted/50 rounded-apple border border-dashed border-border">
                <p className="text-subhead text-muted-foreground">No recent queries yet</p>
              </div>
            )}
          </div>
        </section>
      </div>
    );
  };

  const handleShareToChat = (analysis: any) => {
    setIsImageOpen(false);
    setIsChatMode(true);

    // Create a context summary for the AI
    const contextText = language === "hi"
      ? `विषय: ${analysis.cropTypeHi}\nरोग: ${analysis.diseaseNameHi}\nलक्षण: ${analysis.symptomsHi?.join(", ")}\nउपचार: ${analysis.treatmentHi?.join(", ")}`
      : `Subject: ${analysis.cropType}\nCondition: ${analysis.diseaseName}\nSymptoms: ${analysis.symptoms?.join(", ")}\nTreatment: ${analysis.treatment_steps?.join(", ")}`;

    const introMsg = language === "hi"
      ? `मैंने अपनी ${analysis.cropTypeHi} की जांच साझा की है। मुझे इसके बारे में कुछ पूछना है।`
      : `I've shared my analysis for ${analysis.cropType}. I have some questions about it.`;

    // Add the analysis as a system-like context message and the user intro
    const newMessages: ChatMessage[] = [
      {
        id: `context_${Date.now()}`,
        role: 'assistant',
        content: `**Analysis Context Shared:**\n\n${contextText}`,
        timestamp: new Date(),
        condition: analysis.severity
      },
      {
        id: `user_intro_${Date.now() + 1}`,
        role: 'user',
        content: introMsg,
        timestamp: new Date()
      }
    ];

    setChatMessages(prev => [...prev, ...newMessages]);

    // Update conversation history for LLM context
    setConversationHistory(prev => [
      ...prev,
      { role: 'assistant' as const, content: `CONTEXT: User shared a ${analysis.cropType} analysis showing ${analysis.diseaseName}. Severity: ${analysis.severity}. Details: ${analysis.description}` },
      { role: 'user' as const, content: introMsg }
    ].slice(-10));

    toast.success(language === "hi" ? "चैट में विश्लेषण जोड़ा गया" : "Analysis added to chat context");
  };

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      {!isOnline && <OfflineBanner language={language} />}

      <main className={cn("flex-1 flex flex-col", !isOnline ? "pt-14" : "", isChatMode && activeTab === "home" ? "h-screen" : "")}>
        {activeTab === "home" && renderHomeScreen()}
        {activeTab === "library" && (
          <LibraryScreen language={language} weatherData={weatherData} isWeatherLoading={isWeatherLoading} />
        )}
        {activeTab === "settings" && (
          <SettingsScreen language={language} onLanguageChange={setLanguage} voiceSpeed={voiceSpeed} onVoiceSpeedChange={setVoiceSpeed} />
        )}
        {activeTab === "market" && (
          <MarketPriceScreen language={language} />
        )}
      </main>

      {!isChatMode && <BottomNavigation activeTab={activeTab} onTabChange={handleTabChange} />}

      <ImageAnalysis
        isOpen={isImageOpen}
        onClose={() => { setIsImageOpen(false); refreshLibrary(); }}
        language={language}
        onShareChat={handleShareToChat}
      />
    </div>
  );
}
