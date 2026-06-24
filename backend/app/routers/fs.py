from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
import os
import shutil
from typing import List

from app.database import get_db
from app.models import ProductGroup, Video, JobLog

router = APIRouter()
BASE_DIR = "/home/kangdemuh/aplikasi/video-editor/claude2/source"
TMP_DIR = "/home/kangdemuh/aplikasi/video-editor/claude2/tmp"
OUTPUT_DIR = "/home/kangdemuh/aplikasi/video-editor/claude2/output"

@router.get("/list")
def list_directory(db: Session = Depends(get_db)):
    os.makedirs(BASE_DIR, exist_ok=True)
    items = []
    for item in os.listdir(BASE_DIR):
        item_path = os.path.join(BASE_DIR, item)
        if os.path.isdir(item_path):
            files = os.listdir(item_path)
            # Look up product_description from ProductGroup
            group = db.query(ProductGroup).filter(ProductGroup.id == item).first()
            product_description = group.product_description if group else None
            items.append({
                "name": item,
                "type": "folder",
                "files": files,
                "product_description": product_description
            })
    # Sort folders alphabetically
    items.sort(key=lambda x: x["name"])
    return {"items": items}

@router.post("/mkdir")
def create_folder(name: str = Form(...)):
    if not name or ".." in name or "/" in name:
        raise HTTPException(status_code=400, detail="Invalid folder name")
    
    target_dir = os.path.join(BASE_DIR, name)
    if os.path.exists(target_dir):
        raise HTTPException(status_code=400, detail="Folder already exists")
        
    os.makedirs(target_dir, exist_ok=True)
    return {"message": f"Folder {name} created"}

@router.post("/rename")
def rename_folder(old_name: str = Form(...), new_name: str = Form(...)):
    if not new_name or ".." in new_name or "/" in new_name:
        raise HTTPException(status_code=400, detail="Invalid new folder name")
        
    old_path = os.path.join(BASE_DIR, old_name)
    new_path = os.path.join(BASE_DIR, new_name)
    
    if not os.path.exists(old_path):
        raise HTTPException(status_code=404, detail="Source folder not found")
    if os.path.exists(new_path):
        raise HTTPException(status_code=400, detail="Target folder already exists")
        
    os.rename(old_path, new_path)
    
    # Optional: Update DB to reflect the new video_id?
    # We can rely on the sync functionality later, or just rename it.
    
    return {"message": "Folder renamed"}

@router.delete("/delete/{name}")
def delete_folder(name: str, db: Session = Depends(get_db)):
    """Delete folder from disk AND clean up all related DB records."""
    target_dir = os.path.join(BASE_DIR, name)

    # Delete physical folder
    if os.path.exists(target_dir):
        try:
            shutil.rmtree(target_dir)
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))

    # Clean up database: delete JobLogs → Videos → ProductGroup for this folder
    deleted_videos = 0
    deleted_groups = 0

    videos = db.query(Video).filter(Video.source_folder == name).all()
    for video in videos:
        # Delete job logs for this video
        db.query(JobLog).filter(JobLog.video_id == video.id).delete()
        db.delete(video)
        deleted_videos += 1

    # Delete the ProductGroup
    group = db.query(ProductGroup).filter(ProductGroup.id == name).first()
    if group:
        db.delete(group)
        deleted_groups = 1

    db.commit()

    return {
        "message": f"Folder '{name}' deleted",
        "videos_deleted": deleted_videos,
        "group_deleted": deleted_groups > 0,
    }

@router.delete("/delete_file/{folder}/{filename}")
def delete_file(folder: str, filename: str, db: Session = Depends(get_db)):
    """Delete a single file AND its associated Video/JobLog records."""
    target_file = os.path.join(BASE_DIR, folder, filename)

    if os.path.exists(target_file):
        os.remove(target_file)

    # Also clean up the matching Video record
    name_no_ext = os.path.splitext(filename)[0]
    video_id = f"{folder}/{name_no_ext}"

    video = db.query(Video).filter(Video.id == video_id).first()
    if video:
        db.query(JobLog).filter(JobLog.video_id == video.id).delete()
        db.delete(video)
        db.commit()

    # Also clean up tmp and output files for this video
    safe_id = video_id.replace("/", "_")
    tmp_dir = os.path.join(TMP_DIR, safe_id)
    if os.path.isdir(tmp_dir):
        shutil.rmtree(tmp_dir, ignore_errors=True)

    out_dir = os.path.join(OUTPUT_DIR, folder)
    if os.path.isdir(out_dir):
        for f in os.listdir(out_dir):
            if f.startswith(name_no_ext):
                try:
                    os.remove(os.path.join(out_dir, f))
                except Exception:
                    pass

    return {"message": f"File '{filename}' deleted", "video_id": video_id}


@router.get("/stream/{folder}/{filename}")
def stream_video(folder: str, filename: str):
    """Stream a video file from source/, tmp/, or output/ directory with range request support."""
    # Prevent path traversal
    if ".." in folder or ".." in filename or "/" in folder:
        raise HTTPException(status_code=400, detail="Invalid path")

    # Search order: source → tmp → output
    search_dirs = [
        os.path.join(BASE_DIR, folder, filename),
        os.path.join(TMP_DIR, folder, filename),
        os.path.join(OUTPUT_DIR, folder, filename),
    ]

    file_path = None
    for candidate in search_dirs:
        if os.path.isfile(candidate):
            file_path = candidate
            break

    if file_path is None:
        raise HTTPException(status_code=404, detail="File not found in any directory")

    # Determine media type
    ext = os.path.splitext(filename)[1].lower()
    media_type_map = {
        ".mp4": "video/mp4",
        ".webm": "video/webm",
        ".mov": "video/quicktime",
        ".mkv": "video/x-matroska",
        ".avi": "video/x-msvideo",
        ".mp3": "audio/mpeg",
        ".wav": "audio/wav",
        ".ogg": "video/ogg",
    }
    media_type = media_type_map.get(ext, "application/octet-stream")

    return FileResponse(
        file_path,
        media_type=media_type,
        filename=filename,
        headers={"Accept-Ranges": "bytes"},
    )
