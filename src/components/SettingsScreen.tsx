import { useState, useEffect } from "react";
import {
  Volume2, Globe, Moon, Sun, Trash2, Bell, ChevronRight,
  MapPin, Zap, HardDrive, RefreshCw, WifiOff, DownloadCloud
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useChat } from "@/hooks/useChat";
import { syncService } from "@/services/syncService";
import { toast } from "sonner";

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
    common: "Common",
    appearance: "Appearance",
    storage: "Storage & Data",
    language: "Language",
    voiceSpeed: "Voice Speed",
    darkMode: "Dark Mode",
    notifications: "Notifications",
    location: "My Location",
    locationDesc: "Used for weather alerts",
    dataSaver: "Data Saver Mode",
    dataSaverDesc: "Reduce image quality to save data",
    clearHistory: "Clear Chat History",
    clearCache: "Clear App Cache",
    clearConfirm: "Are you sure? This action cannot be undone.",
    version: "Version",
    slow: "Slow",
    normal: "Normal",
    fast: "Fast",
    cleared: "Cleared successfully",
    cacheSize: "14.2 MB used",
    detecting: "Detecting..."
  },
  hi: {
    settings: "सेटिंग्स",
    common: "सामान्य",
    appearance: "दिखावट",
    storage: "स्टोरेज और डेटा",
    language: "भाषा",
    voiceSpeed: "आवाज की गति",
    darkMode: "डार्क मोड",
    notifications: "सूचनाएं",
    location: "मेरा स्थान",
    locationDesc: "मौसम अलर्ट के लिए उपयोग किया जाता है",
    dataSaver: "डेटा सेवर मोड",
    dataSaverDesc: "डेटा बचाने के लिए इमेज क्वालिटी कम करें",
    clearHistory: "चैट इतिहास साफ़ करें",
    clearCache: "ऐप कैश साफ़ करें",
    clearConfirm: "क्या आप सुनिश्चित हैं?",
    version: "संस्करण",
    slow: "धीमी",
    normal: "सामान्य",
    fast: "तेज़",
    cleared: "सफलतापूर्वक साफ़ किया गया",
    cacheSize: "14.2 MB",
    detecting: "खोज रहा है..."
  },
  ta: { settings: "அமைப்புகள்", common: "பொது", appearance: "தோற்றம்", storage: "சேமிப்பு", language: "மொழி", voiceSpeed: "குரல் வேகம்", darkMode: "டார்க் பயன்முறை", notifications: "அறிவிப்புகள்", location: "இருப்பிடம்", locationDesc: "வானிலைக்காக", dataSaver: "தரவு சேமிப்பு", dataSaverDesc: "தரவைச் சேமிக்கவும்", clearHistory: "வரலாற்றை அழி", clearCache: "கேச் அழி", clearConfirm: "நிச்சயமாகவா?", version: "பதிப்பு", slow: "மெதுவான", normal: "சாதாரண", fast: "வேகமான", cleared: "அழிக்கப்பட்டது", cacheSize: "14.2 MB", detecting: "கண்டறிதல்..." },
  te: { settings: "సెట్టింగ్‌లు", common: "సాధారణ", appearance: "కனிபించు", storage: "నిల్వ", language: "భాష", voiceSpeed: "వాయిస్ వేగం", darkMode: "డార్క్ మోడ్", notifications: "నోటిnotificationలు", location: "స్థానం", locationDesc: "వాతావরণం కోసం", dataSaver: "డేటా సేవర్", dataSaverDesc: "డేటాను సేవ్ చేయండి", clearHistory: "చరిత్రను క్లిயர் చేయండి", clearCache: "కాష్ క్లియర్ చేయండి", clearConfirm: "ఖచ్చితంగా ఉన్నారా?", version: "వెర్షన్", slow: "నెమ్మదిగా", normal: "సాధారణ", fast: "వేగంగా", cleared: "క్లిயர் చేయబడింది", cacheSize: "14.2 MB", detecting: "గుర్తిస్తోంది..." },
  mr: { settings: "सेटिंग्ज", common: "सामान्य", appearance: "दिसणे", storage: "स्टोरेज", language: "भाषा", voiceSpeed: "आवाज वेग", darkMode: "डार्क मोड", notifications: "सूचना", location: "स्थान", locationDesc: "हवामानासाठी", dataSaver: "डेटा सेव्हर", dataSaverDesc: "डेटा वाचवा", clearHistory: "इतिहास साफ करा", clearCache: "कॅशे साफ करा", clearConfirm: "खात्री आहे का?", version: "आवृत्ती", slow: "हळू", normal: "सामान्य", fast: "वेगवान", cleared: "साफ केले", cacheSize: "14.2 MB", detecting: "शोधत आहे..." },
};

