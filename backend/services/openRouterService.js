/**
 * OpenRouter AI Service (Enhanced with Context & Natural TTS)
 * 
 * Features:
 * - Conversation history for context-aware responses
 * - Dynamic agricultural advice for ANY crop
 * - Markdown-formatted responses
 * - Natural human-like TTS via OpenAI
 */

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const MODEL = 'google/gemini-2.0-flash-001';

// OpenAI TTS Configuration
const OPENAI_TTS_URL = 'https://api.openai.com/v1/audio/speech';
const TTS_VOICE = 'nova'; // Options: alloy, echo, fable, onyx, nova, shimmer

/**
 * Get agricultural advice from AI with conversation context
 * 
 * @param {string} userQuery - The user's question
 * @param {object} weatherContext - { temp, condition, humidity }
 * @param {object} imageBuffer - Optional: Buffer of the image to analyze
 * @param {string} mimeType - Optional: Mime type of the image
 * @param {string} language - Language code (en, hi, ta, te, mr)
 * @param {Array} conversationHistory - Previous messages for context
 */
async function getAgriAdvice(userQuery, weatherContext, imageBuffer = null, mimeType = 'image/jpeg', language = 'en', conversationHistory = []) {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
        console.error('❌ OPENROUTER_API_KEY missing');
        return null;
    }

    const languageNames = {
        'en': 'English',
        'hi': 'Hindi',
        'ta': 'Tamil',
        'te': 'Telugu',
        'mr': 'Marathi'
    };

    const targetLang = languageNames[language] || 'English';

    try {
        // Human AI prompt for quick chat
        let systemPrompt = `You are AgroTalk, a friendly farming buddy. 
        
        RULES:
        1. Speak naturally like a friend. 
        2. Keep it VERY CONCISE: Max 2-3 sentences.
        3. NO MARKDOWN: No bold (**), no headers (#), no bullet points. Plain text ONLY.
        4. Use contractions (it's, you're).
        5. Respond ONLY in ${targetLang}.`;

        if (weatherContext) {
            systemPrompt += `\nWeather: ${weatherContext.temp}°C, humidity ${weatherContext.humidity}%. Give advice considering this.`;
        }

        const messages = [
            { role: 'system', content: systemPrompt }
        ];

        // Context
        if (conversationHistory && conversationHistory.length > 0) {
            const recentHistory = conversationHistory.slice(-6);
            for (const msg of recentHistory) {
                messages.push({
                    role: msg.role === 'user' ? 'user' : 'assistant',
                    content: typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content)
                });
            }
        }

        const userContent = [{
            type: 'text',
            text: userQuery || "Analyze this."
        }];

        if (imageBuffer) {
            const base64Image = imageBuffer.toString('base64');
            userContent.push({
                type: 'image_url',
                image_url: {
                    url: `data:${mimeType};base64,${base64Image}`
                }
            });
        }

        messages.push({
            role: 'user',
            content: userContent
        });

        console.log(`🤖 Sending ${targetLang} request (max 180 tokens)...`);

        const response = await fetch(OPENROUTER_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'HTTP-Referer': 'http://localhost:3000',
                'X-Title': 'AgroTalk Assist',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: MODEL,
                messages: messages,
                temperature: 0.8,
                max_tokens: 180
            })
        });

        if (!response.ok) {
            const errText = await response.text();
            console.error('❌ OpenRouter Error:', response.status, errText);
            return null;
        }

        const data = await response.json();
        if (data.choices && data.choices.length > 0) {
            return {
                text: data.choices[0].message.content,
                model: data.model
            };
        }
        return null;

    } catch (error) {
        console.error('❌ AI Service Error:', error);
        return null;
    }
}

/**
 * Generate natural human-like speech using local Python Backend (Edge-TTS)
 * Free, high-quality, and unlimited.
 * 
 * @param {string} text - Text to convert to speech
 * @param {string} voice - Voice name (ignored, handled by Python backend mapping)
 * @returns {Buffer|null} - Audio buffer (mp3) or null on failure
 */
