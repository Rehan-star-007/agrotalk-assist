import { Home, Camera, BookOpen, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

type NavTab = "home" | "analyze" | "library" | "settings";

interface BottomNavigationProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
}

export function BottomNavigation({ activeTab, onTabChange }: BottomNavigationProps) {
  const tabs: { id: NavTab; icon: typeof Home; label: string }[] = [
    { id: "home", icon: Home, label: "Home" },
    { id: "analyze", icon: Camera, label: "Analyze" },
    { id: "library", icon: BookOpen, label: "Library" },
    { id: "settings", icon: Settings, label: "Settings" },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-apple border-t border-border shadow-nav">
      <div 
        className="flex justify-around items-center max-w-lg mx-auto"
        style={{ 
          height: "72px",
          paddingBottom: "env(safe-area-inset-bottom, 0px)" 
        }}
      >
        {tabs.map(({ id, icon: Icon, label }) => {
          const isActive = activeTab === id;
          const isAnalyze = id === "analyze";
          
          return (
            <button
              key={id}
              onClick={() => onTabChange(id)}
              className={cn(
                "relative flex flex-col items-center justify-center gap-1 px-4 py-2 transition-all duration-200",
                "focus:outline-none focus:ring-2 focus:ring-primary/30 rounded-xl",
                "active:scale-95",
                isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
              )}
              aria-label={label}
              aria-current={isActive ? "page" : undefined}
            >
              {/* Active indicator pill */}
              {isActive && (
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-6 h-1 rounded-full bg-primary animate-scale-in" />
              )}
              
              {/* Icon container - special treatment for Analyze */}
              <div
                className={cn(
                  "flex items-center justify-center transition-all duration-200",
                  isAnalyze && !isActive && "bg-green-wash rounded-full p-2",
                  isAnalyze && isActive && "bg-primary/10 rounded-full p-2"
                )}
              >
                <Icon 
                  size={isAnalyze ? 26 : 24} 
                  strokeWidth={isActive ? 2.5 : 2}
                  className={cn(
                    "transition-all duration-200",
                    isAnalyze && "text-primary"
                  )}
                />
              </div>
              
              <span className={cn(
                "text-caption font-semibold tracking-wide",
                isActive && "font-bold"
              )}>
                {label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
