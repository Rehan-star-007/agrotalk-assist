/**
 * Voice Transcription Route
 *
 * POST /transcribe
 * Accepts multipart form data with an audio file.
 * Returns transcript and agricultural advisory based on spoken query.
 */

const express = require('express');
const multer = require('multer');
const transcriptionService = require('../services/transcriptionService');
const inferenceService = require('../services/inferenceService');

const router = express.Router();

const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB
    },
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('audio/')) {
            cb(null, true);
        } else {
            cb(new Error('Only audio files are allowed'), false);
        }
    },
});

router.post('/', upload.single('audio'), async (req, res) => {
    const requestId = Math.random().toString(36).substring(7);
    console.log(`\n📥 [${requestId}] Received transcription request`);
    const startTime = Date.now();

    try {
        if (!req.file || !req.file.buffer) {
            return res.status(400).json({
                success: false,
                error: 'No audio file provided. Please record and send audio.',
            });
        }

        const { buffer, mimetype } = req.file;
        if (buffer.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Audio file is empty.',
            });
        }

        console.log(`🎤 Audio: ${req.file.originalname || 'audio'} (${mimetype}, ${buffer.length} bytes)`);

        console.log('🔊 Calling Whisper API...');
        let transcribeResult;
        try {
            transcribeResult = await transcriptionService.transcribe(buffer, mimetype);
        } catch (transcribeError) {
            console.error('❌ Whisper API Call failed:', transcribeError);
            throw transcribeError;
        }

        const { transcript } = transcribeResult;

        if (!transcript || typeof transcript !== 'string') {
            return res.status(503).json({
                success: false,
                error: 'Transcription returned no text.',
            });
        }

        const { language, weatherData } = req.body;
        let weatherContext;
        if (weatherData) {
            try {
                weatherContext = JSON.parse(weatherData);
            } catch (e) {
                console.warn('Failed to parse weatherData:', e);
            }
        }

        console.log(`🌾 Applying agricultural inference from transcript (language: ${language || 'en'})...`);
        const advisory = inferenceService.inferAdviceFromText(transcript, language, weatherContext);

        console.log(`✅ [${requestId}] Success in ${Date.now() - startTime}ms | Transcript: "${transcript.slice(0, 50)}..."`);

        return res.json({
            success: true,
            transcript,
            advisory: {
                condition: advisory.condition,
                confidence: advisory.confidence,
                recommendation: advisory.recommendation,
            },
        });
    } catch (error) {
        console.error(`❌ [${requestId}] Transcribe error after ${Date.now() - startTime}ms:`, error);
        const status = error.message.includes('HF_TOKEN') ? 503 : 500;
        return res.status(status).json({
            success: false,
            error: error.message || 'Transcription failed. Please try again.',
        });
    }
});

module.exports = router;
