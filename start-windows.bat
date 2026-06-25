@echo off
title Vidflow Studio - Start All (Windows Native)
color 0B

echo ===================================================
echo   Vidflow Studio - Start Services (Windows Native)
echo ===================================================
echo.

echo [1/4] Menyalakan PostgreSQL dan Redis di dalam WSL...
wsl sudo pg_ctlcluster 18 main start >nul 2>&1
wsl sudo service redis-server start >nul 2>&1
echo Berhasil.
echo.

echo [2/4] Membuka Backend API (FastAPI)...
start "Vidflow Backend" cmd /k "cd backend && venv-win\Scripts\activate && uvicorn app.main:app --reload --host 0.0.0.0 --port 8000"

echo [3/4] Membuka Celery Worker...
start "Vidflow Celery Worker" cmd /k "cd backend && venv-win\Scripts\activate && celery -A app.tasks.celery_app worker --loglevel=info --pool=solo"

echo [4/4] Membuka Frontend...
start "Vidflow Frontend" cmd /k "cd frontend && npm run dev"

echo.
echo ===================================================
echo Semua service sedang dinyalakan di jendela terpisah!
echo.
echo Frontend : http://localhost:5173
echo API Docs : http://localhost:8000/docs
echo ===================================================
pause
