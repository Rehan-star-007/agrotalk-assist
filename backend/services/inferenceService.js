const fs = require('fs');
const path = require('path');
const { getAgriAdvice } = require('./openRouterService');

// Load Knowledge Base
let knowledgeBase = { crops: {}, topics: {} };
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

const VOICE_FALLBACK_ADVISORY = {
    condition: 'General Advice',
    confidence: 'Low',
    recommendation: 'I understood your question but I don\'t have specific details for that crop yet. Generally, ensure proper drainage, balanced nitrogen/phosphorus/potassium (NPK) fertilization, and monitor for pests weekly.'
};

/**
 * Identify the crop and the topic from the text.
 */
function extractCropAndTopic(text) {
    const normalized = (text || '').toLowerCase();
    let detectedCrop = null;
    let detectedTopic = 'care'; // default

    // Detect Crop
    for (const [cropKey, cropData] of Object.entries(knowledgeBase.crops)) {
        if (cropData.names.some(name => normalized.includes(name))) {
            detectedCrop = cropKey;
            break;
        }
    }

    // Detect Topic
    for (const [topicKey, keywords] of Object.entries(knowledgeBase.topics)) {
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
 */
async function inferAdviceFromText(text, language = 'en', weatherContext = null) {
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

    // 0. Weather-specific Knowledge Integration
    const weatherKeywords = ['weather', 'temperature', 'hot', 'cold', 'rain', 'humidity', 'forecast', 'climate', 'मौसम', 'तापमान', 'बारिश', 'तापमान', 'गर्मी', 'ठंड', 'வானிலை', 'வெப்பநிலை', 'மழை'];
    const wateringKeywords = ['water', 'watering', 'irrigation', 'sinchai', 'pani', 'நீர்ப்பாசனம்', 'தண்ணீர்'];

    const isWeatherQuery = weatherKeywords.some(kw => normalizedLower.includes(kw));
    const isWateringQuery = wateringKeywords.some(kw => normalizedLower.includes(kw));

    if (weatherContext && (isWeatherQuery || isWateringQuery)) {
        // Simple mapping for weather codes (Open-Meteo)
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
            recommendation = `தற்போதைய வெப்பநிலை ${Math.round(weatherContext.temp)}°C மற்றும் ${weatherDesc}. ஈரப்பதம் ${weatherContext.humidity}% ஆகும். `;
            if (isWateringQuery) {
                recommendation += weatherContext.temp > 30
                    ? "வெப்பம் அதிகமாக இருப்பதால், இன்று கூடுதல் நீர்ப்பாசனம் தேவைப்படலாம்."
                    : "மண்ணின் ஈரப்பதத்தை சரிபார்த்து தேவைப்பட்டால் மட்டும் தண்ணீர் ஊற்றவும்.";
            }
        } else if (lang === 'hi') {
            recommendation = `वर्तमान तापमान ${Math.round(weatherContext.temp)}°C है और ${weatherDesc} है। आर्द्रता ${weatherContext.humidity}% है। `;
            if (isWateringQuery) {
                recommendation += weatherContext.temp > 30
                    ? "गर्मी के कारण आज अतिरिक्त सिंचाई की आवश्यकता हो सकती है।"
                    : "सिंचाई से पहले मिट्टी की नमी की जांच कर लें।";
            }
        } else {
            recommendation = `The temperature is ${Math.round(weatherContext.temp)}°C with ${weatherDesc}. `;
            if (isWateringQuery) {
                recommendation += weatherContext.temp > 30
                    ? "It's quite hot, so your plants might need extra water today."
                    : "Check soil moisture before watering; the current conditions are moderate.";
            }
        }

        return {
            condition: `Local Wisdom: ${langNames[lang] || langNames['en']}`,
            confidence: 'High',
            recommendation: recommendation
        };
    }
    // 1. Check for General Agricultural Questions
    if (knowledgeBase.general) {
        const sortedConcepts = Object.keys(knowledgeBase.general).sort((a, b) => b.length - a.length);
        for (const concept of sortedConcepts) {
            if (normalizedLower.includes(concept)) {
                return {
                    condition: concept.charAt(0).toUpperCase() + concept.slice(1),
                    confidence: 'High',
                    recommendation: knowledgeBase.general[concept][lang] || knowledgeBase.general[concept]['en']
                };
            }
        }
    }

    const { crop, topic } = extractCropAndTopic(normalized);

    // 2. Precise Match from Knowledge Base (Crops)
    if (crop && knowledgeBase.crops[crop]) {
        const cropData = knowledgeBase.crops[crop];
        let adviceText = cropData[topic] ? cropData[topic][lang] : null;

        if (!adviceText && topic !== 'care') {
            adviceText = cropData['care'] ? cropData['care'][lang] : null;
        }

        if (adviceText) {
            const cropTitle = crop.charAt(0).toUpperCase() + crop.slice(1);
            return {
                condition: `Local Wisdom: ${cropTitle}`,
                confidence: 'High',
                recommendation: adviceText
            };
        }
    }

    // 3. Pattern Match Fallback
    for (const pattern of CONDITION_PATTERNS) {
        if (pattern.keywords.some(kw => normalizedLower.includes(kw))) {
            return {
                condition: `Local Wisdom: ${pattern.condition}`,
                confidence: 'Medium',
                recommendation: pattern.recommendation
            };
        }
    }

    // 4. AI Fallback (Premium Online Mode)
    if (process.env.OPENROUTER_API_KEY) {
        console.log(`🤔 No local match. Attempting AI Fallback in ${lang}...`);
        try {
            const aiResponse = await getAgriAdvice(normalized, weatherContext, null, 'image/jpeg', lang);
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

    // 5. Final Fallback
    const finalFallbacks = {
        en: "Sorry, I don't have specific info for that crop or topic yet. Try asking about watering, soil, or pests.",
        hi: "क्षमा करें, मुझे उस फसल या विषय के बारे में विशिष्ट जानकारी नहीं है। कृपया मिट्टी, पानी या कीटों के बारे में पूछें।",
        ta: "மன்னிக்கவும், அந்த பயிர் அல்லது தலைப்பு குறித்து என்னிடம் இன்னும் குறிப்பிட்ட தகவல் இல்லை. நீர்ப்பாசனம், மண் அல்லது பூச்சிகள் பற்றி கேட்டு முயற்சிக்கவும்.",
        te: "క్షమించండి, ఆ పంట లేదా అంశం గురించి నాకు ఇంకా నిర్దిష్ట సమాచారం లేదు. నీరు, నేల లేదా తెగుళ్ల గురించి అడిగి చూడండి.",
        mr: "क्षमस्व, माझ्याकडे अद्याप त्या पिकाबद्दल किंवा विषयाबद्दल विशिष्ट माहिती नाही. पाणी पिणे, माती किंवा कीड याबद्दल विचारण्याचा प्रयत्न करा."
    };

    return {
        condition: 'General Advice',
        confidence: 'Low',
        recommendation: finalFallbacks[lang] || finalFallbacks['en']
    };
}

module.exports = { inferAdvice, inferAdviceFromText };
