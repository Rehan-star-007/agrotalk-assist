import asyncio
import os
import sys
from pathlib import Path

# Add current directory to path so we can import services
sys.path.append(os.getcwd())

from services.nvidia_tts import NvidiaTTSService

async def test_multilingual_tts():
    service = NvidiaTTSService()
    
    test_cases = [
        ("en", "Hello, welcome to AgroTalk Assistant.")
    ]
    
    output_dir = Path("test_audio")
    output_dir.mkdir(exist_ok=True)
    
    print("🚀 Starting Multilingual TTS Test...")
    
    for lang, text in test_cases:
        print(f"Testing {lang}...")
        audio_data = await service.generate_audio(text, language=lang)
        
        if audio_data:
            file_path = output_dir / f"test_{lang}.mp3"
            with open(file_path, "wb") as f:
                f.read(audio_data) if isinstance(audio_data, bytes) else f.write(audio_data)
            print(f"✅ Saved {file_path}")
        else:
            print(f"❌ Failed to generate audio for {lang}")

if __name__ == "__main__":
    asyncio.run(test_multilingual_tts())
