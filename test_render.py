import os
import sys
import subprocess

sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))
from app.services.video_engine import render_final_video

def create_dummy_video(output_path):
    print("Membentuk video dummy berdurasi 2 detik...")
    cmd = [
        "ffmpeg", "-y",
        "-f", "lavfi", "-i", "testsrc=size=640x360:rate=30",
        "-f", "lavfi", "-i", "anoisesrc=c=white:r=48000:a=0.1",
        "-t", "2",
        "-c:v", "libx264",
        "-c:a", "aac",
        output_path
    ]
    subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    print("Video dummy berhasil dibuat!")

def main():
    test_in = "test_render_in.mp4"
    create_dummy_video(test_in)
    
    resolutions = ["720p", "1080p", "4K"]
    for res in resolutions:
        test_out = f"test_render_out_{res}.mp4"
        try:
            print(f"\nMenguji render resolusi {res}...")
            render_final_video(test_in, test_out, res)
            if os.path.exists(test_out):
                print(f"✅ SUKSES: Render {res} berhasil dibuat!")
                os.remove(test_out)
            else:
                print(f"❌ GAGAL: Render {res} file tidak ditemukan!")
        except Exception as e:
            print(f"❌ ERROR render {res}: {e}")
            import traceback
            traceback.print_exc()

    if os.path.exists(test_in):
        os.remove(test_in)

if __name__ == "__main__":
    main()
