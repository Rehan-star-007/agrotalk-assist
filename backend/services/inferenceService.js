const fs = require('fs');
const path = require('path');
const { getAgriAdvice, generateSpeech } = require('./openRouterService');

// Load Knowledge Base
let knowledgeBase = { crops: {}, topics: {}, general: {} };
try {
    const kbPath = path.join(__dirname, '../data/agricultural_knowledge.json');
    if (fs.existsSync(kbPath)) {
        knowledgeBase = JSON.parse(fs.readFileSync(kbPath, 'utf8'));
    }
} catch (err) {
    console.error('Failed to load agricultural knowledge base:', err);
}

// Pattern definitions for fallback agricultural conditions
const CONDITION_PATTERNS = [
    {
        keywords: ['yellow', 'yellowing', 'chlorosis', 'pale', 'faded', 'bleach'],
        condition: 'Possible Nutrient Deficiency',
        recommendation: 'The yellowing pattern suggests possible nitrogen or iron deficiency. Consider soil testing and apply appropriate fertilizer. Ensure proper watering schedule - neither too much nor too little. If yellowing spreads, consult a local agricultural extension office.'
    },
    {
        keywords: ['dry', 'dried', 'wilt', 'wilted', 'wilting', 'drought', 'parched'],
        condition: 'Water Stress Detected',
        recommendation: 'Signs of water stress observed. Increase irrigation frequency, preferably early morning or evening. Consider mulching to retain soil moisture. Check for root damage that may prevent water uptake.'
    },
    {
        keywords: ['brown', 'browning', 'necrosis', 'dead', 'dying', 'scorched', 'burnt'],
        condition: 'Leaf Damage / Environmental Stress',
        recommendation: 'Brown patches may indicate sunburn, frost damage, or chemical burn. If localized, prune affected areas. Ensure proper spacing for air circulation. Avoid pesticide application during hot days.'
    },
    {
        keywords: ['spot', 'spots', 'spotted', 'lesion', 'lesions', 'blotch', 'patch'],
        condition: 'Possible Fungal Infection',
        recommendation: 'Spotted patterns suggest fungal or bacterial infection. Remove and destroy affected leaves. Apply appropriate fungicide (copper-based for organic farming). Improve air circulation and avoid overhead watering.'
    },
    {
        keywords: ['mold', 'mildew', 'fungus', 'fungi', 'powdery', 'fuzzy', 'cottony'],
        condition: 'Mold/Mildew Infection',
        recommendation: 'Fungal growth detected. Apply neem oil or appropriate fungicide. Reduce humidity around plants if possible. Ensure adequate plant spacing. Remove severely affected plant parts.'
    },
    {
        keywords: ['insect', 'bug', 'pest', 'aphid', 'beetle', 'caterpillar', 'worm', 'larvae'],
        condition: 'Pest Infestation',
        recommendation: 'Pest presence detected. Inspect plants thoroughly for eggs and larvae. Consider introducing beneficial insects like ladybugs. Use neem oil spray as an organic control measure.'
    }
];

/**
 * Fuzzy crop name matching
 * Handles variations like "dragon fruit" vs "dragonfruit"
 */
function fuzzyMatchCrop(text) {
    const normalized = (text || '').toLowerCase().replace(/[\s-_]/g, '');

    for (const [cropKey, cropData] of Object.entries(knowledgeBase.crops || {})) {
        // Check exact names
        if (cropData.names && cropData.names.some(name => normalized.includes(name.toLowerCase().replace(/[\s-_]/g, '')))) {
            return cropKey;
        }
        // Check crop key itself
        if (normalized.includes(cropKey.replace(/[\s-_]/g, ''))) {
            return cropKey;
        }
    }
    return null;
}

/**
 * Identify the crop and the topic from the text.
 */
function extractCropAndTopic(text) {
    const normalized = (text || '').toLowerCase();

    // Detect Crop with fuzzy matching
    let detectedCrop = fuzzyMatchCrop(text);

    // Default topic
    let detectedTopic = 'care';

    // Detect Topic
    for (const [topicKey, keywords] of Object.entries(knowledgeBase.topics || {})) {
        if (keywords.some(kw => normalized.includes(kw))) {
            detectedTopic = topicKey;
            break;
        }
    }

    return { crop: detectedCrop, topic: detectedTopic };
}

/**
 * Infer agricultural advice from vision labels
 */
