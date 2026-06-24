import os
from app.config import settings
from openai import OpenAI
import ffmpeg

import math

def format_timestamp(seconds: float) -> str:
    hours = math.floor(seconds / 3600)
    seconds %= 3600
    minutes = math.floor(seconds / 60)
    seconds %= 60
    milliseconds = round((seconds - math.floor(seconds)) * 1000)
    if milliseconds == 1000:
        seconds += 1
        milliseconds = 0
        # Simple cascade, practically rare to overflow beyond this point in typical subtitles
    seconds = math.floor(seconds)
    return f"{hours:02d}:{minutes:02d}:{seconds:02d},{milliseconds:03d}"

def format_ass_timestamp(seconds: float) -> str:
    hours = math.floor(seconds / 3600)
    seconds %= 3600
    minutes = math.floor(seconds / 60)
    seconds %= 60
    centiseconds = round((seconds - math.floor(seconds)) * 100)
    if centiseconds >= 100:
        seconds += 1
        centiseconds -= 100
    seconds = math.floor(seconds)
    return f"{hours}:{minutes:02d}:{seconds:02d}.{centiseconds:02d}"

def transcribe_with_openai(audio_path: str, capitalize: bool = False) -> dict:
    """
    Transcribe audio using OpenAI Whisper API and return dict with SRT and ASS subtitle strings.
    If capitalize=True, all subtitle words are converted to UPPERCASE.
    """
    if not settings.openai_api_key:
        raise ValueError("OpenAI API Key is missing")

    client = OpenAI(api_key=settings.openai_api_key)
    with open(audio_path, "rb") as audio_file:
        transcription = client.audio.transcriptions.create(
            model="whisper-1",
            file=audio_file,
            response_format="verbose_json",
            timestamp_granularities=["word"]
        )

    words = transcription.words if hasattr(transcription, 'words') else transcription.get('words', [])

    if not words:
        # Fallback just in case
        text = transcription.text if hasattr(transcription, 'text') else transcription.get('text', '')
        return {"srt": f"1\n00:00:00,000 --> 00:00:05,000\n{text}\n", "ass": ""}

    srt_lines = []
    ass_events = []
    
    chunk = []
    chunk_start = 0.0
    chunk_end = 0.0
    counter = 1
    
    MAX_WORDS = 5
    
    for i, w_obj in enumerate(words):
        w = w_obj.word if hasattr(w_obj, 'word') else w_obj.get('word', '')
        start = w_obj.start if hasattr(w_obj, 'start') else w_obj.get('start', 0.0)
        end = w_obj.end if hasattr(w_obj, 'end') else w_obj.get('end', 0.0)
        
        if not chunk:
            chunk_start = start
        
        word_clean = w.strip()
        if capitalize:
            word_clean = word_clean.upper()
        chunk.append({'word': word_clean, 'start': start, 'end': end})
        chunk_end = end
        
        # Split condition: 5 words or long pause (> 1 second) or last word
        next_is_pause = False
        if i < len(words) - 1:
            next_w_obj = words[i+1]
            next_start = next_w_obj.start if hasattr(next_w_obj, 'start') else next_w_obj.get('start', 0.0)
            if next_start - end > 1.0:
                next_is_pause = True

        if len(chunk) >= MAX_WORDS or i == len(words) - 1 or next_is_pause:
            start_str = format_timestamp(chunk_start)
            end_str = format_timestamp(chunk_end)
            text_str = " ".join([cw['word'] for cw in chunk])

            srt_lines.append(f"{counter}")
            srt_lines.append(f"{start_str} --> {end_str}")
            srt_lines.append(text_str)
            srt_lines.append("")

            # ── Per-word Dialogue events ──
            # Setiap kata dapat satu Dialogue event sendiri.
            # Event menampilkan SELURUH teks chunk, tapi hanya kata yang
            # sedang diucapkan yang berwarna kuning (PrimaryColour via \c),
            # sisanya putih. Tidak ada animasi karaoke per karakter.
            #
            # Contoh: chunk ["Halo","semua","datang"]
            # → 3 Dialogue events, masing-masing dengan timing:
            #   event1: start=0.0, end=0.3 → {\c&H00D7FF&}Halo {\c&HFFFFFF&}semua datang
            #   event2: start=0.3, end=0.7 → {\c&HFFFFFF&}Halo {\c&H00D7FF&}semua {\c&HFFFFFF&}datang
            #   event3: start=0.7, end=1.0 → {\c&HFFFFFF&}Halo semua {\c&H00D7FF&}datang
            YELLOW = "&H00D7FF&"   # Kuning (BGR) — kata yang sedang diucapkan
            WHITE  = "&H00FFFFFF&"  # Putih (BGR) — kata sebelum/sesudah

            for wi, cw in enumerate(chunk):
                w_start = cw['start']
                # Akhir event: start kata berikutnya, atau chunk_end untuk kata terakhir
                if wi < len(chunk) - 1:
                    w_end = chunk[wi + 1]['start']
                else:
                    w_end = chunk_end

                # Bangun teks dengan \c tag: hanya kata ke-wi yang kuning
                parts = []
                for pj, pw in enumerate(chunk):
                    if pj == wi:
                        parts.append(f"{{\\c{YELLOW}}}{pw['word']}{{\\c{WHITE}}}")
                    else:
                        parts.append(pw['word'])

                dialogue_text = " ".join(parts)
                # Pastikan teks diawali warna putih agar kata sebelum highlight
                # tidak mewarisi PrimaryColour dari style (misal kuning)
                dialogue_text = f"{{\\c{WHITE}}}{dialogue_text}"
                ass_w_start = format_ass_timestamp(w_start)
                ass_w_end = format_ass_timestamp(w_end)
                ass_events.append(
                    f"Dialogue: 0,{ass_w_start},{ass_w_end},Default,,0,0,0,,{dialogue_text}"
                )

            counter += 1
            chunk = []
            
    ass_header = """[Script Info]
ScriptType: v4.00+
PlayResX: 384
PlayResY: 288

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,Arial,24,&H00FFFFFF,&H00FFFFFF,&H00000000,&H00000000,-1,0,0,0,100,100,0,0,1,2,1,2,10,10,15,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""
    ass_full = ass_header + "\n".join(ass_events)
    return {"srt": "\n".join(srt_lines), "ass": ass_full}

import json

def burn_subtitles_to_video(input_video: str, subtitle_file: str, output_video: str):
    """Burns the subtitle (ASS/SRT) file into the video using FFmpeg"""
    
    # Baca pengaturan
    settings_file = "/home/kangdemuh/aplikasi/video-editor/claude2/backend/app/global_settings.json"
    settings = {}
    if os.path.exists(settings_file):
        with open(settings_file, "r") as f:
            settings = json.load(f)
            
    # Default config
    font_name = settings.get("caption_font", "The Bold Font")
    font_size = settings.get("caption_size", 24)
    caption_template = settings.get("caption_template", "classic")
    
    # Konversi hex ke BGR hex untuk ASS (misal #FF0000 -> &H0000FF)
    def hex_to_ass(hex_code):
        h = hex_code.lstrip('#')
        if len(h) == 6:
            return f"&H00{h[4:6]}{h[2:4]}{h[0:2]}"
        return "&H00FFFFFF"
        
    font_color = hex_to_ass(settings.get("caption_color", "#FFFFFF"))
    outline_color = hex_to_ass(settings.get("caption_outline", "#000000"))
    
    # Secondary color = warna saat belum terucap (biasanya putih)
    # Primary color = warna saat sedang terucap (sorotan)
    secondary_color = "&H00FFFFFF"
    
    if caption_template == "karaoke_yellow":
        font_color = "&H0000D7FF" # Kuning BGR
        secondary_color = "&H00FFFFFF" # Putih BGR
        font_name = "The Bold Font"
    elif caption_template == "karaoke_green":
        font_color = "&H0000FF00" # Hijau BGR
        secondary_color = "&H00FFFFFF"
        font_name = "The Bold Font"
    elif caption_template == "classic":
        # Classic tidak ada karaoke, biarkan primary color sesuai font_color
        secondary_color = font_color
    
    # Position (0-100)
    position_percent = settings.get("caption_position", 15)
    
    # Secara default untuk file SRT/ASS, FFmpeg/libass menggunakan resolusi kanvas virtual 384x288.
    virtual_height = 288
    margin_v = int((position_percent / 100.0) * virtual_height)
    margin_v = min(margin_v, virtual_height - int(font_size * 1.5))
    
    outline_enabled = settings.get("caption_outline_enabled", True)
    outline_size = settings.get("caption_outline_size", 2)
    final_outline = outline_size if outline_enabled else 0
    
    force_style = f"Fontname={font_name},Fontsize={font_size},PrimaryColour={font_color},SecondaryColour={secondary_color},OutlineColour={outline_color},Alignment=2,MarginV={margin_v},Outline={final_outline},Shadow=1"

    # ── Classic template: hapus \c color tag agar teks satu warna ──
    subtitle_path = subtitle_file
    if caption_template == "classic":
        import re, tempfile
        with open(subtitle_file, "r") as f:
            ass_content = f.read()
        # Hapus semua inline \c tag ({\c&HXXXXXX&}) dari Dialogue events
        ass_clean = re.sub(r"\{\\c&H[0-9A-Fa-f]+&\}", "", ass_content)
        tmp = tempfile.NamedTemporaryFile(mode="w", suffix=".ass", delete=False, encoding="utf-8")
        tmp.write(ass_clean)
        tmp.close()
        subtitle_path = tmp.name

    in_file = ffmpeg.input(input_video)
    video = in_file.video.filter('subtitles', subtitle_path, force_style=force_style)
    audio = in_file.audio
    
    (
        ffmpeg
        .output(video, audio, output_video, vcodec='libx264', acodec='copy')
        .run(overwrite_output=True)
    )
    return output_video
