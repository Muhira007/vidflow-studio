from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.models import Video, JobLog
from app.schemas import VideoResponse, VideoDetailResponse
from app.tasks import process_video_pipeline

router = APIRouter()

@router.get("/", response_model=List[VideoResponse])
def get_videos(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    videos = db.query(Video).offset(skip).limit(limit).all()
    return videos

@router.get("/{video_id}", response_model=VideoDetailResponse)
def get_video_detail(video_id: str, db: Session = Depends(get_db)):
    video = db.query(Video).filter(Video.id == video_id).first()
    if not video:
        raise HTTPException(status_code=404, detail="Video not found")
    return video

@router.post("/{video_id}/process")
def process_video(video_id: str, db: Session = Depends(get_db)):
    video = db.query(Video).filter(Video.id == video_id).first()
    if not video:
        raise HTTPException(status_code=404, detail="Video not found")
    
    # Trigger celery task
    task = process_video_pipeline.delay(video_id)
    return {"message": f"Processing started for video {video_id}", "task_id": task.id}

import json
import os

SETTINGS_FILE = "/home/kangdemuh/aplikasi/video-editor/claude2/backend/app/global_settings.json"

def get_global_settings():
    if os.path.exists(SETTINGS_FILE):
        with open(SETTINGS_FILE, "r") as f:
            return json.load(f)
    return {"resolution": "1080p"}

@router.get("/settings/render")
def read_settings():
    return get_global_settings()

@router.post("/settings/render")
def update_settings(settings: dict, db: Session = Depends(get_db)):
    current = get_global_settings()
    current.update(settings)
    with open(SETTINGS_FILE, "w") as f:
        json.dump(current, f)

    res = settings.get("resolution")
    if res:
        # Update all pending videos to use the new resolution
        db.query(Video).filter(Video.status == "PENDING").update({"resolution": res})
        db.commit()

    return {"message": "Settings updated"}

@router.get("/settings/caption")
def read_caption_settings():
    return get_global_settings()

@router.post("/settings/caption")
def update_caption_settings(settings: dict):
    current = get_global_settings()
    current.update(settings)
    with open(SETTINGS_FILE, "w") as f:
        json.dump(current, f)
    return {"message": "Caption settings updated"}

@router.get("/settings/silence")
def read_silence_settings():
    return get_global_settings()

@router.post("/settings/silence")
def update_silence_settings(settings: dict):
    current = get_global_settings()
    current.update(settings)
    with open(SETTINGS_FILE, "w") as f:
        json.dump(current, f)
    return {"message": "Silence settings updated"}

@router.get("/settings/cover")
def read_cover_settings():
    return get_global_settings()

@router.post("/settings/cover")
def update_cover_settings(settings: dict):
    current = get_global_settings()
    current.update(settings)
    with open(SETTINGS_FILE, "w") as f:
        json.dump(current, f)
    return {"message": "Cover settings updated"}

@router.post("/sync")
def sync_videos(db: Session = Depends(get_db)):
    source_dir = "/home/kangdemuh/aplikasi/video-editor/claude2/source"
    if not os.path.exists(source_dir):
        return {"message": "Source directory does not exist", "added": 0}
        
    settings = get_global_settings()
    res = settings.get("resolution", "1080p")
    cut_level = settings.get("silence_cut_level", 2)
    threshold = settings.get("silence_threshold", -30.0)
    min_dur = settings.get("min_silence_duration", 0.5)
    padding = settings.get("silence_padding", 150)
    cover_template = settings.get("cover_template", "default")
        
    added = 0
    for item in os.listdir(source_dir):
        item_path = os.path.join(source_dir, item)
        if os.path.isdir(item_path):
            # Check if video already in db
            existing = db.query(Video).filter(Video.id == item).first()
            if not existing:
                new_vid = Video(
                    id=item,
                    status="PENDING",
                    silence_cut_level=cut_level,
                    silence_threshold=threshold,
                    min_silence_duration=min_dur,
                    silence_padding=padding,
                    cover_template=cover_template,
                    resolution=res
                )
                db.add(new_vid)
                added += 1
    
    if added > 0:
        db.commit()
    return {"message": f"Synced successfully", "added": added}

import shutil
from fastapi import File, UploadFile, Form

@router.delete("/{video_id}")
def delete_video(video_id: str, db: Session = Depends(get_db)):
    video = db.query(Video).filter(Video.id == video_id).first()
    if not video:
        raise HTTPException(status_code=404, detail="Video not found")
        
    # Delete associated job logs first due to foreign key
    db.query(JobLog).filter(JobLog.video_id == video_id).delete()
    
    # Delete the video from DB
    db.delete(video)
    db.commit()
    
    # Delete physical folders
    base_dir = "/home/kangdemuh/aplikasi/video-editor/claude2"
    for folder in ["source", "tmp", "output"]:
        target_dir = os.path.join(base_dir, folder, video_id)
        if os.path.exists(target_dir):
            try:
                shutil.rmtree(target_dir)
            except Exception as e:
                print(f"Failed to delete {target_dir}: {e}")
                
    return {"message": f"Video {video_id} and its folders have been deleted."}

@router.post("/upload")
async def upload_video(video_id: str = Form(...), file: UploadFile = File(...), db: Session = Depends(get_db)):
    base_dir = "/home/kangdemuh/aplikasi/video-editor/claude2/source"
    target_dir = os.path.join(base_dir, video_id)
    
    # Create folder if it doesn't exist
    os.makedirs(target_dir, exist_ok=True)
    
    # Save file
    file_location = os.path.join(target_dir, file.filename)
    with open(file_location, "wb+") as file_object:
        shutil.copyfileobj(file.file, file_object)
        
    # Check if video already in db
    existing = db.query(Video).filter(Video.id == video_id).first()
    if not existing:
        settings = get_global_settings()
        res = settings.get("resolution", "1080p")
        cut_level = settings.get("silence_cut_level", 2)
        threshold = settings.get("silence_threshold", -30.0)
        min_dur = settings.get("min_silence_duration", 0.5)
        padding = settings.get("silence_padding", 150)
        cover_template = settings.get("cover_template", "default")

        new_vid = Video(
            id=video_id,
            status="PENDING",
            silence_cut_level=cut_level,
            silence_threshold=threshold,
            min_silence_duration=min_dur,
            silence_padding=padding,
            cover_template=cover_template,
            resolution=res
        )
        db.add(new_vid)
        db.commit()
        
    return {"message": "Video uploaded successfully", "video_id": video_id}

