/**
 * AgroTalk Backend Server
 * 
 * Lightweight Express proxy for Hugging Face Vision API.
 * Solves CORS issues by making server-to-server API calls.
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const analyzeRoute = require('./routes/analyze');

const app = express();
const PORT = process.env.PORT || 3001;

// Enable CORS for frontend
app.use(cors({
    origin: [
        'http://localhost:8080',
        'http://localhost:8081',
        'http://localhost:5173',
        'http://127.0.0.1:8080',
        'http://127.0.0.1:8081'
    ],
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type']
}));

// Parse JSON bodies
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Image analysis endpoint
app.use('/analyze-image', analyzeRoute);

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Server error:', err);
    res.status(500).json({
        success: false,
        error: 'Internal server error'
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`🌱 AgroTalk Backend running on http://localhost:${PORT}`);
    console.log(`📡 Ready to analyze crop images`);

    if (!process.env.HF_API_KEY) {
        console.warn('⚠️  Warning: HF_API_KEY not set in .env file');
    }
});
