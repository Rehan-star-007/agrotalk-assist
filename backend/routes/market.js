const express = require('express');
const router = express.Router();
const { getMarketAnalysis } = require('../services/openRouterService');

// Simple in-memory cache
const cache = new Map();
const CACHE_DURATION = 10 * 60 * 1000; // 10 minutes

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
        if (cache.has(cacheKey)) {
            const cached = cache.get(cacheKey);
            if (Date.now() - cached.timestamp < CACHE_DURATION) {
                console.log('💎 Returning cached market analysis');
                return res.json({
                    success: true,
                    analysis: cached.data.text,
                    cached: true
                });
            }
            cache.delete(cacheKey);
        }

        const analysis = await getMarketAnalysis(mandiData, language);

        if (!analysis) {
            return res.status(500).json({
                success: false,
                error: 'Failed to generate market analysis'
            });
        }

        // Store in cache
        cache.set(cacheKey, {
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
