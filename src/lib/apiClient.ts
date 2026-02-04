/**
 * API Client
 * 
 * Handles communication with the backend proxy server.
 * The backend handles all Hugging Face API calls to avoid CORS issues.
 */

const BACKEND_URL = 'http://localhost:3001';

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

export interface TranscribeResponse {
    success: boolean;
    transcript?: string;
    advisory?: AgriculturalAdvisory;
    error?: string;
}

/**
 * Analyze a crop image via the backend proxy
 * 
 * @param imageFile - The image file to analyze
 * @returns Analysis result with condition, confidence, and recommendation
 */
export async function analyzeImage(imageFile: File): Promise<AnalysisResponse> {
    console.log('📤 Sending image to backend for analysis...');
    console.log(`   File: ${imageFile.name} (${imageFile.type}, ${imageFile.size} bytes)`);

    try {
        // Create form data with image
        const formData = new FormData();
        formData.append('image', imageFile);

        // Send to backend
        const response = await fetch(`${BACKEND_URL}/analyze-image`, {
            method: 'POST',
            body: formData
            // No Content-Type header - browser sets it correctly for FormData
        });

        console.log(`📥 Backend response status: ${response.status}`);

        // Parse response
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

        // Check if it's a network error (backend not running)
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
 * @returns Transcript and advisory, or error
 */
export async function transcribeAndGetAdvice(
    audioBlob: Blob,
    language: string,
    weatherContext?: { temp: number; condition: number; humidity: number }
): Promise<TranscribeResponse> {
    console.log('📤 Sending audio to backend for transcription...');
    console.log(`   Blob: ${audioBlob.type}, ${audioBlob.size} bytes`);

    try {
        const formData = new FormData();
        formData.append('audio', audioBlob, 'recording.webm');
        formData.append('language', language);
        if (weatherContext) {
            formData.append('weatherData', JSON.stringify(weatherContext));
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
 * Useful for offline speech recognition or direct text chat.
 */
export async function getTextAdvice(
    text: string,
    language: string,
    weatherContext?: { temp: number; condition: number; humidity: number }
): Promise<TranscribeResponse> {
    console.log('📤 Sending text to backend for inference...');

    try {
        const formData = new FormData();
        formData.append('text', text);
        formData.append('language', language);
        if (weatherContext) {
            formData.append('weatherData', JSON.stringify(weatherContext));
        }

        const response = await fetch(`${BACKEND_URL}/transcribe`, {
            method: 'POST',
            body: formData,
        });

        const result = await response.json();

        if (!response.ok) {
            // Handle error, maybe local logic fell back to general?
            return {
                success: false,
                error: result.error || `Server error: ${response.status}`,
            };
        }

        // Return transcript (the text itself) and advice
        return {
            success: true,
            transcript: result.transcript,
            advisory: result.advisory as AgriculturalAdvisory,
        };

    } catch (error) {
        console.error('❌ Text inference failed:', error);
        if (error instanceof TypeError && (error.message.includes('fetch') || error.message.includes('Failed to fetch'))) {
            return {
                success: false,
                error: 'Cannot connect to server (Offline?).'
            };
        }
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        };
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
