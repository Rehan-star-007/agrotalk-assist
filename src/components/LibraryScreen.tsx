import { Play, Wheat, Leaf, Sun, Cloud, Droplets } from "lucide-react";
import { cn } from "@/lib/utils";

interface LibraryScreenProps {
  language: string;
}

interface SavedTip {
  id: string;
  title: string;
  titleHi: string;
  preview: string;
  previewHi: string;
  cropType: "wheat" | "rice" | "general";
  savedAt: Date;
}

const savedTips: SavedTip[] = [
  {
    id: "1",
    title: "Wheat Irrigation Tips",
    titleHi: "गेहूं सिंचाई सुझाव",
    preview: "Water your wheat crop early morning for best absorption...",
    previewHi: "सुबह जल्दी पानी देने से अच्छी सोखत होती है...",
    cropType: "wheat",
    savedAt: new Date(Date.now() - 86400000),
  },
  {
    id: "2",
    title: "Rice Pest Control",
    titleHi: "धान कीट नियंत्रण",
    preview: "Natural methods to protect your rice crop from pests...",
    previewHi: "कीटों से धान की फसल की रक्षा के प्राकृतिक तरीके...",
    cropType: "rice",
    savedAt: new Date(Date.now() - 172800000),
  },
  {
    id: "3",
    title: "Weather Alert: Monsoon",
    titleHi: "मौसम चेतावनी: मानसून",
    preview: "Prepare your fields for upcoming heavy rains...",
    previewHi: "आने वाली भारी बारिश के लिए खेत तैयार करें...",
    cropType: "general",
    savedAt: new Date(Date.now() - 259200000),
  },
  {
    id: "4",
    title: "Soil Health Tips",
    titleHi: "मिट्टी स्वास्थ्य सुझाव",
    preview: "Improve your soil quality with these organic methods...",
    previewHi: "इन जैविक तरीकों से मिट्टी की गुणवत्ता सुधारें...",
    cropType: "general",
    savedAt: new Date(Date.now() - 345600000),
  },
  {
    id: "5",
    title: "Wheat Disease Prevention",
    titleHi: "गेहूं रोग रोकथाम",
    preview: "Early signs of rust and how to prevent spread...",
    previewHi: "जंग के शुरुआती लक्षण और फैलाव कैसे रोकें...",
    cropType: "wheat",
    savedAt: new Date(Date.now() - 432000000),
  },
];

const cropIcons = {
  wheat: Wheat,
  rice: Leaf,
  general: Sun,
};

export function LibraryScreen({ language }: LibraryScreenProps) {
  const formatDate = (date: Date) => {
    const days = Math.floor((Date.now() - date.getTime()) / 86400000);
    if (days === 0) return language === "hi" ? "आज" : "Today";
    if (days === 1) return language === "hi" ? "कल" : "Yesterday";
    return language === "hi" ? `${days} दिन पहले` : `${days} days ago`;
  };

  return (
    <div className="px-4 py-6 pb-28 animate-fade-in">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">
          {language === "hi" ? "सहेजी गई सलाह" : "Saved Advice"}
        </h1>
        <p className="text-muted-foreground mt-1">
          {language === "hi" 
            ? `${savedTips.length} आइटम सहेजे गए` 
            : `${savedTips.length} items saved`}
        </p>
      </div>

      {/* Weather Card */}
      <div className="bg-gradient-to-r from-primary to-secondary rounded-2xl p-5 mb-6 text-primary-foreground">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm opacity-80">
              {language === "hi" ? "आज का मौसम" : "Today's Weather"}
            </p>
            <p className="text-3xl font-bold mt-1">28°C</p>
            <p className="text-sm opacity-80 mt-1">
              {language === "hi" ? "आंशिक बादल" : "Partly Cloudy"}
            </p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <Cloud size={48} />
            <div className="flex items-center gap-1 text-sm">
              <Droplets size={16} />
              <span>65%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Saved Tips List */}
      <div className="space-y-3">
        {savedTips.map((tip) => {
          const CropIcon = cropIcons[tip.cropType];
          return (
            <div
              key={tip.id}
              className="bg-card rounded-xl border border-border p-4 card-shadow"
            >
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <CropIcon size={24} className="text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-foreground line-clamp-1">
                    {language === "hi" ? tip.titleHi : tip.title}
                  </p>
                  <p className="text-muted-foreground text-sm line-clamp-2 mt-1">
                    {language === "hi" ? tip.previewHi : tip.preview}
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">
                    {formatDate(tip.savedAt)}
                  </p>
                </div>
                <button
                  className="flex-shrink-0 w-12 h-12 rounded-full bg-secondary text-secondary-foreground flex items-center justify-center hover:bg-secondary/80 transition-colors"
                  aria-label="Play"
                >
                  <Play size={20} className="ml-0.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
