from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Video, JobLog
from datetime import datetime, date, timezone

router = APIRouter()

@router.get("/stats")
def get_dashboard_stats(db: Session = Depends(get_db)):
    total_videos = db.query(Video).count()
    active_jobs = db.query(Video).filter(
        Video.status.in_(['PROCESSING', 'WAITING'])
    ).count()
    
    today = date.today()
    
    # Finished today
    finished_today = db.query(Video).filter(
        Video.status == 'COMPLETED'
    ).count() # This is a simplification; a true check uses updated_at >= today
    
    # Failed today
    failed_today = db.query(Video).filter(
        Video.status == 'FAILED'
    ).count()

    recent_jobs = db.query(JobLog).order_by(JobLog.created_at.desc()).limit(15).all()
    
    # Transform recent_jobs
    recent_jobs_data = []
    for log in recent_jobs:
        job_type = "info"
        if log.status == "running": job_type = "warning"
        elif log.status == "success": job_type = "success"
        elif log.status == "failed": job_type = "danger"
        
        # Calculate time ago
        # Ensure log.created_at is timezone-aware if the db returns it as naive somehow, or use naive if the db is naive.
        # SQLAlchemy returns offset-aware datetime for timezone=True in PostgreSQL.
        created_at = log.created_at
        if created_at.tzinfo is None:
            created_at = created_at.replace(tzinfo=timezone.utc)
            
        time_diff = datetime.now(timezone.utc) - created_at
        minutes = time_diff.total_seconds() // 60
        if minutes < 60:
            time_str = f"{int(minutes)} mins ago"
        elif minutes < 1440:
            time_str = f"{int(minutes // 60)} hours ago"
        else:
            time_str = f"{int(minutes // 1440)} days ago"

        # Format timestamp lengkap: "24 Jun 2026, 14:30:25"
        formatted_time = created_at.strftime("%d %b %Y, %H:%M:%S")

        recent_jobs_data.append({
            "id": log.id,
            "video_id": log.video_id,
            "step": log.step.capitalize(),
            "status": log.status.capitalize(),
            "time": time_str,
            "datetime": formatted_time,
            "type": job_type
        })
        
    return {
        "stats": [
            {"title": "Total Video", "value": str(total_videos), "color": "var(--info)"},
            {"title": "Job Aktif", "value": str(active_jobs), "color": "var(--warning)"},
            {"title": "Selesai (All)", "value": str(finished_today), "color": "var(--success)"},
            {"title": "Gagal (All)", "value": str(failed_today), "color": "var(--danger)"}
        ],
        "recentJobs": recent_jobs_data
    }
@router.get("/logs")
def get_all_logs(db: Session = Depends(get_db)):
    logs = db.query(JobLog).order_by(JobLog.created_at.desc()).limit(100).all()
    
    logs_data = []
    for log in logs:
        created_at = log.created_at
        if created_at.tzinfo is None:
            created_at = created_at.replace(tzinfo=timezone.utc)
            
        logs_data.append({
            "id": log.id,
            "vid": log.video_id,
            "step": log.step.capitalize(),
            "status": log.status.capitalize(),
            "msg": log.message or "-",
            "time": created_at.strftime("%Y-%m-%d %H:%M:%S")
        })
        
    return {"logs": logs_data}

@router.delete("/logs/{log_id}")
def delete_log(log_id: int, db: Session = Depends(get_db)):
    log = db.query(JobLog).filter(JobLog.id == log_id).first()
    if not log:
        raise HTTPException(status_code=404, detail="Log not found")
    db.delete(log)
    db.commit()
    return {"message": f"Log #{log_id} deleted"}

@router.delete("/logs")
def clear_all_logs(db: Session = Depends(get_db)):
    count = db.query(JobLog).count()
    db.query(JobLog).delete()
    db.commit()
    return {"message": f"{count} logs deleted"}
