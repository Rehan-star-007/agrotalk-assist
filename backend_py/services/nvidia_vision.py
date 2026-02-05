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
            print(f"🟢 NVIDIA Vision Service initialized with key: {self.api_key[:10]}...")
        else:
            print("🟡 NVIDIA_VISION_KEY not found in environment. NVIDIA mode will be disabled.")

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
            target_lang_name = lang_names.get(language, "English")
            
            # If language is English, we don't need double keys
            is_english = (language == "en")
            suffix = f"_{language}" if not is_english else ""

            lang_instr = ""
            json_keys = "disease_name, confidence, severity, description, symptoms, treatment_steps, organic_options, prevention_tips, crop_identified"
            
            if not is_english:
                lang_instr = f"\n3. IMPORTANT: Provide content in BOTH English AND {target_lang_name}. Use the suffix '{suffix}' for {target_lang_name} keys.\n4. STRICT RULE: DO NOT provide translations in any other languages (No Spanish, French, German, Japanese, etc.)."
                json_keys += f", disease_name{suffix}, description{suffix}, symptoms{suffix}, treatment_steps{suffix}, organic_options{suffix}, prevention_tips{suffix}"
            else:
                lang_instr = "\n3. STRICT RULE: Provide response ONLY in English. DO NOT provide any other languages (No Spanish, French, German, Japanese, Hindi, etc.)."

            system_prompt = (
                f"You are an expert plant pathologist. Analyze the image and provide a highly detailed diagnosis.\n\n"
                f"RULES:\n"
                f"1. If the plant is HEALTHY: Simply state 'Healthy' and give a positive description.\n"
                f"2. If the plant has an ISSUE: Provide a detailed breakdown using these EXACT markers in your text:\n"
                f"   - **Crop Identified**: [Name of plant/fruit]\n"
                f"   - **Disease Name**: [Name of issue]\n"
                f"   - **How it was formed**: [Detailed explanation of causes]\n"
                f"   - **Symptoms**: [List bullet points of visual signs]\n"
                f"   - **How we can prevent**: [List bullet points of proactive steps]\n"
                f"   - **How we can recover**: [List bullet points of recovery steps]{lang_instr}\n\n"
                f"Rules for Language:\n"
                f"- Output ONLY in English and {target_lang_name}.\n"
                f"- NEVER include Spanish, French, or any other language.\n"
                f"- If asked for {target_lang_name}, provide it ONLY in the specific keys requested.\n\n"
                f"CRITICAL: Always start your response with the 'Crop Identified' marker.\n"
                f"If possible, wrap your entire response in a JSON object with these keys: {json_keys}.\n"
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
            structured_result = self._smart_parse_text(raw_content, language)
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

    def _smart_parse_text(self, text: str, language: str = "en") -> Dict[str, Any]:
        """
        Robustly extracts structured data from plain text if JSON parsing fails.
        """
        print(f"🤖 [NVIDIA] Running Smart Parser on natural language ({language})...")
        import re
        
        # Determine suffix for localized keys
        is_english = (language == "en")
        suffix = f"_{language}" if not is_english else ""
        
        # Default empty structure (User requested 99% default for NVIDIA)
        result = {
            "disease_name": "AI Specialist Insight",
            "confidence": 99,
            "severity": "medium",
            "description": "",
            "symptoms": [],
            "treatment_steps": [],
            "organic_options": [],
            "prevention_tips": [],
            "crop_identified": "Plant"
        }
        
        # Add localized keys if not English
        if not is_english:
            result[f"disease_name{suffix}"] = "एआई विशेषज्ञ अंतर्दृष्टि" if language == "hi" else "AI Insight"
            result[f"description{suffix}"] = "विश्लेषण नीचे दिया गया है।" if language == "hi" else "Analysis provided below."
            result[f"symptoms{suffix}"] = []
            result[f"treatment_steps{suffix}"] = []
            result[f"organic_options{suffix}"] = []
            result[f"prevention_tips{suffix}"] = []

        # Helper to clean up lines and remove bullet points
        def clean_line(line):
            return re.sub(r'^[\s\d\.\-\*•]+', '', line).strip()

        # Split text into sections by likely headers
        # We look for headers like **Symptoms**, Symptoms:, 1. Symptoms, etc.
        sections = re.split(r'\n\s*[\d\.]*\s?\*?\*?(How it was formed|How we can prevent|How we can recover|Symptoms|Crop Identified|Plant Identified|Product|Disease Name)\*?\*?:?', text, flags=re.IGNORECASE)
        
        # The first part is usually a general description or intro
        intro_text = sections[0].strip() if sections else ""
        result["description"] = intro_text
        
        # Comprehensive list of common crops to check for 
        common_crops = [
            "Apple", "Tomato", "Cucumber", "Potato", "Onion", "Grape", "Orange", "Banana", "Lemon", "Mango",
            "Pepper", "Chill", "Strawberry", "Corn", "Maize", "Rice", "Wheat", "Soybean", "Pomegranate",
            "Guava", "Papaya", "Brinjal", "Eggplant", "Cabbage", "Cauliflower", "Rosemary", "Tulsi", "Neem"
        ]

        # Helper to extract crop from any block of text
        def extract_crop_name(block):
            # 1. Check for regex patterns
            match = re.search(r'(?:in|of|on|identified as|is a|occurs in|analysis of)\s+([a-zA-Z]{3,20})', block, re.IGNORECASE)
            if match:
                found = match.group(1).capitalize()
                found = re.sub(r's$|es$|leaf$|leaves$', '', found, flags=re.IGNORECASE)
                if len(found) >= 3: return found
            
            # 2. Check for explicit keywords from our list
            for crop in common_crops:
                if re.search(rf'\b{crop}\b', block, re.IGNORECASE):
                    return crop
            return None

        # Initial extraction from intro
        if result["crop_identified"] == "Plant":
            potential_crop = extract_crop_name(intro_text)
            if potential_crop: result["crop_identified"] = potential_crop

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
                elif any(x in header for x in ["crop identified", "plant identified", "product"]):
                    result["crop_identified"] = clean_line(content.split('\n')[0])
                elif "disease name" in header:
                    result["disease_name"] = clean_line(content.split('\n')[0])
                
                # Fallback: if we still have 'Plant', try scanning this section's content too
                if result["crop_identified"] in ["Plant", "Analysis Complete"]:
                    potential_crop = extract_crop_name(content)
                    if potential_crop: result["crop_identified"] = potential_crop

        return result
