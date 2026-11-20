# Deploy — Acme ERP

> **Target produksi/staging (W4-02):** `compose.prod.yml` (project `acme`: db, api, proxy, backup, cloudflared; tanpa `site`, tanpa port publik, image GHCR) dan `compose.staging.yml` (project `acme-staging`, ENV-2). Caddy produksi = `Caddyfile.prod` (+ `common.caddy`). Role DB `acme_app` (DML) / `acme_migrate` (DDL) dibuat `db/init-roles.sh` saat volume DB pertama kali dibuat (idempoten; re-run: `docker compose -f deploy/compose.prod.yml exec db sh /docker-entrypoint-initdb.d/init-roles.sh`).
>
> ```sh
> set -a; . ./.env; set +a   # password migrasi lewat env, bukan argumen (tak muncul di `ps`)
> docker compose -f deploy/compose.prod.yml pull
> DATABASE_URL="$MIGRATE_DATABASE_URL" docker compose -f deploy/compose.prod.yml run --rm -e DATABASE_URL api npx prisma migrate deploy
> # WAJIB setelah migrate: hak acme_app pada audit_logs/_prisma_migrations dicabut lagi (tabel baru mewarisi default privileges)
> docker compose -f deploy/compose.prod.yml exec db sh /docker-entrypoint-initdb.d/init-roles.sh
> docker compose -f deploy/compose.prod.yml up -d
> ```
>
> Password DB harus URL-safe (`openssl rand -hex 24`) karena masuk `DATABASE_URL`. Staging WAJIB memakai secret/password berbeda dari produksi (`.env.staging`).
>
> Env wajib: lihat `.env.example` bagian "Produksi". Staging memakai `.env.staging` dan menuntut produksi menyala (jaringan `acme_edge`). Isi `deploy.sh`/CI = W4-04; runbook VPS = W4-05. Sisa dokumen ini = stack **dev** (`docker-compose.yml`).


Runbook untuk menjalankan seluruh stack di satu VPS. 

Lima service, **hanya `proxy` yang terekspos keluar** (ERP = file statis yang dibake ke image `proxy`):

```
proxy (Caddy, 80/443)  →  ERP  (SPA statis /srv/erp, /api/* → api)
                       →  site (Astro    :4321)
                       →  api  (NestJS   :3001)  →  db (Postgres 16)
                                                        ↑
                                                   backup (pg_dump harian)
```

`site` dan `api` **tidak** publish port. Kredensial database hanya dipegang `api` dan `backup`.

---

## Prasyarat go-live — belum otomatis, jangan dilewati

- [ ] **Enkripsi at-rest volume DB** (LUKS/dm-crypt di host). Master §10 menuntutnya; ini konfigurasi host, bukan repo, jadi tak ada kode yang bisa memaksakannya. Volume `db_data` berisi seluruh data perusahaan dalam bentuk polos tanpa ini. **Langkahnya di §0 di bawah — kerjakan SEBELUM `compose up` pertama.**
- [ ] **Rahasia di-generate baru** di VPS — jangan pakai ulang nilai dari mesin dev. `.env` tak pernah di-commit.
- [ ] **Firewall**: buka 80/443 saja. Port `8080` (smoke test) tak boleh terjangkau dari internet.
- [ ] **Akun pimpinan pertama** dibuat lewat seed terkontrol, `must_change_password=true` — bukan password default di dokumen.

---

## 0. Enkripsi at-rest volume database (utang N)

**Dikerjakan sekali, di host VPS, sebelum stack pertama kali naik.** Kalau `compose up` sudah pernah jalan, `db_data` sudah berisi data polos — hentikan stack, backup, kerjakan langkah ini, lalu restore.

Kenapa tak bisa diselesaikan repo: enkripsi disk adalah properti *device*, bukan properti container. Podman/Docker menaruh volume di filesystem host apa adanya; satu-satunya cara membuatnya terenkripsi adalah menaruh direktori volume di atas blok device yang terenkripsi.

**Pilih satu dari dua jalur.** Jalur A kalau VPS masih kosong dan Anda bisa memilih layout disk; jalur B kalau sistem sudah terpasang dan hanya perlu satu volume terenkripsi.

### A. Enkripsi seluruh disk saat instalasi OS (paling sederhana, paling aman)

Di installer Debian/Ubuntu pilih **"Guided — use entire disk and set up encrypted LVM"**. Seluruh root, swap, dan direktori volume container ikut terenkripsi. Tak ada langkah lanjutan di dokumen ini.

Konsekuensi yang harus disadari: **setiap reboot menuntut passphrase diketik di konsol.** Untuk VPS tanpa akses konsol fisik, siapkan salah satu — akses KVM/VNC dari panel penyedia, atau `dropbear-initramfs` supaya passphrase bisa dikirim lewat SSH saat boot. Tanpa itu, reboot berarti server tidak pernah kembali online.

### B. Satu volume LUKS khusus untuk data container

