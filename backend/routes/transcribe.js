/**
 * Voice Transcription Route
 *
 * POST /transcribe
 * Accepts multipart form data with an audio file OR text.
 * Returns transcript and agricultural advisory.
 */

const express = require('express');
const multer = require('multer');
const transcriptionService = require('../services/transcriptionService');
const inferenceService = require('../services/inferenceService');

const router = express.Router();

const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB (allow for images)
    },
});

// Allow both audio and image fields
const uploadFields = upload.fields([
    { name: 'audio', maxCount: 1 },
    { name: 'image', maxCount: 1 }
]);

router.post('/', uploadFields, async (req, res) => {
    const requestId = Math.random().toString(36).substring(7);
    console.log(`\n📥 [${requestId}] Received request`);

    try {
        let transcript = null;

        // 1. Check for Text Input (from Offline STT or Text Chat)
        if (req.body.text) {
            transcript = req.body.text;
            console.log(`📝 Received Text: "${transcript.slice(0, 50)}..."`);
        }
        // 2. Check for Audio File
        else if (req.files && req.files.audio) {
            const audioFile = req.files.audio[0];
            console.log(`🎤 Processing Audio: ${audioFile.originalname}`);
            try {
                const result = await transcriptionService.transcribe(audioFile.buffer, audioFile.mimetype);
                transcript = result.transcript;
            } catch (err) {
                console.error('❌ Transcription failed:', err);
                return res.status(503).json({ success: false, error: 'Transcription failed' });
            }
        }
        else {
            return res.status(400).json({ success: false, error: 'No input provided (text or audio)' });
        }

        // 3. Process Context
        const { language, weatherData } = req.body;
        let weatherContext;
        if (weatherData) {
            try { weatherContext = JSON.parse(weatherData); } catch (e) { }
        }

        console.log(`🌾 Inferring advice for: "${transcript}"`);

        // 4. Get Advisory (Local -> AI)
        // Note: We ignore the image here for now, but the infrastructure is ready in openRouterService
        // Ideally we pass the image buffer to inferAdviceFromText if we want multimodal

        const advisory = await inferenceService.inferAdviceFromText(transcript, language, weatherContext);

        console.log(`✅ [${requestId}] Success`);

        return res.json({
            success: true,
            transcript,
            advisory
        });

    } catch (error) {
        console.error(`❌ [${requestId}] Error:`, error);
        return res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;
