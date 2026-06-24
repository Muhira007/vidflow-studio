@echo off
title Auto Video Editor - Stop All Services
color 0C
echo ========================================
echo   Auto Video Editor -- Stop via WSL
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
