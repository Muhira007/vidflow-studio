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

def burn_subtitles_to_video(input_video: str, subtitle_file: str, output_video: str):
    """Burns the subtitle (ASS/SRT) file into the video using FFmpeg"""
    in_file = ffmpeg.input(input_video)
    video = in_file.video.filter('subtitles', subtitle_file)
    audio = in_file.audio
    
    (
        ffmpeg
        .output(video, audio, output_video, vcodec='libx264', acodec='copy')
        .run(overwrite_output=True)
    )
    return output_video
