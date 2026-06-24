from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.models import Video, JobLog, ProductGroup, VideoStatus
from app.schemas import VideoResponse, VideoDetailResponse
from app.tasks import process_video_pipeline

router = APIRouter()

@router.get("/", response_model=List[VideoResponse])
def get_videos(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    videos = db.query(Video).offset(skip).limit(limit).all()
    return videos

import json
import os

SETTINGS_FILE = "/home/kangdemuh/aplikasi/video-editor/claude2/backend/app/global_settings.json"

def get_global_settings():
    if os.path.exists(SETTINGS_FILE):
        with open(SETTINGS_FILE, "r") as f:
            return json.load(f)
    return {"resolution": "1080p"}

# ── Settings routes MUST be before /{video_id:path} wildcard ──
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

# ── Video detail (wildcard) — MUST be after all specific routes ──
@router.get("/{video_id:path}", response_model=VideoDetailResponse)
def get_video_detail(video_id: str, db: Session = Depends(get_db)):
    video = db.query(Video).filter(Video.id == video_id).first()
    if not video:
        raise HTTPException(status_code=404, detail="Video not found")
    return video

@router.post("/{folder}/{name}/process")
def process_video(folder: str, name: str, db: Session = Depends(get_db)):
    video_id = f"{folder}/{name}"
    video = db.query(Video).filter(Video.id == video_id).first()
    if not video:
        raise HTTPException(status_code=404, detail="Video not found")

    # Cek apakah ada video yang sedang diproses
    active_job = db.query(Video).filter(Video.status == VideoStatus.PROCESSING).first()
    if active_job:
        # Ada yang sedang diproses → antrikan sebagai WAITING
        video.status = VideoStatus.WAITING
        db.commit()
        return {
            "message": f"Video {video_id} masuk antrian. Menunggu '{active_job.id}' selesai.",
            "status": "waiting"
        }

    # Tidak ada yang PROCESSING → langsung eksekusi
    task = process_video_pipeline.delay(video_id)
    video.celery_task_id = task.id
    db.commit()
    return {"message": f"Processing started for video {video_id}", "task_id": task.id, "status": "processing"}


@router.post("/{video_id:path}/cancel")
def cancel_processing(video_id: str, db: Session = Depends(get_db)):
    """Cancel a running/pending pipeline task."""
    video = db.query(Video).filter(Video.id == video_id).first()
    if not video:
        raise HTTPException(status_code=404, detail="Video not found")

    if video.status != VideoStatus.PROCESSING:
        raise HTTPException(status_code=400, detail=f"Video saat ini status '{video.status.value}', bukan 'processing'")

    task_id = video.celery_task_id

    # Set status langsung — pipeline akan membaca ini & berhenti
    video.status = VideoStatus.CANCELLED
    db.commit()

    # Revoke Celery task (kalau masih di antrian)
    if task_id:
        from app.tasks import celery_app
        celery_app.control.revoke(task_id, terminate=True)

    return {"message": f"Processing untuk {video_id} telah dibatalkan", "task_id": task_id}


@router.post("/{video_id:path}/restore")
def restore_video(video_id: str, db: Session = Depends(get_db)):
    """Kembalikan video CANCELLED/WAITING ke PENDING agar bisa diproses ulang."""
    video = db.query(Video).filter(Video.id == video_id).first()
    if not video:
        raise HTTPException(status_code=404, detail="Video not found")

    if video.status not in (VideoStatus.CANCELLED, VideoStatus.WAITING):
        raise HTTPException(
            status_code=400,
            detail=f"Video status '{video.status.value}' tidak bisa di-restore. Hanya CANCELLED & WAITING."
        )

    video.status = VideoStatus.PENDING
    video.celery_task_id = None
    db.commit()
    return {"message": f"Video {video_id} dikembalikan ke PENDING"}


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

    import random
    import string

    added = 0
    for folder_name in os.listdir(source_dir):
        folder_path = os.path.join(source_dir, folder_name)
        if not os.path.isdir(folder_path):
            continue

        # Auto-create ProductGroup if this folder is new
        existing_group = db.query(ProductGroup).filter(ProductGroup.id == folder_name).first()
        if not existing_group:
            db.add(ProductGroup(id=folder_name, product_name=""))
            db.flush()

        # Scan file .mp4 dalam folder
        for file_name in os.listdir(folder_path):
            if not file_name.lower().endswith(('.mp4', '.mov', '.mkv', '.avi', '.webm')):
                continue

            # ID = folder/nama_file (tanpa ekstensi) — unique & menunjukkan grup
            name_no_ext = os.path.splitext(file_name)[0]
            video_id = f"{folder_name}/{name_no_ext}"

            existing = db.query(Video).filter(Video.id == video_id).first()
            if existing:
                continue

            new_vid = Video(
                id=video_id,
                status="PENDING",
                silence_cut_level=cut_level,
                silence_threshold=threshold,
                min_silence_duration=min_dur,
                silence_padding=padding,
                cover_template=cover_template,
                resolution=res,
                source_folder=folder_name,
                source_filename=file_name,
            )
            db.add(new_vid)
            db.flush()  # simpan segera agar seq number berikutnya terhitung
            added += 1

    if added > 0:
        db.commit()
    return {"message": f"Synced successfully", "added": added}

import shutil
from fastapi import File, UploadFile, Form

@router.delete("/{video_id:path}")
def delete_video(video_id: str, db: Session = Depends(get_db)):
    video = db.query(Video).filter(Video.id == video_id).first()
    if not video:
        raise HTTPException(status_code=404, detail="Video not found")
        
    # Delete associated job logs first due to foreign key
    db.query(JobLog).filter(JobLog.video_id == video_id).delete()
    
    # Delete the video from DB
    db.delete(video)
    db.commit()
    
    # Delete physical files
    base_dir = "/home/kangdemuh/aplikasi/video-editor/claude2"
    src_folder = video.source_folder or video_id

    # Parse file name dari video_id (format: "FOLDER/filename")
    if "/" in video_id:
        _, file_name = video_id.split("/", 1)
    else:
        file_name = video_id

    # Hapus file output: output/{folder}/{file_name}_*
    out_dir = os.path.join(base_dir, "output", src_folder)
    if os.path.isdir(out_dir):
        for f in os.listdir(out_dir):
            if f.startswith(file_name):
                try:
                    os.remove(os.path.join(out_dir, f))
                except Exception as e:
                    print(f"Failed to delete output file: {e}")
        # Remove folder if empty
        try:
            if not os.listdir(out_dir):
                os.rmdir(out_dir)
        except Exception:
            pass

    # Hapus file sumber + folder source jika kosong
    src_dir = os.path.join(base_dir, "source", src_folder)
    if video.source_filename:
        src_path = os.path.join(src_dir, video.source_filename)
        if os.path.isfile(src_path):
            try:
                os.remove(src_path)
            except Exception as e:
                print(f"Failed to delete source file: {e}")
    # Remove empty source folder
    if os.path.isdir(src_dir):
        try:
            if not os.listdir(src_dir):
                os.rmdir(src_dir)
        except Exception:
            pass

    # Hapus folder tmp — safe_id replaces / with _
    safe_id = video_id.replace("/", "_")
    tmp_dir = os.path.join(base_dir, "tmp", safe_id)
    if os.path.isdir(tmp_dir):
        try:
            shutil.rmtree(tmp_dir)
        except Exception as e:
            print(f"Failed to delete tmp dir: {e}")

    return {"message": f"Video {video_id} and its files have been deleted."}

@router.post("/upload")
async def upload_video(video_id: str = Form(...), file: UploadFile = File(...), db: Session = Depends(get_db)):
    base_dir = "/home/kangdemuh/aplikasi/video-editor/claude2/source"
    target_dir = os.path.join(base_dir, video_id)
    
    # Create folder if it doesn't exist
    os.makedirs(target_dir, exist_ok=True)

    # Auto-create ProductGroup if folder is new
    existing_group = db.query(ProductGroup).filter(ProductGroup.id == video_id).first()
    if not existing_group:
        db.add(ProductGroup(id=video_id, product_name=""))
        db.flush()

    # Save file
    file_location = os.path.join(target_dir, file.filename)
    with open(file_location, "wb+") as file_object:
        shutil.copyfileobj(file.file, file_object)
        
    # Generate ID: folder/nama_file
    name_no_ext = os.path.splitext(file.filename)[0]
    gen_id = f"{video_id}/{name_no_ext}"

    existing = db.query(Video).filter(Video.id == gen_id).first()
    if not existing:
        settings = get_global_settings()
        res = settings.get("resolution", "1080p")
        cut_level = settings.get("silence_cut_level", 2)
        threshold = settings.get("silence_threshold", -30.0)
        min_dur = settings.get("min_silence_duration", 0.5)
        padding = settings.get("silence_padding", 150)
        cover_template = settings.get("cover_template", "default")

        new_vid = Video(
            id=gen_id,
            status="PENDING",
            silence_cut_level=cut_level,
            silence_threshold=threshold,
            min_silence_duration=min_dur,
            silence_padding=padding,
            cover_template=cover_template,
            resolution=res,
            source_folder=video_id,  # video_id = nama folder
            source_filename=file.filename,
        )
        db.add(new_vid)
        db.commit()
        return {"message": "Video uploaded successfully", "video_id": gen_id}
        
    return {"message": "Video already exists", "video_id": gen_id}

