import streamlit as st
import google.generativeai as genai
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Set page config
st.set_page_config(page_title="AI Movie Studio Creator", page_icon="🎬", layout="wide")

# Custom CSS for better aesthetics
st.markdown("""
<style>
    .stApp {
        background-color: #f9fafb;
    }
    .stButton>button {
        background-color: #6366f1;
        color: white;
        border-radius: 8px;
        padding: 10px 24px;
        font-weight: 600;
        border: none;
    }
    .stButton>button:hover {
        background-color: #4f46e5;
        border: none;
        color: white;
    }
</style>
""", unsafe_allow_html=True)

# Main Title
st.title("🎬 AI Movie Studio Creator")
st.markdown("### Generative AI Chatbot for Film Concept Development")

# Sidebar for Setup and Information
with st.sidebar:
    st.header("🔑 API Setup")
    st.write("You can paste your API key here, or put it in a `.env` file.")
    api_key_input = st.text_input("Gemini API Key", type="password")
    
    st.divider()
    st.header("💡 Example Inputs")
    st.markdown("""
    Click to copy:
    - `Create a horror movie in a forest`
    - `Generate a sci-fi movie set on Mars`
    - `Romantic college story`
    """)

# Determine API key to use
gemini_api_key = api_key_input if api_key_input else os.getenv("GEMINI_API_KEY")

if not gemini_api_key:
    st.warning("⚠️ Please provide a Gemini API Key in the sidebar to continue.")
    st.stop()

# Initialize Gemini API
genai.configure(api_key=gemini_api_key)

# The Model Setup
generation_config = {
    "temperature": 0.7, # 0.7 for Balanced creativity and coherence
    "top_p": 0.9,
    "max_output_tokens": 800,
}

SYSTEM_INSTRUCTION = """
You are an expert film creator and screenplay assistant. Generate structured and creative movie content.
The user will ask you for movie ideas. You must strictly respond ONLY to movie-related queries. 
If the user asks anything outside the domain of movies or film production, strictly respond with exactly:
"I specialize in movie creation. Please ask about movie ideas, characters, or scripts."

If the request is valid, ALL outputs must be dynamically generated based on user input. 
Do NOT use fixed or hardcoded movie titles, characters, or plots. Each response must be unique.
Use storytelling principles like beginning, conflict, and resolution. 
Follow basic Hero's Journey structure where applicable.
Include character roles such as protagonist, antagonist, and supporting characters.
Ensure the story has logical flow and coherence.

Always generate output in exactly this structured format:

Movie Concept 1:

Movie Title:
Plot Summary:
Main Characters:
Trailer Script:
Dialogue Example:

Movie Concept 2:

Movie Title:
Plot Summary:
Main Characters:
Trailer Script:
Dialogue Example:
"""

# Try to initialize the model. If API key is invalid, generation will fail gracefully later.
model = genai.GenerativeModel(
    model_name="gemini-1.5-flash",
    generation_config=generation_config,
    system_instruction=SYSTEM_INSTRUCTION
)

st.markdown("---")
# UI Elements
col1, col2 = st.columns([1, 2])

with col1:
    genre = st.selectbox("Optional: Select a Genre", ["None", "Action", "Horror", "Romance", "Sci-Fi", "Comedy", "Thriller"])

with col2:
    user_input = st.text_input("Enter your movie idea:", placeholder="e.g., A heist movie set in space", max_chars=1500)

# Generate Button
if st.button("Generate Movie Concepts ✨"):
    if not user_input.strip():
        st.error("Please enter a movie idea.")
    else:
        with st.spinner("Brainstorming concepts..."):
            
            # Incorporate genre if selected
            genre_instruction = ""
            if genre != "None":
                genre_instruction = f" Make it a {genre} movie."
                
            # Construct dynamic prompt
            final_prompt = f"Create two unique movie concepts including title, plot, characters, and trailer script for: {user_input}.{genre_instruction}"
            
            try:
                # Single-turn API Call
                response = model.generate_content(final_prompt)
                
                # Display output clearly
                st.success("Here are your generated movie concepts!")
                st.markdown(response.text)
                
                # Transparency Feature
                with st.expander("🔍 View Constructed Prompt (Transparency)"):
                    st.code(final_prompt, language="text")
                    st.caption("Model Settings used: Temperature: 0.7, Top-p: 0.9, Max Output Tokens: 800")
                    st.caption("A dense System Prompt enforces domain restrictions to movies only.")
                    
            except Exception as e:
                st.error(f"An API Error occurred. Please verify your API key and try again. Details: {e}")
