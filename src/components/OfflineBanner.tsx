import { WifiOff, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

interface OfflineBannerProps {
  language: string;
}

export function OfflineBanner({ language }: OfflineBannerProps) {
  const message = language === "hi" 
    ? "कोई इंटरनेट नहीं - सहेजी गई सलाह उपयोग कर रहे हैं"
    : "No internet - Using saved advice";

  const buttonText = language === "hi" ? "पुनः प्रयास करें" : "Retry";

  return (
    <div className="fixed top-0 left-0 right-0 z-40 bg-offline text-offline-foreground px-4 py-3">
      <div className="flex items-center justify-between max-w-lg mx-auto">
        <div className="flex items-center gap-2">
          <WifiOff size={20} />
          <span className="text-sm font-medium">{message}</span>
        </div>
        <button
          className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-white/20 hover:bg-white/30 transition-colors text-sm"
          onClick={() => window.location.reload()}
        >
          <RefreshCw size={14} />
          {buttonText}
        </button>
      </div>
    </div>
  );
}
