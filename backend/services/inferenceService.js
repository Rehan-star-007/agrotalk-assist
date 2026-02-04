const fs = require('fs');
const path = require('path');

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
function inferAdviceFromText(text, language = 'en', weatherContext = null) {
    const normalized = (text || '').trim();
    const normalizedLower = normalized.toLowerCase();

    if (!normalized) {
        return {
            condition: 'No audio',
            confidence: 'Low',
            recommendation: 'I didn\'t hear anything. Please try asking about your crop care or a specific problem.'
        };
    }

    const lang = language === 'hi' ? 'hi' : 'en';

    // 0. Weather-specific Knowledge Integration
    const weatherKeywords = ['weather', 'temperature', 'hot', 'cold', 'rain', 'humidity', 'forecast', 'climate', 'मौसम', 'तापमान', 'बारिश', 'तापमान', 'गर्मी', 'ठंड'];
    if (weatherContext && weatherKeywords.some(kw => normalizedLower.includes(kw))) {
        // Simple mapping for weather codes (Open-Meteo)
        const weatherLabels = {
            0: { en: 'Clear sky', hi: 'आसमान साफ है' },
            1: { en: 'Mainly clear', hi: 'मुख्य रूप से साफ' },
            2: { en: 'Partly cloudy', hi: 'आंशिक रूप से बादल' },
            3: { en: 'Overcast', hi: 'बादल छाए हुए हैं' },
            61: { en: 'Slight rain', hi: 'हल्की बारिश' },
            80: { en: 'Rain showers', hi: 'बारिश की बौछारें' }
        };
        const condition = weatherLabels[weatherContext.condition]?.[lang] || (lang === 'hi' ? 'मौसम अपडेट' : 'Weather Update');
        const recommendation = lang === 'hi'
            ? `वर्तमान तापमान ${Math.round(weatherContext.temp)}°C है और ${condition} है। आर्द्रता ${weatherContext.humidity}% है। यह आपकी कृषि योजना के लिए महत्वपूर्ण है।`
            : `The current temperature is ${Math.round(weatherContext.temp)}°C with ${condition}. Humidity is at ${weatherContext.humidity}%. This is useful data for your farming activities.`;

        return {
            condition: lang === 'hi' ? 'मौसम की जानकारी' : 'Current Weather Knowledge',
            confidence: 'High',
            recommendation: recommendation
        };
    }

    // 1. Check for General Agricultural Questions (e.g., "What is composting?")
    if (knowledgeBase.general) {
        // Sort concepts by length to match more specific (longer) phrases first
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

        // If specific topic not found for that crop, look for 'care'
        if (!adviceText && topic !== 'care') {
            adviceText = cropData['care'] ? cropData['care'][lang] : null;
        }

        if (adviceText) {
            const cropTitle = crop.charAt(0).toUpperCase() + crop.slice(1);
            const topicTitle = topic.charAt(0).toUpperCase() + topic.slice(1);
            return {
                condition: `${cropTitle} - ${topicTitle}`,
                confidence: 'High',
                recommendation: adviceText
            };
        }
    }

    // 3. Pattern Match Fallback (for generic issues like "yellow leaves" without crop name)
    for (const pattern of CONDITION_PATTERNS) {
        if (pattern.keywords.some(kw => normalizedLower.includes(kw))) {
            return {
                condition: pattern.condition,
                confidence: 'Medium',
                recommendation: pattern.recommendation
            };
        }
    }

    // 4. Final Fallback
    return {
        condition: 'General Advice',
        confidence: 'Low',
        recommendation: lang === 'hi'
            ? 'क्षमा करें, मुझे उस फसल या विषय के बारे में विशिष्ट जानकारी नहीं है। कृपया मिट्टी, पानी या कीटों के बारे में पूछें।'
            : 'Sorry, I don\'t have specific info for that crop or topic yet. Try asking about watering, soil, or pests.'
    };
}

module.exports = { inferAdvice, inferAdviceFromText };
