import { useState } from "react";
import { Search, X, CheckCircle, Clock, ChevronRight, Camera, Leaf, AlertCircle, Play, Cloud, Droplets } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "./ui/button";

interface LibraryScreenProps {
  language: string;
}

const translations = {
  en: {
    title: "Analysis History",
    subtitle: "analyses performed",
    search: "Search by crop, disease, or date...",
    filters: {
      all: "All",
      healthy: "Healthy",
      diseased: "Diseased",
      thisWeek: "This Week",
    },
    stats: {
      total: "Total Scans",
      diseases: "Issues Found",
      healthy: "Healthy",
    },
    empty: {
      title: "No analyses yet",
      description: "Capture your first plant image to start tracking its health",
      cta: "Start Your First Analysis",
    },
    viewDetails: "View Details",
    ago: "ago",
    today: "Today",
    yesterday: "Yesterday",
    days: "days",
    weather: "Today's Weather",
    partlyCloudy: "Partly Cloudy",
  },
  hi: {
    title: "विश्लेषण इतिहास",
    subtitle: "विश्लेषण किए गए",
    search: "फसल, रोग या तारीख से खोजें...",
    filters: {
      all: "सभी",
      healthy: "स्वस्थ",
      diseased: "रोगग्रस्त",
      thisWeek: "इस सप्ताह",
    },
    stats: {
      total: "कुल स्कैन",
      diseases: "समस्याएं मिलीं",
      healthy: "स्वस्थ",
    },
    empty: {
      title: "अभी तक कोई विश्लेषण नहीं",
      description: "पौधों के स्वास्थ्य की निगरानी शुरू करने के लिए पहली छवि कैप्चर करें",
      cta: "पहला विश्लेषण शुरू करें",
    },
    viewDetails: "विवरण देखें",
    ago: "पहले",
    today: "आज",
    yesterday: "कल",
    days: "दिन",
    weather: "आज का मौसम",
    partlyCloudy: "आंशिक बादल",
  },
};

// Demo data
const demoAnalyses = [
  {
    id: "1",
    diseaseName: "Wheat Leaf Rust",
    diseaseNameHi: "गेहूं पत्ती जंग",
    cropType: "Wheat",
    cropTypeHi: "गेहूं",
    confidence: 92,
    severity: "high" as const,
    timestamp: new Date(Date.now() - 86400000 * 2),
    thumbnail: "https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=400&h=300&fit=crop",
    summary: "Orange-brown pustules detected on leaves, immediate treatment recommended",
    summaryHi: "पत्तियों पर नारंगी-भूरे रंग के दाने पाए गए, तुरंत उपचार की सिफारिश",
  },
  {
    id: "2",
    diseaseName: "Healthy Tomato Plant",
    diseaseNameHi: "स्वस्थ टमाटर का पौधा",
    cropType: "Tomato",
    cropTypeHi: "टमाटर",
    confidence: 98,
    severity: "low" as const,
    timestamp: new Date(Date.now() - 86400000 * 5),
    thumbnail: "https://images.unsplash.com/photo-1592841200221-a6898f307baa?w=400&h=300&fit=crop",
    summary: "No signs of disease or pest damage detected",
    summaryHi: "कोई रोग या कीट क्षति के संकेत नहीं मिले",
  },
  {
    id: "3",
    diseaseName: "Rice Blast",
    diseaseNameHi: "धान का झुलसा रोग",
    cropType: "Rice",
    cropTypeHi: "धान",
    confidence: 87,
    severity: "medium" as const,
    timestamp: new Date(Date.now() - 86400000 * 7),
    thumbnail: "https://images.unsplash.com/photo-1536304993881-ff6e9eefa2a6?w=400&h=300&fit=crop",
    summary: "Lesions with gray centers detected on leaves",
    summaryHi: "पत्तियों पर भूरे केंद्र वाले धब्बे पाए गए",
  },
];

type FilterType = "all" | "healthy" | "diseased" | "thisWeek";

