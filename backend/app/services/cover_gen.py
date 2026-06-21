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
        img = Image.open(base_image_path).convert("RGBA")
    except Exception as e:
        raise Exception(f"Tidak dapat membuka gambar base: {e}")
        
    draw = ImageDraw.Draw(img)
    width, height = img.size
    
    # Gunakan FreeSans atau DejaVuSans yang umum di Linux
    try:
        font = ImageFont.truetype("/usr/share/fonts/truetype/freefont/FreeSansBold.ttf", size=int(height * 0.1))
    except IOError:
        try:
            font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", size=int(height * 0.1))
        except IOError:
            font = ImageFont.load_default()

    if template == "tpl_1" or template == "default":
        # Minimalist Bold: Teks besar di tengah dengan shadow
        text_bbox = draw.textbbox((0, 0), title, font=font)
        text_w = text_bbox[2] - text_bbox[0]
        text_h = text_bbox[3] - text_bbox[1]
        text_x = (width - text_w) / 2
        text_y = (height - text_h) / 2

        # Draw shadow
        draw.text((text_x + 4, text_y + 4), title, font=font, fill=(0, 0, 0, 200))
        # Draw text
        draw.text((text_x, text_y), title, font=font, fill=(255, 255, 255, 255))

    elif template == "tpl_2":
        # News Style: Lower third background biru dengan teks putih
        rect_height = int(height * 0.2)
        rect_y = height - rect_height - int(height * 0.05)
        
        draw.rectangle([(0, rect_y), (width, rect_y + rect_height)], fill=(20, 30, 80, 230))
        draw.rectangle([(0, rect_y), (width, rect_y + 10)], fill=(220, 30, 30, 255))

        text_bbox = draw.textbbox((0, 0), title, font=font)
        text_x = int(width * 0.05)
        text_y = rect_y + int((rect_height - (text_bbox[3] - text_bbox[1])) / 2)
        
        draw.text((text_x, text_y), title, font=font, fill=(255, 255, 255, 255))

    elif template == "tpl_3":
        # Gaming Focus: Teks di pojok kiri atas
        rect_width = int(width * 0.6)
        rect_height = int(height * 0.25)
        draw.rectangle([(0, 0), (rect_width, rect_height)], fill=(90, 20, 150, 200))
        
        text_x = int(width * 0.05)
        text_y = int(height * 0.05)
        draw.text((text_x + 2, text_y + 2), title, font=font, fill=(0, 0, 0, 255))
        draw.text((text_x, text_y), title, font=font, fill=(255, 200, 0, 255))

    elif template == "tpl_4":
        # Vlog Setup: Border putih, teks bawah tengah
        border_width = int(width * 0.02)
        draw.rectangle([(0, 0), (width, height)], outline=(255, 255, 255, 255), width=border_width)
        
        text_bbox = draw.textbbox((0, 0), title, font=font)
        text_w = text_bbox[2] - text_bbox[0]
        text_x = (width - text_w) / 2
        text_y = height - int(height * 0.2)
        
        padding = 20
        draw.rounded_rectangle(
            [(text_x - padding, text_y - padding), (text_x + text_w + padding, text_y + (text_bbox[3]-text_bbox[1]) + padding)],
            radius=15,
            fill=(0, 0, 0, 180)
        )
        draw.text((text_x, text_y), title, font=font, fill=(255, 255, 255, 255))

    # Convert back to RGB for JPEG save
    img = img.convert("RGB")
    # Simpan hasil
    img.save(output_path, "JPEG", quality=90)
    return output_path
