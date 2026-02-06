import React, { useState, useEffect } from 'react';
import { Search, MapPin, TrendingUp, Calendar, ArrowRight, RefreshCw, ShoppingBag, Sparkles, Brain, Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getTranslation } from '@/lib/translations';
import { mandiService, type MandiPriceRecord } from '@/services/mandiService';

interface MarketPriceScreenProps {
    language: string;
    onShareChat?: (record: MandiPriceRecord) => void;
}

export const MarketPriceScreen: React.FC<MarketPriceScreenProps> = ({ language, onShareChat }) => {
    const [prices, setPrices] = useState<MandiPriceRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [isRefreshing, setIsRefreshing] = useState(false);

    // Deep Search State
    const [originalPrices, setOriginalPrices] = useState<MandiPriceRecord[]>([]);
    const [isSearchingOnline, setIsSearchingOnline] = useState(false);

    // AI Analysis State
    const [analyzingId, setAnalyzingId] = useState<string | null>(null);
    const [analyses, setAnalyses] = useState<Record<string, string>>({});
    const [expandedAnalyses, setExpandedAnalyses] = useState<Record<string, boolean>>({});

    const t = getTranslation('market', language);

    const loadPrices = async (isRefresh = false) => {
        try {
            if (isRefresh) setIsRefreshing(true);
            else setLoading(true);

            const data = await mandiService.fetchPrices(20);
            setPrices(data.records);
            setOriginalPrices(data.records);
            setError(null);

            // Automatically trigger analysis for the first 5 records to avoid overload
            // but still show dynamic AI insights
            data.records.slice(0, 5).forEach(record => {
                getAIAnalysis(record);
            });
        } catch (err) {
            setError(t.error);
        } finally {
            setLoading(false);
            setIsRefreshing(false);
        }
    };

    useEffect(() => {
        loadPrices();
    }, []);

    // Deep Search Logic (Debounced)
    useEffect(() => {
        const timeoutId = setTimeout(async () => {
            if (!searchQuery.trim()) {
                if (prices.length !== originalPrices.length) {
                    setPrices(originalPrices);
                }
                return;
            }

            // 1. First check if we have it locally in the original 20
            const localMatches = originalPrices.filter(p =>
                p.commodity.toLowerCase().includes(searchQuery.toLowerCase()) ||
                p.market.toLowerCase().includes(searchQuery.toLowerCase()) ||
                p.district.toLowerCase().includes(searchQuery.toLowerCase())
            );

            // 2. If locally found, just let the render-side filter handle it (so we reset to original source to filter from)
            if (localMatches.length > 0) {
                if (prices !== originalPrices) {
                    setPrices(originalPrices);
                }
                return;
            }

            // 3. If NOT found locally, search the Database (API)
            setIsSearchingOnline(true);
            try {
                const data = await mandiService.fetchPrices(50, 0, searchQuery);
                if (data.records.length > 0) {
                    setPrices(data.records);
                } else {
                    // Stay empty if nothing found, but at least we tried
                    setPrices([]);
                }
            } catch (err) {
                console.error("Deep search failed", err);
            } finally {
                setIsSearchingOnline(false);
            }

        }, 800); // 800ms debounce to avoid spamming API

        return () => clearTimeout(timeoutId);
    }, [searchQuery, originalPrices]);

    const getAIAnalysis = async (record: MandiPriceRecord) => {
        const id = `${record.market}-${record.commodity}-${record.modal_price}`;

        if (analyses[id]) return;

        try {
            const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
            const response = await fetch(`${apiUrl}/market/analyze`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ mandiData: record, language })
            });

            const data = await response.json();
            if (data.success) {
                setAnalyses(prev => ({ ...prev, [id]: data.analysis }));
            }
        } catch (err) {
            console.error("AI Analysis failed", err);
        }
    };

    const toggleAnalysis = (id: string) => {
        setExpandedAnalyses(prev => ({
            ...prev,
            [id]: !prev[id]
        }));
    };

    const filteredPrices = prices.filter(p =>
        p.commodity.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.market.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.district.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="flex flex-col flex-1 pb-32 animate-fade-in">
            {/* Header */}
            <header className="px-5 pt-8 pb-4 max-w-lg mx-auto w-full">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-display font-bold text-foreground">{t.title}</h1>
                            <span className="flex h-3 w-3 relative">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-3 w-3 bg-primary"></span>
                            </span>
                        </div>
                        <p className="text-body text-muted-foreground">{t.subtitle}</p>
                    </div>
                    <button
                        onClick={() => loadPrices(true)}
                        disabled={isRefreshing}
                        className={cn(
                            "p-3 rounded-full bg-card border border-border text-primary transition-all active:scale-90",
                            isRefreshing && "animate-spin"
                        )}
                    >
                        <RefreshCw size={20} />
                    </button>
                </div>

                {/* Search Bar */}
                <div className="relative mb-6 group">
                    {isSearchingOnline ? (
                        <Loader2 className="absolute left-4 top-1/2 -translate-y-1/2 text-primary animate-spin" size={18} />
                    ) : (
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-primary" size={18} />
                    )}
                    <input
                        type="text"
                        placeholder={t.searchPlaceholder}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-12 pr-4 py-4 rounded-apple bg-card border border-border shadow-apple-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                    />
                </div>
            </header>

            {/* Main Content */}
            <main className="px-5 max-w-lg mx-auto w-full">
                {loading ? (
                    <div className="space-y-4">
                        {[1, 2, 3, 4].map(i => (
                            <div key={i} className="h-48 rounded-apple-lg bg-card border border-border animate-pulse" />
                        ))}
                    </div>
                ) : error ? (
                    <div className="p-8 text-center bg-destructive/5 rounded-apple border border-destructive/20 text-destructive">
                        <p className="font-semibold">{error}</p>
                        <button
                            onClick={() => loadPrices()}
                            className="mt-4 px-6 py-2 bg-destructive text-destructive-foreground rounded-full text-sm font-bold"
                        >
                            Retry
                        </button>
                    </div>
                ) : filteredPrices.length === 0 ? (
                    <div className="p-12 text-center bg-muted/50 rounded-apple-lg border border-dashed border-border">
                        <ShoppingBag className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
                        <p className="text-subhead text-muted-foreground font-medium">
                            {isSearchingOnline ? "Checking global database..." : t.noData}
                        </p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {filteredPrices.map((record, index) => {
                            const id = `${record.market}-${record.commodity}-${record.modal_price}`;
                            const analysis = analyses[id];

                            return (
                                <div
                                    key={`${record.market}-${record.commodity}-${index}`}
                                    className="group relative bg-card rounded-apple-lg border border-border shadow-apple-sm hover:shadow-apple transition-all duration-300 overflow-hidden"
                                >
                                    {/* Header Section */}
                                    <div className="p-5 border-b border-border/50">
                                        <div className="flex items-start justify-between mb-3">
                                            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-green-wash text-primary">
                                                <TrendingUp size={14} />
                                                <span className="text-[12px] font-bold uppercase tracking-wider">{record.commodity}</span>
                                            </div>
                                            <div className="flex items-center gap-1 text-muted-foreground text-[12px]">
                                                <Calendar size={12} />
                                                <span>{record.arrival_date}</span>
                                            </div>
                                        </div>

                                        <h3 className="text-title font-bold text-foreground mb-1">{record.market}</h3>
                                        <div className="flex items-center gap-1 text-muted-foreground text-caption">
                                            <MapPin size={12} />
                                            <span>{record.district}, {record.state}</span>
                                        </div>
                                    </div>

                                    {/* Price Section */}
                                    <div className="p-5 bg-gradient-to-br from-card to-muted/30">
                                        <div className="flex items-end justify-between">
                                            <div>
                                                <p className="text-caption text-muted-foreground uppercase tracking-widest font-bold mb-1">
                                                    {(t as any).currentPriceOf ? (
                                                        language === 'en'
                                                            ? `${(t as any).currentPriceOf} ${record.commodity}`
                                                            : `${record.commodity}${(t as any).currentPriceOf}`
                                                    ) : t.modalPrice}
                                                </p>
                                                <div className="flex items-baseline gap-1">
                                                    <span className="text-headline font-bold text-primary">₹{record.modal_price}</span>
                                                    <span className="text-caption text-muted-foreground">{t.perQuintal}</span>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-caption text-muted-foreground uppercase tracking-widest font-bold mb-1">{t.priceRange}</p>
                                                <p className="text-subhead font-semibold">₹{record.min_price} - ₹{record.max_price}</p>
                                            </div>
                                        </div>

                                        {/* Variety Info */}
                                        <div className="mt-4 pt-4 border-t border-border/30 flex items-center justify-between">
                                            <div className="flex items-center gap-4">
                                                <div className="text-center">
                                                    <p className="text-[10px] text-muted-foreground uppercase">{t.variety}</p>
                                                    <p className="text-caption font-bold">{record.variety}</p>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => onShareChat?.(record)}
                                                className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white hover:bg-primary-dark transition-all active:scale-95 shadow-lg group-hover:scale-110"
                                            >
                                                <ArrowRight size={20} />
                                            </button>
                                        </div>

                                        {/* AI Analysis Section (Dynamic Update) */}
                                        {analysis && (
                                            <div className="mt-4 rounded-apple bg-primary/5 border border-primary/10 overflow-hidden transition-all duration-300">
                                                <button
                                                    onClick={() => toggleAnalysis(id)}
                                                    className="w-full flex items-center justify-between p-4 hover:bg-primary/5 transition-colors"
                                                >
                                                    <div className="flex items-center gap-2 text-primary">
                                                        <img src="/logo.svg" alt="App Logo" className="w-5 h-5 object-contain" />
                                                        <span className="text-caption font-bold uppercase tracking-wider">{t.aiAdvice}</span>
                                                    </div>
                                                    {expandedAnalyses[id] ? (
                                                        <ChevronUp size={16} className="text-primary/70" />
                                                    ) : (
                                                        <ChevronDown size={16} className="text-primary/70" />
                                                    )}
                                                </button>

                                                {expandedAnalyses[id] && (
                                                    <div className="px-4 pb-4 animate-in slide-in-from-top-2 fade-in duration-200">
                                                        <p className="text-body text-foreground leading-relaxed">
                                                            {analysis}
                                                        </p>
                                                        <div className="mt-3 flex justify-end">
                                                            <div className="flex items-center gap-1 text-[10px] text-muted-foreground bg-white/50 px-2 py-0.5 rounded-full border border-border/50">
                                                                <div className="w-1 h-1 rounded-full bg-green-500 animate-pulse" />
                                                                <span>AI-Powered Insights</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </main>
        </div>
    );
};
