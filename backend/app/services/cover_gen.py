import os
import random
from scenedetect import open_video, SceneManager
from scenedetect.detectors import ContentDetector
import cv2
from PIL import Image, ImageDraw, ImageFont

def extract_representative_frame(video_path: str, output_image_path: str):
    """Ambil frame random dari video, minimal setelah detik ke-3 (hindari intro kosong)."""

    capture = cv2.VideoCapture(video_path)
    fps = capture.get(cv2.CAP_PROP_FPS)
    total_frames = int(capture.get(cv2.CAP_PROP_FRAME_COUNT))

    if fps <= 0 or total_frames <= 0:
        # Fallback: ambil pakai ffmpeg thumbnail
        import subprocess
        subprocess.run([
            "ffmpeg", "-y", "-i", video_path,
            "-ss", "3", "-vframes", "1", "-q:v", "2",
            output_image_path
        ], capture_output=True)
        if os.path.exists(output_image_path) and os.path.getsize(output_image_path) > 0:
            capture.release()
            return output_image_path
        raise Exception("Gagal mengekstrak frame: video tidak terbaca")

    duration = total_frames / fps

    # Hitung rentang frame: mulai dari detik ke-3, minimal 20% durasi
    min_second = min(3.0, duration * 0.2)
    start_frame = int(min_second * fps)
    start_frame = max(1, start_frame)

    # Coba deteksi scene dulu
    try:
        video = open_video(video_path)
        scene_manager = SceneManager()
        scene_manager.add_detector(ContentDetector(threshold=30.0))
        scene_manager.detect_scenes(video)
        scene_list = scene_manager.get_scene_list()

        # Filter scene yang start-nya >= min_second
        valid_scenes = [(s, e) for s, e in scene_list if s.get_seconds() >= min_second]

        if valid_scenes:
            # Pilih scene random dari daftar valid
            scene = random.choice(valid_scenes)
            start_t, end_t = scene
            mid_frame = start_t.get_frames() + int((end_t.get_frames() - start_t.get_frames()) / 2)
            capture.set(cv2.CAP_PROP_POS_FRAMES, mid_frame)
            ret, frame = capture.read()
            if ret:
                cv2.imwrite(output_image_path, frame)
                capture.release()
                return output_image_path
    except Exception:
        pass  # Fallback ke random frame

    # Fallback: random frame antara start_frame sampai akhir
    if total_frames > start_frame:
        random_frame = random.randint(start_frame, total_frames - 1)
    else:
        random_frame = start_frame

    capture.set(cv2.CAP_PROP_POS_FRAMES, random_frame)
    ret, frame = capture.read()

    if not ret:
        # Last resort: frame 1
        capture.set(cv2.CAP_PROP_POS_FRAMES, 0)
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


def _wrap_text_by_chars(text: str, max_chars: int) -> list[str]:
    """Bungkus teks per karakter — maksimal max_chars per baris. Potong di spasi jika memungkinkan."""
    if len(text) <= max_chars:
        return [text]

    lines = []
    remaining = text.strip()

    while len(remaining) > max_chars:
        # Cari spasi terakhir dalam batas max_chars
        chunk = remaining[:max_chars]
        last_space = chunk.rfind(" ")
        if last_space > max_chars // 2:
            # Potong di spasi
            lines.append(remaining[:last_space].strip())
            remaining = remaining[last_space:].strip()
        else:
            # Potong paksa di max_chars
            lines.append(chunk.strip())
            remaining = remaining[max_chars:].strip()

    if remaining:
        lines.append(remaining)

    return lines if lines else [text]