export function LibraryScreen({ language }: LibraryScreenProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<FilterType>("all");
  
  const t = translations[language as keyof typeof translations] || translations.en;
  const isHindi = language === "hi";

  const formatTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / 86400000);
    
    if (days === 0) return t.today;
    if (days === 1) return t.yesterday;
    return `${days} ${t.days} ${t.ago}`;
  };

  const filters: { id: FilterType; label: string }[] = [
    { id: "all", label: t.filters.all },
    { id: "healthy", label: t.filters.healthy },
    { id: "diseased", label: t.filters.diseased },
    { id: "thisWeek", label: t.filters.thisWeek },
  ];

  const showEmpty = demoAnalyses.length === 0;

  return (
    <div className="min-h-screen bg-muted pb-28 animate-fade-in">
      {/* Header */}
      <div className="px-5 pt-6 pb-4 bg-background border-b border-border">
        <div className="flex items-center gap-2 mb-1">
          <Leaf className="w-6 h-6 text-primary" />
          <h1 className="text-title-lg font-bold text-foreground">{t.title}</h1>
        </div>
        <p className="text-subhead text-muted-foreground">
          {demoAnalyses.length} {t.subtitle}
        </p>
      </div>

      <div className="px-5 py-4 space-y-4">
        {/* Weather Card */}
        <div className="bg-gradient-to-br from-primary to-primary/80 rounded-apple-lg p-5 text-primary-foreground shadow-green">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-subhead opacity-80">{t.weather}</p>
              <p className="text-display font-bold mt-1">28°C</p>
              <p className="text-subhead opacity-80 mt-1">{t.partlyCloudy}</p>
            </div>
            <div className="flex flex-col items-end gap-2">
              <Cloud size={48} className="opacity-90" />
              <div className="flex items-center gap-1 text-subhead opacity-80">
                <Droplets size={16} />
                <span>65%</span>
              </div>
            </div>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <input
            type="text"
            placeholder={t.search}
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
            <p className="text-caption text-muted-foreground">{t.stats.total}</p>
            <p className="text-headline font-bold text-foreground">{demoAnalyses.length}</p>
          </div>
          <div className="p-3 bg-card rounded-apple border border-border text-center">
            <AlertCircle className="w-5 h-5 text-destructive mx-auto mb-1" />
            <p className="text-caption text-muted-foreground">{t.stats.diseases}</p>
            <p className="text-headline font-bold text-foreground">2</p>
          </div>
          <div className="p-3 bg-card rounded-apple border border-border text-center">
            <CheckCircle className="w-5 h-5 text-primary mx-auto mb-1" />
            <p className="text-caption text-muted-foreground">{t.stats.healthy}</p>
            <p className="text-headline font-bold text-foreground">1</p>
          </div>
        </div>

        {/* Empty State */}
        {showEmpty ? (
          <div className="flex flex-col items-center justify-center py-16 px-8 text-center">
            <div className="w-32 h-32 rounded-full bg-green-wash flex items-center justify-center mb-6">
              <Leaf className="w-16 h-16 text-primary/50" />
            </div>
            <h3 className="text-title font-bold text-foreground mb-2">{t.empty.title}</h3>
            <p className="text-body text-muted-foreground mb-6 max-w-xs">{t.empty.description}</p>
            <Button className="h-12 px-8 rounded-apple bg-primary hover:bg-primary/90 shadow-green">
              <Camera className="mr-2 h-5 w-5" />
              {t.empty.cta}
            </Button>
          </div>
        ) : (
          /* Analysis Cards Grid */
          <div className="space-y-3 pt-2">
            {demoAnalyses.map((analysis) => (
              <div
                key={analysis.id}
                className="bg-card rounded-apple-lg border border-border shadow-apple-sm hover:shadow-apple hover:-translate-y-0.5 transition-all duration-200 overflow-hidden"
              >
                {/* Thumbnail */}
                <div className="relative aspect-[16/9]">
                  <img 
                    src={analysis.thumbnail} 
                    alt={isHindi ? analysis.diseaseNameHi : analysis.diseaseName}
                    className="w-full h-full object-cover"
                  />
                  {/* Status Badge */}
                  <div className={cn(
                    "absolute top-3 right-3 px-3 py-1.5 rounded-full text-caption font-bold flex items-center gap-1.5",
                    "glass",
                    analysis.severity === "high" ? "text-destructive" : "text-primary"
                  )}>
                    <span className={cn(
                      "w-1.5 h-1.5 rounded-full",
                      analysis.severity === "high" ? "bg-destructive" : "bg-primary"
                    )} />
                    {analysis.severity === "high" ? (isHindi ? "समस्या" : "Issue") : (isHindi ? "स्वस्थ" : "Healthy")}
                  </div>
                  {/* Date Badge */}
                  <div className="absolute bottom-3 left-3 px-3 py-1.5 rounded-full text-caption font-medium flex items-center gap-1.5 glass text-muted-foreground">
                    <Clock size={12} />
                    {formatTime(analysis.timestamp)}
                  </div>
                  {/* Play Button */}
                  <button className="absolute bottom-3 right-3 w-10 h-10 rounded-full bg-primary/90 text-primary-foreground flex items-center justify-center shadow-green hover:bg-primary transition-colors active:scale-95">
                    <Play size={18} className="ml-0.5" />
                  </button>
                </div>

                {/* Content */}
                <div className="p-4">
                  <h3 className="text-headline font-bold text-foreground line-clamp-1">
                    {isHindi ? analysis.diseaseNameHi : analysis.diseaseName}
                  </h3>
                  
                  {/* Confidence */}
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-subhead font-semibold text-primary">{analysis.confidence}% Confident</span>
                    <div className="w-16 h-1 bg-muted rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-primary rounded-full" 
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
                    <span className="px-3 py-1 bg-green-wash text-primary rounded-full text-caption font-semibold">
                      {isHindi ? analysis.cropTypeHi : analysis.cropType}
                    </span>
                    <button className="flex items-center gap-1 text-subhead font-semibold text-primary hover:underline">
                      {t.viewDetails}
                      <ChevronRight size={16} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
