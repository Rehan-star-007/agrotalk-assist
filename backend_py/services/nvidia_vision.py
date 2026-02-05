import os
import base64
from typing import Optional, Dict, Any
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv()

class NvidiaVisionService:
    def __init__(self):
        self.api_key = os.getenv("NVIDIA_VISION_KEY")
        self.base_url = "https://integrate.api.nvidia.com/v1"
        self.client = None
        
        if self.api_key:
            self.client = OpenAI(
                base_url=self.base_url,
                api_key=self.api_key
            )
            print("🟢 NVIDIA Vision Service initialized with API Key.")
        else:
            print("🟡 NVIDIA_API_KEY not found in environment. NVIDIA mode will be disabled.")

    def analyze_image(self, base64_image_data: str, language: str = "en") -> Dict[str, Any]:
        """
        Analyzes an image using Meta Llama 3.2 90B Vision on NVIDIA NIM.
        """
        if not self.client:
            return {
                "success": False,
                "error": "NVIDIA API Key is missing. Please add it to your .env file."
            }

        # Ensure image data doesn't have the data:image/png;base64, prefix if passed directly
        if "," in base64_image_data:
            base64_image_data = base64_image_data.split(",")[1]

        try:
            print(f"🧠 [NVIDIA] Sending request to Llama 3.2 90B Vision ({language})...")
            
            # Map language codes to names for the prompt
            lang_names = {
                "en": "English",
                "hi": "Hindi",
                "ta": "Tamil",
                "te": "Telugu",
                "mr": "Marathi"
            }
            target_lang_name = lang_names.get(language, "Hindi")
            suffix = f"_{language}" if language != "en" else "_localized"

            system_prompt = (
                f"You are an expert plant pathologist. Analyze the image and provide a highly detailed diagnosis.\n\n"
                f"RULES:\n"
                f"1. If the plant is HEALTHY: Simply state 'Healthy' and give a positive description.\n"
                f"2. If the plant has an ISSUE: Provide a detailed breakdown using these EXACT markers in your text:\n"
                f"   - **Crop Identified**: [Name of plant]\n"
                f"   - **Disease Name**: [Name of issue]\n"
                f"   - **How it was formed**: [Detailed explanation of causes]\n"
                f"   - **Symptoms**: [List bullet points of visual signs]\n"
                f"   - **How we can prevent**: [List bullet points of proactive steps]\n"
                f"   - **How we can recover**: [List bullet points of recovery steps]\n\n"
                f"IMPORTANT: Also provide translations for {target_lang_name} using keys with suffix '{suffix}'.\n"
                f"If possible, wrap your entire response in a JSON object with keys: "
                f"disease_name, disease_name{suffix}, confidence, severity, description, description{suffix}, "
                f"symptoms, symptoms{suffix}, treatment_steps, treatment_steps{suffix}, organic_options, organic_options{suffix}, "
                f"prevention_tips, prevention_tips{suffix}, crop_identified.\n"
                f"If you can't provide JSON, just use the bold markers above."
            )

            response = self.client.chat.completions.create(
                model="meta/llama-3.2-90b-vision-instruct",
                messages=[
                    {
                        "role": "system",
                        "content": system_prompt
                    },
                    {
                        "role": "user",
                        "content": [
                            {"type": "text", "text": "Analyze this plant leaf. Use the requested structure."},
                            {
                                "type": "image_url",
                                "image_url": {"url": f"data:image/jpeg;base64,{base64_image_data}"},
                            },
                        ],
                    }
                ],
                max_tokens=2048,
                temperature=0.2,
            )

            raw_content = response.choices[0].message.content.strip()
            print(f"📄 [NVIDIA] Raw Response Length: {len(raw_content)} chars")
            
            import json
            import re
            
            # 1. Try JSON parsing
            try:
                result_json = None
                json_match = re.search(r'```json\s*(\{.*?\})\s*```', raw_content, re.DOTALL)
                if not json_match:
                    start_idx = raw_content.find('{')
                    end_idx = raw_content.rfind('}')
                    if start_idx != -1 and end_idx != -1:
                        json_str = raw_content[start_idx:end_idx+1]
                        result_json = json.loads(json_str)
                else:
                    result_json = json.loads(json_match.group(1))
                
                if result_json:
                    # Normalize confidence for NVIDIA (Default to 99% as requested)
                    if "confidence" not in result_json or result_json["confidence"] < 1:
                        result_json["confidence"] = 99
                    elif result_json["confidence"] < 80: # If it's real but low, boost it to 99 for high-quality NVIDIA mode
                        result_json["confidence"] = 99
                        
                    return {"success": True, "analysis": result_json}
            except:
                pass

            # 2. Smart Parsing Fallback
            structured_result = self._smart_parse_text(raw_content)
            return {
                "success": True,
                "analysis": structured_result
            }

        except Exception as e:
            print(f"❌ [NVIDIA] Error during analysis: {e}")
            return {
                "success": False,
                "error": f"NVIDIA API Error: {str(e)}"
            }

    def _smart_parse_text(self, text: str) -> Dict[str, Any]:
        """
        Robustly extracts structured data from plain text if JSON parsing fails.
        """
        print("🤖 [NVIDIA] Running Smart Parser on natural language...")
        import re
        
        # Default empty structure (User requested 99% default for NVIDIA)
        result = {
            "disease_name": "AI Specialist Insight",
            "disease_name_hindi": "एआई विशेषज्ञ अंतर्दृष्टि",
            "confidence": 99,
            "severity": "medium",
            "description": "",
            "description_hindi": "ऊपर दी गई प्रतिक्रिया मुख्य विश्लेषण है।",
            "symptoms": [],
            "symptoms_hindi": [],
            "treatment_steps": [],
            "treatment_steps_hindi": [],
            "organic_options": [],
            "organic_options_hindi": [],
            "prevention_tips": [],
            "prevention_tips_hindi": [],
            "crop_identified": "Analysis Complete"
        }

        # Helper to clean up lines and remove bullet points
        def clean_line(line):
            return re.sub(r'^[\s\d\.\-\*•]+', '', line).strip()

        # Split text into sections by likely headers
        # We look for headers like **Symptoms**, Symptoms:, 1. Symptoms, etc.
        sections = re.split(r'\n\s*[\d\.]*\s?\*?\*?(How it was formed|How we can prevent|How we can recover|Symptoms|Crop Identified|Disease Name)\*?\*?:?', text, flags=re.IGNORECASE)
        
        # The first part is usually a general description or intro
        if sections:
            result["description"] = sections[0].strip()

        # Iterate through matched headers and content
        for i in range(1, len(sections), 2):
            if i + 1 < len(sections):
                header = sections[i].lower()
                content = sections[i+1].strip()
                lines = [clean_line(l) for l in content.split('\n') if clean_line(l)]

                if "how it was formed" in header:
                    result["description"] = content
                elif "how we can prevent" in header:
                    result["prevention_tips"] = lines
                elif "how we can recover" in header:
                    result["treatment_steps"] = lines
                elif "symptoms" in header:
                    result["symptoms"] = lines
                elif "crop identified" in header:
                    result["crop_identified"] = content.split('\n')[0].strip()
                elif "disease name" in header:
                    result["disease_name"] = content.split('\n')[0].strip()

        return result
