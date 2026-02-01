import { Play, Pause, Wheat, Leaf, Sun } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";

interface RecentQueryCardProps {
  id: string;
  query: string;
  response: string;
  timestamp: Date;
  cropType?: "wheat" | "rice" | "general";
  onPlay: (id: string) => void;
  isPlaying?: boolean;
}

const cropIcons = {
  wheat: Wheat,
  rice: Leaf,
  general: Sun,
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
  const CropIcon = cropIcons[cropType];

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
    <div className="bg-card rounded-xl border border-border p-4 card-shadow">
      <div className="flex items-start gap-3">
        {/* Crop Icon */}
        <div className="flex-shrink-0 w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
          <CropIcon size={24} className="text-primary" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-foreground line-clamp-1">{query}</p>
          <p className="text-muted-foreground text-sm line-clamp-2 mt-1">
            {response}
          </p>
          <p className="text-xs text-muted-foreground mt-2">
            {formatTime(timestamp)}
          </p>
        </div>

        {/* Play Button */}
        <button
          onClick={() => onPlay(id)}
          className={cn(
            "flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center transition-all",
            "focus:outline-none focus:ring-2 focus:ring-primary/30",
            isPlaying
              ? "bg-primary text-primary-foreground"
              : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
          )}
          aria-label={isPlaying ? "Pause" : "Play response"}
        >
          {isPlaying ? <Pause size={20} /> : <Play size={20} className="ml-0.5" />}
        </button>
      </div>
    </div>
  );
}
