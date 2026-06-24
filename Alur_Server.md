# 🌐 Fase 6 — Migrasi Vidflow Studio ke Server Online

Dokumen ini menjelaskan alur dan gambaran migrasi Vidflow Studio dari **lokal (WSL laptop)** ke **server online** yang bisa diakses dari mana saja via internet.

---

## 📍 Posisi Saat Ini vs Target

```mermaid
graph LR
    subgraph "Saat Ini: Lokal WSL"
        A1[💻 Laptop Admin] -->|localhost only| B1[PostgreSQL]
        A1 -->|localhost only| C1[Redis]
        A1 -->|localhost only| D1[FastAPI :8000]
        A1 -->|localhost only| E1[Celery Worker]
        A1 -->|localhost only| F1[Vite :5173]
    end

    subgraph "Target: Server Online"
        A2[🌍 Internet] -->|HTTPS| B2[Nginx Reverse Proxy]
        B2 -->|/api/*| C2[FastAPI Container]
        B2 -->|static files| D2[React Frontend]
        C2 --> E2[PostgreSQL Container]
        C2 --> F2[Redis Container]
        C2 --> G2[Celery Worker Container]
    end

    style A1 fill:#ff6b6b,color:#fff
    style A2 fill:#51cf66,color:#fff
```

| | Saat Ini | Target |
|---|---|---|
| **Akses** | `localhost` dari laptop sendiri | Domain publik, dari mana saja |
| **Services** | Native WSL (manual start) | Docker containers (docker compose up) |
| **Frontend** | Vite dev server :5173 | Build static + Nginx |
| **Keamanan** | None (localhost) | HTTPS + Auth + Rate limiting |
| **Startup** | `./start-all.sh` | `docker compose up -d` |

---

## 🗺️ Alur Migrasi (7 Langkah)

```mermaid
graph TD
    S0[▶ MULAI] --> S1

    S1["🖥️ Step 1: Pilih & Setup VPS"]
    S1 -->|VPS siap, OS terinstall| S2

    S2["🐳 Step 2: Dockerize Semua Service"]
    S2 -->|docker-compose.yml + Dockerfiles siap| S3

    S3["🌐 Step 3: Domain & HTTPS"]
    S3 -->|Domain terpoint + HTTPS aktif| S4

    S4["📦 Step 4: Migrasi Data"]
    S4 -->|Database + file source/output pindah| S5

    S5["🔐 Step 5: Keamanan"]
    S5 -->|Auth + rate limiting + firewall| S6

    S6["🚀 Step 6: Deploy & CI/CD"]
    S6 -->|App live di server, auto-deploy| S7

    S7["📊 Step 7: Monitoring"]
    S7 -->|Health check + logs + backup| DONE

    DONE[✅ PRODUKSI]

    style S0 fill:#868e96,color:#fff
    style DONE fill:#51cf66,color:#fff
    style S1 fill:#339af0,color:#fff
    style S2 fill:#339af0,color:#fff
    style S3 fill:#339af0,color:#fff
    style S4 fill:#339af0,color:#fff
    style S5 fill:#339af0,color:#fff
    style S6 fill:#339af0,color:#fff
    style S7 fill:#339af0,color:#fff
```

---

### 🖥️ Step 1: Pilih & Setup VPS

Kamu butuh **VPS Linux Ubuntu 22.04/24.04**. Spesifikasi minimum: **2 vCPU, 4GB RAM** (FFmpeg + PyTorch VAD butuh RAM).

| Provider | Harga/Bulan | Spesifikasi | Cocok Untuk |
|----------|-------------|-------------|-------------|
| **Hetzner CX22** | ~€5 (85rb) | 2 vCPU, 4GB, 40GB SSD | Volume rendah, paling hemat |
| **DigitalOcean** | ~$12 (200rb) | 2 vCPU, 4GB, 80GB SSD | Stabil, banyak tutorial |
| **Rumahweb VPS** | ~150rb | 2 vCPU, 4GB, 50GB SSD | Lokal Indonesia, latency rendah |
| **Niagahoster** | ~200rb | 2 vCPU, 4GB, 60GB SSD | Lokal Indonesia, support bahasa |

