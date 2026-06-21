import os
from scenedetect import open_video, SceneManager
from scenedetect.detectors import ContentDetector
import cv2
from PIL import Image, ImageDraw, ImageFont

def extract_representative_frame(video_path: str, output_image_path: str):
    """Gunakan PySceneDetect untuk mendapatkan frame pertama dari scene terpanjang, atau scene pertama."""
    video = open_video(video_path)
    scene_manager = SceneManager()
    scene_manager.add_detector(ContentDetector(threshold=30.0))
    
    scene_manager.detect_scenes(video)
    scene_list = scene_manager.get_scene_list()
    
    # Ambil frame tengah dari scene pertama atau video jika tidak ada scene
    capture = cv2.VideoCapture(video_path)
    
    if scene_list:
        # Ambil scene pertama
        start_time, end_time = scene_list[0]
        frame_num = start_time.get_frames() + int((end_time.get_frames() - start_time.get_frames()) / 2)
    else:
        # Default: 1 detik pertama atau frame 30
        frame_num = 30
        
    capture.set(cv2.CAP_PROP_POS_FRAMES, frame_num)
    ret, frame = capture.read()
    
    if ret:
        cv2.imwrite(output_image_path, frame)
    else:
        raise Exception("Gagal mengekstrak frame untuk cover.")
    
    capture.release()
    return output_image_path

def generate_cover_image(base_image_path: str, output_path: str, title: str = "AUTO VIDEO", template: str = "default"):
    """Tambahkan teks/elemen desain ke frame base menggunakan Pillow."""
    try:
        img = Image.open(base_image_path)
    except Exception as e:
        raise Exception(f"Tidak dapat membuka gambar base: {e}")
        
    draw = ImageDraw.Draw(img)
    width, height = img.size
    
    # Simple default template: overlay teks besar di tengah dengan background semi-transparan
    if template == "default":
        # Gambar kotak background
        rect_height = int(height * 0.2)
        rect_y = height - rect_height - 50
        draw.rectangle(
            [(0, rect_y), (width, rect_y + rect_height)],
            fill=(0, 0, 0, 150)  # Hitam transparan
        )
        
        # Tambahkan teks (pastikan font default tersedia atau gunakan load_default)
        try:
            # Mencoba load Arial, jika gagal gunakan default
            font = ImageFont.truetype("Arial.ttf", size=int(height * 0.1))
        except IOError:
            font = ImageFont.load_default()
            
        # Draw text shadow/outline
        text_x = 50
        text_y = rect_y + int(rect_height * 0.2)
        
        draw.text((text_x+2, text_y+2), title, font=font, fill=(0,0,0,255))
        draw.text((text_x, text_y), title, font=font, fill=(255,255,255,255))
        
    # Simpan hasil
    img.save(output_path, "JPEG", quality=90)
    return output_path
