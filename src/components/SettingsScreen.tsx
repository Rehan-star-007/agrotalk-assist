import { Check, Trash2, HelpCircle, Info, Volume2, ChevronRight, Globe, Zap, Cloud, Database, Star, FileText } from "lucide-react";
import { cn } from "@/lib/utils";

interface SettingsScreenProps {
  language: string;
  onLanguageChange: (code: string) => void;
  voiceSpeed: "slow" | "normal" | "fast";
  onVoiceSpeedChange: (speed: "slow" | "normal" | "fast") => void;
}

const languages = [
  { code: "en", name: "English", nativeName: "English", flag: "🇬🇧" },
  { code: "hi", name: "Hindi", nativeName: "हिन्दी", flag: "🇮🇳" },
];

const translations = {
  en: {
    settings: "Settings",
    preferences: "Preferences",
    language: "Language",
    voiceSpeed: "Voice Speed",
    slow: "Slow",
    normal: "Normal",
    fast: "Fast",
    dataPrivacy: "Data & Privacy",
    offlineMode: "Offline Mode",
    offlineDesc: "Use cached data when disconnected",
    autoSave: "Auto-Save Results",
    autoSaveDesc: "Automatically save all analysis results",
    storage: "Storage Used",
    clearHistory: "Clear All History",
    aboutSupport: "About & Support",
    version: "Version",
    help: "Help Center",
    terms: "Terms & Privacy Policy",
    rate: "Rate Agrotalk Assist",
  },
  hi: {
    settings: "सेटिंग्स",
    preferences: "प्राथमिकताएं",
    language: "भाषा",
    voiceSpeed: "आवाज की गति",
    slow: "धीमी",
    normal: "सामान्य",
    fast: "तेज़",
    dataPrivacy: "डेटा और गोपनीयता",
    offlineMode: "ऑफ़लाइन मोड",
    offlineDesc: "डिस्कनेक्ट होने पर कैश्ड डेटा का उपयोग करें",
    autoSave: "स्वत: सहेजें",
    autoSaveDesc: "सभी विश्लेषण परिणाम स्वचालित रूप से सहेजें",
    storage: "उपयोग किया गया स्टोरेज",
    clearHistory: "सभी इतिहास साफ़ करें",
    aboutSupport: "जानकारी और सहायता",
    version: "संस्करण",
    help: "सहायता केंद्र",
    terms: "नियम और गोपनीयता नीति",
    rate: "ऐप को रेट करें",
  },
};

// iOS-style Toggle Switch component
function ToggleSwitch({ enabled, onToggle }: { enabled: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      className={cn(
        "relative w-[51px] h-[31px] rounded-full transition-colors duration-200",
        "focus:outline-none focus:ring-2 focus:ring-primary/30 active:scale-95",
        enabled ? "bg-primary" : "bg-muted-foreground/30"
      )}
      role="switch"
      aria-checked={enabled}
    >
      <div
        className={cn(
          "absolute top-[2px] w-[27px] h-[27px] rounded-full bg-white shadow-sm transition-transform duration-200",
          enabled ? "translate-x-[22px]" : "translate-x-[2px]"
        )}
      />
    </button>
  );
}