function inferAdvice(labels) {
    if (!labels || labels.length === 0) {
        return {
            condition: 'Analysis Complete',
            confidence: 'Low',
            recommendation: 'We analyzed your image but could not identify specific agricultural conditions. For best results, upload a clear, well-lit photo focusing on leaves or affected plant parts.'
        };
    }

    const labelText = labels.map(l => l.label.toLowerCase()).join(' ');
    const maxScore = Math.max(...labels.slice(0, 3).map(l => l.score));

    let bestMatch = null;
    let bestMatchScore = 0;

    for (const pattern of CONDITION_PATTERNS) {
        let matchCount = 0;
        for (const keyword of pattern.keywords) {
            if (labelText.includes(keyword)) matchCount++;
        }
        if (matchCount > bestMatchScore) {
            bestMatchScore = matchCount;
            bestMatch = pattern;
        }
    }

    if (bestMatch && bestMatchScore > 0) {
        return {
            condition: bestMatch.condition,
            confidence: maxScore > 0.5 ? 'High' : 'Medium',
            recommendation: bestMatch.recommendation
        };
    }

    const topLabel = labels[0].label;
    return {
        condition: `Detected: ${topLabel}`,
        confidence: 'Low',
        recommendation: `The analysis identified "${topLabel}" as the primary feature. For specific advice, ensure the image clearly shows any problem areas on leaves or stems.`
    };
}

/**
 * Advanced Dynamic Inference from Text
 * Now supports conversation history for context-aware responses
 */
