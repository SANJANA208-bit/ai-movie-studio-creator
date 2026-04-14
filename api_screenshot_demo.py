import os
from google import genai
from google.genai import types
from dotenv import load_dotenv
import json

load_dotenv()

print("==================================================")
print(" 🎬 AI MOVIE STUDIO - API CALL DEMONSTRATION 🎬 ")
print("==================================================\n")

print("Initializing Google Gemini API Client...")
client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))
print("[SUCCESS] API Key Loaded.\n")

user_prompt = "Create a movie concept for: A time-traveling chef."
print(f"Sending Request to model 'gemini-1.5-flash'...")
print(f"User Prompt: '{user_prompt}'\n")

try:
    response = client.models.generate_content(
        model="gemini-1.5-flash", 
        contents=user_prompt,
        config=types.GenerateContentConfig(
            temperature=0.7,
            top_p=0.9,
        )
    )
    
    print("✅ [SUCCESS] API Response Received! 200 OK")
    print("--------------------------------------------------")
    print("Model Response Output (Snippet):\n")
    print(response.text[:300] + "...\n[Output Truncated for Space]\n")
    print("--------------------------------------------------")
    print("Take a screenshot of this terminal window for Q12 in your report!")
    
except Exception as e:
    print(f"❌ [ERROR] API Call Failed: {e}")
