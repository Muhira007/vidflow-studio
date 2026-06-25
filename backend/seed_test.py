import os
import sys
import subprocess
from sqlalchemy.orm import Session
from app.database import SessionLocal, engine
from app.models import Base, Video

def seed_database():
    # Make sure tables exist
    Base.metadata.create_all(bind=engine)
    
    db: Session = SessionLocal()
    # Check if exists
    vid_id = "vid_test_001"
    existing = db.query(Video).filter(Video.id == vid_id).first()
    if not existing:
        new_vid = Video(
            id=vid_id,
            silence_cut_level=2,
            silence_threshold=-30.0,
            min_silence_duration=0.5,
            silence_padding=0,
            cover_template="default",
            resolution="1080p",
            status="PENDING"
        )
        db.add(new_vid)
        db.commit()
        print(f"Video {vid_id} added to database.")
    else:
        existing.status = "PENDING"
        db.commit()
        print(f"Video {vid_id} reset to PENDING.")
    
    db.close()
    
    # Create source video
    source_dir = f"/home/kangdemuh/aplikasi/vidflow/source/{vid_id}"
    os.makedirs(source_dir, exist_ok=True)
    out_file = os.path.join(source_dir, "input.mp4")
    
    print("Membuat video sampel berdurasi 5 detik dengan keheningan...")
    cmd = [
        "ffmpeg", "-y",
        "-f", "lavfi", "-i", "testsrc=duration=5:size=640x360:rate=30",
        "-f", "lavfi", "-i", "sine=frequency=1000:duration=2",
        "-f", "lavfi", "-i", "anullsrc=duration=2",
        "-f", "lavfi", "-i", "sine=frequency=500:duration=1",
        "-filter_complex", "[1:a][2:a][3:a]concat=n=3:v=0:a=1[a]",
        "-map", "0:v", "-map", "[a]",
        "-c:v", "libx264", "-c:a", "aac",
        out_file
    ]
    subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    print(f"Video sampel sukses dibuat di {out_file}")

if __name__ == "__main__":
    seed_database()
