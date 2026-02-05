import os
import wave
import io
import riva.client
from dotenv import load_dotenv
from typing import Optional

load_dotenv()

class NvidiaTTSService:
    """NVIDIA Magpie TTS service using gRPC Riva client."""
    
    def __init__(self):
        self.api_key = os.getenv("NVIDIA_TTS_KEY")
        self.function_id = os.getenv("NVIDIA_TTS_FUNCTION_ID", "877104f7-e885-42b9-8de8-f6e4c6303969")
        self.server = "grpc.nvcf.nvidia.com:443"
        
        # Language code to NVIDIA locale mapping
        self.LANG_CODE_MAP = {
            "en": "EN-US",
            "hi": "EN-US",  # Hindi text spoken with English voice (cross-lingual)
            "ta": "EN-US",  # Tamil text spoken with English voice
            "te": "EN-US",  # Telugu text spoken with English voice
            "mr": "EN-US",  # Marathi text spoken with English voice
            "es": "ES-US",
            "fr": "FR-FR",
            "de": "DE-DE",
            "zh": "ZH-CN",
            "vi": "VI-VN",
            "it": "IT-IT"
        }
        
        # Voice personality options (all female)
        self.VOICE_PERSONALITIES = ["mia", "aria", "sofia", "louise", "isabela"]
        
        if self.api_key:
            print(f"🟢 NVIDIA TTS Service initialized (gRPC)")
        else:
            print("🟡 NVIDIA_TTS_KEY not found. TTS will be disabled.")

    def _get_riva_service(self):
        """Create authenticated Riva TTS service."""
        auth = riva.client.Auth(
            uri=self.server,
            use_ssl=True,
            metadata_args=[
                ["authorization", f"Bearer {self.api_key}"],
                ["function-id", self.function_id]
            ]
        )
        return riva.client.SpeechSynthesisService(auth)

    def _get_voice_name(self, language: str, voice: str = "mia") -> str:
        """Build NVIDIA voice name from language and voice personality."""
        locale = self.LANG_CODE_MAP.get(language, "EN-US")
        voice_name = voice.capitalize() if voice.lower() in self.VOICE_PERSONALITIES else "Mia"
        return f"Magpie-Multilingual.{locale}.{voice_name}"

    async def generate_audio(self, text: str, language: str = "en", voice: str = "mia") -> Optional[bytes]:
        """
        Generates audio using NVIDIA Magpie TTS via gRPC.
        Returns WAV audio bytes.
        
        Args:
            text: Text to synthesize
            language: Language code (en, hi, ta, te, mr)
            voice: Voice personality (mia, aria, sofia)
        """
        if not self.api_key:
            print("❌ NVIDIA TTS API Key missing.")
            return None

        voice_name = self._get_voice_name(language, voice)
        # For gRPC language_code, we use the locale exactly as defined in the map (e.g., "en-US")
        language_code = self.LANG_CODE_MAP.get(language, "EN-US")
        
        # Sanitize text to remove potential problematic characters (emojis, etc that cause Mapping failed)
        # Basic cleaning: remove characters that might not be in the model's charset if necessary
        # For now, let's trust the input mostly but ensure it's a string
        clean_text = str(text).strip()
        
        print(f"🎤 [NVIDIA gRPC] TTS for '{clean_text[:40]}...' (lang: {language_code}, voice: {voice_name})")

        try:
            service = self._get_riva_service()
            
            resp = service.synthesize(
                text=clean_text,
                voice_name=voice_name,
                language_code=language_code,
                sample_rate_hz=22050
            )
            
            # Convert raw audio to WAV format
            wav_buffer = io.BytesIO()
            with wave.open(wav_buffer, 'wb') as wav_file:
                wav_file.setnchannels(1)
                wav_file.setsampwidth(2)  # 16-bit
                wav_file.setframerate(22050)
                wav_file.writeframes(resp.audio)
            
            wav_bytes = wav_buffer.getvalue()
            print(f"✅ [NVIDIA gRPC] Generated {len(wav_bytes)} bytes of audio")
            return wav_bytes
            
        except Exception as e:
            error_msg = str(e)
            if hasattr(e, 'details'):
                error_msg = e.details()
            print(f"❌ NVIDIA TTS Error: {error_msg}")
            return None
