#!/bin/bash
# ============================================
# Vidflow Studio — Start All Services
# Satu perintah untuk menjalankan semuanya
# ============================================
set -e

PROJECT_DIR="/home/kangdemuh/aplikasi/vidflow"
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

# ── Port configuration ──
BACKEND_PORT=8000
FRONTEND_PORT=5173

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
echo -e "${CYAN}║    Vidflow Studio — Start All Services    ║${NC}"
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

# Helper: bunuh SEMUA proses yang menggunakan port tertentu (force free)
kill_port() {
    local port="$1"
    local pids
    pids=$(fuser "$port/tcp" 2>/dev/null || true)
    if [ -n "$pids" ]; then
        echo -n "(membersihkan port $port...)"
        fuser -k "$port/tcp" 2>/dev/null || true
        sleep 1  # tunggu socket TIME_WAIT selesai
        echo -n " bersih) "
    fi
}

# Helper: hapus stale PID file kalau prosesnya sudah mati
cleanup_stale_pid() {
    local pidfile="$1"
    local pid
    pid=$(cat "$pidfile" 2>/dev/null || true)
    if [ -n "$pid" ] && ! kill -0 "$pid" 2>/dev/null; then
        rm -f "$pidfile"
    fi
}

# Helper: daemonize a command with setsid (truly detach from terminal)
# Fallback ke nohup + disown kalau setsid tidak tersedia
daemonize() {
    local logfile="$1"
    local pidfile="$2"
    shift 2
    if command -v setsid &>/dev/null; then
        setsid "$@" >> "$logfile" 2>&1 &
    else
        nohup "$@" >> "$logfile" 2>&1 &
        disown
    fi
    echo $! > "$pidfile"
}

# Helper: tunggu proses siap dengan polling (max N detik)
wait_until_ready() {
    local pid="$1"
    local max_wait="$2"
    local elapsed=0
    local interval=1
    while [ $elapsed -lt $max_wait ]; do
        if kill -0 "$pid" 2>/dev/null; then
            return 0
        fi
        sleep "$interval"
        elapsed=$((elapsed + interval))
    done
    return 1
}

# ---- Backend (uvicorn) ----
echo -n "  ⏳ Backend API (port $BACKEND_PORT)... "
cleanup_stale_pid "$LOGS_DIR/backend.pid"
OLD_PID=$(cat "$LOGS_DIR/backend.pid" 2>/dev/null || true)
if [ -n "$OLD_PID" ] && kill -0 "$OLD_PID" 2>/dev/null; then
    echo -e "${GREEN}sudah jalan ✓${NC} (PID $OLD_PID)"
else
    # Bersihkan port sebelum start (bunuh zombie proses)
    kill_port "$BACKEND_PORT"
    cd "$PROJECT_DIR/backend"
    daemonize "$LOGS_DIR/backend.log" "$LOGS_DIR/backend.pid" \
        venv/bin/uvicorn app.main:app --reload --host 0.0.0.0 --port "$BACKEND_PORT"
    NEW_PID=$(cat "$LOGS_DIR/backend.pid")
    if wait_until_ready "$NEW_PID" 8; then
        echo -e "${GREEN}berhasil start ✓${NC} (PID $NEW_PID)"
    else
        echo -e "${RED}GAGAL — cek logs/backend.log${NC}"
        echo -e "         ${YELLOW}$(tail -5 "$LOGS_DIR/backend.log" 2>/dev/null || echo '(kosong)')${NC}"
    fi
    cd "$PROJECT_DIR"
fi

# ---- Celery Worker ----
echo -n "  ⏳ Celery Worker... "
# Kill ALL existing celery workers to prevent duplicates
pkill -f "celery.*worker" 2>/dev/null || true
sleep 1
cleanup_stale_pid "$LOGS_DIR/celery.pid"
cd "$PROJECT_DIR/backend"
daemonize "$LOGS_DIR/celery.log" "$LOGS_DIR/celery.pid" \
    venv/bin/celery -A app.tasks.celery_app worker --loglevel=info --concurrency=1 --prefetch-multiplier=1
NEW_PID=$(cat "$LOGS_DIR/celery.pid")
if wait_until_ready "$NEW_PID" 5; then
    echo -e "${GREEN}berhasil start ✓${NC} (PID $NEW_PID)"
