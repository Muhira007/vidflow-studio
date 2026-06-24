from app.celery_app import celery_app
from app.database import SessionLocal
from app.models import JobLog, Video, VideoStatus, ProductGroup
from sqlalchemy.sql import func
import time
import os
import json
from app.services.video_engine import process_silence_cut, process_vad_cut, extract_audio, render_final_video, get_video_info, downscale_to_1080p
from app.services.stt_service import transcribe_with_openai, burn_subtitles_to_video
from app.services.cover_gen import extract_representative_frame, generate_cover_image
from app.services.vad_service import detect_speech_segments
from app.services.caption_rewriter import generate_social_caption, generate_cover_title

@celery_app.task(bind=True)
def process_video_pipeline(self, video_id: str):
    """
    Main pipeline task that orchestrates the video editing process:
    0. Downscale (4K → 1080p, otomatis skip jika sudah ≤ 1080p)
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

        # ═══════════════════════════════════════════════════
        # Step 0: Downscale (4K → 1080p) — meringankan pipeline
        # ═══════════════════════════════════════════════════
        _check_cancelled()
        log = JobLog(video_id=video_id, step="downscale", status="running")
        db.add(log)
        db.commit()

        try:
            video_info = get_video_info(input_file)
            if video_info['need_downscale']:
                is_10bit = video_info['is_10bit']
                bit_label = "10-bit" if is_10bit else "8-bit"
                log.message = (
                    f"Menurunkan resolusi {video_info['width']}×{video_info['height']} "
                    f"({bit_label}) → 1080p"
                )
                db.commit()

                working_file = os.path.join(tmp_folder, f"{safe_id}_1080p.mp4")
                downscale_to_1080p(input_file, working_file, is_10bit=is_10bit)

                file_size_mb = os.path.getsize(working_file) / (1024 * 1024)
                log.message += f" — selesai ({file_size_mb:.0f} MB, {bit_label})"
                log.status = "success"
                print(f"[PIPELINE] Downscale selesai: {input_file} → {working_file} ({bit_label})")
            else:
                # Sudah ≤ 1080p — tidak perlu downscale
                working_file = input_file
                log.message = (
                    f"Resolusi {video_info['width']}×{video_info['height']} "
                    f"≤ 1080p — skip"
                )
                log.status = "success"
                print(f"[PIPELINE] Skip downscale: {video_info['width']}×{video_info['height']} sudah ≤ 1080p")
        except Exception as e:
            log.status = "failed"
            log.message = f"Downscale gagal: {str(e)}"
            db.commit()
            raise

        db.commit()

        # ═══════════════════════════════════════════════════
        # Step 1: Silence Cut (pakai file hasil downscale)
        # ═══════════════════════════════════════════════════
        _check_cancelled()
        log = JobLog(video_id=video_id, step="silence_cut", status="running")
        db.add(log)
        db.commit()

        cut_output = os.path.join(tmp_folder, f"{safe_id}_cut.mp4")

        if video.silence_cut_level == 3:
            # Level 3: VAD-based — hapus semua scene tanpa suara manusia
            audio_output = os.path.join(tmp_folder, f"{safe_id}.mp3")
            extract_audio(working_file, audio_output)

            speech_segments = detect_speech_segments(
                audio_output,
                threshold=0.5
            )
            log.message = f"VAD: {len(speech_segments)} segmen suara terdeteksi"
            db.commit()

            if speech_segments:
                process_vad_cut(
                    input_path=working_file,
                    output_path=cut_output,
                    speech_segments=speech_segments,
                    padding_ms=video.silence_padding
                )
            else:
                import shutil
                shutil.copy(working_file, cut_output)
        elif video.silence_cut_level > 0:
            process_silence_cut(
                input_path=working_file,
                output_path=cut_output,
                level=video.silence_cut_level,
                threshold=video.silence_threshold,
                min_duration=video.min_silence_duration,
                padding_ms=video.silence_padding
            )
        else:
            import shutil
            shutil.copy(working_file, cut_output)

        log.status = "success"
        db.commit()
        
        # Step 2: Auto Caption (Whisper — subtitle burning)
        _check_cancelled()
        log = JobLog(video_id=video_id, step="caption", status="running")
        db.add(log)
        db.commit()

        audio_output = os.path.join(tmp_folder, f"{safe_id}.mp3")
        extract_audio(cut_output, audio_output)

        subtitle_srt = os.path.join(tmp_folder, f"{safe_id}.srt")
        subtitle_ass = os.path.join(tmp_folder, f"{safe_id}.ass")

        # Baca global settings SEKALI untuk dipakai semua step
        settings_file = "/home/kangdemuh/aplikasi/video-editor/claude2/backend/app/global_settings.json"
        gs = {}
        if os.path.exists(settings_file):
            with open(settings_file, "r") as f:
                gs = json.load(f)

        srt_content = ""  # safeguard: selalu ada meski transkripsi gagal

        try:
            capitalize = gs.get("caption_capitalize", False)
            stt_result = transcribe_with_openai(audio_output, capitalize=capitalize)
            srt_content = stt_result["srt"]
            ass_content = stt_result["ass"]

            with open(subtitle_srt, "w") as f:
                f.write(srt_content)

            with open(subtitle_ass, "w") as f:
                f.write(ass_content)

            # Simpan hasil transkripsi ke database
            video.caption_text = srt_content
            db.commit()
            log.message = "Transkripsi Whisper berhasil"

            captioned_output = os.path.join(tmp_folder, f"{safe_id}_captioned.mp4")
            burn_subtitles_to_video(cut_output, subtitle_ass, captioned_output)
        except Exception as e:
            print(f"Caption failed, proceeding without it: {e}")
            captioned_output = cut_output
            srt_content = ""  # fallback untuk step berikutnya

        log.status = "success"
        db.commit()

        # Step 2b: Social Caption via DeepSeek (dari produk, independen dari Whisper)
        _check_cancelled()
        try:
            social_caption = generate_social_caption(
                srt_content if video.caption_text else "",
                max_words=gs.get("caption_social_max_words", 40),
                hashtag_count=gs.get("caption_social_hashtags", 5),
                tone=gs.get("caption_social_tone", "casual"),
                product_context=product_context,
            )
            if social_caption:
                video.caption_social = social_caption
                db.commit()
                print(f"[SOCIAL-CAPTION] Generated from product context: {product_context.get('product_name') if product_context else 'NO PRODUCT'}")
        except Exception as e:
            print(f"Social caption generation failed (non-critical): {e}")
        
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
            cover_title_position = gs.get("cover_title_position", "Tengah Besar")
            cover_bg_opacity = gs.get("cover_bg_opacity", 40)

            # Generate judul cover via AI dari PRODUK (prioritas) atau transkrip
            # Fallback: AI title → product name → folder name → "AUTO VIDEO"
            fallback_title = (
                (product_context.get("product_name") if product_context else None)
                or os.path.basename(src_folder)
                or "AUTO VIDEO"
            )

            # Selalu coba AI cover title jika ada product_context ATAU caption_text
            if product_context or video.caption_text:
                try:
                    cover_title_style = gs.get("cover_title_style", "Santai & Gaul (Gen-Z)")
                    cover_title_max_words = gs.get("cover_title_max_words", 5)
                    ai_title = generate_cover_title(
                        srt_content=video.caption_text or "",
                        max_words=cover_title_max_words,
                        style=cover_title_style,
                        product_context=product_context,
                    )
                    cover_title = ai_title if ai_title else fallback_title
                except Exception as e:
                    print(f"AI cover title failed, using fallback: {e}")
                    cover_title = fallback_title
            else:
                cover_title = fallback_title
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
        video.completed_at = func.now()
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
