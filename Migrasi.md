# 📦 Catatan Migrasi — Vidflow Studio

**Dari:** Lokal WSL (laptop)  
**Ke:** VPS Ubuntu 24.04 + Docker  
**Tanggal:** 24 Juni 2026  
**Domain:** `app.muhirastore.com`  
**VPS:** IDCloudHost — `103.59.94.188`

---

## 🛠 Step 0: Pra-Migrasi

### Checklist sebelum mulai
- [x] Semua perubahan lokal di-push ke GitHub
- [x] `backend/.env` tidak ikut di-push (API key aman)
- [x] Pipeline end-to-end teruji di lokal
- [x] API keys (OpenAI, DeepSeek) siap dipakai ulang

### Persiapan repo
- Semua branding "Auto Video Editor" → "Vidflow Studio"
- Nama database `auto_video_editor` → `vidflow_studio`
- File `.bat` Windows di-rename (`Start/Stop Vidflow Studio.bat`)
- Windows launcher `.bat` sudah disalin ke Desktop (opsional)

---

## 🐳 Step 1: Dockerize Semua Service

### File yang dibuat:

| File | Fungsi |
|------|--------|
| `docker-compose.yml` | Orkestrasi 5 container: PostgreSQL + Redis + Backend + Celery + Nginx |
| `docker/Dockerfile.backend` | Python 3.11-slim + FFmpeg + PyTorch CPU + libsndfile |
| `docker/nginx/Dockerfile` | Multi-stage: build React → Nginx serve static + reverse proxy |
| `docker/nginx/default.conf` | Rate limiting, `/api/*` → backend, static files, HTTP→HTTPS redirect |
| `.env.production.example` | Template environment production (tanpa secrets) |
| `.dockerignore` | Exclude venv, node_modules, data, logs |

### Problem & Fix:

| # | Masalah | Penyebab | Solusi |
|---|---------|----------|--------|
| 1 | `libgl1-mesa-glx` not found | Ubuntu 24.04 ganti nama package | Ganti ke `libgl1` |
| 2 | `soundfile` module not found | VAD service butuh `libsndfile1` + python `soundfile` | Tambah ke requirements + Dockerfile |
| 3 | `passlib` bcrypt backend error | Bug di passlib dengan bcrypt versi baru | Ganti ke `bcrypt` langsung |

---

## 🖥️ Step 2: Setup VPS

### Spesifikasi
- **OS:** Ubuntu 24.04.4 LTS
- **Provider:** IDCloudHost
- **User:** `kangdemuh` (sudo access)
- **Hostname:** VidflowStudio

### Instalasi
```bash
# Docker + Compose (via get.docker.com)
sudo apt update
curl -fsSL https://get.docker.com | sudo bash
sudo usermod -aG docker kangdemuh

# Git sudah terinstall
git clone https://github.com/Muhira007/vidflow-studio.git
```

### Firewall (UFW)
```bash
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw --force enable
```

---

## 🌐 Step 3: Domain & HTTPS

### DNS Cloudflare
- **A Record:** `app.muhirastore.com` → `103.59.94.188`
- **Proxy:** Grey cloud (DNS only) — bukan orange cloud
- Kenapa: Cloudflare proxy nggak bisa langsung resolve ke IP VPS

### SSL Let's Encrypt
- **Tool:** Certbot (standalone mode)
- **Temporary:** Stop Nginx container saat generate cert
- **Auto-renew:** Cron job tiap jam 3 pagi
- **Expired:** 22 September 2026 (renew otomatis)

```bash
# Stop nginx sebentar
docker compose stop nginx

# Generate cert
certbot certonly --standalone -d app.muhirastore.com

# Copy ke folder ssl/
cp /etc/letsencrypt/live/app.muhirastore.com/fullchain.pem ssl/
cp /etc/letsencrypt/live/app.muhirastore.com/privkey.pem ssl/

# Restart semua
docker compose up -d --build
```

---

## 📦 Step 4: Migrasi Database

### Proses
1. Export database lokal: `pg_dump -U postgres vidflow_studio > backup.sql`
2. Copy ke server via SCP
3. Import via Docker: `cat backup.sql | docker compose exec -T postgres psql`

### Problem & Fix:

| # | Masalah | Penyebab | Solusi |
|---|---------|----------|--------|
| 4 | Git permission denied | `.env.production` dibuat oleh root | `sudo chown -R kangdemuh:kangdemuh` setiap kali setelah deploy |
| 5 | Database kosong setelah import | Backup dari state setelah reset | Video perlu di-upload ulang |
| 6 | `COPY 0` — data video tidak terimport | Backup dilakukan setelah reset status | Tidak masalah; upload ulang video via dashboard |

### Catatan:
- Setiap `docker compose up` dengan sudo bisa mengubah ownership file
- Selalu `chown` setelah deploy untuk menghindari git error

---

## 🔐 Step 5: Keamanan

### Autentikasi JWT

**Backend:** `app/auth.py`
- Library: `python-jose` + `bcrypt`
- Login: `POST /api/auth/login` → JWT token (24 jam)
- Semua `/api/*` endpoint dilindungi (kecuali `/api/health` dan `/api/auth/login`)
- Kredensial admin dari environment variable

**Frontend:** `Login.jsx`
- Halaman login sebelum dashboard
- Token disimpan di `localStorage`
- Auto-verify token saat mount
- Logout button di header

### Problem & Fix:

| # | Masalah | Penyebab | Solusi |
|---|---------|----------|--------|
| 7 | "Login gagal" di production | `api.js` baseURL hardcode `localhost:8000` | Ganti ke `/api` (relative URL) |
| 8 | FileManager stream URL error | Stream URL hardcode localhost | Ganti ke `/api/fs/stream/...` |
| 9 | GlobalSettings fetch gagal | Fetch ke `localhost:8000/api` | Ganti ke axios `api` dengan relative URL |
| 10 | OutputList download error | Download URL hardcode localhost | Ganti ke relative `/api/...` |

### Keamanan yang sudah aktif:
- [x] HTTPS (Let's Encrypt)
- [x] HTTP → HTTPS redirect (301)
- [x] JWT Authentication (24 jam expiry)
- [x] Rate limiting API (100 req/menit per IP)
- [x] Firewall UFW (22, 80, 443 only)
- [x] SSL auto-renew cron (daily 3am)

---

## 🔧 Step 6: Bug Fixes selama Migrasi

### Portait Video Render Fix
| # | Masalah | Penyebab | Solusi |
|---|---------|----------|--------|
| 11 | Video portrait 2.7K jadi 608x1080 | `downscale_to_1080p()` hardcode `scale=1920:1080` untuk semua orientasi | Auto-detect orientasi: portrait → `scale=1080:1920` |
| 12 | `render_final_video()` portrait salah | `scale_h=target_max` untuk portrait (harusnya `scale_w=target_max`) | Fix: portrait → `scale_w=target_short, scale_h=-2` |

### Batch Render & Queue
| # | Masalah | Penyebab | Solusi |
|---|---------|----------|--------|
| 13 | 2 video diproses bersamaan | 9 Celery worker jalan bersamaan (restart tidak kill old worker) | `pkill -f celery` di start-all.sh sebelum start baru |
| 14 | Batch render berhenti setelah video pertama | Guard 409 Conflict menolak request berikutnya | Ganti jadi auto-queue WAITING |

### Path Configuration
| # | Masalah | Penyebab | Solusi |
|---|---------|----------|--------|
| 15 | "Gagal mengambil data folder" di server | 15+ file hardcode path ke `/home/kangdemuh/...` | Module `paths.py` terpusat, resolve dari `APP_HOME` env var |

---

## 📋 Command Penting

### Server Management
```bash
# SSH
ssh kangdemuh@103.59.94.188

# Git update + rebuild
cd /home/kangdemuh/vidflow-studio
sudo chown -R kangdemuh:kangdemuh .
git pull origin main
sudo docker compose down
sudo docker compose up -d --build

# Cek status
sudo docker compose ps
sudo docker compose logs -f backend
sudo docker compose logs -f celery

# Restart satu service
sudo docker compose restart backend
sudo docker compose restart celery
sudo docker compose restart nginx

# SSL renew (otomatis via cron, manual jika perlu)
sudo certbot renew
sudo cp /etc/letsencrypt/live/app.muhirastore.com/fullchain.pem /home/kangdemuh/vidflow-studio/ssl/
sudo cp /etc/letsencrypt/live/app.muhirastore.com/privkey.pem /home/kangdemuh/vidflow-studio/ssl/
sudo docker compose restart nginx
```

### Lokal Development
```bash
# Start semua service
./start-all.sh

# Stop semua service
./stop-all.sh

# Push ke GitHub (auto-deploy belum di-setup, manual pull di server)
git add -A
git commit -m "feat: ..."
git push origin main
```

---

## 🏗️ Arsitektur Final

```
Internet (app.muhirastore.com)
    │
    ▼
Nginx (:443 HTTPS, :80 redirect)
    │
    ├─ /* (static) ───────── React Frontend (build)
    │
    └─ /api/* ────────────── FastAPI Backend (:8000)
                                │
                                ├── PostgreSQL (:5432)
                                ├── Redis (:6379)
                                └── Celery Worker (concurrency=1)
```

---

## 🔑 Kredensial (DISENSOR)

| Komponen | Username | Password |
|----------|----------|----------|
| Dashboard Login | `admin` | `***********` |
| VPS SSH | `kangdemuh` | `***********` |
| PostgreSQL | `postgres` | `***********` |
| OpenAI API | — | `sk-...********...` |
| DeepSeek API | — | `sk-...********...` |
| GitHub Token | — | `ghp_...********...` |

> ⚠️ **Kredensial asli TIDAK dicatat di file ini.** Simpan di password manager.

---

## 📊 Biaya Operasional

| Komponen | Estimasi/Bulan |
|----------|---------------|
| VPS IDCloudHost (2 vCPU, 4GB) | ~Rp 150.000 |
| Domain `.com` (tahunan, dibagi 12) | ~Rp 12.500 |
| OpenAI Whisper (~10 video/hari) | ~$9 (~Rp 145.000) |
| DeepSeek V4 Flash | ~$1 (~Rp 16.000) |
| **Total** | **~Rp 323.500/bulan** |

---

## ⚠️ Yang Belum / To-Do

- [ ] Auto-deploy via GitHub Actions (saat ini manual pull + rebuild)
- [ ] Backup database otomatis ke cloud storage
- [ ] Monitoring (Uptime Kuma)
- [ ] Log rotation (Docker logging config)
- [ ] CDN untuk file output (opsional)

---

> 📅 Dokumen dibuat: 24 Juni 2026  
> 🔗 Repo: https://github.com/Muhira007/vidflow-studio  
> 🌐 Production: https://app.muhirastore.com