```sh
# 1. Siapkan device. Pilih SATU: partisi/disk kedua sungguhan (ideal), atau
#    file-backed loop device kalau penyedia tak memberi disk tambahan.
#    Ganti /dev/sdb dengan device Anda — PERIKSA DULU dengan `lsblk`,
#    cryptsetup luksFormat MENGHAPUS ISI DEVICE.
lsblk

# --- opsi B1: disk/partisi sungguhan ---
sudo cryptsetup luksFormat --type luks2 /dev/sdb

# --- opsi B2: file-backed (kalau tak ada disk kedua). Ukuran disesuaikan. ---
sudo fallocate -l 50G /var/lib/acme-crypt.img
sudo chmod 600 /var/lib/acme-crypt.img
sudo cryptsetup luksFormat --type luks2 /var/lib/acme-crypt.img

# 2. Buka dan format. Nama "acmedata" akan muncul di /dev/mapper/acmedata.
sudo cryptsetup open /dev/sdb acmedata          # atau: ... open /var/lib/acme-crypt.img acmedata
sudo mkfs.ext4 /dev/mapper/acmedata

# 3. Mount ke direktori penyimpanan volume container.
#    Podman rootful: /var/lib/containers/storage/volumes
#    Docker:         /var/lib/docker/volumes
sudo systemctl stop podman.socket 2>/dev/null || true
sudo mkdir -p /mnt/acmedata
sudo mount /dev/mapper/acmedata /mnt/acmedata
```

**Pindahkan penyimpanan volume ke atas device itu.** Jangan symlink direktori volume — beberapa versi podman menolaknya. Yang benar: pindahkan isinya lalu bind-mount.

```sh
sudo rsync -aHAX /var/lib/containers/storage/volumes/ /mnt/acmedata/volumes/
sudo mv /var/lib/containers/storage/volumes /var/lib/containers/storage/volumes.bak
sudo mkdir /var/lib/containers/storage/volumes
sudo mount --bind /mnt/acmedata/volumes /var/lib/containers/storage/volumes
```

**Buat persisten lintas reboot** — `/etc/crypttab` lalu `/etc/fstab`:

```
# /etc/crypttab
acmedata  UUID=<uuid-device-luks>  none  luks
```

```
# /etc/fstab
/dev/mapper/acmedata  /mnt/acmedata                                ext4  defaults  0 2
/mnt/acmedata/volumes /var/lib/containers/storage/volumes          none  bind      0 0
```

UUID-nya: `sudo blkid /dev/sdb`. `none` di kolom ketiga berarti passphrase diminta saat boot. Kalau unattended reboot wajib, ganti dengan file kunci di root filesystem — **tapi sadari itu menurunkan jaminannya**: pencuri yang membawa seluruh disk mendapat kunci sekaligus data. Itu hanya melindungi dari disk data yang dicabut sendirian.

### Verifikasi — jangan percaya sebelum diukur

```sh
# 1. device benar-benar LUKS
sudo cryptsetup isLuks /dev/sdb && echo "LUKS OK"

# 2. direktori volume benar-benar di atas /dev/mapper/acmedata, bukan root fs
findmnt -no SOURCE --target /var/lib/containers/storage/volumes
#   harus: /dev/mapper/acmedata

# 3. bukti terakhir — reboot, lalu pastikan stack TIDAK naik sendiri sebelum
#    volume dibuka. Kalau `podman ps` menunjukkan db healthy padahal
#    passphrase belum pernah diketik, berarti ia menulis ke direktori LAIN.
sudo reboot
```

Butir 3 itu satu-satunya yang benar-benar membuktikan. `db` yang naik tanpa passphrase artinya bind-mount gagal dan podman diam-diam membuat ulang direktori volume kosong di disk polos — data lama tak hilang, tapi yang baru mendarat di tempat yang tak terenkripsi.

Sesudah reboot pertama yang sukses, hapus salinan lama: `sudo rm -rf /var/lib/containers/storage/volumes.bak`.

**Backup ikut terkena.** Volume `backup_data` berisi dump `pg_dump` — isi database yang sama, dalam bentuk polos. Ia ikut terlindungi hanya kalau berada di penyimpanan volume yang sama. Kalau dump disalin keluar VPS (dan itu memang seharusnya), salinan luar wajib dienkripsi sendiri, mis. `age` atau `gpg -c`, sebelum meninggalkan mesin.

---

## 1. Siapkan environment

```sh
cp .env.example .env
# generate rahasia baru, satu per satu:
openssl rand -base64 24   # POSTGRES_PASSWORD
openssl rand -base64 32   # JWT_ACCESS_SECRET
openssl rand -base64 32   # JWT_REFRESH_SECRET
# isi WEB_DOMAIN / SITE_DOMAIN / API_DOMAIN dengan domain sungguhan,
# dan ACME_EMAIL supaya Caddy bisa mengambil sertifikat Let's Encrypt.
```

`POSTGRES_PASSWORD`, `JWT_ACCESS_SECRET`, dan `JWT_REFRESH_SECRET` **wajib** — compose menolak jalan (`:?`) kalau kosong. Itu disengaja: stack yang boot dengan password kosong jauh lebih buruk daripada stack yang menolak boot.

Validasi sebelum menyalakan apa pun:

```sh
podman compose config     # harus exit 0 dan menampilkan 6 service
```

## 2. Nyalakan

