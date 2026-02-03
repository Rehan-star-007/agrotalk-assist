import { useState, useEffect } from "react";
import { Camera, Leaf } from "lucide-react";
import { MicrophoneButton } from "@/components/MicrophoneButton";
import { ConnectionStatus } from "@/components/ConnectionStatus";
import { LanguageSelector } from "@/components/LanguageSelector";
import { RecentQueryCard } from "@/components/RecentQueryCard";
import { BottomNavigation } from "@/components/BottomNavigation";
import { VoiceInteraction } from "@/components/VoiceInteraction";
import { ImageAnalysis } from "@/components/ImageAnalysis";
import { LibraryScreen } from "@/components/LibraryScreen";
import { SettingsScreen } from "@/components/SettingsScreen";
import { OfflineBanner } from "@/components/OfflineBanner";

// Demo data for recent queries
const demoQueries = [
  {
    id: "1",
    query: "Why are my wheat leaves turning yellow?",
    queryHi: "मेरे गेहूं की पत्तियां पीली क्यों हो रही हैं?",
    response: "Yellow leaves may indicate nitrogen deficiency. Apply nitrogen-rich fertilizer and ensure proper irrigation.",
    responseHi: "पीली पत्तियां नाइट्रोजन की कमी का संकेत हो सकती हैं। नाइट्रोजन युक्त खाद डालें।",
    timestamp: new Date(Date.now() - 1800000),
    cropType: "wheat" as const,
  },
  {
    id: "2",
    query: "Best time to water rice crops?",
    queryHi: "धान की फसल को पानी देने का सबसे अच्छा समय?",
    response: "Water rice early morning or evening to minimize evaporation. Maintain 5cm standing water during tillering.",
    responseHi: "सुबह जल्दी या शाम को पानी दें। कल्ले फूटने के दौरान 5cm पानी बनाए रखें।",
    timestamp: new Date(Date.now() - 7200000),
    cropType: "rice" as const,
  },
  {
    id: "3",
    query: "How to prepare soil for next season?",
    queryHi: "अगले मौसम के लिए मिट्टी कैसे तैयार करें?",
    response: "Add organic compost, test pH levels, and let the field rest for 2 weeks before planting.",
    responseHi: "जैविक खाद डालें, pH स्तर जांचें, और बुवाई से पहले 2 सप्ताह खेत को आराम दें।",
    timestamp: new Date(Date.now() - 86400000),
    cropType: "general" as const,
  },
];

const translations = {
  en: {
    greeting: "Hello, Farmer!",
    greetingSubtext: "How can I help you today?",
    recentQueries: "Recent Queries",
    tapToSpeak: "Tap to ask a question",
    scanCrop: "Scan Crop",
  },
  hi: {
    greeting: "नमस्ते, किसान!",
    greetingSubtext: "आज मैं आपकी कैसे मदद कर सकता हूँ?",
    recentQueries: "हाल के प्रश्न",
    tapToSpeak: "सवाल पूछने के लिए टैप करें",
    scanCrop: "फसल स्कैन करें",
  },
};

type NavTab = "home" | "analyze" | "library" | "settings";

export default function Index() {
  const [activeTab, setActiveTab] = useState<NavTab>("home");
  const [language, setLanguage] = useState("en");
  const [voiceSpeed, setVoiceSpeed] = useState<"slow" | "normal" | "fast">("normal");
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isVoiceOpen, setIsVoiceOpen] = useState(false);
  const [isImageOpen, setIsImageOpen] = useState(false);
  const [playingId, setPlayingId] = useState<string | null>(null);

  const t = translations[language as keyof typeof translations] || translations.en;

  // Monitor online status
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

  // Handle tab changes including analyze
  const handleTabChange = (tab: NavTab) => {
    if (tab === "analyze") {
      setIsImageOpen(true);
    } else {
      setActiveTab(tab);
    }
  };

  const handlePlayQuery = (id: string) => {
    setPlayingId(playingId === id ? null : id);
  };

  // Home Screen Content
  const renderHomeScreen = () => (
    <div className="min-h-screen pb-28 bg-background">
      {/* Header */}
      <header className="px-5 pt-6 pb-4">
        <div className="flex items-center justify-between mb-8">
          <ConnectionStatus isOnline={isOnline} />
          <LanguageSelector
            selectedLanguage={language}
            onLanguageChange={setLanguage}
          />
        </div>
        
        {/* Hero Section */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-wash mb-4">
            <Leaf className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-title-lg font-bold text-foreground">{t.greeting}</h1>
          <p className="text-body text-muted-foreground mt-2">{t.greetingSubtext}</p>
        </div>
      </header>

      {/* Main Microphone Button */}
      <div className="flex flex-col items-center justify-center py-6">
        <MicrophoneButton
          isRecording={false}
          isProcessing={false}
          onClick={() => setIsVoiceOpen(true)}
          size="large"
        />
        <p className="text-muted-foreground mt-6 text-subhead font-medium">{t.tapToSpeak}</p>
        
        {/* Camera Button */}
        <button
          onClick={() => setIsImageOpen(true)}
          className="mt-6 inline-flex items-center gap-3 px-6 py-3 rounded-full bg-card border border-border shadow-apple-sm hover:shadow-apple hover:-translate-y-0.5 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary/30 active:scale-95"
          aria-label={t.scanCrop}
        >
          <Camera size={22} className="text-primary" />
          <span className="font-semibold text-foreground">{t.scanCrop}</span>
        </button>
      </div>

      {/* Recent Queries */}
      <section className="px-5 mt-8">
        <h2 className="text-headline font-bold text-foreground mb-4">{t.recentQueries}</h2>
        <div className="space-y-3">
          {demoQueries.map((query) => (
            <RecentQueryCard
              key={query.id}
              id={query.id}
              query={language === "hi" ? query.queryHi : query.query}
              response={language === "hi" ? query.responseHi : query.response}
              timestamp={query.timestamp}
              cropType={query.cropType}
              onPlay={handlePlayQuery}
              isPlaying={playingId === query.id}
            />
          ))}
        </div>
      </section>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Offline Banner */}
      {!isOnline && <OfflineBanner language={language} />}
      
      {/* Main Content */}
      <main className={!isOnline ? "pt-14" : ""}>
        {activeTab === "home" && renderHomeScreen()}
        {activeTab === "library" && <LibraryScreen language={language} />}
        {activeTab === "settings" && (
          <SettingsScreen
            language={language}
            onLanguageChange={setLanguage}
            voiceSpeed={voiceSpeed}
            onVoiceSpeedChange={setVoiceSpeed}
          />
        )}
      </main>

      {/* Bottom Navigation */}
      <BottomNavigation activeTab={activeTab} onTabChange={handleTabChange} />

      {/* Voice Interaction Modal */}
      <VoiceInteraction
        isOpen={isVoiceOpen}
        onClose={() => setIsVoiceOpen(false)}
        language={language}
      />

      {/* Image Analysis Modal */}
      <ImageAnalysis
        isOpen={isImageOpen}
        onClose={() => setIsImageOpen(false)}
        language={language}
      />
    </div>
  );
}
