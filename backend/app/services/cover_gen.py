import os
import textwrap
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

def _wrap_text(text: str, font, max_width: int, draw) -> list[str]:
    """Bungkus teks menjadi beberapa baris agar tidak melebihi max_width pixel."""
    words = text.split()
    lines = []
    current_line = ""

    for word in words:
        test_line = f"{current_line} {word}".strip()
        bbox = draw.textbbox((0, 0), test_line, font=font)
        w = bbox[2] - bbox[0]
        if w <= max_width:
            current_line = test_line
        else:
            if current_line:
                lines.append(current_line)
            current_line = word

    if current_line:
        lines.append(current_line)

    return lines if lines else [text]


def _measure_text_height(draw, text: str, font, max_width: int) -> tuple[int, list[str]]:
    """Ukur tinggi total & return lines tanpa render."""
    lines = _wrap_text(text, font, max_width, draw)
    line_height = draw.textbbox((0, 0), "Ag", font=font)[3] - draw.textbbox((0, 0), "Ag", font=font)[1]
    return len(lines) * (line_height + 4), lines


def _draw_multiline_text(draw, lines: list[str], font, x: float, y: float, fill: tuple, shadow: bool = False, shadow_fill: tuple = None):
    """Render teks multi-baris yang sudah di-wrap."""
    line_height = draw.textbbox((0, 0), "Ag", font=font)[3] - draw.textbbox((0, 0), "Ag", font=font)[1]

    for i, line in enumerate(lines):
        line_y = y + i * (line_height + 4)
        if shadow and shadow_fill:
            draw.text((x + 2, line_y + 2), line, font=font, fill=shadow_fill)
        draw.text((x, line_y), line, font=font, fill=fill)


def generate_cover_image(
    base_image_path: str,
    output_path: str,
    title: str = "AUTO VIDEO",
    template: str = "default",
    title_position: str = "Tengah Besar",
    bg_opacity: int = 40,
):
    """Tambahkan teks/elemen desain ke frame base menggunakan Pillow.

    Args:
        title_position: "Tengah Besar" | "Kiri Atas" | "Kiri Bawah" | "Bawah (Lower Third)"
        bg_opacity: Opacity background teks (0-100)
    """
    try:
        img = Image.open(base_image_path).convert("RGBA")
    except Exception as e:
        raise Exception(f"Tidak dapat membuka gambar base: {e}")

    draw = ImageDraw.Draw(img)
    width, height = img.size

    # Font scaling berdasarkan tinggi gambar
    try:
        font = ImageFont.truetype("/usr/share/fonts/truetype/freefont/FreeSansBold.ttf", size=int(height * 0.1))
    except IOError:
        try:
            font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", size=int(height * 0.1))
        except IOError:
            font = ImageFont.load_default()

    # Hitung posisi teks berdasarkan title_position
    text_bbox = draw.textbbox((0, 0), title, font=font)
    text_w = text_bbox[2] - text_bbox[0]
    text_h = text_bbox[3] - text_bbox[1]

    if "Kiri Atas" in title_position:
        text_x = int(width * 0.05)
        text_y = int(height * 0.05)
    elif "Kiri Bawah" in title_position:
        text_x = int(width * 0.05)
        text_y = height - text_h - int(height * 0.1)
    elif "Lower Third" in title_position or "Bawah" in title_position:
        text_x = (width - text_w) / 2
        text_y = height - text_h - int(height * 0.12)
    else:  # "Tengah Besar" — default centered
        text_x = (width - text_w) / 2
        text_y = (height - text_h) / 2

    bg_alpha = int(255 * bg_opacity / 100)
    max_text_w = int(width * 0.9)  # 90% lebar gambar
    padding = 20

    # Ukur teks dulu (tanpa render) supaya background bisa digambar lebih dulu
    text_h_total, text_lines = _measure_text_height(draw, title, font, max_text_w)
    # Hitung ulang posisi Y untuk center secara vertikal
    center_y = (height - text_h_total) / 2

    if template == "tpl_1" or template == "default":
        # Minimalist Bold: backdrop → teks tengah + shadow
        text_w = min(max_text_w, max(draw.textbbox((0, 0), line, font=font)[2] for line in text_lines))
        draw.rounded_rectangle(
            [(width/2 - text_w/2 - padding, center_y - padding),
             (width/2 + text_w/2 + padding, center_y + text_h_total + padding)],
            radius=12, fill=(0, 0, 0, bg_alpha)
        )
        _draw_multiline_text(
            draw, text_lines, font, width/2 - text_w/2, center_y,
            fill=(255, 255, 255, 255),
            shadow=True, shadow_fill=(0, 0, 0, 200)
        )

    elif template == "tpl_2":
        # News Style: Lower third full-width + garis merah
        rect_y = height - text_h_total - 60
        draw.rectangle([(0, rect_y), (width, height)], fill=(20, 30, 80, bg_alpha + 50))
        draw.rectangle([(0, rect_y), (width, rect_y + 8)], fill=(220, 30, 30, 255))
        _draw_multiline_text(
            draw, text_lines, font, int(width * 0.05), rect_y + 20,
            fill=(255, 255, 255, 255)
        )

    elif template == "tpl_3":
        # Gaming Focus: Kotak ungu kiri atas + teks kuning
        text_w = min(max_text_w, max(draw.textbbox((0, 0), line, font=font)[2] for line in text_lines))
        draw.rounded_rectangle(
            [(text_x - padding, center_y - padding),
             (text_x + text_w + padding, center_y + text_h_total + padding)],
            radius=10, fill=(90, 20, 150, bg_alpha + 40)
        )
        _draw_multiline_text(
            draw, text_lines, font, text_x, center_y,
            fill=(255, 200, 0, 255),
            shadow=True, shadow_fill=(0, 0, 0, 255)
        )

    elif template == "tpl_4":
        # Vlog Setup: Border putih + rounded box tengah
        border_width = int(width * 0.015)
        draw.rectangle([(0, 0), (width, height)], outline=(255, 255, 255, 200), width=border_width)

        text_w = min(max_text_w, max(draw.textbbox((0, 0), line, font=font)[2] for line in text_lines))
        draw.rounded_rectangle(
            [(width/2 - text_w/2 - padding, center_y - padding),
             (width/2 + text_w/2 + padding, center_y + text_h_total + padding)],
            radius=14, fill=(0, 0, 0, bg_alpha)
        )
        _draw_multiline_text(
            draw, text_lines, font, width/2 - text_w/2, center_y,
            fill=(255, 255, 255, 255)
        )

    # Convert back to RGB for JPEG save
    img = img.convert("RGB")
    img.save(output_path, "JPEG", quality=90)
    return output_path
