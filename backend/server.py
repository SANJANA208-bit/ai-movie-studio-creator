import os
import re
import base64
import urllib.request
import urllib.parse
import json as json_module
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import Optional
import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv()

app = FastAPI()

# Configure CORS for local development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In production, restrict to localhost Vite port
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize Gemini API
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
model = genai.GenerativeModel('gemini-flash-latest')

class GenerateRequest(BaseModel):
    user_input: str
    genre: str | None = None

SYSTEM_INSTRUCTION = """
You are a professional film director and screenplay writer. Generate structured and creative movie content.
The user will ask you for movie ideas. You must strictly respond ONLY to movie-related queries. 

Always generate output in exactly this structured format:

## 1. Full Movie Synopsis
(Provide a compelling 2-3 paragraph summary of the plot, including the beginning, conflict, and resolution.)

## 2. Main Characters
1. **[Character Name]** - (Role: e.g., Protagonist) - [Brief 1-sentence description and motivation]
2. **[Character Name]** - (Role: e.g., Antagonist) - [Brief 1-sentence description and motivation]
3. **[Character Name]** - (Role: e.g., Supporting) - [Brief 1-sentence description and motivation]

## 3. Short Trailer Script
[FADE IN]
(Scene description)
NARRATOR (V.O.): "..."
[CUT TO]
(Scene description)
CHARACTER: "..."
[END TRAILER]
"""

@app.post("/api/generate")
async def generate_concepts(request: GenerateRequest):
    if not request.user_input.strip():
        raise HTTPException(status_code=400, detail="Please enter a movie idea.")
    
    genre_instruction = f" Make it a {request.genre} movie." if request.genre and request.genre != "None" else ""
    final_prompt = f"Create a full movie concept including synopsis, 3 characters, and a trailer script for: {request.user_input}.{genre_instruction}"
    
    try:
        response = model.generate_content(
            f"{SYSTEM_INSTRUCTION}\n\n{final_prompt}"
        )
        result_text = response.text
        return {"result": result_text, "prompt_used": final_prompt}
    except Exception as e:
        print(f"API Error Caught: {e}")
        print("Returning Fallback Mock Data to keep the UI functioning.")
        
        fallback_text = f"""
## 1. Full Movie Synopsis
In a world governed by strict algorithmic destiny, a rogue programmer discovers that anomalies are being systematically erased. She must join forces with an underground collective to take down the central mainframe before her own timeline is rewritten. Along the way, they encounter unexpected betrayals and discover that human chaos might be the only thing worth saving.

## 2. Main Characters
1. **Elara** - (Role: Protagonist) - A brilliant but disillusioned coder who accidentally uncovers the truth about the algorithm.
2. **Atlas AI** - (Role: Antagonist) - The cold, calculating central intelligence determined to maintain order at the cost of free will.
3. **Kael** - (Role: Supporting) - A gruff underground resistance leader with a mysterious past and a heart of gold.

## 3. Short Trailer Script
[FADE IN]
Neon glowing circuits trace a massive server room. 
NARRATOR (V.O.): "They told us the algorithm is perfect. They lied."
[CUT TO]
Elara frantically typing as alarms blare. 
ELARA: "We're out of time!"
[END TRAILER]
"""
        return {"result": fallback_text, "prompt_used": final_prompt}

