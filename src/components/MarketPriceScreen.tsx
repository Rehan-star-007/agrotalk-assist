import React, { useState, useEffect } from 'react';
import { Search, MapPin, TrendingUp, Calendar, ArrowRight, RefreshCw, ShoppingBag, Sparkles, Brain, Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getTranslation } from '@/lib/translations';
import { mandiService, type MandiPriceRecord } from '@/services/mandiService';

interface MarketPriceScreenProps {
    language: string;
}

export const MarketPriceScreen: React.FC<MarketPriceScreenProps> = ({ language }) => {
    const [prices, setPrices] = useState<MandiPriceRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [isRefreshing, setIsRefreshing] = useState(false);

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
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-primary" size={18} />
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
                        <p className="text-subhead text-muted-foreground font-medium">{t.noData}</p>
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
                                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                                                <ArrowRight size={16} />
                                            </div>
                                        </div>

                                        {/* AI Analysis Section (Dynamic Update) */}
                                        {analysis && (
                                            <div className="mt-4 p-4 rounded-apple bg-primary/5 border border-primary/10 animate-slide-up">
                                                <div className="flex items-center gap-2 mb-2 text-primary">
                                                    <Brain size={16} />
                                                    <span className="text-caption font-bold uppercase tracking-wider">{t.aiAdvice}</span>
                                                </div>
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
                                </div>
                            );
                        })}
                    </div>
                )}
            </main>
        </div>
    );
};
