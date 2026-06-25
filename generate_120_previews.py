import os
from PIL import Image, ImageDraw
import sys
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from app.services.cover_gen import generate_cover_image

out_dir = 'frontend/public/covers'
os.makedirs(out_dir, exist_ok=True)

categories = [
    ("skincare", "Skincare & Kosmetik"),
    ("fashion_wanita", "Fashion Wanita"),
    ("fashion_pria", "Fashion Pria"),
    ("sepatu", "Sepatu & Sneakers"),
    ("tas", "Tas & Aksesoris"),
    ("gadget", "Gadget & Elektronik"),
    ("aksesoris_hp", "Aksesoris HP"),
    ("makanan", "Makanan & Minuman"),
    ("dapur", "Peralatan Dapur"),
    ("dekorasi", "Dekorasi Rumah"),
    ("otomotif", "Otomotif & Motor"),
    ("olahraga", "Olahraga & Outdoor"),
    ("mainan", "Mainan & Hobi"),
    ("bayi", "Perlengkapan Bayi"),
    ("buku", "Buku & Alat Tulis"),
    ("kesehatan", "Kesehatan & Suplemen"),
    ("bodycare", "Perawatan Tubuh"),
    ("komputer", "Komputer & Laptop"),
    ("kamera", "Kamera & Fotografi"),
    ("pets", "Kebutuhan Hewan")
]

styles = [
    ("style1", "MINIMALIST\nELEGAN", "Tengah Besar"),
    ("style2", "PROMO DISKON\n50% OFF", "Kiri Atas"),
    ("style3", "BEST SELLER\nWAJIB PUNYA", "Bawah (Lower Third)"),
    ("style4", "REVIEW DETAIL\nKUPAS TUNTAS", "Kiri Bawah"),
    ("style5", "UNBOXING\nVIRAL!", "Tengah Besar"),
    ("style6", "AESTHETIC\nSOFT", "Tengah Besar")
]

# Generate base image
base_img_path = 'base_preview.jpg'
img = Image.new('RGB', (1080, 1920), color=(30, 35, 45))
draw = ImageDraw.Draw(img)
for i in range(0, 1920, 120):
    draw.line([(0, i), (1080, i+120)], fill=(50, 55, 65), width=8)
img.save(base_img_path)

# To avoid massive prompt outputs, we won't print every file
print("Generating 120 previews...")

count = 0
for cat_id, cat_name in categories:
    for style_id, text, pos in styles:
        tpl_id = f"{cat_id}_{style_id}"
        out_path = os.path.join(out_dir, f"{tpl_id}.jpg")
        
        # We will use the existing templates tpl_1 to tpl_7 logic mapped from styles for preview generation,
        # but in actual backend we will modify cover_gen to support it correctly.
        # For now, let's map styles to tpl_1..tpl_6 so generate_cover_image works without modifying it yet.
        mapped_tpl = f"tpl_{styles.index((style_id, text, pos)) + 1}"
        
        generate_cover_image(base_img_path, out_path, text, mapped_tpl, pos)
        count += 1

os.remove(base_img_path)
print(f"Selesai! Generated {count} images.")
