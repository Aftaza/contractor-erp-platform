#!/bin/sh
# deploy/backup/restore.sh — Fase 4 WP-51 (master §10: "backup yang belum
# pernah di-restore bukan backup").
#
# Pemakaian:
#   sh restore.sh <file.dump> <target-database-url>
#
# Contoh uji restore (DoD WP-51 butir 4) — database SCRATCH, bukan produksi:
#   sh restore.sh /backups/acme-20260802T031500Z.dump \
#      postgresql://postgres:PASSWORD@localhost:5432/acme_restore_test
#
# WAJIB LF, bukan CRLF.
set -eu

DUMP_FILE="${1:?Argumen 1 wajib: path file .dump}"
TARGET_URL="${2:?Argumen 2 wajib: DATABASE_URL tujuan}"

[ -f "$DUMP_FILE" ] || { echo "File dump tak ditemukan: $DUMP_FILE" >&2; exit 1; }

# Penjaga sengaja: menolak restore ke database bernama "acme" polos. Restore
# adalah operasi yang MENIMPA; satu salah ketik URL saat panik menghapus
# produksi. Untuk sungguh-sungguh me-restore produksi, set FORCE=1 secara
# sadar.
case "$TARGET_URL" in
	*/acme|*/acme\?*)
		if [ "${FORCE:-0}" != "1" ]; then
			echo "Menolak restore ke database produksi 'acme' tanpa FORCE=1." >&2
			exit 1
		fi
		;;
esac

# --clean --if-exists: buang objek lama dulu, tak rewel kalau belum ada.
# --no-owner/--no-privileges: cocok dengan cara backup.sh membuat dump.
# --exit-on-error: JANGAN diamkan error di tengah restore — restore setengah
# jadi yang dilaporkan sukses persis jenis kegagalan yang membuat backup tak
# berguna saat akhirnya dibutuhkan.
# Pangkas query string bergaya Prisma (`?schema=public`) — libpq menolaknya
# dengan "invalid URI query parameter: schema". Lihat catatan sama di
# backup.sh. Penjaga anti-produksi di atas sengaja menguji URL ASLI, sebelum
# pemangkasan, supaya bentuk `.../acme?schema=public` tetap tertangkap.
pg_restore --clean --if-exists --no-owner --no-privileges --exit-on-error \
	--dbname="${TARGET_URL%%\?*}" "$DUMP_FILE"

# Password DISAMARKAN. `$TARGET_URL` memuat kredensial database; mencetaknya
# utuh menaruh password plaintext di log container — persis yang dilarang
# master §10. Yang berguna bagi operator cuma nama databasenya.
echo "restore selesai: $DUMP_FILE -> $(echo "$TARGET_URL" | sed 's|//[^@]*@|//<redacted>@|')"
echo "Verifikasi sendiri jumlah barisnya — restore yang tak dihitung barisnya belum terbukti."
