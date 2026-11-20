#!/bin/sh
# deploy/backup/backup.sh — Fase 4 WP-51 (master §10 "Backup terjadwal + uji restore").
#
# Dijalankan service `backup` di docker-compose.yml (loop harian). Bisa juga
# dipanggil manual:
#   podman compose exec backup sh /scripts/backup.sh
#
# WAJIB LF, bukan CRLF — skrip ber-CRLF gagal di container Linux dengan pesan
# "bad interpreter: /bin/sh^M" yang tak menyebut CRLF sama sekali.
set -eu

: "${DATABASE_URL:?DATABASE_URL wajib di-set}"
BACKUP_DIR="${BACKUP_DIR:-/backups}"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-7}"

# Seluruh proyek memakai URL bergaya Prisma: `postgresql://...@db:5432/acme?schema=public`.
# libpq (yang dipakai pg_dump/pg_restore) TIDAK mengenal parameter `schema` dan
# menolaknya mentah-mentah: "invalid URI query parameter: schema". Dipangkas di
# sini — bukan di pemanggil — supaya skrip ini aman menerima bentuk URL yang
# memang beredar di repo ini.
DB_URL="${DATABASE_URL%%\?*}"

mkdir -p "$BACKUP_DIR"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
TARGET="$BACKUP_DIR/acme-$STAMP.dump"

# `set -e` membuat skrip keluar seketika saat pg_dump gagal — tanpa trap ini,
# tiap kegagalan meninggalkan .dump.tmp 0-byte yang menumpuk selamanya.
# Dijalankan pada EXIT apa pun; `mv` yang sukses membuat file ini sudah tak
# ada, jadi `rm -f` tak melakukan apa-apa di jalur normal.
trap 'rm -f "$TARGET.tmp"' EXIT
rm -f "$BACKUP_DIR"/acme-*.dump.tmp

# Format custom (-Fc): bisa di-restore selektif dan sudah terkompresi.
# --no-owner/--no-privileges: dump bisa di-restore ke role berbeda tanpa
# menuntut role produksi ada di mesin tujuan — ini yang membuat uji restore
# ke database scratch mungkin sama sekali.
#
# Tulis ke .tmp lalu rename: rename di filesystem yang sama bersifat atomik,
# jadi tak pernah ada file .dump setengah jadi yang dikira backup sah kalau
# proses mati di tengah dump.
pg_dump --format=custom --no-owner --no-privileges \
	--dbname="$DB_URL" --file="$TARGET.tmp"
mv "$TARGET.tmp" "$TARGET"

echo "backup: $TARGET ($(wc -c < "$TARGET") bytes)"

# Retensi. -mtime +N = lebih tua dari N hari.
find "$BACKUP_DIR" -maxdepth 1 -type f -name 'acme-*.dump' \
	-mtime "+$RETENTION_DAYS" -print -delete
