@echo off
title Vidflow Studio - Stop All Services
color 0C
echo ========================================
echo   Vidflow Studio -- Stop via WSL
echo ========================================
echo.
echo Menghentikan semua service...
echo (Frontend + Celery + Backend + Redis + PostgreSQL)
echo.

wsl -d Ubuntu-26.04 --cd "/home/kangdemuh/aplikasi/video-editor/claude2" bash -c "./stop-all.sh"

echo.
echo ========================================
echo   Semua service telah dihentikan.
echo ========================================
echo.
echo Tekan tombol apa saja untuk menutup jendela ini...
pause >nul