else
    echo -e "${RED}GAGAL — cek logs/celery.log${NC}"
fi
cd "$PROJECT_DIR"

# ---- Frontend (Vite) ----
echo -n "  ⏳ Frontend (port $FRONTEND_PORT)... "
cleanup_stale_pid "$LOGS_DIR/frontend.pid"
OLD_PID=$(cat "$LOGS_DIR/frontend.pid" 2>/dev/null || true)
if [ -n "$OLD_PID" ] && kill -0 "$OLD_PID" 2>/dev/null; then
    # Cek apakah Vite yang berjalan masih menggunakan port yang benar
    if fuser "$FRONTEND_PORT/tcp" 2>/dev/null | grep -q "$OLD_PID"; then
        echo -e "${GREEN}sudah jalan ✓${NC} (PID $OLD_PID, port $FRONTEND_PORT)"
    else
        # PID ada tapi port salah → bunuh dan restart
        echo -n "(port mismatch, restart...) "
        kill -TERM -- -$(ps -o pgid= -p $OLD_PID | tr -d ' ') 2>/dev/null || kill -TERM $OLD_PID 2>/dev/null
        sleep 1
        kill -0 "$OLD_PID" 2>/dev/null && kill -KILL $OLD_PID 2>/dev/null || true
        rm -f "$LOGS_DIR/frontend.pid"
        OLD_PID=""
    fi
fi

if [ -z "$OLD_PID" ] || ! kill -0 "$OLD_PID" 2>/dev/null; then
    # BUNUH SEMUA proses yang pakai port frontend (zombie dari run sebelumnya)
    kill_port "$FRONTEND_PORT"
    # Bunuh juga port 5174 kalau ada (fallback port sebelumnya)
    kill_port 5174

    cd "$PROJECT_DIR/frontend"

    # Hapus log lama supaya deteksi port aktual lebih mudah
    > "$LOGS_DIR/frontend.log"

    daemonize "$LOGS_DIR/frontend.log" "$LOGS_DIR/frontend.pid" \
        npm run dev -- --host 0.0.0.0 --port "$FRONTEND_PORT" --strictPort

    NEW_PID=$(cat "$LOGS_DIR/frontend.pid")
    if wait_until_ready "$NEW_PID" 12; then
        # Deteksi port aktual dari log Vite
        ACTUAL_PORT=""
        for i in $(seq 1 5); do
            sleep 0.5
            ACTUAL_PORT=$(grep -oP 'Local:\s+http://localhost:\K\d+' "$LOGS_DIR/frontend.log" 2>/dev/null | tail -1 || true)
            [ -n "$ACTUAL_PORT" ] && break
        done
        if [ -n "$ACTUAL_PORT" ] && [ "$ACTUAL_PORT" != "$FRONTEND_PORT" ]; then
            echo -e "${YELLOW}port $ACTUAL_PORT (5173 dipakai) ⚠${NC}"
            FRONTEND_PORT="$ACTUAL_PORT"
        else
            ACTUAL_PORT="$FRONTEND_PORT"
            echo -e "${GREEN}berhasil start ✓${NC} (PID $NEW_PID)"
        fi
    else
        echo -e "${RED}GAGAL — cek logs/frontend.log${NC}"
        echo -e "         ${YELLOW}Isi log:${NC}"
        echo -e "         ${YELLOW}$(tail -5 "$LOGS_DIR/frontend.log" 2>/dev/null || echo '(kosong)')${NC}"
    fi
    cd "$PROJECT_DIR"
fi

echo ""
echo -e "${CYAN}╔══════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║         Semua service siap!             ║${NC}"
echo -e "${CYAN}╠══════════════════════════════════════════╣${NC}"
printf "${CYAN}║  Frontend : http://localhost:%-11s║${NC}\n" "$FRONTEND_PORT"
echo -e "${CYAN}║  API Docs : http://localhost:8000/docs   ║${NC}"
echo -e "${CYAN}║  Logs     : ./logs/                      ║${NC}"
echo -e "${CYAN}║  Stop all : ./stop-all.sh                ║${NC}"
echo -e "${CYAN}╚══════════════════════════════════════════╝${NC}"
echo ""
