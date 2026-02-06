import { useState, useEffect } from "react";
import { Search, X, CheckCircle, Clock, ChevronRight, Camera, Leaf, AlertCircle, Play, Cloud, Droplets, Trash2, Edit2, Sun, Moon, CloudRain, CloudSnow, Wind, Share2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "./ui/button";
import { useLibrary, LibraryItem } from "@/hooks/useLibrary";
import { toast } from "sonner";
import { getTranslation } from "@/lib/translations";

interface WeatherData {
  current: {
    temperature_2m: number;
    relative_humidity_2m: number;
    weather_code: number;
    wind_speed_10m: number;
  };
}

interface LibraryScreenProps {
  language: string;
  weatherData?: WeatherData | null;
  isWeatherLoading?: boolean;
  onShareChat?: (analysis: LibraryItem) => void;
}

const internalTranslations = {
  en: {
    title: "Analysis History",
    search: "Search by crop, disease, or date...",
    ago: "ago",
    today: "Today",
    yesterday: "Yesterday",
    days: "days",
    weather: "Today's Weather",
  },
  hi: {
    title: "विश्लेषण इतिहास",
    search: "फसल, रोग या तारीख से खोजें...",
    ago: "पहले",
    today: "आज",
    yesterday: "कल",
    days: "दिन",
    weather: "आज का मौसम",
  },
  ta: {
    title: "பகுப்பாய்வு வரலாறு",
    search: "பயிர், நோய் அல்லது தேதியால் தேடுங்கள்...",
    ago: "முன்",
    today: "இன்று",
    yesterday: "நேற்று",
    days: "நாட்கள்",
    weather: "இன்றைய வானிலை",
  },
  te: {
    title: "విశ్లేషణ చరిత్ర",
    search: "పంట, వ్యాధి లేదా తేదీ ద్వారా వెతకండి...",
    ago: "క్రితం",
    today: "ఈ రోజు",
    yesterday: "నిన్న",
    days: "రోజులు",
    weather: "ఈ రోజు వాతావరణం",
  },
  mr: {
    title: "विश्लेषण इतिहास",
    search: "पीक, रोग किंवा तारीख शोधा...",
    ago: "पूर्वी",
    today: "आज",
    yesterday: "काल",
    days: "दिवस",
    weather: "आजचे हवामान",
  },
};

type FilterType = "all" | "healthy" | "diseased" | "thisWeek";

const getWeatherLabel = (code: number, isHindi: boolean): string => {
  if (code === 0 || code === 1) return isHindi ? "साफ आसमान" : "Clear Sky";
  if (code === 2) return isHindi ? "आंशिक बादल" : "Partly Cloudy";
  if (code === 3) return isHindi ? "बादल" : "Cloudy";
  if (code >= 45 && code <= 48) return isHindi ? "कोहरा" : "Foggy";
  if (code >= 51 && code <= 67) return isHindi ? "बारिश" : "Rainy";
  if (code >= 71 && code <= 86) return isHindi ? "बर्फबारी" : "Snowy";
  if (code >= 95 && code <= 99) return isHindi ? "तूफान" : "Thunderstorm";
  return isHindi ? "मौसम" : "Weather";
};

const WeatherIcon: React.FC<{ code: number; isNight?: boolean }> = ({ code, isNight = false }) => {
  if (code === 0 || code === 1) {
    return isNight ?
      <Moon size={48} className="opacity-90 text-slate-200" /> :
      <Sun size={48} className="opacity-90 text-amber-400" />;
  }
  if (code === 2 || code === 3) return <Cloud size={48} className="opacity-90" />;
  if (code >= 51 && code <= 67) return <CloudRain size={48} className="opacity-90" />;
  if (code >= 71 && code <= 86) return <CloudSnow size={48} className="opacity-90" />;
  return <Cloud size={48} className="opacity-90" />;
};

export function LibraryScreen({ language, weatherData, isWeatherLoading, onShareChat }: LibraryScreenProps) {
  const { items, deleteItem, updateItem, isLoading } = useLibrary();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<FilterType>("all");
  const [selectedItem, setSelectedItem] = useState<LibraryItem | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDisease, setEditDisease] = useState("");
  const [editCrop, setEditCrop] = useState("");

  const tLib = getTranslation('library', language);
  const tCommon = getTranslation('common', language);
  const internalT = internalTranslations[language as keyof typeof internalTranslations] || internalTranslations.en;
  const isHindi = language === "hi";

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / 86400000);

    if (days === 0) return internalT.today;
    if (days === 1) return internalT.yesterday;
    return `${days} ${internalT.days} ${internalT.ago}`;
  };

  const filteredItems = items.filter(item => {
    const matchesSearch =
      item.diseaseName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.cropType.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.diseaseNameHi.includes(searchQuery) ||
      item.cropTypeHi.includes(searchQuery);

    if (!matchesSearch) return false;

    if (activeFilter === "healthy") return item.severity === "low";
    if (activeFilter === "diseased") return item.severity !== "low";
    if (activeFilter === "thisWeek") {
      const diff = Date.now() - new Date(item.timestamp).getTime();
      return diff < 86400000 * 7;
    }
    return true;
  });

  const stats = {
    total: items.length,
    diseases: items.filter(i => i.severity !== "low").length,
    healthy: items.filter(i => i.severity === "low").length,
  };

  const handleDelete = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (confirm(isHindi ? "क्या आप वाकई इसे हटाना चाहते हैं?" : "Are you sure you want to delete this?")) {
      deleteItem(id);
      toast.success(isHindi ? "हटाया गया" : "Analysis deleted");
    }
  };

  const startEdit = (item: LibraryItem, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setEditingId(item.id);
    setEditDisease(isHindi ? item.diseaseNameHi : item.diseaseName);
    setEditCrop(isHindi ? item.cropTypeHi : item.cropType);
  };

  const saveEdit = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (isHindi) {
      updateItem(id, { diseaseNameHi: editDisease, cropTypeHi: editCrop });
    } else {
      updateItem(id, { diseaseName: editDisease, cropType: editCrop });
    }
    setEditingId(null);
    toast.success(isHindi ? "अपडेट किया गया" : "Updated successfully");
  };

  const filters: { id: FilterType; label: string }[] = [
    { id: "all", label: tLib.filterAll },
    { id: "healthy", label: tLib.filterHealthy },
    { id: "diseased", label: tLib.filterDiseased },
    { id: "thisWeek", label: tLib.filterWeek },
  ];

  const showEmpty = items.length === 0;

  // Weather display values
  const temperature = weatherData?.current?.temperature_2m ?? null;
  const humidity = weatherData?.current?.relative_humidity_2m ?? null;
  const weatherCode = weatherData?.current?.weather_code ?? 2;
  const weatherLabel = getWeatherLabel(weatherCode, isHindi);

  // Day/Night logic matching Index.tsx / WeatherDashboard.tsx
  const currentHour = new Date().getHours();
  const isNight = currentHour >= 18 || currentHour < 6;

  return (
    <div className="flex flex-col flex-1 bg-muted pb-28 animate-fade-in">
      {/* Header */}
      <div className="px-5 pt-6 pb-4 bg-background border-b border-border">
        <div className="flex items-center gap-2 mb-1">
          <Leaf className="w-6 h-6 text-primary" />
          <h1 className="text-title-lg font-bold text-foreground">{tLib.title}</h1>
        </div>
        <p className="text-subhead text-muted-foreground">
          {items.length} {tLib.subtitle}
        </p>
      </div>

      <div className="px-5 py-4 space-y-4">
        {/* Weather Card - Real-time Data */}
        <div className="bg-gradient-to-br from-primary to-primary/80 rounded-apple-lg p-5 text-primary-foreground shadow-green">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-subhead opacity-80">{internalT.weather}</p>
              {isWeatherLoading ? (
                <p className="text-display font-bold mt-1 animate-pulse">{tCommon.loading}</p>
              ) : temperature !== null ? (
                <>
                  <p className="text-display font-bold mt-1">{Math.round(temperature)}°C</p>
                  <p className="text-subhead opacity-80 mt-1">{weatherLabel}</p>
                </>
              ) : (
                <p className="text-display font-bold mt-1">--°C</p>
              )}
            </div>
            <div className="flex flex-col items-end gap-2">
              {!isWeatherLoading && weatherData ? (
                <>
                  <WeatherIcon code={weatherCode} isNight={isNight} />
                  <div className="flex items-center gap-1 text-subhead opacity-80">
                    <Droplets size={16} />
                    <span>{humidity ?? '--'}%</span>
                  </div>
                </>
              ) : (
                <Cloud size={48} className="opacity-50 animate-pulse" />
              )}
            </div>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <input
            type="text"
            placeholder={tLib.searchPlaceholder}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={cn(
              "w-full h-12 pl-12 pr-10 rounded-apple bg-card border border-border",
              "text-body placeholder:text-muted-foreground",
              "focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary",
              "transition-all duration-200"
            )}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground hover:text-foreground"
            >
              <X size={18} />
            </button>
          )}
        </div>

        {/* Filters */}
        <div className="flex gap-2 overflow-x-auto pb-2 -mx-5 px-5 scrollbar-hide">
          {filters.map((filter) => (
            <button
              key={filter.id}
              onClick={() => setActiveFilter(filter.id)}
              className={cn(
                "flex items-center gap-1.5 px-4 py-2 rounded-full text-subhead font-semibold whitespace-nowrap transition-all active:scale-95",
                activeFilter === filter.id
                  ? "bg-primary text-primary-foreground shadow-green"
                  : "bg-card border border-border text-muted-foreground hover:text-foreground hover:border-primary/50"
              )}
            >
              {activeFilter === filter.id && <CheckCircle size={14} />}
              {filter.label}
            </button>
          ))}
        </div>

        {/* Stats Bar */}
        <div className="grid grid-cols-3 gap-3">
          <div className="p-3 bg-card rounded-apple border border-border text-center">
            <Leaf className="w-5 h-5 text-primary mx-auto mb-1" />
            <p className="text-caption text-muted-foreground">{tLib.totalScans}</p>
            <p className="text-headline font-bold text-foreground">{stats.total}</p>
          </div>
          <div className="p-3 bg-card rounded-apple border border-border text-center">
            <AlertCircle className="w-5 h-5 text-destructive mx-auto mb-1" />
            <p className="text-caption text-muted-foreground">{tLib.diseasesFound}</p>
            <p className="text-headline font-bold text-foreground">{stats.diseases}</p>
          </div>
          <div className="p-3 bg-card rounded-apple border border-border text-center">
            <CheckCircle className="w-5 h-5 text-primary mx-auto mb-1" />
            <p className="text-caption text-muted-foreground">{tLib.healthyPlants}</p>
            <p className="text-headline font-bold text-foreground">{stats.healthy}</p>
          </div>
        </div>

        {/* Empty State */}
        {showEmpty ? (
          <div className="flex flex-col items-center justify-center py-16 px-8 text-center">
            <div className="w-32 h-32 rounded-full bg-green-wash flex items-center justify-center mb-6">
              <Leaf className="w-16 h-16 text-primary/50" />
            </div>
            <h3 className="text-title font-bold text-foreground mb-2">{tLib.emptyTitle}</h3>
            <p className="text-body text-muted-foreground mb-6 max-w-xs">{tLib.emptySubtitle}</p>
            <Button className="h-12 px-8 rounded-apple bg-primary hover:bg-primary/90 shadow-green">
              <Camera className="mr-2 h-5 w-5" />
              {tLib.startFirst}
            </Button>
          </div>
        ) : (
          /* Analysis Cards Grid */
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6 gap-y-8 pt-4">
            {filteredItems.map((analysis) => (
              <div
                key={analysis.id}
                className="group relative h-full"
                onClick={() => setSelectedItem(analysis)}
              >
                <div className="flex flex-col h-full bg-card rounded-3xl border border-border shadow-apple-sm overflow-hidden hover:shadow-apple transition-all duration-300">
                  {/* Thumbnail with 4:3 aspect ratio */}
                  <div className="relative aspect-[4/3] overflow-hidden">
                    <img
                      src={analysis.thumbnail}
                      alt={isHindi ? analysis.diseaseNameHi : analysis.diseaseName}
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                    />
                    {/* Status Badge */}
                    <div className={cn(
                      "absolute top-3 right-3 px-3 py-1 rounded-full text-[11px] font-bold flex items-center gap-1.5",
                      "glass",
                      analysis.diseaseName.toLowerCase().includes('healthy') ? "text-primary" : "text-destructive"
                    )}>
                      {analysis.diseaseName.toLowerCase().includes('healthy') ? (isHindi ? "स्वस्थ" : "Healthy") : (isHindi ? "समस्या" : "Issue")}
                    </div>
                  </div>

                  {/* Content */}
                  <div className="p-4 flex flex-col flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-1.5">
                        <span className={cn(
                          "w-1.5 h-1.5 rounded-full",
                          analysis.diseaseName.toLowerCase() === 'healthy' ? "bg-primary" : "bg-destructive animate-pulse"
                        )} />
                        <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                          {isHindi ? analysis.cropTypeHi : analysis.cropType} • {formatTime(analysis.timestamp)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={(e) => startEdit(analysis, e)}
                          className="p-1 hover:text-primary transition-colors text-muted-foreground/40"
                        >
                          <Edit2 size={12} />
                        </button>
                        <button
                          onClick={(e) => handleDelete(analysis.id, e)}
                          className="p-1 hover:text-destructive transition-colors text-muted-foreground/40"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>

                    {editingId === analysis.id ? (
                      <div className="flex flex-col gap-2 mb-2 bg-muted/30 p-2 rounded-lg border border-primary/20" onClick={(e) => e.stopPropagation()}>
                        <div className="space-y-1">
                          <input
                            value={editCrop}
                            onChange={(e) => setEditCrop(e.target.value)}
                            className="w-full px-2 py-1.5 border rounded-md text-caption bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
                            placeholder={isHindi ? "फसल का नाम" : "Crop Name"}
                          />
                        </div>
                        <div className="space-y-1">
                          <input
                            value={editDisease}
                            onChange={(e) => setEditDisease(e.target.value)}
                            className="w-full px-2 py-1.5 border rounded-md text-headline bg-background font-bold focus:outline-none focus:ring-2 focus:ring-primary/50"
                            autoFocus
                            onKeyDown={(e) => e.key === 'Enter' && saveEdit(analysis.id)}
                            placeholder={isHindi ? "रोग का नाम" : "Disease Name"}
                          />
                        </div>
                        <div className="flex gap-1.5 mt-1">
                          <Button size="sm" className="flex-1 h-8 text-[10px] font-bold" onClick={(e) => saveEdit(analysis.id, e)}>
                            {isHindi ? "सहेजें" : "Save"}
                          </Button>
                          <Button size="sm" variant="ghost" className="flex-1 h-8 text-[10px]" onClick={(e) => { e.stopPropagation(); setEditingId(null); }}>
                            {isHindi ? "रद्द करें" : "Cancel"}
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <h3 className="text-headline font-bold text-foreground line-clamp-1">
                        {isHindi ? analysis.diseaseNameHi : analysis.diseaseName}
                      </h3>
                    )}

                    {/* Confidence */}
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-subhead font-semibold text-primary">{analysis.confidence}% Confident</span>
                      <div className="w-16 h-1 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full transition-all duration-1000"
                          style={{ width: `${analysis.confidence}%` }}
                        />
                      </div>
                    </div>

                    <div className="h-px bg-border my-3" />

                    <p className="text-subhead text-muted-foreground line-clamp-2">
                      {isHindi ? analysis.summaryHi : analysis.summary}
                    </p>

                    {/* Footer */}
                    <div className="flex items-center justify-between mt-3">
                      <button
                        onClick={() => setSelectedItem(analysis)}
                        className="flex items-center gap-1 text-subhead font-semibold text-primary hover:underline"
                      >
                        {tLib.viewDetails}
                        <ChevronRight size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

      </div>

      {/* Detail Modal */}
      {selectedItem && (
        <div className="fixed inset-0 z-[110] bg-background flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="p-4 flex items-center justify-between border-b bg-background/80 backdrop-blur-md sticky top-0 z-20">
            <Button variant="ghost" size="icon" onClick={() => setSelectedItem(null)} className="rounded-full">
              <X className="w-6 h-6" />
            </Button>
            <div className="text-center">
              <h2 className="text-headline font-bold text-foreground">{tLib.analysisDetails}</h2>
              <p className="text-caption text-muted-foreground">{isHindi ? selectedItem.cropTypeHi : selectedItem.cropType}</p>
            </div>
            <div className="w-10" /> {/* Spacer */}
          </div>

          <div className="flex-1 overflow-y-auto p-5 space-y-6 pb-20">
            <div className="relative w-full max-w-sm mx-auto aspect-square rounded-apple-xl overflow-hidden border-2 border-primary shadow-green">
              <img src={selectedItem.thumbnail} className="w-full h-full object-cover" alt="Scan" />
              <div className="absolute top-3 right-3 glass px-3 py-1 rounded-full text-[11px] font-bold text-primary">
                {selectedItem.confidence}% {tLib.confidence}
              </div>
            </div>

            <div className={cn(
              "p-4 rounded-apple-lg flex items-center gap-3",
              selectedItem.severity === "low" ? "bg-green-wash border border-primary/20" : "bg-destructive/10 border border-destructive/20"
            )}>
              {selectedItem.severity === "low" ? <CheckCircle className="text-primary" /> : <AlertCircle className="text-destructive" />}
              <div>
                <p className={cn("text-headline font-bold", selectedItem.severity === "low" ? "text-primary" : "text-destructive")}>
                  {isHindi ? selectedItem.diseaseNameHi : selectedItem.diseaseName}
                </p>
                <p className="text-caption text-muted-foreground uppercase tracking-widest">{selectedItem.severity === "low" ? tLib.healthy : tLib.issue} {tLib.severity}</p>
              </div>
            </div>

            <div className="space-y-4 text-body text-muted-foreground leading-relaxed">
              <div className="space-y-2">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-foreground">{tLib.description}</p>
                <p className="bg-muted/30 p-4 rounded-apple-lg border border-border">
                  {isHindi ? selectedItem.descriptionHi || selectedItem.summaryHi : selectedItem.description || selectedItem.summary}
                </p>
              </div>

              {(isHindi ? selectedItem.symptomsHi : selectedItem.symptoms) && (isHindi ? selectedItem.symptomsHi : selectedItem.symptoms)!.length > 0 && (
                <div className="space-y-2">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-foreground">{tLib.shareSymptoms}</p>
                  <div className="space-y-2">
                    {(isHindi ? selectedItem.symptomsHi : selectedItem.symptoms)!.map((s, i) => (
                      <div key={i} className="flex gap-3 items-start bg-card p-3 rounded-apple border border-border">
                        <span className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary shrink-0 mt-0.5">{i + 1}</span>
                        <p className="text-subhead">{s}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {(isHindi ? selectedItem.treatmentHi : selectedItem.treatment) && (isHindi ? selectedItem.treatmentHi : selectedItem.treatment)!.length > 0 && (
                <div className="space-y-2">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-foreground">{tLib.treatmentPlan}</p>
                  <div className="bg-slate-900 p-5 rounded-apple-xl space-y-4">
                    {(isHindi ? selectedItem.treatmentHi : selectedItem.treatment)!.map((t, i) => (
                      <div key={i} className="flex gap-3">
                        <span className="text-primary font-black mt-1">✓</span>
                        <p className="text-slate-200 text-subhead">{t}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1 h-14 rounded-apple-lg border-primary text-primary font-bold hover:bg-primary/5"
                onClick={() => {
                  if (onShareChat && selectedItem) {
                    onShareChat(selectedItem);
                    setSelectedItem(null);
                  }
                }}
              >
                <Share2 className="mr-2 h-5 w-5" />
                {tLib.shareToChat}
              </Button>
              <Button
                className="flex-1 h-14 rounded-apple-lg bg-primary text-white font-bold"
                onClick={() => setSelectedItem(null)}
              >
                {tLib.closeDetails}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
