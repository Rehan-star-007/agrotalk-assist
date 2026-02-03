import { Mic, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface MicrophoneButtonProps {
  isRecording: boolean;
  isProcessing: boolean;
  onClick: () => void;
  size?: "default" | "large";
}

export function MicrophoneButton({
  isRecording,
  isProcessing,
  onClick,
  size = "large",
}: MicrophoneButtonProps) {
  const sizeClasses = size === "large" ? "w-20 h-20" : "w-16 h-16";
  const iconSize = size === "large" ? 32 : 24;

  return (
    <div className="relative flex items-center justify-center">
      {/* Outer pulse ring - idle state */}
      {!isRecording && !isProcessing && (
        <>
          <div
            className={cn(
              "absolute rounded-full bg-primary/20 animate-pulse-glow",
              size === "large" ? "w-24 h-24" : "w-20 h-20"
            )}
          />
          <div
            className={cn(
              "absolute rounded-full bg-primary/10 animate-pulse-glow",
              size === "large" ? "w-32 h-32" : "w-28 h-28"
            )}
            style={{ animationDelay: "0.5s" }}
          />
        </>
      )}
      
      {/* Recording pulse ring - red */}
      {isRecording && (
        <div
          className={cn(
            "absolute rounded-full border-4 border-destructive animate-ripple",
            size === "large" ? "w-24 h-24" : "w-20 h-20"
          )}
        />
      )}
      
      {/* Main button */}
      <button
        onClick={onClick}
        disabled={isProcessing}
        className={cn(
          "relative z-10 flex items-center justify-center rounded-full transition-all duration-200",
          "bg-gradient-to-br from-primary to-primary/90 text-primary-foreground",
          "shadow-green hover:shadow-green-lg",
          "hover:scale-105 active:scale-95",
          "focus:outline-none focus:ring-4 focus:ring-primary/30",
          "disabled:opacity-70 disabled:cursor-not-allowed",
          sizeClasses,
          isRecording && "bg-gradient-to-br from-destructive to-destructive/90 shadow-none"
        )}
        aria-label={isRecording ? "Stop recording" : "Start recording"}
      >
        {isProcessing ? (
          <Loader2 size={iconSize} className="animate-spin-smooth" />
        ) : (
          <Mic size={iconSize} className={cn(isRecording && "animate-pulse")} />
        )}
      </button>
    </div>
  );
}
