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
}

export interface MandiApiResponse {
    records: MandiPriceRecord[];
    total: number;
    count: number;
}

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
        // If no API key is provided, return mock data
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

        try {
            // First try with exact filter for commodity as it's more precise
            let url = `${BASE_URL}?api-key=${API_KEY}&format=json&limit=${limit}&offset=${offset}`;
            if (commodity) {
                // If it's a multi-word search, q might be better, but filters[commodity] is the standard for this API
                url += `&filters[commodity]=${encodeURIComponent(commodity)}`;
            }

            console.log(`📡 Fetching Mandi Prices: ${url.replace(API_KEY, 'HIDDEN')}`);

            let response = await fetch(url);
            if (!response.ok) {
                throw new Error(`API responded with status: ${response.status}`);
            }

            let data = await response.json();

            // If no results with exact filter, try a broader 'q' search (supported by some OGD datasets)
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

            // If we have records (even if empty after broad search), return them
            // ONLY fallback to mock data if it's the INITIAL LOAD (no commodity) and it's empty
            if (!commodity && (!data.records || data.records.length === 0)) {
                console.warn("⚠️ Mandi API returned empty records on initial load. Using mock data.");
                return {
                    records: MOCK_RECORDS,
                    total: MOCK_RECORDS.length,
                    count: MOCK_RECORDS.length
                };
            }

            return {
                records: data.records || [],
                total: data.total || 0,
                count: data.count || 0
            };
        } catch (error) {
            console.error("❌ Error fetching mandi prices:", error);
            // On hard error, fallback to filtered mock records if commodity exists
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
