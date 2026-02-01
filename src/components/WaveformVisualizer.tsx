import { cn } from "@/lib/utils";

interface WaveformVisualizerProps {
  isActive: boolean;
  barCount?: number;
}

export function WaveformVisualizer({ isActive, barCount = 12 }: WaveformVisualizerProps) {
  return (
    <div className="flex items-center justify-center gap-1 h-24">
      {Array.from({ length: barCount }).map((_, i) => (
        <div
          key={i}
          className={cn(
            "w-2 rounded-full bg-primary transition-all",
            isActive ? "animate-waveform" : "h-4"
          )}
          style={{
            animationDelay: isActive ? `${i * 0.08}s` : undefined,
            height: isActive ? undefined : "16px",
          }}
        />
      ))}
    </div>
  );
}
