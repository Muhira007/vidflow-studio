# 🎬 Auto Video Editor

Auto Video Editor adalah aplikasi *full-stack* pintar yang dirancang untuk mempermudah dan mengotomatisasi alur kerja pengeditan video. Aplikasi ini mendeteksi video baru, memotong bagian hening secara otomatis (*silence cut*), menghasilkan *subtitle* menggunakan AI (OpenAI Whisper), dan menerapkan desain *cover* dinamis.

## 🏗 Arsitektur Sistem

Aplikasi ini dibangun menggunakan arsitektur modern berbasis microservices:

- **Frontend:** React + Vite + TailwindCSS (Antarmuka pengguna interaktif).
- **Backend API:** FastAPI (Menerima permintaan dari frontend dan mengatur alur kerja).
- **Task Worker:** Celery (Memproses video di latar belakang menggunakan `FFmpeg` dan `PySceneDetect`).
- **Message Broker:** Redis (Sebagai perantara antrean tugas untuk Celery).
- **Database:** PostgreSQL (Menyimpan status video, konfigurasi, dan *job logs*).

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

Pastikan database `auto_video_editor` sudah ada di PostgreSQL, lalu buat tabel:

```bash
cd backend
PGPASSWORD=postgres psql -h localhost -p 5432 -U postgres -c "CREATE DATABASE auto_video_editor;" 2>/dev/null
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

Terminal akan terbuka dan menampilkan status tiap service. Setelah selesai, tekan sembarang tombol untuk menutup.

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

---

## 💡 Cara Penggunaan (Workflow)

1. **Buka Dashboard:** Buka browser dan akses `http://localhost:5173/`.
2. **Sync Folder:** Masuk ke halaman **Daftar Video**, klik tombol **Sync Folder** untuk mendaftarkan folder video yang sudah ada ke database.
3. **Atur Konfigurasi AI:** Masuk ke menu **Global Settings**, masukkan *OpenAI API Key* Anda, lalu simpan.
4. **Daftarkan Video Baru:**
   - Masuk ke menu **File Explorer** dari panel kiri.
   - Klik kanan untuk membuat folder baru (sebagai ID Video).
   - Masuk ke folder tersebut, klik **Upload File** untuk mengunggah file `.mp4`.
   - Sistem akan otomatis mendaftarkannya ke database.
5. **Mulai Pemrosesan:** Buka halaman **Daftar Video**, klik tombol **▶ Process** untuk memulai pipeline.
6. **Pantau Proses:** Celery akan mengeksekusi tugas di latar belakang. Status diperbarui secara *real-time*.

---

## ⚙️ Variabel Lingkungan (.env)

Konfigurasi environment tersimpan di `backend/.env`:

```ini
# Database Connection
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/auto_video_editor"

# Celery & Redis
REDIS_URL="redis://localhost:6379/0"
CELERY_BROKER_URL="redis://localhost:6379/0"
CELERY_RESULT_BACKEND="redis://localhost:6379/0"

# External APIs
OPENAI_API_KEY="your-openai-api-key"
```

---

## 📝 Tips & Troubleshooting

- **Sync Folder gagal "Network Error":** Pastikan PostgreSQL berjalan (`pg_isready -h localhost -p 5432`). Jika tidak, jalankan `sudo pg_ctlcluster 18 main start`.
- **Restart Celery:** Jika Anda mengubah source code Python di backend, matikan Celery lalu jalankan ulang. Celery tidak *auto-reload* seperti FastAPI.
- **Frontend tidak muncul:** Cek log di `logs/frontend.log`. Jika ada error "CMD.EXE" / "UNC paths not supported", pastikan menjalankan dari dalam WSL (bukan dari Windows PowerShell langsung).
- **Tampilan Auto Caption:**
  - **Jenis Font:** Sistem hanya memproses font Linux bawaan (`DejaVu Sans`, `Ubuntu`, `DejaVu Serif`).
  - **Posisi Persentase:** Slider 0% (Bawah) hingga 100% (Atas) menggunakan kanvas virtual ASS 288px.
- **Toleransi Silence Cut Level 1:** Sistem menyisakan padding 0.5 detik di awal video agar suara pertama tidak terpotong.
- **Gagal koneksi database:** Pastikan port di `backend/.env` sesuai dengan port PostgreSQL (`5432`).

---

## 📜 Lisensi

Aplikasi ini ditujukan untuk mempermudah produksi video massal dan otomatisasi kreator konten.
