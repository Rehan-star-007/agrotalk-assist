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
        // Enhanced System Prompt with formatting and dynamic knowledge
        let systemPrompt = `You are AgroBot, an expert agricultural assistant with a warm, conversational personality.

CORE IDENTITY:
- You are a helpful farming companion who can advise on ANY crop, plant, vegetable, or fruit.
- You have comprehensive knowledge about all agricultural topics worldwide.
- You speak like a friendly expert, not a textbook.

RESPONSE FORMATTING (CRITICAL):
- Use **bold** for key terms and important words
- Use bullet points (-) for lists
- Keep responses concise: 50-100 words max
- Structure with clear sections if needed
- NEVER start with "Certainly" or "Here is" - just dive into the advice

LANGUAGE RULE: 
You MUST respond in ${targetLang}. Even if the query is in another language, respond in ${targetLang}.

CONTEXT AWARENESS:
- If the user asks a follow-up like "why?" or "explain more", refer to your previous answer.
- Remember what crop or topic was discussed in this conversation.

AGRICULTURAL KNOWLEDGE:
- You can advise on ANY crop: common (potato, tomato) or exotic (dragon fruit, kiwi, avocado, passion fruit, etc.)
- Cover watering, soil, pests, diseases, harvesting, organic methods, and more
- Give practical, actionable advice`;

        if (weatherContext) {
            systemPrompt += `

CURRENT LOCAL WEATHER:
- Temperature: ${weatherContext.temp}°C
- Condition Code: ${weatherContext.condition}
- Humidity: ${weatherContext.humidity}%

WEATHER-AWARE ADVICE: Consider this weather when giving advice. Warn against spraying pesticides in rain (codes 50-99). Suggest extra watering if hot (>30°C).`;
        }

        const messages = [
            { role: 'system', content: systemPrompt }
        ];

        // Add conversation history for context
        if (conversationHistory && conversationHistory.length > 0) {
            // Keep last 6 messages for context (3 exchanges)
            const recentHistory = conversationHistory.slice(-6);
            for (const msg of recentHistory) {
                messages.push({
                    role: msg.role === 'user' ? 'user' : 'assistant',
                    content: typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content)
                });
            }
        }

        // Construct User Message
        const userContent = [];

        userContent.push({
            type: 'text',
            text: userQuery || "Analyze this crop situation."
        });

        // Add image if present
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

        console.log(`🤖 Sending ${targetLang} request to OpenRouter (${conversationHistory.length} history items)...`);

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
                temperature: 0.7,
                max_tokens: 500
            })
        });

        if (!response.ok) {
            const errText = await response.text();
            console.error('❌ OpenRouter API Error:', response.status, errText);
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
        console.error('❌ AI Service Exception:', error);
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
async function generateSpeech(text, voice = 'nova') {
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
                language: 'en', // You can pass language if available, defaulting to en
                gender: 'male'
            })
        });

        if (!response.ok) {
            console.warn(`⚠️ Python TTS failed (${response.status}). Is backend_py running with edge-tts installed?`);
            return null;
        }

        const data = await response.json();
        if (data.success && data.audio) {
            console.log(`✅ Generated TTS audio (${data.audio.length} bytes base64)`);
            return Buffer.from(data.audio, 'base64');
        }
        return null;

    } catch (error) {
        console.error('❌ TTS Service Exception:', error.message);
        return null; // Fail gracefully (client will fall back to browser TTS)
    }
}

module.exports = { getAgriAdvice, generateSpeech };
