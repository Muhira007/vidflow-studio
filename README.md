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

Kini Anda dapat menjalankan seluruh aplikasi dengan satu perintah tanpa harus membuka banyak jendela terminal.

### Menyalakan Aplikasi
Buka terminal di root direktori proyek, lalu jalankan:
```bash
./start.sh
```
*Script ini akan otomatis menjalankan Database (Docker), Backend FastAPI, Celery Worker, dan Frontend Vite di background.*

### Mematikan Aplikasi
Jika sudah selesai bekerja, hentikan seluruh layanan dengan perintah:
```bash
./stop.sh
```

---

## 💡 Cara Penggunaan (Workflow)

1. **Buka Dashboard UI:** Buka browser dan akses URL `http://localhost:5173/`.
2. **Konfigurasi AI:** Masuk ke menu **Global Settings** di sebelah kiri. Masukkan *API Key* Anda (OpenAI) untuk keperluan pengenalan suara otomatis (*Auto Caption*), lalu simpan.
3. **Daftarkan Video:**
   - Masuk ke menu **File Explorer** dari panel kiri.
   - Klik kanan untuk membuat folder baru (sebagai ID Video), dan klik **Upload File di Sini** untuk mengunggah `.mp4` ke dalam folder.
   - Sistem akan otomatis mendeteksinya, mendaftarkannya ke dalam *database*, dan menampilkannya di dashboard.
4. **Mulai Pemrosesan:** Klik tombol **Process** atau atur level *Silence Cut* dan konfigurasi lain langsung melalui Dashboard web Anda.
5. **Pantau Proses:** Celery akan mengeksekusi tugas tersebut di latar belakang dan status akan diperbarui secara *real-time* di layar Anda.

---

## ⚙️ Variabel Lingkungan (.env)
Jika Anda perlu mengubah port atau kredensial database/Redis, Anda dapat memodifikasi file `backend/.env`. Contoh:
```ini
DATABASE_URL="postgresql://postgres:postgres@localhost:5433/auto_video_editor"
REDIS_URL="redis://localhost:6379/0"
```

## 📝 Tips & Troubleshooting

- **Restart Celery:** Jika Anda melakukan perubahan *source code* Python di backend (misal merombak algoritma *silence cut* atau struktur *auto caption*), pastikan untuk mematikan Celery (`Ctrl+C`) lalu menyalakannya kembali. Celery tidak *auto-reload* seperti FastAPI.
- **Tampilan Auto Caption:**
  - **Jenis Font:** Sistem hanya memproses font Linux bawaan yang terpasang di *server/container* Anda (seperti `DejaVu Sans`, `Ubuntu`, `DejaVu Serif`).
  - **Posisi Persentase:** Tuas geser 0% (Bawah) hingga 100% (Atas) dikalkulasikan secara aman menggunakan tinggi kanvas virtual *SubStation Alpha* (ASS) bawaan FFmpeg (yaitu `288px`), sehingga *subtitle* tidak akan terdorong keluar batas layar sekalipun pada video *1080p*.
- **Toleransi *Silence Cut*:** Khusus untuk **Level 1** (*Trim* Awal & Akhir), sistem akan menyisakan *padding/buffer* selama `0.5 detik` pada awal video untuk memastikan huruf pertama dari pembicaraan (*speech*) Anda tidak terpotong akibat keterlambatan sensor mikrofon kamera.

---

## 📜 Lisensi
Aplikasi ini ditujukan untuk mempermudah produksi video massal dan otomatisasi kreator konten.
