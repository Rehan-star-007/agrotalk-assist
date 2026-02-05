import { useState, useEffect } from "react";
import { Camera, Leaf } from "lucide-react";
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

  const t = getTranslation('home', language);

  const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

  const fetchWeather = async (lat: number, lon: number) => {
    try {
      setIsWeatherLoading(true);
      const response = await fetch(`${API_BASE_URL}/weather?lat=${lat}&lon=${lon}`);
      const result = await response.json();

      if (result.success) {
        console.log('Weather data fetched:', result.data);
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
        (position) => {
          fetchWeather(position.coords.latitude, position.coords.longitude);
        },
        () => {
          // Fallback to a default location (e.g., New Delhi)
          fetchWeather(28.6139, 77.2090);
        }
      );
    } else {
      setWeatherError('Geolocation not supported');
      setIsWeatherLoading(false);
    }
  }, []);

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

  // Move hooks to top level
  const { items: libraryItems, refresh: refreshLibrary } = useLibrary();
  const { history: chatHistory, fetchHistory: fetchChatHistory } = useChat();

  // Refresh chat history when tab becomes active
  useEffect(() => {
    if (activeTab === 'home') {
      fetchChatHistory();
    }
  }, [activeTab]);

  // Home Screen Content
  const renderHomeScreen = () => {
    // Combine and sort recent items
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

    return (
      <div className="flex flex-col flex-1 pb-32 bg-background">
        {/* Header content unchanged... */}
        <header className="px-5 pt-8 pb-4 max-w-lg mx-auto w-full">
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

          {/* Weather Dashboard */}
          <WeatherDashboard
            data={weatherData}
            loading={isWeatherLoading}
            error={weatherError}
            language={language}
          />
        </header>

        {/* Main Microphone Button */}
        <div className="flex flex-col items-center justify-center py-6 max-w-lg mx-auto w-full">
          <MicrophoneButton
            isRecording={false}
            isProcessing={false}
            onClick={() => setActiveTab("assistant")}
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
        <section className="px-5 mt-8 max-w-lg mx-auto w-full">
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
                  onPlay={handlePlayQuery}
                  isPlaying={playingId === item.id}
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

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      {/* Offline Banner */}
      {!isOnline && <OfflineBanner language={language} />}

      {/* Main Content */}
      <main className={cn(
        "flex-1 flex flex-col",
        !isOnline ? "pt-14" : ""
      )}>
        {activeTab === "home" && renderHomeScreen()}
        {activeTab === "assistant" && (
          <div className="animate-fade-in flex-1">
            <VoiceInteraction
              isOpen={true}
              onClose={() => setActiveTab("home")}
              language={language}
              isIntegrated={true}
              weatherContext={weatherData ? {
                temp: weatherData.current.temperature_2m,
                condition: weatherData.current.weather_code,
                humidity: weatherData.current.relative_humidity_2m
              } : undefined}
            />
          </div>
        )}
        {activeTab === "library" && (
          <LibraryScreen
            language={language}
            weatherData={weatherData}
            isWeatherLoading={isWeatherLoading}
          />
        )}
        {activeTab === "settings" && (
          <SettingsScreen
            language={language}
            onLanguageChange={setLanguage}
            voiceSpeed={voiceSpeed}
            onVoiceSpeedChange={setVoiceSpeed}
          />
        )}
        {activeTab === "market" && (
          <MarketPriceScreen language={language} />
        )}
      </main>


      {/* Bottom Navigation */}
      <BottomNavigation activeTab={activeTab} onTabChange={handleTabChange} />


      {/* Image Analysis Modal */}
      <ImageAnalysis
        isOpen={isImageOpen}
        onClose={() => {
          setIsImageOpen(false);
          refreshLibrary();
        }}
        language={language}
      />
    </div>
  );
}
