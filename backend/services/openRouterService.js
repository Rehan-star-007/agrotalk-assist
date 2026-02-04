// Using Node.js native fetch (Node 18+)

// OpenRouter Configuration
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const MODEL = 'google/gemini-2.0-flash-001'; // Fast, multimodal, cheap/free on OpenRouter often

/**
 * Get agricultural advice from AI (OpenRouter/Gemini)
 * 
 * @param {string} userQuery - The user's question
 * @param {object} weatherContext - { temp, condition, humidity }
 * @param {object} imageBuffer - Optional: Buffer of the image to analyze
 * @param {string} mimeType - Optional: Mime type of the image
 */
async function getAgriAdvice(userQuery, weatherContext, imageBuffer = null, mimeType = 'image/jpeg', language = 'en') {
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
        // Construct System Prompt with Weather Context
        let systemPrompt = `You are AgroBot, a warm and friendly expert agricultural companion. 
        Your tone should be helpful, conversational, and encouraging—like a knowledgeable friend talking to a farmer.

        PERSONALITY RULES:
        - Be concise but conversational.
        - Avoid sounding like a textbook; sound like a person.
        - Start with a friendly greeting or acknowledgment.
        - NEVER use generic intros like "Certainly," "Here is your advice," or "I can help with that." Just dive into the helpful conversation.
        
        LANGUAGE RULE: You MUST respond in ${targetLang}. 
        Even if the user query is in another language, your total answer must be in ${targetLang}.

        FORMATTING RULES:
        - Use Markdown bullet points (-) for clarity.
        - Use **bolding** for essential keywords.
        - Keep the total response under 120 words.`;

        if (weatherContext) {
            systemPrompt += `
            \nCURRENT LOCAL WEATHER:
            - Temperature: ${weatherContext.temp}°C
            - Condition Code: ${weatherContext.condition}
            - Humidity: ${weatherContext.humidity}%
            
            ADVICE RULE: You MUST consider this weather. For example, if it's raining (Code 50-99), warn against spraying pesticides. If it's hot (>30°C), suggest irrigation.`;
        }

        const messages = [
            {
                role: 'system',
                content: systemPrompt
            }
        ];

        // Construct User Message (Text + Optional Image)
        const userContent = [];

        // Add text
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

        console.log(`🤖 Sending ${targetLang} request to OpenRouter/Gemini...`);

        const response = await fetch(OPENROUTER_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'HTTP-Referer': 'http://localhost:3000', // Required by OpenRouter for ranking
                'X-Title': 'AgroTalk Assist',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: MODEL,
                messages: messages,
                temperature: 0.7,
                max_tokens: 1000
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

module.exports = { getAgriAdvice };
