import os
from PIL import Image, ImageDraw
import sys
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from app.services.cover_gen import generate_cover_image

# Buat base image dummy yang colorful untuk preview 9:16 (misal gradasi atau solid)
base_img_path = 'base_preview.jpg'
img = Image.new('RGB', (1080, 1920), color=(40, 44, 52))
draw = ImageDraw.Draw(img)
# Draw a simple pattern to look like a video frame
for i in range(0, 1920, 100):
    draw.line([(0, i), (1080, i+100)], fill=(60, 64, 72), width=10)
img.save(base_img_path)

out_dir = 'frontend/public/covers'

templates = [
    ("tpl_1", "JUDUL VIDEO\nMINIMALIST"),
    ("tpl_2", "BERITA HARI INI\nSANGAT PENTING"),
    ("tpl_3", "GAMING FOCUS\nLET'S PLAY"),
    ("tpl_4", "VLOG HARIAN\nSETUP TOUR"),
    ("tpl_5", "PROMO TERBATAS\nCEK SEKARANG!"),
    ("tpl_6", "REKOMENDASI\nTERBAIK 2026"),
    ("tpl_7", "DISKON GEDE\nMURAH BANGET")
]

for tpl, text in templates:
    # Use "Tengah Besar" for most, maybe lower third for tpl_2
    pos = "Tengah Besar"
    if tpl == "tpl_2":
        pos = "Bawah (Lower Third)"
    elif tpl == "tpl_6":
        pos = "Kiri Atas"
    
    out_path = os.path.join(out_dir, f"{tpl}.jpg")
    print(f"Generating {out_path}...")
    generate_cover_image(base_img_path, out_path, text, tpl, pos)

os.remove(base_img_path)
print("Selesai!")