**Setup awal setelah VPS aktif:**
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com | sudo bash
sudo usermod -aG docker $USER

# Install Docker Compose
sudo apt install docker-compose-plugin -y

# Install Git
sudo apt install git -y
```

---

### 🐳 Step 2: Dockerize Semua Service

Saat ini app jalan native di WSL. Untuk server, semua dibungkus Docker.

```mermaid
graph TB
    subgraph "docker-compose.yml"
        direction TB
        NGINX["🌐 Nginx<br/>Reverse Proxy<br/>Port 80/443"]
        BACKEND["⚙️ FastAPI Backend<br/>Port 8000 (internal)"]
        CELERY["📦 Celery Worker<br/>Pipeline async"]
        POSTGRES["🗄️ PostgreSQL<br/>Port 5432 (internal)"]
        REDIS["🔴 Redis<br/>Port 6379 (internal)"]
    end

    INTERNET["🌍 Internet"] -->|HTTPS| NGINX
    NGINX -->|/api/*| BACKEND
    NGINX -->|"/* (static)"| FRONTEND["📁 React Build<br/>Served by Nginx"]
    BACKEND --> POSTGRES
    BACKEND --> REDIS
    CELERY --> REDIS
    CELERY --> POSTGRES

    style NGINX fill:#7950f2,color:#fff
    style BACKEND fill:#339af0,color:#fff
    style CELERY fill:#f76707,color:#fff
    style POSTGRES fill:#5c940d,color:#fff
    style REDIS fill:#e03131,color:#fff
    style FRONTEND fill:#1098ad,color:#fff
```

**Struktur file Docker yang perlu dibuat:**

```
vidflow-studio/
├── docker-compose.yml          ← orkestrasi semua container
├── docker/
│   ├── Dockerfile.backend      ← FastAPI
│   ├── Dockerfile.celery       ← Celery Worker
│   └── nginx/
│       ├── Dockerfile          ← Nginx + React build
│       ├── nginx.conf          ← Konfigurasi reverse proxy
│       └── default.conf
├── .env.production             ← Variabel environment server
└── scripts/
    └── deploy.sh               ← Script deploy otomatis
```

**Perbedaan `.env` lokal vs production:**

| Variabel | Lokal | Production |
|----------|-------|------------|
| `DATABASE_URL` | `localhost:5432/vidflow_studio` | `postgres://user:pass@postgres:5432/vidflow_studio` |
| `REDIS_URL` | `localhost:6379/0` | `redis://redis:6379/0` |
| `CELERY_BROKER_URL` | `localhost:6379/0` | `redis://redis:6379/0` |
| `OPENAI_API_KEY` | `sk-...` | `sk-...` (sama) |
| `DEEPSEEK_API_KEY` | `sk-...` | `sk-...` (sama) |
| `CORS_ORIGINS` | `localhost:5173` | `https://vidflow.studio` |

---

### 🌐 Step 3: Domain & HTTPS

1. **Beli domain** — opsi:
   - `.my.id` — murah (~15rb/tahun) via Rumahweb/IDCloudHost
   - `.com` / `.studio` — profesional (~150rb/tahun)

2. **Point DNS ke VPS:**
   ```
   A Record:  vidflow.studio  →  <IP VPS>
   CNAME:     www             →  vidflow.studio
   ```

3. **Setup Nginx + Let's Encrypt SSL:**
   ```bash
   sudo apt install certbot python3-certbot-nginx -y
   sudo certbot --nginx -d vidflow.studio -d www.vidflow.studio
   ```

---

### 📦 Step 4: Migrasi Data

```mermaid
graph LR
    A["💻 Laptop<br/>(PostgreSQL lokal)"] -->|pg_dump + pg_restore| B["🗄️ Server<br/>(PostgreSQL container)"]
    C["📁 Folder source/"] -->|rsync / SCP| D["📁 Server source/"]
    E["📁 Folder output/"] -->|rsync / SCP| F["📁 Server output/"]

    style A fill:#ff6b6b,color:#fff
    style B fill:#51cf66,color:#fff
```

**Export database lokal:**
```bash
pg_dump -h localhost -U postgres vidflow_studio > backup.sql
```

**Transfer ke server:**
```bash
rsync -avz backup.sql user@server:/home/user/
rsync -avz source/ user@server:/home/user/vidflow-studio/source/
rsync -avz output/ user@server:/home/user/vidflow-studio/output/
```

**Import di server:**
```bash
docker compose exec postgres psql -U postgres -c "CREATE DATABASE vidflow_studio;"
docker compose exec -T postgres psql -U postgres vidflow_studio < backup.sql
```

---

### 🔐 Step 5: Keamanan

| Lapisan | Implementasi | Keterangan |
|---------|-------------|------------|
| **Auth Dashboard** | Username + Password + JWT | ⚠️ Fitur baru, belum ada di MVP. Perlu dibuat. |
| **HTTPS** | Let's Encrypt + Nginx | Redirect semua HTTP → HTTPS |
| **Rate Limiting** | Nginx `limit_req` atau FastAPI middleware | Cegah brute-force login |
| **Firewall** | `ufw allow 22/tcp && ufw allow 80/tcp && ufw allow 443/tcp && ufw enable` | Hanya port yang dibutuhkan |
| **API Keys** | Environment variable container | Jangan pernah hardcode di kode |
| **Backup DB** | Cron job harian | `pg_dump` + upload ke cloud storage |
| **SSH Security** | SSH key only (no password), port non-default (opsional) | Cegah brute-force SSH |

---

### 🚀 Step 6: Deploy & CI/CD

**Cara simpel (manual via SSH):**
```bash
ssh user@server
cd /home/user/vidflow-studio
git pull origin main
docker compose up -d --build
docker compose ps   # cek semua running
```

**Cara otomatis (GitHub Actions):**

```mermaid
graph LR
    A["📤 Push ke main"] --> B["⚙️ GitHub Actions"]
    B --> C["SSH ke server"]
    C --> D["git pull"]
    D --> E["docker compose up -d --build"]
    E --> F["✅ Deploy sukses"]

    style A fill:#868e96,color:#fff
    style F fill:#51cf66,color:#fff
```

File `.github/workflows/deploy.yml` akan handle auto-deploy setiap push ke `main`.

---

### 📊 Step 7: Monitoring

```mermaid
graph TB
    subgraph "Monitoring Setup"
        A["📋 docker compose ps<br/>Status container"] 
        B["📜 docker compose logs -f<br/>Logs real-time"]
        C["❤️ /api/health<br/>Health check endpoint"]
        D["🟢 Uptime Kuma<br/>Notifikasi jika down"]
        E["💾 Cron: pg_dump<br/>Backup harian"]
    end

    style A fill:#339af0,color:#fff
    style B fill:#339af0,color:#fff
    style C fill:#339af0,color:#fff
    style D fill:#f76707,color:#fff
    style E fill:#5c940d,color:#fff
```

**Rekomendasi tool monitoring:**
- **[Uptime Kuma](https://github.com/louislam/uptime-kuma)** — self-hosted, ringan, notifikasi Telegram/Email
- **Health check endpoint** — `/api/health` return status DB + Redis + Celery
- **Log rotation** — Docker `logging` config agar log tidak memenuhi disk

---

## 🏗️ Arsitektur Final (Production)

```mermaid
graph TB
    INTERNET["🌍 Internet<br/>https://vidflow.studio"]

    subgraph "VPS Server"
        NGINX["🔀 Nginx<br/>:80, :443<br/>Reverse Proxy + Static Files"]

        subgraph "Docker Network"
            BACKEND["⚙️ FastAPI<br/>:8000"]
            CELERY["📦 Celery Worker<br/>(concurrency=1)"]
            POSTGRES["🗄️ PostgreSQL<br/>:5432"]
            REDIS["🔴 Redis<br/>:6379"]
        end

        STORAGE["📁 Volume Mounts<br/>source/ output/ logs/"]
    end

    INTERNET -->|HTTPS| NGINX
    NGINX -->|"/api/*"| BACKEND
    NGINX -->|"/*"| NGINX
    BACKEND --> POSTGRES
    BACKEND --> REDIS
    BACKEND --> STORAGE
    CELERY --> REDIS
    CELERY --> POSTGRES
    CELERY --> STORAGE

    style INTERNET fill:#868e96,color:#fff
    style NGINX fill:#7950f2,color:#fff
    style BACKEND fill:#339af0,color:#fff
    style CELERY fill:#f76707,color:#fff
    style POSTGRES fill:#5c940d,color:#fff
    style REDIS fill:#e03131,color:#fff
    style STORAGE fill:#1098ad,color:#fff
```

---

## 📊 Estimasi Waktu & Biaya

| Step | Item | Estimasi Waktu | Biaya |
|------|------|---------------|-------|
| 1 | Pilih & beli VPS | 1 jam | ~100–300rb/bln |
| 2 | Dockerize semua service | 1–2 hari | — |
| 3 | Domain + setup HTTPS | 2–3 jam | ~15–150rb/thn |
| 4 | Migrasi data | 1–2 jam | — |
| 5 | Keamanan (auth, firewall) | 1–2 hari | — |
| 6 | CI/CD (GitHub Actions) | 2–3 jam | Gratis |
| 7 | Monitoring + backup | 2–3 jam | — |
| **Total** | | **~1 minggu** | **~100–300rb/bln** |

### Biaya Operasional Bulanan

| Komponen | Estimasi |
|----------|----------|
| VPS (2 vCPU, 4GB) | ~100–300rb |
| Domain | ~1.250–12.500rb (tahunan, dibagi 12) |
| OpenAI Whisper (~10 video/hari) | ~$9 (~145rb) |
| DeepSeek V4 Flash | ~$1 (~16rb) |
| **Total** | **~260–470rb/bulan** |

---

## ⚠️ Yang Perlu Diputuskan Sebelum Mulai

| # | Pertanyaan | Status |
|---|-----------|--------|
| 1 | **Provider VPS** — Lokal (Rumahweb/Niagahoster) atau luar (Hetzner/DO)? | ❓ Belum diputuskan |
| 2 | **Domain** — Sudah punya? Nama domain apa? | ❓ Belum diputuskan |
| 3 | **Auth Dashboard** — Cukup single admin, atau nanti multi-user? | ❓ Belum diputuskan |
| 4 | **Timing** — Kapan mau mulai? Ada urgency? | ❓ Belum diputuskan |

---

## 📝 Checklist Pra-Migrasi

Sebelum mulai Fase 6, pastikan ini sudah beres:

- [ ] Semua perubahan lokal sudah di-push ke GitHub
- [ ] `backend/.env` sudah bersih (tidak ada hardcode credential selain API keys)
- [ ] Database lokal berfungsi normal, tidak ada error
- [ ] Pipeline end-to-end sudah teruji (`test_pipeline.py`)
- [ ] Punya akses ke semua API key (OpenAI, DeepSeek)
- [ ] Sudah pilih VPS + domain
- [ ] Budget untuk biaya bulanan sudah dihitung

---

> 📅 Dokumen dibuat: 24 Juni 2026
> 🔗 Repo: https://github.com/Muhira007/vidflow-studio
