#!/bin/bash
# ============================================
# Auto Video Editor — Stop All Services
# ============================================
set -e

LOGS_DIR="/home/kangdemuh/aplikasi/video-editor/claude2/logs"

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
NC='\033[0m'

echo ""
echo -e "${CYAN}╔══════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║  Auto Video Editor — Stop All Services  ║${NC}"
echo -e "${CYAN}╚══════════════════════════════════════════╝${NC}"
echo ""

# ---- Frontend ----
echo -n "  ⏳ Stopping Frontend... "
PID=$(cat "$LOGS_DIR/frontend.pid" 2>/dev/null || true)
if [ -n "$PID" ] && kill -0 "$PID" 2>/dev/null; then
    # Kill the entire process group karena npm run dev spawn child processes
    kill -TERM -- -$(ps -o pgid= -p $PID | tr -d ' ') 2>/dev/null || kill -TERM $PID 2>/dev/null
    sleep 1
    kill -0 "$PID" 2>/dev/null && kill -KILL $PID 2>/dev/null || true
    echo -e "${GREEN}stopped ✓${NC}"
else
    echo -e "${YELLOW}tidak berjalan${NC}"
fi
rm -f "$LOGS_DIR/frontend.pid"

# ---- Celery ----
echo -n "  ⏳ Stopping Celery Worker... "
PID=$(cat "$LOGS_DIR/celery.pid" 2>/dev/null || true)
if [ -n "$PID" ] && kill -0 "$PID" 2>/dev/null; then
    kill -TERM $PID 2>/dev/null
    sleep 2
    kill -0 "$PID" 2>/dev/null && kill -KILL $PID 2>/dev/null || true
    echo -e "${GREEN}stopped ✓${NC}"
else
    echo -e "${YELLOW}tidak berjalan${NC}"
fi
rm -f "$LOGS_DIR/celery.pid"

# ---- Backend ----
echo -n "  ⏳ Stopping Backend API... "
PID=$(cat "$LOGS_DIR/backend.pid" 2>/dev/null || true)
if [ -n "$PID" ] && kill -0 "$PID" 2>/dev/null; then
    kill -TERM $PID 2>/dev/null
    sleep 1
    kill -0 "$PID" 2>/dev/null && kill -KILL $PID 2>/dev/null || true
    echo -e "${GREEN}stopped ✓${NC}"
else
    echo -e "${YELLOW}tidak berjalan${NC}"
fi
rm -f "$LOGS_DIR/backend.pid"

# ---- Redis (opsional, tidak semua orang mau stop Redis) ----
echo -n "  ⏳ Stopping Redis... "
if redis-cli ping >/dev/null 2>&1; then
    redis-cli shutdown 2>/dev/null && echo -e "${GREEN}stopped ✓${NC}" || echo -e "${YELLOW}skip (perlu sudo)${NC}"
else
    echo -e "${YELLOW}tidak berjalan${NC}"
fi

# ---- PostgreSQL (opsional) ----
echo -n "  ⏳ Stopping PostgreSQL... "
if pg_isready -h localhost -p 5432 -q 2>/dev/null; then
    sudo pg_ctlcluster 18 main stop 2>/dev/null && echo -e "${GREEN}stopped ✓${NC}" || echo -e "${YELLOW}skip (perlu sudo)${NC}"
else
    echo -e "${YELLOW}tidak berjalan${NC}"
fi

echo ""
echo -e "${CYAN}  Semua service dihentikan.${NC}"
echo ""
