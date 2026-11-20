-- W1-05 (R-001, SRS FR-FIN-3, REL-8): data pembelian lama di `rab_nodes`
-- (`is_purchased/purchased_amount/purchased_date/vendor_id`) → `purchase_notes`
-- + `purchase_lines`, dirilis bersama penghapusan `PATCH /rab/nodes/:id/purchase`
-- (kode yang sama mulai membaca realisasi dari Σ purchase_lines).
--
-- Strategi (SRS FR-FIN-3 "satu nota per item"):
-- - Hanya node `item` dengan `is_purchased = true` — persis himpunan yang dulu
--   dihitung realisasi (`purchased_amount` pada node `is_purchased = false`
--   memang tak pernah dihitung), jadi angka realisasi per proyek tetap sama.
-- - Satu nota per item: nomor nota `R-001` (penanda migrasi), vendor =
--   `vendor_id`, tanggal = `purchased_date` (kosong → tanggal `updated_at`).
-- - Σ jumlah = volume item (volume ≤ 0 → 1), Σ subtotal = nominal lama, eksak,
--   maks 3 baris (subtotal = ROUND(jumlah × harga bulat) di-set trigger):
--     n = ⌊volume⌋, f = volume − n
--     baris pecahan (bila f > 0): s_f = (n = 0 ? nominal : ROUND(nominal·f/volume)),
--       harga u_f = max(⌈(s_f − 0,5)/f⌉, 0) → ROUND(f·u_f) = s_f karena f < 1
--     sisa R = nominal − s_f atas jumlah bulat n: p = ⌊R/n⌋, r = R − n·p
--       → baris (n − r) × p dan r × (p + 1); baris berjumlah 0 dilewati.
-- - Node yang sudah soft delete → nota & baris ikut terhapus (penanda sama).
-- - Idempoten: node yang sudah punya baris nota apa pun dilewati (sebelum rilis
--   ini belum ada baris sama sekali); fungsi boleh dijalankan ulang (mis.
--   setelah rollback REL-6 ke image lama).
-- - Kolom lama TIDAK di-drop (REL-6) — R-003 menghapusnya bersama fungsi ini.
CREATE OR REPLACE FUNCTION migrate_legacy_purchases_r001() RETURNS integer
LANGUAGE plpgsql AS $$
DECLARE
  r record;
  nid uuid;
  n numeric;
  f numeric;
  s_f bigint;
  rest bigint;
  p bigint;
  k bigint;
  got bigint;
  cnt integer := 0;
BEGIN
  FOR r IN
    SELECT rn."id", rn."project_id", rn."vendor_id", rn."deleted_at", rn."deleted_by",
           COALESCE(rn."purchased_date", rn."updated_at"::date) AS note_date,
           CASE WHEN rn."volume" > 0 THEN rn."volume" ELSE 1 END AS vol,
           COALESCE(rn."purchased_amount", 0) AS amt
    FROM "rab_nodes" rn
    WHERE rn."node_type" = 'item'
      AND rn."is_purchased"
      AND NOT EXISTS (SELECT 1 FROM "purchase_lines" pl WHERE pl."rab_node_id" = rn."id")
  LOOP
    INSERT INTO "purchase_notes" ("project_id", "vendor_id", "note_number", "note_date", "notes", "deleted_at", "deleted_by")
    VALUES (r."project_id", r."vendor_id", 'R-001', r.note_date, 'Migrasi data pembelian lama', r."deleted_at", r."deleted_by")
    RETURNING "id" INTO nid;

    n := TRUNC(r.vol);
    f := r.vol - n;
    s_f := 0;
    IF f > 0 THEN
      s_f := CASE WHEN n = 0 THEN r.amt ELSE ROUND(r.amt * f / r.vol) END;
      INSERT INTO "purchase_lines" ("purchase_note_id", "rab_node_id", "quantity", "unit_price", "deleted_at", "deleted_by")
      VALUES (nid, r."id", f, GREATEST(CEIL((s_f - 0.5) / f), 0), r."deleted_at", r."deleted_by");
    END IF;
    IF n > 0 THEN
      rest := r.amt - s_f;
      p := FLOOR(rest / n);
      k := rest - n * p; -- 0 ≤ k < n
      IF n - k > 0 THEN
        INSERT INTO "purchase_lines" ("purchase_note_id", "rab_node_id", "quantity", "unit_price", "deleted_at", "deleted_by")
        VALUES (nid, r."id", n - k, p, r."deleted_at", r."deleted_by");
      END IF;
      IF k > 0 THEN
        INSERT INTO "purchase_lines" ("purchase_note_id", "rab_node_id", "quantity", "unit_price", "deleted_at", "deleted_by")
        VALUES (nid, r."id", k, p + 1, r."deleted_at", r."deleted_by");
      END IF;
    END IF;

    -- Penjaga: rumus di atas eksak; bila tetap selisih, gagal keras alih-alih realisasi bergeser diam-diam.
    SELECT SUM("subtotal") INTO got FROM "purchase_lines" WHERE "purchase_note_id" = nid;
    IF got IS DISTINCT FROM r.amt THEN
      RAISE EXCEPTION 'R-001: node % nominal % jadi % setelah migrasi', r."id", r.amt, got;
    END IF;
    cnt := cnt + 1;
  END LOOP;
  RETURN cnt;
END;
$$;

SELECT migrate_legacy_purchases_r001();
