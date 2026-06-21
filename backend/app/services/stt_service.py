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
            
    font_name = settings.get("caption_font", "DejaVu Sans")
    font_size = settings.get("caption_size", 24)
    # Konversi hex ke BGR hex untuk ASS (misal #FF0000 -> &H0000FF)
    def hex_to_ass(hex_code):
        h = hex_code.lstrip('#')
        if len(h) == 6:
            return f"&H00{h[4:6]}{h[2:4]}{h[0:2]}"
        return "&H00FFFFFF"
        
    font_color = hex_to_ass(settings.get("caption_color", "#FFFFFF"))
    outline_color = hex_to_ass(settings.get("caption_outline", "#000000"))
    
    # Position (0-100)
    position_percent = settings.get("caption_position", 15)
    
    # Secara default untuk file SRT, FFmpeg/libass menggunakan resolusi kanvas virtual 384x288 (PlayResY=288).
    # Oleh karena itu, MarginV dan Fontsize harus dihitung terhadap tinggi 288, BUKAN tinggi asli video.
    virtual_height = 288
    margin_v = int((position_percent / 100.0) * virtual_height)
    # Beri jarak aman agar teks tidak terpotong di atas
    margin_v = min(margin_v, virtual_height - int(font_size * 1.5))
    
    outline_enabled = settings.get("caption_outline_enabled", True)
    outline_size = settings.get("caption_outline_size", 2)
    final_outline = outline_size if outline_enabled else 0
    
    force_style = f"Fontname={font_name},Fontsize={font_size},PrimaryColour={font_color},OutlineColour={outline_color},Alignment=2,MarginV={margin_v},Outline={final_outline},Shadow=1"

    in_file = ffmpeg.input(input_video)
    video = in_file.video.filter('subtitles', subtitle_file, force_style=force_style)
    audio = in_file.audio
    
    (
        ffmpeg
        .output(video, audio, output_video, vcodec='libx264', acodec='copy')
        .run(overwrite_output=True)
    )
    return output_video
