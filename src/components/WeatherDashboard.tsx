import React, { useState } from 'react';
import { Cloud, Sun, Moon, CloudRain, Wind, Droplets, CloudSnow, CloudLightning, CloudFog, CloudDrizzle, ChevronDown, ChevronUp, MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getTranslation, dayNames, monthNames, type SupportedLanguage } from '@/lib/translations';

interface WeatherData {
  current: {
    temperature_2m: number;
    relative_humidity_2m: number;
    weather_code: number;
    wind_speed_10m: number;
  };
  daily?: {
    time: string[];
    weather_code: number[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
  };
}

interface WeatherDashboardProps {
  data: WeatherData | null;
  loading: boolean;
  error: string | null;
  language?: string;
}

// Weather icon components
const WeatherIcon: React.FC<{ code: number; size?: 'sm' | 'md' | 'lg'; isNight?: boolean }> = ({ code, size = 'md', isNight = false }) => {
  const sizeClasses = {
    sm: 'w-6 h-6',
    md: 'w-10 h-10',
    lg: 'w-14 h-14',
  };

  const iconClass = cn(sizeClasses[size], 'opacity-90');

  // Map weather codes to icons with appropriate colors
  if (code === 0) return isNight ? <Moon className={cn(iconClass, 'text-slate-200')} /> : <Sun className={cn(iconClass, 'text-amber-200')} />;
  if (code === 1) return isNight ? <Moon className={cn(iconClass, 'text-slate-200')} /> : <Sun className={cn(iconClass, 'text-amber-100')} />;
  if (code === 2) return <Cloud className={cn(iconClass, 'text-white')} />;
  if (code === 3) return <Cloud className={cn(iconClass, 'text-slate-200')} />;
  if (code >= 45 && code <= 48) return <CloudFog className={cn(iconClass, 'text-slate-300')} />;
  if (code >= 51 && code <= 55) return <CloudDrizzle className={cn(iconClass, 'text-sky-200')} />;
  if (code >= 56 && code <= 57) return <CloudDrizzle className={cn(iconClass, 'text-sky-100')} />;
  if (code >= 61 && code <= 65) return <CloudRain className={cn(iconClass, 'text-sky-300')} />;
  if (code >= 66 && code <= 67) return <CloudRain className={cn(iconClass, 'text-sky-200')} />;
  if (code >= 71 && code <= 77) return <CloudSnow className={cn(iconClass, 'text-white')} />;
  if (code >= 80 && code <= 82) return <CloudRain className={cn(iconClass, 'text-sky-400')} />;
  if (code >= 85 && code <= 86) return <CloudSnow className={cn(iconClass, 'text-slate-200')} />;
  if (code >= 95 && code <= 99) return <CloudLightning className={cn(iconClass, 'text-amber-300')} />;

  return <Cloud className={iconClass} />;
};

const getWeatherLabel = (code: number, t: ReturnType<typeof getTranslation<'weather'>>): string => {
  if (code === 0) return t.clearSky;
  if (code === 1) return t.mainlyClear;
  if (code === 2) return t.partlyCloudy;
  if (code === 3) return t.overcast;
  if (code >= 45 && code <= 48) return t.foggy;
  if (code >= 51 && code <= 57) return t.lightDrizzle;
  if (code >= 61 && code <= 67) return t.slightRain;
  if (code >= 71 && code <= 77) return t.snow;
  if (code >= 80 && code <= 82) return t.rainShowers;
  if (code >= 85 && code <= 86) return t.snow;
  if (code >= 95 && code <= 99) return t.thunderstorm;
  return t.unknown;
};

const formatDate = (dateStr: string, language: string): { day: string; date: string; month: string } => {
  const date = new Date(dateStr);
  const dayIndex = date.getDay();
  const monthIndex = date.getMonth();
  const dateNum = date.getDate();

  const lang = (language as SupportedLanguage) || 'en';
  const days = dayNames[lang] || dayNames.en;
  const months = monthNames[lang] || monthNames.en;

  return {
    day: days[dayIndex],
    date: dateNum.toString(),
    month: months[monthIndex],
  };
};

export const WeatherDashboard: React.FC<WeatherDashboardProps> = ({
  data,
  loading,
  error,
  language = 'en'
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const t = getTranslation('weather', language);

  if (loading) {
    return (
      <div className="mb-6">
        <div className="bg-primary rounded-apple-lg p-5 text-primary-foreground shadow-green animate-pulse">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <div className="h-4 bg-white/20 rounded w-24" />
              <div className="h-10 bg-white/20 rounded w-20" />
              <div className="h-4 bg-white/20 rounded w-32" />
            </div>
            <div className="w-16 h-16 bg-white/20 rounded-full" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="mb-6">
        <div className="bg-muted rounded-apple-lg p-5 text-muted-foreground border border-border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-subhead opacity-80">{t.title}</p>
              <p className="text-title font-bold mt-1">--°C</p>
              <p className="text-subhead opacity-80 mt-1">{t.unavailable}</p>
            </div>
            <Cloud size={48} className="opacity-30" />
          </div>
        </div>
      </div>
    );
  }

  const currentLabel = getWeatherLabel(data.current.weather_code, t);
  const today = new Date();
  const currentHour = today.getHours();
  const isNight = currentHour >= 18 || currentHour < 6;
  const formattedToday = formatDate(today.toISOString(), language);

  return (
    <div className="mb-6">
      {/* Green Weather Card with Expandable Forecast */}
      <div
        onClick={() => setIsExpanded(!isExpanded)}
        className={cn(
          "bg-primary rounded-apple-lg text-primary-foreground shadow-green overflow-hidden transition-all duration-300 cursor-pointer active:scale-[0.99]",
          isExpanded ? "shadow-apple-lg" : ""
        )}
      >
        <div className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 opacity-80 mb-1">
                <MapPin size={14} />
                <p className="text-subhead font-semibold">{formattedToday.day}, {formattedToday.date} {formattedToday.month}</p>
              </div>
              <p className="text-display font-bold">{Math.round(data.current.temperature_2m)}°C</p>
              <p className="text-subhead font-medium opacity-90 mt-1">{currentLabel}</p>
            </div>

            <div className="flex flex-col items-end gap-2">
              <WeatherIcon code={data.current.weather_code} size="lg" isNight={isNight} />
              <div className="flex items-center gap-1 text-subhead opacity-80">
                <Droplets size={16} />
                <span>{data.current.relative_humidity_2m}%</span>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-center mt-3 pt-2 text-white/60">
            {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </div>
        </div>

        {/* Expanded Forecast Section */}
        {isExpanded && data.daily && (
          <div className="bg-background/95 backdrop-blur-sm text-foreground p-4 animate-fade-in border-t border-white/10">
            <h3 className="text-caption font-bold uppercase tracking-widest text-muted-foreground mb-3">
              {t.forecast}
            </h3>
            <div className="grid grid-cols-5 gap-2">
              {data.daily.time.slice(0, 5).map((time, idx) => {
                const dateInfo = formatDate(time, language);
                const isToday = idx === 0;
                // Daily icons need to be colored for the white background, so we use a different coloring logic or just standard icons
                // We can use the same WeatherIcon but it's designed for green background (white/light colors). 
                // Let's rely on the text color mostly.

                return (
                  <div key={idx} className="flex flex-col items-center text-center">
                    <p className={cn("text-[10px] font-bold uppercase", isToday ? "text-primary" : "text-muted-foreground")}>
                      {isToday ? t.today : dateInfo.day.slice(0, 3)}
                    </p>
                    <p className="text-caption font-bold my-1">{Math.round(data.daily!.temperature_2m_max[idx])}°</p>
                    <div className="opacity-70 my-1">
                      {/* We need icons visible on white. Using valid colors from lucide or custom */}
                      <div className="text-foreground">
                        {/* Simple fallback icon for list */}
                        {data.daily!.weather_code[idx] <= 3 ? <Sun size={16} className="text-amber-500" /> : <CloudRain size={16} className="text-sky-500" />}
                      </div>
                    </div>
                    <p className="text-[10px] text-muted-foreground">{Math.round(data.daily!.temperature_2m_min[idx])}°</p>
                  </div>
                );
              })}
            </div>

            {/* Additional Details */}
            <div className="grid grid-cols-2 gap-3 mt-4">
              <div className="flex items-center gap-3 p-3 bg-muted rounded-apple border border-border">
                <Wind size={18} className="text-slate-500" />
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase">{t.wind}</p>
                  <p className="text-body font-bold">{data.current.wind_speed_10m} km/h</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-muted rounded-apple border border-border">
                <Droplets size={18} className="text-sky-500" />
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase">{t.humidity}</p>
                  <p className="text-body font-bold">{data.current.relative_humidity_2m}%</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
