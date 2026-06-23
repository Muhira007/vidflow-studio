from app.celery_app import celery_app
from app.database import SessionLocal
from app.models import JobLog, Video, VideoStatus, ProductGroup
import time
import os
import json
from app.services.video_engine import process_silence_cut, process_vad_cut, extract_audio, render_final_video
from app.services.stt_service import transcribe_with_openai, burn_subtitles_to_video
from app.services.cover_gen import extract_representative_frame, generate_cover_image
from app.services.vad_service import detect_speech_segments
from app.services.caption_rewriter import generate_social_caption, generate_cover_title

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
    video.celery_task_id = self.request.id  # Simpan task ID untuk cancel
    db.commit()
    
    def _check_cancelled():
        """Refresh video status from DB — raise if user cancelled."""
        db.refresh(video)
        if video.status == VideoStatus.CANCELLED:
            raise Exception("DIBATALKAN oleh pengguna")

    try:
        # Step 1: Silence Cut
        _check_cancelled()
        log = JobLog(video_id=video_id, step="silence_cut", status="running")
        db.add(log)
        db.commit()
        
        # ID format: "FOLDER/filename" — parse folder & name
        if "/" in video_id:
            src_folder, file_name = video_id.split("/", 1)
        else:
            src_folder = video.source_folder or video_id
            file_name = video_id

        # Look up product context for AI enrichment
        product_context = None
        product_group = db.query(ProductGroup).filter(ProductGroup.id == src_folder).first()
        if product_group and product_group.product_name:
            product_context = {
                "product_name": product_group.product_name,
                "product_description": product_group.product_description,
            }
            print(f"[PIPELINE] Product context found for '{src_folder}': {product_context['product_name']}")
        else:
            print(f"[PIPELINE] No product context for '{src_folder}' — AI will use transcript only")

        source_dir = f"/home/kangdemuh/aplikasi/video-editor/claude2/source/{src_folder}"

        # Cari file sumber: cocokkan nama file tanpa ekstensi
        input_file = None
        if os.path.isdir(source_dir):
            for f in os.listdir(source_dir):
                if os.path.splitext(f)[0] == file_name and f.lower().endswith(('.mp4', '.mov', '.mkv', '.avi', '.webm')):
                    input_file = os.path.join(source_dir, f)
                    break
            # Fallback: source_filename atau file .mp4 pertama
            if not input_file and video.source_filename:
                candidate = os.path.join(source_dir, video.source_filename)
                if os.path.isfile(candidate):
                    input_file = candidate
            if not input_file:
                for f in os.listdir(source_dir):
                    if f.lower().endswith(('.mp4', '.mov', '.mkv', '.avi', '.webm')):
                        input_file = os.path.join(source_dir, f)
                        break

        if not input_file:
            raise Exception(f"No video file found in {source_dir}")

        # tmp pakai nama aman (ganti / dengan _)
        safe_id = video_id.replace("/", "_")
        tmp_folder = f"/home/kangdemuh/aplikasi/video-editor/claude2/tmp/{safe_id}"
        os.makedirs(tmp_folder, exist_ok=True)
        cut_output = os.path.join(tmp_folder, f"{safe_id}_cut.mp4")

        if video.silence_cut_level == 3:
            # Level 3: VAD-based — hapus semua scene tanpa suara manusia
            audio_output = os.path.join(tmp_folder, f"{safe_id}.mp3")
            extract_audio(input_file, audio_output)

            speech_segments = detect_speech_segments(
                audio_output,
                threshold=0.5
            )
            log.message = f"VAD: {len(speech_segments)} segmen suara terdeteksi"
            db.commit()

            if speech_segments:
                process_vad_cut(
                    input_path=input_file,
                    output_path=cut_output,
                    speech_segments=speech_segments,
                    padding_ms=video.silence_padding
                )
            else:
                import shutil
                shutil.copy(input_file, cut_output)
        elif video.silence_cut_level > 0:
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
        _check_cancelled()
        log = JobLog(video_id=video_id, step="caption", status="running")
        db.add(log)
        db.commit()
        
        audio_output = os.path.join(tmp_folder, f"{safe_id}.mp3")
        extract_audio(cut_output, audio_output)

        subtitle_srt = os.path.join(tmp_folder, f"{safe_id}.srt")
        subtitle_ass = os.path.join(tmp_folder, f"{safe_id}.ass")
        try:
            stt_result = transcribe_with_openai(audio_output)
            srt_content = stt_result["srt"]
            ass_content = stt_result["ass"]
            
            with open(subtitle_srt, "w") as f:
                f.write(srt_content)
                
            with open(subtitle_ass, "w") as f:
                f.write(ass_content)
                
            # Simpan hasil transkripsi ke database
            video.caption_text = srt_content
            db.commit()

            # Generate caption sosial media via DeepSeek AI
            try:
                settings_file = "/home/kangdemuh/aplikasi/video-editor/claude2/backend/app/global_settings.json"
                gs_cap = {}
                if os.path.exists(settings_file):
                    with open(settings_file, "r") as f:
                        gs_cap = json.load(f)
                social_caption = generate_social_caption(
                    srt_content,
                    max_words=gs_cap.get("caption_social_max_words", 40),
                    hashtag_count=gs_cap.get("caption_social_hashtags", 5),
                    tone=gs_cap.get("caption_social_tone", "casual"),
                    product_context=product_context,
                )
                if social_caption:
                    video.caption_social = social_caption
                    db.commit()
                    log.message = "Caption sosial media berhasil digenerate oleh DeepSeek AI"
            except Exception as e:
                print(f"Social caption generation failed (non-critical): {e}")
                
            captioned_output = os.path.join(tmp_folder, f"{safe_id}_captioned.mp4")
            burn_subtitles_to_video(cut_output, subtitle_ass, captioned_output)
        except Exception as e:
            print(f"Caption failed, proceeding without it: {e}")
            captioned_output = cut_output
            
        log.status = "success"
        db.commit()
        
        # Step 3: Auto Cover
        _check_cancelled()
        log = JobLog(video_id=video_id, step="cover", status="running")
        db.add(log)
        db.commit()
        
        output_folder = f"/home/kangdemuh/aplikasi/video-editor/claude2/output/{src_folder}"
        os.makedirs(output_folder, exist_ok=True)
        
        base_frame_path = os.path.join(tmp_folder, f"{safe_id}_frame.jpg")
        final_cover_path = os.path.join(output_folder, f"{file_name}_cover.jpg")
        try:
            # Baca pengaturan cover dari global settings
            settings_file = "/home/kangdemuh/aplikasi/video-editor/claude2/backend/app/global_settings.json"
            cover_title_position = "Tengah Besar"
            cover_bg_opacity = 40
            if os.path.exists(settings_file):
                with open(settings_file, "r") as f:
                    gs = json.load(f)
                    cover_title_position = gs.get("cover_title_position", "Tengah Besar")
                    cover_bg_opacity = gs.get("cover_bg_opacity", 40)

            # Generate judul cover via AI dari transkrip (atau fallback ke ID)
            if video.caption_text:
                try:
                    cover_title_style = gs.get("cover_title_style", "Santai & Gaul (Gen-Z)")
                    cover_title_max_words = gs.get("cover_title_max_words", 5)
                    ai_title = generate_cover_title(
                        video.caption_text,
                        max_words=cover_title_max_words,
                        style=cover_title_style,
                        product_context=product_context,
                    )
                    cover_title = ai_title if ai_title else video.id
                except Exception as e:
                    print(f"AI cover title failed, using ID: {e}")
                    cover_title = video.id
            else:
                cover_title = video.id
            extract_representative_frame(cut_output, base_frame_path)
            generate_cover_image(
                base_frame_path, final_cover_path,
                title=cover_title,
                template=video.cover_template,
                title_position=cover_title_position,
                bg_opacity=cover_bg_opacity,
            )
        except Exception as e:
            print(f"Cover generation failed: {e}")
            
        log.status = "success"
        db.commit()
        
        # Step 4: Render
        _check_cancelled()
        log = JobLog(video_id=video_id, step="render", status="running")
        db.add(log)
        db.commit()
        
        # Baca output_format dari global settings
        settings_file = "/home/kangdemuh/aplikasi/video-editor/claude2/backend/app/global_settings.json"
        output_format = "MP4 (H.264)"
        if os.path.exists(settings_file):
            with open(settings_file, "r") as f:
                gs = json.load(f)
                output_format = gs.get("output_format", "MP4 (H.264)")

        ext_map = {"MP4 (H.264)": ".mp4", "MP4 (H.265 / HEVC)": ".mp4", "WebM": ".webm"}
        ext = ext_map.get(output_format, ".mp4")
        final_video_path = os.path.join(output_folder, f"{file_name}_{video.resolution}{ext}")
        render_final_video(
            input_video=captioned_output,
            output_video=final_video_path,
            resolution=video.resolution,
            cover_image_path=final_cover_path,
            output_format=output_format
        )
        
        log.status = "success"
        db.commit()
        
        video.status = VideoStatus.COMPLETED
        db.commit()
        return f"Video {video_id} processed successfully"
        
    except Exception as e:
        if "DIBATALKAN" in str(e):
            video.status = VideoStatus.CANCELLED
            video.celery_task_id = None
            log.status = "failed"
            log.message = "Dibatalkan oleh pengguna"
            db.commit()
        else:
            video.status = VideoStatus.FAILED
            video.celery_task_id = None
            log.status = "failed"
            log.message = str(e)
            db.commit()
        raise e
    finally:
        db.close()
