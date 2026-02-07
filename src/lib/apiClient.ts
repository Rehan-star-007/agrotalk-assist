/**
 * API Client (Enhanced)
 * 
 * Handles communication with the backend proxy server.
 * Now supports conversation history for context-aware AI responses.
 */

const BACKEND_URL = 'http://localhost:3001';

import localWisdomData from '@/data/offline_knowledge.json';
import { localWisdom, WisdomItem } from '@/data/localWisdom';
import { dbService } from '@/services/db';
import { syncService } from '@/services/syncService';
import { ttsCacheService } from '@/services/ttsCacheService';

// Combine legacy wisdom with new JSON data for broader search
const combinedWisdom = [
    ...localWisdom,
    ...localWisdomData.map(item => ({
        keywords: item.keywords,
        language: 'en', // default mapping
        response: item.answer // Map the answer object
    }))
];

export interface VisionLabel {
    label: string;
    score: number;
}

export interface AgriculturalAdvisory {
    condition: string;
    confidence: 'Low' | 'Medium' | 'High';
    recommendation: string;
}

export interface AnalysisResponse {
    success: boolean;
    data?: AgriculturalAdvisory;
    labels?: VisionLabel[];
    error?: string;
}

export interface ConversationMessage {
    role: 'user' | 'assistant';
    content: string;
}

export interface TranscribeResponse {
    success: boolean;
    transcript?: string;
    advisory?: AgriculturalAdvisory;
    audio?: string; // Base64 MP3 audio from TTS
    error?: string;
}

/**
 * Analyze a crop image via the backend proxy
 */
export async function analyzeImage(imageFile: File): Promise<AnalysisResponse> {
    console.log('📤 Sending image to backend for analysis...');
    console.log(`   File: ${imageFile.name} (${imageFile.type}, ${imageFile.size} bytes)`);

    try {
        const formData = new FormData();
        formData.append('image', imageFile);

        const response = await fetch(`${BACKEND_URL}/analyze-image`, {
            method: 'POST',
            body: formData
        });

        console.log(`📥 Backend response status: ${response.status}`);

        const result = await response.json();
        console.log('📥 Backend response:', result);

        if (!response.ok) {
            return {
                success: false,
                error: result.error || `Server error: ${response.status}`
            };
        }

        return result as AnalysisResponse;

    } catch (error) {
        console.error('❌ Failed to connect to backend:', error);

        if (error instanceof TypeError && (error.message.includes('fetch') || error.message.includes('Failed to fetch'))) {
            return {
                success: false,
                error: 'Cannot connect to analysis server (port 3001). Please ensure the backend is running by executing run_app.bat.'
            };
        }

        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error occurred'
        };
    }
}

/**
 * Transcribe audio and get agricultural advice from spoken query.
 *
 * @param audioBlob - Recorded audio blob (e.g. audio/webm)
 * @param language - UI language hint (e.g. 'en', 'hi')
 * @param weatherContext - Current weather data
 * @param conversationHistory - Previous conversation for context
 * @param useTts - Whether to request natural TTS audio
 */
export async function transcribeAndGetAdvice(
    audioBlob: Blob,
    language: string,
    weatherContext?: { temp: number; condition: number; humidity: number },
    conversationHistory: ConversationMessage[] = [],
    useTts: boolean = true,
    conversationId?: string,
    voice?: string
): Promise<TranscribeResponse> {
    console.log('📤 Sending audio to backend for transcription...');
    console.log(`   Blob: ${audioBlob.type}, ${audioBlob.size} bytes`);

    try {
        const formData = new FormData();
        formData.append('audio', audioBlob, 'recording.webm');
        formData.append('language', language);
        formData.append('useTts', useTts.toString());

        if (weatherContext) {
            formData.append('weatherData', JSON.stringify(weatherContext));
        }

        if (conversationHistory.length > 0) {
            formData.append('conversationHistory', JSON.stringify(conversationHistory));
        }

        if (conversationId) {
            formData.append('conversationId', conversationId);
        }

        if (voice) {
            formData.append('voice', voice);
        }

        const response = await fetch(`${BACKEND_URL}/transcribe`, {
            method: 'POST',
            body: formData,
        });

        const result = await response.json();

        if (!response.ok) {
            return {
                success: false,
                error: result.error || `Server error: ${response.status}`,
            };
        }

        if (!result.transcript || !result.advisory) {
            return {
                success: false,
                error: 'Invalid response from server.',
            };
        }

        return {
            success: true,
            transcript: result.transcript,
            advisory: result.advisory as AgriculturalAdvisory,
            audio: result.audio || undefined
        };
    } catch (error) {
        console.error('❌ Transcribe request failed:', error);
        if (error instanceof TypeError && (error.message.includes('fetch') || error.message.includes('Failed to fetch'))) {
            return {
                success: false,
                error: 'Cannot connect to transcription server (port 3001). Please ensure the backend is running by executing run_app.bat.',
            };
        }
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error occurred',
        };
    }
}

