import { Check, Trash2, HelpCircle, Info, Volume2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "./ui/button";

interface SettingsScreenProps {
  language: string;
  onLanguageChange: (code: string) => void;
  voiceSpeed: "slow" | "normal" | "fast";
  onVoiceSpeedChange: (speed: "slow" | "normal" | "fast") => void;
}

const languages = [
  { code: "en", name: "English", nativeName: "English", flag: "🇬🇧" },
  { code: "hi", name: "Hindi", nativeName: "हिन्दी", flag: "🇮🇳" },
  { code: "ta", name: "Tamil", nativeName: "தமிழ்", flag: "🇮🇳" },
  { code: "te", name: "Telugu", nativeName: "తెలుగు", flag: "🇮🇳" },
  { code: "mr", name: "Marathi", nativeName: "मराठी", flag: "🇮🇳" },
];

const translations = {
  en: {
    settings: "Settings",
    language: "Language",
    voiceSpeed: "Voice Speed",
    slow: "Slow",
    normal: "Normal",
    fast: "Fast",
    clearCache: "Clear Cache",
    clearCacheDesc: "Remove saved advice and offline data",
    help: "Help & Support",
    about: "About AgroVoice",
    version: "Version 1.0.0",
  },
  hi: {
    settings: "सेटिंग्स",
    language: "भाषा",
    voiceSpeed: "आवाज की गति",
    slow: "धीमी",
    normal: "सामान्य",
    fast: "तेज़",
    clearCache: "कैश साफ़ करें",
    clearCacheDesc: "सहेजी गई सलाह और ऑफ़लाइन डेटा हटाएं",
    help: "सहायता",
    about: "AgroVoice के बारे में",
    version: "संस्करण 1.0.0",
  },
};

export function SettingsScreen({
  language,
  onLanguageChange,
  voiceSpeed,
  onVoiceSpeedChange,
}: SettingsScreenProps) {
  const t = translations[language as keyof typeof translations] || translations.en;

  return (
    <div className="px-4 py-6 pb-28 animate-fade-in">
      {/* Header */}
      <h1 className="text-2xl font-bold text-foreground mb-6">{t.settings}</h1>

      {/* Language Selection */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold mb-3">{t.language}</h2>
        <div className="space-y-2">
          {languages.map((lang) => (
            <button
              key={lang.code}
              onClick={() => onLanguageChange(lang.code)}
              className={cn(
                "w-full flex items-center gap-4 px-4 py-4 rounded-xl border transition-colors",
                "focus:outline-none focus:ring-2 focus:ring-primary/30",
                language === lang.code
                  ? "border-primary bg-primary/5"
                  : "border-border bg-card hover:bg-muted"
              )}
            >
              <span className="text-3xl">{lang.flag}</span>
              <div className="flex-1 text-left">
                <p className="font-medium">{lang.nativeName}</p>
                <p className="text-sm text-muted-foreground">{lang.name}</p>
              </div>
              {language === lang.code && (
                <Check size={24} className="text-primary" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Voice Speed */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
          <Volume2 size={20} />
          {t.voiceSpeed}
        </h2>
        <div className="flex gap-2">
          {(["slow", "normal", "fast"] as const).map((speed) => (
            <button
              key={speed}
              onClick={() => onVoiceSpeedChange(speed)}
              className={cn(
                "flex-1 py-4 rounded-xl font-medium transition-colors",
                "focus:outline-none focus:ring-2 focus:ring-primary/30",
                voiceSpeed === speed
                  ? "bg-primary text-primary-foreground"
                  : "bg-card border border-border hover:bg-muted"
              )}
            >
              {t[speed]}
            </button>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="space-y-3">
        <Button
          variant="outline"
          className="w-full h-16 justify-start gap-4 text-destructive hover:text-destructive"
        >
          <Trash2 size={24} />
          <div className="text-left">
            <p className="font-medium">{t.clearCache}</p>
            <p className="text-sm text-muted-foreground">{t.clearCacheDesc}</p>
          </div>
        </Button>

        <Button
          variant="outline"
          className="w-full h-16 justify-start gap-4"
        >
          <HelpCircle size={24} />
          <span>{t.help}</span>
        </Button>

        <Button
          variant="outline"
          className="w-full h-16 justify-start gap-4"
        >
          <Info size={24} />
          <div className="text-left">
            <p className="font-medium">{t.about}</p>
            <p className="text-sm text-muted-foreground">{t.version}</p>
          </div>
        </Button>
      </div>
    </div>
  );
}