async function generateSpeech(text, language = 'en', gender = 'male') {
    // Clean text for TTS (remove markdown)
    const cleanText = text
        .replace(/\*\*/g, '')
        .replace(/\*/g, '')
        .replace(/^[-•]\s*/gm, '')
        .replace(/#{1,6}\s*/g, '')
        .trim();

    console.log(`🔊 Generating speech via Python Backend...`);

    try {
        const response = await fetch('http://localhost:8000/api/tts', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                text: cleanText.slice(0, 4000), // Max chars
                language: language,
                gender: gender
            })
        });

        if (!response.ok) {
            console.warn(`⚠️ Python TTS failed(${response.status}).Is backend_py running with edge - tts installed ? `);
            return null;
        }

        const data = await response.json();
        if (data.success && data.audio) {
            console.log(`✅ Generated TTS audio(${data.audio.length} bytes base64)`);
            return Buffer.from(data.audio, 'base64');
        }
        return null;

    } catch (error) {
        console.error('❌ TTS Service Exception:', error.message);
        return null; // Fail gracefully (client will fall back to browser TTS)
    }
}

/**
 * Analyze mandi market prices using AI
 * 
 * @param {object} mandiData - The market record to analyze
 * @param {string} language - Language code
 */
async function getMarketAnalysis(mandiData, language = 'en') {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
        console.error('❌ OPENROUTER_API_KEY missing');
        return null;
    }

    const languageNames = {
        'en': 'English',
        'hi': 'Hindi',
        'ta': 'Tamil',
        'te': 'Telugu',
        'mr': 'Marathi'
    };
    const targetLang = languageNames[language] || 'English';

    if (!mandiData || !mandiData.modal_price) {
        return { text: "Market price data is currently unavailable." };
    }

    try {
        const { commodity, market, min_price, max_price, modal_price, arrival_date, district, state } = mandiData;

        // Normalize to /kg (assuming input is /quintal as per Data.gov.in standard)
        const modalPerKg = (parseFloat(modal_price) / 100).toFixed(2);
        const minPerKg = (parseFloat(min_price) / 100).toFixed(2);
        const maxPerKg = (parseFloat(max_price) / 100).toFixed(2);

        const systemPrompt = `You are an agricultural market advisor. Use ONLY the provided mandi data to explain and analyze the market. NEVER guess, estimate, or hallucinate prices. If data is missing or empty, respond with: "Market price data is currently unavailable."
        
        OUTPUT RULES:
        - Must be short, farmer-friendly, and neutral in tone.
        - Generate a natural-language explanation in ${targetLang}.
        - Include: 
          1. Current price summary 
          2. Trend interpretation (high / medium / low based on where modal price sits in range)
          3. Basic selling advice (sell / wait / monitor)
        - DO NOT fetch or mention external prices.`;

        const userPrompt = `
        MARKET DATA:
        - Crop: ${commodity}
        - Market: ${market}, ${district}, ${state}
        - Date: ${arrival_date}
        - Prices: ₹${modal_price}/quintal (₹${modalPerKg}/kg)
        - Price Range: ₹${min_price} - ₹${max_price}/quintal (₹${minPerKg} - ₹${maxPerKg}/kg)
        `;

        console.log(`📊 Analyzing market data for ${commodity} in ${targetLang}...`);

        const response = await fetch(OPENROUTER_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'HTTP-Referer': 'http://localhost:3000',
                'X-Title': 'AgroTalk Assist',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: MODEL,
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userPrompt }
                ],
                temperature: 0.3,
                max_tokens: 300
            })
        });

        if (!response.ok) {
            const errText = await response.text();
            console.error('❌ OpenRouter API Error (Market):', response.status, errText);
            return null;
        }

        const data = await response.json();
        if (data.choices && data.choices.length > 0) {
            return {
                text: data.choices[0].message.content,
                model: data.model
            };
        }
        return null;

    } catch (error) {
        console.error('❌ Market AI Exception:', error);
        return null;
    }
}

module.exports = { getAgriAdvice, generateSpeech, getMarketAnalysis };
