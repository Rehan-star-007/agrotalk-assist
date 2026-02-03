/**
 * Vision Analysis Module (FRONTEND)
 * 
 * connect to Python YOLO Backend
 */

export interface DiseaseAnalysis {
  disease_name: string;
  disease_name_hindi: string;
  confidence: number;
  severity: "low" | "medium" | "high";
  description: string;
  description_hindi: string;
  symptoms: string[];
  symptoms_hindi: string[];
  treatment_steps: string[];
  treatment_steps_hindi: string[];
  organic_options: string[];
  organic_options_hindi: string[];
  crop_identified?: string;
  prevention_tips: string[];
  prevention_tips_hindi: string[];
}

export interface VisionAnalysisResult {
  success: boolean;
  analysis?: DiseaseAnalysis;
  processed_image?: string;
  error?: string;
}

/**
 * Analyzes an image by sending it to the Python YOLO backend.
 */
export async function analyzeImage(imageFile: File): Promise<VisionAnalysisResult> {
  try {
    // Convert file to base64
    const base64Image = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(imageFile);
    });

    // Call Python Backend
    // Assuming backend is running on port 8000
    const BACKEND_URL = "http://localhost:8000/api/analyze";

    console.log("🚀 Sending image to Python YOLO backend:", BACKEND_URL);

    const response = await fetch(BACKEND_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        image: base64Image,
        language: "en" // Default, can be passed as arg
      })
    });

    if (!response.ok) {
      const text = await response.text();
      return {
        success: false,
        error: `Backend error (${response.status}): ${text}`
      };
    }

    const data = await response.json();

    if (!data.success || !data.analysis) {
      return {
        success: false,
        error: "Invalid response from analysis server"
      };
    }

    return {
      success: true,
      analysis: data.analysis,
      processed_image: data.processed_image
    };

  } catch (error) {
    console.error("Frontend vision analysis error:", error);
    return {
      success: false,
      error: "Failed to connect to analysis server. Is the Python backend running?"
    };
  }
}
