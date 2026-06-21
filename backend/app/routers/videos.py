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

import os
@router.post("/sync")
def sync_videos(db: Session = Depends(get_db)):
    source_dir = "/home/kangdemuh/aplikasi/video-editor/claude2/source"
    if not os.path.exists(source_dir):
        return {"message": "Source directory does not exist", "added": 0}
        
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
                    silence_cut_level=2,
                    silence_threshold=-30.0,
                    min_silence_duration=0.5,
                    silence_padding=150,
                    cover_template="default",
                    resolution="1080p"
                )
                db.add(new_vid)
                added += 1
    
    if added > 0:
        db.commit()
    return {"message": f"Synced successfully", "added": added}
