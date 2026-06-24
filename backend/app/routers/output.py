from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from typing import List
import os
import shutil
from datetime import datetime, timezone

from app.database import get_db
from app.models import Video, VideoStatus, JobLog
from app.schemas import VideoResponse
from app.paths import APP_HOME as BASE_DIR, OUTPUT_DIR

router = APIRouter()
SOURCE_DIR = os.path.join(BASE_DIR, "source")
TMP_DIR = os.path.join(BASE_DIR, "tmp")


@router.get("/")
def list_outputs(db: Session = Depends(get_db)):
    """List all completed videos with output file info."""
    videos = db.query(Video).filter(Video.status == VideoStatus.COMPLETED).order_by(Video.created_at.desc()).all()

    results = []
    for v in videos:
        # ID format: "FOLDER/filename" — grup = folder, name = filename
        if "/" in v.id:
            group, file_name = v.id.split("/", 1)
        else:
            group = v.source_folder or v.id
            file_name = v.id

        output_folder = os.path.join(OUTPUT_DIR, group)
        video_file = None
        cover_file = None
        if os.path.isdir(output_folder):
            for f in os.listdir(output_folder):
                # Cek prefix: file_name_1080p.mp4 atau file_name_cover.jpg
                if not f.startswith(file_name):
                    continue
                path = os.path.join(output_folder, f)
                if os.path.isfile(path):
                    size_bytes = os.path.getsize(path)
                    if f.endswith(".mp4") or f.endswith(".webm") or f.endswith(".mkv"):
                        video_file = {"name": f, "size_bytes": size_bytes}
                    elif f.endswith(".jpg") or f.endswith(".png"):
                        cover_file = {"name": f, "size_bytes": size_bytes}

        results.append({
            "id": file_name,  # tampil nama file saja di UI
            "group": group,
            "full_id": v.id,
            "status": v.status.value if v.status else "completed",
            "resolution": v.resolution,
            "has_caption": bool(v.caption_text),
            "has_social_caption": bool(v.caption_social),
            "uploaded_to_social": v.uploaded_to_social,
            "uploaded_at": v.uploaded_at.isoformat() if v.uploaded_at else None,
            "video_file": video_file,
            "cover_file": cover_file,
            "created_at": v.created_at.isoformat() if v.created_at else None,
            "completed_at": v.completed_at.isoformat() if v.completed_at else None,
        })

    return results


@router.get("/{video_id:path}/caption")
def get_caption(video_id: str, format: str = "plain", db: Session = Depends(get_db)):
    """Return the caption text for a completed video.

    Query params:
        format: "plain" (default) = teks polos tanpa timestamp SRT
                "srt" = format SRT lengkap dengan timestamp
    """
    video = db.query(Video).filter(Video.id == video_id).first()
    if not video:
        raise HTTPException(status_code=404, detail="Video not found")
    if not video.caption_text:
        raise HTTPException(status_code=404, detail="No caption available")

    if format == "srt":
        return {"video_id": video_id, "caption_text": video.caption_text, "format": "srt"}

    # "plain": hapus nomor urut, timestamp, dan baris kosong dari SRT
    import re
    lines = video.caption_text.split("\n")
    plain_lines = []
    for line in lines:
        line = line.strip()
        # Skip: nomor urut (angka saja), timestamp (00:00:00,000 --> ...), baris kosong
        if not line:
            continue
        if re.match(r"^\d+$", line):
            continue
        if re.match(r"^\d{2}:\d{2}:\d{2}[,.]\d{3}\s*-->", line):
            continue
        plain_lines.append(line)
    return {
        "video_id": video_id,
        "caption_text": "\n".join(plain_lines),
        "format": "plain"
    }


