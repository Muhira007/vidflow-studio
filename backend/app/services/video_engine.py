import subprocess
import re
import ffmpeg
import os
import json

def detect_silence(input_path: str, threshold: float = -30.0, min_duration: float = 0.3):
    """
    Menjalankan ffmpeg silencedetect untuk mendapatkan daftar waktu hening.
    Mengembalikan list tuple: [(silence_start, silence_end), ...]
    """
    command = [
        "ffmpeg",
        "-i", input_path,
        "-af", f"silencedetect=noise={threshold}dB:d={min_duration}",
        "-f", "null",
        "-"
    ]
    
    # Run FFmpeg and capture stderr
    process = subprocess.Popen(command, stderr=subprocess.PIPE, stdout=subprocess.PIPE, universal_newlines=True)
    _, stderr = process.communicate()
    
    silence_starts = []
    silence_ends = []
    
    for line in stderr.split('\n'):
        if "silence_start" in line:
            match = re.search(r"silence_start:\s+([\d\.]+)", line)
            if match:
                silence_starts.append(float(match.group(1)))
        elif "silence_end" in line:
            match = re.search(r"silence_end:\s+([\d\.]+)", line)
            if match:
                silence_ends.append(float(match.group(1)))
                
    silences = list(zip(silence_starts, silence_ends))
    return silences

def get_video_duration(input_path: str) -> float:
    probe = ffmpeg.probe(input_path)
    video_info = next(s for s in probe['streams'] if s['codec_type'] == 'video')
    return float(video_info['duration'])


def get_video_info(input_path: str) -> dict:
    """Ambil informasi video: width, height, pixel format, bit depth.

    Returns dict dengan keys: width, height, pix_fmt, is_10bit, need_downscale
    """
    probe = ffmpeg.probe(input_path)
    video_info = next(s for s in probe['streams'] if s['codec_type'] == 'video')
    w = int(video_info.get('width', 1920))
    h = int(video_info.get('height', 1080))
    pix_fmt = video_info.get('pix_fmt', 'yuv420p')
    is_10bit = '10' in pix_fmt or 'p010' in pix_fmt or 'p016' in pix_fmt
    need_downscale = w > 1920 or h > 1080
    return {
        'width': w, 'height': h,
        'pix_fmt': pix_fmt,
        'is_10bit': is_10bit,
        'need_downscale': need_downscale,
    }


def downscale_to_1080p(input_path: str, output_path: str, is_10bit: bool = False) -> str:
    """Downscale video ke 1080p dengan kualitas tinggi (hampir lossless).

    - 10-bit source → H.265 10-bit, CRF 10
    - 8-bit source  → H.264 8-bit, CRF 8
    - Auto-deteksi orientasi: landscape → 1920x1080, portrait → 1080x1920

    Audio di-stream-copy (tidak di-reencode).
    """
    # Deteksi orientasi video
    probe = ffmpeg.probe(input_path)
    video_stream = next(s for s in probe['streams'] if s['codec_type'] == 'video')
    w = int(video_stream.get('width', 1920))
    h = int(video_stream.get('height', 1080))
    is_vertical = h > w

    # Pilih target scale berdasarkan orientasi
    if is_vertical:
        scale_filter = 'scale=1080:1920:force_original_aspect_ratio=decrease'
    else:
        scale_filter = 'scale=1920:1080:force_original_aspect_ratio=decrease'

    if is_10bit:
        # H.265 10-bit — pertahankan kualitas warna tinggi
        (
            ffmpeg
            .input(input_path)
            .output(
                output_path,
                vf=scale_filter,
                vcodec='libx265', crf=10, preset='medium',
                pix_fmt='yuv420p10le',
                acodec='copy',
            )
            .run(overwrite_output=True)
        )
    else:
        # H.264 8-bit — CRF sangat rendah untuk kualitas transparan
        (
            ffmpeg
            .input(input_path)
            .output(
                output_path,
                vf=scale_filter,
                vcodec='libx264', crf=8, preset='medium',
                pix_fmt='yuv420p',
                acodec='copy',
            )
            .run(overwrite_output=True)
        )
    return output_path

def process_silence_cut(input_path: str, output_path: str, level: int = 1, threshold: float = -30.0, min_duration: float = 0.3, padding_ms: int = 150):
    """
    Melakukan silence cut pada video.
    level 1: Trim awal dan akhir saja.
    level 2: Hapus semua hening di tengah video juga.
    """
    silences = detect_silence(input_path, threshold, min_duration)
    if not silences:
        # Tidak ada silence yang terdeteksi
        # Salin file atau lakukan stream copy
        ffmpeg.input(input_path).output(output_path, c='copy').run(overwrite_output=True)
        return
        
    duration = get_video_duration(input_path)
    padding = padding_ms / 1000.0
    
    segments_to_keep = []
    
    if level == 1:
        # Hanya trim awal dan akhir
        start_time = 0.0
        end_time = duration
        
        # Cek hening di awal (toleransi 0.5 detik karena ffmpeg sering deteksi mulai dari 0.02s)
        if silences and silences[0][0] <= 0.5:
            start_time = silences[0][1] - padding
            start_time = max(0.0, start_time)
            
        # Cek hening di akhir (toleransi 0.5 detik)
        if silences and silences[-1][1] >= duration - 0.5:
            end_time = silences[-1][0] + padding
            end_time = min(duration, end_time)
            
        segments_to_keep.append((start_time, end_time))
        
    elif level == 2:
        # Potong semua hening
        current_time = 0.0
        for s_start, s_end in silences:
            keep_start = current_time
            keep_end = s_start + padding
            
            # Jika padding melebihi start time, sesuaikan
            if keep_end > keep_start and (keep_end - keep_start) > 0.1:
                segments_to_keep.append((keep_start, keep_end))
                
            current_time = max(s_end - padding, keep_end)
            
        if current_time < duration:
            segments_to_keep.append((current_time, duration))
            
    if not segments_to_keep:
        # Video mungkin full silence
        ffmpeg.input(input_path).output(output_path, c='copy').run(overwrite_output=True)
        return
        
    # Bangun graph pemotongan
    in_file = ffmpeg.input(input_path)
    streams = []
    
    for (start, end) in segments_to_keep:
        v = in_file.video.filter('trim', start=start, end=end).filter('setpts', 'PTS-STARTPTS')
        a = in_file.audio.filter('atrim', start=start, end=end).filter('asetpts', 'PTS-STARTPTS')
        streams.extend([v, a])
        
    joined = ffmpeg.concat(*streams, v=1, a=1)
    out = ffmpeg.output(joined, output_path)
    out.run(overwrite_output=True)
    
    return True

