# 🎬 Vidflow Studio

**Automated affiliate video editing with streamlined workflow automation.**

![Status](https://img.shields.io/badge/status-active-success) ![React](https://img.shields.io/badge/React-18-blue) ![Vite](https://img.shields.io/badge/Vite-5-purple) ![FastAPI](https://img.shields.io/badge/FastAPI-0.100+-teal) ![Python](https://img.shields.io/badge/Python-3.10+-blue) ![PostgreSQL](https://img.shields.io/badge/PostgreSQL-14+-blue) ![Redis](https://img.shields.io/badge/Redis-6+-red) ![Celery](https://img.shields.io/badge/Celery-5+-green)

---

## 📖 Daftar Isi

- [Fitur Utama](#-fitur-utama)
- [Tech Stack](#-tech-stack)
- [Persyaratan Sistem](#-persyaratan-sistem)
- [Panduan Instalasi & Persiapan](#-panduan-instalasi--persiapan)
- [Cara Menjalankan Aplikasi](#-cara-menjalankan-aplikasi)
- [Cara Penggunaan (Workflow)](#-cara-penggunaan-workflow)
- [Variabel Lingkungan (.env)](#️-variabel-lingkungan-env)
- [Tips & Troubleshooting](#-tips--troubleshooting)
- [Lisensi](#-lisensi)

---

## 🎯 Fitur Utama

| Modul | Fitur |
|---|---|
| **🤖 VAD/AI Speech** | Deteksi suara manusia vs noise (Silero VAD) |
| **✂️ Silence Cut 3 Level** | Amplitude-based + AI-based cutting |
| **📝 Auto Caption** | Transkripsi Whisper + burn-in subtitle |
| **✨ AI Social Caption** | Caption siap sosmed via DeepSeek (16 gaya bahasa, konteks produk) |
| **🖼️ Auto Cover** | 3 template dual-color + AI-generated judul (konteks produk) |
| **🎥 Multi-Codec Render** | H.264 / H.265 / WebM, HD/FHD |
| **🏷️ Product Group** | Mapping folder → nama produk untuk konteks AI |
| **⏹️ Cancel Processing** | Batalkan pipeline yang sedang berjalan |
| **✅ Batch Render** | Select all + auto-queue WAITING |
| **🔐 JWT Authentication** | Login dashboard (admin panel) |
| **📱 Mobile Responsive** | Akses dari HP via WiFi |

---

## 💻 Tech Stack

```text
┌─────────────────────────────────────────┐
│              BROWSER (Windows)           │
│         React 18 · Vite · Tailwind      │
└──────────────┬──────────────────────────┘
               │ REST API (fetch)
┌──────────────▼──────────────────────────┐
│            WSL Ubuntu                    │
│         FastAPI · Python 3.10+          │
│                                          │
│  ┌──────────────────────────────────┐   │
│  │         PostgreSQL Database       │   │
│  └──────────────────────────────────┘   │
│  ┌──────────────────────────────────┐   │
│  │         Redis & Celery            │   │
│  └──────────────────────────────────┘   │
└──────────────┬──────────────────────────┘
               │
    ┌──────────┼──────────┐
    ▼          ▼          ▼
┌──────┐ ┌──────┐ ┌────────┐
│Silero│ │Deep  │ │OpenAI  │
│ VAD  │ │Seek  │ │Whisper │
└──────┘ └──────┘ └────────┘
```

- **Frontend:** React + Vite — Dashboard interaktif
- **Backend API:** FastAPI — Orchestrator + REST API
- **Task Worker:** Celery + Redis — Pipeline async (FFmpeg, PySceneDetect, PyTorch)
- **Database:** PostgreSQL — Video, job logs, konfigurasi
- **AI Services:** OpenAI Whisper (STT) + DeepSeek V4 Flash (Caption & Cover) + Silero VAD (Speech Detection)

---

## 🛠 Persyaratan Sistem (*Prerequisites*)

Sebelum memulai, pastikan sistem Anda telah memiliki:
1. **WSL 2** (Windows Subsystem for Linux) dengan distro Ubuntu terinstall.
2. **PostgreSQL** (native install, bukan Docker) — port default **5432**.
3. **Redis Server** (native install) — port default **6379**.
4. **Python 3.10+** (untuk backend FastAPI & Celery).
5. **Node.js 18+ & NPM** (untuk frontend React, via `nvm`).
6. **FFmpeg** terinstal di sistem operasi Anda.

---

## 🚀 Panduan Instalasi & Persiapan

### Langkah 1: Jalankan PostgreSQL & Redis

Pastikan PostgreSQL dan Redis berjalan sebagai service native WSL:

```bash
sudo pg_ctlcluster 18 main start
sudo service redis-server start
```

### Langkah 2: Setup Backend

Buka terminal WSL, masuk ke direktori proyek, lalu setup Python virtual environment:

```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

### Langkah 3: Inisialisasi Database

Pastikan database `vidflow_studio` sudah ada di PostgreSQL, lalu buat tabel:

```bash
cd backend
PGPASSWORD=postgres psql -h localhost -p 5432 -U postgres -c "CREATE DATABASE vidflow_studio;" 2>/dev/null
source venv/bin/activate
python3 -c "from app.database import engine, Base; from app.models import Video, JobLog; Base.metadata.create_all(bind=engine); print('Tables created!')"
```

---

## 🎮 Cara Menjalankan Aplikasi

### Cara 1: Double-Click dari Windows Desktop (Paling Mudah)

Cukup **double-click** shortcut yang tersedia di Desktop:

| Shortcut | Fungsi |
|----------|--------|
| 🟢 **Start Video Editor.bat** | Menyalakan semua service |
| 🔴 **Stop Video Editor.bat** | Mematikan semua service |

Terminal akan terbuka dan menampilkan status tiap service.

### Cara 2: Terminal WSL

Buka terminal WSL di root direktori proyek:

**Menyalakan:**
```bash
./start-all.sh
```
*Script ini akan otomatis menjalankan PostgreSQL, Redis, Backend FastAPI, Celery Worker, dan Frontend Vite di background. Service yang sudah berjalan tidak akan diduplikasi.*

**Mematikan:**
```bash
./stop-all.sh
```

### Akses Aplikasi

Setelah start:
- **Frontend Dashboard:** [http://localhost:5173/](http://localhost:5173/)
- **API Documentation:** [http://localhost:8000/docs](http://localhost:8000/docs)
- **Logs:** `./logs/` (backend.log, frontend.log, celery.log)

### 📱 Akses dari HP Android (WiFi yang sama)

Frontend lokal bisa diakses dari HP melalui jaringan WiFi yang sama. Perlu setup **port forwarding** satu kali:

**1. Jalankan PowerShell sebagai Administrator di Windows, lalu copy-paste 4 command ini:**

```powershell
# Forward port Frontend (5173) dan Backend (8000) dari Windows ke WSL
netsh interface portproxy add v4tov4 listenport=5173 connectaddress=172.23.13.2 connectport=5173
netsh interface portproxy add v4tov4 listenport=8000 connectaddress=172.23.13.2 connectport=8000

# Buka Windows Firewall
netsh advfirewall firewall add rule name="Vidflow5173" dir=in action=allow protocol=tcp localport=5173
netsh advfirewall firewall add rule name="Vidflow8000" dir=in action=allow protocol=tcp localport=8000
```

**2. Cari IP Windows kamu:**

Di PowerShell, ketik `ipconfig` — cari `IPv4 Address` di adapter WiFi. Contoh: `192.168.1.15`

**3. Dari HP, buka browser dan akses:**

```
http://192.168.1.15:5173
```

> 💡 **Catatan:** IP WSL (`172.23.13.2`) bisa berubah setelah restart Windows. Kalau tiba-tiba nggak bisa akses dari HP, cek IP WSL terbaru dengan: `wsl hostname -I` — lalu update portproxy dengan IP baru.

---

## 💡 Cara Penggunaan (Workflow)

1. **Buka Dashboard:** `http://localhost:5173/`
2. **Isi API Keys:** Masuk ke **Global Settings**, isi OpenAI + DeepSeek API Key, simpan.
3. **Upload Video:**
   - **File Explorer** → buat folder baru (ID Video) → upload `.mp4`
   - Atau taruh langsung folder berisi `.mp4` ke `source/`
4. **Konfigurasi Pipeline:**
   - **Silence Cut:** Pilih Level 3 (VAD/AI) untuk deteksi suara manusia
   - **Auto Caption:** Atur font, warna, posisi + AI Caption Sosmed (gaya bahasa)
   - **Auto Cover:** Pilih template + AI Generate Judul (DeepSeek)
   - **Render Settings:** Pilih resolusi + codec (H.264/H.265/WebM)
5. **Proses:** **Daftar Video** → klik **▶ Process**
6. **Hasil:** Buka **Hasil Render** → salin caption AI, download video, tandai uploaded

---

## ⚙️ Variabel Lingkungan (.env)

```ini
# Database Connection
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/vidflow_studio"

# Celery & Redis
REDIS_URL="redis://localhost:6379/0"
CELERY_BROKER_URL="redis://localhost:6379/0"
CELERY_RESULT_BACKEND="redis://localhost:6379/0"

# External APIs
OPENAI_API_KEY="sk-..."          # Whisper STT
DEEPSEEK_API_KEY="sk-..."        # AI Caption + Cover Title
```

> API keys bisa diisi langsung dari dashboard: **Global Settings & API Keys**.

---

## 📝 Tips & Troubleshooting

- **Sync Folder "Network Error":** Pastikan PostgreSQL berjalan (`pg_isready`). `sudo pg_ctlcluster 18 main start`
- **Restart Celery:** Setiap ubah kode Python di backend/tasks/services → restart Celery (tidak auto-reload).
- **DeepSeek caption kosong:** Pastikan `DEEPSEEK_API_KEY` sudah diisi di Global Settings.
- **Render H.265 gagal "Error opening encoder":** Video 10-bit → sudah di-handle auto-konversi ke `yuv420p`.
- **Cover Title "Test Title 1":** Setting lama — buka Auto Cover Config → pilih gaya bahasa → Save.
- **VAD tidak deteksi suara:** Coba turunkan Speech Threshold ke 0.3 di Silence Cut Config.
- **Font Caption:** Sistem pakai font Linux (`DejaVu Sans`, `Ubuntu`, `DejaVu Serif`).
- **Database connection:** Port PostgreSQL: `5432` (cek `backend/.env`).

---

## 📜 Lisensi

MIT License

Dibuat oleh **Dede Muhira (kang demuh)** dengan ❤️

Aplikasi ini ditujukan untuk mempermudah produksi video massal dan otomatisasi kreator konten.
