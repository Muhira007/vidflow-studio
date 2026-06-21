import os
import sys
import subprocess

sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))
from app.services.video_engine import detect_silence, process_silence_cut, get_video_duration

def create_dummy_video(output_path):
    print("Membentuk video dummy berdurasi 5 detik dengan keheningan di detik 2 hingga 4...")
    # 0-2s: 1000Hz tone
    # 2-4s: silence
    # 4-5s: 500Hz tone
    cmd = [
        "ffmpeg", "-y",
        "-f", "lavfi", "-i", "testsrc=duration=5:size=640x360:rate=30",
        "-f", "lavfi", "-i", "sine=frequency=1000:duration=2",
        "-f", "lavfi", "-i", "anullsrc=duration=2",
        "-f", "lavfi", "-i", "sine=frequency=500:duration=1",
        "-filter_complex", "[1:a][2:a][3:a]concat=n=3:v=0:a=1[a]",
        "-map", "0:v", "-map", "[a]",
        "-c:v", "libx264", "-c:a", "aac",
        output_path
    ]
    subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    print("Video dummy berhasil dibuat!")

def main():
    test_vid = "test_silence.mp4"
    test_out = "test_silence_cut.mp4"
    
    create_dummy_video(test_vid)
    
    print("\n--- Menguji Deteksi Keheningan ---")
    silences = detect_silence(test_vid, threshold=-30.0, min_duration=0.5)
    print(f"Hasil deteksi (Harus di sekitar 2.0s - 4.0s): {silences}")
    
    print("\n--- Menguji Pemotongan (Level 2: Hapus semua hening) ---")
    # padding 0 ms agar pemotongan murni terlihat
    process_silence_cut(test_vid, test_out, level=2, threshold=-30.0, min_duration=0.5, padding_ms=0)
    
    dur_asli = get_video_duration(test_vid)
    dur_potong = get_video_duration(test_out)
    print(f"Durasi Asli: {dur_asli} detik")
    print(f"Durasi Setelah Dipotong: {dur_potong} detik")
    if dur_potong < dur_asli:
        print("✅ SUKSES: Durasi video memendek secara signifikan (Hening berhasil dibuang)!")
    else:
        print("❌ GAGAL: Video tidak terpotong.")
        
    os.remove(test_vid)
    os.remove(test_out)

if __name__ == "__main__":
    main()
