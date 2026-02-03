/**
 * Agricultural Inference Service
 * 
 * Converts vision labels into agricultural advice
 * using rule-based pattern matching.
 */

// Pattern definitions for agricultural conditions
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
        keywords: ['rust', 'rusty', 'orange', 'reddish'],
        condition: 'Rust Disease Suspected',
        recommendation: 'Orange-rust coloring indicates possible rust fungus. Apply sulfur-based or approved fungicide immediately. Remove heavily infected leaves. Ensure good air circulation between plants.'
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
    },
    {
        keywords: ['healthy', 'green', 'fresh', 'vibrant', 'lush', 'thriving'],
        condition: 'Healthy Plant',
        recommendation: 'Your crop appears healthy! Continue current care practices. Maintain consistent watering schedule. Monitor regularly for early signs of stress. Consider preventive organic treatments.'
    },
    {
        keywords: ['leaf', 'leaves', 'foliage', 'plant', 'vegetation', 'grass', 'tree', 'flower'],
        condition: 'General Plant Identified',
        recommendation: 'Plant foliage detected. For specific disease diagnosis, ensure the image clearly shows any problem areas. Take close-up photos of affected leaves. Good lighting helps accurate analysis.'
    }
];

// Fallback advisory
const FALLBACK_ADVISORY = {
    condition: 'Analysis Complete',
    confidence: 'Low',
    recommendation: 'We analyzed your image but could not identify specific agricultural conditions. For best results, upload a clear, well-lit photo focusing on leaves or affected plant parts.'
};

/**
 * Infer agricultural advice from vision labels
 * 
 * @param {Array<{label: string, score: number}>} labels
 * @returns {{condition: string, confidence: string, recommendation: string}}
 */
function inferAdvice(labels) {
    if (!labels || labels.length === 0) {
        return FALLBACK_ADVISORY;
    }

    // Combine all labels into searchable text
    const labelText = labels.map(l => l.label.toLowerCase()).join(' ');

    // Get max confidence score
    const maxScore = Math.max(...labels.slice(0, 3).map(l => l.score));

    // Find best matching pattern
    let bestMatch = null;
    let bestMatchScore = 0;

    for (const pattern of CONDITION_PATTERNS) {
        let matchCount = 0;
        for (const keyword of pattern.keywords) {
            if (labelText.includes(keyword)) {
                matchCount++;
            }
        }

        if (matchCount > bestMatchScore) {
            bestMatchScore = matchCount;
            bestMatch = pattern;
        }
    }

    // Determine confidence level
    let confidence;
    if (maxScore >= 0.5 && bestMatchScore >= 2) {
        confidence = 'High';
    } else if (maxScore >= 0.2 || bestMatchScore >= 1) {
        confidence = 'Medium';
    } else {
        confidence = 'Low';
    }

    // Return matched pattern or fallback
    if (bestMatch && bestMatchScore > 0) {
        return {
            condition: bestMatch.condition,
            confidence,
            recommendation: bestMatch.recommendation
        };
    }

    // No pattern matched - use top label
    const topLabel = labels[0].label;
    return {
        condition: `Detected: ${topLabel.charAt(0).toUpperCase() + topLabel.slice(1)}`,
        confidence: 'Low',
        recommendation: `The analysis identified "${topLabel}" as the primary feature. For agricultural advice specific to crop diseases, please upload a clear image of leaves or affected plant parts.`
    };
}

module.exports = { inferAdvice };
