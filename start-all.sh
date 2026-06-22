#!/bin/bash
# ============================================
# Auto Video Editor — Start All Services
# Satu perintah untuk menjalankan semuanya
# ============================================
set -e

PROJECT_DIR="/home/kangdemuh/aplikasi/video-editor/claude2"
LOGS_DIR="$PROJECT_DIR/logs"

# Load nvm + pastikan pakai Node.js & npm dari WSL (bukan dari Windows)
export NVM_DIR="$HOME/.nvm"
if [ -s "$NVM_DIR/nvm.sh" ]; then
    . "$NVM_DIR/nvm.sh"  # Load nvm
elif [ -s "/usr/local/nvm/nvm.sh" ]; then
    . "/usr/local/nvm/nvm.sh"
fi
# Bersihkan path Windows dari PATH agar executables Windows (cmd.exe, npm Windows)
# tidak ikut terpanggil saat background process
CLEANED_PATH=""
IFS=':'
for p in $PATH; do
    case "$p" in
        /mnt/c/*|/mnt/d/*|/mnt/e/*) ;;  # skip Windows drive paths
        *) CLEANED_PATH="${CLEANED_PATH}:${p}" ;;
    esac
done
unset IFS
export PATH="${CLEANED_PATH#:}"

# Warna output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

mkdir -p "$LOGS_DIR"

echo ""
echo -e "${CYAN}╔══════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║  Auto Video Editor — Start All Services ║${NC}"
echo -e "${CYAN}╚══════════════════════════════════════════╝${NC}"
echo ""

# ---- PostgreSQL ----
echo -n "  ⏳ PostgreSQL (port 5432)... "
if pg_isready -h localhost -p 5432 -q 2>/dev/null; then
    echo -e "${GREEN}sudah jalan ✓${NC}"
else
    sudo pg_ctlcluster 18 main start 2>/dev/null
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}berhasil start ✓${NC}"
    else
        echo -e "${RED}GAGAL — coba manual: sudo pg_ctlcluster 18 main start${NC}"
    fi
fi

# ---- Redis ----
echo -n "  ⏳ Redis (port 6379)... "
if redis-cli ping >/dev/null 2>&1; then
    echo -e "${GREEN}sudah jalan ✓${NC}"
else
    # Coba start sebagai service, kalau gagal start langsung
    sudo service redis-server start 2>/dev/null || redis-server --daemonize yes 2>/dev/null
    sleep 1
    if redis-cli ping >/dev/null 2>&1; then
        echo -e "${GREEN}berhasil start ✓${NC}"
    else
        echo -e "${RED}GAGAL — coba manual: sudo service redis-server start${NC}"
    fi
fi

# ---- Backend (uvicorn) ----
echo -n "  ⏳ Backend API (port 8000)... "
OLD_PID=$(cat "$LOGS_DIR/backend.pid" 2>/dev/null || true)
if [ -n "$OLD_PID" ] && kill -0 "$OLD_PID" 2>/dev/null; then
    echo -e "${GREEN}sudah jalan ✓${NC} (PID $OLD_PID)"
else
    cd "$PROJECT_DIR/backend"
    nohup venv/bin/uvicorn app.main:app --reload --port 8000 > "$LOGS_DIR/backend.log" 2>&1 &
    NEW_PID=$!
    echo $NEW_PID > "$LOGS_DIR/backend.pid"
    sleep 3
    if kill -0 "$NEW_PID" 2>/dev/null; then
        echo -e "${GREEN}berhasil start ✓${NC} (PID $NEW_PID)"
    else
        echo -e "${RED}GAGAL — cek logs/backend.log${NC}"
    fi
    cd "$PROJECT_DIR"
fi

# ---- Celery Worker ----
echo -n "  ⏳ Celery Worker... "
OLD_PID=$(cat "$LOGS_DIR/celery.pid" 2>/dev/null || true)
if [ -n "$OLD_PID" ] && kill -0 "$OLD_PID" 2>/dev/null; then
    echo -e "${GREEN}sudah jalan ✓${NC} (PID $OLD_PID)"
else
    cd "$PROJECT_DIR/backend"
    nohup venv/bin/celery -A app.tasks.celery_app worker --loglevel=info > "$LOGS_DIR/celery.log" 2>&1 &
    NEW_PID=$!
    echo $NEW_PID > "$LOGS_DIR/celery.pid"
    sleep 2
    if kill -0 "$NEW_PID" 2>/dev/null; then
        echo -e "${GREEN}berhasil start ✓${NC} (PID $NEW_PID)"
    else
        echo -e "${RED}GAGAL — cek logs/celery.log${NC}"
    fi
    cd "$PROJECT_DIR"
fi

# ---- Frontend (Vite) ----
echo -n "  ⏳ Frontend (port 5173)... "
OLD_PID=$(cat "$LOGS_DIR/frontend.pid" 2>/dev/null || true)
if [ -n "$OLD_PID" ] && kill -0 "$OLD_PID" 2>/dev/null; then
    echo -e "${GREEN}sudah jalan ✓${NC} (PID $OLD_PID)"
else
    cd "$PROJECT_DIR/frontend"
    nohup npm run dev > "$LOGS_DIR/frontend.log" 2>&1 &
    NEW_PID=$!
    echo $NEW_PID > "$LOGS_DIR/frontend.pid"
    sleep 4
    if kill -0 "$NEW_PID" 2>/dev/null; then
        echo -e "${GREEN}berhasil start ✓${NC} (PID $NEW_PID)"
    else
        echo -e "${RED}GAGAL — cek logs/frontend.log${NC}"
    fi
    cd "$PROJECT_DIR"
fi

echo ""
echo -e "${CYAN}╔══════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║         Semua service siap!             ║${NC}"
echo -e "${CYAN}╠══════════════════════════════════════════╣${NC}"
echo -e "${CYAN}║  Frontend : http://localhost:5173        ║${NC}"
echo -e "${CYAN}║  API Docs : http://localhost:8000/docs   ║${NC}"
echo -e "${CYAN}║  Logs     : ./logs/                      ║${NC}"
echo -e "${CYAN}║  Stop all : ./stop-all.sh                ║${NC}"
echo -e "${CYAN}╚══════════════════════════════════════════╝${NC}"
echo ""
