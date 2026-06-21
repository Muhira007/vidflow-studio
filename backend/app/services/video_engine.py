import subprocess
import re
import ffmpeg
import os

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
        
        # Cek hening di awal
        if silences and silences[0][0] == 0.0:
            start_time = silences[0][1] - padding
            start_time = max(0.0, start_time)
            
        # Cek hening di akhir
        if silences and silences[-1][1] >= duration - min_duration:
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

def render_final_video(input_video: str, output_video: str, resolution: str = "1080p"):
    """Render video final secara dinamis dengan mempertahankan aspect ratio."""
    # Ambil info resolusi asli
    probe = ffmpeg.probe(input_video)
    video_stream = next(s for s in probe['streams'] if s['codec_type'] == 'video')
    width = int(video_stream.get('width', 1920))
    height = int(video_stream.get('height', 1080))
    
    # Deteksi apakah orientasi horizontal (landscape) atau vertical/square (portrait)
    is_vertical = height >= width

    # Tentukan skala maksimum berdasarkan parameter resolution
    if resolution.upper() == "4K":
        target_max = 3840 if not is_vertical else 2160
    elif resolution.upper() == "720P":
        target_max = 1280 if not is_vertical else 720
    else: # default 1080p
        target_max = 1920 if not is_vertical else 1080

    # Gunakan filter scale ffmpeg yang otomatis mempertahankan rasio aspek
    # Nilai -2 memastikan dimensi akhir bisa dibagi 2 (syarat wajib codec libx264)
    if not is_vertical:
        scale_w = target_max
        scale_h = -2
    else:
        # Jika video vertikal (seperti TikTok/Reels), target_max (misal 1080) menjadi tingginya atau lebarnya
        scale_w = -2
        scale_h = target_max

    (
        ffmpeg
        .input(input_video)
        .filter('scale', w=scale_w, h=scale_h)
        .output(output_video, vcodec='libx264', preset='fast', crf=23, acodec='aac')
        .run(overwrite_output=True)
    )
    return output_video
