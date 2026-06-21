import os
import sys
import subprocess

sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))
from app.services.stt_service import burn_subtitles_to_video

def create_dummy_video(output_path):
    print("Membentuk video dummy berdurasi 3 detik...")
    cmd = [
        "ffmpeg", "-y",
        "-f", "lavfi", "-i", "testsrc=duration=3:size=640x360:rate=30",
        "-f", "lavfi", "-i", "anullsrc=channel_layout=stereo:sample_rate=44100",
        "-c:v", "libx264", "-c:a", "aac", "-shortest",
        output_path
    ]
    subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    print("Video dummy berhasil dibuat!")

def create_dummy_srt(output_path):
    srt_content = """1
00:00:00,500 --> 00:00:02,500
Ini adalah teks uji coba (Subtitle)
"""
    with open(output_path, "w", encoding="utf-8") as f:
        f.write(srt_content)
    print("File SRT dummy berhasil dibuat!")

def main():
    test_vid = "test_input.mp4"
    test_srt = "test_sub.srt"
    test_out = "test_captioned.mp4"
    
    create_dummy_video(test_vid)
    create_dummy_srt(test_srt)
    
    print("\n--- Menguji Pembakaran Subtitle (Burn-in) ---")
    try:
        burn_subtitles_to_video(test_vid, test_srt, test_out)
        if os.path.exists(test_out):
            size = os.path.getsize(test_out)
            if size > 1000:
                print("✅ SUKSES: Video dengan subtitle berhasil di-render tanpa error ffmpeg!")
            else:
                print("❌ GAGAL: Video output terlalu kecil, mungkin error.")
        else:
            print("❌ GAGAL: File output tidak ditemukan.")
    except Exception as e:
        print(f"❌ ERROR: {e}")
        
    # Cleanup
    for f in [test_vid, test_srt, test_out]:
        if os.path.exists(f):
            os.remove(f)

if __name__ == "__main__":
    main()
