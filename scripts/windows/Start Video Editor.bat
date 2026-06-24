@echo off
title Auto Video Editor - Start All Services
color 0B
echo ========================================
echo   Auto Video Editor -- Start via WSL
echo ========================================
echo.
echo Menjalankan semua service di WSL...
echo (PostgreSQL + Redis + Backend + Celery + Frontend)
echo.
echo CATATAN: Service tetap berjalan meski jendela ini ditutup.
echo Gunakan "Stop Video Editor.bat" untuk mematikan semua service.
echo.

:: Jalankan start script di WSL. Service di-start dengan nohup di background
:: sehingga tetap hidup setelah wsl.exe selesai. WSL VM tidak auto-shutdown
:: berkat vmIdleTimeout=-1 di .wslconfig.
wsl -d Ubuntu-26.04 --cd "/home/kangdemuh/aplikasi/video-editor/claude2" bash -c "./start-all.sh"

echo.
echo ========================================
echo   Semua service berjalan di background!
echo ========================================
echo.
echo  Frontend : http://localhost:5173  (cek output WSL di atas, port bisa beda!)
echo  API Docs : http://localhost:8000/docs
echo  Logs     : logs\  (di direktori proyek)
echo.
echo  JIKA frontend tidak bisa dibuka, jalankan:
echo    wsl -d Ubuntu-26.04 --cd "/home/kangdemuh/aplikasi/video-editor/claude2" bash -c "./stop-all.sh ^&^& ./start-all.sh"
echo.
echo Tekan tombol apa saja untuk menutup jendela ini.
echo (Service TETAP berjalan -- aman ditutup!)
pause >nul
