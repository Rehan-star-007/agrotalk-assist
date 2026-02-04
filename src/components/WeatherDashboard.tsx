import React, { useState } from 'react';
import { Cloud, Sun, CloudRain, Wind, Droplets, MapPin, ChevronDown, ChevronUp, Thermometer, CloudSnow, CloudLightning, CloudFog, CloudDrizzle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getTranslation, dayNames, monthNames, type SupportedLanguage } from '@/lib/translations';

interface WeatherData {
  current: {
    temperature_2m: number;
    relative_humidity_2m: number;
    weather_code: number;
    wind_speed_10m: number;
  };
  daily: {
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

// Weather icon components with premium styling
const WeatherIcon: React.FC<{ code: number; size?: 'sm' | 'md' | 'lg' }> = ({ code, size = 'md' }) => {
  const sizeClasses = {
    sm: 'w-6 h-6',
    md: 'w-10 h-10',
    lg: 'w-14 h-14',
  };

  const iconClass = cn(sizeClasses[size], 'text-primary');

  // Map weather codes to icons
  if (code === 0) return <Sun className={cn(iconClass, 'text-amber-400')} />;
  if (code === 1) return <Sun className={cn(iconClass, 'text-amber-300')} />;
  if (code === 2) return <Cloud className={cn(iconClass, 'text-slate-400')} />;
  if (code === 3) return <Cloud className={cn(iconClass, 'text-slate-500')} />;
  if (code >= 45 && code <= 48) return <CloudFog className={cn(iconClass, 'text-slate-400')} />;
  if (code >= 51 && code <= 55) return <CloudDrizzle className={cn(iconClass, 'text-sky-400')} />;
  if (code >= 56 && code <= 57) return <CloudDrizzle className={cn(iconClass, 'text-sky-300')} />;
  if (code >= 61 && code <= 65) return <CloudRain className={cn(iconClass, 'text-sky-500')} />;
  if (code >= 66 && code <= 67) return <CloudRain className={cn(iconClass, 'text-sky-400')} />;
  if (code >= 71 && code <= 77) return <CloudSnow className={cn(iconClass, 'text-slate-300')} />;
  if (code >= 80 && code <= 82) return <CloudRain className={cn(iconClass, 'text-sky-600')} />;
  if (code >= 85 && code <= 86) return <CloudSnow className={cn(iconClass, 'text-slate-400')} />;
  if (code >= 95 && code <= 99) return <CloudLightning className={cn(iconClass, 'text-amber-500')} />;

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
      <div className="mx-5 mb-6">
        <div className="p-6 rounded-apple-lg bg-card border border-border shadow-apple animate-pulse">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-muted" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-muted rounded w-24" />
              <div className="h-8 bg-muted rounded w-20" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="mx-5 mb-6">
        <div className="p-5 rounded-apple-lg bg-destructive/5 border border-destructive/20 flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
            <Cloud className="w-6 h-6 text-destructive" />
          </div>
          <div>
            <h3 className="text-subhead font-semibold text-destructive">{t.unavailable}</h3>
            <p className="text-caption text-muted-foreground">{error || 'No data'}</p>
          </div>
        </div>
      </div>
    );
  }

  const currentLabel = getWeatherLabel(data.current.weather_code, t);
  const today = new Date();
  const formattedToday = formatDate(today.toISOString(), language);

