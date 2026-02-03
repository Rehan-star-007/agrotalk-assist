import { useState } from "react";
import { Search, X, CheckCircle, Clock, ChevronRight, Camera, Leaf, AlertCircle, Play, Cloud, Droplets, Trash2, Edit2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "./ui/button";
import { useLibrary, LibraryItem } from "@/hooks/useLibrary";
import { toast } from "sonner";

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

type FilterType = "all" | "healthy" | "diseased" | "thisWeek";

export function LibraryScreen({ language }: LibraryScreenProps) {
  const { items, deleteItem, updateItem } = useLibrary();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<FilterType>("all");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

  const t = translations[language as keyof typeof translations] || translations.en;
  const isHindi = language === "hi";

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / 86400000);

    if (days === 0) return t.today;
    if (days === 1) return t.yesterday;
    return `${days} ${t.days} ${t.ago}`;
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

  const handleDelete = (id: string) => {
    if (confirm(isHindi ? "क्या आप वाकई इसे हटाना चाहते हैं?" : "Are you sure you want to delete this?")) {
      deleteItem(id);
      toast.success(isHindi ? "हटाया गया" : "Analysis deleted");
    }
  };

  const startEdit = (item: LibraryItem) => {
    setEditingId(item.id);
    setEditValue(isHindi ? item.diseaseNameHi : item.diseaseName);
  };

  const saveEdit = (id: string) => {
    if (isHindi) {
      updateItem(id, { diseaseNameHi: editValue });
    } else {
      updateItem(id, { diseaseName: editValue });
    }
    setEditingId(null);
    toast.success(isHindi ? "अपडेट किया गया" : "Updated successfully");
  };

  const filters: { id: FilterType; label: string }[] = [
    { id: "all", label: t.filters.all },
    { id: "healthy", label: t.filters.healthy },
    { id: "diseased", label: t.filters.diseased },
    { id: "thisWeek", label: t.filters.thisWeek },
  ];

  const showEmpty = items.length === 0;


  return (
    <div className="flex flex-col flex-1 bg-muted pb-28 animate-fade-in">
      {/* Header */}
      <div className="px-5 pt-6 pb-4 bg-background border-b border-border">
        <div className="flex items-center gap-2 mb-1">
          <Leaf className="w-6 h-6 text-primary" />
          <h1 className="text-title-lg font-bold text-foreground">{t.title}</h1>
        </div>
        <p className="text-subhead text-muted-foreground">
          {items.length} {t.subtitle}
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
            <p className="text-headline font-bold text-foreground">{stats.total}</p>
          </div>
          <div className="p-3 bg-card rounded-apple border border-border text-center">
            <AlertCircle className="w-5 h-5 text-destructive mx-auto mb-1" />
            <p className="text-caption text-muted-foreground">{t.stats.diseases}</p>
            <p className="text-headline font-bold text-foreground">{stats.diseases}</p>
          </div>
          <div className="p-3 bg-card rounded-apple border border-border text-center">
            <CheckCircle className="w-5 h-5 text-primary mx-auto mb-1" />
            <p className="text-caption text-muted-foreground">{t.stats.healthy}</p>
            <p className="text-headline font-bold text-foreground">{stats.healthy}</p>
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
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 gap-y-8 pt-4">
            {filteredItems.map((analysis) => (
              <div
                key={analysis.id}
                className="group relative h-full"
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
                      analysis.severity === "high" ? "text-destructive" : "text-primary"
                    )}>
                      {analysis.severity === "high" ? (isHindi ? "समस्या" : "Issue") : (isHindi ? "स्वस्थ" : "Healthy")}
                    </div>
                  </div>

                  {/* Content */}
                  <div className="p-4 flex flex-col flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-1.5">
                        <span className={cn(
                          "w-1.5 h-1.5 rounded-full",
                          analysis.severity === "high" ? "bg-destructive animate-pulse" : "bg-primary"
                        )} />
                        <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                          {isHindi ? analysis.cropTypeHi : analysis.cropType} • {formatTime(analysis.timestamp)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => startEdit(analysis)}
                          className="p-1 hover:text-primary transition-colors text-muted-foreground/40"
                        >
                          <Edit2 size={12} />
                        </button>
                        <button
                          onClick={() => handleDelete(analysis.id)}
                          className="p-1 hover:text-destructive transition-colors text-muted-foreground/40"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>

                    {editingId === analysis.id ? (
                      <div className="flex gap-2 mb-2">
                        <input
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          className="flex-1 px-3 py-1 border rounded text-headline bg-muted focus:outline-none focus:ring-1 focus:ring-primary"
                          autoFocus
                          onKeyDown={(e) => e.key === 'Enter' && saveEdit(analysis.id)}
                          onBlur={() => setEditingId(null)}
                        />
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
                      <button className="flex items-center gap-1 text-subhead font-semibold text-primary hover:underline">
                        {t.viewDetails}
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
    </div>
  );
}
