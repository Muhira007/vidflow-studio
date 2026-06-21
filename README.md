# 🎬 Auto Video Editor

Auto Video Editor adalah aplikasi *full-stack* pintar yang dirancang untuk mempermudah dan mengotomatisasi alur kerja pengeditan video. Aplikasi ini mendeteksi video baru, memotong bagian hening secara otomatis (*silence cut*), menghasilkan *subtitle* menggunakan AI (OpenAI), dan menerapkan desain *cover* dinamis.

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
1. **Docker & Docker Compose** (Untuk menjalankan PostgreSQL & Redis).
2. **Python 3.10+** (Untuk backend FastAPI & Celery).
3. **Node.js 18+ & NPM** (Untuk frontend React).
4. **FFmpeg** terinstal di sistem operasi Anda.

---

## 🚀 Panduan Instalasi & Persiapan

### Langkah 1: Jalankan Database & Redis
Masuk ke root direktori proyek, lalu jalankan Docker:
```bash
docker compose up -d
```
*(Tambahkan `sudo` jika sistem Anda memerlukannya).*

### Langkah 2: Setup Backend
Buka terminal baru untuk mengatur *environment* backend Python.
```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

### Langkah 3: Inisialisasi Database
Pastikan Anda masih berada di dalam *virtual environment* (`venv`), lalu buat tabel database:
```bash
python3 create_db.py
```

---

## 🎮 Cara Menjalankan Aplikasi

Aplikasi ini membutuhkan **3 terminal** terpisah agar semua layanannya dapat berjalan bersamaan.

### Terminal 1: Backend API Server
Bertugas melayani antarmuka web dan menyimpan data konfigurasi.
```bash
cd backend
source venv/bin/activate
uvicorn app.main:app --reload --port 8000
```

### Terminal 2: Celery Worker
Bertugas mengeksekusi operasi berat seperti memotong video (FFmpeg) dan Transkripsi AI.
```bash
cd backend
source venv/bin/activate
celery -A app.celery_app worker --loglevel=info
```

### Terminal 3: Frontend Dashboard
Bertugas menampilkan UI (User Interface) di browser Anda.
```bash
cd frontend
npm install
npm run dev
```

---

## 💡 Cara Penggunaan (Workflow)

1. **Buka Dashboard UI:** Buka browser dan akses URL `http://localhost:5173/`.
2. **Konfigurasi AI:** Masuk ke menu **Global Settings** di sebelah kiri. Masukkan *API Key* Anda (Deepgram / OpenAI) untuk keperluan pengenalan suara otomatis (*Auto Caption*), lalu simpan.
3. **Daftarkan Video:**
   - Secara bawaan, Anda dapat menggunakan script `python3 app/watcher.py` untuk memantau folder `source/`.
   - Cukup buat sub-folder baru di dalam `source/` dan letakkan file `.mp4` Anda di sana.
   - Sistem akan otomatis mendeteksinya, mendaftarkannya ke dalam *database*, dan menampilkan video tersebut di halaman muka Dashboard.
4. **Mulai Pemrosesan:** Klik tombol **Process** atau atur level *Silence Cut* dan konfigurasi lain langsung melalui Dashboard web Anda.
5. **Pantau Proses:** Celery akan mengeksekusi tugas tersebut di latar belakang dan status akan diperbarui secara *real-time* di layar Anda.

---

## ⚙️ Variabel Lingkungan (.env)
Jika Anda perlu mengubah port atau kredensial database/Redis, Anda dapat memodifikasi file `backend/.env`. Contoh:
```ini
DATABASE_URL="postgresql://postgres:postgres@localhost:5433/auto_video_editor"
REDIS_URL="redis://localhost:6379/0"
```

## 📜 Lisensi
Aplikasi ini ditujukan untuk mempermudah produksi video massal dan otomatisasi kreator konten.