// Perfect Pill Structure Toggle Switch
function ToggleSwitch({ enabled, onToggle }: { enabled: boolean; onToggle: () => void }) {
  return (
    <div
      onClick={onToggle}
      className={cn(
        "relative w-14 h-7 flex items-center rounded-full p-1 cursor-pointer transition-colors duration-300",
        enabled ? "bg-[#76b900]" : "bg-zinc-300 dark:bg-zinc-700"
      )}
    >
      <div
        className={cn(
          "w-5 h-5 bg-white rounded-full shadow-md transition-all duration-300 ease-out",
          enabled ? "translate-x-7" : "translate-x-0"
        )}
      />
    </div>
  );
}

// Reusable Setting Row
function SettingRow({
  icon: Icon,
  title,
  subtitle,
  value,
  onClick,
  action
}: {
  icon?: any;
  title: string;
  subtitle?: string;
  value?: string;
  onClick?: () => void;
  action?: React.ReactNode;
}) {
  return (
    <div
      onClick={onClick}
      className={cn(
        "flex items-center justify-between p-4 min-h-[64px] transition-colors",
        onClick ? "cursor-pointer active:bg-muted/50" : ""
      )}
    >
      <div className="flex items-center gap-4 overflow-hidden">
        {Icon && (
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Icon size={20} className="text-primary" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-body font-medium text-foreground truncate">{title}</p>
          {subtitle && (
            <p className="text-caption text-muted-foreground truncate">{subtitle}</p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 pl-2">
        {value && (
          <span className="text-subhead text-muted-foreground">{value}</span>
        )}
        {action}
        {onClick && !action && (
          <ChevronRight size={18} className="text-muted-foreground/50" />
        )}
      </div>
    </div>
  );
}

export function SettingsScreen({
  language,
  onLanguageChange,
  voiceSpeed,
  onVoiceSpeedChange,
}: SettingsScreenProps) {
  const t = (translations[language as keyof typeof translations] || translations.en) as any;
  const { clearHistory } = useChat();

  const [isDarkMode, setIsDarkMode] = useState(() => {
    return localStorage.getItem("theme") === "dark" ||
      document.documentElement.classList.contains("dark");
  });

  const [notificationsEnabled, setNotificationsEnabled] = useState(() => {
    return localStorage.getItem("notifications") !== "false";
  });

  const [dataSaver, setDataSaver] = useState(() => {
    return localStorage.getItem("dataSaver") === "true";
  });

  const [forceOffline, setForceOffline] = useState(() => {
    return localStorage.getItem("agro_force_offline") === "true";
  });

  const [autoSave, setAutoSave] = useState(() => {
    // Default to true if not set, or check user pref
    return localStorage.getItem("agro_auto_save") !== "false";
  });

  const [locationName, setLocationName] = useState("Delhi, India");

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  }, [isDarkMode]);

  useEffect(() => {
    // Attempt to get nicer location name from cache if available?
    // For now we just mock or use geolocation
    navigator.geolocation?.getCurrentPosition((pos) => {
      // In a real app we'd reverse geocode here
      setLocationName(`${pos.coords.latitude.toFixed(2)}, ${pos.coords.longitude.toFixed(2)}`);
    });
  }, []);

  const [storageUsage, setStorageUsage] = useState<string>("");

  useEffect(() => {
    const fetchStorageObj = async () => {
      if (navigator.storage && navigator.storage.estimate) {
        try {
          const estimate = await navigator.storage.estimate();
          if (estimate.usage) {
            const mb = (estimate.usage / (1024 * 1024)).toFixed(1);
            setStorageUsage(`${mb} MB used`);
          }
        } catch (e) {
          console.error("Storage estimate failed", e);
        }
      }
    };
    fetchStorageObj();
  }, []);

  const handleToggleInternal = (
    val: boolean,
    setVal: (v: boolean) => void,
    key: string,
    message?: string
  ) => {
    const newVal = !val;
    setVal(newVal);
    localStorage.setItem(key, String(newVal));
    if (newVal && message) toast.success(message);
  };

  const handleClearHistory = async () => {
    if (window.confirm(t.clearConfirm)) {
      await clearHistory();
      toast.success(t.cleared);
    }
  };

  const handleClearCache = () => {
    if (window.confirm(t.clearConfirm)) {
      localStorage.removeItem("weather_cache");
      localStorage.removeItem("last_analysis");
      toast.success(t.cleared);
    }
  };

  const selectedLangName = languages.find(l => l.code === language)?.nativeName;

  return (
    <div className="flex flex-col flex-1 bg-muted/20 pb-28 animate-fade-in min-h-screen">
      {/* Header with improved styling */}
      <div className="px-6 pt-10 pb-6 bg-background/80 backdrop-blur-xl border-b border-border/50 sticky top-0 z-20">
        <h1 className="text-title-lg font-bold text-foreground tracking-tight">{t.settings}</h1>
      </div>

      <div className="px-5 py-6 space-y-8 max-w-lg mx-auto w-full">

        {/* COMMON SETTINGS */}
        <section>
          <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground/80 mb-3 px-2">
            {t.common}
          </h2>
          <div className="bg-card rounded-apple-lg border border-border/60 shadow-apple-sm overflow-hidden">

            {/* Language Selector */}
            <div className="relative">
              <SettingRow
                icon={Globe}
                title={t.language}
                value={selectedLangName}
              />
              <select
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                value={language}
                onChange={(e) => onLanguageChange(e.target.value)}
              >
                {languages.map(l => (
                  <option key={l.code} value={l.code}>{l.flag} {l.nativeName}</option>
                ))}
              </select>
            </div>

            <div className="w-full h-px bg-border/50" />

            {/* Location */}
            <SettingRow
              icon={MapPin}
              title={t.location}
              subtitle={locationName}
              action={<RefreshCw size={16} className="text-primary animate-pulse-glow" />}
              onClick={() => {
                setLocationName(t.detecting);
                setTimeout(() => {
                  navigator.geolocation?.getCurrentPosition(
                    (p) => {
                      setLocationName(`${p.coords.latitude.toFixed(1)}, ${p.coords.longitude.toFixed(1)}`);
                      toast.success("Location updated");
                    },
                    (e) => {
                      console.error(e);
                      setLocationName("Permission denied");
                      toast.error("Could not detect location");
                    }
                  );
                }, 1000);
              }}
            />

            <div className="w-full h-px bg-border/50" />

            {/* Voice Speed */}
            <div className="p-4">
              <div className="flex items-center gap-4 mb-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Volume2 size={20} className="text-primary" />
                </div>
                <span className="text-body font-medium text-foreground">{t.voiceSpeed}</span>
              </div>
              <div className="flex bg-muted rounded-xl p-1">
                {(["slow", "normal", "fast"] as const).map((speed) => (
                  <button
                    key={speed}
                    onClick={() => onVoiceSpeedChange(speed)}
                    className={cn(
                      "flex-1 py-1.5 rounded-lg text-subhead font-medium transition-all duration-200",
                      voiceSpeed === speed
                        ? "bg-white dark:bg-muted-foreground/20 text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {t[speed]}
                  </button>
                ))}
              </div>
            </div>

          </div>
        </section>

        {/* APPEARANCE */}
        <section>
          <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground/80 mb-3 px-2">
            {t.appearance}
          </h2>
          <div className="bg-card rounded-apple-lg border border-border/60 shadow-apple-sm overflow-hidden">

            <SettingRow
              icon={isDarkMode ? Moon : Sun}
              title={t.darkMode}
              action={
                <ToggleSwitch enabled={isDarkMode} onToggle={() => setIsDarkMode(!isDarkMode)} />
              }
            />

            <div className="w-full h-px bg-border/50" />

            <SettingRow
              icon={Bell}
              title={t.notifications}
              action={
                <ToggleSwitch
                  enabled={notificationsEnabled}
                  onToggle={() => handleToggleInternal(notificationsEnabled, setNotificationsEnabled, "notifications", "Notification settings saved")}
                />
              }
            />
          </div>
        </section>

        {/* STORAGE & DATA */}
        <section>
          <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground/80 mb-3 px-2">
            {t.storage || "Storage & Data"}
          </h2>
          <div className="bg-card rounded-apple-lg border border-border/60 shadow-apple-sm overflow-hidden">

            {/* Force Offline Mode */}
            <SettingRow
              icon={WifiOff}
              title={t.forceOffline || "Force Offline Mode"}
              subtitle={t.forceOfflineDesc || "Simulate offline behavior"}
              action={
                <ToggleSwitch
                  enabled={forceOffline}
                  onToggle={() => {
                    const newVal = !forceOffline;
                    setForceOffline(newVal);
                    localStorage.setItem('agro_force_offline', String(newVal));
                    // Trigger a reload or state update to apply immediately if needed
                    // For now, simpler to just set LS and let components react or require reload
                    toast.success(newVal ? "Offline Mode Enabled" : "Online Mode Restored");
                    // Dispatch event for instant update
                    window.dispatchEvent(new Event('offline-mode-change'));
                  }}
                />
              }
            />

            <div className="w-full h-px bg-border/50" />

            {/* Auto Save Data */}
            <SettingRow
              icon={DownloadCloud}
              title={t.autoSave || "Auto-Save Data"}
              subtitle={t.autoSaveDesc || "Sync data on app launch"}
              action={
                <ToggleSwitch
                  enabled={autoSave}
                  onToggle={() => handleToggleInternal(autoSave, setAutoSave, "agro_auto_save", "Auto-Save settings updated")}
                />
              }
            />

            <div className="w-full h-px bg-border/50" />

            {/* Manual Sync */}
            <SettingRow
              icon={RefreshCw}
              title={t.syncNow || "Sync Data Now"}
              subtitle={t.syncDesc || "Manually save local data"}
              onClick={async () => {
                toast.info("Syncing data...");
                await syncService.syncAll();
                toast.success("Data synced successfully");
              }}
            />

            <div className="w-full h-px bg-border/50" />

            <SettingRow
              icon={Zap}
              title={t.dataSaver}
              subtitle={t.dataSaverDesc}
              action={
                <ToggleSwitch
                  enabled={dataSaver}
                  onToggle={() => handleToggleInternal(dataSaver, setDataSaver, "dataSaver", "Data Saver updated")}
                />
              }
            />

            <div className="w-full h-px bg-border/50" />

            <SettingRow
              icon={HardDrive}
              title={t.clearCache}
              subtitle={storageUsage || t.cacheSize}
              onClick={handleClearCache}
            />

            <div className="w-full h-px bg-border/50" />

            <div
              onClick={handleClearHistory}
              className="flex items-center justify-between p-4 cursor-pointer active:bg-destructive/10 transition-colors group"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center group-hover:bg-destructive/20 transition-colors">
                  <Trash2 size={20} className="text-destructive" />
                </div>
                <div className="flex-col">
                  <p className="text-body font-medium text-destructive">{t.clearHistory}</p>
                </div>
              </div>
              <ChevronRight size={18} className="text-destructive/40" />
            </div>

          </div>
        </section>

        {/* Footer info */}
        <div className="flex flex-col items-center justify-center py-8 gap-3 opacity-60">
          <div className="w-12 h-12 rounded-2xl bg-white shadow-sm border border-border/50 flex items-center justify-center mb-1">
            <img src="/logo.svg" className="w-8 h-8 object-contain" alt="Logo" />
          </div>
          <div className="text-center">
            <p className="text-caption font-semibold text-foreground">Agrotalk Assist</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">{t.version} 2.1.0 (Beta)</p>
          </div>
        </div>

      </div>
    </div>
  );
}
