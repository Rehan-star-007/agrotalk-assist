/**
 * NVIDIA TTS Service
 * 
 * Generates natural human-like speech using NVIDIA Cloud APIs (NVIDIA NIM).
 */

/**
 * Generate speech audio using NVIDIA TTS API
 * 
 * @param {string} text - The text to convert to speech
 * @param {string} language - Language code (en, hi, ta, te, mr)
 * @returns {Buffer|null} - Audio buffer (mp3/wav) or null on failure
 */
async function generateNvidiaSpeech(text, language = 'en') {
    const apiKey = process.env.NVIDIA_API_KEY;
    const url = process.env.NVIDIA_TTS_URL || 'https://ai.api.nvidia.com/v1/audio/nvidia/tts';

    if (!apiKey) {
        console.warn('⚠️ NVIDIA_API_KEY missing in environment variables');
        return null;
    }

    // Clean text for TTS (remove markdown formatting)
    const cleanText = text
        .replace(/\*\*/g, '')
        .replace(/\*/g, '')
        .replace(/^[-•]\s*/gm, '')
        .replace(/#{1,6}\s*/g, '')
        .trim();

    // Map language codes and choose appropriate neutral voices
    const langConfig = {
        'en': { lang: 'en-US', voice: 'English-US.Female-1' },
        'hi': { lang: 'hi-IN', voice: 'Hindi-IN.Female-1' },
        'ta': { lang: 'ta-IN', voice: 'Tamil-IN.Female-1' },
        'te': { lang: 'te-IN', voice: 'Telugu-IN.Female-1' },
        'mr': { lang: 'mr-IN', voice: 'Marathi-IN.Female-1' }
    };

    const config = langConfig[language] || langConfig.en;

    try {
        console.log(`🔊 [NVIDIA TTS] Requesting speech for: "${cleanText.slice(0, 30)}..."`);
        console.log(`🌐 Config: ${config.lang} / ${config.voice}`);

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
                'Accept': 'audio/mpeg'
            },
            body: JSON.stringify({
                model: "nvidia/magpie-tts-en-us-100m-v1", // Default model
                text: cleanText,
                language: config.lang,
                voice: config.voice,
                response_format: "mp3"
            })
        });

        if (!response.ok) {
            let errText = "";
            try {
                const errBody = await response.json();
                errText = JSON.stringify(errBody);
            } catch (e) {
                errText = await response.text();
            }
            console.error(`❌ NVIDIA TTS API Error (${response.status}):`, errText);

            // Helpful hint for key issues
            if (response.status === 401 || response.status === 403) {
                console.error('🔑 Authentication failed. Please verify your NVIDIA API key in .env.nvidia');
            }

            return null;
        }

        const arrayBuffer = await response.arrayBuffer();
        console.log(`✅ Received audio buffer (${arrayBuffer.byteLength} bytes)`);
        return Buffer.from(arrayBuffer);

    } catch (error) {
        console.error('❌ NVIDIA TTS Service Exception:', error.message);
        return null;
    }
}

module.exports = { generateNvidiaSpeech };
