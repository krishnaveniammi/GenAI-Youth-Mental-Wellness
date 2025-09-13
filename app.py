from flask import Flask, render_template, request, jsonify
import os, time, re
import google.generativeai as genai # type: ignore
from gtts import gTTS # type: ignore
from googleapiclient.discovery import build # type: ignore
from config import GEMINI_KEY, YOUTUBE_KEY  

app = Flask(__name__, static_folder="static")

# ===== Configure Gemini + YouTube =====
genai.configure(api_key=GEMINI_KEY)
model = genai.GenerativeModel("gemini-1.5-flash")
youtube = build("youtube", "v3", developerKey=YOUTUBE_KEY)


# ===== Utility Functions =====

def clean_for_tts(text: str):
    """Remove emojis, links & special chars before TTS."""
    text = re.sub(r"http\S+", "", text)               # remove URLs
    text = re.sub(r"[^A-Za-z0-9\s,.!?]", "", text)    # remove emojis & symbols
    text = re.sub(r"\s+", " ", text)                  # normalize spaces
    return text.strip()


def get_playlist_themes(user_mood: str):
    prompt = f"""
    The user feels: {user_mood}

    🎯 Your reply must always include:
    - 2 short healing or motivational tips
    - EXACTLY 2 Telugu playlist themes
    - EXACTLY 2 Hindi playlist themes
    - EXACTLY 2 English playlist themes
    - Format playlists as list items starting with "-"
    """
    response = model.generate_content(prompt)
    return response.text.strip()


def get_youtube_resource(query):
    """Search YouTube for a playlist (fallback: video)."""
    try:
        search_response = youtube.search().list(
            q=query,
            part="snippet",
            maxResults=1,
            type="playlist"
        ).execute()

        if search_response.get("items"):
            playlist_id = search_response["items"][0]["id"]["playlistId"]
            return f"https://www.youtube.com/playlist?list={playlist_id}"

        # fallback → video
        search_response = youtube.search().list(
            q=query,
            part="snippet",
            maxResults=1,
            type="video"
        ).execute()

        if search_response.get("items"):
            video_id = search_response["items"][0]["id"]["videoId"]
            return f"https://www.youtube.com/watch?v={video_id}"

    except Exception as e:
        return f"(link not available: {e})"

    return "No result found"


def add_playlist_links(reply: str):
    """Detect lines starting with '-' and append YouTube links."""
    lines = reply.splitlines()
    new_lines = []
    for line in lines:
        raw = line.strip()
        if raw.startswith("-"):  # playlist/theme line
            playlist_name = re.sub(r"^[-–•]+\s*", "", raw)  # remove "- " etc
            playlist_name = re.sub(r"[^\w\s]", "", playlist_name)  # strip symbols

            if playlist_name.strip():
                yt_link = get_youtube_resource(playlist_name.strip())
                new_lines.append(f"- {playlist_name.strip()} 🎵 {yt_link}")
            else:
                new_lines.append(line)
        else:
            new_lines.append(line)
    return "\n".join(new_lines)


def synthesize_speech(text, lang="en", filename=None):
    """Generate TTS audio and save in static folder."""
    clean_text = clean_for_tts(text)   # ✅ Clean before sending to gTTS
    if filename is None:
        filename = f"reply_{int(time.time())}.mp3"
    path = os.path.join("static", filename)
    tts = gTTS(text=clean_text, lang=lang)
    tts.save(path)
    return "/" + path


# ===== Routes =====

@app.route("/")
def index():
    return render_template("index.html")


@app.route("/chat", methods=["POST"])
def chat():
    data = request.get_json()
    user_input = data.get("message", "")

    reply = get_playlist_themes(user_input)

    # ✅ Add YouTube links
    reply_with_links = add_playlist_links(reply)

    # ✅ Generate audio only AFTER cleaning
    audio_url = synthesize_speech(reply_with_links, lang="en")

    return jsonify({"reply": reply_with_links, "audio": audio_url})


if __name__ == "__main__":
    app.run(debug=True)