  return (
    <div className="mx-5 mb-6">
      {/* Main Weather Card */}
      <div
        onClick={() => setIsExpanded(!isExpanded)}
        className={cn(
          "relative overflow-hidden rounded-apple-lg bg-card border border-border shadow-apple",
          "transition-all duration-300 cursor-pointer active:scale-[0.99]",
          isExpanded && "shadow-apple-lg"
        )}
      >
        {/* Header */}
        <div className="p-5">
          {/* Location & Date */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2 text-muted-foreground">
              <MapPin size={14} className="text-primary" />
              <span className="text-caption font-semibold uppercase tracking-wide">{t.title}</span>
            </div>
            <div className="text-caption text-muted-foreground font-medium">
              {formattedToday.day}, {formattedToday.date} {formattedToday.month}
            </div>
          </div>

          {/* Current Weather */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {/* Weather Icon */}
              <div className="w-16 h-16 rounded-2xl bg-green-wash flex items-center justify-center">
                <WeatherIcon code={data.current.weather_code} size="lg" />
              </div>
              
              {/* Temperature */}
              <div>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-bold text-foreground">
                    {Math.round(data.current.temperature_2m)}
                  </span>
                  <span className="text-xl text-muted-foreground">°C</span>
                </div>
                <p className="text-subhead text-muted-foreground font-medium">{currentLabel}</p>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-caption text-muted-foreground">
                <Droplets size={14} className="text-sky-500" />
                <span className="font-semibold">{data.current.relative_humidity_2m}%</span>
              </div>
              <div className="flex items-center gap-2 text-caption text-muted-foreground">
                <Wind size={14} className="text-slate-500" />
                <span className="font-semibold">{data.current.wind_speed_10m} km/h</span>
              </div>
            </div>
          </div>

          {/* Expand Indicator */}
          <div className="flex items-center justify-center mt-4 pt-3 border-t border-border">
            <div className="flex items-center gap-2 text-caption text-muted-foreground">
              {isExpanded ? (
                <>
                  <span>{t.tapToClose}</span>
                  <ChevronUp size={16} />
                </>
              ) : (
                <>
                  <span>{t.tapToExpand}</span>
                  <ChevronDown size={16} />
                </>
              )}
            </div>
          </div>
        </div>

        {/* Expanded Forecast */}
        {isExpanded && (
          <div className="px-5 pb-5 animate-fade-in">
            {/* Divider */}
            <div className="mb-4">
              <h3 className="text-caption font-bold uppercase tracking-widest text-muted-foreground">
                {t.forecast}
              </h3>
            </div>

            {/* 5-Day Forecast Grid */}
            <div className="grid grid-cols-5 gap-2">
              {data.daily.time.slice(0, 5).map((time, idx) => {
                const dateInfo = formatDate(time, language);
                const isToday = idx === 0;
                
                return (
                  <div
                    key={idx}
                    className={cn(
                      "flex flex-col items-center p-3 rounded-apple transition-all",
                      isToday 
                        ? "bg-green-wash border border-primary/20" 
                        : "bg-muted/50 border border-transparent"
                    )}
                  >
                    {/* Day Name */}
                    <p className={cn(
                      "text-[10px] font-bold uppercase tracking-wide mb-2",
                      isToday ? "text-primary" : "text-muted-foreground"
                    )}>
                      {isToday ? t.today : dateInfo.day}
                    </p>

                    {/* Date */}
                    <p className="text-caption font-semibold text-foreground mb-2">
                      {dateInfo.date}
                    </p>

                    {/* Weather Icon */}
                    <div className="my-2">
                      <WeatherIcon code={data.daily.weather_code[idx]} size="sm" />
                    </div>

                    {/* Temperature Range */}
                    <div className="text-center">
                      <p className="text-caption font-bold text-foreground">
                        {Math.round(data.daily.temperature_2m_max[idx])}°
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {Math.round(data.daily.temperature_2m_min[idx])}°
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Weather Stats Cards */}
            <div className="grid grid-cols-2 gap-3 mt-4">
              <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-apple border border-border">
                <div className="w-10 h-10 rounded-xl bg-sky-50 flex items-center justify-center">
                  <Droplets size={20} className="text-sky-500" />
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                    {t.humidity}
                  </p>
                  <p className="text-body font-bold text-foreground">
                    {data.current.relative_humidity_2m}%
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-apple border border-border">
                <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center">
                  <Wind size={20} className="text-slate-500" />
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                    {t.wind}
                  </p>
                  <p className="text-body font-bold text-foreground">
                    {data.current.wind_speed_10m} km/h
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
