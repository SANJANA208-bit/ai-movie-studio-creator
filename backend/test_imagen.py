import os
from google import genai
from google.genai import types
from dotenv import load_dotenv

load_dotenv()
client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

try:
    result = client.models.generate_images(
        model='imagen-3.0-generate-001',
        prompt='A highly detailed cinematic portrait of a rogue space pilot, cyberpunk style.',
        config=types.GenerateImagesConfig(
            number_of_images=1,
            output_mime_type="image/jpeg",
        )
    )
    for generated_image in result.generated_images:
        print("Success! Image generated.")
        # Just to verify it works
except Exception as e:
    print(f"Error: {e}")
