from app.celery_app import celery_app
from app.database import SessionLocal
from app.models import JobLog, Video, VideoStatus
import time
import os
from app.services.video_engine import process_silence_cut, extract_audio, render_final_video
from app.services.stt_service import transcribe_with_openai, burn_subtitles_to_video
from app.services.cover_gen import extract_representative_frame, generate_cover_image

@celery_app.task(bind=True)
def process_video_pipeline(self, video_id: str):
    """
    Main pipeline task that orchestrates the video editing process:
    1. Silence Cut
    2. Auto Caption
    3. Auto Cover
    4. Render
    """
    db = SessionLocal()
    video = db.query(Video).filter(Video.id == video_id).first()
    
    if not video:
        db.close()
        return f"Video {video_id} not found"
        
    video.status = VideoStatus.PROCESSING
    db.commit()
    
    try:
        # Step 1: Silence Cut
        log = JobLog(video_id=video_id, step="silence_cut", status="running")
        db.add(log)
        db.commit()
        
        source_folder = f"/home/kangdemuh/aplikasi/video-editor/claude2/source/{video_id}"
        input_file = None
        if os.path.exists(source_folder):
            for f in os.listdir(source_folder):
                if f.endswith(('.mp4', '.mov', '.mkv')):
                    input_file = os.path.join(source_folder, f)
                    break
                    
        if not input_file:
            raise Exception(f"No video file found in {source_folder}")
            
        tmp_folder = f"/home/kangdemuh/aplikasi/video-editor/claude2/tmp/{video_id}"
        os.makedirs(tmp_folder, exist_ok=True)
        cut_output = os.path.join(tmp_folder, f"{video_id}_cut.mp4")
        
        if video.silence_cut_level > 0:
            process_silence_cut(
                input_path=input_file, 
                output_path=cut_output, 
                level=video.silence_cut_level,
                threshold=video.silence_threshold,
                min_duration=video.min_silence_duration,
                padding_ms=video.silence_padding
            )
        else:
            import shutil
            shutil.copy(input_file, cut_output)
            
        log.status = "success"
        db.commit()
        
        # Step 2: Auto Caption
        log = JobLog(video_id=video_id, step="caption", status="running")
        db.add(log)
        db.commit()
        
        audio_output = os.path.join(tmp_folder, f"{video_id}.mp3")
        extract_audio(cut_output, audio_output)
        
        subtitle_output = os.path.join(tmp_folder, f"{video_id}.srt")
        try:
            srt_content = transcribe_with_openai(audio_output)
            with open(subtitle_output, "w") as f:
                f.write(srt_content)
                
            captioned_output = os.path.join(tmp_folder, f"{video_id}_captioned.mp4")
            burn_subtitles_to_video(cut_output, subtitle_output, captioned_output)
        except Exception as e:
            print(f"Caption failed, proceeding without it: {e}")
            captioned_output = cut_output
            
        log.status = "success"
        db.commit()
        
        # Step 3: Auto Cover
        log = JobLog(video_id=video_id, step="cover", status="running")
        db.add(log)
        db.commit()
        
        output_folder = f"/home/kangdemuh/aplikasi/video-editor/claude2/output/{video_id}"
        os.makedirs(output_folder, exist_ok=True)
        
        base_frame_path = os.path.join(tmp_folder, f"{video_id}_frame.jpg")
        final_cover_path = os.path.join(output_folder, f"{video_id}_cover.jpg")
        try:
            extract_representative_frame(cut_output, base_frame_path)
            generate_cover_image(base_frame_path, final_cover_path, title=video_id, template=video.cover_template)
        except Exception as e:
            print(f"Cover generation failed: {e}")
            
        log.status = "success"
        db.commit()
        
        # Step 4: Render
        log = JobLog(video_id=video_id, step="render", status="running")
        db.add(log)
        db.commit()
        
        final_video_path = os.path.join(output_folder, f"{video_id}_{video.resolution}.mp4")
        render_final_video(captioned_output, final_video_path, resolution=video.resolution)
        
        log.status = "success"
        db.commit()
        
        video.status = VideoStatus.COMPLETED
        db.commit()
        return f"Video {video_id} processed successfully"
        
    except Exception as e:
        video.status = VideoStatus.FAILED
        log.status = "failed"
        log.message = str(e)
        db.commit()
        raise e
    finally:
        db.close()
