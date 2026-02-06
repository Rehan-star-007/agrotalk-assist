const express = require('express');
const router = express.Router();
const { getMarketAnalysis } = require('../services/openRouterService');

// Simple in-memory cache for analysis
const analysisCache = new Map();
const CACHE_DURATION = 10 * 60 * 1000; // 10 minutes

const API_KEY = process.env.VITE_MANDI_API_KEY;
const BASE_URL = process.env.VITE_MANDI_API_BASE_URL || 'https://api.data.gov.in/resource/9ef84268-d588-465a-a308-a864a43d0070';

/**
 * GET /market/prices
 * Proxy for Agmarknet API to avoid CORS issues
 */
router.get('/prices', async (req, res) => {
    try {
        const { limit = 10, offset = 0, commodity } = req.query;
        let url = `${BASE_URL}?api-key=${API_KEY}&format=json&limit=${limit}&offset=${offset}`;

        if (commodity) {
            url += `&filters[commodity]=${encodeURIComponent(commodity)}`;
        }

        console.log(`🌐 Proxying Mandi request: ${url}`);
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'AgroTalk/1.0',
                'Accept': 'application/json'
            }
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`❌ Mandi API Error (${response.status}):`, errorText);
            throw new Error(`Mandi API responded with ${response.status}`);
        }

        const data = await response.json();
        res.json({
            success: true,
            records: data.records || [],
            total: data.total || 0,
            count: data.count || 0
        });
    } catch (error) {
        console.error('Error fetching mandi prices via proxy:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch market data'
        });
    }
});

/**
 * POST /market/analyze
 * Body: { mandiData, language }
 */
router.post('/analyze', async (req, res) => {
    try {
        const { mandiData, language = 'en' } = req.body;

        if (!mandiData) {
            return res.status(400).json({
                success: false,
                error: 'Mandi data is required'
            });
        }

        // Create cache key based on record and language
        const cacheKey = `${mandiData.market}-${mandiData.commodity}-${mandiData.modal_price}-${language}`;

        // Check cache
        if (analysisCache.has(cacheKey)) {
            const cached = analysisCache.get(cacheKey);
            if (Date.now() - cached.timestamp < CACHE_DURATION) {
                console.log('💎 Returning cached market analysis');
                return res.json({
                    success: true,
                    analysis: cached.data.text,
                    cached: true
                });
            }
            analysisCache.delete(cacheKey);
        }

        const analysis = await getMarketAnalysis(mandiData, language);

        if (!analysis) {
            return res.status(500).json({
                success: false,
                error: 'Failed to generate market analysis'
            });
        }

        // Store in cache
        analysisCache.set(cacheKey, {
            timestamp: Date.now(),
            data: analysis
        });

        res.json({
            success: true,
            analysis: analysis.text,
            model: analysis.model
        });

    } catch (error) {
        console.error('Error in market analysis route:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});

module.exports = router;
