
import os
import asyncio
import tempfile
from pathlib import Path

# Try to import edge-tts
try:
    import edge_tts
    EDGE_TTS_AVAILABLE = True
except ImportError:
    EDGE_TTS_AVAILABLE = False
    print("⚠️ edge-tts not installed. Install with: pip install edge-tts")

class TTSService:
    def __init__(self):
        # Mapping languages to specific high-quality Edge voices
        self.VOICE_MAP = {
            "en": "en-US-ChristopherNeural",  # Friendly male
            "hi": "hi-IN-MadhurNeural",       # Natural Hindi male
            "ta": "ta-IN-ValluvarNeural",     # Tamil male
            "te": "te-IN-MohanNeural",        # Telugu male
            "mr": "mr-IN-ManoharNeural"       # Marathi male
        }
        # Fallback female voices if preferred
        self.VOICE_MAP_FEMALE = {
            "en": "en-US-AriaNeural",
            "hi": "hi-IN-SwaraNeural",
            "ta": "ta-IN-PallaviNeural",
            "te": "te-IN-ShrutiNeural",
            "mr": "mr-IN-AarohiNeural"
        }

    async def generate_audio(self, text: str, language: str = "en", gender: str = "male") -> bytes:
        """
        Generate MP3 audio bytes using Edge TTS.
        """
        if not EDGE_TTS_AVAILABLE:
            return None

        # Select voice
        voices = self.VOICE_MAP if gender == "male" else self.VOICE_MAP_FEMALE
        voice = voices.get(language, "en-US-ChristopherNeural")

        print(f"🎤 Generating TTS: '{text[:30]}...' ({language}, {voice})")

        try:
            communicate = edge_tts.Communicate(text, voice)
            
            # Create a temporary file to store audio
            # edge-tts async API writes to file easily
            with tempfile.NamedTemporaryFile(suffix=".mp3", delete=False) as tmp_file:
                tmp_path = tmp_file.name
            
            await communicate.save(tmp_path)
            
            # Read back bytes
            with open(tmp_path, "rb") as f:
                audio_data = f.read()
            
            # Cleanup
            os.unlink(tmp_path)
            
            return audio_data

        except Exception as e:
            print(f"❌ TTS Generation Error: {e}")
            return None