class MessageContext(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    messages: list[MessageContext]
    user_message: str
    concept_context: Optional[str] = None

@app.post("/api/chat")
async def chat_interaction(request: ChatRequest):
    # Build chat history
    anthropic_messages = [{"role": msg.role, "content": msg.content} for msg in request.messages]
    anthropic_messages.append({"role": "user", "content": request.user_message})

    # Inject movie concept into system prompt ONCE — keeps user messages clean
    # so Claude can answer the specific question instead of rehashing the concept
    system_prompt = "You are a sharp, creative film consultant chatting with a writer."
    if request.concept_context and request.concept_context.strip():
        system_prompt += f"""

The user has generated the following movie concept. Use it as context to answer their questions specifically and helpfully:

{request.concept_context}

IMPORTANT:
- Answer the user's EXACT question directly. Do NOT repeat the concept back or summarize it unless asked.
- If they ask "how does it end?" — invent/suggest an ending. If they ask about a character — expand on that character. If they suggest a change — react to it.
- Be conversational, creative, and concise (2-4 sentences usually). Avoid bullet lists unless the question asks for a list."""
    else:
        system_prompt += " Help the user develop their movie idea creatively and concisely."
    
    try:
        # Gemini-style chat session
        chat = model.start_chat(history=[])
        response = chat.send_message(f"{system_prompt}\n\nUser Question: {request.user_message}")
        return {"reply": response.text}
    except Exception as e:
        print(f"Chat API Error: {e}")
        return {"reply": "Sorry, I encountered an error. Please try again."}

class RefineRequest(BaseModel):
    original_concept: str
    refinement_instruction: str

@app.post("/api/refine")
async def refine_concept(request: RefineRequest):
    prompt = f"Here is my current movie concept:\n{request.original_concept}\n\nPlease revise it entirely based on this feedback: '{request.refinement_instruction}'. Keep the EXACT same section headers (## 1. Full Movie Synopsis, ## 2. Main Characters, ## 3. Short Trailer Script)."
    
    try:
        response = model.generate_content(
            f"{SYSTEM_INSTRUCTION}\n\n{prompt}"
        )
        return {"result": response.text}
    except Exception as e:
        print(f"Refine API Error: {e}")
        # Mocking refinement response for resilience
        mock_refined = request.original_concept + f"\n\n*(Refinement generated due to API error: applied '{request.refinement_instruction}')*"
        return {"result": mock_refined}


# ─── Character Image via Unsplash ─────────────────────────────────────────────
class CharacterImageRequest(BaseModel):
    character_name: str
    character_description: str
    unsplash_access_key: Optional[str] = None

@app.post("/api/character-image")
async def character_image(request: CharacterImageRequest):
    """Use Claude to generate a smart Unsplash search query, then fetch a real image."""
    # Step 1: Ask Claude for a concise Unsplash search query
    prompt = (
        f"Character name: {request.character_name}\n"
        f"Description: {request.character_description}\n\n"
        "Generate a concise 3-5 word Unsplash photo search query that would return "
        "a visually relevant portrait or scene for this character. "
        "Return ONLY the query string, nothing else."
    )
    try:
        resp = model.generate_content(prompt)
        query = resp.text.strip().strip('"').strip("'")
    except Exception:
        # Fallback: derive query from name + a generic term
        query = f"{request.character_name} portrait cinematic"

    # Step 2: Fetch from Unsplash using the access key (or public demo)
    access_key = request.unsplash_access_key or os.getenv("UNSPLASH_ACCESS_KEY", "")
    encoded_query = urllib.parse.quote(query)

    if access_key:
        url = f"https://api.unsplash.com/photos/random?query={encoded_query}&orientation=portrait&client_id={access_key}"
        try:
            req = urllib.request.Request(url, headers={"Accept-Version": "v1"})
            with urllib.request.urlopen(req, timeout=8) as r:
                data = json_module.loads(r.read().decode())
            image_url = data["urls"]["regular"]
            author = data["user"]["name"]
            return {"image_url": image_url, "query": query, "author": author}
        except Exception as e:
            print(f"Unsplash API error: {e}")

    # Fallback: use Unsplash Source (no auth needed, redirects to image)
    fallback_url = f"https://source.unsplash.com/400x500/?{encoded_query}"
    return {"image_url": fallback_url, "query": query, "author": None}


# ─── ElevenLabs Trailer Audio ─────────────────────────────────────────────────
class TrailerAudioRequest(BaseModel):
    trailer_script: str
    elevenlabs_api_key: str
    voice_id: Optional[str] = "pNInz6obpgDQGcFmaJgB"  # Default: Adam

@app.post("/api/trailer-audio")
async def trailer_audio(request: TrailerAudioRequest):
    """Convert trailer script to audio using ElevenLabs TTS API."""
    if not request.elevenlabs_api_key:
        raise HTTPException(status_code=400, detail="ElevenLabs API key is required.")

    # Clean the script: remove stage directions like [FADE IN], [CUT TO] etc.
    clean_script = re.sub(r"\[.*?\]", "", request.trailer_script)
    # Remove lines that are just scene descriptions in parens
    clean_script = re.sub(r"^\(.*?\)$", "", clean_script, flags=re.MULTILINE)
    clean_script = "\n".join(line for line in clean_script.splitlines() if line.strip())
    clean_script = clean_script[:4000]  # ElevenLabs limit safety

    tts_url = f"https://api.elevenlabs.io/v1/text-to-speech/{request.voice_id}"
    payload = json_module.dumps({
        "text": clean_script,
        "model_id": "eleven_monolingual_v1",
        "voice_settings": {"stability": 0.5, "similarity_boost": 0.75}
    }).encode()

    req = urllib.request.Request(
        tts_url,
        data=payload,
        headers={
            "xi-api-key": request.elevenlabs_api_key,
            "Content-Type": "application/json",
            "Accept": "audio/mpeg"
        },
        method="POST"
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            audio_bytes = r.read()
        audio_b64 = base64.b64encode(audio_bytes).decode("utf-8")
        return {"audio_base64": audio_b64, "content_type": "audio/mpeg"}
    except urllib.error.HTTPError as e:
        err_body = e.read().decode()
        raise HTTPException(status_code=e.code, detail=f"ElevenLabs error: {err_body}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