@router.get("/{video_id:path}/social-caption")
def get_social_caption(video_id: str, db: Session = Depends(get_db)):
    """Return the AI-generated social-media caption. Generates on-demand from product context if missing."""
    video = db.query(Video).filter(Video.id == video_id).first()
    if not video:
        raise HTTPException(status_code=404, detail="Video not found")

    # Jika caption_social belum ada, generate on-demand via DeepSeek dari produk
    if not video.caption_social:
        from app.services.caption_rewriter import generate_social_caption
        from app.models import ProductGroup
        import json

        from app.paths import GLOBAL_SETTINGS_FILE
        settings_file = GLOBAL_SETTINGS_FILE
        gs_cap = {}
        if os.path.exists(settings_file):
            with open(settings_file, "r") as f:
                gs_cap = json.load(f)

        # Lookup product context dari source_folder
        product_context = None
        if video.source_folder:
            pg = db.query(ProductGroup).filter(ProductGroup.id == video.source_folder).first()
            if pg and pg.product_name:
                product_context = {
                    "product_name": pg.product_name,
                    "product_description": pg.product_description,
                }

        # Hanya generate kalau ada product_context ATAU caption_text
        if product_context or video.caption_text:
            try:
                social = generate_social_caption(
                    srt_content=video.caption_text or "",
                    max_words=gs_cap.get("caption_social_max_words", 40),
                    hashtag_count=gs_cap.get("caption_social_hashtags", 5),
                    tone=gs_cap.get("caption_social_tone", "casual"),
                    product_context=product_context,
                )
                if social:
                    video.caption_social = social
                    db.commit()
            except Exception as e:
                raise HTTPException(
                    status_code=503,
                    detail=f"Gagal generate caption AI: {str(e)}. Pastikan DEEPSEEK_API_KEY sudah diisi di Global Settings."
                )

    if not video.caption_social:
        raise HTTPException(status_code=404, detail="No caption available. Isi nama produk di Product Group terlebih dahulu.")

    return {
        "video_id": video_id,
        "caption_social": video.caption_social,
    }


@router.get("/{video_id:path}/download")
def download_output(video_id: str, db: Session = Depends(get_db)):
    """Download the rendered output video file."""
    video = db.query(Video).filter(Video.id == video_id).first()
    if not video:
        raise HTTPException(status_code=404, detail="Video not found")

    out_folder = video.source_folder or video_id
    output_folder = os.path.join(OUTPUT_DIR, out_folder)
    if not os.path.isdir(output_folder):
        raise HTTPException(status_code=404, detail="Output folder not found")

    # Cari file .mp4 dengan prefix video_id
    for f in os.listdir(output_folder):
        if f.startswith(video_id) and f.lower().endswith((".mp4", ".webm", ".mkv")):
            file_path = os.path.join(output_folder, f)
            return FileResponse(
                file_path,
                media_type="video/mp4",
                filename=f,
                headers={"Accept-Ranges": "bytes"},
            )

    raise HTTPException(status_code=404, detail="No output video file found")


@router.patch("/{video_id:path}/toggle-uploaded")
def toggle_uploaded(video_id: str, db: Session = Depends(get_db)):
    """Toggle the 'uploaded to social media' status."""
    video = db.query(Video).filter(Video.id == video_id).first()
    if not video:
        raise HTTPException(status_code=404, detail="Video not found")

    # Toggle
    video.uploaded_to_social = not video.uploaded_to_social
    video.uploaded_at = datetime.now(timezone.utc) if video.uploaded_to_social else None
    db.commit()

    return {
        "video_id": video_id,
        "uploaded_to_social": video.uploaded_to_social,
        "uploaded_at": video.uploaded_at.isoformat() if video.uploaded_at else None,
    }


@router.delete("/{video_id:path}")
def delete_output(video_id: str, db: Session = Depends(get_db)):
    """Delete video from database and all associated files (source, tmp, output)."""
    video = db.query(Video).filter(Video.id == video_id).first()
    if not video:
        raise HTTPException(status_code=404, detail="Video not found")

    # Hapus job logs terkait
    db.query(JobLog).filter(JobLog.video_id == video_id).delete()
    db.delete(video)
    db.commit()

    # Parse folder & file name dari video_id (format: "FOLDER/filename")
    if "/" in video_id:
        src_folder, file_name = video_id.split("/", 1)
    else:
        src_folder = video.source_folder or video_id
        file_name = video_id

    # ⚠️ Source file TIDAK dihapus — user bisa re-process nanti

    # Output files — match by file_name prefix (e.g. nama_video_1080p.mp4)
    out_dir = os.path.join(OUTPUT_DIR, src_folder)
    if os.path.isdir(out_dir):
        for f in os.listdir(out_dir):
            if f.startswith(file_name):
                try:
                    os.remove(os.path.join(out_dir, f))
                except Exception as e:
                    print(f"Failed to delete output: {e}")
        # Remove folder if empty after file deletion
        try:
            remaining = os.listdir(out_dir)
            if not remaining:
                os.rmdir(out_dir)
        except Exception:
            pass

    # Tmp folder — safe_id replaces / with _
    safe_id = video_id.replace("/", "_")
    tmp_dir = os.path.join(TMP_DIR, safe_id)
    if os.path.isdir(tmp_dir):
        try:
            shutil.rmtree(tmp_dir)
        except Exception as e:
            print(f"Failed to delete tmp: {e}")

    return {"message": f"Output {video_id} dihapus. Source file tetap utuh untuk re-process."}
