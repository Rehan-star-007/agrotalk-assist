import { Mic } from "lucide-react";
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
  const sizeClasses = size === "large" 
    ? "w-32 h-32" 
    : "w-20 h-20";
  
  const iconSize = size === "large" ? 48 : 32;

  return (
    <div className="relative flex items-center justify-center">
      {/* Outer pulse ring */}
      <div
        className={cn(
          "absolute rounded-full bg-primary/20",
          sizeClasses,
          isRecording && "animate-pulse-ring-active",
          !isRecording && !isProcessing && "animate-pulse-ring"
        )}
      />
      
      {/* Second pulse ring (delayed) */}
      <div
        className={cn(
          "absolute rounded-full bg-primary/10",
          size === "large" ? "w-40 h-40" : "w-28 h-28",
          isRecording && "animate-pulse-ring-active",
          !isRecording && !isProcessing && "animate-pulse-ring",
          "animation-delay-150"
        )}
        style={{ animationDelay: "0.5s" }}
      />
      
      {/* Main button */}
      <button
        onClick={onClick}
        disabled={isProcessing}
        className={cn(
          "relative z-10 flex items-center justify-center rounded-full transition-all duration-200",
          "bg-primary text-primary-foreground btn-shadow",
          "hover:scale-105 active:scale-95",
          "focus:outline-none focus:ring-4 focus:ring-primary/30",
          "disabled:opacity-70 disabled:cursor-not-allowed",
          sizeClasses,
          isRecording && "bg-destructive"
        )}
        aria-label={isRecording ? "Stop recording" : "Start recording"}
      >
        {isProcessing ? (
          <div className="animate-sprout">
            <svg
              width={iconSize}
              height={iconSize}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 22v-7" />
              <path d="M9 12h6" />
              <path d="M12 12V8" />
              <path d="M9 8c0-2 1.5-4 3-4s3 2 3 4" />
              <path d="M7 15c-1 1-2 3-2 5h14c0-2-1-4-2-5" />
            </svg>
          </div>
        ) : (
          <Mic size={iconSize} />
        )}
      </button>
    </div>
  );
}
