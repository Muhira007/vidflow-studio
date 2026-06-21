import time
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import os
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler
from app.database import SessionLocal
from app.models import Video

SOURCE_DIR = "/home/kangdemuh/aplikasi/video-editor/claude2/source"

class VideoFolderHandler(FileSystemEventHandler):
    def on_created(self, event):
        if event.is_directory:
            folder_name = os.path.basename(event.src_path)
            print(f"New video folder detected: {folder_name}")
            
            # Tambahkan ke database
            db = SessionLocal()
            try:
                # Cek apakah sudah ada
                existing = db.query(Video).filter(Video.id == folder_name).first()
                if not existing:
                    new_video = Video(id=folder_name)
                    db.add(new_video)
                    db.commit()
                    print(f"Video {folder_name} added to database.")
            except Exception as e:
                print(f"Error adding {folder_name} to db: {e}")
            finally:
                db.close()

def start_watcher():
    if not os.path.exists(SOURCE_DIR):
        os.makedirs(SOURCE_DIR)
        
    event_handler = VideoFolderHandler()
    observer = Observer()
    observer.schedule(event_handler, SOURCE_DIR, recursive=False)
    observer.start()
    print(f"Watching for new video folders in {SOURCE_DIR}...")
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        observer.stop()
    observer.join()

if __name__ == "__main__":
    start_watcher()
