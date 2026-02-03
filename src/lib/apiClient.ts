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
        if (error instanceof TypeError && error.message.includes('fetch')) {
            return {
                success: false,
                error: 'Cannot connect to analysis server. Please ensure the backend is running.'
            };
        }

        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error occurred'
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