async function inferAdviceFromText(text, language = 'en', weatherContext = null, conversationHistory = []) {
    const normalized = (text || '').trim();
    const normalizedLower = normalized.toLowerCase();

    if (!normalized) {
        return {
            condition: 'No audio',
            confidence: 'Low',
            recommendation: 'I didn\'t hear anything. Please try asking about your crop care or a specific problem.'
        };
    }

    const lang = ['hi', 'ta', 'te', 'mr'].includes(language) ? language : 'en';

    // 1. AI Assistant (Priority if History exists)
    // If we have conversation history, we MUST use AI to maintain context.
    // We removed the word count check to allow "Local Wisdom" (KB/Weather keys) to trigger for fresh queries.
    if (process.env.OPENROUTER_API_KEY && conversationHistory && conversationHistory.length > 0) {
        console.log(`🧠 Conversation History detected (${conversationHistory.length} items). Prioritizing AI.`);
        try {
            // We pass null for 'labels' as we are text-based here
            const aiResponse = await getAgriAdvice(normalized, weatherContext, null, 'image/jpeg', lang, conversationHistory);
            if (aiResponse) {
                return {
                    condition: 'AI Assistant (Conversational)',
                    confidence: 'High',
                    recommendation: aiResponse.text
                };
            }
        } catch (e) {
            console.error('❌ AI Priority Error:', e);
            // Fallthrough to local logic on error
        }
    }

    // 2. Precise Match from Knowledge Base (Crops)
    // We check this BEFORE weather fallback so "Dragon fruit water" gets crop info, not just generic weather info.
    const { crop, topic } = extractCropAndTopic(normalized);

    if (crop && knowledgeBase.crops[crop]) {
        const cropData = knowledgeBase.crops[crop];
        let adviceText = cropData[topic] ? cropData[topic][lang] : null;

        if (!adviceText && (topic !== 'care' && topic !== 'general')) {
            adviceText = cropData['care'] ? cropData['care'][lang] : null;
        }

        if (adviceText) {
            const cropTitle = crop.charAt(0).toUpperCase() + crop.slice(1);
            const formattedAdvice = `**${cropTitle} - ${topic.charAt(0).toUpperCase() + topic.slice(1)}**\n\n${adviceText}`;
            return {
                condition: `Local Wisdom: ${cropTitle}`,
                confidence: 'High',
                recommendation: formattedAdvice
            };
        }
    }

    // 3. Weather-integrated local response (Generic Fallback)
    // Only used if no history, no crop detected, and simple keywords found.
    const weatherKeywords = ['weather', 'temperature', 'hot', 'cold', 'rain', 'humidity', 'forecast', 'climate', 'मौसम', 'तापमान', 'बारिश', 'गर्मी', 'ठंड', 'வானிலை', 'வெப்பநிலை', 'மழை'];
    const wateringKeywords = ['water', 'watering', 'irrigation', 'sinchai', 'pani', 'நீர்ப்பாசனம்', 'தண்ணீர்'];

    const isWeatherQuery = weatherKeywords.some(kw => normalizedLower.includes(kw));
    const isWateringQuery = wateringKeywords.some(kw => normalizedLower.includes(kw));

    if (weatherContext && (isWeatherQuery || isWateringQuery)) {
        // ... (existing weather logic)
        const weatherLabels = {
            0: { en: 'Clear sky', hi: 'आसमान साफ है', ta: 'தெளிவான வானம்' },
            1: { en: 'Mainly clear', hi: 'मुख्य रूप से साफ', ta: 'பெரும்பாலும் தெளிவு' },
            2: { en: 'Partly cloudy', hi: 'आंशिक रूप से बादल', ta: 'ஓரளவு மேகமூட்டம்' },
            3: { en: 'Overcast', hi: 'बादल छाए हुए हैं', ta: 'மேகமூட்டம்' },
            61: { en: 'Slight rain', hi: 'हल्की बारिश', ta: 'லேசான மழை' },
            80: { en: 'Rain showers', hi: 'बारिश की बौछारें', ta: 'மழை' }
        };

        const langNames = { en: 'Weather Advisory', hi: 'मौसम की सलाह', ta: 'வானிலை ஆலோசனை' };
        const weatherDesc = weatherLabels[weatherContext.condition]?.[lang] || weatherLabels[weatherContext.condition]?.['en'] || 'Current Weather';

        let recommendation = '';
        if (lang === 'ta') {
            recommendation = `**தற்போதைய வெப்பநிலை:** ${Math.round(weatherContext.temp)}°C\n**நிலை:** ${weatherDesc}\n**ஈரப்பதம்:** ${weatherContext.humidity}%\n\n`;
            if (isWateringQuery) {
                recommendation += weatherContext.temp > 30
                    ? "- வெப்பம் அதிகமாக இருப்பதால், இன்று **கூடுதல் நீர்ப்பாசனம்** தேவைப்படலாம்."
                    : "- மண்ணின் ஈரப்பதத்தை சரிபார்த்து தேவைப்பட்டால் மட்டும் தண்ணீர் ஊற்றவும்.";
            }
        } else if (lang === 'hi') {
            recommendation = `**वर्तमान तापमान:** ${Math.round(weatherContext.temp)}°C\n**स्थिति:** ${weatherDesc}\n**आर्द्रता:** ${weatherContext.humidity}%\n\n`;
            if (isWateringQuery) {
                recommendation += weatherContext.temp > 30
                    ? "- गर्मी के कारण आज **अतिरिक्त सिंचाई** की सलाह है."
                    : "- सिंचाई से पहले **मिट्टी की नमी** की जांच कर लें.";
            }
        } else {
            recommendation = `**Current Temperature:** ${Math.round(weatherContext.temp)}°C\n**Condition:** ${weatherDesc}\n**Humidity:** ${weatherContext.humidity}%\n\n`;
            if (isWateringQuery) {
                recommendation += weatherContext.temp > 30
                    ? "- It's quite hot, so your plants likely need **extra water** today.\n- Water in the **early morning** to reduce evaporation."
                    : "- Check **soil moisture** before watering.\n- Current conditions are moderate.";
            }
        }

        return {
            condition: `Local Wisdom: ${langNames[lang] || langNames['en']}`,
            confidence: 'High',
            recommendation: recommendation
        };
    }

    // 4. Pattern Match Fallback
    for (const pattern of CONDITION_PATTERNS) {
        if (pattern.keywords.some(kw => normalizedLower.includes(kw))) {
            return {
                condition: `Local Wisdom: ${pattern.condition}`,
                confidence: 'Medium',
                recommendation: pattern.recommendation
            };
        }
    }

    // 5. Final AI Attempt (if skipped earlier due to short length)
    if (process.env.OPENROUTER_API_KEY) {
        // ... (existing AI fallback)
        try {
            const aiResponse = await getAgriAdvice(normalized, weatherContext, null, 'image/jpeg', lang, conversationHistory);
            if (aiResponse) {
                return {
                    condition: 'AI Assistant',
                    confidence: 'High',
                    recommendation: aiResponse.text
                };
            }
        } catch (e) {
            console.error('❌ AI Fallback Error:', e);
        }
    }

    // Final Fallback - only if AI also fails
    const finalFallbacks = {
        en: "I couldn't find specific information for that query. Try asking about:\n- **Watering** schedules\n- **Pest** control\n- **Soil** requirements\n- Specific crops like potato, tomato, or dragon fruit",
        hi: "क्षमा करें, मुझे इसके बारे में जानकारी नहीं मिली। पूछने का प्रयास करें:\n- **सिंचाई** के बारे में\n- **कीट** नियंत्रण\n- **मिट्टी** की आवश्यकताएं",
        ta: "மன்னிக்கவும், அந்த தகவல் கிடைக்கவில்லை। கேட்டு முயற்சிக்கவும்:\n- **நீர்ப்பாசனம்**\n- **பூச்சி** கட்டுப்பாடு",
        te: "క్షమించండి, ఆ సమాచారం లేదు. అడిగి చూడండి:\n- **నీరు** పెట్టడం\n- **తెగుళ్ళు**",
        mr: "क्षमस्व, माहिती मिळाली नाही. विचारून पहा:\n- **पाणी** देणे\n- **कीड** नियंत्रण"
    };

    return {
        condition: 'General Advice',
        confidence: 'Low',
        recommendation: finalFallbacks[lang] || finalFallbacks['en']
    };
}

module.exports = { inferAdvice, inferAdviceFromText, generateSpeech };
