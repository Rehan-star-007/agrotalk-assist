/**
 * Service for fetching real-time mandi prices from Data.gov.in
 */

export interface MandiPriceRecord {
    state: string;
    district: string;
    market: string;
    commodity: string;
    variety: string;
    grade: string;
    arrival_date: string;
    min_price: string;
    max_price: string;
    modal_price: string;
    timestamp?: number;
}

export interface MandiApiResponse {
    records: MandiPriceRecord[];
    total: number;
    count: number;
}

import { dbService } from './db';

const API_KEY = import.meta.env.VITE_MANDI_API_KEY;
const BASE_URL = import.meta.env.VITE_MANDI_API_BASE_URL || 'https://api.data.gov.in/resource/9ef84268-d588-465a-a308-a864a43d0070';

// Mock data for fallback or development
const MOCK_RECORDS: MandiPriceRecord[] = [
    {
        state: "Uttar Pradesh",
        district: "Agra",
        market: "Achhnera",
        commodity: "Potato",
        variety: "Desi",
        grade: "FAQ",
        arrival_date: new Date().toLocaleDateString(),
        min_price: "1500",
        max_price: "1800",
        modal_price: "1650"
    },
    {
        state: "Maharashtra",
        district: "Nashik",
        market: "Lasalgaon",
        commodity: "Onion",
        variety: "Red",
        grade: "FAQ",
        arrival_date: new Date().toLocaleDateString(),
        min_price: "2000",
        max_price: "2500",
        modal_price: "2250"
    },
    {
        state: "Punjab",
        district: "Ludhiana",
        market: "Ludhiana",
        commodity: "Wheat",
        variety: "Kalyan",
        grade: "FAQ",
        arrival_date: new Date().toLocaleDateString(),
        min_price: "2200",
        max_price: "2400",
        modal_price: "2300"
    },
    {
        state: "Karnataka",
        district: "Shimoga",
        market: "Shimoga",
        commodity: "Rice",
        variety: "Sona Masuri",
        grade: "FAQ",
        arrival_date: new Date().toLocaleDateString(),
        min_price: "3500",
        max_price: "4200",
        modal_price: "3850"
    },
    {
        state: "Gujarat",
        district: "Rajkot",
        market: "Rajkot",
        commodity: "Cotton",
        variety: "Shankar-6",
        grade: "FAQ",
        arrival_date: new Date().toLocaleDateString(),
        min_price: "6000",
        max_price: "7500",
        modal_price: "6800"
    }
];

export const mandiService = {
    fetchPrices: async (limit = 10, offset = 0, commodity?: string): Promise<MandiApiResponse> => {
        // 1. Try to fetch from API
        try {
            // Check online status first to fail fast and use cache
            if (!navigator.onLine) {
                throw new Error("Offline");
            }

            // If no API key is provided, return mock data (dev mode)
            if (!API_KEY) {
                console.warn("No Mandi API key provided. Using mock data.");
                return {
                    records: commodity
                        ? MOCK_RECORDS.filter(r => r.commodity.toLowerCase().includes(commodity.toLowerCase()))
                        : MOCK_RECORDS,
                    total: MOCK_RECORDS.length,
                    count: MOCK_RECORDS.length
                };
            }

            // First try with exact filter for commodity as it's more precise
            let url = `${BASE_URL}?api-key=${API_KEY}&format=json&limit=${limit}&offset=${offset}`;
            if (commodity) {
                url += `&filters[commodity]=${encodeURIComponent(commodity)}`;
            }

            console.log(`📡 Fetching Mandi Prices: ${url.replace(API_KEY, 'HIDDEN')}`);

            let response = await fetch(url);
            if (!response.ok) {
                throw new Error(`API responded with status: ${response.status}`);
            }

            let data = await response.json();

            // If no results with exact filter, try a broader 'q' search
            if (commodity && (!data.records || data.records.length === 0)) {
                console.log(`🔍 No matches for filter. Trying broader search with q=${commodity}...`);
                const qUrl = `${BASE_URL}?api-key=${API_KEY}&format=json&limit=${limit}&offset=${offset}&q=${encodeURIComponent(commodity)}`;
                const qResponse = await fetch(qUrl);
                if (qResponse.ok) {
                    const qData = await qResponse.json();
                    if (qData.records && qData.records.length > 0) {
                        data = qData;
                    }
                }
            }

            const records: MandiPriceRecord[] = data.records || [];

            // 2. Cache successful results to IndexedDB
            if (records.length > 0) {
                console.log(`💾 Caching ${records.length} market records...`);
                // We don't await this to keep UI snappy, but we catch errors
                Promise.all(records.map(record => {
                    const id = `${record.state}_${record.district}_${record.market}_${record.commodity}`;
                    return dbService.put('market_data', {
                        id: id.replace(/\s+/g, '_').toLowerCase(),
                        ...record,
                        timestamp: Date.now()
                    });
                })).catch(err => console.error("Failed to cache market data", err));
            }

            return {
                records: records,
                total: data.total || records.length,
                count: data.count || records.length
            };

        } catch (error) {
            console.warn("⚠️ Market API Failed/Offline. Switching to Local DB...", error);

            // 3. Fallback to IndexedDB
            try {
                let cachedRecords: any[] = [];

                if (commodity) {
                    // Start transaction to search
                    // Since 'commodity' index might not be fuzzy, we might get all and filter
                    // For now, let's get all and filter in JS (dataset likely < 1000 items locally)
                    const allData = await dbService.getAll('market_data');
                    cachedRecords = allData.filter(item =>
                        item.commodity.toLowerCase().includes(commodity.toLowerCase()) ||
                        item.market.toLowerCase().includes(commodity.toLowerCase())
                    );
                } else {
                    // Get all recent records (maybe limit to 50 for performance)
                    cachedRecords = await dbService.getAll('market_data');
                }

                // Sort by timestamp if available (newest first) but our DB puts don't strictly order returning .getAll()
                // so we sort manually
                cachedRecords.sort((a, b) => b.timestamp - a.timestamp);

                if (cachedRecords.length > 0) {
                    console.log(`✅ Loaded ${cachedRecords.length} records from Offline Cache`);
                    return {
                        records: cachedRecords,
                        total: cachedRecords.length,
                        count: cachedRecords.length
                    };
                }

            } catch (dbError) {
                console.error("❌ Failed to read from Offline DB", dbError);
            }

            // 4. Final Fallback to MOCK_RECORDS
            console.warn("⚠️ No local cache found. Using Mock Data.");
            const filteredMock = commodity
                ? MOCK_RECORDS.filter(r => r.commodity.toLowerCase().includes(commodity.toLowerCase()))
                : MOCK_RECORDS;

            return {
                records: filteredMock,
                total: filteredMock.length,
                count: filteredMock.length
            };
        }
    }
};