/**
 * Get agricultural advice from text (bypassing speech-to-text)
 * Now supports conversation history for context-aware responses.
 * 
 * @param text - User's text query
 * @param language - UI language
 * @param weatherContext - Current weather data
 * @param conversationHistory - Previous conversation for context
 * @param useTts - Whether to request natural TTS audio
 */

export async function getTextAdvice(
    text: string,
    language: string = 'en',
    weatherContext?: any,
    conversationHistory: ConversationMessage[] = [],
    useTts: boolean = true,
    conversationId?: string,
    voice?: string
): Promise<TranscribeResponse> {
    console.log('📤 Sending text to backend for inference...');
    console.log(`   History items: ${conversationHistory.length}`);

    // 1. Check Offline Status (Physical or Forced)
    const isForcedOffline = localStorage.getItem('agro_force_offline') === 'true';
    if (!navigator.onLine || isForcedOffline) {
        console.log(`⚠️ Offline Mode (${isForcedOffline ? 'Forced' : 'Physical'}): Searching Local Wisdom...`);

        const lowerText = text.toLowerCase();
        let offlineResponse = "";

        // A. Check for Weather keywords -> Return cached weather if exists
        if (lowerText.includes('weather') || lowerText.includes('rain') || lowerText.includes('temperature') || lowerText.includes('mausam')) {
            try {
                const weather = await dbService.get('weather_cache', 'current');
                if (weather && weather.data) {
                    const t = weather.data.current;
                    offlineResponse = language === 'hi'
                        ? `अभी का तापमान ${t.temperature_2m}°C है और नमी ${t.relative_humidity_2m}% है। (आखिरी अपडेट: ${new Date(weather.lastUpdated).toLocaleTimeString()})`
                        : `Current temperature is ${t.temperature_2m}°C with ${t.relative_humidity_2m}% humidity. (Last updated: ${new Date(weather.lastUpdated).toLocaleTimeString()})`;
                } else {
                    const weatherWisdom = localWisdom.find(w => w.keywords.includes('weather'));
                    if (weatherWisdom) offlineResponse = weatherWisdom.response[language as keyof typeof weatherWisdom.response] || weatherWisdom.response.en;
                }
            } catch (e) {
                console.error("Offline Weather fetch failed", e);
            }
        }

        // B. Check for Market keywords -> Direct user to Mandi tab match
        if (!offlineResponse && (lowerText.includes('price') || lowerText.includes('rate') || lowerText.includes('market') || lowerText.includes('mandi') || lowerText.includes('bhav'))) {
            const marketWisdom = localWisdom.find(w => w.keywords.includes('market'));
            if (marketWisdom) offlineResponse = marketWisdom.response[language as keyof typeof marketWisdom.response] || marketWisdom.response.en;
        }

        // C. Check for cached AI response from previous queries
        if (!offlineResponse) {
            const queryHash = syncService.hashQuery(lowerText);
            const cachedResponse = await syncService.getCachedAIResponse(queryHash);
            if (cachedResponse) {
                console.log('📦 Found cached AI response for offline use');
                // Try to get cached TTS audio too
                const cachedAudio = ttsCacheService.getCachedAudio(cachedResponse);
                return {
                    success: true,
                    transcript: text,
                    advisory: {
                        recommendation: cachedResponse,
                        condition: 'Cached Response',
                        confidence: 'High'
                    },
                    audio: cachedAudio || undefined
                };
            }
        }

        // D. Fuzzy Match with Combined Knowledge Base (JSON + Legacy)
        if (!offlineResponse) {
            // Smart Keyword Matching: Rank by number of matched keywords
            // This ensures "tomato blight" matches specific entry rather than generic "tomato"
            const scoredMatches = localWisdomData.map(item => {
                const matchCount = item.keywords.reduce((acc, k) => {
                    return lowerText.includes(k.toLowerCase()) ? acc + 1 : acc;
                }, 0);
                return { item, score: matchCount };
            });

            // Filter matches with at least one keyword, sort by score descending
            const bestMatch = scoredMatches
                .filter(m => m.score > 0)
                .sort((a, b) => b.score - a.score)[0];

            if (bestMatch) {
                offlineResponse = (bestMatch.item.answer as any)[language] || bestMatch.item.answer.en;
            } else {
                // Fallback to legacy localWisdom if no JSON match
                const legacyMatch = localWisdom.find(item => item.keywords.some(k => lowerText.includes(k)));
                if (legacyMatch) {
                    offlineResponse = (legacyMatch.response as any)[language] || legacyMatch.response.en;
                }
            }
        }

        // E. Fallback if no match found
        if (!offlineResponse) {
            const fallbacks = {
                en: "I am currently offline. I can help with general advice about pests like Blight, Rust, or Stem Borer. Please check your internet connection for full AI support.",
                hi: "मैं अभी ऑफ़लाइन हूँ। मैं ब्लाइट, रतुआ या तना छेदक जैसे कीटों के बारे में सामान्य सलाह दे सकता हूँ। कृपया पूर्ण AI सहायता के लिए अपना इंटरनेट कनेक्शन जांचें।",
                ta: "நான் இப்போது ஆஃப்லைனில் இருக்கிறேன். பூச்சிகள் பற்றிய பொதுவான ஆலோசனைகளை என்னால் கூற முடியும். முழுமையான உதவிக்கு இணையத்தை சரிபார்க்கவும்.",
                te: "నేను ప్రస్తుతం ఆఫ్‌లైన్‌లో ఉన్నాను. నేను తెగుళ్ళ గురించి సాధారణ సలహా ఇవ్వగలను. పూర్తి సహాయం కోసం దయచేసి ఇంటర్నెట్ తనిఖీ చేయండి.",
                mr: "मी सध्या ऑफलाइन आहे. मी कीडींबद्दल सामान्य सल्ला देऊ शकतो. कृपया पूर्ण मदतीसाठी इंटरनेट तपासा."
            };
            // Use type assertion or direct access if strict typing is an issue, assume simple object here
            offlineResponse = (fallbacks as any)[language] || fallbacks.en;
        }

        // Try to find cached TTS audio for the response text
        const cachedTtsAudio = ttsCacheService.getCachedAudio(offlineResponse);

        // Return the offline response
        return {
            success: true,
            transcript: text,
            advisory: {
                recommendation: offlineResponse,
                condition: 'Offline Mode',
                confidence: 'High'
            },
            audio: cachedTtsAudio || undefined
        };
    }

    try {
        const formData = new FormData();
        formData.append('text', text);
        formData.append('language', language);
        formData.append('useTts', useTts.toString());

        if (weatherContext) {
            formData.append('weatherData', JSON.stringify(weatherContext));
        }

        if (conversationHistory.length > 0) {
            formData.append('conversationHistory', JSON.stringify(conversationHistory));
        }

        if (conversationId) {
            formData.append('conversationId', conversationId);
        }

        if (voice) {
            formData.append('voice', voice);
        }

        const response = await fetch(`${BACKEND_URL}/transcribe`, {
            method: 'POST',
            body: formData,
        });

        const result = await response.json();

        if (!response.ok) {
            // Fallback to offline logic if server error (assuming connectivity issue roughly)
            // or just return error
            return {
                success: false,
                error: result.error || `Server error: ${response.status}`,
            };
        }

        // Cache the AI response for offline replay
        if (result.advisory?.recommendation) {
            const queryHash = syncService.hashQuery(text);
            syncService.cacheAIResponse(queryHash, text, result.advisory.recommendation);

            // Cache TTS audio if present
            if (result.audio) {
                ttsCacheService.cacheAudio(result.advisory.recommendation, result.audio, language);
            }
        }

        return {
            success: true,
            transcript: result.transcript,
            advisory: result.advisory as AgriculturalAdvisory,
            audio: result.audio || undefined
        };

    } catch (error) {
        console.error('❌ Text inference failed:', error);

        // If fetch fails (network error), fallback to RECURSIVE call to offline logic?
        // OR just duplicate logic? Duplicating logic for robustness here or refactoring common handler.
        // For simplicity in this edit, let's just return a generic offline error message or 
        // ideally we would call the offline handler. 
        // Given the constraints, let's just return a "Network Error" but prompt user to check offline mode.

        return {
            success: false,
            error: 'Connection failed. Please check your internet or try again later.'
        };
    }
}

/**
 * Get natural TTS audio from NVIDIA cloud
 * Returns a Blob containing the MP3 audio
 */
export async function getNvidiaTts(text: string, language: string = 'en'): Promise<Blob | null> {
    try {
        const response = await fetch(`${BACKEND_URL}/api/tts`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ text, language })
        });

        if (!response.ok) return null;
        return await response.blob();
    } catch (error) {
        console.error('❌ NVIDIA TTS Fetch failed:', error);
        return null;
    }
}

/**
 * Check if backend is available
 */
export async function checkBackendHealth(): Promise<boolean> {
    try {
        const response = await fetch(`${BACKEND_URL}/health`, {
            method: 'GET'
        });
        return response.ok;
    } catch {
        return false;
    }
}
