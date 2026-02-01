import { Mic, BookOpen, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

type NavTab = "home" | "library" | "settings";

interface BottomNavigationProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
}

export function BottomNavigation({ activeTab, onTabChange }: BottomNavigationProps) {
  const tabs: { id: NavTab; icon: typeof Mic; label: string }[] = [
    { id: "home", icon: Mic, label: "Home" },
    { id: "library", icon: BookOpen, label: "Library" },
    { id: "settings", icon: Settings, label: "Settings" },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border card-shadow">
      <div className="flex justify-around items-center h-20 max-w-lg mx-auto px-4">
        {tabs.map(({ id, icon: Icon, label }) => (
          <button
            key={id}
            onClick={() => onTabChange(id)}
            className={cn(
              "flex flex-col items-center justify-center gap-1 p-3 rounded-xl min-w-[80px] transition-all",
              "focus:outline-none focus:ring-2 focus:ring-primary/30",
              activeTab === id
                ? "text-primary bg-primary/10"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
            )}
            aria-label={label}
            aria-current={activeTab === id ? "page" : undefined}
          >
            <Icon size={28} strokeWidth={activeTab === id ? 2.5 : 2} />
            <span className="text-sm font-medium">{label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
}
