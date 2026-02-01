import { Wifi, WifiOff } from "lucide-react";
import { cn } from "@/lib/utils";

interface ConnectionStatusProps {
  isOnline: boolean;
}

export function ConnectionStatus({ isOnline }: ConnectionStatusProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-colors",
        isOnline
          ? "bg-success/10 text-success"
          : "bg-offline/10 text-offline"
      )}
      role="status"
      aria-live="polite"
    >
      {isOnline ? (
        <>
          <Wifi size={18} />
          <span>Online</span>
        </>
      ) : (
        <>
          <WifiOff size={18} />
          <span>Offline</span>
        </>
      )}
    </div>
  );
}
