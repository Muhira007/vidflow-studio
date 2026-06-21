#!/bin/bash

# Konfigurasi Folder
BASE_DIR="/home/kangdemuh/aplikasi/video-editor/claude2"
LOG_DIR="$BASE_DIR/logs"

# Buat folder log jika belum ada
mkdir -p $LOG_DIR

echo "🟢 1. Menyalakan Docker services (Postgres & Redis)..."
cd $BASE_DIR
docker compose up -d

echo "🟢 2. Menyalakan Backend (FastAPI)..."
cd $BASE_DIR/backend
# Aktifkan virtual environment
source venv/bin/activate
nohup uvicorn app.main:app --reload --port 8000 > $LOG_DIR/backend.log 2>&1 &
echo $! > $LOG_DIR/backend.pid

echo "🟢 3. Menyalakan Celery Worker..."
nohup celery -A app.tasks.celery_app worker --loglevel=info > $LOG_DIR/celery.log 2>&1 &
echo $! > $LOG_DIR/celery.pid

echo "🟢 4. Menyalakan Frontend (Vite)..."
cd $BASE_DIR/frontend
nohup npm run dev > $LOG_DIR/frontend.log 2>&1 &
echo $! > $LOG_DIR/frontend.pid

echo ""
echo "=================================================================="
echo "✨ SISTEM AUTO VIDEO EDITOR BERHASIL DINYALAKAN DI BACKGROUND ✨"
echo "=================================================================="
echo "🔗 Frontend Dashboard : http://localhost:5173"
echo "🔗 Backend API        : http://localhost:8000"
echo ""
echo "📂 Log sistem tersimpan di: $LOG_DIR"
echo "   (Cek isi log jika terjadi kendala pada salah satu layanan)"
echo ""
echo "⛔ Untuk mematikan aplikasi, cukup ketik: ./stop.sh"
echo "=================================================================="
