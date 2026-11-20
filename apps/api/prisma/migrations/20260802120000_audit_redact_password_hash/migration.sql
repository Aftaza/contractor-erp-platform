-- Fase 4 WP-53 (fase-4-deploy-verifikasi.md §2.2, §4 WP-53) — utang I.
--
-- `audit_trigger_fn()` (prisma/migrations/20260715053358_init/migration.sql
-- baris 561-595) menulis to_jsonb(OLD)/to_jsonb(NEW) mentah ke
-- audit_logs.old_data/new_data, termasuk kolom "password_hash" tabel
-- "users". CREATE OR REPLACE menimpa fungsi TANPA membuat ulang trigger
-- (kesembilan trigger yang sudah ada menunjuk NAMA fungsi, bukan definisi
-- beku-nya). Operator jsonb `-` menghapus kunci tanpa error kalau kuncinya
-- tak ada, jadi fungsi yang sama tetap benar untuk tabel lain (clients,
-- vendors, projects, rab_nodes, termins, expenses, tools, project_tools)
-- yang tak punya kolom "password_hash" sama sekali.
--
-- Baris audit LAMA yang sudah terlanjur memuat password_hash TIDAK
-- dibersihkan di sini (§2.2) — itu akan menghapus jejak audit. Jalan
-- keluarnya sudah tertutup di DTO Fase 3.

CREATE OR REPLACE FUNCTION audit_trigger_fn() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
  v_user_id uuid;
  v_user_email text;
  v_user_role text;
  v_ip text;
BEGIN
  BEGIN
    v_user_id := NULLIF(current_setting('app.user_id', true), '')::uuid;
  EXCEPTION WHEN OTHERS THEN
    v_user_id := NULL;
  END;

  v_ip := NULLIF(current_setting('app.client_ip', true), '');

  IF v_user_id IS NOT NULL THEN
    SELECT "email", "role"::text INTO v_user_email, v_user_role FROM "users" WHERE "id" = v_user_id;
  END IF;

  IF TG_OP = 'DELETE' THEN
    INSERT INTO "audit_logs" ("user_id", "user_email", "user_role", "action", "table_name", "record_id", "old_data", "new_data", "ip_address")
    VALUES (v_user_id, v_user_email, v_user_role, TG_OP, TG_TABLE_NAME, OLD."id", to_jsonb(OLD) - 'password_hash', NULL, v_ip);
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO "audit_logs" ("user_id", "user_email", "user_role", "action", "table_name", "record_id", "old_data", "new_data", "ip_address")
    VALUES (v_user_id, v_user_email, v_user_role, TG_OP, TG_TABLE_NAME, NEW."id", to_jsonb(OLD) - 'password_hash', to_jsonb(NEW) - 'password_hash', v_ip);
    RETURN NEW;
  ELSE
    INSERT INTO "audit_logs" ("user_id", "user_email", "user_role", "action", "table_name", "record_id", "old_data", "new_data", "ip_address")
    VALUES (v_user_id, v_user_email, v_user_role, TG_OP, TG_TABLE_NAME, NEW."id", NULL, to_jsonb(NEW) - 'password_hash', v_ip);
    RETURN NEW;
  END IF;
END;
$$;
