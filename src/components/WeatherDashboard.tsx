import React, { useState } from 'react';
import { Cloud, Sun, CloudRain, Wind, Droplets, MapPin, ChevronDown, ChevronUp } from 'lucide-react';

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
}

const weatherCodes: Record<number, { label: string; icon: React.ReactNode; color: string; symbol: string }> = {
    0: { label: 'Clear sky', icon: <Sun className="w-8 h-8 text-yellow-400" />, color: 'from-green-500 to-green-700', symbol: '☀️' },
    1: { label: 'Mainly clear', icon: <Sun className="w-8 h-8 text-yellow-300" />, color: 'from-green-400 to-green-600', symbol: '🌤️' },
    2: { label: 'Partly cloudy', icon: <Cloud className="w-8 h-8 text-white/80" />, color: 'from-green-300 to-green-500', symbol: '⛅' },
    3: { label: 'Overcast', icon: <Cloud className="w-8 h-8 text-gray-200" />, color: 'from-gray-500 to-gray-700', symbol: '☁️' },
    45: { label: 'Foggy', icon: <Cloud className="w-8 h-8 text-gray-300" />, color: 'from-gray-400 to-gray-600', symbol: '🌫️' },
    51: { label: 'Light drizzle', icon: <CloudRain className="w-8 h-8 text-blue-300" />, color: 'from-green-200 to-green-400', symbol: '🌦️' },
    61: { label: 'Slight rain', icon: <CloudRain className="w-8 h-8 text-blue-400" />, color: 'from-green-600 to-green-800', symbol: '🌧️' },
    80: { label: 'Rain showers', icon: <CloudRain className="w-8 h-8 text-blue-600" />, color: 'from-green-700 to-green-900', symbol: '🌦️' },
};

const getWeatherInfo = (code: number) => {
    return weatherCodes[code] || { label: 'Unknown', icon: <Cloud className="w-8 h-8 text-gray-400" />, color: 'from-green-500 to-green-700', symbol: '❓' };
};

export const WeatherDashboard: React.FC<WeatherDashboardProps> = ({ data, loading, error }) => {
    const [isExpanded, setIsExpanded] = useState(false);

    if (loading) {
        return (
            <div className="mx-5 p-6 rounded-3xl bg-green-500/10 border border-green-500/20 animate-pulse flex flex-col items-center justify-center min-h-[150px]">
                <Cloud className="w-10 h-10 text-green-400 mb-2 animate-bounce" />
                <p className="text-green-600 font-medium">Loading weather...</p>
            </div>
        );
    }

    if (error || !data) {
        return (
            <div className="mx-5 p-6 rounded-3xl bg-red-50 border border-red-100 flex items-center gap-4">
                <div className="bg-red-100 p-3 rounded-full">
                    <Cloud className="w-6 h-6 text-red-500" />
                </div>
                <div>
                    <h3 className="text-red-900 font-semibold text-sm">Weather Unavailable</h3>
                    <p className="text-red-600 text-xs">{error || 'No data'}</p>
                </div>
            </div>
        );
    }

    const currentInfo = getWeatherInfo(data.current.weather_code);

    return (
        <div className="mx-5 mb-8">
            {/* Current Weather Card */}
            <div
                onClick={() => setIsExpanded(!isExpanded)}
                className={`relative overflow-hidden rounded-3xl p-6 shadow-2xl transition-all duration-500 cursor-pointer active:scale-[0.98] bg-gradient-to-br ${currentInfo.color} group`}
            >
                {/* Decorative background circles - Nvidia Style */}
                <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/20 rounded-full blur-3xl group-hover:bg-white/30 transition-all duration-700"></div>
                <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-black/10 rounded-full blur-3xl group-hover:bg-black/20 transition-all duration-700"></div>

                <div className="relative z-10 flex flex-col gap-6">
                    <div className="flex justify-between items-start">
                        <div>
                            <div className="flex items-center gap-2 text-white/90 mb-1">
                                <MapPin size={14} className="animate-pulse" />
                                <span className="text-xs font-bold uppercase tracking-wider">Live Farm Weather</span>
                            </div>
                            <div className="flex items-baseline gap-2">
                                <h2 className="text-white text-5xl font-black">{Math.round(data.current.temperature_2m)}°C</h2>
                                <span className="text-white/80 text-2xl animate-bounce-slow">{currentInfo.symbol}</span>
                            </div>
                            <p className="text-white/90 font-bold text-lg mt-1">{currentInfo.label}</p>
                        </div>
                        <div className="bg-white/20 backdrop-blur-md p-4 rounded-2xl border border-white/30 transform transition-transform group-hover:scale-110">
                            {currentInfo.icon}
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="flex items-center gap-3 bg-white/10 backdrop-blur-sm p-3 rounded-2xl border border-white/10">
                            <div className="bg-white/20 p-2 rounded-xl">
                                <Droplets size={16} className="text-white" />
                            </div>
                            <div>
                                <p className="text-white/60 text-[10px] uppercase font-black">Humidity</p>
                                <p className="text-white text-sm font-black">{data.current.relative_humidity_2m}%</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 bg-white/10 backdrop-blur-sm p-3 rounded-2xl border border-white/10">
                            <div className="bg-white/20 p-2 rounded-xl">
                                <Wind size={16} className="text-white" />
                            </div>
                            <div>
                                <p className="text-white/60 text-[10px] uppercase font-black">Wind</p>
                                <p className="text-white text-sm font-black">{data.current.wind_speed_10m} km/h</p>
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-center text-white/60">
                        {isExpanded ? <ChevronUp size={24} className="animate-bounce" /> : <ChevronDown size={24} className="animate-bounce" />}
                    </div>
                </div>

                {/* Expandable Forecast - Now INSIDE the card */}
                {isExpanded && (
                    <div className="mt-6 pt-6 border-t border-white/20 animate-fade-in relative z-10">
                        <div className="flex gap-4 overflow-x-auto pb-2 no-scrollbar">
                            {data.daily.time.slice(1, 6).map((time, idx) => {
                                const dayCode = data.daily.weather_code[idx + 1];
                                const dayInfo = getWeatherInfo(dayCode);
                                const date = new Date(time);
                                const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });

                                return (
                                    <div key={idx} className="flex-shrink-0 w-20 flex flex-col items-center gap-2 py-3 px-1 rounded-2xl bg-white/10 border border-white/5">
                                        <p className="text-[10px] font-black text-white/70 uppercase">{dayName}</p>
                                        <span className="text-xl rotate-1">{dayInfo.symbol}</span>
                                        <div className="text-center">
                                            <p className="text-xs font-black text-white">{Math.round(data.daily.temperature_2m_max[idx + 1])}°</p>
                                            <p className="text-[9px] font-bold text-white/60">{Math.round(data.daily.temperature_2m_min[idx + 1])}°</p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                        <p className="text-center text-[10px] text-white/50 font-bold mt-4 tracking-widest uppercase">Tap to close</p>
                    </div>
                )}
            </div>
        </div>
    );
};
