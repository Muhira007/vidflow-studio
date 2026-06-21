import os
import sys
import subprocess

sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))
from app.services.cover_gen import extract_representative_frame, generate_cover_image

def create_dummy_video(output_path):
    print("Membentuk video dummy berdurasi 3 detik...")
    # Generate a video with some moving pattern so scenedetect might find a scene
    cmd = [
        "ffmpeg", "-y",
        "-f", "lavfi", "-i", "mandelbrot=size=640x360:rate=30",
        "-t", "3",
        "-c:v", "libx264",
        output_path
    ]
    subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    print("Video dummy berhasil dibuat!")

def main():
    test_vid = "test_cover.mp4"
    test_frame = "test_frame.jpg"
    test_out = "test_cover_final.jpg"
    
    create_dummy_video(test_vid)
    
    print("\n--- Menguji Ekstraksi Frame Cover ---")
    try:
        extract_representative_frame(test_vid, test_frame)
        if os.path.exists(test_frame):
            print("✅ SUKSES: Frame perwakilan berhasil diambil!")
        else:
            print("❌ GAGAL: File frame tidak ditemukan.")
            
        print("\n--- Menguji Pembuatan Cover (PIL) ---")
        templates = ["tpl_1", "tpl_2", "tpl_3", "tpl_4"]
        for tpl in templates:
            out_name = f"test_cover_{tpl}.jpg"
            generate_cover_image(test_frame, out_name, title=f"Testing {tpl}", template=tpl)
            if os.path.exists(out_name):
                print(f"✅ SUKSES: Cover {tpl} berhasil dibuat!")
                os.remove(out_name)
            else:
                print(f"❌ GAGAL: File cover {tpl} tidak ditemukan.")
    except Exception as e:
        print(f"❌ ERROR: {e}")
        
    # Cleanup
    for f in [test_vid, test_frame, test_out]:
        if os.path.exists(f):
            os.remove(f)

if __name__ == "__main__":
    main()
