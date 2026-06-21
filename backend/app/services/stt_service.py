import os
from app.config import settings
from openai import OpenAI
import ffmpeg

def transcribe_with_openai(audio_path: str) -> str:
    """Transcribe audio using OpenAI Whisper API and return SRT subtitle string."""
    if not settings.openai_api_key:
        raise ValueError("OpenAI API Key is missing")
    
    client = OpenAI(api_key=settings.openai_api_key)
    with open(audio_path, "rb") as audio_file:
        transcription = client.audio.transcriptions.create(
            model="whisper-1",
            file=audio_file,
            response_format="srt"
        )
    return transcription

import json

def burn_subtitles_to_video(input_video: str, subtitle_file: str, output_video: str):
    """Burns the subtitle (ASS/SRT) file into the video using FFmpeg"""
    
    # Baca pengaturan
    settings_file = "/home/kangdemuh/aplikasi/video-editor/claude2/backend/app/global_settings.json"
    settings = {}
    if os.path.exists(settings_file):
        with open(settings_file, "r") as f:
            settings = json.load(f)
            
    font_name = settings.get("caption_font", "Arial")
    font_size = settings.get("caption_size", 24)
    # Konversi hex ke BGR hex untuk ASS (misal #FF0000 -> &H0000FF)
    def hex_to_ass(hex_code):
        h = hex_code.lstrip('#')
        if len(h) == 6:
            return f"&H00{h[4:6]}{h[2:4]}{h[0:2]}"
        return "&H00FFFFFF"
        
    font_color = hex_to_ass(settings.get("caption_color", "#FFFFFF"))
    outline_color = hex_to_ass(settings.get("caption_outline", "#000000"))
    alignment = settings.get("caption_position", 2)
    
    force_style = f"Fontname={font_name},Fontsize={font_size},PrimaryColour={font_color},OutlineColour={outline_color},Alignment={alignment},Outline=2,Shadow=1"

    in_file = ffmpeg.input(input_video)
    video = in_file.video.filter('subtitles', subtitle_file, force_style=force_style)
    audio = in_file.audio
    
    (
        ffmpeg
        .output(video, audio, output_video, vcodec='libx264', acodec='copy')
        .run(overwrite_output=True)
    )
    return output_video
