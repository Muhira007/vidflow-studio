from sqlalchemy import Column, String, Integer, Float, DateTime, ForeignKey, Enum, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
from app.database import Base

class ProductGroup(Base):
    """Groups source folders by product for AI context enrichment."""
    __tablename__ = "product_groups"

    id = Column(String, primary_key=True, index=True)  # nama folder di source/
    product_name = Column(String, default="")            # "Produk Tissue Murah"
    product_description = Column(String, nullable=True)   # deskripsi opsional
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())


class VideoStatus(str, enum.Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"
    INVALID = "invalid"
    UPLOADED = "uploaded"  # sudah diupload ke sosmed

class Video(Base):
    __tablename__ = "videos"

    id = Column(String, primary_key=True, index=True) # ID unik dari nama folder
    status = Column(Enum(VideoStatus), default=VideoStatus.PENDING)
    
    # Silence Cut Config
    silence_cut_level = Column(Integer, default=1) # 0: nonaktif, 1: trim awal/akhir, 2: hapus tengah
    silence_threshold = Column(Float, default=-30.0) # dB
    min_silence_duration = Column(Float, default=0.3) # detik
    silence_padding = Column(Integer, default=150) # ms
    
    # Caption Config
    caption_font = Column(String, default="Arial")
    caption_size = Column(Integer, default=24)
    caption_color = Column(String, default="#FFFFFF")
    caption_position = Column(String, default="bottom")
    caption_style = Column(String, default="normal")
    
    # Cover Config
    cover_template = Column(String, default="default")
    
    # Render Config
    resolution = Column(String, default="1080p")
    
    # Metadata
    original_duration = Column(Float, nullable=True)
    final_duration = Column(Float, nullable=True)
    caption_text = Column(String, nullable=True)  # teks SRT mentah hasil transkripsi Whisper
    caption_social = Column(String, nullable=True)  # caption siap sosmed (diproses oleh DeepSeek AI)
    celery_task_id = Column(String, nullable=True)  # ID task Celery untuk cancel
    source_folder = Column(String, nullable=True)  # folder sumber (grup multi-video)
    source_filename = Column(String, nullable=True)  # nama file sumber asli
    uploaded_to_social = Column(Boolean, default=False)  # sudah diupload ke sosmed?
    uploaded_at = Column(DateTime(timezone=True), nullable=True)  # kapan ditandai uploaded

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    jobs = relationship("JobLog", back_populates="video")

class JobLog(Base):
    __tablename__ = "job_logs"

    id = Column(Integer, primary_key=True, index=True)
    video_id = Column(String, ForeignKey("videos.id"))
    step = Column(String) # misal: 'silence_cut', 'caption', 'cover', 'render'
    status = Column(String) # 'running', 'success', 'failed'
    message = Column(String, nullable=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    video = relationship("Video", back_populates="jobs")
