import os
from app.config import settings
from openai import OpenAI
from deepgram import DeepgramClient

def transcribe_with_openai(audio_path: str) -> str:
    """Transcribe audio using OpenAI Whisper API and return ASS subtitle string (or raw segments)."""
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

def transcribe_with_deepgram(audio_path: str) -> str:
    """Transcribe audio using Deepgram Nova-3 API."""
    if not settings.deepgram_api_key:
        raise ValueError("Deepgram API Key is missing")
        
    deepgram = DeepgramClient(settings.deepgram_api_key)
    
    with open(audio_path, "rb") as audio_file:
        buffer_data = audio_file.read()
    
    response = deepgram.listen.v1.media.transcribe_file(
        request=buffer_data,
        model="nova-3",
        language="id",
        smart_format=True
    )
    
    # Deepgram returns a complex object; return json representation
    return response.to_json(indent=4)

def burn_subtitles_to_video(input_video: str, subtitle_file: str, output_video: str):
    import ffmpeg
    """Burns the subtitle (ASS/SRT) file into the video using FFmpeg"""
    # ffmpeg -i input.mp4 -vf subtitles=sub.srt output.mp4
    (
        ffmpeg
        .input(input_video)
        .filter('subtitles', subtitle_file)
        .output(output_video, vcodec='libx264', acodec='copy')
        .run(overwrite_output=True)
    )
    return output_video