```sh
podman compose build       # konteks root; image proxy membangun ERP statis sendiri
podman compose up -d
podman compose ps          # semua healthy?
podman compose logs -f api # migrate deploy jalan di sini
```

Image `api` TIDAK migrasi saat start; di compose dev `command` menjalankan `npx prisma migrate deploy && node dist/main`. Produksi: `docker run --rm <image> npx prisma migrate deploy` sebagai langkah deploy. Edit `Caddyfile` butuh `compose build proxy`. `depends_on` + healthcheck menjamin urutan `db` sehat → `api` sehat → `site` → `proxy`.

## 3. Akun pimpinan pertama

**Tidak bisa lewat `compose exec api`.** Image runtime dibangun `npm ci --omit=dev`, jadi `ts-node` tak ada di sana dan `prisma db seed` gagal `spawn ts-node ENOENT`. Itu benar — devDependencies memang tak pantas ikut ke production. Seed dijalankan dari image tahap `build` (punya source + devDependencies), sekali, lalu dibuang:

```sh
# tahap `build` sudah ter-cache dari build sebelumnya — ini cepat
podman build --target build -f apps/api/Dockerfile -t acme-api:seed .

# jalankan di network compose supaya host `db` terjangkau
PW=$(grep '^POSTGRES_PASSWORD=' .env | cut -d= -f2-)
podman run --rm --network acme-management_default \
  -e DATABASE_URL="postgresql://postgres:$PW@db:5432/acme?schema=public" \
  -e SEED_PIMPINAN_EMAIL='nama@perusahaan.co.id' \
  -e SEED_PIMPINAN_PASSWORD='<password kuat, min 12 karakter>' \
  -e SEED_PIMPINAN_NAME='Nama Pimpinan' \
  acme-api:seed npx prisma db seed
```

Seed menolak jalan tanpa env di atas dan menolak password < 12 karakter. Akun dibuat dengan `must_change_password=true`. Hapus image `acme-api:seed` setelah selesai — ia memuat seluruh source dan devDependencies.

---

## Backup & restore

Service `backup` menjalankan `backup.sh` sekali sehari ke volume `backup_data`, retensi `BACKUP_RETENTION_DAYS` (default 7).

**Backup manual:**

```sh
podman compose exec backup sh /scripts/backup.sh
podman compose exec backup ls -lh /backups
```

**Uji restore — lakukan berkala, bukan sekali saat setup.** Master §10: backup yang belum pernah di-restore bukan backup.

```sh
# 1. database scratch
podman compose exec db psql -U postgres -c 'CREATE DATABASE acme_restore_test'

# 2. restore dump terbaru ke sana (BUKAN ke database produksi)
podman compose exec backup sh -c '
  DUMP=$(ls -1t /backups/acme-*.dump | head -1)
  sh /scripts/restore.sh "$DUMP" postgresql://postgres:$POSTGRES_PASSWORD@db:5432/acme_restore_test'

# 3. bandingkan jumlah baris — inilah buktinya, bukan pesan "restore selesai"
for t in users projects rab_nodes; do
  echo -n "$t produksi: "; podman compose exec -T db psql -U postgres -d acme -tAc "SELECT count(*) FROM \"$t\""
  echo -n "$t restore : "; podman compose exec -T db psql -U postgres -d acme_restore_test -tAc "SELECT count(*) FROM \"$t\""
done

# 4. bersihkan
podman compose exec db psql -U postgres -c 'DROP DATABASE acme_restore_test'
```

`restore.sh` **menolak** menulis ke database bernama `acme` kecuali `FORCE=1` di-set sadar-sadar — penjaga terhadap salah ketik URL saat panik.

---

## Smoke test tanpa domain (mesin dev)

Blok `:8080` di `Caddyfile` menghadap `api` lewat HTTP polos, jadi header keamanan bisa diperiksa tanpa TLS/ACME:

```sh
podman compose up -d db api proxy
curl -sI http://localhost:8080/health
# harus 200 + Strict-Transport-Security, Content-Security-Policy,
# X-Content-Type-Options, Referrer-Policy
podman compose down
```

---

## Troubleshooting

| Gejala | Sebab yang sudah terbukti |
|---|---|
| `bad interpreter: /bin/sh^M` | Skrip `.sh` ter-checkout dengan CRLF. Periksa `git config core.autocrlf` dan `.gitattributes`; file di `deploy/` wajib LF. |
| `podman compose config` exit 1, "required variable ... is missing" | `.env` belum dibuat. `cp .env.example .env` lalu isi rahasianya. |
| `api` restart terus | Baca `podman compose logs api`. Env kurang/invalid membuat proses mati **sebelum** listen (fail-fast, `src/config/env.validation.ts`) — itu perilaku yang benar, bukan bug. |
| Caddy gagal ambil sertifikat | Domain di `.env` belum menunjuk ke IP VPS, atau port 80 tertutup firewall (ACME butuh 80). |
| Gambar upload 404 di situs | `PUBLIC_UPLOADS_ORIGIN` masih menunjuk `localhost:8080`. Ia harus domain yang dijangkau **browser pengunjung**, bukan nama service internal. |
