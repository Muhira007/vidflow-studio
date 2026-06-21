from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from app.models import VideoStatus

class JobLogResponse(BaseModel):
    id: int
    step: str
    status: str
    message: Optional[str]
    created_at: datetime
    
    class Config:
        from_attributes = True

class VideoResponse(BaseModel):
    id: str
    status: VideoStatus
    silence_cut_level: int
    caption_font: str
    resolution: str
    original_duration: Optional[float]
    final_duration: Optional[float]
    created_at: datetime
    updated_at: Optional[datetime]
    
    class Config:
        from_attributes = True

class VideoDetailResponse(VideoResponse):
    jobs: List[JobLogResponse] = []
