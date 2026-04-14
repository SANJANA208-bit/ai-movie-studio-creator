import os
from google import genai
from google.genai import types
from dotenv import load_dotenv

load_dotenv()
client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

try:
    response = client.models.generate_content(
        model="gemini-2.5-flash", 
        contents="Create two unique movie concepts for a heist in space.",
        config=types.GenerateContentConfig(
            temperature=0.7,
            top_p=0.9,
        )
    )
    print("TEXT:", response.text)
    print("FINISH REASON:", response.candidates[0].finish_reason)
except Exception as e:
    print(f"Error: {e}")