def extract_audio(input_video: str, output_audio: str):
    """Mengekstrak audio dari video untuk diproses oleh layanan STT."""
    (
        ffmpeg
        .input(input_video)
        .output(output_audio, vn=None, acodec='libmp3lame', q=4)
        .run(overwrite_output=True)
    )
    return output_audio

def render_final_video(input_video: str, output_video: str, resolution: str = "1080p", cover_image_path: str = None, output_format: str = "MP4 (H.264)"):
    """Render video final secara dinamis dengan mempertahankan aspect ratio dan menyisipkan cover di frame awal."""
    # Ambil info resolusi asli
    probe = ffmpeg.probe(input_video)
    video_stream = next(s for s in probe['streams'] if s['codec_type'] == 'video')
    width = int(video_stream.get('width', 1920))
    height = int(video_stream.get('height', 1080))

    # Deteksi apakah orientasi horizontal (landscape) atau vertical/square (portrait)
    is_vertical = height >= width

    # Tentukan dimensi pendek (short side) berdasarkan parameter resolution
    # Landscape 1080p → short side = 1080 (height)
    # Portrait 1080p  → short side = 1080 (width)
    if resolution.upper() == "720P":
        target_short = 720
        target_long = 1280
    else:  # default 1080p
        target_short = 1080
        target_long = 1920

    # scale_w = dimensi pendek (lebar untuk portrait, tinggi untuk landscape nanti auto dari aspect ratio)
    # Untuk portrait:  scale=1080:-2  → 1080x1920
    # Untuk landscape: scale=1920:-2  → 1920x1080
    if is_vertical:
        scale_w = target_short   # lebar = sisi pendek
        scale_h = -2             # tinggi otomatis (jadi 1920)
    else:
        scale_w = target_long    # lebar = sisi panjang
        scale_h = -2             # tinggi otomatis (jadi 1080)

    # Map format ke codec + container
    format_map = {
        "MP4 (H.264)": {"vcodec": "libx264", "acodec": "aac"},
        "MP4 (H.265 / HEVC)": {"vcodec": "libx265", "acodec": "aac"},
        "WebM": {"vcodec": "libvpx-vp9", "acodec": "libopus"},
    }
    codec = format_map.get(output_format, format_map["MP4 (H.264)"])

    in_file = ffmpeg.input(input_video)
    video = in_file.video.filter('scale', w=scale_w, h=scale_h)
    audio = in_file.audio

    if cover_image_path and os.path.exists(cover_image_path):
        cover = ffmpeg.input(cover_image_path).filter('scale', w=scale_w, h=scale_h)
        # Overlay cover on video for the first 0.1 seconds (approx 3 frames at 30fps)
        video = ffmpeg.overlay(video, cover, enable='between(t,0,0.1)')

    (
        ffmpeg
        .output(video, audio, output_video,
                vcodec=codec["vcodec"], preset='fast', crf=23,
                acodec=codec["acodec"],
                pix_fmt='yuv420p')  # Konversi ke 8-bit untuk kompatibilitas maksimum
        .run(overwrite_output=True)
    )
    return output_video


def process_vad_cut(input_path: str, output_path: str, speech_segments: list, padding_ms: int = 200):
    """
    Potong video berdasarkan segmen suara manusia (dari VAD).
    Hanya pertahankan bagian video di mana ada orang berbicara.

    Args:
        input_path: Path video input
        output_path: Path video output
        speech_segments: List of dict [{"start": 0.5, "end": 3.2}, ...] dalam detik
        padding_ms: Padding sebelum/sesudah tiap segmen (ms). Default 200ms
    """
    if not speech_segments:
        # Tidak ada suara terdeteksi → salin video utuh
        ffmpeg.input(input_path).output(output_path, c='copy').run(overwrite_output=True)
        return

    padding = padding_ms / 1000.0
    in_file = ffmpeg.input(input_path)
    streams = []

    for seg in speech_segments:
        start = max(0, seg["start"] - padding)
        end = seg["end"] + padding

        if end - start < 0.3:  # Skip segmen terlalu pendek
            continue

        v = in_file.video.filter('trim', start=start, end=end).filter('setpts', 'PTS-STARTPTS')
        a = in_file.audio.filter('atrim', start=start, end=end).filter('asetpts', 'PTS-STARTPTS')
        streams.extend([v, a])

    if not streams:
        # Semua segmen terlalu pendek → fallback
        ffmpeg.input(input_path).output(output_path, c='copy').run(overwrite_output=True)
        return

    joined = ffmpeg.concat(*streams, v=1, a=1)
    out = ffmpeg.output(joined, output_path)
    out.run(overwrite_output=True)
    return True
