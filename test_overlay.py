import ffmpeg
import subprocess

def create_test_files():
    # Buat video
    subprocess.run(["ffmpeg", "-y", "-f", "lavfi", "-i", "testsrc=size=640x360:rate=30", "-t", "2", "test_video.mp4"], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    # Buat image
    subprocess.run(["ffmpeg", "-y", "-f", "lavfi", "-i", "color=c=red:s=640x360", "-frames:v", "1", "test_cover.jpg"], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

def test_overlay():
    create_test_files()
    
    in_vid = ffmpeg.input('test_video.mp4')
    in_img = ffmpeg.input('test_cover.jpg')
    
    # Scale image to match video
    img_scaled = in_img.filter('scale', w=640, h=360)
    
    vid = in_vid.video
    # Overlay for 0.1s
    vid = ffmpeg.overlay(vid, img_scaled, enable='between(t,0,0.1)')
    
    out = ffmpeg.output(vid, 'test_overlay_out.mp4', vcodec='libx264')
    out.run(overwrite_output=True)
    print("Done")

if __name__ == "__main__":
    test_overlay()
