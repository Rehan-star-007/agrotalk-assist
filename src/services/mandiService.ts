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
const BASE_URL = import.meta.env.VITE_MANDI_API_BASE_URL || 'https://api.data.gov.in/resource/9ef275ee-e289-487b-80a2-8c8d8dcb4545';

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
            let url = `${BASE_URL}?api-key=${API_KEY}&format=json&limit=${limit}&offset=${offset}`;
            if (commodity) {
                url += `&filters[commodity]=${encodeURIComponent(commodity)}`;
            }

            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`API responded with status: ${response.status}`);
            }

            const data = await response.json();
            return {
                records: data.records,
                total: data.total,
                count: data.count
            };
        } catch (error) {
            console.error("Error fetching mandi prices:", error);
            // Fallback to mock data on error
            return {
                records: MOCK_RECORDS,
                total: MOCK_RECORDS.length,
                count: MOCK_RECORDS.length
            };
        }
    }
};
