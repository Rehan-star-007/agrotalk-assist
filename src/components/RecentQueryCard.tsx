import { Play, Pause, Clock, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface RecentQueryCardProps {
  id: string;
  query: string;
  response: string;
  timestamp: Date;
  cropType?: "wheat" | "rice" | "potato" | "tomato" | "apple" | "leaf" | "general";
  onPlay: (id: string) => void;
  isPlaying?: boolean;
}

const cropEmojis = {
  wheat: "🌾",
  rice: "🌿",
  potato: "🥔",
  tomato: "🍅",
  apple: "🍎",
  leaf: "🍃",
  general: "🌱",
};

export function RecentQueryCard({
  id,
  query,
  response,
  timestamp,
  cropType = "general",
  onPlay,
  isPlaying = false,
}: RecentQueryCardProps) {
  const formatTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  return (
    <div
      className={cn(
        "group bg-card rounded-apple border border-border p-4",
        "shadow-apple-sm hover:shadow-apple hover:-translate-y-0.5",
        "transition-all duration-200 cursor-pointer",
        isPlaying && "border-primary/30 bg-green-wash"
      )}
    >
      <div className="flex items-start gap-3">
        {/* Crop Icon */}
        <div className="flex-shrink-0 w-12 h-12 rounded-full bg-green-wash flex items-center justify-center text-2xl">
          {cropEmojis[cropType]}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-foreground line-clamp-1 text-body">{query}</p>
          <p className="text-muted-foreground text-subhead line-clamp-2 mt-1">
            {response}
          </p>
          <div className="flex items-center gap-1 mt-2 text-caption text-muted-foreground">
            <Clock size={12} />
            <span>{formatTime(timestamp)}</span>
          </div>
        </div>

        {/* Play Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onPlay(id);
          }}
          className={cn(
            "flex-shrink-0 w-11 h-11 rounded-full flex items-center justify-center transition-all duration-200",
            "focus:outline-none focus:ring-2 focus:ring-primary/30",
            "active:scale-95",
            isPlaying
              ? "bg-primary text-primary-foreground shadow-green"
              : "bg-green-subtle text-primary hover:bg-primary hover:text-primary-foreground"
          )}
          aria-label={isPlaying ? "Pause" : "Play response"}
        >
          {isPlaying ? <Pause size={18} /> : <Play size={18} className="ml-0.5" />}
        </button>
      </div>
    </div>
  );
}
