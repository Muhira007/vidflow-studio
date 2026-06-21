#!/bin/bash

BASE_DIR="/home/kangdemuh/aplikasi/video-editor/claude2"
LOG_DIR="$BASE_DIR/logs"

echo "Membunuh proses yang berjalan..."

echo "🔴 1. Mematikan Frontend (Vite)..."
if [ -f $LOG_DIR/frontend.pid ]; then
    kill $(cat $LOG_DIR/frontend.pid) 2>/dev/null || true
    rm $LOG_DIR/frontend.pid
fi
# Bunuh paksa semua proses vite yang mungkin tersisa
pkill -f "vite" 2>/dev/null || true
pkill -f "npm run dev" 2>/dev/null || true

echo "🔴 2. Mematikan Celery Worker..."
if [ -f $LOG_DIR/celery.pid ]; then
    kill $(cat $LOG_DIR/celery.pid) 2>/dev/null || true
    rm $LOG_DIR/celery.pid
fi
# Bunuh paksa proses celery
pkill -f "celery -A app.tasks" 2>/dev/null || true

echo "🔴 3. Mematikan Backend (FastAPI)..."
if [ -f $LOG_DIR/backend.pid ]; then
    kill $(cat $LOG_DIR/backend.pid) 2>/dev/null || true
    rm $LOG_DIR/backend.pid
fi
# Bunuh paksa proses uvicorn
pkill -f "uvicorn app.main:app" 2>/dev/null || true

echo ""
echo "=================================================================="
echo "🛑 SEMUA LAYANAN TELAH DIMATIKAN"
echo "=================================================================="
echo "Catatan: Database (Postgres) dan Redis dibiarkan tetap berjalan via Docker."
echo "         Jika Anda ingin mematikan Docker, ketik: docker compose stop"
echo "=================================================================="
