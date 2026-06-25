from app.services.cover_gen import generate_cover_image
from PIL import Image

img = Image.new('RGB', (1080, 1920), color='blue')
img.save('test_base.jpg')

generate_cover_image('test_base.jpg', 'test_out_5.jpg', 'PROMO TERBATAS!', 'tpl_5', 'Tengah Besar')
generate_cover_image('test_base.jpg', 'test_out_6.jpg', 'REKOMENDASI TERBAIK', 'tpl_6', 'Kiri Atas')
generate_cover_image('test_base.jpg', 'test_out_7.jpg', 'MURAH BANGET NIH', 'tpl_7', 'Bawah')

print("Success!")