export function SettingsScreen({
  language,
  onLanguageChange,
  voiceSpeed,
  onVoiceSpeedChange,
}: SettingsScreenProps) {
  const t = translations[language as keyof typeof translations] || translations.en;

  return (
    <div className="flex flex-col flex-1 bg-muted pb-28 animate-fade-in">
      {/* Header */}
      <div className="px-5 pt-6 pb-4 bg-background border-b border-border">
        <h1 className="text-title-lg font-bold text-foreground">{t.settings}</h1>
      </div>

      <div className="px-5 py-6 space-y-8 max-w-lg mx-auto">
        {/* Preferences Section */}
        <section>
          <h2 className="text-caption font-bold uppercase tracking-widest text-muted-foreground mb-3 px-1">
            {t.preferences}
          </h2>
          <div className="bg-card rounded-apple border border-border shadow-apple-sm overflow-hidden">
            {/* Language */}
            <div className="flex items-center justify-between p-4 border-b border-border">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Globe size={18} className="text-primary" />
                </div>
                <span className="text-body font-medium text-foreground">{t.language}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-subhead text-muted-foreground">
                  {languages.find(l => l.code === language)?.nativeName}
                </span>
                <ChevronRight size={18} className="text-muted-foreground" />
              </div>
            </div>

            {/* Language Selection */}
            <div className="p-4 bg-muted/50 border-b border-border space-y-2">
              {languages.map((lang) => (
                <button
                  key={lang.code}
                  onClick={() => onLanguageChange(lang.code)}
                  className={cn(
                    "w-full flex items-center gap-3 px-4 py-3 rounded-apple transition-all active:scale-[0.98]",
                    language === lang.code
                      ? "bg-primary/10 border border-primary/30"
                      : "bg-card border border-transparent hover:bg-muted"
                  )}
                >
                  <span className="text-2xl">{lang.flag}</span>
                  <div className="flex-1 text-left">
                    <p className="font-medium text-foreground">{lang.nativeName}</p>
                    <p className="text-caption text-muted-foreground">{lang.name}</p>
                  </div>
                  {language === lang.code && (
                    <Check size={20} className="text-primary" />
                  )}
                </button>
              ))}
            </div>

            {/* Voice Speed */}
            <div className="p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Volume2 size={18} className="text-primary" />
                </div>
                <span className="text-body font-medium text-foreground">{t.voiceSpeed}</span>
              </div>
              <div className="flex gap-2">
                {(["slow", "normal", "fast"] as const).map((speed) => (
                  <button
                    key={speed}
                    onClick={() => onVoiceSpeedChange(speed)}
                    className={cn(
                      "flex-1 py-3 rounded-apple font-semibold transition-all active:scale-[0.98]",
                      voiceSpeed === speed
                        ? "bg-primary text-primary-foreground shadow-green"
                        : "bg-muted text-muted-foreground hover:bg-muted/80"
                    )}
                  >
                    {t[speed]}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Data & Privacy Section */}
        <section>
          <h2 className="text-caption font-bold uppercase tracking-widest text-muted-foreground mb-3 px-1">
            {t.dataPrivacy}
          </h2>
          <div className="bg-card rounded-apple border border-border shadow-apple-sm overflow-hidden">
            {/* Offline Mode */}
            <div className="flex items-center justify-between p-4 border-b border-border">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Cloud size={18} className="text-primary" />
                </div>
                <div>
                  <p className="text-body font-medium text-foreground">{t.offlineMode}</p>
                  <p className="text-caption text-muted-foreground">{t.offlineDesc}</p>
                </div>
              </div>
              <ToggleSwitch enabled={false} onToggle={() => { }} />
            </div>

            {/* Auto-Save */}
            <div className="flex items-center justify-between p-4 border-b border-border">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Zap size={18} className="text-primary" />
                </div>
                <div>
                  <p className="text-body font-medium text-foreground">{t.autoSave}</p>
                  <p className="text-caption text-muted-foreground">{t.autoSaveDesc}</p>
                </div>
              </div>
              <ToggleSwitch enabled={true} onToggle={() => { }} />
            </div>

            {/* Storage */}
            <div className="flex items-center justify-between p-4 border-b border-border">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Database size={18} className="text-primary" />
                </div>
                <span className="text-body font-medium text-foreground">{t.storage}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-subhead font-semibold text-foreground">12.4 MB</span>
                <ChevronRight size={18} className="text-muted-foreground" />
              </div>
            </div>

            {/* Clear History */}
            <button className="w-full p-4 text-center text-body font-semibold text-destructive hover:bg-destructive/5 transition-colors active:scale-[0.98]">
              {t.clearHistory}
            </button>
          </div>
        </section>

        {/* About & Support Section */}
        <section>
          <h2 className="text-caption font-bold uppercase tracking-widest text-muted-foreground mb-3 px-1">
            {t.aboutSupport}
          </h2>
          <div className="bg-card rounded-apple border border-border shadow-apple-sm overflow-hidden">
            {/* Version */}
            <div className="flex items-center justify-between p-4 border-b border-border">
              <span className="text-body text-muted-foreground">{t.version}</span>
              <span className="text-body font-semibold text-foreground">2.1.0</span>
            </div>

            {/* Help */}
            <button className="w-full flex items-center justify-between p-4 border-b border-border hover:bg-muted/50 transition-colors active:scale-[0.98]">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <HelpCircle size={18} className="text-primary" />
                </div>
                <span className="text-body font-medium text-foreground">{t.help}</span>
              </div>
              <ChevronRight size={18} className="text-muted-foreground" />
            </button>

            {/* Terms */}
            <button className="w-full flex items-center justify-between p-4 border-b border-border hover:bg-muted/50 transition-colors active:scale-[0.98]">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <FileText size={18} className="text-primary" />
                </div>
                <span className="text-body font-medium text-foreground">{t.terms}</span>
              </div>
              <ChevronRight size={18} className="text-muted-foreground" />
            </button>

            {/* Rate */}
            <button className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors active:scale-[0.98]">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Star size={18} className="text-primary" />
                </div>
                <span className="text-body font-medium text-primary">{t.rate}</span>
              </div>
              <ChevronRight size={18} className="text-muted-foreground" />
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
