import os
import asyncio
import tempfile
import httpx
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

# Try to import edge-tts
try:
    import edge_tts
    EDGE_TTS_AVAILABLE = True
except ImportError:
    EDGE_TTS_AVAILABLE = False

class TTSService:
    def __init__(self):
        print("🟢 Edge TTS Service initialized.")

        # Mapping languages to specific high-quality Edge voices
        self.EDGE_VOICE_MAP = {
            "en": "en-US-ChristopherNeural",
            "hi": "hi-IN-MadhurNeural",
            "ta": "ta-IN-ValluvarNeural",
            "te": "te-IN-MohanNeural",
            "mr": "mr-IN-ManoharNeural"
        }
        
    async def generate_audio(self, text: str, language: str = "en", gender: str = "male") -> bytes:
        """
        Generate MP3 audio bytes using Edge TTS.
        """
        if not EDGE_TTS_AVAILABLE:
            print("❌ Edge-TTS not installed.")
            return None

        # Select voice
        voice = self.EDGE_VOICE_MAP.get(language, "en-US-ChristopherNeural")
        
        # Simple gender override if needed
        if gender == "female":
            female_voices = {
                "en": "en-US-AriaNeural",
                "hi": "hi-IN-SwaraNeural",
                "ta": "ta-IN-PallaviNeural",
                "te": "te-IN-ShrutiNeural",
                "mr": "mr-IN-AarohiNeural"
            }
            voice = female_voices.get(language, voice)

        print(f"🎤 [EDGE] Generating: '{text[:30]}...' ({language}, {voice})")

        try:
            communicate = edge_tts.Communicate(text, voice)
            with tempfile.NamedTemporaryFile(suffix=".mp3", delete=False) as tmp_file:
                tmp_path = tmp_file.name
            
            await communicate.save(tmp_path)
            
            with open(tmp_path, "rb") as f:
                audio_data = f.read()
            
            os.unlink(tmp_path)
            return audio_data

        except Exception as e:
            print(f"❌ Edge TTS Error: {e}")
            return None
