"""
AgroVoice Backend - Plant Disease Detection API using YOLOv8
"""
import os
from datetime import datetime
from typing import Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from models.yolo_detector import PlantDiseaseDetector
from utils.image_processing import decode_base64_image, preprocess_image
from utils.visualization import process_and_visualize
from services.tts_service import TTSService
import io
import base64
import io
import base64

app = FastAPI(
    title="AgroVoice Disease Detection API",
    description="Plant disease detection using YOLOv8 model",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

detector: Optional[PlantDiseaseDetector] = None

class AnalyzeRequest(BaseModel):
    image: str
    cropType: Optional[str] = None
    language: Optional[str] = "en"

class TTSRequest(BaseModel):
    text: str
    language: Optional[str] = "en"
    gender: Optional[str] = "male"

class AnalyzeResponse(BaseModel):
    success: bool
    analysis: dict
    processed_image: Optional[str] = None
    timestamp: str

@app.on_event("startup")
async def startup_event():
    global detector
    print("🚀 Starting AgroVoice Disease Detection API...")
    print("📦 Loading YOLO model...")
    model_path = os.environ.get("MODEL_PATH", None)
    detector = PlantDiseaseDetector(model_path=model_path)
    # Initialize TTS Service
    global tts_service
    tts_service = TTSService()
    print("✅ Server ready!")

@app.get("/")
async def health_check():
    return {
        "status": "healthy",
        "model": "YOLOv8",
        "model_loaded": detector is not None and detector.model is not None,
        "timestamp": datetime.now().isoformat(),
    }

@app.get("/api/model/info")
async def model_info():
    if detector is None:
        raise HTTPException(status_code=503, detail="Model not loaded")
    return {
        "model_type": "YOLOv8 Dual-Stage (AI + Heuristic)",
        "num_classes": len(detector.TARGET_CLASSES),
        "target_classes": detector.TARGET_CLASSES,
    }

@app.post("/api/analyze", response_model=AnalyzeResponse)
async def analyze_image(request: AnalyzeRequest):
    global detector
    if detector is None:
        raise HTTPException(status_code=503, detail="Model not loaded")
    
    if not request.image:
        raise HTTPException(status_code=400, detail="Image is required")
    
    try:
        print(f"📸 [ANALYZE] Processing image request...")
        # 1. Decode & Preprocess
        try:
            original_image = decode_base64_image(request.image)
        except Exception as e:
            print(f"❌ [ANALYZE] Decode failed: {e}")
            raise HTTPException(status_code=400, detail="Invalid image format or data")

        model_input = preprocess_image(original_image, target_size=(224, 224))
        
        # 2. Run Model
        print("🤖 [ANALYZE] Running YOLO inference...")
        result = detector.detect(model_input)
        
        # 3. Generate Visualizations (Softly fail if this parts crashes)
        processed_image_b64 = None
        try:
            print("🎨 [ANALYZE] Drawing disease regions...")
            display_image = original_image.copy()
            # Ensure manageable size for display
            if display_image.width > 800 or display_image.height > 800:
                display_image.thumbnail((800, 800))
            
            # Use new visualization with precise disease regions    
            _, processed_b64 = process_and_visualize(display_image, result)
            processed_image_b64 = "data:image/png;base64," + processed_b64
        except Exception as ve:
            print(f"⚠️ [ANALYZE] Visualization failed (soft fail): {ve}")
            # Fallback to original image if visualization failed
            try:
                buffered = io.BytesIO()
                original_image.save(buffered, format="JPEG")
                processed_image_b64 = "data:image/jpeg;base64," + base64.b64encode(buffered.getvalue()).decode()
            except:
                pass
        
        return AnalyzeResponse(
            success=True,
            analysis=result,
            processed_image=processed_image_b64,
            timestamp=datetime.now().isoformat(),
        )
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ [ANALYZE] Error: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")

@app.post("/api/tts")
async def generate_speech(request: TTSRequest):
    global tts_service
    if tts_service is None:
        raise HTTPException(status_code=503, detail="TTS service not initialized")
    
    try:
        audio_bytes = await tts_service.generate_audio(request.text, request.language, request.gender)
        if not audio_bytes:
             raise HTTPException(status_code=500, detail="TTS generation failed")
             
        # Convert to base64
        audio_base64 = base64.b64encode(audio_bytes).decode('utf-8')
        return {
            "success": True,
            "audio": audio_base64,
            "content_type": "audio/mp3"
        }
    except Exception as e:
        print(f"❌ [TTS] Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