def _auto_font(draw, text: str, max_width: int, max_height: int, initial_size: int, font_path: str, max_chars: int = 0) -> ImageFont.FreeTypeFont:
    """Auto-kecilkan font sampai teks muat dalam max_width x max_height. Minimum 14px.

    Strategy:
    1. Mulai dari initial_size, turunkan 4px per iterasi
    2. Setiap kata tunggal harus muat horizontal dalam max_width
    3. Jika max_chars > 0: baris sepanjang max_chars karakter 'W' harus <= max_width
    4. Teks yang sudah di-wrap tidak boleh lebih dari max_lines baris
    5. Total tinggi teks yang di-wrap harus <= max_height
    6. Jika teks pendek (< 6 kata), naikkan font agar tidak terlalu kecil
    """
    word_count = len(text.split())
    font_size = initial_size

    while font_size >= 14:
        try:
            font = ImageFont.truetype(font_path, size=font_size)
        except IOError:
            return ImageFont.load_default()

        # Cek #1: setiap kata individu harus <= max_width
        words = text.split()
        overflow = False
        for word in words:
            w = draw.textbbox((0, 0), word, font=font)[2] - draw.textbbox((0, 0), word, font=font)[0]
            if w > max_width:
                overflow = True
                break

        if overflow:
            font_size -= 4
            continue

        # Cek #2: jika ada batas karakter, wrap per karakter & cek tiap baris
        if max_chars > 0:
            char_lines = _wrap_text_by_chars(text, max_chars)
            for line in char_lines:
                w_line = draw.textbbox((0, 0), line, font=font)[2]
                if w_line > max_width:
                    overflow = True
                    break
            if overflow:
                font_size -= 4
                continue

        # Wrap teks (word-wrap) & cek batas vertikal
        lines = _wrap_text(text, font, max_width, draw)
        line_h = draw.textbbox((0, 0), "Ag", font=font)[3] - draw.textbbox((0, 0), "Ag", font=font)[1]
        total_h = len(lines) * (line_h + 6)

        max_lines = 5
        if len(lines) <= max_lines and total_h <= max_height:
            # Teks pendek (1-3 kata): coba naikkan font kalau terlalu kecil
            if word_count <= 3 and font_size < initial_size:
                for test_size in range(font_size + 2, initial_size + 1, 2):
                    try:
                        test_font = ImageFont.truetype(font_path, size=test_size)
                    except IOError:
                        continue
                    if max_chars > 0:
                        char_lines = _wrap_text_by_chars(text, max_chars)
                        for line in char_lines:
                            if draw.textbbox((0, 0), line, font=test_font)[2] > max_width:
                                overflow = True
                                break
                        if overflow:
                            break
                    test_lines = _wrap_text(text, test_font, max_width, draw)
                    test_h = len(test_lines) * (draw.textbbox((0, 0), "Ag", font=test_font)[3] - draw.textbbox((0, 0), "Ag", font=test_font)[1] + 6)
                    if len(test_lines) <= 2 and test_h <= max_height:
                        font = test_font
                    else:
                        break
            return font

        font_size -= 4

    # Fallback minimum 14px
    try:
        return ImageFont.truetype(font_path, size=14)
    except IOError:
        return ImageFont.load_default()


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

    # Overlay template PNG if it's a custom template
    if template.startswith("custom_"):
        from app.paths import COVER_TEMPLATES_DIR
        overlay_path = os.path.join(COVER_TEMPLATES_DIR, f"{template}.png")
        if os.path.exists(overlay_path):
            try:
                overlay_img = Image.open(overlay_path).convert("RGBA")
                if overlay_img.size != img.size:
                    overlay_img = overlay_img.resize(img.size, Image.Resampling.LANCZOS)
                img = Image.alpha_composite(img, overlay_img)
            except Exception as e:
                print(f"Failed to overlay {template}.png: {e}")

    draw = ImageDraw.Draw(img)
    width, height = img.size

    # Font path
    font_path = "/usr/share/fonts/truetype/freefont/FreeSansBold.ttf"
    if not os.path.exists(font_path):
        font_path = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"

    # Auto font size: mulai dari 4.5% tinggi, maks 40% tinggi area teks
    max_text_w = int(width * 0.82)    # 82% lebar
    max_text_h = int(height * 0.40)   # 40% tinggi — mencegah teks terlalu besar
    initial_size = int(height * 0.048)  # ~52px di 1080p → proporsional

    font = _auto_font(draw, title, max_text_w, max_text_h, initial_size, font_path)

    # Hitung posisi teks berdasarkan title_position
    text_bbox = draw.textbbox((0, 0), title, font=font)
    text_w = text_bbox[2] - text_bbox[0]
    text_h = text_bbox[3] - text_bbox[1]

    # Tentukan posisi Y berdasarkan template
    if template == "simple_1":
        title_position = "Atas"
    elif template == "simple_2":
        title_position = "Bawah"
    elif template in ["simple_3", "simple_4", "custom_1"]:
        title_position = "Tengah Besar"
    elif template == "simple_5":
        title_position = "Atas" # Akan kita custom posisinya

    if "Kiri Atas" in title_position:
        text_x = int(width * 0.05)
        text_y = int(height * 0.05)
    elif "Atas" in title_position:
        text_x = (width - text_w) / 2
        text_y = int(height * 0.15)
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
    padding = 20

    # Ukur teks dulu (tanpa render) supaya background bisa digambar lebih dulu
    text_h_total, text_lines = _measure_text_height(draw, title, font, max_text_w)
    # Hitung ulang posisi Y untuk center secara vertikal
    center_y = (height - text_h_total) / 2

    # Parse template ID if it comes from the 120 category styles format (e.g. "skincare_style1")
    if "_" in template and "style" in template:
        style_part = template.split("_")[-1]
        # Map style1 -> tpl_1, style2 -> tpl_2, etc.
        if style_part.startswith("style"):
            num = style_part.replace("style", "")
            template = f"tpl_{num}"

    if template.startswith("grad_"):
        # Draw gradient from bottom up
        for y_grad in range(height - int(height*0.4), height):
            alpha = int(255 * (y_grad - (height - int(height*0.4))) / (int(height*0.4)))
            # Capping alpha
            alpha = min(alpha, 230)
            draw.line([(0, y_grad), (width, y_grad)], fill=(0,0,0,alpha))

        color_map = {
            "grad_1": (255, 235, 59, 255),  # Kuning
            "grad_2": (255, 255, 255, 255), # Putih
            "grad_3": (76, 175, 80, 255),   # Hijau
            "grad_4": (33, 150, 243, 255),  # Biru
            "grad_5": (244, 67, 54, 255),   # Merah
        }
        fill_color = color_map.get(template, (255,255,255,255))
        
        start_y = height - text_h_total - int(height*0.14)
        line_height = draw.textbbox((0, 0), "Ag", font=font)[3] - draw.textbbox((0, 0), "Ag", font=font)[1]
        for i, line in enumerate(text_lines):
            line_w = draw.textbbox((0, 0), line, font=font)[2]
            line_x = width/2 - line_w/2
            line_y = start_y + i * (line_height + 4)
            draw.text((line_x + 2, line_y + 2), line, font=font, fill=(0, 0, 0, 255))
            draw.text((line_x, line_y), line, font=font, fill=fill_color)
        
    elif template.startswith("custom_"):
        line_height = draw.textbbox((0, 0), "Ag", font=font)[3] - draw.textbbox((0, 0), "Ag", font=font)[1]
        for i, line in enumerate(text_lines):
            line_w = draw.textbbox((0, 0), line, font=font)[2]
            line_x = width/2 - line_w/2
            line_y = center_y + i * (line_height + 4)
            draw.text((line_x + 2, line_y + 2), line, font=font, fill=(0, 0, 0, 200))
            draw.text((line_x, line_y), line, font=font, fill=(255, 255, 255, 255))
    elif template.startswith("simple_"):
        # The background shape is already in the PNG overlay!
        # Just draw the text
        if template == "simple_5":
            # Pita miring: Draw text rotated
            img_rotated = Image.new("RGBA", img.size, (0,0,0,0))
            draw_rot = ImageDraw.Draw(img_rotated)
            
            # Draw rotated text at center top
            text_lines_rot = text_lines
            h_tot = text_h_total
            rot_y = int(height * 0.18)
            
            _draw_multiline_text(
                draw_rot, text_lines_rot, font, width/2 - text_w/2, rot_y,
                fill=(255, 255, 255, 255), shadow=True, shadow_fill=(0,0,0,150)
            )
            img_rotated = img_rotated.rotate(15, center=(width/2, rot_y + h_tot/2), resample=Image.Resampling.BICUBIC)
            img = Image.alpha_composite(img, img_rotated)
            draw = ImageDraw.Draw(img) # Re-init
        else:
            actual_y = text_y
            if template == "simple_3" or template == "simple_4":
                actual_y = center_y
            
            _draw_multiline_text(
                draw, text_lines, font, width/2 - text_w/2, actual_y,
                fill=(255, 255, 255, 255),
                shadow=True, shadow_fill=(0, 0, 0, 200)
            )
    elif template.startswith("premium_"):
        # Premium templates — background shapes are already in the PNG overlay
        # Text positioning varies by template design
        if template == "premium_2":
            # Lower Third Glossy: text inside the lower bar
            bar_y = height - 200
            _draw_multiline_text(
                draw, text_lines, font, width/2 - text_w/2, bar_y + 30,
                fill=(255, 255, 255, 255),
                shadow=True, shadow_fill=(0, 0, 0, 180)
            )
        elif template == "premium_4":
            # Gradient Bar: text centered inside the gradient bar
            bar_y = height // 2 - 90
            actual_y = bar_y + 45
            _draw_multiline_text(
                draw, text_lines, font, width/2 - text_w/2, actual_y,
                fill=(255, 255, 255, 255),
                shadow=True, shadow_fill=(0, 0, 0, 200)
            )
        elif template == "premium_5":
            # Double Line: clean minimal text between the two lines
            line_zone_center = height // 2
            actual_y = line_zone_center - text_h_total // 2
            _draw_multiline_text(
                draw, text_lines, font, width/2 - text_w/2, actual_y,
                fill=(255, 255, 255, 255),
                shadow=True, shadow_fill=(0, 0, 0, 120)
            )
        elif template == "premium_3":
            # Corner Frame: warm white text centered between brackets
            frame_y = (height - 600) // 2
            actual_y = frame_y + 220
            _draw_multiline_text(
                draw, text_lines, font, width/2 - text_w/2, actual_y,
                fill=(255, 255, 240, 255),  # warm white
                shadow=True, shadow_fill=(0, 0, 0, 200)
            )
        elif template == "premium_6":
            # Spotlight Vignette: dramatic centered text
            _draw_multiline_text(
                draw, text_lines, font, width/2 - text_w/2, center_y,
                fill=(255, 255, 255, 255),
                shadow=True, shadow_fill=(0, 0, 0, 220)
            )
        else:
            # premium_1 (Glow Tengah) & fallback: centered with shadow
            _draw_multiline_text(
                draw, text_lines, font, width/2 - text_w/2, center_y,
                fill=(255, 255, 255, 255),
                shadow=True, shadow_fill=(0, 0, 0, 180)
            )
    elif template == "tpl_1" or template == "default":
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

    elif template == "tpl_5":
        # Affiliate Yellow: Teks kuning terang dengan outline hitam tebal (tanpa box background)
        text_w = min(max_text_w, max(draw.textbbox((0, 0), line, font=font)[2] for line in text_lines))
        actual_x = width/2 - text_w/2 if "Tengah" in title_position or "Bawah" in title_position else text_x
        actual_y = center_y if "Tengah" in title_position else text_y
        
        # Draw stroke/outline manually
        outline_color = (0, 0, 0, 255)
        thickness = 4
        for dx in range(-thickness, thickness+1):
            for dy in range(-thickness, thickness+1):
                if dx*dx + dy*dy <= thickness*thickness:
                    _draw_multiline_text(draw, text_lines, font, actual_x + dx, actual_y + dy, fill=outline_color, shadow=False)
        
        # Draw main text
        _draw_multiline_text(draw, text_lines, font, actual_x, actual_y, fill=(255, 220, 0, 255), shadow=False)

    elif template == "tpl_6":
        # Affiliate Red Ribbon: Pita merah penuh membentang, teks putih
        actual_y = center_y if "Tengah" in title_position else text_y
        draw.rectangle([(0, actual_y - padding), (width, actual_y + text_h_total + padding)], fill=(230, 30, 30, 255))
        
        text_w = min(max_text_w, max(draw.textbbox((0, 0), line, font=font)[2] for line in text_lines))
        _draw_multiline_text(
            draw, text_lines, font, width/2 - text_w/2, actual_y, 
            fill=(255, 255, 255, 255), shadow=True, shadow_fill=(100, 0, 0, 255)
        )

    elif template == "tpl_7":
        # Shopee Orange Pill: Kapsul oranye khas affiliate ecommerce
        text_w = min(max_text_w, max(draw.textbbox((0, 0), line, font=font)[2] for line in text_lines))
        actual_x = width/2 - text_w/2 if "Tengah" in title_position or "Bawah" in title_position else text_x
        actual_y = center_y if "Tengah" in title_position else text_y
        
        draw.rounded_rectangle(
            [(actual_x - padding * 2, actual_y - padding),
             (actual_x + text_w + padding * 2, actual_y + text_h_total + padding)],
            radius=int(text_h_total / 2 + padding), fill=(255, 100, 0, 240)
        )
        _draw_multiline_text(
            draw, text_lines, font, actual_x, actual_y,
            fill=(255, 255, 255, 255), shadow=True, shadow_fill=(150, 50, 0, 255)
        )

    elif template in ("tpl_new_1", "tpl_new_2", "tpl_new_3"):
        # ── New-style templates: 35% from bottom, 25 chars/line, dual-color ──
        # Warna baris pertama per template
        primary_colors = {
            "tpl_new_1": (255, 220, 0, 255),   # Kuning
            "tpl_new_2": (76, 200, 80, 255),    # Hijau
            "tpl_new_3": (255, 60, 50, 255),    # Merah
        }
        primary_color = primary_colors.get(template, (255, 255, 255, 255))
        secondary_color = (255, 255, 255, 255)   # Putih untuk baris 2+

        # Wrap teks per 25 karakter
        char_lines = _wrap_text_by_chars(title, max_chars=25)

        # Auto font: perhitungkan batas 25 karakter per baris
        char_font = _auto_font(draw, title, max_text_w, max_text_h, initial_size, font_path, max_chars=25)
        line_h = draw.textbbox((0, 0), "Ag", font=char_font)[3] - draw.textbbox((0, 0), "Ag", font=char_font)[1]

        # Hitung posisi: anchor bottom at 35% from image bottom
        total_text_h = len(char_lines) * (line_h + 6)
        anchor_y = height - int(height * 0.35) - total_text_h  # start dari 35% bottom

        # Background box semi-transparan di belakang teks
        max_line_w = max(draw.textbbox((0, 0), line, font=char_font)[2] for line in char_lines)
        box_padding = 24
        draw.rounded_rectangle(
            [
                (width / 2 - max_line_w / 2 - box_padding, anchor_y - box_padding / 2),
                (width / 2 + max_line_w / 2 + box_padding, anchor_y + total_text_h + box_padding / 2),
            ],
            radius=16,
            fill=(0, 0, 0, 180),
        )

        # Render tiap baris
        for i, line in enumerate(char_lines):
            line_w = draw.textbbox((0, 0), line, font=char_font)[2]
            line_x = width / 2 - line_w / 2
            line_y = anchor_y + i * (line_h + 6)

            # Shadow
            draw.text((line_x + 2, line_y + 2), line, font=char_font, fill=(0, 0, 0, 200))

            # Warna: baris pertama = primary, sisanya = putih
            color = primary_color if i == 0 else secondary_color
            draw.text((line_x, line_y), line, font=char_font, fill=color)

    else:
        # ── Fallback / "none" / Blank Cover ──
        # Render teks centered dengan shadow, tanpa background/template
        text_w = min(max_text_w, max(draw.textbbox((0, 0), line, font=font)[2] for line in text_lines))
        _draw_multiline_text(
            draw, text_lines, font, width/2 - text_w/2, center_y,
            fill=(255, 255, 255, 255),
            shadow=True, shadow_fill=(0, 0, 0, 200)
        )

    # Convert back to RGB for JPEG save
    img = img.convert("RGB")
    img.save(output_path, "JPEG", quality=90)
    return output_path
